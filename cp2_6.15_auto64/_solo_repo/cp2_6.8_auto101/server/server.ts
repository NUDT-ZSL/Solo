import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverColor: string;
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  shareCode: string;
  songs: Song[];
  createdAt: number;
}

const mockSongs: Song[] = [
  { id: 'song-1', title: 'Midnight Dreams', artist: 'Luna Wave', duration: 245, coverColor: '#6366F1' },
  { id: 'song-2', title: 'Electric Sunset', artist: 'Neon Pulse', duration: 198, coverColor: '#EC4899' },
  { id: 'song-3', title: 'Ocean Breeze', artist: 'Coastal Vibes', duration: 312, coverColor: '#06B6D4' },
  { id: 'song-4', title: 'Urban Nights', artist: 'City Lights', duration: 267, coverColor: '#F59E0B' },
  { id: 'song-5', title: 'Mountain Echo', artist: 'Alpine Sound', duration: 289, coverColor: '#10B981' },
  { id: 'song-6', title: 'Starlight', artist: 'Cosmic Journey', duration: 223, coverColor: '#8B5CF6' },
  { id: 'song-7', title: 'Rainy Day', artist: 'Ambient Mood', duration: 334, coverColor: '#64748B' },
  { id: 'song-8', title: 'Summer Heat', artist: 'Tropical Beat', duration: 201, coverColor: '#EF4444' },
  { id: 'song-9', title: 'Frozen Lake', artist: 'Arctic Tones', duration: 278, coverColor: '#0EA5E9' },
  { id: 'song-10', title: 'Golden Hour', artist: 'Sunset Vibes', duration: 256, coverColor: '#F97316' },
];

let playlists: Playlist[] = [];

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PL-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.get('/api/songs/search', (req, res) => {
  const q = (req.query.q as string) || '';
  if (!q.trim()) {
    return res.json(mockSongs);
  }
  const lowerQ = q.toLowerCase();
  const results = mockSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(lowerQ) ||
      song.artist.toLowerCase().includes(lowerQ)
  );
  res.json(results);
});

app.get('/api/playlists', (_req, res) => {
  res.json(playlists);
});

app.post('/api/playlists', (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newPlaylist: Playlist = {
    id: uuidv4(),
    title,
    description: description || '',
    shareCode: generateShareCode(),
    songs: [],
    createdAt: Date.now(),
  };
  playlists.push(newPlaylist);
  res.status(201).json(newPlaylist);
});

app.get('/api/playlists/:id', (req, res) => {
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  res.json(playlist);
});

app.post('/api/playlists/:id/songs', (req, res) => {
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  const { song } = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Song data is required' });
  }
  if (!playlist.songs.find((s) => s.id === song.id)) {
    playlist.songs.push(song);
  }
  res.json(playlist);
});

app.delete('/api/playlists/:id/songs/:songId', (req, res) => {
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  playlist.songs = playlist.songs.filter((s) => s.id !== req.params.songId);
  res.json(playlist);
});

app.put('/api/playlists/:id/reorder', (req, res) => {
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  const { songIds }: { songIds: string[] } = req.body;
  if (!Array.isArray(songIds)) {
    return res.status(400).json({ error: 'songIds array is required' });
  }
  const songMap = new Map(playlist.songs.map((s) => [s.id, s]));
  playlist.songs = songIds
    .map((id) => songMap.get(id))
    .filter((s): s is Song => s !== undefined);
  res.json(playlist);
});

app.get('/api/share/:code', (req, res) => {
  const playlist = playlists.find((p) => p.shareCode === req.params.code);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  res.json(playlist);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
