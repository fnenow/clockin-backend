import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// ✅ Get all clock entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clock_entries ORDER BY datetime_pst DESC');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching clock entries:', error);
    res.status(500).send('Server error');
  }
});

// ✅ Update all fields of a clock entry
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
    const datetime_utc = dt.toUTC().toISO();
    const datetime_pst = dt.setZone('America/Los_Angeles').toISO();
    const day = dt.day;
    const month = dt.month;
    const year = dt.year;
    const time = dt.toFormat('HH:mm');

    const result = await db.query(`
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
    `, [
      phone_number,
      worker_name,
      project_name,
      action,
      datetime_utc,
      datetime_pst,
      day,
      month,
      year,
      time,
      id
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating entry:', error);
    res.status(500).send('Server error');
  }
});

export default router;
