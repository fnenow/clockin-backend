// index.js
import express from 'express';
import clockEntriesRoutes from './routes/clockEntries.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static dashboard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Middleware
app.use(express.json());

// API route
app.use('/api/clock-entries', clockEntriesRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
