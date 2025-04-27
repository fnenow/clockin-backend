const express = require('express');
const router = express.Router();
const { addWorker, getWorkers } = require('../controllers/workerController');

router.post('/', addWorker);
router.get('/', getWorkers);

module.exports = router;
