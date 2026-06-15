import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  timestamp: number;
}

interface ScoreResult {
  pronunciation: number;
  grammar: number;
  fluency: number;
  suggestions: {
    pronunciation: string;
    grammar: string;
    fluency: string;
  };
  overallScore: number;
}

interface CommonError {
  type: 'pronunciation' | 'grammar' | 'vocabulary';
  original: string;
  correction: string;
  suggestion: string;
}

interface WordStat {
  word: string;
  count: number;
}

interface Session {
  id: string;
  topicId: string;
  messages: ChatMessage[];
  scores: ScoreResult[];
  errors: CommonError[];
  allUserText: string;
  usedQuestions: string[];
  createdAt: number;
}

const sessions: Map<string, Session> = new Map();

const TOPICS = {
  restaurant: {
    name: '餐厅点餐',
    keywords: ['menu', 'order', 'reservation', 'table', 'food', 'drink', 'bill', 'waiter', 'chef', 'special', 'dish', 'meal', 'drinks', 'water', 'wine', 'dessert', 'appetizer'],
    followUps: [
      "Would you like to hear about today's chef specials?",
      "How would you like your main course cooked?",
      "Can I get you any appetizers to start?",
      "Would you prefer still or sparkling water?",
      "Is there any dietary restriction I should know about?",
      "Can I recommend our signature dish for tonight?",
      "Would you like to see our wine list?"
    ]
  },
  travel: {
    name: '旅行问路',
    keywords: ['direction', 'map', 'station', 'hotel', 'ticket', 'airport', 'train', 'bus', 'left', 'right', 'street', 'avenue', 'walk', 'turn', 'taxi', 'subway', 'flight'],
    followUps: [
      "What brings you to this beautiful city?",
      "Would you like directions to the city center?",
      "Are you traveling alone or with your family?",
      "Would you like me to recommend any local restaurants?",
      "Have you booked your accommodation yet?",
      "Do you need help purchasing tickets?",
      "Is this your first time visiting our country?"
    ]
  },
  interview: {
    name: '求职面试',
    keywords: ['experience', 'skill', 'team', 'project', 'goal', 'company', 'position', 'salary', 'work', 'career', 'strength', 'weakness', 'challenge', 'success', 'management', 'leader'],
    followUps: [
      "Can you describe your ideal work environment?",
      "What motivates you to perform your best?",
      "Tell me about a time you resolved a conflict at work.",
      "What skills would you like to develop in the next year?",
      "How do you prioritize tasks when you have multiple deadlines?",
      "Why should we hire you over other candidates?",
      "What's your approach to working under pressure?"
    ]
  },
  shopping: {
    name: '购物逛街',
    keywords: ['price', 'size', 'color', 'discount', 'try', 'buy', 'payment', 'cash', 'card', 'return', 'fit', 'style', 'fashion', 'brand', 'quality', 'material'],
    followUps: [
      "Is this a gift for someone special?",
      "What's your favorite color for clothing?",
      "Have you shopped at our store before?",
      "Would you like to join our loyalty program for exclusive discounts?",
      "Are you looking for anything in particular today?",
      "We have new arrivals this season, would you like to see?",
      "What occasion are you shopping for?"
    ]
  },
  daily: {
    name: '日常聊天',
    keywords: ['weather', 'hobby', 'family', 'friend', 'weekend', 'movie', 'music', 'sport', 'food', 'travel', 'pets', 'hobbies', 'favorite', 'enjoy', 'relax', 'party'],
    followUps: [
      "What do you usually do after work or school?",
      "Do you have any pets at home?",
      "What's your favorite season and why?",
      "Are you a morning person or a night owl?",
      "What's the best piece of advice you've ever received?",
      "Do you like cooking or do you prefer eating out?",
      "What kind of movies do you enjoy watching?"
    ]
  },
  business: {
    name: '商务会议',
    keywords: ['meeting', 'project', 'budget', 'deadline', 'team', 'client', 'report', 'strategy', 'goal', 'agenda', 'quarter', 'revenue', 'growth', 'launch', 'investor', 'stakeholder'],
    followUps: [
      "What's your timeline for implementing this plan?",
      "How does this compare to last year's performance?",
      "What resources do you need to complete this project?",
      "Can we schedule a follow-up meeting next week?",
      "What are the potential obstacles we should anticipate?",
      "How do you propose we measure success?",
      "Who is the main point of contact for this initiative?"
    ]
  }
};

