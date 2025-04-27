const db = require('../models/db');

async function getPayroll(req, res) {
  const { start, end } = req.query;
  try {
    const result = await db.query(`
      SELECT worker_name,
        SUM(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600) AS total_hours,
        SUM(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600 * workers.pay_rate) AS total_pay
      FROM clock_entries
      LEFT JOIN workers ON clock_entries.worker_name = workers.name
      WHERE clock_in BETWEEN $1::timestamp AND $2::timestamp
      GROUP BY worker_name
      ORDER BY worker_name ASC
    `, [start, end]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getPayroll };
