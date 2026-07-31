const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const SKILLS_FILE = path.join(__dirname, '../data/skills.json');

router.get('/', (req, res) => {
  const skills = JSON.parse(fs.readFileSync(SKILLS_FILE, 'utf8'));
  res.json(skills);
});

module.exports = router;
