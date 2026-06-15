export interface RawEntry {
  date: string;
  text: string;
}

export interface ProcessedEntry {
  id: string;
  date: Date;
  dateStr: string;
  text: string;
  summary: string;
  sentiment: number;
  month: number;
  inkSize: number;
}

const POSITIVE_KEYWORDS = [
  '开心', '快乐', '幸福', '美好', '喜欢', '爱', '感谢', '感恩', '棒', '赞',
  '精彩', '温暖', '满足', '期待', '希望', '成功', '胜利', '阳光', '微笑',
  '快乐', '欣慰', '感动', '甜蜜', '欣喜', '欢乐', '庆祝', '骄傲', '自豪',
  'happy', 'joy', 'love', 'great', 'wonderful', 'amazing', 'grateful', 'hope',
  'excited', 'beautiful', 'awesome', 'fantastic', 'blessed',
];

const NEGATIVE_KEYWORDS = [
  '难过', '伤心', '悲伤', '痛苦', '失望', '焦虑', '烦恼', '沮丧', '孤独',
  '寂寞', '害怕', '恐惧', '愤怒', '讨厌', '厌倦', '绝望', '崩溃', '疲惫',
  '郁闷', '忧伤', '惆怅', '无助', '迷茫', '无奈', '遗憾', '惋惜',
  'sad', 'angry', 'hate', 'fear', 'pain', 'depressed', 'anxious', 'lonely',
  'disappointed', 'frustrated', 'hopeless', 'tired', 'awful', 'terrible',
];

function analyzeSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  let count = 0;
  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 1;
      count += 1;
    }
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) {
      score -= 1;
      count += 1;
    }
  }
  if (count === 0) return 0.5;
  const raw = (score / count + 1) / 2;
  return Math.max(0, Math.min(1, raw));
}

function generateSummary(text: string): string {
  const maxLen = 50;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + '…';
}

function calcInkSize(text: string): number {
  const len = text.length;
  const minSize = 24;
  const maxSize = 64;
  const t = Math.min(len / 500, 1);
  return minSize + t * (maxSize - minSize);
}

export function processData(raw: RawEntry[]): ProcessedEntry[] {
  return raw
    .map((entry, idx) => {
      let date: Date;
      try {
        date = new Date(entry.date);
        if (isNaN(date.getTime())) return null;
      } catch {
        return null;
      }
      return {
        id: `entry-${idx}-${entry.date}`,
        date,
        dateStr: entry.date,
        text: entry.text,
        summary: generateSummary(entry.text),
        sentiment: analyzeSentiment(entry.text),
        month: date.getMonth() + 1,
        inkSize: calcInkSize(entry.text),
      };
    })
    .filter((e): e is ProcessedEntry => e !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function sentimentToColor(sentiment: number): string {
  const r = Math.round(60 + sentiment * 160);
  const g = Math.round(80 + sentiment * 60 - (1 - sentiment) * 40);
  const b = Math.round(160 - sentiment * 120);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getMonthlyStats(entries: ProcessedEntry[]): { month: number; count: number; avgSentiment: number }[] {
  const map = new Map<number, { total: number; count: number; sentimentSum: number }>();
  for (const e of entries) {
    const existing = map.get(e.month) || { total: 0, count: 0, sentimentSum: 0 };
    existing.count += 1;
    existing.sentimentSum += e.sentiment;
    map.set(e.month, existing);
  }
  const result: { month: number; count: number; avgSentiment: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const data = map.get(m);
    result.push({
      month: m,
      count: data?.count ?? 0,
      avgSentiment: data ? data.sentimentSum / data.count : 0.5,
    });
  }
  return result;
}
