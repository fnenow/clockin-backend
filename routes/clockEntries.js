import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// ✅ Get all clock entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clock_entries ORDER BY datetime_pst DESC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch entries:', err);
    res.status(500).send('Server error');
  }
});

// ✅ Update all fields in one entry
router.patch('/:id/update-all', async (req, res) => {
  const { id } = req.params;
  const {
    phone_number,
    worker_name,
    project_name,
    action,
    datetime
  } = req.body;

  try {
    // Parse datetime (from datetime-local input)
    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    if (!dt.isValid) {
      return res.status(400).send('Invalid datetime format');
    }

    const utcDateTime = dt.toUTC().toISO();
    const pstDateTime = dt.toISO(); // still in America/Los_Angeles

    const day = dt.day;
    const month = dt.month;
    const year = dt.year;
    const time = dt.toFormat('HH:mm');

    const query = `
      UPDATE clock_entries SET
        phone_number = $1,
        worker_name = $2,
        project_name = $3,
        action = $4,
        datetime_utc = $5,
        datetime_pst = $6,
        day = $7,
        month = $8,
        year = $9,
        time = $10
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      phone_number,
      worker_name,
      project_name,
      action,
      utcDateTime,
      pstDateTime,
      day,
      month,
      year,
      time,
      id
    ];

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to update entry:', err);
    res.status(500).send('Server error');
  }
});

export default router;
