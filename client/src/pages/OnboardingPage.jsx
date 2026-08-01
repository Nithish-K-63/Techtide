import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const EXP = ['Student / Fresher', '0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];
const EDU = ['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD', 'Self-Taught / Bootcamp'];
const LVL_LABELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
const LVL_COLORS = ['#94a3b8', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6'];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [cats, setCats] = useState([]);
  const [selSkills, setSelSkills] = useState({});
  const [activeCat, setActiveCat] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState({ targetRole: '', experience: '', education: '' });
  const fileRef = useRef();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const total = Object.keys(selSkills).length;

  useEffect(() => {
    axios.get('/api/skills').then(r => {
      setCats(r.data.categories);
      setActiveCat(r.data.categories[0]?.id);
    });
  }, []);

  const [extractedInfo, setExtractedInfo] = useState('');

  const setFile = (f) => {
    const okExts = ['.pdf', '.doc', '.docx', '.json'];
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!okExts.includes(ext)) return alert('Please upload PDF, Word, or JSON file');
    setResumeFile(f);
  };

  const handleUpload = async () => {
    if (!resumeFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', resumeFile);
      const res = await axios.post('/api/profile/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploaded(true);
      if (res.data.extractedSkills && res.data.extractedSkills.length > 0) {
        setExtractedInfo(`Extracted ${res.data.extractedSkills.length} skills from your JSON resume!`);
        setSelSkills(prev => {
          const next = { ...prev };
          res.data.extractedSkills.forEach(s => { next[s.id] = s.level || 4; });
          return next;
        });
      }
    } catch { alert('Upload failed'); }
    finally { setUploading(false); }
  };

  const toggleSkill = (id) => setSelSkills(p => {
    if (p[id] !== undefined) { const n = { ...p }; delete n[id]; return n; }
    return { ...p, [id]: 3 };
  });

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Fetch the current profile to get skills already saved from resume upload
      let existingSkills = [];
      try {
        const profileRes = await axios.get('/api/profile');
        existingSkills = profileRes.data.user?.profile?.skills || [];
      } catch {}

      // Merge resume-extracted skills + manually selected skills (manual overrides level)
      const mergedMap = {};
      existingSkills.forEach(s => { mergedMap[s.id] = s.level; });
      Object.entries(selSkills).forEach(([id, level]) => { mergedMap[id] = level; });
      const skills = Object.entries(mergedMap).map(([id, level]) => ({ id, level }));

      const res = await axios.put('/api/profile/skills', { skills, ...info });
      updateUser(res.data.user);
      navigate('/dashboard');
    } catch { alert('Save failed. Try again.'); }
    finally { setSaving(false); }
  };

  const stepData = [
    { n: 1, label: 'Your Info', icon: '👤' },
    { n: 2, label: 'Resume',   icon: '📄' },
    { n: 3, label: 'Skills',   icon: '🎯' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8' }}>
      {/* Top Nav */}
      <nav className="onboarding-nav" style={{ background: '#fff', borderBottom: '1px solid #e8eaf0', height: 64,
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2d2b6e',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>CareerPath</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Setting up your profile</span>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '7px 14px', borderRadius: 8,
            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            Skip →
          </button>
        </div>
      </nav>

      <div className="onboarding-container" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div className="onboarding-header" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px',
            background: 'rgba(79,70,229,0.07)', border: '1px solid #c7d2fe', borderRadius: 20, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>👋 Welcome, {user?.fullName || user?.username}!</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Set Up Your Career Profile
          </h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>Takes less than 2 minutes · Personalised job matches await</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
          {stepData.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button onClick={() => step > s.n && setStep(s.n)}
                  className={`wizard-step-dot ${step > s.n ? 'done' : step === s.n ? 'active' : 'todo'}`}
                  style={{ cursor: step > s.n ? 'pointer' : 'default' }}>
                  {step > s.n ? '✓' : s.icon}
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  color: step >= s.n ? '#2d2b6e' : '#94a3b8' }}>{s.label}</span>
              </div>
              {i < stepData.length - 1 && (
                <div className="wizard-connector" style={{ width: 100, background: step > s.n ? '#2d2b6e' : '#e2e8f0', marginBottom: 20, marginLeft: 8, marginRight: 8 }} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Info ── */}
        {step === 1 && (
          <div className="card anim-fade-up onboarding-card" style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tell us about yourself</h2>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>This helps us find the right job matches for you</p>
              </div>
            </div>
            <div className="info-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Role</label>
                <input value={info.targetRole} onChange={e => setInfo(p => ({ ...p, targetRole: e.target.value }))}
                  placeholder="e.g. Full Stack Developer, Data Scientist..."
                  className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience Level</label>
                <select value={info.experience} onChange={e => setInfo(p => ({ ...p, experience: e.target.value }))}
                  className="input-field">
                  <option value="">Select level</option>
                  {EXP.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Education</label>
                <select value={info.education} onChange={e => setInfo(p => ({ ...p, education: e.target.value }))}
                  className="input-field">
                  <option value="">Select education</option>
                  {EDU.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
              <button onClick={() => setStep(2)} className="btn-navy" style={{ padding: '12px 28px' }}>
                Continue to Resume →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Resume ── */}
        {step === 2 && (
          <div className="card anim-fade-up onboarding-card" style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📄</div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Upload Your Resume</h2>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>PDF, Word, or JSON document · Max 5MB</p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !resumeFile && fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#4f46e5' : uploaded ? '#22c55e' : resumeFile ? '#4f46e5' : '#cbd5e1'}`,
                borderRadius: 14, padding: '52px 24px', textAlign: 'center',
                background: dragOver ? '#f5f3ff' : uploaded ? '#f0fdf4' : resumeFile ? '#f5f3ff' : '#f8fafc',
                cursor: resumeFile ? 'default' : 'pointer', transition: 'all 0.2s'
              }}>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.json" hidden onChange={e => setFile(e.target.files[0])} />

              {uploaded ? (
                <div>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>✅</div>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 16, marginBottom: 4 }}>Resume Uploaded!</p>
                  <p style={{ fontSize: 13, color: '#64748b' }}>{resumeFile.name}</p>
                  {extractedInfo && <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginTop: 8 }}>{extractedInfo}</p>}
                </div>
              ) : resumeFile ? (
                <div>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>📄</div>
                  <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{resumeFile.name}</p>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{(resumeFile.size / 1024).toFixed(1)} KB</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); handleUpload(); }} disabled={uploading} className="btn-navy" style={{ padding: '9px 20px' }}>
                      {uploading ? 'Uploading & Extracting...' : '⬆️ Upload Now'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setResumeFile(null); }} className="btn-ghost" style={{ padding: '9px 16px' }}>Remove</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>📁</div>
                  <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 15, marginBottom: 6 }}>Drag & drop your resume here</p>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>or click to browse files</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    {['JSON', 'PDF', 'DOC', 'DOCX'].map(f => (
                      <span key={f} style={{ padding: '3px 10px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', fontSize: 11, fontWeight: 700 }}>{f}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
              <button onClick={() => setStep(1)} className="btn-ghost" style={{ padding: '11px 22px' }}>← Back</button>
              
              {uploaded ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(3)} className="btn-ghost" style={{ padding: '11px 16px', fontSize: 13 }}>
                    Optional: Edit Skills
                  </button>
                  <button onClick={handleFinish} disabled={saving} className="btn-navy" style={{ padding: '11px 28px' }}>
                    {saving ? 'Matching...' : 'Finish & Match Jobs →'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setStep(3)} className="btn-navy" style={{ padding: '11px 28px' }}>
                  Select Skills Manually →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Skills ── */}
        {step === 3 && (
          <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎯</div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Select Your Skills</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Rate your proficiency for better job matching</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: total ? '#2d2b6e' : '#94a3b8' }}>{total}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>skills selected</div>
                </div>
              </div>

              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
                {cats.map(cat => {
                  const selCount = cat.skills.filter(s => selSkills[s.id] !== undefined).length;
                  const isActive = activeCat === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: isActive ? `1.5px solid ${cat.color}` : '1.5px solid #e2e8f0',
                        background: isActive ? `${cat.color}12` : '#f8fafc',
                        color: isActive ? cat.color : '#64748b', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                      {cat.icon} {cat.name}
                      {selCount > 0 && (
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: cat.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Skills grid */}
              {cats.filter(c => c.id === activeCat).map(cat => (
                <div key={cat.id} className="skills-select-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {cat.skills.map(skill => {
                    const sel = selSkills[skill.id] !== undefined;
                    const lvl = selSkills[skill.id] || 0;
                    return (
                      <div key={skill.id} onClick={() => toggleSkill(skill.id)}
                        style={{ borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                          border: sel ? `1.5px solid ${cat.color}40` : '1.5px solid #e2e8f0',
                          background: sel ? `${cat.color}08` : '#f8fafc', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sel ? 10 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Checkbox */}
                            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? cat.color : '#cbd5e1'}`,
                              background: sel ? cat.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                              {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: sel ? '#0f172a' : '#64748b' }}>{skill.name}</span>
                          </div>
                          {sel && (
                            <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                              background: `${LVL_COLORS[lvl - 1]}18`, color: LVL_COLORS[lvl - 1], border: `1px solid ${LVL_COLORS[lvl - 1]}30` }}>
                              {LVL_LABELS[lvl - 1]}
                            </span>
                          )}
                        </div>
                        {sel && (
                          <div onClick={e => e.stopPropagation()}>
                            <input type="range" min="1" max="5" value={lvl}
                              onChange={e => setSelSkills(p => ({ ...p, [skill.id]: +e.target.value }))}
                              style={{ width: '100%', accentColor: cat.color }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                              {LVL_LABELS.map((l, i) => (
                                <span key={l} style={{ fontSize: 9, fontWeight: lvl === i + 1 ? 700 : 400, color: lvl === i + 1 ? cat.color : '#94a3b8' }}>{l.slice(0, 3)}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Selected summary */}
            {total > 0 && (
              <div className="card anim-fade-in" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Selected Skills ({total})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {Object.entries(selSkills).map(([id, lvl]) => {
                    const name = cats.flatMap(c => c.skills).find(s => s.id === id)?.name || id;
                    const color = LVL_COLORS[lvl - 1];
                    return (
                      <span key={id} className="skill-chip" style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
                        {name} <span style={{ opacity: 0.6, fontSize: 10 }}>L{lvl}</span>
                        <button onClick={() => toggleSkill(id)} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} className="btn-ghost" style={{ padding: '12px 22px' }}>← Back</button>
              <button onClick={handleFinish} disabled={saving || total === 0} className="btn-navy"
                style={{ padding: '12px 28px', opacity: total === 0 ? 0.4 : 1, cursor: total === 0 ? 'not-allowed' : 'pointer' }}>
                {saving ? (
                  <><svg style={{ animation: 'spin 0.8s linear infinite', display: 'inline' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving...</>
                ) : `🎯 Find My Jobs (${total} skill${total !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
