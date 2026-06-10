import type { EmotionType } from './types';

export interface EmotionScore {
  positive: number;
  negative: number;
  neutral: number;
  score: number;
}

interface WordEntry {
  word: string;
  weight: number;
}

const positiveLexicon: WordEntry[] = [
  { word: '爱', weight: 3.0 },
  { word: '喜欢', weight: 2.5 },
  { word: '快乐', weight: 2.5 },
  { word: '幸福', weight: 3.0 },
  { word: '美好', weight: 2.0 },
  { word: '希望', weight: 2.0 },
  { word: '成功', weight: 2.5 },
  { word: '温暖', weight: 2.0 },
  { word: '喜悦', weight: 2.5 },
  { word: '光明', weight: 2.0 },
  { word: '美丽', weight: 2.0 },
  { word: '勇气', weight: 2.0 },
  { word: '梦想', weight: 1.5 },
  { word: '自由', weight: 2.0 },
  { word: '和平', weight: 2.0 },
  { word: '感恩', weight: 2.5 },
  { word: '善良', weight: 2.0 },
  { word: '热情', weight: 2.0 },
  { word: '成长', weight: 1.5 },
  { word: '开心', weight: 2.0 },
  { word: '欢乐', weight: 2.5 },
  { word: '甜蜜', weight: 2.0 },
  { word: '温馨', weight: 2.0 },
  { word: '感动', weight: 2.0 },
  { word: '精彩', weight: 2.0 },
  { word: '出色', weight: 1.5 },
  { word: '优秀', weight: 2.0 },
  { word: '完美', weight: 2.5 },
  { word: '胜利', weight: 2.5 },
  { word: '幸运', weight: 2.0 },
  { word: '满足', weight: 1.5 },
  { word: '安心', weight: 1.5 },
  { word: '宁静', weight: 1.5 },
  { word: '灿烂', weight: 2.0 },
  { word: '闪耀', weight: 2.0 },
  { word: 'love', weight: 3.0 },
  { word: 'happy', weight: 2.5 },
  { word: 'joy', weight: 2.5 },
  { word: 'beautiful', weight: 2.5 },
  { word: 'wonderful', weight: 2.5 },
  { word: 'amazing', weight: 2.5 },
  { word: 'great', weight: 2.0 },
  { word: 'excellent', weight: 2.5 },
  { word: 'nice', weight: 1.5 },
  { word: 'warm', weight: 1.5 },
  { word: 'hope', weight: 2.0 },
  { word: 'peace', weight: 2.0 },
  { word: 'freedom', weight: 2.0 },
  { word: 'dream', weight: 1.5 },
  { word: 'success', weight: 2.5 },
  { word: 'bright', weight: 1.5 },
  { word: 'sunshine', weight: 2.0 },
  { word: 'smile', weight: 2.0 }
];

const negativeLexicon: WordEntry[] = [
  { word: '悲伤', weight: 3.0 },
  { word: '痛苦', weight: 3.0 },
  { word: '恐惧', weight: 2.5 },
  { word: '失败', weight: 2.5 },
  { word: '冷漠', weight: 2.0 },
  { word: '黑暗', weight: 2.0 },
  { word: '绝望', weight: 3.0 },
  { word: '孤独', weight: 2.5 },
  { word: '愤怒', weight: 2.5 },
  { word: '焦虑', weight: 2.0 },
  { word: '难过', weight: 2.0 },
  { word: '忧伤', weight: 2.5 },
  { word: '沉重', weight: 1.5 },
  { word: '疲惫', weight: 1.5 },
  { word: '迷茫', weight: 2.0 },
  { word: '失落', weight: 2.0 },
  { word: '伤害', weight: 2.5 },
  { word: '遗憾', weight: 2.0 },
  { word: '后悔', weight: 2.5 },
  { word: '害怕', weight: 2.0 },
  { word: '担忧', weight: 1.5 },
  { word: '压力', weight: 2.0 },
  { word: '困难', weight: 1.5 },
  { word: '挫折', weight: 2.0 },
  { word: '痛苦', weight: 3.0 },
  { word: '伤心', weight: 2.5 },
  { word: '心碎', weight: 3.0 },
  { word: '绝望', weight: 3.0 },
  { word: '空虚', weight: 2.0 },
  { word: '寂寞', weight: 2.5 },
  { word: '冷', weight: 1.5 },
  { word: 'sad', weight: 2.5 },
  { word: 'bad', weight: 2.0 },
  { word: 'pain', weight: 3.0 },
  { word: 'fear', weight: 2.5 },
  { word: 'dark', weight: 1.5 },
  { word: 'lonely', weight: 2.5 },
  { word: 'angry', weight: 2.5 },
  { word: 'anxious', weight: 2.0 },
  { word: 'hate', weight: 3.0 },
  { word: 'sorrow', weight: 3.0 },
  { word: 'grief', weight: 3.0 },
  { word: 'despair', weight: 3.0 },
  { word: 'failure', weight: 2.5 },
  { word: 'cold', weight: 1.5 },
  { word: 'empty', weight: 2.0 },
  { word: 'lost', weight: 2.0 },
  { word: 'hurt', weight: 2.5 },
  { word: 'regret', weight: 2.5 }
];

