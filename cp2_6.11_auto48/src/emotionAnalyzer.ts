import type { EmotionType } from './types';

export interface EmotionScore {
  positive: number;
  negative: number;
  neutral: number;
  score: number;
  intensity: number;
}

interface WordEntry {
  word: string;
  weight: number;
  category: 'positive' | 'negative' | 'neutral';
}

const positiveLexicon: WordEntry[] = [
  { word: '爱', weight: 3.0, category: 'positive' },
  { word: '喜欢', weight: 2.5, category: 'positive' },
  { word: '快乐', weight: 2.5, category: 'positive' },
  { word: '幸福', weight: 3.0, category: 'positive' },
  { word: '美好', weight: 2.0, category: 'positive' },
  { word: '希望', weight: 2.0, category: 'positive' },
  { word: '成功', weight: 2.5, category: 'positive' },
  { word: '温暖', weight: 2.0, category: 'positive' },
  { word: '喜悦', weight: 2.5, category: 'positive' },
  { word: '光明', weight: 2.0, category: 'positive' },
  { word: '美丽', weight: 2.0, category: 'positive' },
  { word: '勇气', weight: 2.0, category: 'positive' },
  { word: '梦想', weight: 1.5, category: 'positive' },
  { word: '自由', weight: 2.0, category: 'positive' },
  { word: '和平', weight: 2.0, category: 'positive' },
  { word: '感恩', weight: 2.5, category: 'positive' },
  { word: '善良', weight: 2.0, category: 'positive' },
  { word: '热情', weight: 2.0, category: 'positive' },
  { word: '成长', weight: 1.5, category: 'positive' },
  { word: '开心', weight: 2.0, category: 'positive' },
  { word: '欢乐', weight: 2.5, category: 'positive' },
  { word: '甜蜜', weight: 2.0, category: 'positive' },
  { word: '温馨', weight: 2.0, category: 'positive' },
  { word: '感动', weight: 2.0, category: 'positive' },
  { word: '精彩', weight: 2.0, category: 'positive' },
  { word: '出色', weight: 1.5, category: 'positive' },
  { word: '优秀', weight: 2.0, category: 'positive' },
  { word: '完美', weight: 2.5, category: 'positive' },
  { word: '胜利', weight: 2.5, category: 'positive' },
  { word: '幸运', weight: 2.0, category: 'positive' },
  { word: '满足', weight: 1.5, category: 'positive' },
  { word: '安心', weight: 1.5, category: 'positive' },
  { word: '宁静', weight: 1.5, category: 'positive' },
  { word: '灿烂', weight: 2.0, category: 'positive' },
  { word: '闪耀', weight: 2.0, category: 'positive' },
  { word: '愉快', weight: 2.0, category: 'positive' },
  { word: '高兴', weight: 2.0, category: 'positive' },
  { word: '兴奋', weight: 2.5, category: 'positive' },
  { word: '自豪', weight: 2.0, category: 'positive' },
  { word: '期待', weight: 1.5, category: 'positive' },
  { word: '信任', weight: 2.0, category: 'positive' },
  { word: '尊重', weight: 2.0, category: 'positive' },
  { word: '鼓励', weight: 2.0, category: 'positive' },
  { word: '支持', weight: 2.0, category: 'positive' },
  { word: '帮助', weight: 1.5, category: 'positive' },
  { word: '友谊', weight: 2.5, category: 'positive' },
  { word: '家人', weight: 2.5, category: 'positive' },
  { word: '朋友', weight: 2.0, category: 'positive' },
  { word: '爱情', weight: 3.0, category: 'positive' },
  { word: '健康', weight: 2.0, category: 'positive' },
  { word: '安全', weight: 1.5, category: 'positive' },
  { word: '舒适', weight: 1.5, category: 'positive' },
  { word: '轻松', weight: 1.5, category: 'positive' },
  { word: '清爽', weight: 1.5, category: 'positive' },
  { word: '美味', weight: 2.0, category: 'positive' },
  { word: '香甜', weight: 2.0, category: 'positive' },
  { word: 'love', weight: 3.0, category: 'positive' },
  { word: 'happy', weight: 2.5, category: 'positive' },
  { word: 'joy', weight: 2.5, category: 'positive' },
  { word: 'beautiful', weight: 2.5, category: 'positive' },
  { word: 'wonderful', weight: 2.5, category: 'positive' },
  { word: 'amazing', weight: 2.5, category: 'positive' },
  { word: 'great', weight: 2.0, category: 'positive' },
  { word: 'excellent', weight: 2.5, category: 'positive' },
  { word: 'nice', weight: 1.5, category: 'positive' },
  { word: 'warm', weight: 1.5, category: 'positive' },
  { word: 'hope', weight: 2.0, category: 'positive' },
  { word: 'peace', weight: 2.0, category: 'positive' },
  { word: 'freedom', weight: 2.0, category: 'positive' },
  { word: 'dream', weight: 1.5, category: 'positive' },
  { word: 'success', weight: 2.5, category: 'positive' },
  { word: 'bright', weight: 1.5, category: 'positive' },
  { word: 'sunshine', weight: 2.0, category: 'positive' },
  { word: 'smile', weight: 2.0, category: 'positive' },
  { word: 'friend', weight: 2.0, category: 'positive' },
  { word: 'family', weight: 2.5, category: 'positive' },
  { word: 'health', weight: 2.0, category: 'positive' },
  { word: 'safe', weight: 1.5, category: 'positive' },
  { word: 'delicious', weight: 2.0, category: 'positive' },
  { word: 'sweet', weight: 2.0, category: 'positive' },
  { word: 'kind', weight: 2.0, category: 'positive' },
  { word: 'brave', weight: 2.0, category: 'positive' },
  { word: 'proud', weight: 2.0, category: 'positive' },
  { word: 'excited', weight: 2.5, category: 'positive' },
  { word: 'grateful', weight: 2.5, category: 'positive' },
  { word: 'satisfied', weight: 1.5, category: 'positive' },
  { word: 'comfortable', weight: 1.5, category: 'positive' }
];

