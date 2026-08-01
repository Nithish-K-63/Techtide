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
  const hasLoadedProfile = useRef(false);
  const { user, updateUser } = useAuth();
  console.log("DEBUG RENDER: user profile =", user?.profile);
  const navigate = useNavigate();
  const total = Object.keys(selSkills).length;

  useEffect(() => {
    axios.get('/api/skills').then(r => {
      setCats(r.data.categories);
      setActiveCat(r.data.categories[0]?.id);
    });
  }, []);

  useEffect(() => {
    console.log("OnboardingPage hasLoadedProfile:", hasLoadedProfile.current, "user:", user);
    if (user?.profile && !hasLoadedProfile.current) {
      console.log("Pre-populating onboarding fields with profile:", user.profile);
      setInfo({
        targetRole: user.profile.targetRole || '',
        experience: user.profile.experience || '',
        education: user.profile.education || '',
      });
      if (user.profile.skills && user.profile.skills.length > 0) {
        const skillsMap = {};
        user.profile.skills.forEach(s => {
          skillsMap[s.id] = s.level;
        });
        console.log("Pre-populating skills map:", skillsMap);
        setSelSkills(skillsMap);
      }
      if (user.profile.resumeFileName) {
        setUploaded(true);
        setExtractedInfo(`Existing resume: ${user.profile.resumeOriginalName || user.profile.resumeFileName}`);
      }
      hasLoadedProfile.current = true;
    }
  }, [user]);

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
          <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Path A: Upload Resume ── */}
            <div className="card onboarding-card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dbeafe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📄</div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                    Option 1 — Upload Your Resume
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    We'll auto-extract your skills and suggest the best-matching jobs
                  </p>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => !resumeFile && !uploaded && fileRef.current.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#4f46e5' : uploaded ? '#22c55e' : resumeFile ? '#4f46e5' : '#cbd5e1'}`,
                  borderRadius: 12, padding: '36px 24px', textAlign: 'center',
                  background: dragOver ? '#f5f3ff' : uploaded ? '#f0fdf4' : resumeFile ? '#f5f3ff' : '#f8fafc',
                  cursor: (resumeFile || uploaded) ? 'default' : 'pointer', transition: 'all 0.2s'
                }}>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.json" hidden onChange={e => setFile(e.target.files[0])} />

                {uploaded ? (
                  /* Existing or newly uploaded resume */
                  <div>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>✅</div>
                    <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, marginBottom: 4 }}>Resume Uploaded!</p>
                    <p style={{ fontSize: 13, color: '#64748b' }}>{resumeFile?.name || 'Your existing resume is on file'}</p>
                    {extractedInfo && (
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginTop: 8,
                        background: '#f0fdf4', padding: '6px 14px', borderRadius: 8, display: 'inline-block' }}>
                        🎉 {extractedInfo}
                      </p>
                    )}
                    <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button onClick={handleFinish} disabled={saving} className="btn-navy" style={{ padding: '10px 24px' }}>
                        {saving ? '⏳ Matching...' : '🚀 Match Jobs with Resume →'}
                      </button>
                      <button onClick={() => { setUploaded(false); setResumeFile(null); setExtractedInfo(''); }}
                        className="btn-ghost" style={{ padding: '10px 16px', fontSize: 13 }}>
                        Replace
                      </button>
                    </div>
                  </div>
                ) : resumeFile ? (
                  /* File selected but not yet uploaded */
                  <div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>📄</div>
                    <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{resumeFile.name}</p>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{(resumeFile.size / 1024).toFixed(1)} KB</p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); handleUpload(); }} disabled={uploading}
                        className="btn-navy" style={{ padding: '9px 20px' }}>
                        {uploading ? '⏳ Uploading & Extracting Skills...' : '⬆️ Upload & Extract Skills'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setResumeFile(null); }}
                        className="btn-ghost" style={{ padding: '9px 16px' }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  /* No file yet */
                  <>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>📁</div>
                    <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, marginBottom: 6 }}>Drag & drop your resume here</p>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>or click to browse files</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                      {['JSON', 'PDF', 'DOC', 'DOCX'].map(f => (
                        <span key={f} style={{ padding: '3px 10px', borderRadius: 6, background: '#ede9fe',
                          color: '#6d28d9', fontSize: 11, fontWeight: 700 }}>{f}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            {!uploaded && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>
            )}

            {/* ── Path B: Choose Skills Manually (only shown when no resume uploaded) ── */}
            {!uploaded && (
              <div className="card" style={{ padding: 24, border: '2px solid #e0e7ff', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe22)',
                cursor: 'pointer' }} onClick={() => setStep(3)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ede9fe', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎯</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
                      Option 2 — Choose Skills Manually
                    </p>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                      Don't have a resume? Pick your skills from our list and set your proficiency level
                    </p>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#4f46e5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    fontSize: 18, flexShrink: 0 }}>→</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                  {['Python', 'JavaScript', 'React', 'SQL', 'DevOps', 'Machine Learning'].map(s => (
                    <span key={s} style={{ padding: '3px 10px', borderRadius: 20, background: '#ede9fe',
                      color: '#6d28d9', fontSize: 12, fontWeight: 600 }}>{s}</span>
                  ))}
                  <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f1f5f9',
                    color: '#64748b', fontSize: 12 }}>+more</span>
                </div>
              </div>
            )}

            {/* ── Navigation ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <button onClick={() => setStep(1)} className="btn-ghost" style={{ padding: '11px 22px' }}>← Back</button>
              {uploaded && (
                <button onClick={() => setStep(3)} className="btn-ghost" style={{ padding: '11px 18px', fontSize: 13 }}>
                  ✏️ Edit Skills Instead
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
