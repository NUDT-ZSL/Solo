import { Router, type Request, type Response, type NextFunction } from 'express';
import { questionModel, paperModel, submissionModel, analysisModel } from '../models/quizModel';
import { gradeQuestion } from '../utils/grader';
import { getCache, setCache, invalidateCache } from '../index';
import type { Difficulty, QuestionType, Question } from '../types';

class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function validateRequired(obj: Record<string, unknown>, fields: string[]): void {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
      throw new AppError(`Missing required field: ${f}`, 400);
    }
  }
}

export const paperRoutes = Router();

paperRoutes.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const { knowledgePoint, difficulty, type } = req.query as Record<string, string>;
    const filter: { knowledgePoint?: string; difficulty?: Difficulty; type?: QuestionType } = {};
    if (knowledgePoint) filter.knowledgePoint = knowledgePoint;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) filter.difficulty = difficulty as Difficulty;
    if (type && ['single', 'multiple', 'fill', 'essay'].includes(type)) filter.type = type as QuestionType;

    const cacheKey = `questions:${knowledgePoint || ''}:${difficulty || ''}:${type || ''}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const questions = await questionModel.list(filter);
    setCache(cacheKey, questions);
    res.json(questions);
  })
);

paperRoutes.get(
  '/questions/knowledge-points',
  asyncHandler(async (_req, res) => {
    const cacheKey = 'knowledge-points';
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const points = await questionModel.getKnowledgePoints();
    setCache(cacheKey, points);
    res.json(points);
  })
);

paperRoutes.get(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const question = await questionModel.getById(req.params.id);
    if (!question) throw new AppError('Question not found', 404);
    res.json(question);
  })
);

paperRoutes.post(
  '/questions',
  asyncHandler(async (req, res) => {
    const body = req.body;
    validateRequired(body, ['type', 'content', 'answer', 'knowledgePoint', 'difficulty']);

    if (!['single', 'multiple', 'fill', 'essay'].includes(body.type)) {
      throw new AppError('Invalid question type', 400);
    }
    if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
      throw new AppError('Invalid difficulty level', 400);
    }
    if ((body.type === 'single' || body.type === 'multiple') && (!body.options || body.options.length < 2)) {
      throw new AppError('Choice questions must have at least 2 options', 400);
    }
    if (body.type === 'essay' && (!body.keywords || body.keywords.length < 3)) {
      throw new AppError('Essay questions must have at least 3 keywords', 400);
    }

    const question = await questionModel.create(body as Omit<Question, 'id' | 'createdAt'>);
    invalidateCache('questions');
    invalidateCache('knowledge-points');
    res.status(201).json(question);
  })
);

paperRoutes.post(
  '/questions/bulk',
  asyncHandler(async (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new AppError('questions must be a non-empty array', 400);
    }
    for (const q of questions) {
      validateRequired(q, ['type', 'content', 'answer', 'knowledgePoint', 'difficulty']);
    }
    const created = await questionModel.bulkCreate(questions as Omit<Question, 'id' | 'createdAt'>[]);
    invalidateCache('questions');
    invalidateCache('knowledge-points');
    res.status(201).json(created);
  })
);

paperRoutes.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const deleted = await questionModel.delete(req.params.id);
    if (!deleted) throw new AppError('Question not found', 404);
    invalidateCache('questions');
    invalidateCache('knowledge-points');
    res.json({ success: true });
  })
);

paperRoutes.get(
  '/papers',
  asyncHandler(async (_req, res) => {
    const cacheKey = 'papers:list';
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const papers = await paperModel.list();
    setCache(cacheKey, papers);
    res.json(papers);
  })
);

paperRoutes.get(
  '/papers/:id',
  asyncHandler(async (req, res) => {
    const cacheKey = `papers:${req.params.id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const paper = await paperModel.getById(req.params.id);
    if (!paper) throw new AppError('Paper not found', 404);
    setCache(cacheKey, paper);
    res.json(paper);
  })
);

