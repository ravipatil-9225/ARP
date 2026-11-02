import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision';
import { computeHeadPose, GlanceTracker } from '../vision/gazeEstimation';
import { MultipleFacesTracker } from '../vision/multipleFacesTracker';
import { ObjectDetectionTracker } from '../vision/objectTracker';
import { proctorApi } from '../../api/client';

export function useTier1Webcam({
  applicationId,
  enabled = true,
  logEvent,
  onSnapshotCaptured,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentFaceCount, setCurrentFaceCount] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isFaceMisaligned, setIsFaceMisaligned] = useState(false);
  const [misalignmentReason, setMisalignmentReason] = useState('');
  const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0 });

  // Trackers
  const glanceTracker = useRef(new GlanceTracker());
  const multiFaceTracker = useRef(new MultipleFacesTracker({ debounceSec: 1.5 }));
  const objectTracker = useRef(new ObjectDetectionTracker());

  // Timing refs
  const lastNoFaceTime = useRef(null);
  const lastNoFaceEmission = useRef(-Infinity);
  const lastObjectInferenceTime = useRef(0);
  const snapshotDebounce = useRef(new Map()); // eventType -> lastSnapshotTime
  const animFrameId = useRef(null);

  // MediaPipe task instances
  const faceLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);

  // ── Capture Snapshot Helper ─────────────────────────────────────────────────
  const captureSnapshot = useCallback(
    async (eventType, clientEventId = null) => {
      if (!videoRef.current || !applicationId) return;

      const now = Date.now();
      const lastSnap = snapshotDebounce.current.get(eventType) || 0;
      if (now - lastSnap < 10000) {
        return; // Debounce 10s per event type
      }
      snapshotDebounce.current.set(eventType, now);

      try {
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
          offscreenCanvasRef.current.width = 640;
          offscreenCanvasRef.current.height = 480;
        }
        const ctx = offscreenCanvasRef.current.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);

        offscreenCanvasRef.current.toBlob(
          async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append('image', blob, `${eventType}_${Date.now()}.jpg`);
            if (clientEventId) {
              formData.append('client_event_id', clientEventId);
            }
            try {
              const res = await proctorApi.uploadSnapshot(applicationId, formData);
              if (onSnapshotCaptured) onSnapshotCaptured(res.data);
            } catch (err) {
              console.warn('[Proctoring] Snapshot upload failed:', err);
            }
          },
          'image/jpeg',
          0.8
        );
      } catch (err) {
        console.warn('[Proctoring] Snapshot capture error:', err);
      }
    },
    [applicationId, onSnapshotCaptured]
  );

  // ── Initialize MediaPipe Models ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let isCancelled = false;

    async function loadModels() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        // 1. Face Landmarker
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 3,
        });

        // 2. Object Detector (EfficientDet-Lite)
        objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
            delegate: 'GPU',
          },
          scoreThreshold: 0.55,
          runningMode: 'VIDEO',
        });

        setIsModelLoaded(true);
      } catch (err) {
        console.warn('[Proctoring] Failed to load MediaPipe tasks-vision models:', err);
      }
    }

    loadModels();

    return () => {
      isCancelled = true;
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close?.();
      if (objectDetectorRef.current) objectDetectorRef.current.close?.();
    };
  }, [enabled]);

  // ── Setup Webcam Stream ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsCameraActive(true);
          };
        }
      } catch (err) {
        console.warn('[Proctoring] Webcam access error:', err);
        setIsCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);
    };
  }, [enabled]);

  // ── Main Vision Frame Loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isCameraActive || !isModelLoaded) return;

    let lastVideoTime = -1;

    function processFrame() {
      if (document.hidden) {
        // Tab hidden: pause vision frame processing
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      const nowSec = performance.now() / 1000;
      const wallNow = Date.now();

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        // 1. Face Landmarker detection
        if (faceLandmarkerRef.current) {
          try {
            const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
            const faces = results.faceLandmarks || [];
            const faceCount = faces.length;
            setCurrentFaceCount(faceCount);

            // A. Face Presence (>3.0s absent emits NO_FACE, repeat every 5s)
            if (faceCount === 0) {
              if (lastNoFaceTime.current === null) {
                lastNoFaceTime.current = nowSec;
              }
              const absentDuration = nowSec - lastNoFaceTime.current;
              if (absentDuration > 3.0 && nowSec - lastNoFaceEmission.current >= 5.0) {
                lastNoFaceEmission.current = nowSec;
                logEvent('NO_FACE', {
                  detail: `No face detected in frame for ${absentDuration.toFixed(1)}s`,
                  duration_seconds: absentDuration,
                });
                captureSnapshot('NO_FACE');
              }
            } else {
              lastNoFaceTime.current = null;
            }

            // B. Multiple Faces (continuous >= 1.5s)
            const multiRes = multiFaceTracker.current.update(faceCount, nowSec);
            if (multiRes.shouldEmit) {
              logEvent('MULTIPLE_FACES', {
                detail: `Multiple people detected in view (${multiRes.faceCount} faces)`,
              });
              captureSnapshot('MULTIPLE_FACES');
            }

            // C. Gaze & Head Pose (Repeated-glance rule and real-time alignment warning)
            if (faceCount === 1) {
              const landmarks = faces[0];
              const pose = computeHeadPose({
                nose: landmarks[4],
                leftEye: landmarks[33],
                rightEye: landmarks[263],
                chin: landmarks[152],
              });
              setHeadPose(pose);

              // Real-time Face Misalignment Check (triggers immediate on-screen warning)
              if (pose.yaw < -18) {
                setIsFaceMisaligned(true);
                setMisalignmentReason('Turned Left');
              } else if (pose.yaw > 18) {
                setIsFaceMisaligned(true);
                setMisalignmentReason('Turned Right');
              } else if (pose.pitch < -16) {
                setIsFaceMisaligned(true);
                setMisalignmentReason('Looking Down');
              } else if (pose.pitch > 22) {
                setIsFaceMisaligned(true);
                setMisalignmentReason('Looking Up');
              } else {
                setIsFaceMisaligned(false);
                setMisalignmentReason('');
              }

              const gazeRes = glanceTracker.current.update(pose, nowSec);
              if (gazeRes.shouldEmit) {
                logEvent('GAZE_AWAY', {
                  detail: gazeRes.reason || 'Repeated gaze deviation detected',
                });
                captureSnapshot('GAZE_AWAY');
              }
            } else if (faceCount === 0) {
              setIsFaceMisaligned(true);
              setMisalignmentReason('Face Not In Frame');
            } else {
              setIsFaceMisaligned(false);
              setMisalignmentReason('');
            }
          } catch (e) {
            // Frame processing catch
          }
        }

        // 2. Object Detector (every 500ms on 320x240 canvas)
        if (objectDetectorRef.current && wallNow - lastObjectInferenceTime.current >= 500) {
          lastObjectInferenceTime.current = wallNow;
          try {
            const objResults = objectDetectorRef.current.detectForVideo(video, performance.now());
            const targetEmissions = objectTracker.current.update(
              objResults.detections || [],
              nowSec
            );

            for (const item of targetEmissions) {
              logEvent('OBJECT_DETECTED', {
                detail: `Suspicious object detected: ${item.className} (confidence: ${(item.score * 100).toFixed(0)}%)`,
                metadata: {
                  class_name: item.className,
                  confidence: item.score,
                  bounding_box: item.boundingBox,
                },
              });
              captureSnapshot('OBJECT_DETECTED');
            }
          } catch (e) {
            // Object inference catch
          }
        }
      }

      animFrameId.current = requestAnimationFrame(processFrame);
    }

    animFrameId.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [enabled, isCameraActive, isModelLoaded, logEvent, captureSnapshot]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    currentFaceCount,
    isModelLoaded,
    isFaceMisaligned,
    misalignmentReason,
    headPose,
    captureSnapshot,
  };
}

