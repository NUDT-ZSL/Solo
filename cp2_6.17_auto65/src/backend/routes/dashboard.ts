import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Film, FilmWithStats, Rating, CategoryHeat, DailyTrend, WordCloudItem } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data');

const router = Router();

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '他', '她', '它', '们', '这个', '那个', '什么', '怎么',
  '太', '最', '真', '还', '让', '与', '及', '等', '但', '而', '或', '如',
  '可以', '能够', '应该', '需要', '非常', '特别', '比较', '更加',
  '电影', '影片', '片子', '这部', '看完'
]);

let filmsCache: Film[] | null = null;
let ratingsCache: Rating[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

function loadFilms(): Film[] {
  if (filmsCache && Date.now() - cacheTime < CACHE_TTL) {
    return filmsCache;
  }
  const filmsPath = path.join(dataDir, 'films.json');
  const data = fs.readFileSync(filmsPath, 'utf-8');
  filmsCache = JSON.parse(data);
  cacheTime = Date.now();
  return filmsCache;
}

function loadRatings(): Rating[] {
  if (ratingsCache && Date.now() - cacheTime < CACHE_TTL) {
    return ratingsCache;
  }
  const ratingsPath = path.join(dataDir, 'ratings.json');
  const data = fs.readFileSync(ratingsPath, 'utf-8');
  ratingsCache = JSON.parse(data);
  cacheTime = Date.now();
  return ratingsCache;
}

function calculateFilmStats(film: Film, ratings: Rating[]): FilmWithStats {
  const filmRatings = ratings.filter(r => r.filmId === film.id);
  const voteCount = filmRatings.length;
  const averageScore = voteCount > 0
    ? filmRatings.reduce((sum, r) => sum + r.score, 0) / voteCount
    : 0;
  return { ...film, averageScore: Math.round(averageScore * 10) / 10, voteCount };
}

function calculateCategoryHeat(films: Film[], ratings: Rating[]): CategoryHeat[] {
  const categories = ['剧情', '纪录片', '动画'];
  return categories.map(category => {
    const categoryFilms = films.filter(f => f.category === category);
    const categoryRatings = ratings.filter(r => 
      categoryFilms.some(f => f.id === r.filmId)
    );
    const count = categoryRatings.length;
    const avgScore = count > 0
      ? categoryRatings.reduce((sum, r) => sum + r.score, 0) / count
      : 0;
    const heat = count * avgScore;
    return { category, heat: Math.round(heat * 10) / 10, count };
  });
}

function calculateDailyTrends(ratings: Rating[]): DailyTrend[] {
  const dateMap = new Map<string, number>();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  ratings.forEach(r => {
    const date = new Date(r.createdAt);
    if (date >= sevenDaysAgo) {
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    }
  });
  
  const trends: DailyTrend[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trends.push({ date: dateStr, count: dateMap.get(dateStr) || 0 });
  }
  
  return trends;
}

function generateWordCloud(ratings: Rating[]): WordCloudItem[] {
  const wordCount = new Map<string, number>();
  
  ratings.forEach(r => {
    if (!r.comment) return;
    const words = r.comment
      .replace(/[，。！？、；：""''（）\[\]【】\s]+/g, ' ')
      .split(' ')
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
    
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
  });
  
  const wordCloud: WordCloudItem[] = [];
  wordCount.forEach((count, word) => {
    if (count > 3) {
      wordCloud.push({ text: word, weight: count });
    }
  });
  
  wordCloud.sort((a, b) => b.weight - a.weight);
  return wordCloud.slice(0, 50);
}

router.get('/', (req: Request, res: Response) => {
  try {
    const films = loadFilms();
    const ratings = loadRatings();
    
    const filmsWithStats = films.map(film => calculateFilmStats(film, ratings));
    filmsWithStats.sort((a, b) => b.averageScore - a.averageScore);
    
    const categoryHeats = calculateCategoryHeat(films, ratings);
    const dailyTrends = calculateDailyTrends(ratings);
    const wordCloud = generateWordCloud(ratings);
    
    res.json({
      categoryHeats,
      dailyTrends,
      wordCloud,
      topFilms: filmsWithStats.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
