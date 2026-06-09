export interface SentenceAnalysis {
  score: number;
  intensity: number;
  keywords: string[];
}

const positiveZh: string[] = [
  '开心', '快乐', '幸福', '喜悦', '高兴', '愉快', '满意', '满足', '喜欢', '爱',
  '美好', '美丽', '精彩', '出色', '优秀', '棒', '好', '赞', '完美', '成功',
  '温暖', '温柔', '希望', '光明', '自由', '和平', '友善', '善良', '勇敢', '坚强',
  '感激', '感恩', '感动', '乐观', '积极', '热情', '兴奋', '惊喜', '愉快', '甜蜜',
  '舒适', '安心', '宁静', '平静', '欣慰', '自豪', '自信', '充实', '活力', '朝气',
  '欢乐', '喜庆', '祝福', '幸运', '顺利', '如意', '美好', '灿烂', '辉煌', '卓越',
  '笑', '高兴', '振奋', '鼓舞', '欣慰', '畅快', '痛快', '爽朗', '开怀', '愉悦',
];

const negativeZh: string[] = [
  '伤心', '难过', '痛苦', '悲伤', '绝望', '失望', '沮丧', '忧愁', '烦恼', '愤怒',
  '生气', '憎恨', '厌恶', '恐惧', '害怕', '焦虑', '紧张', '不安', '担心', '忧虑',
  '孤独', '寂寞', '空虚', '无聊', '疲惫', '困倦', '厌倦', '厌烦', '讨厌', '嫌弃',
  '痛苦', '折磨', '煎熬', '心碎', '崩溃', '绝望', '无助', '无奈', '困惑', '迷茫',
  '惭愧', '羞愧', '内疚', '悔恨', '遗憾', '懊恼', '烦躁', '暴躁', '暴怒', '狂怒',
  '嫉妒', '羡慕', '贪婪', '自私', '冷漠', '残酷', '残忍', '邪恶', '黑暗', '丑陋',
  '哭', '泪', '伤', '痛', '死', '亡', '病', '痛', '苦', '难',
];

const positiveEn: string[] = [
  'happy', 'joy', 'joyful', 'love', 'loved', 'excellent', 'amazing', 'wonderful',
  'fantastic', 'great', 'good', 'beautiful', 'brilliant', 'outstanding', 'perfect',
  'awesome', 'delightful', 'cheerful', 'glad', 'pleased', 'satisfied', 'grateful',
  'thankful', 'hopeful', 'optimistic', 'enthusiastic', 'excited', 'thrilled',
  'peaceful', 'calm', 'relaxed', 'comfortable', 'confident', 'proud', 'successful',
  'warm', 'kind', 'friendly', 'sweet', 'nice', 'pleasant', 'fun', 'enjoyable',
  'smile', 'laugh', 'blessed', 'lucky', 'fortunate', 'content', 'fulfilled',
];

const negativeEn: string[] = [
  'sad', 'unhappy', 'angry', 'mad', 'hate', 'hated', 'fear', 'afraid', 'scared',
  'worried', 'anxious', 'nervous', 'stressed', 'depressed', 'frustrated',
  'disappointed', 'hopeless', 'lonely', 'alone', 'empty', 'bored', 'tired',
  'exhausted', 'painful', 'suffering', 'hurt', 'broken', 'heartbroken', 'cry',
  'tears', 'grief', 'sorrow', 'regret', 'guilty', 'ashamed', 'embarrassed',
  'confused', 'lost', 'helpless', 'desperate', 'rage', 'furious', 'upset',
  'terrible', 'awful', 'horrible', 'dreadful', 'ugly', 'evil', 'cruel', 'dark',
  'fail', 'failed', 'failure', 'lose', 'lost', 'loss', 'miss', 'missed',
];

const intensifiers: string[] = [
  '非常', '十分', '特别', '极其', '相当', '很', '太', '真的', '简直', '无比',
  'very', 'extremely', 'incredibly', 'absolutely', 'totally', 'utterly', 'really',
  'so', 'too', 'deeply', 'highly', 'greatly', 'strongly',
];

const negators: string[] = [
  '不', '没', '没有', '不是', '别', '勿', '未', '非',
  'not', "don't", "doesn't", "didn't", "won't", "can't", "couldn't",
  "wouldn't", "shouldn't", "isn't", "aren't", "wasn't", "weren't", "never",
  'no', 'without',
];

function findMatches(text: string, words: string[]): string[] {
  const matches: string[] = [];
  const lowerText = text.toLowerCase();
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    let index = 0;
    while ((index = lowerText.indexOf(lowerWord, index)) !== -1) {
      matches.push(word);
      index += lowerWord.length;
    }
  }
  return matches;
}

