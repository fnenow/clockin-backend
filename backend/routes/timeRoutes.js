const express = require('express');
const router = express.Router();
const { addEntry, getEntries, updateEntry, deleteEntry } = require('../controllers/timeController');

router.post('/', addEntry);
router.get('/', getEntries);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

module.exports = router;