const negativeLexicon: WordEntry[] = [
  { word: '悲伤', weight: 3.0, category: 'negative' },
  { word: '痛苦', weight: 3.0, category: 'negative' },
  { word: '恐惧', weight: 2.5, category: 'negative' },
  { word: '失败', weight: 2.5, category: 'negative' },
  { word: '冷漠', weight: 2.0, category: 'negative' },
  { word: '黑暗', weight: 2.0, category: 'negative' },
  { word: '绝望', weight: 3.0, category: 'negative' },
  { word: '孤独', weight: 2.5, category: 'negative' },
  { word: '愤怒', weight: 2.5, category: 'negative' },
  { word: '焦虑', weight: 2.0, category: 'negative' },
  { word: '难过', weight: 2.0, category: 'negative' },
  { word: '忧伤', weight: 2.5, category: 'negative' },
  { word: '沉重', weight: 1.5, category: 'negative' },
  { word: '疲惫', weight: 1.5, category: 'negative' },
  { word: '迷茫', weight: 2.0, category: 'negative' },
  { word: '失落', weight: 2.0, category: 'negative' },
  { word: '伤害', weight: 2.5, category: 'negative' },
  { word: '遗憾', weight: 2.0, category: 'negative' },
  { word: '后悔', weight: 2.5, category: 'negative' },
  { word: '害怕', weight: 2.0, category: 'negative' },
  { word: '担忧', weight: 1.5, category: 'negative' },
  { word: '压力', weight: 2.0, category: 'negative' },
  { word: '困难', weight: 1.5, category: 'negative' },
  { word: '挫折', weight: 2.0, category: 'negative' },
  { word: '伤心', weight: 2.5, category: 'negative' },
  { word: '心碎', weight: 3.0, category: 'negative' },
  { word: '空虚', weight: 2.0, category: 'negative' },
  { word: '寂寞', weight: 2.5, category: 'negative' },
  { word: '冷', weight: 1.5, category: 'negative' },
  { word: '痛苦', weight: 3.0, category: 'negative' },
  { word: '仇恨', weight: 3.0, category: 'negative' },
  { word: '嫉妒', weight: 2.5, category: 'negative' },
  { word: '贪婪', weight: 2.0, category: 'negative' },
  { word: '懒惰', weight: 2.0, category: 'negative' },
  { word: '骄傲', weight: 1.5, category: 'negative' },
  { word: '自私', weight: 2.0, category: 'negative' },
  { word: '虚伪', weight: 2.0, category: 'negative' },
  { word: '欺骗', weight: 2.5, category: 'negative' },
  { word: '背叛', weight: 3.0, category: 'negative' },
  { word: '失落', weight: 2.0, category: 'negative' },
  { word: '失望', weight: 2.0, category: 'negative' },
  { word: '绝望', weight: 3.0, category: 'negative' },
  { word: '无助', weight: 2.5, category: 'negative' },
  { word: '无力', weight: 2.0, category: 'negative' },
  { word: '迷茫', weight: 2.0, category: 'negative' },
  { word: '困惑', weight: 1.5, category: 'negative' },
  { word: '矛盾', weight: 2.0, category: 'negative' },
  { word: '纠结', weight: 1.5, category: 'negative' },
  { word: '烦躁', weight: 2.0, category: 'negative' },
  { word: '郁闷', weight: 2.0, category: 'negative' },
  { word: '压抑', weight: 2.0, category: 'negative' },
  { word: '憋屈', weight: 2.0, category: 'negative' },
  { word: '委屈', weight: 2.0, category: 'negative' },
  { word: '难受', weight: 2.0, category: 'negative' },
  { word: '煎熬', weight: 2.5, category: 'negative' },
  { word: '折磨', weight: 3.0, category: 'negative' },
  { word: 'sad', weight: 2.5, category: 'negative' },
  { word: 'bad', weight: 2.0, category: 'negative' },
  { word: 'pain', weight: 3.0, category: 'negative' },
  { word: 'fear', weight: 2.5, category: 'negative' },
  { word: 'dark', weight: 1.5, category: 'negative' },
  { word: 'lonely', weight: 2.5, category: 'negative' },
  { word: 'angry', weight: 2.5, category: 'negative' },
  { word: 'anxious', weight: 2.0, category: 'negative' },
  { word: 'hate', weight: 3.0, category: 'negative' },
  { word: 'sorrow', weight: 3.0, category: 'negative' },
  { word: 'grief', weight: 3.0, category: 'negative' },
  { word: 'despair', weight: 3.0, category: 'negative' },
  { word: 'failure', weight: 2.5, category: 'negative' },
  { word: 'cold', weight: 1.5, category: 'negative' },
  { word: 'empty', weight: 2.0, category: 'negative' },
  { word: 'lost', weight: 2.0, category: 'negative' },
  { word: 'hurt', weight: 2.5, category: 'negative' },
  { word: 'regret', weight: 2.5, category: 'negative' },
  { word: 'disappointed', weight: 2.0, category: 'negative' },
  { word: 'hopeless', weight: 3.0, category: 'negative' },
  { word: 'helpless', weight: 2.5, category: 'negative' },
  { word: 'confused', weight: 1.5, category: 'negative' },
  { word: 'stress', weight: 2.0, category: 'negative' },
  { word: 'tired', weight: 1.5, category: 'negative' },
  { word: 'exhausted', weight: 2.0, category: 'negative' },
  { word: 'bitter', weight: 2.0, category: 'negative' },
  { word: 'cruel', weight: 2.5, category: 'negative' },
  { word: 'selfish', weight: 2.0, category: 'negative' },
  { word: 'fake', weight: 2.0, category: 'negative' },
  { word: 'betray', weight: 3.0, category: 'negative' },
  { word: 'jealous', weight: 2.5, category: 'negative' }
];

