import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// GET all clock entries (latest 100)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clock_entries ORDER BY datetime_pst DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching clock entries:', error);
    res.status(500).send('Server error');
  }
});

// GET for report page
router.get('/report', async (req, res) => {
  try {
    const query = `
      SELECT
        ce.id,
        ce.phone_number,
        RIGHT(ce.phone_number, 5) AS phone_last5,
        ce.worker_name,
        ce.project_name,
        ce.action,
        ce.datetime_pst,
        ce.pay_rate,
        ce.pay_amount
      FROM clock_entries ce
      ORDER BY ce.datetime_pst ASC
    `;
    const { rows } = await db.query(query);

    // Pair clock-in/out entries
    const grouped = {};
    for (const entry of rows) {
      const key = `${entry.worker_name}-${entry.project_name}-${DateTime.fromISO(entry.datetime_pst).toISODate()}`;
      if (!grouped[key]) grouped[key] = { id: entry.id, worker_name: entry.worker_name, phone_number: entry.phone_number, phone_last5: entry.phone_last5, date: DateTime.fromISO(entry.datetime_pst).toISODate(), project_name: entry.project_name, clock_in: '', clock_out: '', hours: 0, pay_rate: entry.pay_rate, pay_amount: 0 };

      const time = DateTime.fromISO(entry.datetime_pst).toFormat('HH:mm');
      if (entry.action === 'Clock in') grouped[key].clock_in = time;
      if (entry.action === 'Clock out') grouped[key].clock_out = time;
    }

    // Calculate hours and pay
    for (const group of Object.values(grouped)) {
      if (group.clock_in && group.clock_out) {
        const [h1, m1] = group.clock_in.split(':').map(Number);
        const [h2, m2] = group.clock_out.split(':').map(Number);
        const start = h1 * 60 + m1;
        const end = h2 * 60 + m2;
        const mins = Math.max(end - start, 0);
        group.hours = parseFloat((mins / 60).toFixed(2));
        group.pay_amount = parseFloat((group.hours * group.pay_rate).toFixed(2));
      }
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('❌ Error generating report:', err);
    res.status(500).send('Server error');
  }
});

// POST - Add new clock entry
router.post('/', async (req, res) => {
  try {
    const { phone_number, worker_name, project_name, action, datetime, note } = req.body;

    // Parse datetime as PST
    const pst = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const utc = pst.toUTC();

    // Find pay rate from worker table
    const workerQuery = await db.query(
      "SELECT pay_rate FROM workers WHERE phone_number = $1 ORDER BY updated_at DESC LIMIT 1",
      [phone_number]
    );
    const payRate = workerQuery.rows[0]?.pay_rate || 15;

    await db.query(
      `INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst,
        day, month, year, time,
        note, pay_rate, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4,
                $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13, $14, $15)`,
      [
        phone_number,
        worker_name,
        project_name,
        action,
        utc.toISO(),
        pst.toISO(),
        pst.day,
        pst.month,
        pst.year,
        pst.toFormat('HH:mm'),
        note || '',
        payRate,
        0, // regular time
        0, // overtime
        0  // pay_amount
      ]
    );

    res.status(201).send('Clock entry added.');
  } catch (error) {
    console.error('❌ Failed to add clock entry:', error);
    res.status(500).send('Error adding clock entry');
  }
});

// PATCH - Update full record
router.patch('/:id/update-all', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      phone_number,
      worker_name,
      project_name,
      action,
      datetime
    } = req.body;

    const pst = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const utc = pst.toUTC();

    await db.query(`
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
    `, [
      phone_number,
      worker_name,
      project_name,
      action,
      utc.toISO(),
      pst.toISO(),
      pst.day,
      pst.month,
      pst.year,
      pst.toFormat('HH:mm'),
      id
    ]);

    res.send('Entry updated');
  } catch (err) {
    console.error('❌ Error updating entry:', err);
    res.status(500).send('Update failed');
  }
});

export default router;