const GRAMMAR_RULES = [
  { pattern: /\b(i|you|he|she|it|we|they) is\b/gi, message: "注意主谓一致，例如 'I am' 而不是 'I is'", correction: (m: string) => m.replace(/is\b/i, m.match(/^I\b/i) ? 'am' : 'are') },
  { pattern: /\b(he|she|it) have\b/gi, message: "第三人称单数应使用 'has' 而非 'have'", correction: (m: string) => m.replace(/have\b/i, 'has') },
  { pattern: /\ba ([aeiou])/gi, message: "元音前应使用 'an' 而非 'a'", correction: (m: string) => m.replace(/^a\b/i, 'an') },
  { pattern: /\bi\b/g, message: "代词 'I' 应始终大写", correction: () => 'I' },
  { pattern: /\bmore better\b/gi, message: "'better' 已经是比较级，无需 'more'", correction: () => 'better' },
  { pattern: /\bmore +\w+er\b/gi, message: "-er 结尾的比较级无需再加 'more'", correction: (m: string) => m.replace(/^more\s+/i, '') }
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'literally', 'sort of', 'kind of'];

const PRONUNCIATION_TIPS = [
  '注意清辅音和浊辅音的区别，如 /p/ 和 /b/',
  '练习 "th" 音的正确发音，舌尖轻触上齿',
  '注意重读音节的位置，英语重音很重要',
  '练习长元音和短元音的区别，如 /iː/ 和 /ɪ/',
  '注意连读和弱读现象，让口语更自然',
  '练习词尾辅音，不要吞音',
  '注意双元音的饱满发音，如 /eɪ/ 和 /aʊ/'
];

const GRAMMAR_TIPS = [
  '注意时态的一致性，对话中不要随意切换时态',
  '记住规则动词过去式加 -ed，不规则动词需要专门记忆',
  '学习正确使用冠词 a, an, the',
  '介词 in, on, at 的用法需要多加练习',
  '句子结构要完整，包含主语和谓语',
  '注意名词单复数的变化',
  '学习正确的语序，英语陈述句通常是主语+谓语+宾语'
];

const FLUENCY_TIPS = [
  '尽量减少 "um", "uh" 等填充词的使用',
  '想不起来时用英语思考而非停顿',
  '可以练习固定表达和连接词，如 "Well...", "Actually..."',
  '大声朗读英文文章可以提升流利度',
  '尝试用自己的话复述听到的内容',
  '保持稳定的语速，不要太快也不要太慢',
  '学会用简单词汇表达复杂意思，避免卡壳'
];

