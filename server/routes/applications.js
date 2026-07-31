const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const APPS_FILE = path.join(__dirname, '../data/applications.json');
const JOBS_FILE = path.join(__dirname, '../data/job_roles.json');
const JWT_SECRET = 'career_portal_jwt_secret_2024';

const readApps = () => {
  try { return JSON.parse(fs.readFileSync(APPS_FILE, 'utf8')); } catch { return []; }
};
const writeApps = (apps) => fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2));
const readJobs = () => JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// POST /api/applications — Submit application
router.post('/', authenticate, (req, res) => {
  const { jobId, coverLetter, phone, linkedIn, portfolio } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Job ID required' });

  const jobs = readJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const apps = readApps();
  const exists = apps.find(a => a.userId === req.user.id && a.jobId === jobId);
  if (exists) return res.status(409).json({ error: 'Already applied to this job', application: exists });

  const newApp = {
    id: uuidv4(),
    userId: req.user.id,
    jobId,
    jobTitle: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    logoColor: job.logoColor,
    logo: job.logo,
    coverLetter: coverLetter || '',
    phone: phone || '',
    linkedIn: linkedIn || '',
    portfolio: portfolio || '',
    status: 'applied',   // applied | reviewed | interview | offered | rejected
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  apps.push(newApp);
  writeApps(apps);
  res.status(201).json({ application: newApp, message: 'Application submitted successfully!' });
});

// GET /api/applications — Get all applications for current user
router.get('/', authenticate, (req, res) => {
  const apps = readApps();
  const userApps = apps.filter(a => a.userId === req.user.id);
  res.json({ applications: userApps, total: userApps.length });
});

// GET /api/applications/:id — Get single application
router.get('/:id', authenticate, (req, res) => {
  const apps = readApps();
  const app = apps.find(a => a.id === req.params.id && a.userId === req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ application: app });
});

// DELETE /api/applications/:id — Withdraw application
router.delete('/:id', authenticate, (req, res) => {
  const apps = readApps();
  const idx = apps.findIndex(a => a.id === req.params.id && a.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Application not found' });
  apps.splice(idx, 1);
  writeApps(apps);
  res.json({ message: 'Application withdrawn' });
});

// GET /api/applications/check/:jobId — Check if already applied
router.get('/check/:jobId', authenticate, (req, res) => {
  const apps = readApps();
  const app = apps.find(a => a.userId === req.user.id && a.jobId === req.params.jobId);
  res.json({ applied: !!app, application: app || null });
});

module.exports = router;
