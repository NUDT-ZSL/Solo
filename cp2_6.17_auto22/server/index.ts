import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Artist, Song, TourCity, Favorite, Database, SearchResult } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, 'data.json');

const readData = (): Database => {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: Database) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
};

const app = express();
app.use(cors());
app.use(express.json());

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/api/artists', async (req, res) => {
  await delay(200);
  const data = readData();
  const artists = data.artists.map(a => ({
    ...a,
    songCount: data.songs.filter(s => s.artistId === a.id).length
  }));
  res.json(artists);
});

app.get('/api/artists/:id', async (req, res) => {
  await delay(150);
  const data = readData();
  const artist = data.artists.find(a => a.id === req.params.id);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  const songCount = data.songs.filter(s => s.artistId === artist.id).length;
  res.json({ ...artist, songCount });
});

app.get('/api/artists/:id/songs', async (req, res) => {
  await delay(150);
  const data = readData();
  const songs = data.songs.filter(s => s.artistId === req.params.id);
  res.json(songs);
});

app.post('/api/artists/:id/songs', async (req, res) => {
  await delay(100);
  const data = readData();
  const { title, lyrics, genre } = req.body;
  const newSong: Song = {
    id: uuidv4(),
    artistId: req.params.id,
    title,
    lyrics,
    genre,
    createdAt: new Date().toISOString()
  };
  data.songs.push(newSong);
  writeData(data);
  res.status(201).json(newSong);
});

app.get('/api/artists/:id/tour', async (req, res) => {
  await delay(150);
  const data = readData();
  const tourCities = data.tourCities.filter(t => t.artistId === req.params.id);
  res.json(tourCities);
});

app.post('/api/artists/:id/tour', async (req, res) => {
  await delay(100);
  const data = readData();
  const { name, lat, lng, popularity, date } = req.body;
  const newCity: TourCity = {
    id: uuidv4(),
    artistId: req.params.id,
    name,
    lat,
    lng,
    popularity: popularity ?? 50,
    date
  };
  data.tourCities.push(newCity);
  writeData(data);
  res.status(201).json(newCity);
});

app.delete('/api/tour/:cityId', async (req, res) => {
  await delay(80);
  const data = readData();
  const idx = data.tourCities.findIndex(t => t.id === req.params.cityId);
  if (idx === -1) {
    res.status(404).json({ error: 'City not found' });
    return;
  }
  data.tourCities.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/search', async (req, res) => {
  await delay(80);
  const q = String(req.query.q || '').toLowerCase().trim();
  const data = readData();
  const results: SearchResult[] = [];

  if (q.length > 0) {
    data.artists.forEach(a => {
      if (a.name.toLowerCase().includes(q) || a.genre.some(g => g.toLowerCase().includes(q))) {
        results.push({ type: 'artist', id: a.id, name: a.name, extra: a.genre.join(' / ') });
      }
    });
    data.songs.forEach(s => {
      const artist = data.artists.find(a => a.id === s.artistId);
      if (s.title.toLowerCase().includes(q) || s.genre.some(g => g.toLowerCase().includes(q))) {
        results.push({ type: 'song', id: s.artistId, name: s.title, extra: artist?.name });
      }
    });
  }
  res.json(results.slice(0, 10));
});

app.get('/api/favorites', async (req, res) => {
  await delay(100);
  const data = readData();
  const favs = data.favorites.map(f => {
    const artist = data.artists.find(a => a.id === f.artistId);
    return { ...f, artist };
  }).filter(f => f.artist);
  res.json(favs);
});

app.post('/api/favorites', async (req, res) => {
  await delay(80);
  const data = readData();
  const { artistId } = req.body;
  const exists = data.favorites.find(f => f.artistId === artistId);
  if (exists) {
    res.json(exists);
    return;
  }
  const newFav: Favorite = {
    id: uuidv4(),
    artistId,
    createdAt: new Date().toISOString()
  };
  data.favorites.push(newFav);
  writeData(data);
  res.status(201).json(newFav);
});

app.delete('/api/favorites/:artistId', async (req, res) => {
  await delay(60);
  const data = readData();
  const idx = data.favorites.findIndex(f => f.artistId === req.params.artistId);
  if (idx === -1) {
    res.status(404).json({ error: 'Favorite not found' });
    return;
  }
  data.favorites.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/cities', async (req, res) => {
  await delay(50);
  const search = String(req.query.search || '').toLowerCase().trim();
  const data = readData();
  let cities = data.cities;
  if (search) {
    cities = cities.filter(c => c.name.toLowerCase().includes(search));
  }
  res.json(cities);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
