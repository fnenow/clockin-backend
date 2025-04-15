// routes/clockEntries.js
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

// ✅ POST - Add new clock entry
router.post('/', async (req, res) => {
  const {
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
    note,
    pay_rate,
    regular_time,
    overtime,
    pay_amount,
    paid
  } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO clock_entries 
        (phone_number, worker_name, project_name, action, datetime_utc, datetime_pst,
         day, month, year, time, note, pay_rate, regular_time, overtime, pay_amount, paid)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
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
        note,
        pay_rate,
        regular_time,
        overtime,
        pay_amount,
        paid
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(500).send('Failed to add entry');
  }
});

export default router;
``
