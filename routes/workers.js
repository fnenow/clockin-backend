import express from 'express';
import db from '../utils/db.js';
import { DateTime } from 'luxon';

const router = express.Router();

// Get all active workers (most recent records per phone number)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT w1.*
      FROM workers w1
      INNER JOIN (
        SELECT phone_number, MAX(updated_at) AS max_date
        FROM workers
        WHERE is_active = true
        GROUP BY phone_number
      ) w2 ON w1.phone_number = w2.phone_number AND w1.updated_at = w2.max_date
      ORDER BY w1.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching workers:', error);
    res.status(500).send('Server error');
  }
});

// Add a new worker
router.post('/', async (req, res) => {
  try {
    const { name, phone_number, pay_rate } = req.body;
    const now = DateTime.now().toISO();

    await db.query(`
      INSERT INTO workers (name, phone_number, pay_rate, updated_at, is_active)
      VALUES ($1, $2, $3, $4, true)
    `, [name, phone_number, pay_rate, now]);

    res.status(200).send('✅ Worker added!');
  } catch (error) {
    console.error('❌ Error adding worker:', error);
    res.status(500).send('Server error');
  }
});

// Update worker (creates new row if pay_rate changed)
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, phone_number, pay_rate } = req.body;

    // Get existing worker
    const { rows } = await db.query('SELECT * FROM workers WHERE id = $1', [id]);
    const existing = rows[0];
    if (!existing) return res.status(404).send('Worker not found');

    const now = DateTime.now().toISO();

    if (
      existing.name !== name ||
      existing.phone_number !== phone_number ||
      parseFloat(existing.pay_rate) !== parseFloat(pay_rate)
    ) {
      // Mark current as inactive
      await db.query(`UPDATE workers SET is_active = false WHERE id = $1`, [id]);

      // Insert new record
      await db.query(`
        INSERT INTO workers (name, phone_number, pay_rate, updated_at, is_active)
        VALUES ($1, $2, $3, $4, true)
      `, [name, phone_number, pay_rate, now]);
    }

    res.status(200).send('✅ Worker updated!');
  } catch (error) {
    console.error('❌ Error updating worker:', error);
    res.status(500).send('Server error');
  }
});

export default router;