const intensifiers = ['很', '非常', '特别', '十分', '极其', '最', '太', '真', '超级', 'so', 'very', 'really', 'extremely', 'super'];
const negators = ['不', '没', '无', '非', 'not', 'no', 'never', "don't", "doesn't", "isn't", "aren't", "wasn't", "weren't"];

export function calculateEmotionScore(word: string, contextWords: string[] = []): EmotionScore {
  const lowerWord = word.toLowerCase().trim();
  
  if (!lowerWord) {
    return { positive: 0, negative: 0, neutral: 1, score: 0 };
  }

  let positiveScore = 0;
  let negativeScore = 0;

  for (const entry of positiveLexicon) {
    if (lowerWord.includes(entry.word) || entry.word.includes(lowerWord)) {
      positiveScore += entry.weight;
    }
  }

  for (const entry of negativeLexicon) {
    if (lowerWord.includes(entry.word) || entry.word.includes(lowerWord)) {
      negativeScore += entry.weight;
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

  positiveScore *= Math.max(0, multiplier);
  negativeScore *= Math.max(0, -multiplier);

  const total = positiveScore + negativeScore;
  
  if (total === 0) {
    return { positive: 0, negative: 0, neutral: 1, score: 0 };
  }

  const positiveRatio = positiveScore / total;
  const negativeRatio = negativeScore / total;
  const score = positiveScore - negativeScore;

  return {
    positive: positiveRatio,
    negative: negativeRatio,
    neutral: Math.max(0, 1 - total / 3),
    score
  };
}

export function scoreToEmotionType(score: number): EmotionType {
  if (score > 0.5) return 'positive';
  if (score < -0.5) return 'negative';
  return 'neutral';
}

export function analyzeEmotion(word: string, contextWords: string[] = []): EmotionType {
  const scoreData = calculateEmotionScore(word, contextWords);
  return scoreToEmotionType(scoreData.score);
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

export function getEmotionColor(emotion: EmotionType, score: number = 0, variation: number = 0): string {
  const v = Math.abs(variation) % 1;

  if (emotion === 'positive') {
    const intensity = Math.min(1, Math.max(0, (score + 3) / 6));
    return lerpColor('#FF8A8A', '#FFD93D', intensity * 0.5 + v * 0.5);
  }
  
  if (emotion === 'negative') {
    const intensity = Math.min(1, Math.max(0, (-score + 3) / 6));
    return lerpColor('#6BCB77', '#4D6BFF', intensity * 0.5 + v * 0.5);
  }

  return lerpColor('#B0B0C0', '#E8E8F0', v);
}

export function getColorFromScore(score: number, variation: number = 0): string {
  const normalizedScore = Math.max(-1, Math.min(1, score / 3));
  const v = Math.abs(variation) % 1;

  if (normalizedScore > 0) {
    return lerpColor('#E0E0E0', '#FFD93D', normalizedScore * 0.7 + v * 0.3);
  } else if (normalizedScore < 0) {
    return lerpColor('#E0E0E0', '#4D96FF', -normalizedScore * 0.7 + v * 0.3);
  }

  return lerpColor('#C0C0D0', '#E8E8F0', v);
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 200, g: 200, b: 200 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
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
  if (score > -0.5) return '中性';
  if (score > -2) return '比较消极';
  return '非常消极';
}
