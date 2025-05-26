require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
app.use(express.json());
const projectSaver = require('./save-projects');
app.use('/', projectSaver);

//style for clock.html

app.use('/clock', express.static(path.join(__dirname, '..', 'frontend', 'clock')));
//end style for clock.html

const port = process.env.PORT || 3000;

const timeRoutes = require('./routes/timeRoutes');
const workerRoutes = require('./routes/workerRoutes');
const payrollRoutes = require('./routes/payrollRoutes');


app.use(express.urlencoded({ extended: true }));

app.use(express.static('frontend'));

app.use('/api/time', timeRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/payroll', payrollRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);
