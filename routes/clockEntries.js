import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * 
       FROM clock_entries 
       ORDER BY datetime_pst DESC 
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching entries:', err);
    res.status(500).send('Server error');
  }
});

router.get('/report', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT phone_number, worker_name, project_name, action, pay_rate, datetime_pst
      FROM clock_entries
      ORDER BY datetime_pst ASC
    `);

    const groups = {};
    rows.forEach(e => {
      const dateKey = new Date(e.datetime_pst).toISOString().split('T')[0];
      const key     = `${e.worker_name}|${e.project_name}|${dateKey}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    const report = [];
    Object.values(groups).forEach(group => {
      group.sort((a, b) => new Date(a.datetime_pst) - new Date(b.datetime_pst));
      for (let i = 0; i < group.length; i += 2) {
        const inE  = group[i];
        const outE = group[i + 1] || {};

        const clockIn  = inE.action === 'Clock in'  ? inE.datetime_pst : outE.datetime_pst;
        const clockOut = outE.action === 'Clock out' ? outE.datetime_pst : null;

        let hours = null;
        if (clockIn && clockOut) {
          hours = (new Date(clockOut) - new Date(clockIn)) / 3600000;
          hours = parseFloat(hours.toFixed(2));
        }
        const amount = hours != null
          ? parseFloat((hours * inE.pay_rate).toFixed(2))
          : null;

        report.push({
          worker_name:  inE.worker_name,
          phone_last5:  inE.phone_number.slice(-5),
          date:         new Date(inE.datetime_pst).toISOString().split('T')[0],
          project_name: inE.project_name,
          clock_in:     clockIn,
          clock_out:    clockOut,
          hours,
          pay_rate:     inE.pay_rate,
          amount
        });
      }
    });

    res.json(report);
  } catch (err) {
    console.error('❌ Error generating report:', err);
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
      note = ''
    } = req.body;

    const dt          = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const pstDateTime = dt;
    const utcDateTime = dt.toUTC();

    const wq = await db.query(
      `SELECT pay_rate FROM workers WHERE RIGHT(phone_number,5) = $1`,
      [phone_number.slice(-5)]
    );
    const pay_rate = wq.rows[0]?.pay_rate || 15;

    const regular_time = 0;
    const overtime     = 0;
    const pay_amount   = 0;

    await db.query(`
      INSERT INTO clock_entries
        (phone_number, worker_name, project_name, action,
         datetime_utc, datetime_pst, day, month, year, time,
         note, pay_rate, regular_time, overtime, pay_amount)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
      pay_rate,
      regular_time,
      overtime,
      pay_amount
    ]);

    res.status(201).send('Manual entry created');
  } catch (err) {
    console.error('❌ Error creating manual entry:', err);
    res.status(500).send('Server error');
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id }   = req.params;
    const { note } = req.body;
    const { rows } = await db.query(
      `UPDATE clock_entries SET note = $1 WHERE id = $2 RETURNING *`,
      [note, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error updating entry:', err);
    res.status(500).send('Server error');
  }
});

router.patch('/:id/toggle-paid', async (req, res) => {
  try {
    const { id }   = req.params;
    const { paid } = req.body;
    const { rows } = await db.query(
      `UPDATE clock_entries SET paid = $1 WHERE id = $2 RETURNING *`,
      [paid, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error toggling paid:', err);
    res.status(500).send('Server error');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM clock_entries WHERE id = $1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error deleting entry:', err);
    res.status(500).send('Server error');
  }
});

export default router;