function calculateScore(text: string, topicKeywords: string[] = []): ScoreResult {
  const cleaned = text.trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);

  let pronScore = 60;
  if (words.length >= 5) pronScore += 8;
  if (words.length >= 10) pronScore += 5;
  if (words.length >= 20) pronScore += 4;

  if (topicKeywords.length > 0) {
    const matched = topicKeywords.filter(kw =>
      words.some(w => w.toLowerCase().includes(kw.toLowerCase()))
    );
    const ratio = matched.length / Math.min(topicKeywords.length, 5);
    pronScore += Math.round(ratio * 8);
  }

  const avgLen = words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
  if (avgLen >= 4) pronScore += 5;
  if (avgLen >= 5) pronScore += 3;

  const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / (words.length || 1);
  pronScore += Math.round(uniqueRatio * 7);
  pronScore = Math.min(100, pronScore);

  let gramScore = 60;
  let errors = 0;
  for (const rule of GRAMMAR_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) errors += matches.length;
  }
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) errors += 0.5;
    if (trimmed.split(/\s+/).filter(w => w.length > 0).length < 2) errors += 0.5;
  }
  gramScore -= Math.round(errors * 4);
  if (sentences.length >= 2) gramScore += 8;
  if (sentences.length >= 3) gramScore += 5;
  if (/\b(and|but|or|because|so|although|while|when|if|however)\b/i.test(text)) gramScore += 7;
  if (/\b(that|which|who|whom|whose|where|when|why)\b/i.test(text)) gramScore += 5;
  if (/\bI\b/.test(text) ? text.match(/\bi\b/g) === null : true) gramScore += 5;
  gramScore = Math.max(0, Math.min(100, gramScore));

  let fluScore = 50;
  const fillerCount = FILLER_WORDS.reduce((c, f) => {
    const r = new RegExp(`\\b${f}\\b`, 'gi');
    return c + (text.match(r)?.length || 0);
  }, 0);
  const fillerRatio = words.length > 0 ? fillerCount / words.length : 0;
  if (fillerRatio === 0) fluScore += 20;
  else if (fillerRatio < 0.05) fluScore += 15;
  else if (fillerRatio < 0.1) fluScore += 10;
  else if (fillerRatio < 0.2) fluScore += 5;

  if (words.length >= 10) fluScore += 5;
  if (words.length >= 20) fluScore += 6;
  if (words.length >= 30) fluScore += 4;

  const wps = sentences.length > 0 ? words.length / sentences.length : 0;
  if (wps >= 5 && wps <= 15) fluScore += 8;
  else if (wps >= 4 && wps <= 20) fluScore += 5;

  if (/\b(first|second|then|next|finally|also|moreover|furthermore|in addition|as a result|therefore)\b/i.test(text)) fluScore += 7;
  fluScore = Math.min(100, fluScore);

  const overall = Math.round(pronScore * 0.35 + gramScore * 0.35 + fluScore * 0.3);

  const getTip = (tips: string[], score: number) => {
    let pool = tips;
    if (score >= 85) pool = ['表现很好！继续保持，注意细节可以更完美', '出色的表现！尝试使用更高级的词汇', '非常棒！可以练习更复杂的句子结构'];
    else if (score >= 70) pool = tips.slice(0, 5);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  return {
    pronunciation: pronScore,
    grammar: gramScore,
    fluency: fluScore,
    overallScore: overall,
    suggestions: {
      pronunciation: getTip(PRONUNCIATION_TIPS, pronScore),
      grammar: getTip(GRAMMAR_TIPS, gramScore),
      fluency: getTip(FLUENCY_TIPS, fluScore)
    }
  };
}

function detectErrors(text: string): CommonError[] {
  const errors: CommonError[] = [];
  for (const rule of GRAMMAR_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      for (const match of matches.slice(0, 2)) {
        errors.push({
          type: 'grammar',
          original: match,
          correction: typeof rule.correction === 'function' ? rule.correction(match) : match,
          suggestion: rule.message
        });
      }
    }
  }
  const fillerRegex = new RegExp(`\\b(${FILLER_WORDS.join('|')})\\b`, 'gi');
  const fillerMatches = text.match(fillerRegex);
  if (fillerMatches && fillerMatches.length >= 3) {
    errors.push({
      type: 'vocabulary',
      original: [...new Set(fillerMatches.map(f => f.toLowerCase()))].slice(0, 3).join(', '),
      correction: '(减少填充词)',
      suggestion: `检测到 ${fillerMatches.length} 个填充词，尝试用停顿或连接词代替`
    });
  }
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const shortOnes = sentences.filter(s => s.trim().split(/\s+/).filter(w => w.length > 0).length < 3);
  if (shortOnes.length >= 2) {
    errors.push({
      type: 'grammar',
      original: `${shortOnes.length} 个短句`,
      correction: '使用连接词合并句子',
      suggestion: '建议使用 and, but, so, because 等连接词组成更完整的句子'
    });
  }
  return errors.slice(0, 5);
}

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size
  });
});

app.get('/api/topics', (req: Request, res: Response) => {
  const topics = Object.entries(TOPICS).map(([id, data]) => ({
    id,
    name: data.name,
    keywords: data.keywords
  }));
  res.json({ topics });
});

app.post('/api/session/start', (req: Request, res: Response) => {
  const { topicId = 'daily' } = req.body;
  const sessionId = uuidv4();
  const session: Session = {
    id: sessionId,
    topicId,
    messages: [],
    scores: [],
    errors: [],
    allUserText: '',
    usedQuestions: [],
    createdAt: Date.now()
  };
  sessions.set(sessionId, session);
  res.json({ sessionId, topicId });
});

interface ScoreRequestBody {
  text: string;
  topicId?: string;
  sessionId?: string;
}

