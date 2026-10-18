import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { candidateApi } from '../api/client';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, Link2,
  Upload, Save, Plus, X, CheckCircle2, Award, ExternalLink,
  Globe, ChevronLeft, FileText, Sparkles, Trash2, Code,
} from 'lucide-react';
import Navbar from '../components/Navbar';

export default function CandidateProfilePage() {
  const navigate = useNavigate();
  const { candidate, updateCandidateState } = useAuth();
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', headline: '', location: '',
    skills: [], experience_years: 0,
    experience_history: [],
    education: [],
    links: { github: '', linkedin: '', portfolio: '' },
    preferred_locations: [],
  });

  useEffect(() => {
    if (candidate) {
      setForm({
        name: candidate.name || '',
        phone: candidate.phone || '',
        headline: candidate.headline || '',
        location: candidate.location || '',
        skills: candidate.skills || [],
        experience_years: candidate.experience_years || 0,
        experience_history: candidate.experience_history || [],
        education: candidate.education || [],
        links: candidate.links || { github: '', linkedin: '', portfolio: '' },
        preferred_locations: candidate.preferred_locations || [],
      });
    }
  }, [candidate]);

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      setForm((p) => ({ ...p, skills: [...p.skills, skill] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setForm((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  const addEducation = () => {
    setForm((p) => ({
      ...p,
      education: [...p.education, { degree: '', institution: '', graduation_year: '', cgpa: '', field: '' }],
    }));
  };

  const updateEducation = (idx, key, val) => {
    setForm((p) => {
      const edu = [...p.education];
      edu[idx] = { ...edu[idx], [key]: val };
      return { ...p, education: edu };
    });
  };

  const removeEducation = (idx) => {
    setForm((p) => ({ ...p, education: p.education.filter((_, i) => i !== idx) }));
  };

  const addExperience = () => {
    setForm((p) => ({
      ...p,
      experience_history: [...p.experience_history, { company: '', title: '', start_date: '', end_date: '', description: '' }],
    }));
  };

  const updateExperience = (idx, key, val) => {
    setForm((p) => {
      const exp = [...p.experience_history];
      exp[idx] = { ...exp[idx], [key]: val };
      return { ...p, experience_history: exp };
    });
  };

  const removeExperience = (idx) => {
    setForm((p) => ({ ...p, experience_history: p.experience_history.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      fd.append('headline', form.headline);
      fd.append('location', form.location);
      fd.append('skills', JSON.stringify(form.skills));
      fd.append('experience_years', form.experience_years);
      fd.append('experience_history', JSON.stringify(form.experience_history));
      fd.append('education', JSON.stringify(form.education));
      fd.append('links', JSON.stringify(form.links));
      fd.append('preferred_locations', JSON.stringify(form.preferred_locations));
      const res = await candidateApi.updateProfile(fd);
      updateCandidateState(res.data);
      toast.success('Profile saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await candidateApi.uploadResume(fd);
      updateCandidateState(res.data.profile);
      if (res.data.auto_filled && Object.keys(res.data.auto_filled).length > 0) {
        toast.success('Resume uploaded & profile auto-filled from resume!');
        // Reload form with auto-filled data
        const prof = res.data.profile;
        setForm((p) => ({
          ...p,
          skills: prof.skills?.length ? prof.skills : p.skills,
          headline: prof.headline || p.headline,
          experience_years: prof.experience_years || p.experience_years,
        }));
      } else {
        toast.success('Resume uploaded successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const completion = candidate?.profile_completed_percentage || 0;

  const sectionStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    marginBottom: '20px',
  };

  const labelStyle = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' };
  const inputStyle = { width: '100%' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }} className="fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/candidate/jobs')} style={{ marginBottom: '8px', gap: '6px' }}>
              <ChevronLeft size={16} /> Back to Jobs
            </button>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Profile</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Complete your profile to unlock 1-click apply and AI job recommendations</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: '6px' }}>
            {saving ? <><span className="spinner" /> Saving...</> : <><Save size={16} /> Save Profile</>}
          </button>
        </div>

        {/* Profile Completion Bar */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Profile Completion</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: completion >= 80 ? 'var(--success-light)' : completion >= 50 ? '#f59e0b' : 'var(--danger-light)' }}>
              {completion}%
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px', transition: 'width 0.6s ease',
              width: `${completion}%`,
              background: completion >= 80 ? 'var(--success)' : completion >= 50 ? '#f59e0b' : 'var(--danger)',
            }} />
          </div>
        </div>

        {/* Basic Info */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} /> Personal Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label style={labelStyle}>Full Name *</label>
              <input className="input" style={inputStyle} value={form.name} onChange={setField('name')} placeholder="Jane Doe" />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Phone Number</label>
              <input className="input" style={inputStyle} value={form.phone} onChange={setField('phone')} placeholder="+91 9876543210" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Professional Headline</label>
              <input className="input" style={inputStyle} value={form.headline} onChange={setField('headline')} placeholder="Full Stack Developer | React & FastAPI" />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Location</label>
              <input className="input" style={inputStyle} value={form.location} onChange={setField('location')} placeholder="Bengaluru, India" />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Total Experience (Years)</label>
              <input className="input" type="number" step="0.5" min="0" style={inputStyle} value={form.experience_years} onChange={(e) => setForm(p => ({ ...p, experience_years: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
        </div>

        {/* Resume Upload */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Resume
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {candidate?.resume_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--success-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)' }}>
                <CheckCircle2 size={16} color="var(--success-light)" />
                <span style={{ fontSize: '0.8125rem', color: 'var(--success-light)', fontWeight: 600 }}>Resume Uploaded</span>
              </div>
            ) : (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No resume uploaded yet</span>
            )}
            <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ display: 'none' }} />
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ gap: '6px' }}>
              {uploading ? <><span className="spinner" /> Uploading...</> : <><Upload size={14} /> {candidate?.resume_url ? 'Replace Resume' : 'Upload Resume'}</>}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> AI will auto-fill skills and headline from your resume
          </p>
        </div>

        {/* Skills */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} /> Skills
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input className="input" style={{ flex: 1 }} value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Type a skill and press Enter (e.g. Python, React, Docker)" />
            <button className="btn btn-secondary btn-sm" onClick={addSkill}><Plus size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {form.skills.map((skill) => (
              <span key={skill} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: 'var(--radius-full)',
                background: 'var(--primary-subtle)', color: 'var(--primary-light)',
                fontSize: '0.8125rem', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.3)',
              }}>
                {skill}
                <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeSkill(skill)} />
              </span>
            ))}
            {form.skills.length === 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No skills added yet</span>}
          </div>
        </div>

        {/* Education */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} /> Education
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={addEducation} style={{ gap: '4px' }}><Plus size={14} /> Add</button>
          </div>
          {form.education.map((edu, i) => (
            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Education #{i + 1}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeEducation(i)} style={{ color: 'var(--danger-light)', padding: '2px' }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input className="input" placeholder="Degree (e.g. B.Tech CS)" value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
                <input className="input" placeholder="Institution" value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
                <input className="input" placeholder="Graduation Year" value={edu.graduation_year} onChange={(e) => updateEducation(i, 'graduation_year', e.target.value)} />
                <input className="input" placeholder="CGPA / Percentage" value={edu.cgpa} onChange={(e) => updateEducation(i, 'cgpa', e.target.value)} />
              </div>
            </div>
          ))}
          {form.education.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No education entries yet. Click "Add" above.</p>}
        </div>

        {/* Experience */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} /> Work Experience
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={addExperience} style={{ gap: '4px' }}><Plus size={14} /> Add</button>
          </div>
          {form.experience_history.map((exp, i) => (
            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Experience #{i + 1}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeExperience(i)} style={{ color: 'var(--danger-light)', padding: '2px' }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input className="input" placeholder="Company Name" value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} />
                <input className="input" placeholder="Job Title" value={exp.title} onChange={(e) => updateExperience(i, 'title', e.target.value)} />
                <input className="input" placeholder="Start Date (e.g. 2023-01)" value={exp.start_date} onChange={(e) => updateExperience(i, 'start_date', e.target.value)} />
                <input className="input" placeholder="End Date or Present" value={exp.end_date} onChange={(e) => updateExperience(i, 'end_date', e.target.value)} />
              </div>
              <textarea className="input" style={{ width: '100%', minHeight: '60px', marginTop: '10px', resize: 'vertical' }}
                placeholder="Brief description of your role..."
                value={exp.description} onChange={(e) => updateExperience(i, 'description', e.target.value)} />
            </div>
          ))}
          {form.experience_history.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No experience entries yet. Click "Add" above.</p>}
        </div>

        {/* Social Links */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link2 size={18} /> Portfolio & Social Links
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={labelStyle}><Code size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> GitHub Profile</label>
              <input className="input" style={inputStyle} placeholder="https://github.com/username" value={form.links.github || ''}
                onChange={(e) => setForm(p => ({ ...p, links: { ...p.links, github: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}><ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> LinkedIn Profile</label>
              <input className="input" style={inputStyle} placeholder="https://linkedin.com/in/name" value={form.links.linkedin || ''}
                onChange={(e) => setForm(p => ({ ...p, links: { ...p.links, linkedin: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}><Globe size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Portfolio</label>
              <input className="input" style={inputStyle} placeholder="https://yoursite.dev" value={form.links.portfolio || ''}
                onChange={(e) => setForm(p => ({ ...p, links: { ...p.links, portfolio: e.target.value } }))} />
            </div>
          </div>
        </div>

        {/* Bottom Save */}
        <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving} style={{ gap: '8px' }}>
            {saving ? <><span className="spinner" /> Saving Profile...</> : <><Save size={18} /> Save All Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
