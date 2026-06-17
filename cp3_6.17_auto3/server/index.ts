import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

interface Question {
  id: string;
  subject: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: 'basic' | 'logic' | 'code' | 'security' | 'management';
  analysis: string;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  questionCount: number;
}

interface WrongAnswer {
  questionId: string;
  questionText: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  category: string;
  analysis: string;
}

interface DimensionScores {
  basic: number;
  logic: number;
  code: number;
  security: number;
  management: number;
}

interface ExamRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  answers: Record<string, number>;
  wrongAnswers: WrongAnswer[];
  dimensionScores: DimensionScores;
  createdAt: string;
}

interface SubmitRequest {
  subjectId: string;
  answers: Record<string, number>;
  timeTaken: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

function readJSON<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function calculateDimensionScores(
  questions: Question[],
  answers: Record<string, number>
): DimensionScores {
  const dims: Record<string, { total: number; correct: number }> = {
    basic: { total: 0, correct: 0 },
    logic: { total: 0, correct: 0 },
    code: { total: 0, correct: 0 },
    security: { total: 0, correct: 0 },
    management: { total: 0, correct: 0 },
  };

  for (const q of questions) {
    const dim = dims[q.category];
    if (!dim) continue;
    dim.total++;
    const userAnswer = answers[q.id];
    if (userAnswer !== undefined && userAnswer === q.correctAnswer) {
      dim.correct++;
    }
  }

  const result: DimensionScores = {
    basic: 0,
    logic: 0,
    code: 0,
    security: 0,
    management: 0,
  };

  (Object.keys(dims) as Array<keyof DimensionScores>).forEach((key) => {
    const dim = dims[key];
    result[key] = dim.total > 0 ? Math.round((dim.correct / dim.total) * 100) : 0;
  });

  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.get('/api/subjects', (_req, res) => {
  try {
    const subjects = readJSON<Subject[]>('subjects.json');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: '读取科目数据失败' });
  }
});

app.get('/api/questions', (req, res) => {
  try {
    const subject = req.query.subject as string;
    if (!subject) {
      return res.status(400).json({ error: '缺少subject参数' });
    }
    const questions = readJSON<Question[]>('questions.json');
    const filtered = questions.filter((q) => q.subject === subject);
    const shuffled = shuffleArray(filtered).slice(0, 30);
    res.json(shuffled);
  } catch (err) {
    res.status(500).json({ error: '读取题目数据失败' });
  }
});

app.post('/api/exam/submit', (req, res) => {
  try {
    const { subjectId, answers, timeTaken } = req.body as SubmitRequest;
    if (!subjectId || !answers) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const subjects = readJSON<Subject[]>('subjects.json');
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) {
      return res.status(404).json({ error: '科目不存在' });
    }

    const allQuestions = readJSON<Question[]>('questions.json');
    const subjectQuestions = allQuestions.filter((q) => q.subject === subjectId);
    const questionMap = new Map<string, Question>();
    subjectQuestions.forEach((q) => questionMap.set(q.id, q));

    const answeredQuestionIds = Object.keys(answers);
    let correctCount = 0;
    const wrongAnswers: WrongAnswer[] = [];

    for (const questionId of answeredQuestionIds) {
      const q = questionMap.get(questionId);
      if (!q) continue;
      const userAnswer = answers[questionId];
      if (userAnswer === q.correctAnswer) {
        correctCount++;
      } else {
        wrongAnswers.push({
          questionId: q.id,
          questionText: q.text,
          options: q.options,
          userAnswer,
          correctAnswer: q.correctAnswer,
          category: q.category,
          analysis: q.analysis,
        });
      }
    }

    const totalQuestions = answeredQuestionIds.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const dimensionScores = calculateDimensionScores(subjectQuestions, answers);

    const examRecord: ExamRecord = {
      id: uuidv4(),
      subjectId,
      subjectName: subject.name,
      score,
      correctCount,
      totalQuestions,
      timeTaken,
      answers,
      wrongAnswers,
      dimensionScores,
      createdAt: new Date().toISOString(),
    };

    const records = readJSON<ExamRecord[]>('exam-records.json');
    records.unshift(examRecord);
    const trimmedRecords = records.slice(0, 50);
    writeJSON('exam-records.json', trimmedRecords);

    res.json({
      examId: examRecord.id,
      score,
      correctCount,
      totalQuestions,
      wrongAnswers,
      dimensionScores,
    });
  } catch (err) {
    res.status(500).json({ error: '提交考试失败' });
  }
});

app.get('/api/exam/:id', (req, res) => {
  try {
    const { id } = req.params;
    const records = readJSON<ExamRecord[]>('exam-records.json');
    const record = records.find((r) => r.id === id);
    if (!record) {
      return res.status(404).json({ error: '考试记录不存在' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: '读取考试记录失败' });
  }
});

app.get('/api/history', (_req, res) => {
  try {
    const records = readJSON<ExamRecord[]>('exam-records.json');
    res.json(records.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: '读取历史记录失败' });
  }
});

app.get('/api/admin/scores', (_req, res) => {
  try {
    const records = readJSON<ExamRecord[]>('exam-records.json');
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '读取成绩数据失败' });
  }
});

app.post('/api/admin/questions', (req, res) => {
  try {
    const questionData = req.body as Omit<Question, 'id'>;
    if (
      !questionData.subject ||
      !questionData.text ||
      !questionData.options ||
      questionData.correctAnswer === undefined ||
      !questionData.category
    ) {
      return res.status(400).json({ error: '题目数据不完整' });
    }
    const newQuestion: Question = {
      ...questionData,
      id: uuidv4(),
    };
    const questions = readJSON<Question[]>('questions.json');
    questions.push(newQuestion);
    writeJSON('questions.json', questions);
    res.json({ success: true, id: newQuestion.id, message: '题目添加成功' });
  } catch (err) {
    res.status(500).json({ error: '添加题目失败' });
  }
});

app.listen(PORT, () => {
  console.log(`职业资格考试系统后端服务已启动: http://localhost:${PORT}`);
});
