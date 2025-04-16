import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import clockEntriesRoutes from './routes/clockEntries.js';

const app = express();
const PORT = process.env.PORT || 8080;

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// API route
app.use('/api/clock-entries', clockEntriesRoutes);

app.get('/', (req, res) => {
  res.send('✅ Clock-in backend is live!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
