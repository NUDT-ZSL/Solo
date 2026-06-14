import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import submissionsRouter from './routes/submissions.js';
import reviewsRouter from './routes/reviews.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/reviews', reviewsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`PeerGrad server running on http://localhost:${PORT}`);
});

export default app;
