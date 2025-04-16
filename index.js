app.post('/email', async (req, res) => {
  try {
    console.log('📩 Email received!');
    const html = req.body['body-html'] || '';
    const $ = cheerio.load(html);
    const fullText = $('body').text();

    // Extract phone number from body
    const phoneMatch = fullText.match(/From:\s*\((\d{3})\)\s*(\d{3})-(\d{4})/);
    const fullPhone = phoneMatch ? `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}` : 'Unknown';
    const lastFive = fullPhone.slice(-5);
    console.log('📞 Extracted phone last 5 digits:', lastFive);

    // Extract clock action
    const messageMatch = fullText.match(/Message:\s*(Clock (in|out).*)/i);
    const message = messageMatch ? messageMatch[1] : 'Unknown';
    const action = message.toLowerCase().includes('out') ? 'Clock out' : 'Clock in';

    // Extract project and note
    const projectMatch = message.match(/project\s+([^\n\r]+)/i);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown';

    const noteMatch = message.match(/note\s*:\s*([^\n\r]+)/i);
    const note = noteMatch ? noteMatch[1].trim() : '';

    // Get timestamps
    const receivedTime = DateTime.now()
      .setZone('America/Los_Angeles')
      .plus(action === 'Clock out' ? { minutes: 2 } : { minutes: -2 });

    const utcDateTime = receivedTime.toUTC();
    const pstDateTime = receivedTime.setZone('America/Los_Angeles');

    // Query worker by last 5 digits
    const workerData = await pool.query(
      "SELECT * FROM workers WHERE phone_number LIKE $1",
      [`%${lastFive}`]
    );

    const worker = workerData.rows[0];
    const workerName = worker ? worker.name : `Unknown (${lastFive})`;
    const phoneNumber = worker ? worker.phone_number : fullPhone;
    const payRate = worker ? worker.pay_rate : 15;

    // Calculate pay (default 8 hours unless using clock-in/out durations)
    const hoursWorked = 8;
    const regularHours = 8;
    const overtimeHours = 0;

    const regularPay = regularHours * payRate;
    const overtimePay = overtimeHours * payRate * 1.5;
    const totalPay = regularPay + overtimePay;

    // Insert into DB
    await pool.query(`
      INSERT INTO clock_entries (
        phone_number, worker_name, project_name, action,
        datetime_utc, datetime_pst, day, month, year, time, note,
        pay_rate, regular_time, overtime, pay_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
      payRate,
      regularHours,
      overtimeHours,
      totalPay
    ]);

    console.log(`✅ Entry saved for ${workerName} on ${projectName}`);
    res.status(200).send('Email received and data saved!');
  } catch (err) {
    console.error('❌ Error handling email:', err);
    res.status(500).send('Server error');
  }
});
