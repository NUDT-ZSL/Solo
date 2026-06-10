import type { EmotionType } from './types';

const positiveWords = [
  '快乐', '喜欢', '美好', '希望', '爱', '成功', '温暖', '幸福', '喜悦', '光明',
  '美丽', '勇气', '梦想', '自由', '和平', '感恩', '善良', '热情', '希望', '成长',
  '开心', '欢乐', '甜蜜', '温馨', '感动', '精彩', '出色', '优秀', '完美', '胜利',
  'good', 'happy', 'love', 'beautiful', 'wonderful', 'amazing', 'great', 'excellent',
  'nice', 'joy', 'warm', 'hope', 'peace', 'freedom', 'dream', 'success'
];

const negativeWords = [
  '悲伤', '痛苦', '恐惧', '失败', '冷漠', '黑暗', '绝望', '孤独', '愤怒', '焦虑',
  '难过', '忧伤', '沉重', '疲惫', '迷茫', '失落', '痛苦', '伤害', '遗憾', '后悔',
  '恐惧', '害怕', '担忧', '压力', '困难', '挫折', '失败', '绝望', '痛苦', '悲伤',
  'sad', 'bad', 'pain', 'fear', 'dark', 'lonely', 'angry', 'anxious', 'hate',
  'sorrow', 'grief', 'despair', 'failure', 'cold', 'empty', 'lost'
];

export function analyzeEmotion(word: string): EmotionType {
  const lowerWord = word.toLowerCase().trim();
  
  if (!lowerWord) return 'neutral';
  
  const isPositive = positiveWords.some(pw => 
    lowerWord.includes(pw.toLowerCase()) || pw.toLowerCase().includes(lowerWord)
  );
  
  if (isPositive) return 'positive';
  
  const isNegative = negativeWords.some(nw => 
    lowerWord.includes(nw.toLowerCase()) || nw.toLowerCase().includes(lowerWord)
  );
  
  if (isNegative) return 'negative';
  
  return 'neutral';
}

export function analyzeTextEmotion(text: string): { words: string[]; emotions: EmotionType[] } {
  const words = splitText(text);
  const emotions = words.map(word => analyzeEmotion(word));
  return { words, emotions };
}

export function splitText(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  
  const segments: string[] = [];
  let current = '';
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (/[\u4e00-\u9fa5]/.test(char)) {
      if (current) {
        segments.push(current);
        current = '';
      }
      segments.push(char);
    } else if (char === ' ' || char === '，' || char === '。' || char === ',' || char === '.') {
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
  
  return segments.filter(w => w.length > 0).slice(0, 100);
}

export function getEmotionColor(emotion: EmotionType, variation: number = 0): string {
  const v = Math.abs(variation) % 1;
  
  switch (emotion) {
    case 'positive':
      return lerpColor('#FF6B6B', '#FFD93D', v);
    case 'negative':
      return lerpColor('#6BCB77', '#4D96FF', v);
    case 'neutral':
    default:
      return lerpColor('#C0C0C0', '#E8E8E8', v);
  }
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