const neutralLexicon: WordEntry[] = [
  { word: '的', weight: 0.5, category: 'neutral' },
  { word: '是', weight: 0.5, category: 'neutral' },
  { word: '了', weight: 0.5, category: 'neutral' },
  { word: '在', weight: 0.5, category: 'neutral' },
  { word: '我', weight: 0.5, category: 'neutral' },
  { word: '你', weight: 0.5, category: 'neutral' },
  { word: '他', weight: 0.5, category: 'neutral' },
  { word: '她', weight: 0.5, category: 'neutral' },
  { word: '它', weight: 0.5, category: 'neutral' },
  { word: '们', weight: 0.5, category: 'neutral' },
  { word: '一', weight: 0.5, category: 'neutral' },
  { word: '个', weight: 0.5, category: 'neutral' },
  { word: '有', weight: 0.5, category: 'neutral' },
  { word: '和', weight: 0.5, category: 'neutral' },
  { word: '与', weight: 0.5, category: 'neutral' },
  { word: '及', weight: 0.5, category: 'neutral' },
  { word: '或', weight: 0.5, category: 'neutral' },
  { word: '这', weight: 0.5, category: 'neutral' },
  { word: '那', weight: 0.5, category: 'neutral' },
  { word: '就', weight: 0.5, category: 'neutral' },
  { word: '都', weight: 0.5, category: 'neutral' },
  { word: '也', weight: 0.5, category: 'neutral' },
  { word: '还', weight: 0.5, category: 'neutral' },
  { word: '要', weight: 0.5, category: 'neutral' },
  { word: '会', weight: 0.5, category: 'neutral' },
  { word: '能', weight: 0.5, category: 'neutral' },
  { word: '可以', weight: 0.5, category: 'neutral' },
  { word: '可能', weight: 0.5, category: 'neutral' },
  { word: '应该', weight: 0.5, category: 'neutral' },
  { word: '必须', weight: 0.5, category: 'neutral' },
  { word: '记忆', weight: 1.0, category: 'neutral' },
  { word: '时间', weight: 1.0, category: 'neutral' },
  { word: '空间', weight: 1.0, category: 'neutral' },
  { word: '地方', weight: 1.0, category: 'neutral' },
  { word: '事情', weight: 1.0, category: 'neutral' },
  { word: '东西', weight: 1.0, category: 'neutral' },
  { word: '世界', weight: 1.0, category: 'neutral' },
  { word: '宇宙', weight: 1.0, category: 'neutral' },
  { word: '星空', weight: 1.0, category: 'neutral' },
  { word: '星星', weight: 1.0, category: 'neutral' },
  { word: '星云', weight: 1.5, category: 'neutral' },
  { word: '粒子', weight: 1.0, category: 'neutral' },
  { word: '文字', weight: 1.0, category: 'neutral' },
  { word: '语言', weight: 1.0, category: 'neutral' },
  { word: '想法', weight: 1.0, category: 'neutral' },
  { word: '感觉', weight: 1.0, category: 'neutral' },
  { word: '思绪', weight: 1.0, category: 'neutral' },
  { word: 'the', weight: 0.5, category: 'neutral' },
  { word: 'a', weight: 0.5, category: 'neutral' },
  { word: 'is', weight: 0.5, category: 'neutral' },
  { word: 'are', weight: 0.5, category: 'neutral' },
  { word: 'was', weight: 0.5, category: 'neutral' },
  { word: 'and', weight: 0.5, category: 'neutral' },
  { word: 'or', weight: 0.5, category: 'neutral' },
  { word: 'but', weight: 0.5, category: 'neutral' },
  { word: 'if', weight: 0.5, category: 'neutral' },
  { word: 'when', weight: 0.5, category: 'neutral' },
  { word: 'where', weight: 0.5, category: 'neutral' },
  { word: 'what', weight: 0.5, category: 'neutral' },
  { word: 'who', weight: 0.5, category: 'neutral' },
  { word: 'how', weight: 0.5, category: 'neutral' },
  { word: 'memory', weight: 1.0, category: 'neutral' },
  { word: 'time', weight: 1.0, category: 'neutral' },
  { word: 'space', weight: 1.0, category: 'neutral' },
  { word: 'world', weight: 1.0, category: 'neutral' },
  { word: 'star', weight: 1.0, category: 'neutral' },
  { word: 'nebula', weight: 1.5, category: 'neutral' },
  { word: 'particle', weight: 1.0, category: 'neutral' },
  { word: 'text', weight: 1.0, category: 'neutral' },
  { word: 'word', weight: 1.0, category: 'neutral' },
  { word: 'thought', weight: 1.0, category: 'neutral' },
  { word: 'idea', weight: 1.0, category: 'neutral' }
];

