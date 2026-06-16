import express from 'express';
import cors from 'cors';
import beansRouter from './routes/beans';
import batchesRouter from './routes/batches';
import statsRouter from './routes/stats';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/beans', beansRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Coffee Roast API server running on http://localhost:${PORT}`);
});
