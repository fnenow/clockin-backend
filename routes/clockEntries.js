import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// Get all clock entries
router.get('/', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM clock_entries ORDER BY datetime_pst DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching clock entries:", err);
    res.status(500).send("Server error");
  }
});

// Update all fields for a record
router.patch('/:id/update-all', async (req, res) => {
  const { id } = req.params;
  const {
    phone_number,
    worker_name,
    project_name,
    action,
    datetime_pst
  } = req.body;

  try {
    const pst = new Date(datetime_pst);
    const utc = new Date(pst.getTime() + pst.getTimezoneOffset() * 60000);

    const update = await db.query(
      `UPDATE clock_entries
       SET phone_number = $1, worker_name = $2, project_name = $3, action = $4,
           datetime_pst = $5, datetime_utc = $6,
           day = $7, month = $8, year = $9, time = $10
       WHERE id = $11 RETURNING *`,
      [
        phone_number,
        worker_name,
        project_name,
        action,
        pst.toISOString(),
        utc.toISOString(),
        pst.getDate(),
        pst.getMonth() + 1,
        pst.getFullYear(),
        pst.toISOString().substring(11, 16),
        id
      ]
    );

    res.json(update.rows[0]);
  } catch (err) {
    console.error("❌ Error updating entry:", err);
    res.status(500).send("Server error");
  }
});

export default router;
