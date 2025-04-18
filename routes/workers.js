import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// ✅ GET all current workers (latest record per phone number)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM workers
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch workers:', err);
    res.status(500).send('Server error');
  }
});

// ✅ GET a single worker by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM workers WHERE id = $1',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to fetch worker:', err);
    res.status(500).send('Server error');
  }
});

// ✅ POST a new worker (add and deactivate older if exists)
router.post('/', async (req, res) => {
  const { phone_number, name, pay_rate } = req.body;
  try {
    // Deactivate existing records for the same phone number
    await db.query(
      'UPDATE workers SET is_active = false WHERE phone_number = $1',
      [phone_number]
    );

    // Insert new worker record
    await db.query(
      `INSERT INTO workers (phone_number, name, pay_rate, is_active, created_at)
       VALUES ($1, $2, $3, true, NOW())`,
      [phone_number, name, pay_rate]
    );

    res.status(200).send('Worker created/updated');
  } catch (err) {
    console.error('❌ Failed to save worker:', err);
    res.status(500).send('Server error');
  }
});

// ✅ PATCH alternative (optional route to update by ID)
router.post('/:id/update', async (req, res) => {
  const { phone_number, name, pay_rate } = req.body;

  try {
    // Get the original worker's phone number by ID
    const existing = await db.query('SELECT * FROM workers WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).send('Worker not found');

    const oldPhone = existing.rows[0].phone_number;

    await db.query('UPDATE workers SET is_active = false WHERE phone_number = $1', [oldPhone]);

    await db.query(
      `INSERT INTO workers (phone_number, name, pay_rate, is_active, created_at)
       VALUES ($1, $2, $3, true, NOW())`,
      [phone_number, name, pay_rate]
    );

    res.status(200).send('Worker updated');
  } catch (err) {
    console.error('❌ Failed to update worker:', err);
    res.status(500).send('Server error');
  }
});

export default router;
