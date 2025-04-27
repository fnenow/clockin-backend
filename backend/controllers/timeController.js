const db = require('../models/db');

async function addEntry(req, res) {
  const { worker_name, project_name, clock_in, clock_out, notes } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO clock_entries (worker_name, project_name, clock_in, clock_out, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [worker_name, project_name, clock_in, clock_out, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getEntries(req, res) {
  try {
    const result = await db.query('SELECT * FROM clock_entries ORDER BY clock_in DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateEntry(req, res) {
  const { id } = req.params;
  const { clock_in, clock_out, notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE clock_entries
       SET clock_in = $1, clock_out = $2, notes = $3
       WHERE id = $4 RETURNING *`,
      [clock_in, clock_out, notes, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteEntry(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM clock_entries WHERE id = $1', [id]);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { addEntry, getEntries, updateEntry, deleteEntry };
