import { v4 as uuidv4 } from 'uuid';

export interface Brew {
  id: string;
  origin: string;
  grindLevel: number;
  waterTemp: number;
  ratio: string;
  pourTime: number;
  flavorTags: string[];
  rating: number;
  createdAt: string;
}

export interface StatsResponse {
  ratingTrend: { date: string; rating: number }[];
  originStats: { origin: string; avgRating: number; count: number }[];
}

const brews: Brew[] = [];

export function addBrew(data: Omit<Brew, 'id' | 'createdAt'>): Brew {
  const brew: Brew = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  brews.unshift(brew);
  return brew;
}

export function getBrews(page: number = 1, limit: number = 12) {
  const total = brews.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = brews.slice(start, start + limit);
  return { data, page, totalPages, total };
}

export function deleteBrew(id: string): boolean {
  const index = brews.findIndex((b) => b.id === id);
  if (index === -1) return false;
  brews.splice(index, 1);
  return true;
}

export function getStats(range: 'all' | '30d' | '7d'): StatsResponse {
  const now = new Date();
  let filtered = brews;

  if (range === '30d') {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filtered = brews.filter((b) => new Date(b.createdAt) >= cutoff);
  } else if (range === '7d') {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filtered = brews.filter((b) => new Date(b.createdAt) >= cutoff);
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const ratingTrend = sorted.map((b) => ({
    date: new Date(b.createdAt).toLocaleDateString('zh-CN'),
    rating: b.rating,
  }));

  const originMap = new Map<string, { total: number; count: number }>();
  for (const b of filtered) {
    const entry = originMap.get(b.origin) || { total: 0, count: 0 };
    entry.total += b.rating;
    entry.count += 1;
    originMap.set(b.origin, entry);
  }

  const originStats = Array.from(originMap.entries()).map(
    ([origin, { total, count }]) => ({
      origin,
      avgRating: Math.round((total / count) * 10) / 10,
      count,
    })
  );

  return { ratingTrend, originStats };
}
