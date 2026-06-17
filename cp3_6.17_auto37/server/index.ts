import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { Question, Subject, ExamResult } from '../src/types';

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');

const readJsonFile = <T>(filename: string): T => {
  const filePath = path.join(DATA_DIR, filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJsonFile = <T>(filename: string, data: T): void => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const KNOWLEDGE_POINTS = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'] as const;
type KnowledgePoint = typeof KNOWLEDGE_POINTS[number];

const generateSuggestions = (knowledgeScores: Record<string, number>): string[] => {
  const suggestions: string[] = [];
  const sorted = Object.entries(knowledgeScores).sort((a, b) => a[1] - b[1]);
  const weakPoints = sorted.filter(([, score]) => score < 70);

  if (weakPoints.length > 0) {
    suggestions.push(`建议加强${weakPoints[0][0]}类题目的练习，该知识点正确率较低`);
  }

  if (sorted[0][1] < 60) {
    suggestions.push(`${sorted[0][0]}是您的薄弱环节，建议系统学习相关基础知识后再进行练习`);
  } else if (sorted[0][1] < 80) {
    suggestions.push(`可以通过做更多${sorted[0][0]}的专项练习来提升该知识点的掌握程度`);
  }

  const avgScore = Object.values(knowledgeScores).reduce((a, b) => a + b, 0) / Object.values(knowledgeScores).length;
  if (avgScore >= 80) {
    suggestions.push('整体掌握情况良好，建议多做综合练习题提升应试能力');
  } else if (avgScore >= 60) {
    suggestions.push('建议制定学习计划，针对薄弱知识点进行专项突破');
  } else {
    suggestions.push('建议先夯实基础知识，再逐步提高题目难度');
  }

  return suggestions.slice(0, 3);
};

app.get('/api/subjects', (_req, res) => {
  try {
    const subjects = readJsonFile<Subject[]>('subjects.json');
    res.json(subjects);
  } catch (error) {
    console.error('获取科目列表失败:', error);
    res.status(500).json({ error: '获取科目列表失败' });
  }
});

app.get('/api/questions', (req, res) => {
  try {
    const subject = req.query.subject as string;
    const allQuestions = readJsonFile<Question[]>('questions.json');
    let questions = allQuestions;

    if (subject) {
      questions = allQuestions.filter(q => q.subject === subject);
    }

    res.json(questions);
  } catch (error) {
    console.error('获取题目失败:', error);
    res.status(500).json({ error: '获取题目失败' });
  }
});

app.post('/api/questions', (req, res) => {
  try {
    const questionData = req.body as Omit<Question, 'id'>;
    const allQuestions = readJsonFile<Question[]>('questions.json');

    const newQuestion: Question = {
      ...questionData,
      id: uuidv4(),
    };

    allQuestions.push(newQuestion);
    writeJsonFile('questions.json', allQuestions);

    res.json(newQuestion);
  } catch (error) {
    console.error('添加题目失败:', error);
    res.status(500).json({ error: '添加题目失败' });
  }
});

app.post('/api/exam/submit', (req, res) => {
  try {
    const { questions, answers, timeUsed } = req.body as {
      questions: Question[];
      answers: [string, number][];
      timeUsed: number;
    };

    const answerMap = new Map(answers);
    const subjectName = questions[0]?.subject || '';

    const subjects = readJsonFile<Subject[]>('subjects.json');
    const subject = subjects.find(s => s.id === subjectName);

    const results = questions.map(q => {
      const selected = answerMap.get(q.id);
      const correct = selected === q.correctAnswer;
      return {
        questionId: q.id,
        selected: selected ?? -1,
        correct,
      };
    });

    const correctCount = results.filter(r => r.correct).length;
    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    const wrongAnswers = results
      .filter(r => !r.correct && r.selected !== -1)
      .map(r => {
        const question = questions.find(q => q.id === r.questionId)!;
        return {
          question,
          selected: r.selected,
        };
      });

    const knowledgeStats: Record<KnowledgePoint, { correct: number; total: number }> = {} as any;
    for (const kp of KNOWLEDGE_POINTS) {
      knowledgeStats[kp] = { correct: 0, total: 0 };
    }

    results.forEach((r, index) => {
      const question = questions[index];
      if (question && knowledgeStats[question.knowledgePoint]) {
        knowledgeStats[question.knowledgePoint].total++;
        if (r.correct) {
          knowledgeStats[question.knowledgePoint].correct++;
        }
      }
    });

    const knowledgeScores: Record<string, number> = {};
    for (const kp of KNOWLEDGE_POINTS) {
      const stat = knowledgeStats[kp];
      knowledgeScores[kp] = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 100;
    }

    const suggestions = generateSuggestions(knowledgeScores);

    const examResult: ExamResult = {
      id: uuidv4(),
      examId: uuidv4(),
      subject: subject?.name || subjectName,
      score,
      totalQuestions,
      correctCount,
      timeUsed,
      answers: results,
      wrongAnswers,
      knowledgeScores,
      suggestions,
      createdAt: dayjs().toISOString(),
    };

    const allResults = readJsonFile<ExamResult[]>('results.json');
    allResults.unshift(examResult);
    writeJsonFile('results.json', allResults);

    res.json(examResult);
  } catch (error) {
    console.error('提交考试失败:', error);
    res.status(500).json({ error: '提交考试失败' });
  }
});

app.get('/api/results', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 0;
    const allResults = readJsonFile<ExamResult[]>('results.json');

    let results = allResults;
    if (limit > 0) {
      results = allResults.slice(0, limit);
    }

    res.json(results);
  } catch (error) {
    console.error('获取成绩列表失败:', error);
    res.status(500).json({ error: '获取成绩列表失败' });
  }
});

app.get('/api/results/:id', (req, res) => {
  try {
    const id = req.params.id;
    const allResults = readJsonFile<ExamResult[]>('results.json');
    const result = allResults.find(r => r.id === id || r.examId === id);

    if (!result) {
      res.status(404).json({ error: '未找到考试结果' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('获取成绩详情失败:', error);
    res.status(500).json({ error: '获取成绩详情失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
