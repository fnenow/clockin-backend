const express = require('express');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const { DateTime } = require('luxon');
const { Pool } = require('pg');
const path = require('path');
const basicAuth = require('express-basic-auth'); // ✅ ADD THIS LINE

const app = express();
const port = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('DATABASE_URL:', process.env.DATABASE_URL);

// ✅ NEW: Basic Auth Middleware
app.use('/dashboard', basicAuth({
  users: { 'admin': process.env.DASHBOARD_PASSWORD }, // set password via Railway ENV
  challenge: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files in dashboard folder (after auth)
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

app.post('/email', async (req, res) => {
  try {
    console.log('📩 Email received!');
    console.log('From:', req.body.from);
    console.log('Subject:', req.body.subject);
    console.log('Body:', req.body['body-plain']);

    const html = req.body['body-html'] || '';
    const $ = cheerio.load(html);
    const fullText = $('body').text();

    const phoneMatch = fullText.match(/From:\s*\((\d{3})\)\s*(\d{3})-(\d{4})/);
    const phoneNumber = phoneMatch ? `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}` : 'Unknown';

    const messageMatch = fullText.match(/Message:\s*(Clock (in|out).*)/i);
    const message = messageMatch ? messageMatch[1] : 'Unknown';
    const action = message.toLowerCase().includes('out') ? 'Clock out' : 'Clock in';

    const projectMatch = fullText.match(/Project:\s*(.+)/i);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown';

    const noteMatch = fullText.match(/Note:\s*(.+)/i);
    const note = noteMatch ? noteMatch[1].trim() : '';

    const receivedTime = DateTime.now()
      .setZone('America/Los_Angeles')
      .plus(action === 'Clock out' ? { minutes: 2 } : { minutes: -2 });

    const utcDateTime = receivedTime.toUTC();
    const pstDateTime = receivedTime.setZone('America/Los_Angeles');

    const workerName = phoneNumber;

    await pool.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      phoneNumber,
      workerName,
      projectName,
      action,
      utcDateTime.toISO(),
      pstDateTime.toISO(),
      pstDateTime.day,
      pstDateTime.month,
      pstDateTime.year,
      pstDateTime.toFormat('HH:mm'),
      note
    ]);

    console.log(`✅ Inserted clock entry for project: ${projectName}`);
    res.status(200).send('Email received and data saved!');
  } catch (err) {
    console.error('❌ Error handling email:', err);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
  res.send('✅ Clock-in backend is live!');
});

pool.connect()
  .then(() => {
    console.log('✅ Connected to the database!');
    app.listen(port, () => {
      console.log(`🚀 Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });
