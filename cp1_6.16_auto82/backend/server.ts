import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Sample {
  id: string;
  text: string;
  language: string;
  level: number;
  duration: number;
  phonemes: string[];
  features: number[][];
  audioUrl: string;
}

interface Recording {
  id: string;
  userId: string;
  sampleId: string;
  score: number;
  audioDuration: number;
  createdAt: string;
  phonemeScores: { phoneme: string; score: number }[];
}

const users: Record<string, { name: string; points: number; avatar: string }> = {
  'user-001': { name: '学习者', points: 1280, avatar: '👤' }
};

const calculateAudioDuration = (text: string, language: string, level: number): number => {
  let charCount = 0;
  if (language === 'en') {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    charCount = words.reduce((sum, w) => sum + w.length, 0);
    const charsPerSecond = 3.0 + (level - 1) * 0.5;
    const wordPauseCount = Math.max(0, words.length - 1);
    const pauseTime = wordPauseCount * 0.15;
    const baseDuration = charCount / charsPerSecond + pauseTime;
    return Number(Math.max(3, Math.min(15, baseDuration * 1.1 + 0.5)).toFixed(2));
  } else {
    const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || [];
    charCount = japaneseChars.length;
    const charsPerSecond = 2.5 + (level - 1) * 0.5;
    const punctuationCount = (text.match(/[、。！？，.]/g) || []).length;
    const pauseTime = punctuationCount * 0.2;
    const baseDuration = charCount / charsPerSecond + pauseTime;
    return Number(Math.max(3, Math.min(15, baseDuration * 1.1 + 0.5)).toFixed(2));
  }
};

const generateEnglishSamples = (level: number): Sample[] => {
  const samples: Sample[] = [];
  const levelTexts: Record<number, string[]> = {
    1: [
      'Hello, how are you today?',
      'I like to read books.',
      'The cat is on the mat.',
      'She has a red apple.',
      'We go to school every day.',
      'My name is John.',
      'It is a sunny day.',
      'I have two brothers.',
      'The dog runs fast.',
      'Can you help me?'
    ],
    2: [
      'The weather is beautiful this morning.',
      'I enjoy learning new languages every day.',
      'She was born in a small town.',
      'The restaurant serves delicious food.',
      'We should finish the project by Friday.',
      'He plays the piano very well.',
      'The movie was interesting and exciting.',
      'I usually wake up at seven o\'clock.',
      'They went to the beach last weekend.',
      'Could you please pass me the salt?'
    ],
    3: [
      'Despite the heavy rain, they decided to go hiking.',
      'The professor explained the theory thoroughly.',
      'Environmental protection is everyone\'s responsibility.',
      'She has been working on this project for months.',
      'The economic situation has improved significantly.',
      'Understanding different cultures is essential.',
      'The experiment produced unexpected results.',
      'Communication skills are vital in the workplace.',
      'He successfully completed the marathon last Sunday.',
      'The government announced new policies yesterday.'
    ]
  };

  const texts = levelTexts[level] || levelTexts[1];
  texts.forEach((text, index) => {
    const duration = calculateAudioDuration(text, 'en', level);
    const sampleId = `en-${level}-${index + 1}`;
    const phonemes = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    const features: number[][] = [];
    const frameCount = Math.floor(duration * 100 / 10);
    for (let i = 0; i < frameCount; i++) {
      const frame: number[] = [];
      for (let j = 0; j < 13; j++) {
        frame.push(Math.random() * 2 - 1);
      }
      features.push(frame);
    }
    samples.push({
      id: sampleId,
      text,
      language: 'en',
      level,
      duration,
      phonemes,
      features,
      audioUrl: `/api/samples/${sampleId}/audio`
    });
  });
  return samples;
};

