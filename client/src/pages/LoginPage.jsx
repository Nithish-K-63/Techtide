import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '' });
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        const u = await login(form.username, form.password);
        if (u?.role === 'recruiter') { navigate('/dashboard'); return; }
        navigate(u?.profile?.skills?.length > 0 ? '/dashboard' : '/onboarding');
      } else {
        if (!form.fullName || !form.username || !form.email || !form.password)
          return setError('All fields are required');
        const u = await register(form.username, form.email, form.password, form.fullName, role);
        if (u?.role === 'recruiter') { navigate('/dashboard'); return; }
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-bg">
      {/* Nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #e8eaf0', display: 'flex',
        alignItems: 'center', gap: 10, padding: '0 16px', height: 56,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2d2b6e',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <StarIcon />
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>CareerPath</span>
      </div>

      <div className="login-split" style={{ paddingTop: 70, width: '100%', display: 'flex', flexWrap: 'wrap', gap: 0, minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        {/* Left — Hero */}
        <div className="login-hero-left" style={{ flex: 1, padding: '48px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 560 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24,
            background: 'rgba(79,70,229,0.07)', border: '1px solid #c7d2fe',
            borderRadius: 20, padding: '4px 14px', width: 'fit-content' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.06em' }}>AI-POWERED CAREER GUIDANCE</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 44, fontWeight: 700, lineHeight: 1.15, color: '#0f172a', marginBottom: 16 }}>
            Discover the career <em style={{ color: '#4f46e5', fontStyle: 'italic' }}>you were built for</em>
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 40, maxWidth: 440 }}>
            Assess your skills, match with real job roles, identify your gaps, and get a personalised learning roadmap — in minutes.
          </p>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { num: '01', icon: '🎯', title: 'Assess Skills', desc: 'Rate yourself across 15+ competencies spanning technical and soft skills.' },
              { num: '02', icon: '🤝', title: 'Get Matched', desc: 'Our algorithm matches your profile to 300+ job roles with a fit score.' },
              { num: '03', icon: '📈', title: 'Identify Gaps', desc: 'See exactly which skills you need to develop for your target role.' },
              { num: '04', icon: '🎓', title: 'Learn & Grow', desc: 'Get curated courses and resources to close each gap efficiently.' },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f2f8',
                  border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 44, paddingTop: 32, borderTop: '1px solid #e2e8f0' }}>
            {[{ v: '340+', l: 'Job Roles' }, { v: '120+', l: 'Skills Tracked' }, { v: '28K+', l: 'Students Guided' }].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2d2b6e' }}>{s.v}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form card */}
        <div className="login-form-right" style={{ flex: '0 1 420px', padding: '40px 24px', maxWidth: '100%' }}>
          <div className="login-card" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
            <div className="login-logo-box">⚡</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              {mode === 'login' ? 'Sign in to access your career dashboard' : 'Start your personalised career journey today'}
            </p>

            {/* Tabs */}
            <div className="login-tab-bar">
              <button className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Sign In</button>
              <button className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>Register</button>
            </div>

            {error && (
              <div style={{ background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8,
                padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#be123c', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mode === 'register' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                    <input value={form.fullName} onChange={e => update('fullName', e.target.value)}
                      placeholder="John Doe" className="input-field" required />
                  </div>
                )}
                {mode === 'register' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>I am registering as</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[{v:'user', label:'🎯 Job Seeker', desc:'Find and apply for jobs'}, {v:'recruiter', label:'🧑‍💼 Recruiter', desc:'Review and manage applications'}].map(r => (
                        <button key={r.v} type="button" onClick={() => setRole(r.v)}
                          style={{
                            flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${role === r.v ? '#4f46e5' : '#e2e8f0'}`,
                            background: role === r.v ? 'rgba(79,70,229,0.06)' : '#fff',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s'
                          }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: role === r.v ? '#4f46e5' : '#0f172a' }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {mode === 'login' ? 'Username or Email' : 'Username'}
                  </label>
                  <input value={form.username} onChange={e => update('username', e.target.value)}
                    placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                    className="input-field" required />
                </div>
                {mode === 'register' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                    <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      placeholder="you@example.com" className="input-field" required />
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                    {mode === 'login' && <button type="button" style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Forgot?</button>}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                      placeholder="••••••••" className="input-field" style={{ paddingRight: 42 }} required />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15 }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-navy" style={{ marginTop: 4, padding: '13px 24px', fontSize: 15, justifyContent: 'center', width: '100%' }}>
                  {loading ? (
                    <><svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Please wait...</>
                  ) : mode === 'login' ? 'Sign In to Dashboard →' : 'Create My Account →'}
                </button>
              </div>
            </form>

            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                style={{ color: '#4f46e5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                {mode === 'login' ? 'Register here' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
