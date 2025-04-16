import express from 'express';
import path from 'path';
import clockEntriesRoutes from './routes/clockEntries.js';
import { fileURLToPath } from 'url';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Routes
app.use('/api/clock-entries', clockEntriesRoutes);

// Root
app.get('/', (req, res) => {
  res.send('✅ Clock-in backend is live!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
