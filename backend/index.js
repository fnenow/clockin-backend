require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const timeRoutes = require('./routes/timeRoutes');
const workerRoutes = require('./routes/workerRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const projectSaver = require('./frontend/clock/save-projects');
app.use('/', projectSaver);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('frontend'));

app.use('/api/time', timeRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/payroll', payrollRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
