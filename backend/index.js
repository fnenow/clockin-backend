require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend files
app.use('/clock', express.static(path.join(__dirname, '..', 'frontend', 'clock')));
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // optional fallback

// Routes
const timeRoutes = require('./routes/timeRoutes');
const workerRoutes = require('./routes/workerRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const projectRoutes = require('./routes/projectRoutes'); // ✅ REGISTER EARLY
const projectSaver = require('./save-projects'); // optional legacy save route

// API route mounts
app.use('/api/time', timeRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/projects', projectRoutes); // ✅ this is the route you're missing in your deployment
app.use('/', projectSaver); // legacy manual save (optional, can remove if unused)

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
