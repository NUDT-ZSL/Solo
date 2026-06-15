import express from 'express';
import cors from 'cors';
import { paperRoutes } from './routes/paperRoutes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 500, defaultTTL = 30000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  set(key: string, data: unknown, ttl?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  get size(): number {
    return this.cache.size;
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
        removed++;
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    return removed;
  }
}

const DEFAULT_TTL = 30000;
const PAPER_GENERATE_TTL = 60000;
const ANALYSIS_TTL = 15000;

export const apiCache = new LRUCache(500, DEFAULT_TTL);

export function getCache<T = unknown>(key: string): T | null {
  return apiCache.get<T>(key);
}

export function setCache(key: string, data: unknown, ttl?: number): void {
  apiCache.set(key, data, ttl);
}

export function invalidateCache(prefix?: string): void {
  apiCache.invalidate(prefix);
}

setInterval(() => {
  const removed = apiCache.cleanup();
  if (removed > 0) {
    console.debug(`[Cache] Cleaned up ${removed} expired entries, current size: ${apiCache.size}`);
  }
}, 30000);

app.use('/api', paperRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), cacheSize: apiCache.size });
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
  console.log(`[Cache] LRU cache initialized with max 500 entries, default TTL ${DEFAULT_TTL}ms`);
});

export { app, DEFAULT_TTL, PAPER_GENERATE_TTL, ANALYSIS_TTL };
