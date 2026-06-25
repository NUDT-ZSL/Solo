import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';
import { readSync, writeSync, readAsync, writeAsync } from './dataStore.js';

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only mp3/wav files are allowed'));
    }
  },
});

app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/v1/programs', (_req, res) => {
  const programs = readSync<any>('programs');
  res.json(programs);
});

app.post('/api/v1/programs', (req, res, next) => {
  if (req.is('application/json')) {
    const programs = readSync<any>('programs');
    const { title, coverUrl, transcript, transcriptTimestamps } = req.body;
    const program = {
      id: uuidv4(),
      title: title || 'Untitled Program',
      coverUrl: coverUrl || '',
      audioUrl: '',
      duration: 300,
      chapters: [],
      comments: [],
      playCount: 0,
      createdAt: dayjs().toISOString(),
      transcript: transcript || '',
      transcriptTimestamps: transcriptTimestamps || [],
    };
    programs.push(program);
    writeSync('programs', programs);
    res.status(201).json(program);
    return;
  }
  next();
}, upload.single('audio'), (req, res) => {
  const programs = readSync<any>('programs');
  const { title, coverUrl } = req.body;
  const audioFile = req.file;
  const program = {
    id: uuidv4(),
    title: title || 'Untitled Program',
    coverUrl: coverUrl || '',
    audioUrl: audioFile ? `/uploads/${audioFile.filename}` : '',
    duration: 300,
    chapters: [],
    comments: [],
    playCount: 0,
    createdAt: dayjs().toISOString(),
    transcript: req.body.transcript || '',
    transcriptTimestamps: req.body.transcriptTimestamps
      ? JSON.parse(req.body.transcriptTimestamps)
      : [],
  };
  programs.push(program);
  writeSync('programs', programs);
  res.status(201).json(program);
});

app.get('/api/v1/programs/:id', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  res.json(program);
});

app.put('/api/v1/programs/:id', (req, res) => {
  const programs = readSync<any>('programs');
  const idx = programs.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  programs[idx] = { ...programs[idx], ...req.body, id: programs[idx].id };
  writeSync('programs', programs);
  res.json(programs[idx]);
});

app.delete('/api/v1/programs/:id', (req, res) => {
  let programs = readSync<any>('programs');
  programs = programs.filter((p: any) => p.id !== req.params.id);
  writeSync('programs', programs);
  res.status(204).end();
});

app.post('/api/v1/programs/:id/chapters', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  const chapter = {
    id: uuidv4(),
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    title: req.body.title,
    description: req.body.description || '',
    colorIndex: program.chapters.length,
  };
  program.chapters.push(chapter);
  writeSync('programs', programs);
  res.status(201).json(chapter);
});

app.put('/api/v1/programs/:id/chapters/:chapterId', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  const chapter = program.chapters.find((c: any) => c.id === req.params.chapterId);
  if (!chapter) {
    res.status(404).json({ error: 'Chapter not found' });
    return;
  }
  Object.assign(chapter, req.body, { id: chapter.id });
  writeSync('programs', programs);
  res.json(chapter);
});

app.delete('/api/v1/programs/:id/chapters/:chapterId', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  program.chapters = program.chapters.filter((c: any) => c.id !== req.params.chapterId);
  writeSync('programs', programs);
  res.status(204).end();
});

app.post('/api/v1/programs/:id/chapters/:chapterId/comments', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  const comment = {
    id: uuidv4(),
    chapterId: req.params.chapterId,
    text: req.body.text || '',
    emoji: req.body.emoji || '',
    timestamp: dayjs().toISOString(),
  };
  program.comments.push(comment);
  writeSync('programs', programs);
  res.status(201).json(comment);
});

app.get('/api/v1/programs/:id/chapters/:chapterId/comments', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const chapterComments = program.comments.filter(
    (c: any) => c.chapterId === req.params.chapterId
  );
  const start = (page - 1) * limit;
  const paged = chapterComments.slice(start, start + limit);
  res.json({ total: chapterComments.length, page, limit, data: paged });
});

app.post('/api/v1/programs/:id/play', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  program.playCount = (program.playCount || 0) + 1;
  writeSync('programs', programs);
  res.json({ playCount: program.playCount });
});

app.get('/api/v1/programs/dashboard', (_req, res) => {
  const programs = readSync<any>('programs');
  const dashboard = programs.map((p: any) => {
    const chapterStats = p.chapters.map((c: any) => {
      const chapterComments = (p.comments || []).filter(
        (cm: any) => cm.chapterId === c.id
      );
      const completionRate = Math.random() * 0.6 + 0.3;
      return {
        chapterId: c.id,
        title: c.title,
        completionRate: Math.round(completionRate * 100),
        commentCount: chapterComments.length,
      };
    });
    const commentsByDate: Record<string, number> = {};
    (p.comments || []).forEach((cm: any) => {
      const date = dayjs(cm.timestamp).format('YYYY-MM-DD');
      commentsByDate[date] = (commentsByDate[date] || 0) + 1;
    });
    const commentTrend = Object.entries(commentsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    return {
      id: p.id,
      title: p.title,
      playCount: p.playCount || 0,
      chapterStats,
      commentTrend,
    };
  });
  res.json(dashboard);
});

app.put('/api/v1/programs/:id/transcript', (req, res) => {
  const programs = readSync<any>('programs');
  const program = programs.find((p: any) => p.id === req.params.id);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  program.transcript = req.body.transcript || '';
  program.transcriptTimestamps = req.body.transcriptTimestamps || [];
  writeSync('programs', programs);
  res.json({ success: true });
});

const PORT = 3006;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
