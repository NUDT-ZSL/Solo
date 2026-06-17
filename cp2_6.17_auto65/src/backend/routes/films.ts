import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Film, FilmWithStats, Rating } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data');

const router = Router();

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
  const parsed = JSON.parse(data) as Film[];
  filmsCache = parsed;
  cacheTime = Date.now();
  return parsed;
}

function loadRatings(): Rating[] {
  if (ratingsCache && Date.now() - cacheTime < CACHE_TTL) {
    return ratingsCache;
  }
  const ratingsPath = path.join(dataDir, 'ratings.json');
  const data = fs.readFileSync(ratingsPath, 'utf-8');
  const parsed = JSON.parse(data) as Rating[];
  ratingsCache = parsed;
  cacheTime = Date.now();
  return parsed;
}

function saveFilms(films: Film[]): void {
  const filmsPath = path.join(dataDir, 'films.json');
  fs.writeFileSync(filmsPath, JSON.stringify(films, null, 2));
  filmsCache = films;
  cacheTime = Date.now();
}

function calculateFilmStats(film: Film, ratings: Rating[]): FilmWithStats {
  const filmRatings = ratings.filter(r => r.filmId === film.id);
  const voteCount = filmRatings.length;
  const averageScore = voteCount > 0
    ? filmRatings.reduce((sum, r) => sum + r.score, 0) / voteCount
    : 0;
  return { ...film, averageScore: Math.round(averageScore * 10) / 10, voteCount };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const films = loadFilms();
    const ratings = loadRatings();
    const filmsWithStats = films.map(film => calculateFilmStats(film, ratings));
    filmsWithStats.sort((a, b) => b.averageScore - a.averageScore);
    res.json(filmsWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load films' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const films = loadFilms();
    const ratings = loadRatings();
    const film = films.find(f => f.id === id);
    
    if (!film) {
      return res.status(404).json({ error: 'Film not found' });
    }
    
    const filmStats = calculateFilmStats(film, ratings);
    const filmRatings = ratings
      .filter(r => r.filmId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    
    res.json({ ...filmStats, recentComments: filmRatings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load film' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { title, category, posterUrl, description, director, releaseDate } = req.body;
    
    if (!title || !category || !posterUrl || !description || !director || !releaseDate) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const films = loadFilms();
    const newFilm: Film = {
      id: uuidv4(),
      title,
      category,
      posterUrl,
      description,
      director,
      releaseDate,
    };
    
    films.push(newFilm);
    saveFilms(films);
    res.status(201).json(newFilm);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create film' });
  }
});

export default router;
