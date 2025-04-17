import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import clockEntryRoutes from './routes/clockEntries.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/clock-entries', clockEntryRoutes);
app.use('/dashboard', express.static('dashboard'));

app.get('/', (req, res) => {
  res.send('FNE Clock backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
