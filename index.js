import express from 'express';
import clockEntriesRoutes from './routes/clockEntries.js'; // Make sure the path ends with `.js`
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

// For static dashboard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

app.use(express.json());
app.use('/api/clock-entries', clockEntriesRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
