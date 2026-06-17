import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const questionsFile = path.join(dataDir, 'questions.json');
const scoresFile = path.join(dataDir, 'scores.json');

function readJSON(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/subjects', (_req, res) => {
  const questions = readJSON(questionsFile);
  const subjects = [...new Set(questions.map((q: any) => q.subject))];
  res.json(subjects);
});

app.get('/api/questions', (req, res) => {
  const { subject } = req.query;
  const questions = readJSON(questionsFile);
  let filtered = questions;
  if (subject) {
    filtered = questions.filter((q: any) => q.subject === subject);
  }
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 30);
  res.json(selected.map((q: any) => ({
    id: q.id,
    subject: q.subject,
    question: q.question,
    options: q.options,
    knowledgePoint: q.knowledgePoint,
  })));
});

app.post('/api/submit', (req, res) => {
  const { examineeId, subject, answers, duration } = req.body;
  const questions = readJSON(questionsFile);
  const scores = readJSON(scoresFile);

  let correctCount = 0;
  const wrongAnswers: any[] = [];

  const examQuestions = questions.filter((q: any) =>
    Object.keys(answers).includes(q.id)
  );

  for (const q of examQuestions) {
    const userAnswer = answers[q.id];
    if (userAnswer === q.correctAnswer) {
      correctCount++;
    } else {
      wrongAnswers.push({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer,
        knowledgePoint: q.knowledgePoint,
        explanation: q.explanation,
      });
    }
  }

  const totalQuestions = examQuestions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const record = {
    id: uuidv4(),
    examineeId: examineeId || 'anonymous',
    subject,
    score,
    totalQuestions,
    correctCount,
    duration,
    date: dayjs().format('YYYY-MM-DD HH:mm'),
    wrongAnswers,
  };

  scores.push(record);
  writeJSON(scoresFile, scores);

  res.json({
    id: record.id,
    score,
    totalQuestions,
    correctCount,
    wrongAnswers,
  });
});

app.get('/api/history', (req, res) => {
  const { examineeId } = req.query;
  const scores = readJSON(scoresFile);
  let userScores = scores;
  if (examineeId) {
    userScores = scores.filter((s: any) => s.examineeId === examineeId);
  }
  const recent = userScores.slice(-10).reverse();
  res.json(recent.map((s: any) => ({
    id: s.id,
    subject: s.subject,
    score: s.score,
    date: s.date,
    duration: s.duration,
    totalQuestions: s.totalQuestions,
    correctCount: s.correctCount,
  })));
});

app.get('/api/admin/scores', (_req, res) => {
  const scores = readJSON(scoresFile);
  res.json(scores.map((s: any) => ({
    id: s.id,
    examineeId: s.examineeId,
    subject: s.subject,
    score: s.score,
    totalQuestions: s.totalQuestions,
    correctCount: s.correctCount,
    duration: s.duration,
    date: s.date,
  })));
});

app.post('/api/admin/questions', (req, res) => {
  const { question, options, correctAnswer, subject, knowledgePoint } = req.body;
  if (!question || !options || options.length !== 4 || correctAnswer === undefined || !subject) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const questions = readJSON(questionsFile);
  const newQuestion = {
    id: uuidv4(),
    subject,
    question,
    options,
    correctAnswer: Number(correctAnswer),
    knowledgePoint: knowledgePoint || '基础知识',
    explanation: req.body.explanation || '',
  };
  questions.push(newQuestion);
  writeJSON(questionsFile, questions);
  res.json(newQuestion);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
