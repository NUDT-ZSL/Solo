import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const scoresDb = Datastore.create({ filename: path.join(__dirname, 'data', 'scores.db'), autoload: true });

const songs = [
  { id: 'song-1', name: 'Midnight Pulse', bpm: 80, duration: 30, style: 'ambient', color: '#3b82f6' },
  { id: 'song-2', name: 'Neon Drift', bpm: 95, duration: 30, style: 'chill', color: '#3b82f6' },
  { id: 'song-3', name: 'Cyber Dash', bpm: 120, duration: 30, style: 'synthwave', color: '#8b5cf6' },
  { id: 'song-4', name: 'Pixel Storm', bpm: 135, duration: 30, style: 'electronic', color: '#8b5cf6' },
  { id: 'song-5', name: 'Turbo Blaze', bpm: 160, duration: 30, style: 'drum-and-bass', color: '#ef4444' },
  { id: 'song-6', name: 'Hyper Nova', bpm: 180, duration: 30, style: 'hardcore', color: '#ef4444' },
];

function generateBeats(bpm, duration) {
  const beatInterval = 60 / bpm;
  const beats = [];
  for (let t = 0; t < duration; t += beatInterval) {
    beats.push(Math.round(t * 1000) / 1000);
  }
  return beats;
}

app.get('/api/songs', (req, res) => {
  const songList = songs.map(s => ({
    id: s.id,
    name: s.name,
    bpm: s.bpm,
    duration: s.duration,
    style: s.style,
    color: s.color,
  }));
  res.json(songList);
});

app.get('/api/songs/:id', (req, res) => {
  const song = songs.find(s => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  const beats = generateBeats(song.bpm, song.duration);
  res.json({
    ...song,
    beats,
    audioUrl: `/api/audio/${song.id}`,
  });
});

app.get('/api/audio/:id', (req, res) => {
  const song = songs.find(s => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  const sampleRate = 44100;
  const duration = song.duration;
  const numSamples = sampleRate * duration;
  const beatInterval = 60 / song.bpm;

  const buffer = Buffer.alloc(numSamples * 2);
  const freqs = getFrequencies(song.style);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beatPos = (t % beatInterval) / beatInterval;
    const beatIndex = Math.floor(t / beatInterval);
    const freq = freqs[beatIndex % freqs.length];
    const env = Math.exp(-beatPos * 8);
    let sample = 0;

    sample += Math.sin(2 * Math.PI * freq * t) * 0.3 * env;
    sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.15 * env;
    sample += (Math.random() * 2 - 1) * 0.05 * env;

    const bassEnv = Math.exp(-beatPos * 3);
    sample += Math.sin(2 * Math.PI * (freq / 4) * t) * 0.2 * bassEnv;

    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(intSample, i * 2);
  }

  const wavHeader = createWavHeader(numSamples, sampleRate);
  const wavBuffer = Buffer.concat([wavHeader, buffer]);

  res.set({
    'Content-Type': 'audio/wav',
    'Content-Length': wavBuffer.length,
    'Cache-Control': 'public, max-age=3600',
  });
  res.send(wavBuffer);
});

function getFrequencies(style) {
  const scales = {
    ambient: [261.63, 329.63, 392.00, 440.00, 523.25, 392.00, 329.63, 293.66],
    chill: [293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23],
    synthwave: [329.63, 415.30, 493.88, 659.25, 493.88, 415.30, 329.63, 293.66],
    electronic: [349.23, 440.00, 523.25, 659.25, 783.99, 659.25, 523.25, 440.00],
    'drum-and-bass': [392.00, 466.16, 587.33, 698.46, 783.99, 698.46, 587.33, 466.16],
    hardcore: [440.00, 554.37, 659.25, 880.00, 783.99, 659.25, 554.37, 440.00],
  };
  return scales[style] || scales.electronic;
}

function createWavHeader(numSamples, sampleRate) {
  const header = Buffer.alloc(44);
  const dataSize = numSamples * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return header;
}

app.post('/api/score', async (req, res) => {
  const { playerName, score, songId } = req.body;
  if (!playerName || score === undefined || !songId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const entry = {
    id: uuidv4(),
    playerName,
    score: Number(score),
    songId,
    createdAt: new Date().toISOString(),
  };
  await scoresDb.insert(entry);
  res.json({ success: true, entry });
});

app.get('/api/leaderboard/:songId', async (req, res) => {
  const { songId } = req.params;
  const docs = await scoresDb
    .find({ songId })
    .sort({ score: -1 })
    .limit(10)
    .exec();
  res.json(docs);
});

const PORT = 3001;
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`RhythmTracer server running on port ${PORT}`);
});
