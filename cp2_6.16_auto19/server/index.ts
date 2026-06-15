import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { booksRouter } from './routes/books.js';
import { matchesRouter } from './routes/matches.js';
import { exchangesRouter } from './routes/exchanges.js';
import { notificationsRouter } from './routes/notifications.js';

const app = express();
const PORT = 5173;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/match', matchesRouter);
app.use('/api/exchange', exchangesRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;