const intensifiers = ['很', '非常', '特别', '十分', '极其', '最', '太', '真', '超级', 'so', 'very', 'really', 'extremely', 'super', 'quite', 'rather', 'fairly'];
const negators = ['不', '没', '无', '非', 'not', 'no', 'never', "don't", "doesn't", "isn't", "aren't", "wasn't", "weren't", 'without', 'lack'];

const POSITIVE_START = { r: 255, g: 107, b: 107 };
const POSITIVE_END = { r: 255, g: 217, b: 61 };
const NEGATIVE_START = { r: 107, g: 203, b: 119 };
const NEGATIVE_END = { r: 77, g: 150, b: 255 };
const NEUTRAL_START = { r: 200, g: 200, b: 210 };
const NEUTRAL_END = { r: 232, g: 232, b: 240 };

export function calculateEmotionScore(word: string, contextWords: string[] = []): EmotionScore {
  const lowerWord = word.toLowerCase().trim();

  if (!lowerWord || lowerWord.length < 1) {
    return { positive: 0, negative: 0, neutral: 1, score: 0, intensity: 0 };
  }

  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;

  for (const entry of positiveLexicon) {
    if (lowerWord.includes(entry.word) || entry.word.includes(lowerWord)) {
      positiveScore = Math.max(positiveScore, entry.weight);
    }
  }

  for (const entry of negativeLexicon) {
    if (lowerWord.includes(entry.word) || entry.word.includes(lowerWord)) {
      negativeScore = Math.max(negativeScore, entry.weight);
    }
  }

  for (const entry of neutralLexicon) {
    if (lowerWord === entry.word || lowerWord.includes(entry.word) || entry.word.includes(lowerWord)) {
      neutralScore = Math.max(neutralScore, entry.weight);
    }
  }

  let multiplier = 1;
  const lowerContext = contextWords.map(w => w.toLowerCase());

  for (const ctx of lowerContext) {
    if (intensifiers.some(ins => ctx.includes(ins))) {
      multiplier *= 1.5;
    }
    if (negators.some(neg => ctx.includes(neg))) {
      multiplier *= -1;
    }
  }

  if (multiplier < 0) {
    const tempPos = positiveScore;
    positiveScore = negativeScore * Math.abs(multiplier);
    negativeScore = tempPos * Math.abs(multiplier);
  } else {
    positiveScore *= multiplier;
    negativeScore *= multiplier;
  }

  const rawTotal = positiveScore + negativeScore + neutralScore;
  
  if (rawTotal === 0) {
    return { positive: 0, negative: 0, neutral: 1, score: 0, intensity: 0 };
  }

  const score = positiveScore - negativeScore;
  const intensity = Math.min(1, (Math.abs(score) + neutralScore * 0.3) / 3);

  const positiveRatio = positiveScore / rawTotal;
  const negativeRatio = negativeScore / rawTotal;
  const neutralRatio = neutralScore / rawTotal;

  return {
    positive: positiveRatio,
    negative: negativeRatio,
    neutral: neutralRatio,
    score,
    intensity
  };
}

