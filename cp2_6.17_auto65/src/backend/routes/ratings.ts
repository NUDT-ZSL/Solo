import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Rating } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data');

const router = Router();

let ratingsCache: Rating[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

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

function saveRatings(ratings: Rating[]): void {
  const ratingsPath = path.join(dataDir, 'ratings.json');
  fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2));
  ratingsCache = ratings;
  cacheTime = Date.now();
}

router.post('/', (req: Request, res: Response) => {
  try {
    const { filmId, score, comment } = req.body;
    
    if (!filmId || !score) {
      return res.status(400).json({ error: 'filmId and score are required' });
    }
    
    if (typeof score !== 'number' || score < 1 || score > 5 || !Number.isInteger(score)) {
      return res.status(400).json({ error: 'Score must be an integer between 1 and 5' });
    }
    
    if (comment && comment.length > 200) {
      return res.status(400).json({ error: 'Comment must be less than 200 characters' });
    }
    
    const ratings = loadRatings();
    const newRating: Rating = {
      id: uuidv4(),
      filmId,
      score,
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };
    
    ratings.push(newRating);
    saveRatings(ratings);
    res.status(201).json(newRating);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

router.get('/:filmId', (req: Request, res: Response) => {
  try {
    const { filmId } = req.params;
    const ratings = loadRatings();
    const filmRatings = ratings
      .filter(r => r.filmId === filmId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(filmRatings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load ratings' });
  }
});

export default router;
