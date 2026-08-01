import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Status config
const STATUS_CFG = {
  applied:   { label: 'Applied',   color: '#4f46e5', bg: '#eef2ff', emoji: '📝' },
  reviewing: { label: 'Reviewing', color: '#d97706', bg: '#fffbeb', emoji: '🔍' },
  interview: { label: 'Interview', color: '#7c3aed', bg: '#f5f3ff', emoji: '🎤' },
  hired:     { label: 'Hired',     color: '#16a34a', bg: '#ecfdf5', emoji: '🎉' },
  rejected:  { label: 'Rejected',  color: '#dc2626', bg: '#fff1f2', emoji: '❌' },
};

// SVG Icon component
const Ic = ({ n, size = 16, color = 'currentColor' }) => {
  const paths = {
    bell:   'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    close:  'M18 6L6 18M6 6l12 12',
    search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    link:   'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    resume: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    phone:  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
    trash:  'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  };
  const d = paths[n] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={`M${seg}`} />)}
    </svg>
  );
};

// Skill chip
const SkillChip = ({ name, level }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20,
    background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', border: '1px solid #c4b5fd' }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#5b21b6' }}>{name}</span>
    <span style={{ fontSize: 10, color: '#7c3aed', opacity: 0.7 }}>L{level}</span>
  </div>
);

