const express = require('express');
const router = express.Router();
const { addEntry, getEntries, updateEntry, deleteEntry, parseWebhook } = require('../controllers/timeController');

router.post('/', addEntry);
router.get('/', getEntries);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

// New webhook route
router.post('/webhook', parseWebhook);

module.exports = router;