paperRoutes.post(
  '/papers/generate',
  asyncHandler(async (req, res) => {
    const body = req.body;
    validateRequired(body, ['title', 'selectedQuestionIds', 'duration', 'difficultyRatio']);

    if (!Array.isArray(body.selectedQuestionIds) || body.selectedQuestionIds.length === 0) {
      throw new AppError('selectedQuestionIds must be a non-empty array', 400);
    }
    if (typeof body.duration !== 'number' || body.duration <= 0) {
      throw new AppError('duration must be a positive number', 400);
    }
    const dr = body.difficultyRatio;
    if (!dr || typeof dr.easy !== 'number' || typeof dr.medium !== 'number' || typeof dr.hard !== 'number') {
      throw new AppError('difficultyRatio must have easy, medium, hard numeric fields', 400);
    }
    if (dr.easy + dr.medium + dr.hard <= 0) {
      throw new AppError('difficultyRatio sum must be greater than 0', 400);
    }

    const paper = await paperModel.create({
      title: body.title,
      selectedQuestionIds: body.selectedQuestionIds,
      duration: body.duration,
      difficultyRatio: body.difficultyRatio,
    });
    invalidateCache('papers');
    res.status(201).json(paper);
  })
);

paperRoutes.post(
  '/papers/:paperId/answers',
  asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const body = req.body;
    validateRequired(body, ['questionId', 'studentId', 'studentName', 'answer']);

    const paper = await paperModel.getById(paperId);
    if (!paper) throw new AppError('Paper not found', 404);
    if (!paper.questionIds.includes(body.questionId)) {
      throw new AppError('Question not in this paper', 400);
    }

    const question = await questionModel.getById(body.questionId);
    if (!question) throw new AppError('Question not found', 404);

    const gradeResult = gradeQuestion(question, body.answer);

    const record = await submissionModel.saveAnswer({
      paperId,
      questionId: body.questionId,
      studentId: body.studentId,
      studentName: body.studentName,
      answer: body.answer,
      score: gradeResult.score,
      isCorrect: gradeResult.isCorrect,
    });

    invalidateCache(`analysis:${paperId}`);
    res.json({ ...record, gradeDetails: gradeResult.details });
  })
);

paperRoutes.post(
  '/papers/:paperId/submit',
  asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const body = req.body;
    validateRequired(body, ['studentId', 'studentName', 'startedAt']);

    const paper = await paperModel.getById(paperId);
    if (!paper) throw new AppError('Paper not found', 404);

    const draftAnswers = await submissionModel.getDraftAnswers(paperId, body.studentId);
    const answers = draftAnswers.map((r) => ({
      questionId: r.questionId,
      answer: r.answer,
      score: r.score,
      isCorrect: r.isCorrect,
    }));

    const totalScore = answers.length > 0
      ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)
      : 0;

    const submission = await submissionModel.submit({
      paperId,
      studentId: body.studentId,
      studentName: body.studentName,
      answers,
      totalScore,
      totalQuestions: paper.questionIds.length,
      startedAt: body.startedAt,
    });

    invalidateCache(`analysis:${paperId}`);
    invalidateCache(`papers:${paperId}`);
    res.json(submission);
  })
);

paperRoutes.get(
  '/papers/:paperId/draft',
  asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const { studentId } = req.query as { studentId: string };
    if (!studentId) throw new AppError('studentId query parameter required', 400);

    const draftAnswers = await submissionModel.getDraftAnswers(paperId, studentId);
    res.json(draftAnswers);
  })
);

paperRoutes.get(
  '/papers/:paperId/analysis',
  asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const cacheKey = `analysis:${paperId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const analysis = await analysisModel.getPaperAnalysis(paperId);
    setCache(cacheKey, analysis);
    res.json(analysis);
  })
);

paperRoutes.get(
  '/papers/:paperId/submissions',
  asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const submissions = await submissionModel.listByPaper(paperId);
    res.json(submissions);
  })
);

paperRoutes.get(
  '/papers/:paperId/questions/:questionId/students',
  asyncHandler(async (req, res) => {
    const { paperId, questionId } = req.params;
    const records = await analysisModel.getStudentAnswersForQuestion(paperId, questionId);
    res.json(records);
  })
);
