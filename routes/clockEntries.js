import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT *, datetime_pst as datetime FROM clock_entries ORDER BY datetime_pst DESC LIMIT 100'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch entries:', err);
    res.status(500).send('Server error');
  }
});

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

    console.log('📥 Incoming manual entry:', req.body);

    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    if (!dt.isValid) {
      console.error('❌ Invalid datetime received:', datetime);
      return res.status(400).send('Invalid datetime format');
    }

    const utcDateTime = dt.toUTC();
    const pstDateTime = dt.setZone('America/Los_Angeles');

    const workerResult = await db.query(
      'SELECT pay_rate FROM workers WHERE phone_number = $1',
      [phone_number]
    );
    const payRate = workerResult.rows[0]?.pay_rate || 15;

    const regularHours = 8;
    const overtimeHours = 0;
    const regularPay = regularHours * payRate;
    const overtimePay = overtimeHours * payRate * 1.5;
    const totalPay = regularPay + overtimePay;

    await db.query(
      `INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note,
        pay_rate, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        phone_number, worker_name, project_name, action,
        utcDateTime.toISO(), pstDateTime.toISO(),
        pstDateTime.day, pstDateTime.month, pstDateTime.year,
        pstDateTime.toFormat('HH:mm'), note,
        payRate, regularHours, overtimeHours, totalPay
      ]
    );

    res.status(200).send('✅ Manual entry created!');
  } catch (err) {
    console.error('❌ Error creating manual entry:', err);
    res.status(500).send('Server error');
  }
});

export default router;
