const express = require('express');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const { DateTime } = require('luxon');
const { Pool } = require('pg');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const port = process.env.PORT || 8080;

// ✅ Set up database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// ✅ Dashboard auth (uses Railway environment variables)
const dashboardAuth = basicAuth({
  users: { 'admin': process.env.DASHBOARD_PASSWORD },
  challenge: true
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Protect dashboard route with auth
app.use('/dashboard', dashboardAuth);

// ✅ Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// ✅ Handle incoming email posts (e.g., from NumberBarn)
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

// ✅ Public root endpoint
app.get('/', (req, res) => {
  res.send('✅ Clock-in backend is live!');
});

// ✅ API route for frontend to get clock entries
app.get('/api/clock-entries', dashboardAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clock_entries ORDER BY datetime_pst DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch clock entries:', err);
    res.status(500).send('Server error');
  }
});

// ✅ Start the server
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

//payrate, admin
app.post('/email', async (req, res) => {
  try {
    console.log('📩 Email received!');
    const html = req.body['body-html'] || '';
    const $ = cheerio.load(html);
    const fullText = $('body').text();

    const phoneMatch = fullText.match(/From:\s*\((\d{3})\)\s*(\d{3})-(\d{4})/);
    const phoneNumber = phoneMatch ? `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}` : 'Unknown';

    const messageMatch = fullText.match(/Message:\s*(Clock (in|out).*)/i);
    const message = messageMatch ? messageMatch[1] : 'Unknown';
    const action = message.toLowerCase().includes('out') ? 'Clock out' : 'Clock in';

    const projectMatch = message.match(/project\s+([^\n\r]+)/i);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown';

    const noteMatch = message.match(/note\s*:\s*([^\n\r]+)/i);
    const note = noteMatch ? noteMatch[1].trim() : '';

    const receivedTime = DateTime.now()
      .setZone('America/Los_Angeles')
      .plus(action === 'Clock out' ? { minutes: 2 } : { minutes: -2 });

    const utcDateTime = receivedTime.toUTC();
    const pstDateTime = receivedTime.setZone('America/Los_Angeles');

    // Get pay rate from the workers table
    const workerData = await pool.query('SELECT pay_rate FROM workers WHERE phone_number = $1', [phoneNumber]);
    const payRate = workerData.rows[0] ? workerData.rows[0].pay_rate : 15; // Default to $15 if not found

    // Calculate regular and overtime
    const hoursWorked = Math.abs(pstDateTime.diff(receivedTime, 'hours').hours);
    const regularHours = hoursWorked > 8 ? 8 : hoursWorked;
    const overtimeHours = hoursWorked > 8 ? hoursWorked - 8 : 0;

    const regularPay = regularHours * payRate;
    const overtimePay = overtimeHours * payRate * 1.5;
    const totalPay = regularPay + overtimePay;

    const workerName = phoneNumber;

    // Insert clock entry with pay details
    await pool.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      note,
      regularHours,
      overtimeHours,
      totalPay
    ]);

    res.status(200).send('Email received and data saved!');
  } catch (err) {
    console.error('❌ Error handling email:', err);
    res.status(500).send('Server error');
  }
});