// Applicant Detail Slide Panel
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
        status: newStatus, counselingNote: note
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

  const sc = STATUS_CFG[status] || STATUS_CFG.applied;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: Math.min(520, window.innerWidth), height: '100%', background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Panel Header */}
        <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg,#2d2b6e,#4f46e5)', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{app.applicantName || 'Candidate'}</h2>
              <p style={{ fontSize: 13, opacity: 0.8 }}>Applied for <strong>{app.jobTitle}</strong> at {app.company}</p>
              <p style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                {new Date(app.appliedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#fff' }}>
              <Ic n="close" size={15} />
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, opacity: 0.65 }}>Status:</span>
            <span style={{ background: sc.bg, color: sc.color, fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${sc.color}33` }}>
              {sc.emoji} {sc.label}
            </span>
          </div>
        </div>

        <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Status Buttons */}
          <div style={{ padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Update Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleStatusChange(key)} disabled={updatingStatus}
                  style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s',
                    border: `2px solid ${status === key ? cfg.color : '#e2e8f0'}`,
                    background: status === key ? cfg.bg : '#fff',
                    color: status === key ? cfg.color : '#64748b',
                    opacity: updatingStatus ? 0.6 : 1 }}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          {(app.phone || app.linkedIn || app.portfolio) && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Contact</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {app.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534' }}><Ic n="phone" size={11} color="#16a34a" /> {app.phone}</span>}
                {app.linkedIn && <a href={`https://${app.linkedIn.replace('https://','')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}><Ic n="link" size={11} color="#2563eb" /> LinkedIn</a>}
                {app.portfolio && <a href={`https://${app.portfolio.replace('https://','')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: '#fdf4ff', border: '1px solid #e9d5ff', fontSize: 12, color: '#7e22ce', textDecoration: 'none' }}><Ic n="link" size={11} color="#9333ea" /> Portfolio</a>}
              </div>
            </div>
          )}

          {/* Cover Letter */}
          {app.coverLetter && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cover Letter</p>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8faff', border: '1px solid #e0e7ff', fontSize: 13, color: '#334155', lineHeight: 1.65 }}>
                {app.coverLetter}
              </div>
            </div>
          )}

          {/* Profile Skills */}
          {profile && (
            <>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Skills ({profile.profile?.skills?.length || 0})
                </p>
                {profile.profile?.skills?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {profile.profile.skills.map(sk => (
                      <SkillChip key={sk.id} name={sk.id.replace(/_/g, ' ')} level={sk.level} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>No skills added yet.</p>
                )}
              </div>

              {/* Resume info */}
              {profile.profile?.resumeFileName && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Ic n="resume" size={20} color="#16a34a" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      {profile.profile.resumeOriginalName || profile.profile.resumeFileName}
                    </p>
                    {profile.profile.resumeUploadedAt && (
                      <p style={{ fontSize: 11, color: '#15803d' }}>
                        Uploaded {new Date(profile.profile.resumeUploadedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Profile Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {[
                  { l: 'Target Role', v: profile.profile?.targetRole },
                  { l: 'Experience', v: profile.profile?.experience },
                  { l: 'Education', v: profile.profile?.education },
                  { l: 'Email', v: profile.email },
                ].filter(x => x.v).map(({ l, v }) => (
                  <div key={l} style={{ padding: '9px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{l}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Bio */}
              {profile.profile?.bio && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Bio</p>
                  <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.65, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>{profile.profile.bio}</p>
                </div>
              )}
            </>
          )}

          {/* Counseling Note */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Counseling Note</p>
              {savedNote && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ Saved</span>}
              {saving && !savedNote && <span style={{ fontSize: 11, color: '#94a3b8' }}>Saving...</span>}
            </div>
            <textarea
              value={noteText}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Write guidance for this candidate — e.g. skills to improve, interview tips, next steps..."
              style={{ width: '100%', minHeight: 110, padding: '11px 13px', borderRadius: 10, border: '1.5px solid #fde68a', background: '#fffbeb', fontSize: 13, color: '#78350f', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Auto-saved as you type. The candidate will see this note.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Application Card
const AppCard = ({ app, onSelect, isSelected }) => {
  const sc = STATUS_CFG[app.status] || STATUS_CFG.applied;
  return (
    <div onClick={() => onSelect(app)}
      style={{
        padding: 18,
        borderRadius: 14,
        border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
        background: isSelected ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        boxShadow: isSelected ? '0 8px 24px rgba(79,70,229,0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
        transform: isSelected ? 'translateY(-2px)' : 'none',
      }}
      className="recruiter-app-card"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${app.logoColor || '#6366f1'}, ${(app.logoColor || '#6366f1')}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
          {app.logo || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.jobTitle}</h3>
          <p style={{ fontSize: 12, color: '#64748b' }}>{app.company}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}33`, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {sc.emoji} {sc.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{app.applicantName || 'Candidate'}</p>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(app.appliedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        {app.counselingNote && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700 }}>
            💬 Note
          </span>
        )}
      </div>
    </div>
  );
};

// Main Recruiter Dashboard
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
    applied: applications.filter(a => a.status === 'applied').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    interview: applications.filter(a => a.status === 'interview').length,
    hired: applications.filter(a => a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const filtered = applications.filter(a => {
    const q = search.toLowerCase();
    const mq = !q || (a.applicantName || '').toLowerCase().includes(q) || a.jobTitle.toLowerCase().includes(q) || a.company.toLowerCase().includes(q);
    const ms = filterStatus === 'all' || a.status === filterStatus;
    return mq && ms;
  }).sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>Loading Recruiter Dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2d2b6e,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>CareerPath</span>
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'linear-gradient(135deg,#2d2b6e,#4f46e5)', color: '#fff' }}>RECRUITER</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={handleBellClick}
              style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
              <Ic n="bell" size={17} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 9, fontWeight: 800, minWidth: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid #fff' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div style={{ position: 'absolute', right: 0, top: 44, width: 340, maxHeight: 380, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.1)', zIndex: 300 }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Notifications
                  <button onClick={() => setBellOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                    <Ic n="close" size={14} />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No notifications yet</div>
                ) : notifications.map(n => (
                  <div key={n.id} style={{ padding: '11px 16px', borderBottom: '1px solid #f1f5f9', background: n.read ? 'transparent' : '#f0f6ff', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{n.type === 'new_application' ? '🔔' : '📋'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{n.message}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(n.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                    </div>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2d2b6e,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
            {(user?.fullName || user?.username || 'R')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{user?.fullName || user?.username}</span>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ padding: '6px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 4 }}>
            🧑‍💼 Recruiter Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Monitor all applications, view candidate profiles, update status, and add counseling notes.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Applications', value: total,           color: '#4f46e5', bg: '#fff', emoji: '📋' },
            { label: 'New',                value: counts.applied,  color: '#4f46e5', bg: '#fff', emoji: '📝' },
            { label: 'Reviewing',          value: counts.reviewing,color: '#d97706', bg: '#fff', emoji: '🔍' },
            { label: 'Interviews',         value: counts.interview,color: '#7c3aed', bg: '#fff', emoji: '🎤' },
            { label: 'Hired',              value: counts.hired,    color: '#16a34a', bg: '#fff', emoji: '🎉' },
            { label: 'Rejected',           value: counts.rejected, color: '#dc2626', bg: '#fff', emoji: '❌' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px 18px', borderRadius: 14, background: s.bg, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)' }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{s.emoji}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20, padding: '12px 16px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
              <Ic n="search" size={14} />
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates, jobs, companies..."
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Application Cards */}
        {filtered.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', borderRadius: 16, background: '#fff', border: '1px dashed #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <h3 style={{ color: '#0f172a', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              {applications.length === 0 ? 'No Applications Yet' : 'No Results Found'}
            </h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {applications.length === 0 ? 'Applications will appear here once candidates start applying.' : 'Try adjusting your search or status filter.'}
            </p>
            {(search || filterStatus !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterStatus('all'); }}
                style={{ marginTop: 16, padding: '8px 20px', borderRadius: 10, background: '#4f46e5', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 13 }}>
            {filtered.map(app => (
              <AppCard key={app.id} app={app} onSelect={setSelectedApp} isSelected={selectedApp?.id === app.id} />
            ))}
          </div>
        )}
      </div>

      {/* Applicant Detail Panel */}
      {selectedApp && (
        <ApplicantPanel app={selectedApp} onClose={() => setSelectedApp(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
