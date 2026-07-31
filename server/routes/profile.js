const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = 'career_portal_jwt_secret_2024';
const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF and Word documents are allowed'));
  }
});

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const writeUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// Get profile
router.get('/', authenticate, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// Update skills
router.put('/skills', authenticate, (req, res) => {
  const { skills, targetRole, experience, education } = req.body;
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  users[idx].profile.skills = skills || [];
  if (targetRole) users[idx].profile.targetRole = targetRole;
  if (experience) users[idx].profile.experience = experience;
  if (education) users[idx].profile.education = education;
  users[idx].profile.profileComplete = users[idx].profile.skills.length > 0;
  writeUsers(users);
  const { password: _, ...userWithoutPassword } = users[idx];
  res.json({ user: userWithoutPassword, message: 'Skills updated successfully' });
});

// Upload resume
router.post('/resume', authenticate, upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  users[idx].profile.resumeFileName = req.file.filename;
  users[idx].profile.resumeOriginalName = req.file.originalname;
  users[idx].profile.resumeUploadedAt = new Date().toISOString();
  writeUsers(users);
  res.json({
    message: 'Resume uploaded successfully',
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

// Update profile info
router.put('/info', authenticate, (req, res) => {
  const { fullName, email, targetRole, experience, education, bio } = req.body;
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (fullName) users[idx].fullName = fullName;
  if (email) users[idx].email = email;
  if (targetRole) users[idx].profile.targetRole = targetRole;
  if (experience) users[idx].profile.experience = experience;
  if (education) users[idx].profile.education = education;
  if (bio !== undefined) users[idx].profile.bio = bio;
  writeUsers(users);
  const { password: _, ...u } = users[idx];
  res.json({ user: u, message: 'Profile updated' });
});

module.exports = router;
