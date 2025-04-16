import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// ─── GET all clock entries ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM clock_entries ORDER BY datetime_pst DESC LIMIT 100'
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching entries:', error);
    res.status(500).send('Server error');
  }
});

// ─── GET report: paired clock in/out rows ──────────────────────────
router.get('/report', async (req, res) => {
  try {
    // Fetch only the fields we need, ordered by time
    const { rows } = await db.query(
      `SELECT
         phone_number,
         worker_name,
         project_name,
         action,
         pay_rate,
         datetime_pst
       FROM clock_entries
       ORDER BY datetime_pst ASC`
    );

    // Group entries by worker|project|date
    const grouped = {};
    rows.forEach(e => {
      const dateKey = new Date(e.datetime_pst)
        .toISOString()
        .split('T')[0];
      const key = `${e.worker_name}|${e.project_name}|${dateKey}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    // Build the report rows
    const report = [];
    Object.values(grouped).forEach(group => {
      // Sort by datetime_pst ascending
      group.sort((a, b) => new Date(a.datetime_pst) - new Date(b.datetime_pst));

      // Take pairs of two (in/out)
      for (let i = 0; i < group.length; i += 2) {
        const inEntry  = group[i];
        const outEntry = group[i + 1] || {};

        // Determine clock-in / clock-out timestamps
        const clockInTime  = inEntry.action  === 'Clock in'  ? inEntry.datetime_pst : outEntry.datetime_pst;
        const clockOutTime = outEntry.action === 'Clock out' ? outEntry.datetime_pst : null;

        // Compute hours worked (in decimal)
        let hours = null;
        if (clockInTime && clockOutTime) {
          hours = (new Date(clockOutTime) - new Date(clockInTime)) / 3600000;
          hours = parseFloat(hours.toFixed(2));
        }

        // Compute pay amount
        const payRate = inEntry.pay_rate;
        const amount  = hours !== null
          ? parseFloat((hours * payRate).toFixed(2))
          : null;

        report.push({
          worker_name: inEntry.worker_name,
          phone_last5: inEntry.phone_number.slice(-5),
          date:        new Date(inEntry.datetime_pst).toISOString().split('T')[0],
          project_name: inEntry.project_name,
          clock_in:    clockInTime,
          clock_out:   clockOutTime,
          hours,
          pay_rate:    payRate,
          amount
        });
      }
    });

    res.json(report);
  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).send('Server error');
  }
});

// ─── Manual create, update, delete routes (unchanged) ──────────────
// ... your existing POST, PATCH, DELETE handlers go here ...

export default router;
