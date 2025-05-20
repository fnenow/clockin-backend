const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/frontend/clock/save-projects', (req, res) => {
  console.log('Incoming save request');
  console.log('Body:', req.body);
  
  const filePath = path.join(__dirname, '..', 'frontend', 'clock', 'projects.json');
  console.log('Saving to:', filePath);
  
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Failed to save projects.json:', err);
      return res.status(500).json({ error: 'Failed to save.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;

