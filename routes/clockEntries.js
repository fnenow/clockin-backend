import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// GET all clock entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT *, datetime_pst AS datetime FROM clock_entries ORDER BY datetime_pst DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching entries:', error);
    res.status(500).send('Server error');
  }
});

// POST manual entry
router.post('/', async (req, res) => {
  try {
    const {
      phone_number,
      worker_name,
      project_name,
      action,
      datetime,
      note
    } = req.body;

    if (!datetime || isNaN(new Date(datetime))) {
      console.error('❌ Invalid datetime:', datetime);
      return res.status(400).send('Invalid datetime format');
    }

    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const utcDateTime = dt.toUTC();
    const pstDateTime = dt.setZone('America/Los_Angeles');

    const payQuery = await db.query('SELECT pay_rate FROM workers WHERE phone_number = $1', [phone_number]);
    const payRate = payQuery.rows[0]?.pay_rate || 15;

    const regularHours = 8;
    const overtimeHours = 0;
    const totalPay = (regularHours * payRate) + (overtimeHours * payRate * 1.5);

    await db.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note,
        pay_rate, regular_time, overtime, pay_amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [
      phone_number,
      worker_name,
      project_name,
      action,
      utcDateTime.toISO(),
      pstDateTime.toISO(),
      pstDateTime.day,
      pstDateTime.month,
      pstDateTime.year,
      pstDateTime.toFormat('HH:mm'),
      note,
      payRate,
      regularHours,
      overtimeHours,
      totalPay
    ]);

    res.status(200).send('Manual entry added!');
  } catch (err) {
    console.error('❌ Error creating manual entry:', err);
    res.status(500).send('Server error');
  }
});

export default router;
