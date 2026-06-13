import express from 'express';
import cors from 'cors';
import { paperRoutes } from './routes/paperRoutes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const apiCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5000;

export function getCache(key: string): unknown | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: unknown): void {
  apiCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) {
      apiCache.delete(key);
    }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of apiCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      apiCache.delete(key);
    }
  }
}, 10000);

app.use('/api', paperRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
});

interface AppError extends Error {
  statusCode?: number;
  details?: string;
}

app.use((err: AppError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[Error] ${err.message}`, err.stack);

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message,
    statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`[QuizLab] Server running on http://localhost:${PORT}`);
});

export { app };
