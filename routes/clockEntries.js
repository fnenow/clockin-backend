import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// GET all clock entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clock_entries ORDER BY datetime_utc DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).send('Server error');
  }
});

// More routes (POST, PATCH, DELETE) can go here

export default router;

