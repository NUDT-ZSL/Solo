import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Question {
  id: string;
  description: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  createdAt: number;
}

interface AnswerDetail {
  questionId: string;
  questionDescription: string;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
}

interface QuizRecord {
  id: string;
  studentName: string;
  answers: AnswerDetail[];
  score: number;
  totalQuestions: number;
  duration: number;
  submittedAt: number;
}

interface MemoryStore {
  questions: Map<string, Question>;
  quizRecords: QuizRecord[];
}

const store: MemoryStore = {
  questions: new Map(),
  quizRecords: [],
};

const seedQuestions: Question[] = [
  {
    id: uuidv4(),
    description: 'JavaScript 中，以下哪个是基本数据类型？',
    options: {
      A: 'Array',
      B: 'String',
      C: 'Object',
      D: 'Function',
    },
    correctAnswer: 'B',
    explanation: 'JavaScript 的基本数据类型包括：String、Number、Boolean、Null、Undefined、Symbol、BigInt。Array、Object、Function 都是引用类型。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: '下列哪个 CSS 属性用于设置元素的外边距？',
    options: {
      A: 'padding',
      B: 'border',
      C: 'margin',
      D: 'spacing',
    },
    correctAnswer: 'C',
    explanation: 'margin 属性用于设置元素的外边距，padding 用于内边距，border 用于边框。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: 'React 中，用于管理组件内部状态的 Hook 是？',
    options: {
      A: 'useEffect',
      B: 'useState',
      C: 'useContext',
      D: 'useRef',
    },
    correctAnswer: 'B',
    explanation: 'useState 是 React 中用于在函数组件中添加状态管理的 Hook。useEffect 用于副作用处理，useContext 用于上下文，useRef 用于引用。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: 'HTTP 状态码 404 表示什么？',
    options: {
      A: '服务器内部错误',
      B: '请求成功',
      C: '资源未找到',
      D: '请求被重定向',
    },
    correctAnswer: 'C',
    explanation: '404 Not Found 表示服务器无法找到请求的资源。500 表示服务器内部错误，200 表示请求成功，3xx 表示重定向。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: 'TypeScript 中，哪个关键字用于定义接口？',
    options: {
      A: 'class',
      B: 'type',
      C: 'interface',
      D: 'struct',
    },
    correctAnswer: 'C',
    explanation: 'interface 关键字用于定义接口结构。class 用于类，type 用于类型别名，TypeScript 中没有 struct 关键字。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: '以下哪个不是 JavaScript 的循环语句？',
    options: {
      A: 'for',
      B: 'while',
      C: 'foreach',
      D: 'do...while',
    },
    correctAnswer: 'C',
    explanation: 'JavaScript 中没有 foreach 关键字（注意是 forEach 方法）。正确的循环语句有 for、while、do...while、for...in、for...of。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: 'Git 中用于查看提交历史的命令是？',
    options: {
      A: 'git status',
      B: 'git log',
      C: 'git diff',
      D: 'git show',
    },
    correctAnswer: 'B',
    explanation: 'git log 用于查看提交历史。git status 查看工作区状态，git diff 查看差异，git show 查看某次提交的详情。',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    description: 'Node.js 中用于读取文件的模块是？',
    options: {
      A: 'path',
      B: 'http',
      C: 'fs',
      D: 'os',
    },
    correctAnswer: 'C',
    explanation: 'fs (File System) 模块提供文件操作功能。path 用于路径处理，http 用于创建 HTTP 服务，os 用于操作系统信息。',
    createdAt: Date.now(),
  },
];

seedQuestions.forEach((q) => store.questions.set(q.id, q));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.get('/api/questions', (_req: Request, res: Response) => {
  const questions = Array.from(store.questions.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  res.json(questions);
});

app.get('/api/questions/random', (req: Request, res: Response) => {
  const count = parseInt((req.query.count as string) || '5', 10);
  const all = Array.from(store.questions.values());
  if (all.length === 0) {
    res.json([]);
    return;
  }
  const shuffled = fisherYatesShuffle(all);
  const result = shuffled.slice(0, Math.min(count, shuffled.length));
  res.json(result);
});

app.get('/api/questions/:id', (req: Request, res: Response) => {
  const question = store.questions.get(req.params.id);
  if (!question) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  res.json(question);
});

app.post('/api/questions', (req: Request, res: Response) => {
  const { description, options, correctAnswer, explanation } = req.body;
  if (!description || !options || !correctAnswer || !explanation) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const id = uuidv4();
  const question: Question = {
    id,
    description,
    options,
    correctAnswer,
    explanation,
    createdAt: Date.now(),
  };
  store.questions.set(id, question);
  res.status(201).json(question);
});

app.put('/api/questions/:id', (req: Request, res: Response) => {
  const existing = store.questions.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  const { description, options, correctAnswer, explanation } = req.body;
  const updated: Question = {
    ...existing,
    description: description ?? existing.description,
    options: options ?? existing.options,
    correctAnswer: correctAnswer ?? existing.correctAnswer,
    explanation: explanation ?? existing.explanation,
  };
  store.questions.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/questions/:id', (req: Request, res: Response) => {
  if (!store.questions.has(req.params.id)) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  store.questions.delete(req.params.id);
  res.status(204).send();
});

app.get('/api/answers', (_req: Request, res: Response) => {
  const sorted = [...store.quizRecords].sort((a, b) => b.submittedAt - a.submittedAt);
  res.json(sorted);
});

app.get('/api/answers/:studentName', (req: Request, res: Response) => {
  const filtered = store.quizRecords
    .filter((r) => r.studentName === req.params.studentName)
    .sort((a, b) => b.submittedAt - a.submittedAt);
  res.json(filtered);
});

app.post('/api/answers', (req: Request, res: Response) => {
  const { studentName, answers, score, totalQuestions, duration } = req.body;
  if (!studentName || !answers || typeof score !== 'number') {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const record: QuizRecord = {
    id: uuidv4(),
    studentName,
    answers,
    score,
    totalQuestions,
    duration: duration ?? 0,
    submittedAt: Date.now(),
  };
  store.quizRecords.push(record);
  res.status(201).json(record);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
