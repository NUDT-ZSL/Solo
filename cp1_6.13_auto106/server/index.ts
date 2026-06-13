import express from 'express';
import recipesRouter from './routes/recipes.js';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

app.use('/api/recipes', recipesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[Server] RecipeLab API server running on http://localhost:${PORT}`);
});

export default app;
