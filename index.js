import './server.js';
// ✅ Make sure this exists
const clockEntriesRoutes = require('./routes/clockEntries');
app.use('/api/clock-entries', clockEntriesRoutes);
