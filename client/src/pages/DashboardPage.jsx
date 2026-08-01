import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const I = {
  home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  jobs:     'M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m4 6h.01',
  skills:   'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  saved:    'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  apps:     'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  profile:  'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
  search:   'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  location: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z',
  clock:    'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2',
  bell:     'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  edit:     'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  trend:    'M23 6l-9.5 9.5-5-5L1 18',
  check:    'M20 6L9 17l-4.5-4.5',
  close:    'M18 6L6 18M6 6l12 12',
  send:     'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  trash:    'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  link:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  arrow:    'M5 12h14M12 5l7 7-7 7',
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  star:     'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
  gaps:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  counsel:  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 1-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
};
const Ic = ({ n, size = 16, color = 'currentColor', strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {(I[n] || '').split('M').filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
  </svg>
);

// ─── Top Navigation ───────────────────────────────────────────────────────────
const TopNav = ({ tab, setTab, user, logout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { id: 'home',    label: 'Home',        icon: 'home' },
    { id: 'jobs',    label: 'Job Matches', icon: 'jobs' },
    { id: 'career',  label: 'Career Guidance', icon: 'trend' },
    { id: 'skills',  label: 'Skill Gaps',  icon: 'skills' },
    { id: 'applied', label: 'Applications',icon: 'apps' },
    { id: 'profile', label: 'Counselor',   icon: 'counsel' },
  ];
  return (
    <nav className="topnav">
      <div className="topnav-inner">
        {/* Logo */}
        <a className="nav-logo" href="#" onClick={e => { e.preventDefault(); setTab('home'); }}>
          <div className="nav-logo-icon">⚡</div>
          <span className="nav-logo-text">CareerPath</span>
        </a>

        {/* Nav links */}
        <div className="nav-links">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`nav-link ${tab === item.id ? 'active' : ''}`}>
              <Ic n={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="nav-right">

          <div className="nav-avatar" title={user?.fullName || user?.username}>
            {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
          </div>
          <button onClick={logout} className="btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }}>
            Sign Out
          </button>
          {/* Hamburger (mobile) */}
          <button className="nav-hamburger" onClick={() => setMobileMenuOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay open" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="nav-logo-icon">⚡</div>
                <span className="nav-logo-text">CareerPath</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ padding: 6, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#94a3b8' }}>
                <Ic n="close" size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navItems.map(item => (
                <button key={item.id} onClick={() => { setTab(item.id); setMobileMenuOpen(false); }}
                  className={`nav-link ${tab === item.id ? 'active' : ''}`}>
                  <Ic n={item.icon} size={16} />
                  {item.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="nav-avatar" style={{ width: 40, height: 40, fontSize: 15 }}>
                  {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{user?.fullName || user?.username}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{user?.email}</p>
                </div>
              </div>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                <Ic n="logout" size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// ─── Match bar helper ─────────────────────────────────────────────────────────
const MatchBar = ({ score }) => {
  const cls = score >= 75 ? 'match-bar-green' : score >= 50 ? 'match-bar-violet' : score >= 30 ? 'match-bar-amber' : 'match-bar-rose';
  const badgeCls = score >= 75 ? 'match-high' : score >= 50 ? 'match-medium' : 'match-low';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>Match score</span>
        <span className={`match-badge ${badgeCls}`}>{score}% match</span>
      </div>
      <div className="match-bar-track">
        <div className={`match-bar-fill ${cls}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

// ─── Apply Modal ──────────────────────────────────────────────────────────────
const ApplyModal = ({ job, onClose, onSuccess, existingApp }) => {
  const [form, setForm] = useState({ coverLetter: '', phone: '', linkedIn: '', portfolio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const already = !!existingApp;

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await axios.post('/api/applications', { jobId: job.id, ...form });
      onSuccess(res.data.application);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: `linear-gradient(135deg, ${job.logoColor}, ${job.logoColor}99)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {job.logo}
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{job.title}</h2>
                <p style={{ fontSize: 13, color: '#64748b' }}>{job.company} · {job.location}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: '#f8fafc',
              border: '1px solid #e2e8f0', cursor: 'pointer', color: '#94a3b8' }}>
              <Ic n="close" size={16} />
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <MatchBar score={job.matchScore} />
          </div>
        </div>

        {already ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Ic n="check" size={26} color="#15803d" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Already Applied!</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Applied on {new Date(existingApp.appliedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <span className={`status-pill status-${existingApp.status}`}>
              ● {existingApp.status.charAt(0).toUpperCase() + existingApp.status.slice(1)}
            </span>
            <div style={{ marginTop: 24 }}>
              <button onClick={onClose} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>
            {error && (
              <div style={{ background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#be123c' }}>⚠️ {error}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cover Letter <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <textarea value={form.coverLetter} onChange={e => setForm(p => ({ ...p, coverLetter: e.target.value }))}
                  placeholder="Tell the employer why you're a great fit..." className="input-field" style={{ minHeight: 100 }} required />
              </div>
              <div className="apply-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LinkedIn</label>
                  <input value={form.linkedIn} onChange={e => setForm(p => ({ ...p, linkedIn: e.target.value }))} placeholder="linkedin.com/in/you" className="input-field" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio / GitHub</label>
                <input value={form.portfolio} onChange={e => setForm(p => ({ ...p, portfolio: e.target.value }))} placeholder="github.com/yourname" className="input-field" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>Cancel</button>
                <button type="submit" disabled={loading || !form.coverLetter} className="btn-navy" style={{ flex: 2, justifyContent: 'center', padding: '11px' }}>
                  {loading ? 'Submitting...' : <><Ic n="send" size={14} /> Submit Application</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, onHide }) => {
  useEffect(() => { const t = setTimeout(onHide, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className="toast">
      <Ic n="check" size={16} color="#86efac" />
      {msg}
    </div>
  );
};

// ─── Job Card ─────────────────────────────────────────────────────────────────
const JobCard = ({ job, saved, onSave, onApply, applied, selected, onSelect, delay = 0 }) => {
  const typeTag = { 'Full-time': 'tag-green', 'Remote': 'tag-blue', 'Contract': 'tag-amber' };
  return (
    <div onClick={onSelect} className={`job-card anim-fade-up ${selected ? 'selected' : ''}`} style={{ animationDelay: `${delay}s` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${job.logoColor}, ${job.logoColor}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
          {job.logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{job.title}</h3>
              <p style={{ fontSize: 12, color: '#64748b' }}>{job.company}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onSave(job.id); }} style={{
              padding: 4, borderRadius: 6, background: saved ? '#fef3c7' : '#f8fafc',
              border: `1px solid ${saved ? '#fde68a' : '#e2e8f0'}`, cursor: 'pointer',
              color: saved ? '#d97706' : '#94a3b8', flexShrink: 0 }}>
              <Ic n="saved" size={14} color="currentColor" />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <span className={`tag ${typeTag[job.type] || 'tag-gray'}`}>{job.type}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }} className="tag tag-gray">
          <Ic n="location" size={10} />{job.location}
        </span>
        <span className="tag tag-gray" style={{ fontWeight: 700, color: '#2d2b6e' }}>{job.salary}</span>
      </div>

      <MatchBar score={job.matchScore} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10, marginBottom: 12 }}>
        {job.tags.slice(0, 3).map(t => <span key={t} className="skill-chip" style={{ fontSize: 11, padding: '2px 8px' }}>{t}</span>)}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        {job.matchScore >= 60 ? (
          <button onClick={e => { e.stopPropagation(); onApply(job); }}
            className={applied ? 'btn-ghost' : 'btn-navy'}
            style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12 }}>
            {applied ? <><Ic n="check" size={12} color="#15803d" /> Applied</> : 'Apply Now →'}
          </button>
        ) : (
          <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontSize: 12, color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
            Requires 60% match to apply
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Job Detail Panel ─────────────────────────────────────────────────────────
const JobDetail = ({ job, applied, onApply, saved, onSave }) => {
  if (!job) return (
    <div className="card" style={{ padding: 40, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Select a job to view details</p>
      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Click any job card on the left</p>
    </div>
  );
  return (
    <div className="card" style={{ padding: 28, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: `linear-gradient(135deg, ${job.logoColor}, ${job.logoColor}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
          {job.logo}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{job.title}</h2>
          <p style={{ fontSize: 14, color: '#64748b' }}>{job.company} · {job.location}</p>
        </div>
        <button onClick={() => onSave(job.id)} style={{
          padding: '6px 10px', borderRadius: 8, background: saved ? '#fef3c7' : '#f8fafc',
          border: `1px solid ${saved ? '#fde68a' : '#e2e8f0'}`, cursor: 'pointer', color: saved ? '#d97706' : '#94a3b8' }}>
          <Ic n="saved" size={16} color="currentColor" />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {job.type && <span className={`tag ${job.type === 'Full-time' ? 'tag-green' : job.type === 'Remote' ? 'tag-blue' : 'tag-amber'}`}>{job.type}</span>}
        <span className="tag tag-gray" style={{ fontWeight: 700, color: '#2d2b6e' }}>{job.salary}</span>
        <span className="tag tag-gray">{job.experience}</span>
        <span className="tag tag-gray">{job.postedDaysAgo}d ago</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <MatchBar score={job.matchScore} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <p className="section-title-sm">About the Role</p>
        <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>{job.description}</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p className="section-title-sm">Required Skills</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {job.tags.map(t => <span key={t} className="skill-chip">{t}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {job.matchScore >= 60 ? (
          <button onClick={() => onApply(job)} className={applied ? 'btn-ghost' : 'btn-navy'}
            style={{ flex: 2, justifyContent: 'center', padding: '12px' }}>
            {applied ? <><Ic n="check" size={14} color="#15803d" /> Application Submitted</> : <><Ic n="send" size={14} /> Apply Now</>}
          </button>
        ) : (
          <div style={{ flex: 2, textAlign: 'center', padding: '12px', color: '#94a3b8', background: '#f8fafc', borderRadius: 8, fontWeight: 500 }}>
            You need at least a 60% match score to apply for this position.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Radar Chart ──────────────────────────────────────────────────────────────
const SkillRadar = ({ userSkills, cats }) => {
  const getCatScore = (id) => {
    const cat = cats.find(c => c.id === id);
    if (!cat) return 0;
    const matched = userSkills.filter(us => cat.skills.some(s => s.id === us.id));
    if (!matched.length) return 0;
    return Math.round(matched.reduce((s, sk) => s + (sk.level || 1), 0) / matched.length * 20);
  };
  const display = cats.slice(0, 7);
  const data = {
    labels: display.map(c => c.name.split(' & ')[0].split(' ')[0]),
    datasets: [{
      label: 'Proficiency',
      data: display.map(c => getCatScore(c.id)),
      backgroundColor: 'rgba(79,70,229,0.08)',
      borderColor: '#4f46e5',
      borderWidth: 2,
      pointBackgroundColor: '#2d2b6e',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      fill: true,
    }]
  };
  const opts = {
    responsive: true, maintainAspectRatio: true,
    scales: {
      r: {
        min: 0, max: 100,
        angleLines: { color: '#e2e8f0' },
        grid: { color: '#e2e8f0' },
        ticks: { backdropColor: 'transparent', color: '#94a3b8', font: { size: 9 }, stepSize: 25 },
        pointLabels: { color: '#334155', font: { size: 11, weight: '600', family: 'Inter' } }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
        titleColor: '#0f172a', bodyColor: '#64748b',
        shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)',
        callbacks: { label: ctx => ` ${ctx.raw}% proficiency` }
      }
    }
  };
  return <Radar data={data} options={opts} />;
};

// ─── Applications Tab ─────────────────────────────────────────────────────────
const ApplicationsView = ({ applications, onWithdraw }) => {
  const STATUS_STEPS = ['applied', 'reviewed', 'interview', 'offered'];
  const statusInfo = {
    applied:   { label: 'Applied',   cls: 'status-applied' },
    reviewed:  { label: 'Reviewed',  cls: 'status-reviewed' },
    interview: { label: 'Interview', cls: 'status-interview' },
    offered:   { label: 'Offered',   cls: 'status-offered' },
    rejected:  { label: 'Rejected',  cls: 'status-rejected' },
  };
  if (!applications.length) return (
    <div className="card empty-state">
      <div className="empty-state-icon">📋</div>
      <h3 className="empty-state-title">No Applications Yet</h3>
      <p className="empty-state-sub">Apply to jobs from the Job Matches tab to track your progress here</p>
    </div>
  );
  return (
    <div className="anim-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {applications.map(app => {
        const si = statusInfo[app.status] || statusInfo.applied;
        const stepIdx = STATUS_STEPS.indexOf(app.status);
        return (
          <div key={app.id} className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${app.logoColor}, ${app.logoColor}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {app.logo}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{app.jobTitle}</h3>
                    <p style={{ fontSize: 13, color: '#64748b' }}>{app.company} · {app.location}</p>
                  </div>
                  <span className={`status-pill ${si.cls}`}>● {si.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2d2b6e' }}>{app.salary}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Applied {new Date(app.appliedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Progress tracker */}
            {app.status !== 'rejected' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {STATUS_STEPS.map((s, i) => {
                    const done = i <= stepIdx;
                    const active = i === stepIdx;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, transition: 'all 0.3s',
                            background: done ? '#2d2b6e' : '#f1f5f9',
                            color: done ? 'white' : '#94a3b8',
                            border: `2px solid ${done ? '#2d2b6e' : '#e2e8f0'}`,
                            boxShadow: active ? '0 0 0 3px rgba(45,43,110,0.15)' : 'none' }}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span style={{ fontSize: 9, marginTop: 3, fontWeight: done ? 600 : 400, color: done ? '#2d2b6e' : '#94a3b8', whiteSpace: 'nowrap' }}>{statusInfo[s]?.label}</span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div style={{ flex: 1, height: 2, marginBottom: 14, marginLeft: 4, marginRight: 4, background: i < stepIdx ? '#2d2b6e' : '#e2e8f0', transition: 'background 0.3s' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {app.coverLetter && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f8faff', border: '1px solid #e0e7ff', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cover Letter</p>
                <p style={{ fontSize: 13, color: '#334155', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{app.coverLetter}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              {app.linkedIn && <a href={`https://${app.linkedIn.replace('https://', '')}`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}><Ic n="link" size={12} /> LinkedIn</a>}
              {app.portfolio && <a href={`https://${app.portfolio.replace('https://', '')}`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}><Ic n="link" size={12} /> Portfolio</a>}
              <button onClick={() => onWithdraw(app.id)} className="btn-danger" style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 12px' }}>
                <Ic n="trash" size={12} /> Withdraw
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [jobs, setJobs] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [applyJob, setApplyJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [toast, setToast] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTargetRole, setSelectedTargetRole] = useState(user?.profile?.targetRole || '');

  const userSkills = user?.profile?.skills || [];
  const appliedIds = new Set(applications.map(a => a.jobId));

  useEffect(() => {
    Promise.all([
      axios.get('/api/jobs'),
      axios.get('/api/skills'),
      axios.get('/api/applications'),
    ]).then(([jRes, sRes, aRes]) => {
      setJobs(jRes.data.jobs);
      setCats(sRes.data.categories);
      setApplications(aRes.data.applications);
      setSelectedJob(jRes.data.jobs[0] || null);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const ms = !search || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    const mt = filterType === 'all' || j.type.toLowerCase().includes(filterType.toLowerCase());
    return ms && mt;
  }).sort((a, b) => b.matchScore - a.matchScore);

  const topJobs = [...jobs].sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
  const avgMatch = jobs.length ? Math.round(jobs.reduce((s, j) => s + j.matchScore, 0) / jobs.length) : 0;

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleSave = (id) => setSaved(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleApply = (job) => { const ex = applications.find(a => a.jobId === job.id); setApplyJob({ ...job, _existing: ex || null }); };
  const handleApplySuccess = (newApp) => { setApplications(p => [...p, newApp]); setApplyJob(null); setToast(`Applied to ${newApp.jobTitle} at ${newApp.company}!`); };
  const handleWithdraw = async (appId) => {
    if (!window.confirm('Withdraw this application?')) return;
    try { await axios.delete(`/api/applications/${appId}`); setApplications(p => p.filter(a => a.id !== appId)); setToast('Application withdrawn'); }
    catch { alert('Failed to withdraw'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2d2b6e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
        <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8' }}>
      <TopNav tab={tab} setTab={setTab} user={user} logout={handleLogout} />

      <div className="page-container">

        {/* ══ HOME ══ */}
        {tab === 'home' && (
          <div>
            {/* Hero */}
            <div className="hero-card anim-fade-up">
              <p className="hero-label">AI-POWERED CAREER GUIDANCE</p>
              <h1 className="hero-h1">Discover the career <em>you<br/>were built for</em></h1>
              <p className="hero-sub">Assess your skills, match with real job roles, identify your gaps, and get a personalised learning roadmap — in minutes.</p>
              <div className="hero-buttons">
                <button onClick={() => navigate('/onboarding')} className="btn-primary">Start Assessment →</button>
                <button onClick={() => setTab('jobs')} className="btn-outline">View Job Matches</button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="anim-stagger stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
              {[
                { icon: '💼', color: '#ede9fe', v: `${jobs.length || 340}+`, l: 'Job Roles Mapped' },
                { icon: '✅', color: '#dcfce7', v: `${userSkills.length || 120}+`, l: 'Skills Tracked' },
                { icon: '📚', color: '#fef3c7', v: '1,800+', l: 'Courses Available' },
                { icon: '🎓', color: '#fce7f3', v: '28,400', l: 'Students Guided' },
              ].map(s => (
                <div key={s.l} className="stat-card">
                  <div className="stat-card-icon" style={{ background: s.color }}>{s.icon}</div>
                  <div className="stat-card-value">{s.v.includes('+') ? <>{s.v.replace('+','')}<span>+</span></> : s.v}</div>
                  <div className="stat-card-label">{s.l}</div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <h2 className="section-title" style={{ marginBottom: 16 }}>How it works</h2>
            <div className="anim-stagger how-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 40 }}>
              {[
                { n: '01', icon: '🎯', c: '#4f46e5', t: 'Assess Skills', d: 'Rate yourself across 15+ competencies spanning technical and soft skills.' },
                { n: '02', icon: '🤝', c: '#22c55e', t: 'Get Matched', d: 'Our algorithm matches your profile to 300+ job roles with a fit score.' },
                { n: '03', icon: '📈', c: '#f59e0b', t: 'Identify Gaps', d: 'See exactly which skills you need to develop for your target role.' },
                { n: '04', icon: '🎓', c: '#8b5cf6', t: 'Learn & Grow', d: 'Get curated courses and resources to close each gap efficiently.' },
              ].map(s => (
                <div key={s.n} className="how-card">
                  <span className="how-card-num">{s.n}</span>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{s.t}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>{s.d}</p>
                </div>
              ))}
            </div>

            {/* Top matches */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>Your top matches</h2>
              <button onClick={() => setTab('jobs')} style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <Ic n="arrow" size={14} color="#4f46e5" />
              </button>
            </div>
            <div className="top-matches-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 40 }}>
              {topJobs.map((job, i) => (
                <div key={job.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${job.logoColor}, ${job.logoColor}88)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 12 }}>
                        {job.logo}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{job.title}</p>
                        <p style={{ fontSize: 12, color: '#64748b' }}>{job.company} · {job.type}</p>
                      </div>
                    </div>
                    <span className={`match-badge ${job.matchScore >= 75 ? 'match-high' : job.matchScore >= 50 ? 'match-medium' : 'match-low'}`}>
                      {job.matchScore}% match
                    </span>
                  </div>
                  <div className="match-bar-track">
                    <div className={`match-bar-fill ${job.matchScore >= 75 ? 'match-bar-green' : 'match-bar-violet'}`} style={{ width: `${job.matchScore}%` }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                    {job.tags.slice(0, 3).map(t => <span key={t} className="tag tag-gray">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Skill Radar */}
            {userSkills.length > 0 && (
              <div className="skill-gap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Skill Radar</h3>
                    <button onClick={() => navigate('/onboarding')} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                      <Ic n="edit" size={12} /> Update
                    </button>
                  </div>
                  <SkillRadar userSkills={userSkills} cats={cats} />
                </div>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Your Skills</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {userSkills.map(sk => {
                      const name = cats.flatMap(c => c.skills).find(s => s.id === sk.id)?.name || sk.id;
                      return <span key={sk.id} className="skill-chip">{name} <span style={{ opacity: 0.5 }}>L{sk.level}</span></span>;
                    })}
                  </div>
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                      {[{ v: avgMatch + '%', l: 'Avg Match' }, { v: applications.length, l: 'Applied' }, { v: saved.size, l: 'Saved' }].map(s => (
                        <div key={s.l} style={{ textAlign: 'center' }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2d2b6e' }}>{s.v}</p>
                          <p style={{ fontSize: 12, color: '#94a3b8' }}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ JOB MATCHES ══ */}
        {tab === 'jobs' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 className="page-title" style={{ fontStyle: 'italic' }}>perfect matches for you.</h1>
              <p className="page-subtitle">{filtered.length} job listings match your profile</p>
            </div>

            {/* Filter bar */}
            <div className="card filter-bar" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search-wrapper" style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Ic n="search" size={15} />
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search jobs, companies, skills..."
                  className="input-field" style={{ paddingLeft: 38, paddingTop: 8, paddingBottom: 8 }} />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="input-field" style={{ width: 130, paddingTop: 8, paddingBottom: 8 }}>
                <option value="all">All Types</option>
                <option value="full-time">Full-time</option>
                <option value="remote">Remote</option>
              </select>
              {(search || filterType !== 'all') && (
                <button onClick={() => { setSearch(''); setFilterType('all'); }} className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>Clear</button>
              )}
              <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 'auto' }}>{filtered.length} results</span>
            </div>

            {/* Two-col: list + detail */}
            <div className="jobs-split" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, minHeight: 600 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: '75vh', paddingRight: 4 }}>
                {filtered.length > 0 ? filtered.map((job, i) => (
                  <JobCard key={job.id} job={job} saved={saved.has(job.id)} onSave={toggleSave}
                    onApply={handleApply} applied={appliedIds.has(job.id)}
                    selected={selectedJob?.id === job.id} onSelect={() => setSelectedJob(job)}
                    delay={Math.min(i * 0.04, 0.25)} />
                )) : (
                  <div className="card empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <p className="empty-state-title">No results</p>
                    <button onClick={() => { setSearch(''); setFilterType('all'); }} className="btn-navy" style={{ margin: '0 auto' }}>Clear Filters</button>
                  </div>
                )}
              </div>
              <div className="job-detail-sticky" style={{ position: 'sticky', top: 80, height: 'calc(75vh)', overflowY: 'auto' }}>
                <JobDetail job={selectedJob} applied={selectedJob ? appliedIds.has(selectedJob.id) : false}
                  onApply={handleApply} saved={selectedJob ? saved.has(selectedJob.id) : false} onSave={toggleSave} />
              </div>
            </div>
          </div>
        )}

        {/* ══ CAREER GUIDANCE ══ */}
        {tab === 'career' && (
          <div style={{ maxWidth: 850, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 className="page-title" style={{ fontStyle: 'italic' }}>career guidance & skill gap.</h1>
              <p className="page-subtitle">Select your target role to identify skill gaps and reach the 60% match threshold required to apply.</p>
            </div>

            {/* Target Role Selector Card */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                    🎯 Choose Target Role
                  </label>
                  <select 
                    value={selectedTargetRole || (jobs[0]?.title || '')} 
                    onChange={e => setSelectedTargetRole(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff', fontWeight: 600 }}
                  >
                    {Array.from(new Set(jobs.map(j => j.title))).map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>

                {/* Suggested Alternative Roles */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    💡 Suggested Roles
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {topJobs.slice(0, 4).map(j => (
                      <button key={j.id} onClick={() => setSelectedTargetRole(j.title)}
                        style={{ padding: '5px 10px', borderRadius: 20, fontSize: 12, border: '1px solid #e2e8f0', background: (selectedTargetRole || jobs[0]?.title) === j.title ? '#4f46e5' : '#f8fafc', color: (selectedTargetRole || jobs[0]?.title) === j.title ? '#fff' : '#334155', cursor: 'pointer', fontWeight: 600 }}>
                        {j.title} ({j.matchScore}%)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Role Guidance Details */}
            {(() => {
              const currentRoleTitle = selectedTargetRole || jobs[0]?.title;
              const targetJob = jobs.find(j => j.title === currentRoleTitle) || jobs[0];
              if (!targetJob) return <p>No role selected.</p>;

              const userSkillMap = new Map(userSkills.map(s => [s.id, s.level]));
              const required = targetJob.requiredSkills || [];

              const possessedSkills = required.filter(r => userSkillMap.has(r.id));
              const missingSkills = required.filter(r => !userSkillMap.has(r.id));
              const isEligibleToApply = targetJob.matchScore >= 60;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                  {/* Status Banner */}
                  <div className="card" style={{ padding: 24, background: isEligibleToApply ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fff1f2, #ffe4e6)', borderColor: isEligibleToApply ? '#bbf7d0' : '#fecdd3' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{isEligibleToApply ? '🎉' : '🔒'}</span>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: isEligibleToApply ? '#166534' : '#991b1b' }}>
                            {isEligibleToApply ? 'Eligible to Apply!' : 'Application Locked (< 60% Match)'}
                          </h3>
                        </div>
                        <p style={{ fontSize: 13, color: isEligibleToApply ? '#15803d' : '#9f1239' }}>
                          Your fit score for <strong>{targetJob.title}</strong> is <strong>{targetJob.matchScore}%</strong>.
                          {isEligibleToApply ? ' You exceed the minimum 60% requirement!' : ' Acquire the missing skills below to reach the 60% threshold.'}
                        </p>
                      </div>

                      {isEligibleToApply ? (
                        <button onClick={() => { setTab('jobs'); setSearch(targetJob.title); }} className="btn-navy" style={{ padding: '10px 18px' }}>
                          View Jobs & Apply →
                        </button>
                      ) : (
                        <button onClick={() => navigate('/onboarding')} className="btn-outline" style={{ padding: '10px 18px', background: '#fff' }}>
                          Update Profile Skills ✏️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Skill Breakdown Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Possessed Skills */}
                    <div className="card" style={{ padding: 20 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Ic n="check" size={18} color="#15803d" /> Matched Skills ({possessedSkills.length}/{required.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {possessedSkills.map(r => {
                          const skillObj = cats.flatMap(c => c.skills).find(s => s.id === r.id);
                          const lvl = userSkillMap.get(r.id);
                          return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #dcfce7' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{skillObj?.name || r.id}</span>
                              <span className="tag tag-green" style={{ fontSize: 11 }}>Level {lvl}/5</span>
                            </div>
                          );
                        })}
                        {!possessedSkills.length && <p style={{ fontSize: 13, color: '#94a3b8' }}>No matching skills found for this role yet.</p>}
                      </div>
                    </div>

                    {/* Missing Skills / Gaps */}
                    <div className="card" style={{ padding: 20 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Ic n="gaps" size={18} color="#b91c1c" /> Skill Gaps to Learn ({missingSkills.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {missingSkills.map(r => {
                          const skillObj = cats.flatMap(c => c.skills).find(s => s.id === r.id);
                          return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff1f2', borderRadius: 8, border: '1px solid #ffe4e6' }}>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', display: 'block' }}>{skillObj?.name || r.id}</span>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>Weight: {r.weight}% of match score</span>
                              </div>
                              <span className="tag tag-amber" style={{ fontSize: 11 }}>Recommended</span>
                            </div>
                          );
                        })}
                        {!missingSkills.length && <p style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>Great job! You have all required skills for this role.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ SKILL GAPS ══ */}
        {tab === 'skills' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 className="page-title" style={{ fontStyle: 'italic' }}>know your strengths.</h1>
              <p className="page-subtitle">Visual breakdown of your skill proficiency across categories</p>
            </div>
            <div className="skill-gap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Skill Radar Chart</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Visual overview across all categories</p>
                {userSkills.length > 0 ? <SkillRadar userSkills={userSkills} cats={cats} /> : (
                  <div className="empty-state"><div className="empty-state-icon">🕸️</div><p className="empty-state-sub">Add skills to see your radar chart</p>
                    <button onClick={() => navigate('/onboarding')} className="btn-navy" style={{ margin: '0 auto' }}>Add Skills</button></div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Category Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {cats.map(cat => {
                      const matched = userSkills.filter(us => cat.skills.some(s => s.id === us.id));
                      if (!matched.length) return null;
                      const avg = matched.reduce((s, sk) => s + (sk.level || 1), 0) / matched.length;
                      const pct = Math.round(avg * 20);
                      return (
                        <div key={cat.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{cat.icon} {cat.name}</span>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>{matched.length} skill{matched.length !== 1 ? 's' : ''}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#2d2b6e' }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2d2b6e, #8b5cf6)' }} />
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>All Skills</h3>
                    <button onClick={() => navigate('/onboarding')} className="btn-navy" style={{ fontSize: 12, padding: '7px 14px' }}>+ Update Skills</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {userSkills.map(sk => {
                      const name = cats.flatMap(c => c.skills).find(s => s.id === sk.id)?.name || sk.id;
                      return <span key={sk.id} className="skill-chip">{name} <span style={{ opacity: 0.5 }}>L{sk.level}</span></span>;
                    })}
                    {!userSkills.length && <p style={{ fontSize: 13, color: '#94a3b8' }}>No skills added yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ APPLICATIONS ══ */}
        {tab === 'applied' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 className="page-title" style={{ fontStyle: 'italic' }}>your applications.</h1>
              <p className="page-subtitle">{applications.length} application{applications.length !== 1 ? 's' : ''} submitted</p>
            </div>
            <ApplicationsView applications={applications} onWithdraw={handleWithdraw} />
          </div>
        )}

        {/* ══ PROFILE ══ */}
        {tab === 'profile' && (
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 className="page-title" style={{ fontStyle: 'italic' }}>your profile.</h1>
              <p className="page-subtitle">Manage your career details and settings</p>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                <div className="counselor-avatar" style={{ width: 64, height: 64, fontSize: 24, borderRadius: 18 }}>
                  {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{user?.fullName || user?.username}</h2>
                  <p style={{ fontSize: 14, color: '#64748b' }}>{user?.email}</p>
                  <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
                    {user?.profile?.targetRole && <span className="tag tag-navy">{user.profile.targetRole}</span>}
                    {user?.profile?.experience && <span className="tag tag-blue">{user.profile.experience}</span>}
                  </div>
                </div>
              </div>
              <div className="profile-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { l: 'Username', v: user?.username },
                  { l: 'Email', v: user?.email },
                  { l: 'Target Role', v: user?.profile?.targetRole || '—' },
                  { l: 'Experience', v: user?.profile?.experience || '—' },
                  { l: 'Education', v: user?.profile?.education || '—' },
                  { l: 'Skills Count', v: `${userSkills.length} skills` },
                  { l: 'Applications', v: `${applications.length} submitted` },
                  { l: 'Saved Jobs', v: `${saved.size} saved` },
                ].map(({ l, v }) => (
                  <div key={l} style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{l}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/onboarding')} className="btn-navy" style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                ✏️ Update Profile & Skills
              </button>
            </div>
            <div className="card" style={{ padding: 22, borderColor: '#fecdd3' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sign Out</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>You'll need to sign in again to access your dashboard</p>
              <button onClick={handleLogout} className="btn-danger" style={{ padding: '10px 20px' }}>Sign Out →</button>
            </div>
          </div>
        )}
      </div>

      {applyJob && (
        <ApplyModal job={applyJob} existingApp={applyJob._existing}
          onClose={() => setApplyJob(null)} onSuccess={handleApplySuccess} />
      )}
      {toast && <Toast msg={toast} onHide={() => setToast('')} />}
    </div>
  );
}
