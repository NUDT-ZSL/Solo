import express from 'express';
import cors from 'cors';
import db from './models/db.js';
import toolsRouter from './routes/tools.js';
import reservationsRouter from './routes/reservations.js';
import ratingsRouter from './routes/ratings.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/tools', toolsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/ratings', ratingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
