import express, { Request, Response } from 'express';
import {
  Question,
  KNOWLEDGE_TAGS,
  getQuestionsByFilter,
  getBalancedQuestions,
  QUESTION_BANK,
} from './mock-data.js';

const app = express();
const PORT = 3002;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

interface AnswerSubmission {
  questionId: string;
  userAnswer: number;
  timeSpent: number;
}

interface QuizResult {
  questionId: string;
  correct: boolean;
  correctAnswer: number;
  userAnswer: number;
  explanation: string;
  knowledgeTag: string;
  difficulty: number;
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', ts: Date.now(), total: QUESTION_BANK.length });
});

app.get('/api/tags', (req: Request, res: Response) => {
  const stats = KNOWLEDGE_TAGS.map(tag => ({
    tag,
    total: QUESTION_BANK.filter(q => q.knowledgeTag === tag).length,
    byDifficulty: {
      1: QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === 1).length,
      2: QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === 2).length,
      3: QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === 3).length,
    },
  }));
  res.json({ tags: stats });
});

app.get('/api/questions', (req: Request, res: Response) => {
  const { tags, difficulties, limit, random, balanced } = req.query;
  try {
    const tagList = tags ? String(tags).split(',').filter(Boolean) : undefined;
    const diffList = difficulties
      ? (String(difficulties).split(',').map(Number).filter(d => d === 1 || d === 2 || d === 3) as (1 | 2 | 3)[])
      : undefined;
    const lim = limit ? Number(limit) : undefined;
    const isRandom = random === 'true' || random === '1';
    let result: Question[];
    if (balanced === 'true' || balanced === '1') {
      const count = lim || 10;
      result = getBalancedQuestions(count);
    } else {
      result = getQuestionsByFilter({
        tags: tagList,
        difficulties: diffList,
        limit: lim,
        random: isRandom,
      });
    }
    res.json({
      count: result.length,
      questions: result.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        knowledgeTag: q.knowledgeTag,
        difficulty: q.difficulty,
      })),
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/quiz/submit', (req: Request, res: Response) => {
  try {
    const { answers } = req.body as { answers: AnswerSubmission[] };
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers数组必填' });
    }
    const results: QuizResult[] = [];
    let correctCount = 0;
    let totalTime = 0;
    const tagStats: Record<string, { total: number; correct: number }> = {};
    answers.forEach(a => {
      const q = QUESTION_BANK.find(q => q.id === a.questionId);
      if (!q) return;
      const correct = a.userAnswer === q.correctAnswer;
      if (correct) correctCount++;
      totalTime += a.timeSpent || 0;
      if (!tagStats[q.knowledgeTag]) tagStats[q.knowledgeTag] = { total: 0, correct: 0 };
      tagStats[q.knowledgeTag].total++;
      if (correct) tagStats[q.knowledgeTag].correct++;
      results.push({
        questionId: q.id,
        correct,
        correctAnswer: q.correctAnswer,
        userAnswer: a.userAnswer,
        explanation: q.explanation,
        knowledgeTag: q.knowledgeTag,
        difficulty: q.difficulty,
      });
    });
    const byKnowledge: Array<{
      tag: string;
      total: number;
      correct: number;
      rate: number;
    }> = Object.entries(tagStats).map(([tag, s]) => ({
      tag,
      total: s.total,
      correct: s.correct,
      rate: s.total > 0 ? s.correct / s.total : 0,
    }));
    const byDifficulty: Record<number, { total: number; correct: number; rate: number }> = { 1: { total: 0, correct: 0, rate: 0 }, 2: { total: 0, correct: 0, rate: 0 }, 3: { total: 0, correct: 0, rate: 0 } };
    results.forEach(r => {
      const d = r.difficulty;
      byDifficulty[d].total++;
      if (r.correct) byDifficulty[d].correct++;
    });
    Object.keys(byDifficulty).forEach(k => {
      const key = Number(k);
      const v = byDifficulty[key];
      v.rate = v.total > 0 ? v.correct / v.total : 0;
    });
    const wrongIds = results.filter(r => !r.correct).map(r => r.questionId);
    const wrongQuestions = QUESTION_BANK.filter(q => wrongIds.includes(q.id));
    res.json({
      total: answers.length,
      correctCount,
      accuracy: answers.length > 0 ? correctCount / answers.length : 0,
      totalTime,
      avgTimePerQuestion: answers.length > 0 ? totalTime / answers.length : 0,
      results,
      byKnowledge,
      byDifficulty,
      wrongQuestions,
      weakTags: byKnowledge
        .filter(s => s.rate < 0.6)
        .sort((a, b) => a.rate - b.rate)
        .map(s => s.tag),
      simulatedAvg: {
        overall: 0.68 + Math.random() * 0.08,
        byKnowledge: byKnowledge.map(s => ({
          tag: s.tag,
          rate: 0.55 + Math.random() * 0.3,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/analysis/report', (req: Request, res: Response) => {
  try {
    const { history } = req.body as {
      history?: Array<{ questionId: string; userAnswer: number; correct: boolean }>;
    };
    const sampleHistory = history && history.length ? history : [];
    const tagStats: Record<string, { total: number; correct: number; ids: string[] }> = {};
    sampleHistory.forEach(h => {
      const q = QUESTION_BANK.find(q => q.id === h.questionId);
      if (!q) return;
      if (!tagStats[q.knowledgeTag]) tagStats[q.knowledgeTag] = { total: 0, correct: 0, ids: [] };
      tagStats[q.knowledgeTag].total++;
      if (h.correct) tagStats[q.knowledgeTag].correct++;
      if (!h.correct) tagStats[q.knowledgeTag].ids.push(q.id);
    });
    if (!Object.keys(tagStats).length) {
      KNOWLEDGE_TAGS.forEach(tag => {
        const total = 8 + Math.floor(Math.random() * 10);
        const correct = Math.floor(total * (0.3 + Math.random() * 0.7));
        tagStats[tag] = {
          total,
          correct,
          ids: [],
        };
      });
    }
    const knowledgeAnalysis = Object.entries(tagStats).map(([tag, s]) => ({
      tag,
      total: s.total,
      correct: s.correct,
      rate: s.total > 0 ? s.correct / s.total : 0,
      level: s.total > 0 && s.correct / s.total < 0.4
        ? 'critical'
        : s.total > 0 && s.correct / s.total < 0.6
        ? 'weak'
        : s.total > 0 && s.correct / s.total < 0.8
        ? 'medium'
        : 'strong',
      suggestion: s.total > 0 && s.correct / s.total < 0.6
        ? `建议对"${tag}"进行专项练习`
        : s.total > 0 && s.correct / s.total < 0.8
        ? `可适当复习"${tag}"相关知识点`
        : `"${tag}"掌握良好，保持`,
    }));
    res.json({
      overall: {
        total: Object.values(tagStats).reduce((s, t) => s + t.total, 0),
        correct: Object.values(tagStats).reduce((s, t) => s + t.correct, 0),
        rate: Object.values(tagStats).reduce((s, t) => s + t.total, 0) > 0
          ? Object.values(tagStats).reduce((s, t) => s + t.correct, 0) / Object.values(tagStats).reduce((s, t) => s + t.total, 0)
          : 0,
      },
      knowledgeAnalysis,
      radarData: {
        user: knowledgeAnalysis.map(a => ({ tag: a.tag, value: a.rate })),
        average: knowledgeAnalysis.map(() => ({ value: 0.6 + Math.random() * 0.25 })),
      },
      suggestions: [
        '建议优先练习薄弱知识点，逐个突破',
        '答对的题目也建议定期复习巩固',
        '合理使用错题本功能，针对性练习',
        '注意限时训练，提高答题速度',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`[Quiz Server] 运行在 http://localhost:${PORT}`);
  console.log(`[Quiz Server] 题库总量: ${QUESTION_BANK.length} 题`);
  console.log(`[Quiz Server] 知识点覆盖: ${KNOWLEDGE_TAGS.length} 个`);
});

export default app;
