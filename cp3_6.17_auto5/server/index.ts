import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Subject,
  Question,
  ExamResult,
  SubmitExamRequest,
  ExamAnswer,
  WrongQuestion,
  DimensionScores,
  QuestionCategory,
} from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = __dirname;
const SUBJECTS_FILE = resolve(DATA_DIR, 'subjects.json');
const QUESTIONS_FILE = resolve(DATA_DIR, 'questions.json');
const RESULTS_FILE = resolve(DATA_DIR, 'results.json');

const CATEGORIES: QuestionCategory[] = [
  '基础知识',
  '逻辑分析',
  '代码理解',
  '安全规范',
  '项目管理',
];

const SUGGESTION_TEMPLATES: Record<QuestionCategory, string> = {
  '基础知识': '建议加强「基础知识」的学习，重点复习核心概念和基础语法，多做基础练习题巩固记忆。',
  '逻辑分析': '建议强化「逻辑分析」能力，多做算法题和逻辑推理题，培养系统化的思维方式。',
  '代码理解': '建议提升「代码理解」能力，多阅读优秀开源代码，尝试分析不同代码片段的执行流程。',
  '安全规范': '建议重视「安全规范」，学习常见的安全漏洞原理和防护措施，养成安全编码习惯。',
  '项目管理': '建议补充「项目管理」知识，熟悉项目管理流程和工具，理解敏捷开发方法论。',
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [] as unknown as T;
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/subjects', async (_req, res) => {
  try {
    const subjects = await readJsonFile<Subject[]>(SUBJECTS_FILE);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: '读取科目列表失败' });
  }
});

app.get('/api/questions/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const questions = await readJsonFile<Question[]>(QUESTIONS_FILE);
    const subjectQuestions = questions.filter((q) => q.subjectId === subjectId);
    res.json(subjectQuestions);
  } catch (error) {
    res.status(500).json({ error: '读取题目列表失败' });
  }
});

app.post('/api/submit-exam', async (req, res) => {
  try {
    const { subjectId, answers, timeUsed } = req.body as SubmitExamRequest;

    if (!subjectId || !Array.isArray(answers)) {
      res.status(400).json({ error: '请求参数不完整' });
      return;
    }

    const subjects = await readJsonFile<Subject[]>(SUBJECTS_FILE);
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) {
      res.status(404).json({ error: '科目不存在' });
      return;
    }

    const questions = await readJsonFile<Question[]>(QUESTIONS_FILE);
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const examAnswers: ExamAnswer[] = [];
    const wrongQuestions: WrongQuestion[] = [];
    let correctCount = 0;

    const categoryTotal = new Map<QuestionCategory, number>();
    const categoryCorrect = new Map<QuestionCategory, number>();

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === answer.selectedAnswer;

      examAnswers.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
      });

      if (isCorrect) {
        correctCount++;
        categoryCorrect.set(
          question.category,
          (categoryCorrect.get(question.category) || 0) + 1
        );
      } else {
        wrongQuestions.push({
          question,
          userAnswer: answer.selectedAnswer,
        });
      }

      categoryTotal.set(
        question.category,
        (categoryTotal.get(question.category) || 0) + 1
      );
    }

    const dimensionScores: DimensionScores = {
      '基础知识': 0,
      '逻辑分析': 0,
      '代码理解': 0,
      '安全规范': 0,
      '项目管理': 0,
    };

    for (const category of CATEGORIES) {
      const total = categoryTotal.get(category) || 0;
      const correct = categoryCorrect.get(category) || 0;
      dimensionScores[category] = total > 0 ? Math.round((correct / total) * 100) : 0;
    }

    const sortedCategories = [...CATEGORIES].sort(
      (a, b) => dimensionScores[a] - dimensionScores[b]
    );
    const lowestCategories = sortedCategories.slice(0, 3);
    const suggestions = lowestCategories.map(
      (category) => SUGGESTION_TEMPLATES[category]
    );

    const score = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

    const result: ExamResult = {
      id: uuidv4(),
      subjectId,
      subjectName: subject.name,
      score,
      totalQuestions: answers.length,
      correctCount,
      timeUsed,
      answers: examAnswers,
      wrongQuestions,
      dimensionScores,
      suggestions,
      examDate: dayjs().toISOString(),
    };

    const results = await readJsonFile<ExamResult[]>(RESULTS_FILE);
    results.push(result);
    await writeJsonFile(RESULTS_FILE, results);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '批改考试失败' });
  }
});

app.get('/api/results', async (_req, res) => {
  try {
    const results = await readJsonFile<ExamResult[]>(RESULTS_FILE);
    const sorted = results
      .sort((a, b) => dayjs(b.examDate).valueOf() - dayjs(a.examDate).valueOf())
      .slice(0, 10);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: '读取成绩列表失败' });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const results = await readJsonFile<ExamResult[]>(RESULTS_FILE);
    const result = results.find((r) => r.id === id);
    if (!result) {
      res.status(404).json({ error: '成绩不存在' });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '读取成绩失败' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const questionData = req.body as Omit<Question, 'id'>;

    if (
      !questionData.subjectId ||
      !questionData.text ||
      !Array.isArray(questionData.options) ||
      questionData.correctAnswer === undefined ||
      !questionData.category ||
      !questionData.explanation
    ) {
      res.status(400).json({ error: '题目数据不完整' });
      return;
    }

    const questions = await readJsonFile<Question[]>(QUESTIONS_FILE);
    const newQuestion: Question = {
      id: uuidv4(),
      ...questionData,
    };
    questions.push(newQuestion);
    await writeJsonFile(QUESTIONS_FILE, questions);

    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: '添加题目失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
