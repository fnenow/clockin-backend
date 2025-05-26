const db = require('../models/db');
const cheerio = require('cheerio'); // Optional for future HTML parsing

// Add manual entry
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
    console.error('Error adding entry:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Get all clock entries
async function getEntries(req, res) {
  try {
    const result = await db.query('SELECT * FROM clock_entries ORDER BY clock_in DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting entries:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Update clock entry
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
    console.error('Error updating entry:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Delete clock entry
async function deleteEntry(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM clock_entries WHERE id = $1', [id]);
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting entry:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Parse webhook from Google Script
async function parseWebhook(req, res) {
  try {
    console.log('---- Incoming Webhook from Google Script ----');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('--------------------------------');

    if (!req.body || !req.body.text) {
      throw new Error('Invalid payload: missing "text" field');
    }

    const rawText = req.body.text;
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);

    let phoneNumber = '';
    let messageContent = '';
    let insideMessage = false;

    for (const line of lines) {
      if (line.startsWith('*From:*') && !phoneNumber) {
        const phoneMatch = line.match(/\((\d{3})\) (\d{3})-(\d{4})/);
        if (phoneMatch) {
          phoneNumber = `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`;
        }
      }

      if (line.startsWith('*Message:*')) {
        messageContent += line.replace('*Message:*', '').trim() + '\n';
        insideMessage = true;
      } else if (insideMessage) {
        if (line.startsWith('*')) break; // end of message section
        messageContent += line + '\n';
      }
    }

    if (!phoneNumber) throw new Error('Phone number not found in email');
    if (!messageContent) throw new Error('Message content not found in email');

    // Extract values
    const timeMatch = messageContent.match(/Time:\s*([0-9\-T:]+)/);
    const projectMatch = messageContent.match(/Project:\s*'([\s\S]*?)'/);
    const noteMatch = messageContent.match(/Note:\s*'([\s\S]*?)'/); // multi-line safe

    if (!timeMatch) throw new Error('Clock In Time not found in message');
    if (!projectMatch) throw new Error('Project name not found in message');

    const clockTimeStr = timeMatch[1].trim();
    const projectName = projectMatch[1].trim();
    const note = noteMatch ? noteMatch[1].trim() : '';

    console.log('Extracted Note:', JSON.stringify(note));

    const clockTime = new Date(clockTimeStr);
    if (isNaN(clockTime.getTime())) throw new Error('Invalid clock-in time format');

    const workerName = phoneNumber;

    const result = await db.query(
      `INSERT INTO clock_entries (worker_name, project_name, clock_in, clock_out, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [workerName, projectName, clockTime.toISOString(), null, note]
    );

    console.log('Clock entry inserted successfully:', result.rows[0]);
    res.status(200).json({ success: true, entry: result.rows[0] });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: error.message });
  }
}


// Export all handlers
module.exports = {
  addEntry,
  getEntries,
  updateEntry,
  deleteEntry,
  parseWebhook
};
