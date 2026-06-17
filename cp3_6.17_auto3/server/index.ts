import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type {
  Subject,
  Question,
  ExamRecord,
  ExamSubmitPayload,
  QuestionCategory,
  ExamAnswer,
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

const CATEGORIES: QuestionCategory[] = [
  '基础',
  '逻辑分析',
  '代码理解',
  '安全规范',
  '项目管理',
];

function readJSON<T>(file: string): T {
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJSON<T>(file: string, data: T): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

function generateSuggestions(
  categoryScores: Record<QuestionCategory, number>
): string[] {
  const sorted = Object.entries(categoryScores).sort(
    (a, b) => a[1] - b[1]
  ) as [QuestionCategory, number][];

  const weakest = sorted.slice(0, 3);
  const templates: Record<QuestionCategory, string> = {
    基础: '建议加强基础知识的系统学习，回顾核心概念和定义',
    逻辑分析: '建议加强逻辑分析类题目的练习，多思考解题思路',
    代码理解: '建议多阅读实际代码，增强对代码执行流程的理解',
    安全规范: '建议深入学习安全规范标准，如等保2.0、GDPR等合规要求',
    项目管理: '建议掌握项目管理知识体系框架，如PMBOK五大过程组和十大知识领域',
  };

  const suggestions: string[] = weakest.map(
    ([cat]) => templates[cat]
  );

  const avg =
    Object.values(categoryScores).reduce((a, b) => a + b, 0) /
    Object.values(categoryScores).length;

  if (avg < 60) {
    suggestions.push(
      '整体得分偏低，建议系统性复习整个科目知识体系后再次练习'
    );
  } else if (avg < 80) {
    suggestions.push(
      '整体掌握尚可，但仍有提升空间，建议针对薄弱环节专项突破'
    );
  } else {
    suggestions.push(
      '整体掌握较好，保持学习节奏，定期模拟练习巩固记忆'
    );
  }

  return suggestions.slice(0, 3);
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/subjects', (_req: Request, res: Response) => {
  const subjects = readJSON<Subject[]>(SUBJECTS_FILE);
  res.json(subjects);
});

app.get(
  '/api/questions/:subject',
  (req: Request<{ subject: string }>, res: Response) => {
    const { subject } = req.params;
    const allQuestions = readJSON<Question[]>(QUESTIONS_FILE);
    const subjectQuestions = allQuestions.filter((q) => q.subject === subject);

    if (subjectQuestions.length === 0) {
      res.status(404).json({ error: '科目不存在' });
      return;
    }

    const result = subjectQuestions.map(
      ({ correctAnswer, explanation, ...rest }) => rest
    );
    res.json(result);
  }
);

app.post(
  '/api/exam/submit',
  (
    req: Request<
      object,
      object,
      ExamSubmitPayload & { subjectName?: string }
    >,
    res: Response
  ) => {
    const { subject, answers, timeUsed, subjectName } = req.body;

    const allQuestions = readJSON<Question[]>(QUESTIONS_FILE);
    const subjectQuestions = allQuestions.filter((q) => q.subject === subject);

    if (subjectQuestions.length === 0) {
      res.status(404).json({ error: '科目不存在' });
      return;
    }

    const questionMap = new Map<string, Question>();
    subjectQuestions.forEach((q) => questionMap.set(q.id, q));

    const evaluatedAnswers: ExamAnswer[] = answers.map((a) => {
      const q = questionMap.get(a.questionId);
      if (!q) {
        return { questionId: a.questionId, answer: a.answer, isCorrect: false };
      }
      return {
        questionId: a.questionId,
        answer: a.answer,
        isCorrect: a.answer === q.correctAnswer,
      };
    });

    const correctCount = evaluatedAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = subjectQuestions.length;
    const totalScore = Math.round((correctCount / totalQuestions) * 100);

    const categoryStats: Record<
      QuestionCategory,
      { total: number; correct: number }
    > = {
      基础: { total: 0, correct: 0 },
      逻辑分析: { total: 0, correct: 0 },
      代码理解: { total: 0, correct: 0 },
      安全规范: { total: 0, correct: 0 },
      项目管理: { total: 0, correct: 0 },
    };

    subjectQuestions.forEach((q) => {
      categoryStats[q.category].total++;
      const ans = evaluatedAnswers.find((a) => a.questionId === q.id);
      if (ans?.isCorrect) {
        categoryStats[q.category].correct++;
      }
    });

    const categoryScores = {} as Record<QuestionCategory, number>;
    CATEGORIES.forEach((cat) => {
      const s = categoryStats[cat];
      categoryScores[cat] =
        s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100);
    });

    const suggestions = generateSuggestions(categoryScores);

    const record: ExamRecord = {
      id: uuidv4(),
      subject,
      subjectName: subjectName || subject,
      date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      totalScore,
      totalQuestions,
      correctCount,
      timeUsed,
      answers: evaluatedAnswers,
      categoryScores,
      suggestions,
    };

    const records = readJSON<ExamRecord[]>(RECORDS_FILE);
    records.unshift(record);
    writeJSON(RECORDS_FILE, records);

    const fullResult = {
      ...record,
      questions: subjectQuestions,
    };

    res.json(fullResult);
  }
);

