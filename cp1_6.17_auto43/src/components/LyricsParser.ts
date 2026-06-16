export type EmotionTag = 'happy' | 'sad' | 'calm' | 'passionate' | 'nostalgic' | 'neutral';

export interface ParsedLyricLine {
  id: string;
  text: string;
  length: number;
  emotion: EmotionTag;
  displayLines: string[];
}

export interface ParsedLyrics {
  lines: ParsedLyricLine[];
  totalLines: number;
  totalChars: number;
  averageLength: number;
}

const emotionKeywords: Record<EmotionTag, string[]> = {
  happy: ['快乐', '开心', '幸福', '笑', '喜悦', '阳光', '温暖', '爱', '美好', '甜蜜', '自由', '希望'],
  sad: ['悲伤', '难过', '哭', '泪', '痛苦', '孤独', '寂寞', '离别', '分手', '心碎', '失去', '遗憾'],
  calm: ['安静', '宁静', '平静', '风', '海', '天空', '云', '月光', '星空', '夜晚', '温柔', '轻轻'],
  passionate: ['燃烧', '火焰', '激情', '热血', '奔跑', '勇敢', '梦想', '远方', '飞翔', '力量', '疯狂', '战斗'],
  nostalgic: ['回忆', '过去', '曾经', '童年', '故乡', '往事', '岁月', '时光', '旧', '怀念', '那年', '从前'],
  neutral: []
};

function generateId(): string {
  return `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function detectEmotion(text: string): EmotionTag {
  const scores: Record<EmotionTag, number> = {
    happy: 0,
    sad: 0,
    calm: 0,
    passionate: 0,
    nostalgic: 0,
    neutral: 0
  };

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[emotion as EmotionTag]++;
      }
    }
  }

  let maxEmotion: EmotionTag = 'neutral';
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion as EmotionTag;
    }
  }

  return maxEmotion;
}

function splitDisplayLines(text: string, maxCharsPerLine: number = 12): string[] {
  if (text.length <= maxCharsPerLine) {
    return [text];
  }

  const lines: string[] = [];
  let current = '';

  for (const char of text) {
    if (current.length >= maxCharsPerLine) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function parseLyrics(rawLyrics: string): ParsedLyrics {
  const normalizedLyrics = rawLyrics
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const rawLines = normalizedLyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const parsedLines: ParsedLyricLine[] = rawLines.map((text, index) => ({
    id: generateId() + '_' + index,
    text,
    length: text.length,
    emotion: detectEmotion(text),
    displayLines: splitDisplayLines(text)
  }));

  const totalChars = parsedLines.reduce((sum, line) => sum + line.length, 0);
  const averageLength = parsedLines.length > 0
    ? Math.round(totalChars / parsedLines.length)
    : 0;

  return {
    lines: parsedLines,
    totalLines: parsedLines.length,
    totalChars,
    averageLength
  };
}

export function filterLyricsByEmotion(
  parsed: ParsedLyrics,
  emotion: EmotionTag
): ParsedLyricLine[] {
  return parsed.lines.filter(line => line.emotion === emotion);
}

export function getLongestLines(parsed: ParsedLyrics, count: number = 5): ParsedLyricLine[] {
  return [...parsed.lines]
    .sort((a, b) => b.length - a.length)
    .slice(0, count);
}
