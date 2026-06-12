import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import usersRouter from './routes/users';
import badgesRouter from './routes/badges';
import { waitForDb } from './db';

const app = express();
const PORT = 3001;

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/users', usersRouter);
app.use('/api/badges', badgesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer(): Promise<void> {
  try {
    await waitForDb();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
