import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  applied:   { label: 'Applied',   color: '#6366f1', bg: '#eef2ff', emoji: '📝' },
  reviewing: { label: 'Reviewing', color: '#f59e0b', bg: '#fffbeb', emoji: '🔍' },
  interview: { label: 'Interview', color: '#8b5cf6', bg: '#f5f3ff', emoji: '🎤' },
  hired:     { label: 'Hired',     color: '#10b981', bg: '#ecfdf5', emoji: '🎉' },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: '#fff1f2', emoji: '✗' },
};

// ─── SVG Icon helper (same as DashboardPage) ───────────────────────────────────
const PATHS = {
  bell:   'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  close:  'M18 6L6 18M6 6l12 12',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  link:   'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  resume: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  phone:  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  eye:    'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  user:   'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
};
const Ic = ({ n, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {(PATHS[n] || '').split('M').filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
  </svg>
);

// ─── Skill chip ────────────────────────────────────────────────────────────────
const SkillChip = ({ name, level }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20,
    background: 'var(--violet-bg)', border: '1px solid #c4b5fd',
    fontSize: 11, fontWeight: 700, color: 'var(--violet-text)',
  }}>
    {name} <span style={{ opacity: 0.6 }}>L{level}</span>
  </span>
);

// ─── Applicant Detail Slide Panel ──────────────────────────────────────────────
const ApplicantPanel = ({ app, onClose, onStatusChange }) => {
  const [profile, setProfile] = useState(null);
  const [noteText, setNoteText] = useState(app.counselingNote || '');
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const noteTimer = useRef(null);

  useEffect(() => {
    axios.get(`/api/recruiter/applicant/${app.userId}`)
      .then(r => setProfile(r.data.applicant))
      .catch(() => {});
  }, [app.userId]);

  useEffect(() => {
    setNoteText(app.counselingNote || '');
    setStatus(app.status);
  }, [app.id]);

  const saveStatus = async (newStatus, note) => {
    try {
      const res = await axios.put(`/api/recruiter/applications/${app.id}/status`, {
        status: newStatus, counselingNote: note,
      });
      onStatusChange(res.data.application);
      return true;
    } catch { return false; }
  };

  const handleNoteChange = (v) => {
    setNoteText(v);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      setSaving(true);
      const ok = await saveStatus(status, v);
      setSaving(false);
      if (ok) { setSavedNote(true); setTimeout(() => setSavedNote(false), 2000); }
    }, 1200);
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setUpdatingStatus(true);
    await saveStatus(newStatus, noteText);
    setUpdatingStatus(false);
  };

  const resumeUrl = profile?.profile?.resumeFileName
    ? `/api/resume/${profile.profile.resumeFileName}`
    : null;

  const sc = STATUS_CFG[status] || STATUS_CFG.applied;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: Math.min(520, window.innerWidth),
        height: '100%', background: '#fff',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* Panel Header */}
        <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg, #2d2b6e, #4f46e5)', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 3 }}>{app.applicantName || 'Candidate'}</h2>
              <p style={{ fontSize: 13, opacity: 0.82 }}>
                Applied for <strong>{app.jobTitle}</strong> · {app.company}
              </p>
              <p style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>
                {new Date(app.appliedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center',
            }}>
              <Ic n="close" size={15} />
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, opacity: 0.65 }}>Status:</span>
            <span style={{
              background: sc.bg, color: sc.color, fontWeight: 700, fontSize: 11,
              padding: '3px 10px', borderRadius: 20, border: `1px solid ${sc.color}33`,
            }}>
              {sc.emoji} {sc.label}
            </span>
          </div>
        </div>

        {/* Panel Body */}
        <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Status Buttons */}
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Update Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleStatusChange(key)} disabled={updatingStatus}
                  style={{
                    padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.18s',
                    border: `2px solid ${status === key ? cfg.color : 'var(--border)'}`,
                    background: status === key ? cfg.bg : '#fff',
                    color: status === key ? cfg.color : 'var(--text-muted)',
                    opacity: updatingStatus ? 0.6 : 1,
                  }}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          {(app.phone || app.linkedIn || app.portfolio) && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Contact</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {app.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534' }}>
                    <Ic n="phone" size={11} color="#16a34a" /> {app.phone}
                  </span>
                )}
                {app.linkedIn && (
                  <a href={`https://${app.linkedIn.replace('https://', '')}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>
                    <Ic n="link" size={11} color="#2563eb" /> LinkedIn
                  </a>
                )}
                {app.portfolio && (
                  <a href={`https://${app.portfolio.replace('https://', '')}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: '#fdf4ff', border: '1px solid #e9d5ff', fontSize: 12, color: '#7e22ce', textDecoration: 'none' }}>
                    <Ic n="link" size={11} color="#9333ea" /> Portfolio
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Cover Letter */}
          {app.coverLetter && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cover Letter</p>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8faff', border: '1px solid #e0e7ff', fontSize: 13, color: '#334155', lineHeight: 1.65 }}>
                {app.coverLetter}
              </div>
            </div>
          )}

          {/* Candidate Info from Profile */}
          {profile && (
            <>
              {/* Profile Details Grid */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Candidate Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { l: 'Target Role', v: profile.profile?.targetRole },
                    { l: 'Experience', v: profile.profile?.experience },
                    { l: 'Education', v: profile.profile?.education },
                    { l: 'Email', v: profile.email },
                  ].filter(x => x.v).map(({ l, v }) => (
                    <div key={l} className="card" style={{ padding: '9px 12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{l}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio */}
              {profile.profile?.bio && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Bio</p>
                  <p className="card" style={{ padding: '10px 14px', fontSize: 13, color: '#334155', lineHeight: 1.65 }}>
                    {profile.profile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Skills ({profile.profile?.skills?.length || 0})
                </p>
                {profile.profile?.skills?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.profile.skills.map(sk => (
                      <SkillChip key={sk.id} name={sk.id.replace(/_/g, ' ')} level={sk.level} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skills added yet.</p>
                )}
              </div>

              {/* Resume */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Resume</p>
                {resumeUrl ? (
                  <div className="card" style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ic n="resume" size={20} color="#16a34a" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile.profile.resumeOriginalName || profile.profile.resumeFileName}
                        </p>
                        {profile.profile.resumeUploadedAt && (
                          <p style={{ fontSize: 11, color: '#15803d' }}>
                            Uploaded {new Date(profile.profile.resumeUploadedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 8,
                          background: '#2d2b6e', color: '#fff',
                          textDecoration: 'none', fontSize: 12, fontWeight: 700,
                          flexShrink: 0, whiteSpace: 'nowrap',
                          transition: 'background 0.18s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#232160'}
                        onMouseOut={e => e.currentTarget.style.background = '#2d2b6e'}
                      >
                        <Ic n="eye" size={13} color="#fff" /> View Resume
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ padding: '14px 16px', background: '#f8fafc', border: '1px dashed var(--border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Ic n="resume" size={16} color="var(--text-muted)" />
                      No resume uploaded by this candidate.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Counseling Note */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Counseling Note</p>
              {savedNote && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ Saved</span>}
              {saving && !savedNote && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saving…</span>}
            </div>
            <textarea
              value={noteText}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Write guidance for this candidate — e.g. skills to improve, interview tips, next steps…"
              style={{
                width: '100%', minHeight: 110, padding: '11px 13px',
                borderRadius: 10, border: '1.5px solid #fde68a',
                background: '#fffbeb', fontSize: 13, color: '#78350f',
                lineHeight: 1.65, resize: 'vertical', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Auto-saved as you type. The candidate will see this note.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Application Card ──────────────────────────────────────────────────────────
const AppCard = ({ app, onSelect, isSelected }) => {
  const sc = STATUS_CFG[app.status] || STATUS_CFG.applied;
  return (
    <div onClick={() => onSelect(app)}
      className="card"
      style={{
        padding: '18px 20px', cursor: 'pointer',
        border: isSelected ? '2px solid #4f46e5' : '1px solid var(--border)',
        background: isSelected ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)' : '#fff',
        boxShadow: isSelected ? '0 4px 20px rgba(79,70,229,0.12)' : undefined,
        transition: 'all 0.18s',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {/* Company logo */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${app.logoColor || '#6366f1'}, ${(app.logoColor || '#6366f1')}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 13,
        }}>
          {app.logo || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.jobTitle}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.company}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: sc.bg, color: sc.color, border: `1px solid ${sc.color}33`,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {sc.emoji} {sc.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)' }}>{app.applicantName || 'Candidate'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {new Date(app.appliedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        {app.counselingNote && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700 }}>
            💬 Note
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Main Recruiter Dashboard ──────────────────────────────────────────────────
export default function RecruiterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  const fetchAll = async () => {
    try {
      const [appRes, notifRes] = await Promise.all([
        axios.get('/api/recruiter/applications'),
        axios.get('/api/notifications'),
      ]);
      setApplications(appRes.data.applications || []);
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(notifRes.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, []);

  const handleBellClick = async () => {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && unreadCount > 0) {
      try {
        await axios.post('/api/notifications/mark-read', { ids: [] });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch {}
    }
  };

  const handleStatusChange = (updatedApp) => {
    setApplications(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a));
    setSelectedApp(updatedApp);
  };

  const total = applications.length;
  const counts = {
    applied:   applications.filter(a => a.status === 'applied').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    interview: applications.filter(a => a.status === 'interview').length,
    hired:     applications.filter(a => a.status === 'hired').length,
    rejected:  applications.filter(a => a.status === 'rejected').length,
  };

  const filtered = applications.filter(a => {
    const q = search.toLowerCase();
    const mq = !q || (a.applicantName || '').toLowerCase().includes(q)
      || a.jobTitle.toLowerCase().includes(q)
      || a.company.toLowerCase().includes(q);
    const ms = filterStatus === 'all' || a.status === filterStatus;
    return mq && ms;
  }).sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>Loading Recruiter Dashboard…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top Navigation (matches job-seeker nav) ── */}
      <nav className="topnav">
        <div className="topnav-inner">
          {/* Logo */}
          <a className="nav-logo" href="#" onClick={e => e.preventDefault()}>
            <div className="nav-logo-icon">⚡</div>
            <span className="nav-logo-text">CareerPath</span>
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#2d2b6e', color: '#fff' }}>
              RECRUITER
            </span>
          </a>

          <div style={{ flex: 1 }} />

          {/* Bell */}
          <div className="nav-right">
            <div style={{ position: 'relative' }}>
              <button onClick={handleBellClick}
                style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                <Ic n="bell" size={16} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {bellOpen && (
                <div style={{ position: 'absolute', right: 0, top: 40, width: 320, maxHeight: 360, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200 }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Notifications
                    <button onClick={() => setBellOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                      <Ic n="close" size={14} />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No notifications yet</div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', background: n.read ? '#fff' : '#f0f6ff', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{n.type === 'new_application' ? '🔔' : '📋'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{n.message}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {new Date(n.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 3 }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="nav-avatar" title={user?.fullName || user?.username}>
              {(user?.fullName || user?.username || 'R')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              {user?.fullName || user?.username}
            </span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="btn-ghost"
              style={{ padding: '7px 14px', fontSize: 13 }}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-h)', letterSpacing: '-0.4px', marginBottom: 4 }}>
            🧑‍💼 Recruiter Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Monitor applications, view candidate profiles &amp; resumes, update status, and add counseling notes.
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total',      value: total,           color: '#6366f1', iconBg: '#eef2ff', emoji: '📋' },
            { label: 'New',        value: counts.applied,  color: '#6366f1', iconBg: '#eef2ff', emoji: '📝' },
            { label: 'Reviewing',  value: counts.reviewing, color: '#f59e0b', iconBg: '#fffbeb', emoji: '🔍' },
            { label: 'Interviews', value: counts.interview, color: '#8b5cf6', iconBg: '#f5f3ff', emoji: '🎤' },
            { label: 'Hired',      value: counts.hired,    color: '#10b981', iconBg: '#ecfdf5', emoji: '🎉' },
            { label: 'Rejected',   value: counts.rejected, color: '#ef4444', iconBg: '#fff1f2', emoji: '✗' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-icon" style={{ background: s.iconBg }}>{s.emoji}</div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Ic n="search" size={14} />
            </div>
            <input
              id="recruiter-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates, jobs, companies…"
              style={{
                width: '100%', padding: '8px 12px 8px 36px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: '#f8fafc', color: 'var(--text-h)',
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
          {/* Status filter */}
          <select
            id="recruiter-status-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: '#fff',
              color: 'var(--text-h)', fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', outline: 'none',
            }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Application Cards Grid */}
        {filtered.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', borderRadius: 16, background: '#fff', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <h3 style={{ color: 'var(--text-h)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              {applications.length === 0 ? 'No Applications Yet' : 'No Results Found'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {applications.length === 0
                ? 'Applications will appear here once candidates start applying.'
                : 'Try adjusting your search or status filter.'}
            </p>
            {(search || filterStatus !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterStatus('all'); }}
                className="btn-navy"
                style={{ marginTop: 16 }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
            {filtered.map(app => (
              <AppCard key={app.id} app={app} onSelect={setSelectedApp} isSelected={selectedApp?.id === app.id} />
            ))}
          </div>
        )}
      </div>

      {/* Applicant Detail Side Panel */}
      {selectedApp && (
        <ApplicantPanel
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
