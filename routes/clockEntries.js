import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// GET all entries (raw list)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM clock_entries ORDER BY datetime_pst DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Failed to fetch entries:', error);
    res.status(500).send('Server error');
  }
});

// PATCH full entry update
router.patch('/:id/update-all', async (req, res) => {
  const { id } = req.params;
  const {
    phone_number,
    worker_name,
    project_name,
    action,
    datetime_pst
  } = req.body;

  try {
    const dt = DateTime.fromISO(datetime_pst, { zone: 'America/Los_Angeles' });
    if (!dt.isValid) {
      return res.status(400).send('Invalid datetime format');
    }

    const utcDateTime = dt.toUTC();
    const payRateRes = await db.query(
      'SELECT pay_rate FROM workers WHERE phone_number = $1',
      [phone_number]
    );

    const payRate = payRateRes.rows[0]?.pay_rate || 15;
    const regularHours = 8;
    const overtime = 0;
    const payAmount = regularHours * payRate;

    const update = await db.query(
      `UPDATE clock_entries SET
        phone_number = $1,
        worker_name = $2,
        project_name = $3,
        action = $4,
        datetime_utc = $5,
        datetime_pst = $6,
        day = $7,
        month = $8,
        year = $9,
        time = $10,
        pay_rate = $11,
        regular_time = $12,
        overtime = $13,
        pay_amount = $14
      WHERE id = $15
      RETURNING *`,
      [
        phone_number,
        worker_name,
        project_name,
        action,
        utcDateTime.toISO(),
        dt.toISO(),
        dt.day,
        dt.month,
        dt.year,
        dt.toFormat('HH:mm'),
        payRate,
        regularHours,
        overtime,
        payAmount,
        id
      ]
    );

    res.json(update.rows[0]);
  } catch (error) {
    console.error('❌ Failed to update entry:', error);
    res.status(500).send('Server error');
  }
});

export default router;
