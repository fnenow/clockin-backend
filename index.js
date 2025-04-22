import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import db from './utils/db.js';

import clockEntriesRoutes from './routes/clockEntries.js';
import workersRoutes from './routes/workers.js';
import payrollRoutes from './routes/payroll.js';

const app = express();
const port = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// 🔌 Routes
app.use('/api/clock-entries', clockEntriesRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/payroll', payrollRoutes);

// ✅ Telegram webhook endpoint
app.post('/telegram-webhook', (req, res) => {
  console.log('📩 Telegram Webhook Received:', req.body);
  res.sendStatus(200);
});

// ✅ Email parser endpoint
app.post('/email', async (req, res) => {
  try {
    const html = req.body['body-html'] || '';
    const $ = cheerio.load(html);
    const fullText = $('body').text();

    const phoneMatch = fullText.match(/From:\s*\((\d{3})\)\s*(\d{3})-(\d{4})/);
    const fullPhone = phoneMatch ? `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}` : 'Unknown';
    const last5 = fullPhone.slice(-5);

    const messageMatch = fullText.match(/Message:\s*(Clock (in|out).*)/i);
    const message = messageMatch ? messageMatch[1] : 'Unknown';
    const action = message.toLowerCase().includes('out') ? 'Clock out' : 'Clock in';

    const projectMatch = fullText.match(/Project:\s*([^\n\r]+)/i);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown';

    const noteMatch = fullText.match(/Note:\s*([^\n\r]+)/i);
    const note = noteMatch ? noteMatch[1].trim() : '';

    const now = DateTime.now().setZone('America/Los_Angeles');
    const receivedTime = now.plus(action === 'Clock out' ? { minutes: 2 } : { minutes: -2 });

    const utcDateTime = receivedTime.toUTC().toISO();
    const pstDateTime = receivedTime.toISO(); // Already in PST

    const day = receivedTime.day;
    const month = receivedTime.month;
    const year = receivedTime.year;
    const time = receivedTime.toFormat('HH:mm');

    const workerRes = await db.query(
      `SELECT name, pay_rate FROM workers WHERE RIGHT(phone_number, 5) = $1`,
      [last5]
    );
    const worker = workerRes.rows[0];
    const workerName = worker ? worker.name : `Worker ${last5}`;
    const payRate = worker ? worker.pay_rate : 15;

    const regularHours = 8;
    const overtimeHours = 0;
    const totalPay = parseFloat((regularHours * payRate).toFixed(2));

    await db.query(
      `INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time,
        note, pay_rate, regular_time, overtime, pay_amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        fullPhone,
        workerName,
        projectName,
        action,
        utcDateTime,
        receivedTime.toISO(),
        day,
        month,
        year,
        time,
        note,
        payRate,
        regularHours,
        overtimeHours,
        totalPay
      ]
    );

    console.log(`✅ Parsed Email → ${workerName} ${action} ${projectName}`);
    res.status(200).send('Email processed and saved!');
  } catch (err) {
    console.error('❌ Error in /email handler:', err);
    res.status(500).send('Server error');
  }
});

// ✅ Health check
app.get('/', (_req, res) => {
  res.send('✅ Time Clock Backend is live!');
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
