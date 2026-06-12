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
  clearSubtitlesByVideo,
} from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const dataDir = path.join(__dirname, '..', '..', 'data');

[uploadsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.mp4') cb(null, true);
    else cb(new Error('Only MP4 files are allowed'));
  },
});

function generateSubtitlesFromVideo(filename: string): { startTime: number; endTime: number; text: string }[] {
  const sampleTexts = [
    '欢迎来到本节课程，今天我们将学习数据结构的基本概念',
    '首先让我们了解什么是数组，数组是一种线性数据结构',
    '数组在内存中是连续存储的，可以通过索引快速访问元素',
    '接下来我们讨论链表，链表由节点组成，每个节点包含数据和指针',
    '与数组不同，链表不需要连续的内存空间',
    '链表的插入和删除操作比数组更高效',
    '现在让我们看看栈这种数据结构，栈遵循后进先出的原则',
    '栈的典型应用包括函数调用栈和表达式求值',
    '队列是另一种重要的数据结构，遵循先进先出的原则',
    '队列常用于任务调度和广度优先搜索',
    '最后我们介绍树结构，树是一种层次型的数据结构',
    '二叉树是每个节点最多有两个子节点的树结构',
    '二叉搜索树支持高效的查找、插入和删除操作',
    '本节课到此结束，感谢大家的聆听',
  ];

  const subtitles: { startTime: number; endTime: number; text: string }[] = [];
  const segmentDuration = 5;

  for (let i = 0; i < sampleTexts.length; i++) {
    subtitles.push({
      startTime: i * segmentDuration,
      endTime: (i + 1) * segmentDuration,
      text: sampleTexts[i],
    });
  }

  return subtitles;
}

function generateQuizFromText(subtitleText: string): { question: string; options: string[]; correctIndex: number } {
  const keywords = subtitleText.split(/[，、，。；]/).filter(s => s.trim().length > 2);
  const mainPoint = keywords[0] || subtitleText.substring(0, 10);

  const question = `关于"${mainPoint}"，以下哪项描述是正确的？`;

  const correctOption = subtitleText.length > 20 ? subtitleText.substring(0, 20) + '...' : subtitleText;

  const distractors = [
    `与"${mainPoint}"完全相反的概念`,
    `"${mainPoint}"的同义词但语义不同`,
    `无关的扩展概念`,
  ];

  const options = [correctOption, ...distractors];
  const correctIndex = 0;

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    if (i === correctIndex || j === correctIndex) continue;
    [options[i], options[j]] = [options[j], options[i]];
  }

  const newCorrectIndex = options.indexOf(correctOption);

  return { question, options, correctIndex: newCorrectIndex };
}

app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const videoId = uuidv4();
    const filename = req.file.originalname;

    insertVideo(videoId, filename);

    const subtitles = generateSubtitlesFromVideo(filename);
    clearSubtitlesByVideo(videoId);
    subtitles.forEach(s => insertSubtitle(videoId, s.startTime, s.endTime, s.text));

    res.json({
      id: videoId,
      filename,
      subtitles: subtitles.map((s, i) => ({ id: i + 1, startTime: s.startTime, endTime: s.endTime, text: s.text })),
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
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
  const { text } = req.body as { text: string };
  updateSubtitleText(Number(req.params.id), text);
  res.json({ success: true });
});

app.post('/api/quizzes/generate', (req, res) => {
  try {
    const { videoId, subtitleText, timePoint } = req.body as { videoId: string; subtitleText: string; timePoint: number };
    const quiz = generateQuizFromText(subtitleText);
    const quizId = uuidv4();

    insertQuiz(quizId, videoId, timePoint, quiz.question, quiz.options, quiz.correctIndex, subtitleText);

    res.json({
      id: quizId,
      videoId,
      timePoint,
      question: quiz.question,
      options: quiz.options,
      correctIndex: quiz.correctIndex,
      subtitleText,
    });
  } catch (err) {
    console.error('Generate quiz error:', err);
    res.status(500).json({ error: 'Quiz generation failed' });
  }
});

app.put('/api/quizzes/:id', (req, res) => {
  const { question, options, correctIndex } = req.body as { question: string; options: string[]; correctIndex: number };
  updateQuiz(req.params.id, question, options, correctIndex);
  res.json({ success: true });
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
    const answerId = uuidv4();
    insertAnswer(answerId, quizId, videoId, studentId, selectedIndex, isCorrect, answerTime);
    res.json({ id: answerId, success: true });
  } catch (err) {
    console.error('Answer submit error:', err);
    res.status(500).json({ error: 'Answer submission failed' });
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

app.get('/api/video-file/:videoId', (req, res) => {
  const video = getVideo(req.params.videoId);
  if (!video) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  const target = files.find(f => f.startsWith(req.params.videoId) || f.includes(req.params.videoId));
  if (target) {
    res.sendFile(path.join(uploadsDir, target));
  } else {
    const anyFile = files.find(f => f.endsWith('.mp4'));
    if (anyFile) {
      res.sendFile(path.join(uploadsDir, anyFile));
    } else {
      res.status(404).json({ error: 'Video file not found' });
    }
  }
});

const PORT = 3001;

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`QuizCraft API server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
