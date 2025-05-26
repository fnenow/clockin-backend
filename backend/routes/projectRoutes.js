const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM projects ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