function hasNearbyNegator(text: string, keywordIndex: number, keywordLength: number): boolean {
  const windowStart = Math.max(0, keywordIndex - 8);
  const windowEnd = Math.min(text.length, keywordIndex + keywordLength + 8);
  const window = text.substring(windowStart, windowEnd).toLowerCase();
  for (const neg of negators) {
    if (window.includes(neg.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function hasNearbyIntensifier(text: string, keywordIndex: number, keywordLength: number): boolean {
  const windowStart = Math.max(0, keywordIndex - 6);
  const windowEnd = Math.min(text.length, keywordIndex + keywordLength + 6);
  const window = text.substring(windowStart, windowEnd).toLowerCase();
  for (const int of intensifiers) {
    if (window.includes(int.toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function analyzeSentence(text: string): SentenceAnalysis {
  if (!text || text.trim().length === 0) {
    return { score: 0, intensity: 0, keywords: [] };
  }

  let positiveScore = 0;
  let negativeScore = 0;
  const foundKeywords: string[] = [];
  const lowerText = text.toLowerCase();

  for (const word of positiveZh) {
    let index = 0;
    while ((index = lowerText.indexOf(word, index)) !== -1) {
      let weight = 1;
      if (hasNearbyIntensifier(text, index, word.length)) weight *= 1.5;
      if (hasNearbyNegator(text, index, word.length)) {
        negativeScore += weight * 0.8;
      } else {
        positiveScore += weight;
      }
      foundKeywords.push(word);
      index += word.length;
    }
  }

  for (const word of positiveEn) {
    let index = 0;
    while ((index = lowerText.indexOf(word, index)) !== -1) {
      let weight = 1;
      if (hasNearbyIntensifier(text, index, word.length)) weight *= 1.5;
      if (hasNearbyNegator(text, index, word.length)) {
        negativeScore += weight * 0.8;
      } else {
        positiveScore += weight;
      }
      foundKeywords.push(word);
      index += word.length;
    }
  }

  for (const word of negativeZh) {
    let index = 0;
    while ((index = lowerText.indexOf(word, index)) !== -1) {
      let weight = 1;
      if (hasNearbyIntensifier(text, index, word.length)) weight *= 1.5;
      if (hasNearbyNegator(text, index, word.length)) {
        positiveScore += weight * 0.8;
      } else {
        negativeScore += weight;
      }
      foundKeywords.push(word);
      index += word.length;
    }
  }

  for (const word of negativeEn) {
    let index = 0;
    while ((index = lowerText.indexOf(word, index)) !== -1) {
      let weight = 1;
      if (hasNearbyIntensifier(text, index, word.length)) weight *= 1.5;
      if (hasNearbyNegator(text, index, word.length)) {
        positiveScore += weight * 0.8;
      } else {
        negativeScore += weight;
      }
      foundKeywords.push(word);
      index += word.length;
    }
  }

  const exclamationCount = (text.match(/[!！]/g) || []).length;
  positiveScore += exclamationCount * 0.3;

  const questionCount = (text.match(/[?？]/g) || []).length;
  if (questionCount > 0 && negativeScore > positiveScore) {
    negativeScore += questionCount * 0.2;
  }

  const total = positiveScore + negativeScore;
  let rawScore = 0;
  let intensity = 0;

  if (total > 0) {
    rawScore = (positiveScore - negativeScore) / total;
    intensity = Math.min(1, total / 4);
    if (total > 1) {
      const boost = Math.min(0.3, (total - 1) * 0.1);
      if (rawScore > 0) rawScore = Math.min(1, rawScore + boost);
      else if (rawScore < 0) rawScore = Math.max(-1, rawScore - boost);
    }
  }

  const charCount = text.replace(/\s/g, '').length;
  if (charCount > 0 && total > 0) {
    const density = total / charCount;
    if (density > 0.05) {
      intensity = Math.min(1, intensity + 0.2);
    }
  }

  return {
    score: Math.max(-1, Math.min(1, rawScore)),
    intensity,
    keywords: foundKeywords.slice(0, 5),
  };
}

export function scoreToColor(score: number): { color: string; hue: number; saturation: number; lightness: number } {
  let hue: number;
  let saturation: number;
  let lightness: number;

  if (score === 0) {
    hue = 220;
    saturation = 10;
    lightness = 65;
  } else if (score > 0) {
    const t = score;
    hue = 25 + (1 - t) * 10;
    saturation = 70 + t * 20;
    lightness = 50 + (1 - t) * 5;
  } else {
    const t = -score;
    hue = 210 + (1 - t) * 50;
    saturation = 60 + t * 25;
    lightness = 50 + (1 - t) * 8;
  }

  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  return { color, hue, saturation, lightness };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(255 * x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  if (!text) return sentences;

  const pattern = /([^。！？.!?\n]+[。！？.!?]?|\n+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const sentenceText = match[0];
    if (sentenceText && sentenceText.trim().length > 0) {
      sentences.push({
        text: sentenceText,
        start: match.index,
        end: match.index + sentenceText.length,
      });
    }
  }

  return sentences;
}
