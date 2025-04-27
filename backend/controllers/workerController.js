const db = require('../models/db');

async function addWorker(req, res) {
  const { name, phone_number, pay_rate } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO workers (name, phone_number, pay_rate)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, phone_number, pay_rate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getWorkers(req, res) {
  try {
    const result = await db.query('SELECT * FROM workers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { addWorker, getWorkers };
