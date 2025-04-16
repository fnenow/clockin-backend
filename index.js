import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import db from './utils/db.js';
import clockEntriesRoutes from './routes/clockEntries.js';

const app = express();
const port = process.env.PORT || 8080;

// Setup __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
app.use('/api/clock-entries', clockEntriesRoutes);

// ✅ Email Parsing Route
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

    // const projectMatch = fullText.match(/project:\s+([^\n\r]+)/i);
    // const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown';
    // new project extraction (from fullText)
    const projectMatch = fullText.match(/Project:\s*([^\n\r]+)/i);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown';


    const noteMatch = fullText.match(/note\s*:\s*([^\n\r]+)/i);
    const note = noteMatch ? noteMatch[1].trim() : '';

    const now = DateTime.now().setZone('America/Los_Angeles');
    const receivedTime = now.plus(action === 'Clock out' ? { minutes: 2 } : { minutes: -2 });

    const utcDateTime = receivedTime.toUTC();
    const pstDateTime = receivedTime.setZone('America/Los_Angeles');

    // Find worker by last 5 digits
    const workerQuery = await db.query(
      "SELECT * FROM workers WHERE RIGHT(phone_number, 5) = $1",
      [last5]
    );

    const worker = workerQuery.rows[0];
    const workerName = worker ? worker.name : `Worker ${last5}`;
    const payRate = worker ? worker.pay_rate : 15;

    const regularHours = 8;
    const overtimeHours = 0;
    const totalPay = regularHours * payRate;

    await db.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time,
        note, pay_rate, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15)
    `, [
      fullPhone, workerName, projectName, action,
      utcDateTime.toISO(), pstDateTime.toISO(),
      pstDateTime.day, pstDateTime.month, pstDateTime.year,
      pstDateTime.toFormat('HH:mm'),
      note, payRate, regularHours, overtimeHours, totalPay
    ]);

    console.log(`✅ Email parsed: ${workerName} - ${action}`);
    res.status(200).send('Email processed and entry saved!');
  } catch (err) {
    console.error('❌ Failed to parse email:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('✅ Time Clock Backend is Live!');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