const generateJapaneseSamples = (level: number): Sample[] => {
  const samples: Sample[] = [];
  const levelTexts: Record<number, string[]> = {
    1: [
      'こんにちは、お元気ですか？',
      '私は本を読むのが好きです。',
      '猫がマットの上にいます。',
      '彼女は赤いりんごを持っています。',
      '私たちは毎日学校に行きます。',
      '私の名前は太郎です。',
      '今日は晴れです。',
      '兄弟が二人います。',
      '犬は速く走ります。',
      '手伝ってくれますか？'
    ],
    2: [
      '今朝の天気はとても良いです。',
      '私は毎日新しい言語を学ぶのを楽しんでいます。',
      '彼女は小さな町で生まれました。',
      'そのレストランは美味しい料理を出します。',
      '私たちは金曜日までにプロジェクトを終えるべきです。',
      '彼はピアノをとても上手に弾きます。',
      'その映画は面白くて興奮しました。',
      '私はたいてい七時に起きます。',
      '彼らは先週末に海に行きました。',
      '塩を取っていただけますか？'
    ],
    3: [
      '激しい雨にもかかわらず、彼らはハイキングに行くことに決めました。',
      '教授は理論を徹底的に説明しました。',
      '環境保護は誰もが責任を持つべきです。',
      '彼女は数ヶ月間このプロジェクトに取り組んでいます。',
      '経済状況は大幅に改善されました。',
      '異なる文化を理解することは不可欠です。',
      '実験は予期しない結果を生み出しました。',
      'コミュニケーションスキルは職場で不可欠です。',
      '彼は先週の日曜日にマラソンを無事に完走しました。',
      '政府は昨日新しい政策を発表しました。'
    ]
  };

  const texts = levelTexts[level] || levelTexts[1];
  texts.forEach((text, index) => {
    const duration = calculateAudioDuration(text, 'ja', level);
    const sampleId = `ja-${level}-${index + 1}`;
    const phonemes = text.replace(/[^ぁ-んァ-ン\s]/g, '').split('').filter(c => c.trim());
    const features: number[][] = [];
    const frameCount = Math.floor(duration * 100 / 10);
    for (let i = 0; i < frameCount; i++) {
      const frame: number[] = [];
      for (let j = 0; j < 13; j++) {
        frame.push(Math.random() * 2 - 1);
      }
      features.push(frame);
    }
    samples.push({
      id: sampleId,
      text,
      language: 'ja',
      level,
      duration,
      phonemes,
      features,
      audioUrl: `/api/samples/${sampleId}/audio`
    });
  });
  return samples;
};

const allSamples: Sample[] = [
  ...generateEnglishSamples(1),
  ...generateEnglishSamples(2),
  ...generateEnglishSamples(3),
  ...generateJapaneseSamples(1),
  ...generateJapaneseSamples(2),
  ...generateJapaneseSamples(3)
];

const recordings: Recording[] = [
  {
    id: 'rec-001',
    userId: 'user-001',
    sampleId: 'en-1-1',
    score: 78,
    audioDuration: 2.8,
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'hello', score: 85 },
      { phoneme: 'how', score: 72 },
      { phoneme: 'are', score: 80 },
      { phoneme: 'you', score: 75 },
      { phoneme: 'today', score: 78 }
    ]
  },
  {
    id: 'rec-002',
    userId: 'user-001',
    sampleId: 'en-1-2',
    score: 82,
    audioDuration: 2.5,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'i', score: 90 },
      { phoneme: 'like', score: 85 },
      { phoneme: 'to', score: 78 },
      { phoneme: 'read', score: 80 },
      { phoneme: 'books', score: 77 }
    ]
  },
  {
    id: 'rec-003',
    userId: 'user-001',
    sampleId: 'en-1-3',
    score: 75,
    audioDuration: 3.1,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'the', score: 70 },
      { phoneme: 'cat', score: 82 },
      { phoneme: 'is', score: 88 },
      { phoneme: 'on', score: 65 },
      { phoneme: 'mat', score: 78 }
    ]
  },
  {
    id: 'rec-004',
    userId: 'user-001',
    sampleId: 'en-1-4',
    score: 88,
    audioDuration: 2.6,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'she', score: 92 },
      { phoneme: 'has', score: 85 },
      { phoneme: 'a', score: 95 },
      { phoneme: 'red', score: 80 },
      { phoneme: 'apple', score: 88 }
    ]
  },
  {
    id: 'rec-005',
    userId: 'user-001',
    sampleId: 'en-1-5',
    score: 72,
    audioDuration: 3.2,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'we', score: 68 },
      { phoneme: 'go', score: 75 },
      { phoneme: 'to', score: 80 },
      { phoneme: 'school', score: 65 },
      { phoneme: 'every', score: 72 },
      { phoneme: 'day', score: 78 }
    ]
  },
  {
    id: 'rec-006',
    userId: 'user-001',
    sampleId: 'en-2-1',
    score: 80,
    audioDuration: 3.5,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'the', score: 85 },
      { phoneme: 'weather', score: 75 },
      { phoneme: 'is', score: 90 },
      { phoneme: 'beautiful', score: 72 },
      { phoneme: 'this', score: 82 },
      { phoneme: 'morning', score: 78 }
    ]
  },
  {
    id: 'rec-007',
    userId: 'user-001',
    sampleId: 'en-2-2',
    score: 76,
    audioDuration: 3.8,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'i', score: 88 },
      { phoneme: 'enjoy', score: 70 },
      { phoneme: 'learning', score: 75 },
      { phoneme: 'new', score: 82 },
      { phoneme: 'languages', score: 68 },
      { phoneme: 'every', score: 78 },
      { phoneme: 'day', score: 72 }
    ]
  },
  {
    id: 'rec-008',
    userId: 'user-001',
    sampleId: 'en-2-3',
    score: 84,
    audioDuration: 3.3,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'she', score: 90 },
      { phoneme: 'was', score: 85 },
      { phoneme: 'born', score: 78 },
      { phoneme: 'in', score: 92 },
      { phoneme: 'a', score: 88 },
      { phoneme: 'small', score: 75 },
      { phoneme: 'town', score: 80 }
    ]
  },
  {
    id: 'rec-009',
    userId: 'user-001',
    sampleId: 'en-2-4',
    score: 79,
    audioDuration: 3.6,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'the', score: 82 },
      { phoneme: 'restaurant', score: 70 },
      { phoneme: 'serves', score: 75 },
      { phoneme: 'delicious', score: 80 },
      { phoneme: 'food', score: 88 }
    ]
  },
  {
    id: 'rec-010',
    userId: 'user-001',
    sampleId: 'en-3-1',
    score: 71,
    audioDuration: 4.2,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    phonemeScores: [
      { phoneme: 'despite', score: 65 },
      { phoneme: 'the', score: 80 },
      { phoneme: 'heavy', score: 72 },
      { phoneme: 'rain', score: 78 },
      { phoneme: 'they', score: 68 },
      { phoneme: 'decided', score: 60 },
      { phoneme: 'to', score: 85 },
      { phoneme: 'go', score: 75 },
      { phoneme: 'hiking', score: 62 }
    ]
  }
];