export function scoreToEmotionType(score: number): EmotionType {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  return 'neutral';
}

export function getColorFromScore(score: number, intensity: number = 0.5, variation: number = 0): string {
  const normalizedScore = Math.max(-1, Math.min(1, score / 3));
  const v = Math.abs(variation) % 1;

  let r: number, g: number, b: number;

  if (normalizedScore > 0) {
    const t = normalizedScore * (0.7 + v * 0.3);
    r = Math.round(lerp(NEUTRAL_START.r, POSITIVE_END.r, t));
    g = Math.round(lerp(NEUTRAL_START.g, POSITIVE_END.g, t));
    b = Math.round(lerp(NEUTRAL_START.b, POSITIVE_END.b, t));
  } else if (normalizedScore < 0) {
    const t = -normalizedScore * (0.7 + v * 0.3);
    r = Math.round(lerp(NEUTRAL_START.r, NEGATIVE_END.r, t));
    g = Math.round(lerp(NEUTRAL_START.g, NEGATIVE_END.g, t));
    b = Math.round(lerp(NEUTRAL_START.b, NEGATIVE_END.b, t));
  } else {
    r = Math.round(lerp(NEUTRAL_START.r, NEUTRAL_END.r, v));
    g = Math.round(lerp(NEUTRAL_START.g, NEUTRAL_END.g, v));
    b = Math.round(lerp(NEUTRAL_START.b, NEUTRAL_END.b, v));
  }

  const intensityBoost = intensity * 0.2;
  r = Math.min(255, Math.round(r + (255 - r) * intensityBoost * 0.3));
  g = Math.min(255, Math.round(g + (255 - g) * intensityBoost * 0.3));
  b = Math.min(255, Math.round(b + (255 - b) * intensityBoost * 0.3));

  return rgbToHex(r, g, b);
}

