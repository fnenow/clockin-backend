import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// GET all entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clock_entries ORDER BY datetime_pst DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).send('Server error');
  }
});

// PATCH update all fields in a clock entry
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
    const datetime_pst = dt.toISO();
    const datetime_utc = dt.toUTC().toISO();

    const { rows } = await db.query(`
      UPDATE clock_entries
      SET phone_number = $1,
          worker_name = $2,
          project_name = $3,
          action = $4,
          datetime_pst = $5,
          datetime_utc = $6
      WHERE id = $7
      RETURNING *;
    `, [phone_number, worker_name, project_name, action, datetime_pst, datetime_utc, id]);

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating record:', err);
    res.status(500).send('Update failed');
  }
});

// POST create new record
router.post('/add', async (req, res) => {
  try {
    const {
      phone_number,
      worker_name,
      project_name,
      action,
      datetime
    } = req.body;

    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });
    const datetime_pst = dt.toISO();
    const datetime_utc = dt.toUTC().toISO();

    const pstDate = dt.setZone('America/Los_Angeles');
    const day = pstDate.day;
    const month = pstDate.month;
    const year = pstDate.year;
    const time = pstDate.toFormat('HH:mm');

    const { rows } = await db.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      phone_number, worker_name, project_name, action,
      datetime_utc, datetime_pst, day, month, year, time
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding entry:', err);
    res.status(500).send('Add failed');
  }
});

// DELETE record
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM clock_entries WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting entry:', err);
    res.status(500).send('Delete failed');
  }
});
// GET /api/clock-entries/report
router.get('/report', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT *
      FROM clock_entries
      ORDER BY worker_name, project_name, datetime_pst
    `);

    // Pair clock-in and out per worker/project/day
    const pairs = [];
    const grouped = {};

    rows.forEach(entry => {
      const key = `${entry.worker_name}|${entry.project_name}|${entry.day}-${entry.month}-${entry.year}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    for (const key in grouped) {
      const entries = grouped[key].sort((a, b) => new Date(a.datetime_pst) - new Date(b.datetime_pst));
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].action === 'Clock in' && entries[i + 1]?.action === 'Clock out') {
          const clockIn = new Date(entries[i].datetime_pst);
          const clockOut = new Date(entries[i + 1].datetime_pst);
          const hours = (clockOut - clockIn) / (1000 * 60 * 60); // milliseconds to hours

          pairs.push({
            worker_name: entries[i].worker_name,
            phone_last5: entries[i].phone_number?.slice(-5),
            date: `${entries[i].month}/${entries[i].day}/${entries[i].year}`,
            project_name: entries[i].project_name,
            clock_in: clockIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            clock_out: clockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hours: hours.toFixed(2),
            pay_rate: entries[i].pay_rate,
            amount: (hours * entries[i].pay_rate).toFixed(2),
            clock_in_id: entries[i].id,
            clock_out_id: entries[i + 1].id,
            paid: entries[i].paid || false,
            exported: entries[i].exported || false
          });

          i++; // Skip the next item (we already paired it)
        }
      }
    }

    res.json(pairs);
  } catch (err) {
    console.error('❌ Error building report:', err);
    res.status(500).send('Server error while generating report');
  }
});

export default router;
