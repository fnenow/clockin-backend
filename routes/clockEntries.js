import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// GET raw entries (used by dashboard)
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
        worker_name,
        RIGHT(phone_number, 5) AS phone_last5,
        project_name,
        DATE(datetime_pst) AS date,
        MAX(CASE WHEN action = 'Clock in' THEN to_char(datetime_pst, 'HH24:MI') END) AS clock_in,
        MAX(CASE WHEN action = 'Clock out' THEN to_char(datetime_pst, 'HH24:MI') END) AS clock_out,
        MIN(CASE WHEN action = 'Clock in' THEN datetime_pst END) AS in_time,
        MAX(CASE WHEN action = 'Clock out' THEN datetime_pst END) AS out_time,
        MAX(pay_rate) AS pay_rate,
        MAX(id) AS id
      FROM clock_entries
      GROUP BY worker_name, phone_last5, project_name, date
      ORDER BY date DESC, worker_name
    `);

    const rows = result.rows.map(row => {
      let hours = 0;
      let amount = 0;

      if (row.in_time && row.out_time) {
        const diffMs = new Date(row.out_time) - new Date(row.in_time);
        hours = diffMs / 1000 / 60 / 60;
        amount = hours * row.pay_rate;
      }

      return {
        ...row,
        hours: parseFloat(hours.toFixed(2)),
        pay_amount: parseFloat(amount.toFixed(2))
      };
    });

    res.json(rows);
  } catch (error) {
    console.error('❌ Error generating report:', error);
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

    const dt = new Date(datetime);
    const pst = new Date(dt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

    const day = pst.getDate();
    const month = pst.getMonth() + 1;
    const year = pst.getFullYear();
    const time = pst.toTimeString().split(' ')[0].slice(0, 5);

    // Default pay rate if not found
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
      new Date(dt).toISOString(),
      pst.toISOString(),
      day, month, year, time, note, payRate
    ]);

    res.status(200).send('Entry created');
  } catch (error) {
    console.error('❌ Error creating entry:', error);
    res.status(500).send('Server error');
  }
});

export default router;
