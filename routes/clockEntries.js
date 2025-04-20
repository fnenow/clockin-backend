import express from 'express';
import db from '../utils/db.js';
import * as luxon from 'luxon'; // Correct import for ESM

const { DateTime } = luxon;
const router = express.Router();

// ✅ GET raw entries (used by dashboard)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clock_entries ORDER BY datetime_pst DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching clock entries:', error);
    res.status(500).send('Server error');
  }
});

// ✅ GET summarized report
router.get('/report', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        phone_number,
        RIGHT(phone_number, 5) AS phone_last5,
        worker_name,
        project_name,
        action,
        TO_CHAR(datetime_pst::date, 'YYYY-MM-DD') AS date,
        CASE WHEN action = 'Clock in' THEN datetime_pst END AS clock_in,
        CASE WHEN action = 'Clock out' THEN datetime_pst END AS clock_out,
        pay_rate,
        regular_time,
        overtime,
        pay_amount
      FROM clock_entries
      ORDER BY worker_name, project_name, datetime_pst
    `);

    const rows = result.rows;
    const grouped = {};

    for (let row of rows) {
      const key = `${row.worker_name?.toLowerCase()}|${row.project_name?.toLowerCase()}|${row.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: row.id,
          worker_name: row.worker_name,
          phone_last5: row.phone_last5,
          project_name: row.project_name,
          date: row.date,
          clock_in: '',
          clock_out: '',
          hours: 0,
          pay_rate: row.pay_rate,
          pay_amount: 0,
          phone_number: row.phone_number,
        };
      }

      if (row.action === 'Clock in') {
        grouped[key].clock_in = row.clock_in;
      } else if (row.action === 'Clock out') {
        grouped[key].clock_out = row.clock_out;
      }

      grouped[key].pay_amount += parseFloat(row.pay_amount || 0);
      grouped[key].hours += parseFloat(row.regular_time || 0) + parseFloat(row.overtime || 0);
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('❌ Failed to build report:', err);
    res.status(500).send('Server error');
  }
});

// ✅ POST - Add a new entry
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

    const dt = DateTime.fromISO(datetime, { zone: 'utc' });
    const pst = dt.setZone('America/Los_Angeles');

    const utcDateTime = dt.toUTC().toISO();         // for datetime_utc
    const pstDateTime = pst.toISO();                // for datetime_pst

    const day = pst.day;
    const month = pst.month;
    const year = pst.year;
    const time = pst.toFormat('HH:mm');

    // Get latest pay rate
    const payResult = await db.query(
      'SELECT pay_rate FROM workers WHERE name ILIKE $1 ORDER BY id DESC LIMIT 1',
      [worker_name]
    );
    const payRate = payResult.rows[0] ? payResult.rows[0].pay_rate : 15;

    await db.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time,
        note, pay_rate
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      phone_number, worker_name, project_name, action,
      utcDateTime, pstDateTime,
      day, month, year, time, note, payRate
    ]);

    res.status(200).send('Entry created');
  } catch (error) {
    console.error('❌ Error creating entry:', error);
    res.status(500).send('Server error');
  }
});

export default router;
