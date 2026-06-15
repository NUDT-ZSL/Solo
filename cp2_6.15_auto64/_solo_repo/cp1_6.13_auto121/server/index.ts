import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import skillsRouter, { seedSkillsIfEmpty } from './routes/skills';
import exchangesRouter, { seedExchangesIfEmpty } from './routes/exchanges';
import reviewsRouter, { seedReviewsIfEmpty } from './routes/reviews';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.use('/api/skills', skillsRouter);
app.use('/api/exchanges', exchangesRouter);
app.use('/api/reviews', reviewsRouter);

app.get('/api/me', (_req, res) => {
  res.json({
    id: 'u0',
    name: '我（访客）',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest_skillswap&backgroundColor=fef3c7',
  });
});

async function bootstrap() {
  await seedSkillsIfEmpty();
  await seedExchangesIfEmpty();
  await seedReviewsIfEmpty();
  app.listen(PORT, () => {
    console.log(`[SkillSwap] backend listening on http://localhost:${PORT}`);
  });
}

bootstrap();

export default app;