app.get('/api/samples', (req, res) => {
  const { language, level } = req.query;
  const lang = language as string;
  const lvl = parseInt(level as string) || 1;
  
  const filtered = allSamples.filter(s => s.language === lang && s.level === lvl);
  const result = filtered.map(s => ({
    id: s.id,
    text: s.text,
    duration: s.duration,
    phonemes: s.phonemes
  }));
  
  res.json(result);
});

app.get('/api/samples/:id', (req, res) => {
  const { id } = req.params;
  const sample = allSamples.find(s => s.id === id);
  
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  res.json(sample);
});

app.get('/api/samples/:id/audio', (req, res) => {
  const { id } = req.params;
  const sample = allSamples.find(s => s.id === id);
  
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  const sampleRate = 44100;
  const duration = sample.duration;
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(totalSamples * 2);
  
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * 220 * t) * 0.3 + 
                  Math.sin(2 * Math.PI * 440 * t * (0.5 + 0.5 * Math.sin(t * 2))) * 0.15;
    const intValue = Math.floor(value * 32767);
    buffer.writeInt16LE(intValue, i * 2);
  }
  
  res.set({
    'Content-Type': 'audio/wav',
    'Content-Length': buffer.length
  });
  res.send(buffer);
});

app.post('/api/recordings', (req, res) => {
  const { userId, sampleId, score, audioDuration, phonemeScores } = req.body;
  
  const recording: Recording = {
    id: `rec-${Date.now()}`,
    userId,
    sampleId,
    score,
    audioDuration,
    createdAt: new Date().toISOString(),
    phonemeScores: phonemeScores || []
  };
  
  recordings.push(recording);
  
  const user = users[userId];
  if (user) {
    user.points += Math.floor(score / 10);
  }
  
  res.status(201).json(recording);
});

app.get('/api/records', (req, res) => {
  const { userId, limit } = req.query;
  const userRecords = recordings.filter(r => r.userId === userId);
  const limited = limit ? userRecords.slice(-parseInt(limit as string)) : userRecords;
  
  res.json(limited.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users[id];
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const userRecords = recordings.filter(r => r.userId === userId);
  
  const recentScores = userRecords
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-10)
    .map(r => ({ date: r.createdAt, score: r.score }));
  
  const phonemeStats: Record<string, { total: number; count: number }> = {};
  userRecords.forEach(r => {
    r.phonemeScores.forEach(ps => {
      if (!phonemeStats[ps.phoneme]) {
        phonemeStats[ps.phoneme] = { total: 0, count: 0 };
      }
      phonemeStats[ps.phoneme].total += ps.score;
      phonemeStats[ps.phoneme].count++;
    });
  });
  
  const phonemeAccuracy = Object.entries(phonemeStats).map(([phoneme, data]) => ({
    phoneme,
    accuracy: Math.round(data.total / data.count)
  })).sort((a, b) => a.accuracy - b.accuracy);
  
  res.json({
    recentScores,
    phonemeAccuracy,
    totalPractices: userRecords.length,
    averageScore: userRecords.length > 0 
      ? Math.round(userRecords.reduce((sum, r) => sum + r.score, 0) / userRecords.length)
      : 0
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
