import React from 'react';
import { Camera, Mic, ShieldAlert, Maximize2, ShieldCheck } from 'lucide-react';

export default function ProctoringHUD({
  proctoringEnabled = true,
  isFullscreen = true,
  cameraActive = true,
  micActive = true,
  flagCount = 0,
}) {
  if (!proctoringEnabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(14, 21, 38, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-full)',
        padding: '6px 14px',
        boxShadow: 'var(--shadow-md)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 8px var(--success)',
          }}
        />
        <span style={{ color: 'var(--text-primary)' }}>Proctored</span>
      </div>

      <div style={{ height: '14px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

      {/* Camera status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          color: cameraActive ? 'var(--success-light)' : 'var(--danger-light)',
        }}
        title={cameraActive ? 'Camera active' : 'Camera off or blocked'}
      >
        <Camera size={14} />
      </div>

      {/* Mic status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          color: micActive ? 'var(--success-light)' : 'var(--danger-light)',
        }}
        title={micActive ? 'Microphone active' : 'Microphone off'}
      >
        <Mic size={14} />
      </div>

      {/* Fullscreen status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          color: isFullscreen ? 'var(--success-light)' : 'var(--warning-light)',
        }}
        title={isFullscreen ? 'Fullscreen active' : 'Not in fullscreen'}
      >
        <Maximize2 size={14} />
      </div>

      {/* Flag counter */}
      {flagCount > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '4px',
            background: 'var(--warning-subtle)',
            color: 'var(--warning-light)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--warning)',
            fontWeight: 700,
          }}
        >
          <ShieldAlert size={12} />
          <span>{flagCount}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', color: 'var(--success-light)' }}>
          <ShieldCheck size={14} />
        </div>
      )}
    </div>
  );
}
