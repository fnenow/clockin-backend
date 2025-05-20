const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// This handles POST requests to /frontend/clock/save-projects
router.post('/backend/save-projects', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'clock', 'projects.json');
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Failed to save projects.json:', err);
      return res.status(500).json({ error: 'Failed to save projects.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
