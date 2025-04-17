import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// Get all entries
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clock_entries ORDER BY datetime_pst DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).send('Server error');
  }
});

// Update all fields of an entry
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
    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const utcDateTime = dt.toUTC().toISO();
    const pstDateTime = dt.toISO(); // already in PST

    const updateQuery = `
      UPDATE clock_entries
      SET phone_number = $1,
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

    const result = await db.query(updateQuery, [
      phone_number,
      worker_name,
      project_name,
      action,
      utcDateTime,
      pstDateTime,
      dt.day,
      dt.month,
      dt.year,
      dt.toFormat('HH:mm'),
      id
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).send('Failed to update entry');
  }
});

// Add a new entry
router.post('/add', async (req, res) => {
  const {
    phone_number,
    worker_name,
    project_name,
    action,
    datetime
  } = req.body;

  try {
    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const utcDateTime = dt.toUTC().toISO();
    const pstDateTime = dt.toISO(); // already in PST

    const insertQuery = `
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      phone_number,
      worker_name,
      project_name,
      action,
      utcDateTime,
      pstDateTime,
      dt.day,
      dt.month,
      dt.year,
      dt.toFormat('HH:mm')
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding entry:', err);
    res.status(500).send('Failed to add entry');
  }
});

// Delete an entry
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM clock_entries WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting entry:', err);
    res.status(500).send('Failed to delete entry');
  }
});

export default router;
