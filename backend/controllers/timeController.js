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
const cheerio = require('cheerio'); // using CommonJS

async function parseWebhook(req, res) {
  try {
    const body = req.body;

    console.log('---- Incoming Webhook Body ----');
    console.log(body);
    console.log('--------------------------------');

    const subject = body.subject || '';
    const strippedHtml = body['stripped-html'] || '';
    const strippedText = body['stripped-text'] || '';

    if (!subject) {
      throw new Error('No subject received');
    }

    // 1. Extract phone number from subject
    const phoneMatch = subject.match(/\((\d{3})\) (\d{3})-(\d{4})/);
    const phoneNumber = phoneMatch ? `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}` : 'Unknown';

    let projectName = '';
    let note = '';

    // 2. Prefer parsing from stripped-html if available
    if (strippedHtml) {
      const $ = cheerio.load(strippedHtml);
      const rawText = $('body').text(); 
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('Project:')) {
          projectName = line.replace('Project:', '').trim();
        }
        if (line.startsWith('Note:')) {
          note = line.replace('Note:', '').trim();
        }
      }
    }

    // 3. If still no project found, try stripped-text (as backup)
    if (!projectName && strippedText) {
      const lines = strippedText.split('\n').map(l => l.trim()).filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('Project:')) {
          projectName = line.replace('Project:', '').trim();
        }
        if (line.startsWith('Note:')) {
          note = line.replace('Note:', '').trim();
        }
      }
    }

    // 4. Validate parsed data
    if (!projectName) {
      console.log('No project found. Skipping this message.');
      return res.status(200).json({ skipped: true, reason: 'No Project found' });
    }

    const now = new Date();
    const workerName = phoneNumber; 

    const result = await db.query(
      `INSERT INTO clock_entries (worker_name, project_name, clock_in, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [workerName, projectName, now, note]
    );

    res.status(200).json({ success: true, entry: result.rows[0] });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: error.message });
  }
}




module.exports = { addEntry, getEntries, updateEntry, deleteEntry, parseWebhook };