app.get(
  '/api/exam/:examId',
  (req: Request<{ examId: string }>, res: Response) => {
    const { examId } = req.params;
    const records = readJSON<ExamRecord[]>(RECORDS_FILE);
    const record = records.find((r) => r.id === examId);

    if (!record) {
      res.status(404).json({ error: '考试记录不存在' });
      return;
    }

    const allQuestions = readJSON<Question[]>(QUESTIONS_FILE);
    const subjectQuestions = allQuestions.filter(
      (q) => q.subject === record.subject
    );

    res.json({ ...record, questions: subjectQuestions });
  }
);

app.get('/api/history', (_req: Request, res: Response) => {
  const records = readJSON<ExamRecord[]>(RECORDS_FILE);
  const simplified = records.slice(0, 10).map(
    ({ answers, categoryScores, suggestions, ...rest }) => rest
  );
  res.json(simplified);
});

app.get('/api/admin/scores', (_req: Request, res: Response) => {
  const records = readJSON<ExamRecord[]>(RECORDS_FILE);
  const data = records.map((r) => ({
    id: r.id,
    date: r.date,
    subject: r.subjectName,
    totalScore: r.totalScore,
    correctCount: r.correctCount,
    totalQuestions: r.totalQuestions,
    timeUsed: formatTime(r.timeUsed),
    pass: r.totalScore >= 60 ? '是' : '否',
  }));
  res.json(data);
});

app.post(
  '/api/admin/questions',
  (
    req: Request<
      object,
      object,
      {
        text: string;
        options: string[];
        correctAnswer: number;
        subject: string;
        category: QuestionCategory;
        explanation: string;
      }
    >,
    res: Response
  ) => {
    const { text, options, correctAnswer, subject, category, explanation } =
      req.body;

    if (
      !text ||
      !options ||
      options.length !== 4 ||
      typeof correctAnswer !== 'number' ||
      correctAnswer < 0 ||
      correctAnswer > 3 ||
      !subject ||
      !category ||
      !explanation
    ) {
      res.status(400).json({ error: '参数不完整或格式错误' });
      return;
    }

    const subjects = readJSON<Subject[]>(SUBJECTS_FILE);
    if (!subjects.some((s) => s.id === subject)) {
      res.status(400).json({ error: '科目不存在' });
      return;
    }

    const questions = readJSON<Question[]>(QUESTIONS_FILE);
    const newQ: Question = {
      id: `q-${uuidv4()}`,
      subject,
      text,
      options,
      correctAnswer,
      category,
      explanation,
    };
    questions.push(newQ);
    writeJSON(QUESTIONS_FILE, questions);

    res.json({ success: true, id: newQ.id });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
});

export default app;
