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
const db = require('../models/db'); // your db connection

async function parseWebhook(req, res) {
  try {
    const body = req.body;
    const rawText = body.text || '';

    console.log('---- Incoming Webhook from Google Script ----');
    console.log(rawText);
    console.log('--------------------------------');

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    let phoneNumber = '';
    let messageContent = '';

    for (const line of lines) {
      if (line.startsWith('*From:*')) {
        const phoneMatch = line.match(/\((\d{3})\) (\d{3})-(\d{4})/);
        if (phoneMatch) {
          phoneNumber = `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`; // 10 digit number
        }
      }
      if (line.startsWith('*Message:*')) {
        messageContent = line.replace('*Message:*', '').trim();
      }
    }

    if (!phoneNumber) {
      throw new Error('Phone number not found');
    }
    if (!messageContent) {
      throw new Error('Message content not found');
    }

    // Now parse inside the messageContent
    const timeMatch = messageContent.match(/Time:\s*([\d\-T:]+)/);
    const projectMatch = messageContent.match(/Project:\s*(.+?)(?:Note:|$)/);
    const noteMatch = messageContent.match(/Note:\s*(.+)/);

    const clockTimeStr = timeMatch ? timeMatch[1].trim() : null;
    const projectName = projectMatch ? projectMatch[1].trim() : null;
    const note = noteMatch ? noteMatch[1].trim() : '';

    if (!clockTimeStr || !projectName) {
      throw new Error('Missing Time or Project in message');
    }

    const clockTime = new Date(clockTimeStr);

    const workerName = phoneNumber; // You can auto-match later

    const result = await db.query(
      `INSERT INTO clock_entries (worker_name, project_name, clock_in, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [workerName, projectName, clockTime, note]
    );

    res.status(200).json({ success: true, entry: result.rows[0] });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: error.message });
  }
}




module.exports = { addEntry, getEntries, updateEntry, deleteEntry, parseWebhook };
