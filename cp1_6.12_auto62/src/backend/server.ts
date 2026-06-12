import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  insertVideo,
  getVideo,
  getAllVideos,
  insertSubtitle,
  getSubtitlesByVideo,
  updateSubtitleText,
  insertQuiz,
  updateQuiz,
  getQuizzesByVideo,
  getQuiz,
  insertAnswer,
  getAnswersByStudent,
  getQuizStats,
  getStudentSummary,
  clearSubtitlesByVideo,
  isDatabaseReady,
  getDatabaseInfo,
} from './database.js';
import { extractAudioAndGenerateSubtitles, type SubtitleSegment } from './subtitleGenerator.js';
import { generateQuizFromSubtitle, type Quiz, type QuizGenerationOptions } from './quizGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const dataDir = path.join(__dirname, '..', '..', 'data');

[uploadsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    databaseReady: isDatabaseReady(),
    database: isDatabaseReady() ? getDatabaseInfo() : null,
    uptime: process.uptime(),
  });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const id = uuidv4();
    cb(null, `${id}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();
    if (ext === '.mp4' || mimetype === 'video/mp4') {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP4 格式的视频文件'));
    }
  },
});

const uploadProgressMap = new Map<string, { progress: number; stage: string; completed: boolean; error?: string }>();

app.post('/api/videos/upload', (req, res) => {
  const uploadHandler = upload.single('video');

  uploadHandler(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: '视频文件过大，最大支持 200MB' });
        return;
      }
      res.status(400).json({ error: err.message || '上传失败' });
      return;
    }

    try {
      if (!req.file) {
        res.status(400).json({ error: '未提供视频文件' });
        return;
      }

      const fileSize = req.file.size;
      if (fileSize > 200 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ error: '视频文件过大，最大支持 200MB' });
        return;
      }

      if (fileSize < 1024) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ error: '视频文件过小，可能已损坏' });
        return;
      }

      const videoId = path.basename(req.file.filename, path.extname(req.file.filename));
      const filename = req.file.originalname;

      uploadProgressMap.set(videoId, { progress: 0.05, stage: '视频上传完成，正在准备处理', completed: false });

      insertVideo(videoId, filename);

      uploadProgressMap.set(videoId, { progress: 0.1, stage: '正在提取音轨并生成字幕', completed: false });

      const estimatedDuration = Math.max(60, Math.min(3600, Math.floor(fileSize / 1024 / 1024 * 5)));

      const { subtitles } = await extractAudioAndGenerateSubtitles(
        req.file.path,
        filename,
        estimatedDuration,
        { segmentDuration: 5 },
        (progress, stage) => {
          uploadProgressMap.set(videoId, { progress, stage, completed: false });
        }
      );

      clearSubtitlesByVideo(videoId);
      const dbSubtitles: SubtitleSegment[] = [];
      subtitles.forEach((s, index) => {
        insertSubtitle(videoId, s.startTime, s.endTime, s.text);
        dbSubtitles.push({ id: index + 1, startTime: s.startTime, endTime: s.endTime, text: s.text });
      });

      uploadProgressMap.set(videoId, { progress: 1.0, stage: '完成', completed: true });

      setTimeout(() => {
        uploadProgressMap.delete(videoId);
      }, 60000);

      res.json({
        id: videoId,
        filename,
        fileSize,
        estimatedDuration,
        subtitles: dbSubtitles,
      });
    } catch (err) {
      console.error('Upload processing error:', err);
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      res.status(500).json({ error: err instanceof Error ? err.message : '视频处理失败' });
    }
  });
});

app.get('/api/videos/upload/:videoId/progress', (req, res) => {
  const progress = uploadProgressMap.get(req.params.videoId);
  if (!progress) {
    res.status(404).json({ error: '未找到上传任务' });
    return;
  }
  res.json(progress);
});

app.post('/api/videos/:id/subtitles/re-generate', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = getVideo(videoId);
    if (!video) {
      res.status(404).json({ error: '视频不存在' });
      return;
    }

    const { segmentDuration = 5 } = req.body as { segmentDuration?: number };

    const files = fs.readdirSync(uploadsDir);
    const videoFile = files.find(f => f.startsWith(videoId));
    if (!videoFile) {
      res.status(404).json({ error: '视频文件不存在' });
      return;
    }

    const videoPath = path.join(uploadsDir, videoFile);
    const stats = fs.statSync(videoPath);
    const estimatedDuration = Math.max(60, Math.min(3600, Math.floor(stats.size / 1024 / 1024 * 5)));

    const { subtitles } = await extractAudioAndGenerateSubtitles(
      videoPath,
      video.filename,
      estimatedDuration,
      { segmentDuration }
    );

    clearSubtitlesByVideo(videoId);
    subtitles.forEach(s => insertSubtitle(videoId, s.startTime, s.endTime, s.text));

    res.json({ subtitles: subtitles.map((s, i) => ({ id: i + 1, startTime: s.startTime, endTime: s.endTime, text: s.text })) });
  } catch (err) {
    console.error('Regenerate subtitles error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '字幕重新生成失败' });
  }
});

app.get('/api/videos', (_req, res) => {
  const videos = getAllVideos();
  res.json(videos);
});

app.get('/api/videos/:id', (req, res) => {
  const video = getVideo(req.params.id);
  if (!video) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  res.json(video);
});

app.get('/api/videos/:id/subtitles', (req, res) => {
  const subtitles = getSubtitlesByVideo(req.params.id);
  res.json(subtitles.map(s => ({ id: s.id, startTime: s.start_time, endTime: s.end_time, text: s.text })));
});

app.put('/api/subtitles/:id', (req, res) => {
  try {
    const { text } = req.body as { text: string };
    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: '字幕内容不能为空' });
      return;
    }
    updateSubtitleText(Number(req.params.id), text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新字幕失败' });
  }
});

app.post('/api/quizzes/generate', (req, res) => {
  try {
    const { videoId, subtitleText, timePoint, difficulty = 'medium' } = req.body as {
      videoId: string;
      subtitleText: string;
      timePoint: number;
      difficulty?: 'easy' | 'medium' | 'hard';
    };

    if (!subtitleText || subtitleText.trim().length < 5) {
      res.status(400).json({ error: '字幕内容太短，无法生成题目' });
      return;
    }

    const options: QuizGenerationOptions = { difficulty };
    const generatedQuiz = generateQuizFromSubtitle(subtitleText, options);
    const quizId = uuidv4();

    insertQuiz(
      quizId,
      videoId,
      timePoint,
      generatedQuiz.question,
      generatedQuiz.options,
      generatedQuiz.correctIndex,
      subtitleText
    );

    const quiz: Quiz = {
      id: quizId,
      videoId,
      timePoint,
      question: generatedQuiz.question,
      options: generatedQuiz.options,
      correctIndex: generatedQuiz.correctIndex,
      subtitleText,
    };

    res.json(quiz);
  } catch (err) {
    console.error('Generate quiz error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '题目生成失败' });
  }
});

app.post('/api/quizzes/batch-generate', (req, res) => {
  try {
    const { videoId, subtitleIds, difficulty = 'medium' } = req.body as {
      videoId: string;
      subtitleIds?: number[];
      difficulty?: 'easy' | 'medium' | 'hard';
    };

    const subtitles = getSubtitlesByVideo(videoId);
    const targetSubtitles = subtitleIds
      ? subtitles.filter(s => subtitleIds.includes(s.id))
      : subtitles;

    const quizzes: Quiz[] = [];
    const options: QuizGenerationOptions = { difficulty };

    for (const sub of targetSubtitles) {
      try {
        const generated = generateQuizFromSubtitle(sub.text, options);
        const quizId = uuidv4();
        insertQuiz(quizId, videoId, sub.start_time, generated.question, generated.options, generated.correctIndex, sub.text);
        quizzes.push({
          id: quizId,
          videoId,
          timePoint: sub.start_time,
          question: generated.question,
          options: generated.options,
          correctIndex: generated.correctIndex,
          subtitleText: sub.text,
        });
      } catch (e) {
        console.warn(`Failed to generate quiz for subtitle ${sub.id}:`, e);
      }
    }

    res.json({ count: quizzes.length, quizzes });
  } catch (err) {
    console.error('Batch generate quiz error:', err);
    res.status(500).json({ error: '批量生成题目失败' });
  }
});

app.put('/api/quizzes/:id', (req, res) => {
  try {
    const { question, options, correctIndex } = req.body as { question: string; options: string[]; correctIndex: number };

    if (!question || question.trim().length < 5) {
      res.status(400).json({ error: '题目内容太短' });
      return;
    }
    if (!options || options.length < 2) {
      res.status(400).json({ error: '至少需要两个选项' });
      return;
    }
    if (correctIndex < 0 || correctIndex >= options.length) {
      res.status(400).json({ error: '正确答案索引无效' });
      return;
    }

    updateQuiz(req.params.id, question, options, correctIndex);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新题目失败' });
  }
});

app.get('/api/videos/:id/quizzes', (req, res) => {
  const quizzes = getQuizzesByVideo(req.params.id);
  res.json(quizzes.map(q => ({
    id: q.id,
    videoId: q.video_id,
    timePoint: q.time_point,
    question: q.question,
    options: JSON.parse(q.options),
    correctIndex: q.correct_index,
    subtitleText: q.subtitle_text,
  })));
});

app.post('/api/answers', (req, res) => {
  try {
    const { quizId, videoId, studentId, selectedIndex, isCorrect, answerTime } = req.body as {
      quizId: string;
      videoId: string;
      studentId: string;
      selectedIndex: number;
      isCorrect: boolean;
      answerTime: number;
    };

    if (!quizId || !videoId || !studentId) {
      res.status(400).json({ error: '缺少必要参数' });
      return;
    }
    if (answerTime < 0 || answerTime > 600) {
      res.status(400).json({ error: '答题时间无效' });
      return;
    }

    const answerId = uuidv4();
    insertAnswer(answerId, quizId, videoId, studentId, selectedIndex, isCorrect, answerTime);
    res.json({ id: answerId, success: true });
  } catch (err) {
    console.error('Answer submit error:', err);
    res.status(500).json({ error: '答案提交失败' });
  }
});

app.get('/api/videos/:id/answers/:studentId', (req, res) => {
  const answers = getAnswersByStudent(req.params.studentId, req.params.id);
  res.json(answers.map(a => ({
    id: a.id,
    quizId: a.quiz_id,
    videoId: a.video_id,
    studentId: a.student_id,
    selectedIndex: a.selected_index,
    isCorrect: a.is_correct === 1,
    answerTime: a.answer_time,
    timestamp: a.timestamp,
  })));
});

app.get('/api/videos/:id/stats', (req, res) => {
  const stats = getQuizStats(req.params.id);
  res.json(stats);
});

app.get('/api/videos/:id/students', (req, res) => {
  try {
    const summaries = getStudentSummary(req.params.id);
    res.json({
      totalStudents: summaries.length,
      averageCorrectRate: summaries.length > 0
        ? summaries.reduce((sum, s) => sum + s.correctRate, 0) / summaries.length
        : 0,
      averageTime: summaries.length > 0
        ? summaries.reduce((sum, s) => sum + s.totalAnswerTime, 0) / summaries.length
        : 0,
      students: summaries,
    });
  } catch (err) {
    console.error('Get student summary error:', err);
    res.status(500).json({ error: '获取学生汇总失败' });
  }
});

app.get('/api/video-file/:videoId', (req, res) => {
  const video = getVideo(req.params.videoId);
  if (!video) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  const target = files.find(f => f.startsWith(req.params.videoId) || f.includes(req.params.videoId));
  if (target) {
    const filePath = path.join(uploadsDir, target);
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    res.status(404).json({ error: 'Video file not found' });
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = 3001;

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`QuizCraft API server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