app.post('/api/score', (req: Request<{}, {}, ScoreRequestBody>, res: Response) => {
  const { text, topicId = 'daily', sessionId } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const topicData = TOPICS[topicId as keyof typeof TOPICS] || TOPICS.daily;
  const score = calculateScore(text, topicData.keywords);
  const errors = detectErrors(text);

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.scores.push(score);
    session.errors.push(...errors);
    session.allUserText += ' ' + text;
  }

  res.json({ score, errors });
});

interface ReportRequestBody {
  sessionId: string;
}

app.post('/api/report', (req: Request<{}, {}, ReportRequestBody>, res: Response) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'to', 'of', 'in', 'for', 'on', 'with',
    'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
    'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'and', 'but',
    'or', 'if', 'because', 'as', 'until', 'while', 'not', 'no', 'so', 'than', 'too', 'very', 'just']);

  const wordCounts: Record<string, number> = {};
  session.allUserText
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });

  const wordStats = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const scoreHistory = session.scores.map((s, i) => ({
    index: i + 1,
    overall: s.overallScore,
    pronunciation: s.pronunciation,
    grammar: s.grammar,
    fluency: s.fluency
  }));

  const overallAvg = session.scores.length > 0
    ? Math.round(session.scores.reduce((s, sc) => s + sc.overallScore, 0) / session.scores.length)
    : 0;

  res.json({
    errors: session.errors,
    wordStats,
    scoreHistory,
    overallAverage: overallAvg,
    messageCount: session.messages.length
  });
});

app.post('/api/upload', upload.single('audio'), (req: Request, res: Response) => {
  const { text, topicId = 'daily', sessionId } = req.body;
  const finalText = text || 'Demo speech recognition result. I would like to order some food please.';

  const topicData = TOPICS[topicId as keyof typeof TOPICS] || TOPICS.daily;
  const score = calculateScore(finalText, topicData.keywords);
  const errors = detectErrors(finalText);

  const available = topicData.followUps.filter(q =>
    !sessionId || !sessions.get(sessionId)?.usedQuestions.includes(q)
  );
  const pool = available.length > 0 ? available : topicData.followUps;
  const nextQuestion = pool[Math.floor(Math.random() * pool.length)];

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.scores.push(score);
    session.errors.push(...errors);
    session.allUserText += ' ' + finalText;
    session.usedQuestions.push(nextQuestion);
  }

  res.json({
    transcript: finalText,
    score,
    nextQuestion,
    errors
  });
});

io.on('connection', (socket) => {
  console.log('[Socket.io] Client connected:', socket.id);

  socket.on('start_session', (data: { topicId?: string }) => {
    const topicId = data.topicId || 'daily';
    const sessionId = uuidv4();
    const session: Session = {
      id: sessionId,
      topicId,
      messages: [],
      scores: [],
      errors: [],
      allUserText: '',
      usedQuestions: [],
      createdAt: Date.now()
    };
    sessions.set(sessionId, session);
    socket.data.sessionId = sessionId;
    socket.join(sessionId);
    socket.emit('session_started', { sessionId });
  });

  socket.on('submit_answer', (data: { text: string }) => {
    const sessionId = socket.data.sessionId;
    const session = sessions.get(sessionId);
    if (!session || !data.text) return;

    const topicData = TOPICS[session.topicId as keyof typeof TOPICS] || TOPICS.daily;
    const score = calculateScore(data.text, topicData.keywords);
    const errors = detectErrors(data.text);

    session.scores.push(score);
    session.errors.push(...errors);
    session.allUserText += ' ' + data.text;

    socket.emit('score_result', { score, errors });

    setTimeout(() => {
      const available = topicData.followUps.filter(q => !session.usedQuestions.includes(q));
      const pool = available.length > 0 ? available : topicData.followUps;
      const nextQuestion = pool[Math.floor(Math.random() * pool.length)];
      session.usedQuestions.push(nextQuestion);
      socket.emit('next_question', { question: nextQuestion });
    }, 2100);
  });

  socket.on('audio_chunk', (chunk: ArrayBuffer) => {
    // 实时音频块处理占位
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   🎤 英语口语陪练服务器已启动                          ║
╠══════════════════════════════════════════════════════╣
║   地址: http://localhost:${PORT}                        ║
║   健康检查: http://localhost:${PORT}/api/health          ║
║   Socket.io: 已启用                                     ║
║   支持: REST API + WebSocket 双模式                    ║
╚══════════════════════════════════════════════════════╝
  `);
});
