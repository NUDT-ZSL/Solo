import express from 'express';
import recordsRouter from './routes/records.js';
import reportsRouter from './routes/reports.js';

const app = express();
const PORT = 3001;

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

app.use('/api/records', recordsRouter);
app.use('/api/reports', reportsRouter);

app.listen(PORT, () => {
  console.log(`🚴 RideTrack Pro server running at http://localhost:${PORT}`);
});
