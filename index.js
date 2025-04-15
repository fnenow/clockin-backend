const express = require('express');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const { DateTime } = require('luxon');
const { Pool } = require('pg');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const port = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const dashboardAuth = basicAuth({
  users: { 'admin': process.env.DASHBOARD_PASSWORD },
  challenge: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/dashboard', dashboardAuth);
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// ✅ Handle incoming email posts (e.g., from NumberBarn)
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

    if (!receivedTime.isValid) {
      console.warn('⚠️ Invalid date generated in /email handler:', receivedTime.invalidExplanation);
      return res.status(400).send('Invalid date format');
    }

    const utcDateTime = receivedTime.toUTC();
    const pstDateTime = receivedTime.setZone('America/Los_Angeles');

    const workerData = await pool.query('SELECT pay_rate FROM workers WHERE phone_number = $1', [phoneNumber]);
    const payRate = workerData.rows[0] ? workerData.rows[0].pay_rate : 15;

    const hoursWorked = Math.abs(pstDateTime.diff(receivedTime, 'hours').hours);
    const regularHours = hoursWorked > 8 ? 8 : hoursWorked;
    const overtimeHours = hoursWorked > 8 ? hoursWorked - 8 : 0;

    const regularPay = regularHours * payRate;
    const overtimePay = overtimeHours * payRate * 1.5;
    const totalPay = regularPay + overtimePay;

    const workerName = phoneNumber;

    await pool.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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

// ✅ Manual Entry (with Invalid Date Logging)
app.post('/api/clock-entries', dashboardAuth, async (req, res) => {
  try {
    const {
      phone_number,
      worker_name,
      project_name,
      action,
      datetime,
      note
    } = req.body;

    const dt = DateTime.fromISO(datetime, { zone: 'America/Los_Angeles' });

    if (!dt.isValid) {
      console.error('❌ Invalid datetime format received:', datetime);
      return res.status(400).send('Invalid datetime format');
    }

    const utcDateTime = dt.toUTC();
    const pstDateTime = dt.setZone('America/Los_Angeles');

    const workerData = await pool.query('SELECT pay_rate FROM workers WHERE phone_number = $1', [phone_number]);
    const payRate = workerData.rows[0] ? workerData.rows[0].pay_rate : 15;

    const hoursWorked = 8;
    const regularHours = 8;
    const overtimeHours = 0;

    const regularPay = regularHours * payRate;
    const overtimePay = overtimeHours * payRate * 1.5;
    const totalPay = regularPay + overtimePay;

    await pool.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      phone_number,
      worker_name,
      project_name,
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

    res.status(200).send('Manual entry created!');
  } catch (err) {
    console.error('❌ Error creating manual entry:', err);
    res.status(500).send('Server error');
  }
});
