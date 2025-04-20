import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// Helper to group entries by worker/project/date
function groupEntries(entries) {
  const grouped = {};
  for (const entry of entries) {
    const key = `${entry.worker_name}|${entry.project_name}|${entry.date}`;
    if (!grouped[key]) {
      grouped[key] = {
        worker_name: entry.worker_name,
        phone_number: entry.phone_number,
        project_name: entry.project_name,
        date: entry.date,
        entries: [],
        total_hours: 0,
        regular_time: 0,
        overtime: 0,
        pay_rate: entry.pay_rate,
        amount: 0,
        exported: entry.exported,
        paid: entry.paid,
        paid_date: entry.paid_date
      };
    }

    grouped[key].entries.push(entry);
    grouped[key].regular_time += Number(entry.regular_time || 0);
    grouped[key].overtime += Number(entry.overtime || 0);
    grouped[key].amount += Number(entry.pay_amount || 0);
  }

  return Object.values(grouped);
}

// GET /api/payroll
router.get('/', async (req, res) => {
  try {
    const { start, end, worker, project } = req.query;

    const conditions = [];
    const params = [];

    if (start) {
      conditions.push('datetime_pst >= $' + (params.length + 1));
      params.push(start);
    }
    if (end) {
      conditions.push('datetime_pst <= $' + (params.length + 1));
      params.push(end + ' 23:59:59');
    }
    if (worker) {
      conditions.push('LOWER(worker_name) = LOWER($' + (params.length + 1) + ')');
      params.push(worker);
    }
    if (project) {
      conditions.push('LOWER(project_name) = LOWER($' + (params.length + 1) + ')');
      params.push(project);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT id, phone_number, worker_name, project_name, action,
              TO_CHAR(datetime_pst AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD') AS date,
              TO_CHAR(datetime_pst AT TIME ZONE 'America/Los_Angeles', 'HH24:MI') AS time,
              datetime_pst,
              regular_time, overtime, pay_rate, pay_amount, note, paid, paid_date, exported
         FROM clock_entries
         ${whereClause}
         ORDER BY datetime_pst ASC`
    );

    const grouped = groupEntries(result.rows);
    res.json({ grouped, raw: result.rows });
  } catch (err) {
    console.error('Error fetching payroll data:', err);
    res.status(500).send('Error fetching payroll data');
  }
});

// POST /api/payroll/mark-paid
router.post('/mark-paid', async (req, res) => {
  try {
    const { ids, paid_date } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send('No IDs provided');
    }

    const date = paid_date || DateTime.now().toISODate();

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      UPDATE clock_entries
      SET paid = true,
          paid_date = $${ids.length + 1}
      WHERE id IN (${placeholders})
    `;

    await db.query(query, [...ids, date]);
    res.send('Marked as paid');
  } catch (err) {
    console.error('Error marking entries as paid:', err);
    res.status(500).send('Error updating paid status');
  }
});

export default router;
