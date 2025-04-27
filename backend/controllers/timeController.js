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
async function parseWebhook(req, res) {
  try {
    const body = req.body;

    // Example: assuming you're forwarding SMS or email in a field like `message`
    const message = body.message || '';

    console.log('Received Webhook Message:', message);

    // Basic parsing logic
    const lines = message.split('\n');
    const action = lines.find(l => l.includes('Clock')).trim();
    const timeLine = lines.find(l => l.includes('Time:')).trim();
    const projectLine = lines.find(l => l.includes('Project:')).trim();
    const noteLine = lines.find(l => l.includes('Note:'))?.trim();

    const clockTimeStr = timeLine.split('Time:')[1].trim();
    const clockTime = new Date(clockTimeStr);

    const projectName = projectLine.split('Project:')[1].trim();
    const note = noteLine ? noteLine.split('Note:')[1].trim() : '';

    const workerName = body.worker_name || 'Unknown'; // You can improve this with more parsing

    // Insert into DB
    const result = await db.query(
      `INSERT INTO clock_entries (worker_name, project_name, clock_in, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [workerName, projectName, clockTime, note]
    );

    res.status(200).json({ success: true, entry: result.rows[0] });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}

module.exports = { addEntry, getEntries, updateEntry, deleteEntry };
