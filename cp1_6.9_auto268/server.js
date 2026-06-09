import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let riddles = [];

const seedRiddles = [
  {
    id: uuidv4(),
    question: '什么东西越洗越脏？',
    answer: '水',
    thanks: '谢谢你猜到了，愿你的心如清水般澄澈！',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '什么东西有头无脚却能走遍天下？',
    answer: '邮票',
    thanks: '答对啦！希望你的旅程也像邮票一样精彩。',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '黑夜中的精灵，提着小灯笼。',
    answer: '萤火虫',
    thanks: '找到我了！愿你也像萤火虫一样发光。',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '千条线万条线，落到水里看不见。',
    answer: '雨',
    thanks: '你感受到雨的温柔了吗？',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '白色的花从天降，落在手心就融化。',
    answer: '雪',
    thanks: '愿你的心像初雪一样纯净。',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '一座桥，地上架，走着上去坐着下。',
    answer: '滑梯',
    thanks: '童年的快乐你还记得吗？',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '圆身子，红脸蛋，咬一口，脆又甜。',
    answer: '苹果',
    thanks: '愿你平安喜乐，生活甜美！',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    question: '小小诸葛亮，独坐中军帐，摆下八卦阵，专捉飞来将。',
    answer: '蜘蛛',
    thanks: '聪明如你，定能识破一切迷局！',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  },
];

riddles = [...seedRiddles];

app.get('/api/riddles', (req, res) => {
  res.json(riddles);
});

app.get('/api/riddles/:id', (req, res) => {
  const riddle = riddles.find((r) => r.id === req.params.id);
  if (!riddle) {
    return res.status(404).json({ error: '谜语不存在' });
  }
  res.json(riddle);
});

app.post('/api/riddles', (req, res) => {
  const { question, answer, thanks } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: '谜面和谜底不能为空' });
  }

  if (question.length > 60) {
    return res.status(400).json({ error: '谜面不能超过60字' });
  }

  if (answer.length > 20) {
    return res.status(400).json({ error: '谜底不能超过20字' });
  }

  if (thanks && thanks.length > 30) {
    return res.status(400).json({ error: '答谢便签不能超过30字' });
  }

  const newRiddle = {
    id: uuidv4(),
    question: question.trim(),
    answer: answer.trim(),
    thanks: thanks ? thanks.trim() : '',
    attempts: 0,
    correctCount: 0,
    solved: false,
    createdAt: Date.now(),
  };

  riddles.unshift(newRiddle);
  res.status(201).json(newRiddle);
});

app.post('/api/riddles/attempt/:id', (req, res) => {
  const riddle = riddles.find((r) => r.id === req.params.id);
  if (!riddle) {
    return res.status(404).json({ error: '谜语不存在' });
  }

  const { guess } = req.body;
  if (!guess) {
    return res.status(400).json({ error: '请输入答案' });
  }

  riddle.attempts += 1;

  const isCorrect =
    guess.trim().toLowerCase() === riddle.answer.trim().toLowerCase();

  if (isCorrect) {
    riddle.correctCount += 1;
    riddle.solved = true;
    res.json({ correct: true, thanks: riddle.thanks });
  } else {
    res.json({ correct: false });
  }
});

app.listen(PORT, () => {
  console.log(`谜语剧场后端服务已启动: http://localhost:${PORT}`);
});
