const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../data/users.json');
const JOBS_FILE = path.join(__dirname, '../data/job_roles.json');
const JWT_SECRET = 'career_portal_jwt_secret_2024';

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const readJobs = () => JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));

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

// Calculate match score between user skills and job requirements
const calculateMatchScore = (userSkills, requiredSkills) => {
  if (!userSkills || userSkills.length === 0) return 0;

  const userSkillMap = {};
  userSkills.forEach(skill => {
    userSkillMap[skill.id] = skill.level || 1; // 1-5 scale
  });

  let totalWeight = 0;
  let earnedScore = 0;

  requiredSkills.forEach(req => {
    totalWeight += req.weight;
    if (userSkillMap[req.id] !== undefined) {
      const levelFactor = userSkillMap[req.id] / 5; // normalize to 0-1
      earnedScore += req.weight * Math.min(levelFactor + 0.4, 1); // boost low-level matches
    }
  });

  return totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 0;
};

// Get all jobs with match scores
router.get('/', authenticate, (req, res) => {
  const { industry, type, search, sort } = req.query;
  const users = readUsers();
  const jobs = readJobs();
  const user = users.find(u => u.id === req.user.id);
  const userSkills = user?.profile?.skills || [];

  let filteredJobs = jobs.map(job => ({
    ...job,
    matchScore: calculateMatchScore(userSkills, job.requiredSkills)
  }));

  if (industry && industry !== 'all') {
    filteredJobs = filteredJobs.filter(j => j.industry.toLowerCase().includes(industry.toLowerCase()));
  }
  if (type && type !== 'all') {
    filteredJobs = filteredJobs.filter(j => j.type.toLowerCase() === type.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    filteredJobs = filteredJobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sort === 'match') {
    filteredJobs.sort((a, b) => b.matchScore - a.matchScore);
  } else if (sort === 'recent') {
    filteredJobs.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  } else {
    filteredJobs.sort((a, b) => b.matchScore - a.matchScore); // default: best match
  }

  res.json({ jobs: filteredJobs, total: filteredJobs.length });
});

// Get single job
router.get('/:id', authenticate, (req, res) => {
  const jobs = readJobs();
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  const userSkills = user?.profile?.skills || [];
  res.json({
    job: {
      ...job,
      matchScore: calculateMatchScore(userSkills, job.requiredSkills)
    }
  });
});

module.exports = router;
