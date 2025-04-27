const express = require('express');
const router = express.Router();
const { getPayroll } = require('../controllers/payrollController');

router.get('/', getPayroll);

module.exports = router;
