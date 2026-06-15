import express from 'express';
import cors from 'cors';
import { initDatabase } from './database/init.js';
import booksRouter from './routes/books.js';
import borrowRouter from './routes/borrow.js';
import statsRouter from './routes/stats.js';

const app = express();
const PORT = 3001;

initDatabase();

app.use(cors());
app.use(express.json());

app.use('/api/books', booksRouter);
app.use('/api/borrow', borrowRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '社区图书馆服务运行中' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

export default app;