export function getEmotionColor(emotion: EmotionType, score: number = 0, variation: number = 0): string {
  const v = Math.abs(variation) % 1;

  if (emotion === 'positive') {
    const intensity = Math.min(1, Math.max(0, (score + 3) / 6));
    return getColorFromScore(score, intensity, v);
  }

  if (emotion === 'negative') {
    const intensity = Math.min(1, Math.max(0, (-score + 3) / 6));
    return getColorFromScore(score, intensity, v);
  }

  return getColorFromScore(0, 0.3, v);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function getEmotionLabel(emotion: EmotionType): string {
  switch (emotion) {
    case 'positive': return '积极';
    case 'negative': return '消极';
    case 'neutral': return '中性';
  }
}

export function getScoreLabel(score: number): string {
  if (score > 2) return '非常积极';
  if (score > 0.5) return '比较积极';
  if (score > -0.3) return '中性';
  if (score > -2) return '比较消极';
  return '非常消极';
}

export function analyzeTextEmotion(text: string): {
  words: string[];
  emotions: EmotionType[];
  scores: EmotionScore[];
  segments: string[][];
} {
  const { words, segments } = splitTextWithSegments(text);
  const scores: EmotionScore[] = [];
  const emotions: EmotionType[] = [];

  words.forEach((word, index) => {
    const context = getContextWords(words, index, 2);
    const score = calculateEmotionScore(word, context);
    scores.push(score);
    emotions.push(scoreToEmotionType(score.score));
  });

  return { words, emotions, scores, segments };
}

function getContextWords(words: string[], index: number, windowSize: number): string[] {
  const start = Math.max(0, index - windowSize);
  const end = Math.min(words.length, index + windowSize + 1);
  return words.slice(start, index).concat(words.slice(index + 1, end));
}

function splitTextWithSegments(text: string): { words: string[]; segments: string[][] } {
  const cleaned = text.trim();
  if (!cleaned) return { words: [], segments: [] };

  const segmentRegex = /[。！？.!?\n]+/g;
  const rawSegments = cleaned.split(segmentRegex).filter(s => s.trim().length > 0);

  const segments: string[][] = [];
  const allWords: string[] = [];

  for (const seg of rawSegments) {
    const segWords = splitSegment(seg);
    if (segWords.length > 0) {
      segments.push(segWords);
      allWords.push(...segWords);
    }
  }

  return { words: allWords.slice(0, 100), segments };
}

function splitSegment(segment: string): string[] {
  const segments: string[] = [];
  let current = '';

  for (let i = 0; i < segment.length; i++) {
    const char = segment[i];

    if (/[\u4e00-\u9fa5]/.test(char)) {
      if (current) {
        segments.push(current);
        current = '';
      }
      segments.push(char);
    } else if (char === ' ' || char === '，' || char === ',' || char === '；' || char === ';') {
      if (current) {
        segments.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments.filter(w => w.trim().length > 0);
}

export function splitText(text: string): string[] {
  const { words } = splitTextWithSegments(text);
  return words;
}

export function analyzeEmotion(word: string, contextWords: string[] = []): EmotionType {
  const scoreData = calculateEmotionScore(word, contextWords);
  return scoreToEmotionType(scoreData.score);
}
