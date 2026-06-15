import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import identifyRouter from './routes/identify';
import plantsRouter from './routes/plants';
import eventsRouter from './routes/events';
import recordsRouter from './routes/records';
import remindersRouter from './routes/reminders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

app.use('/api/identify', identifyRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/reminders', remindersRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gardening Assistant API is running',
    timestamp: new Date().toISOString(),
  });
});

initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API health check: http://localhost:${PORT}/api/health`);
});

export default app;
