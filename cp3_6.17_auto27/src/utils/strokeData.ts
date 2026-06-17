export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: number;
  points: Point[];
  direction: string;
}

const strokeDatabase: Record<string, Stroke[]> = {
  '大': [
    { id: 1, points: [{ x: 15, y: 35 }, { x: 85, y: 35 }], direction: '横' },
    { id: 2, points: [{ x: 50, y: 10 }, { x: 20, y: 85 }], direction: '撇' },
    { id: 3, points: [{ x: 50, y: 10 }, { x: 80, y: 85 }], direction: '捺' },
  ],
  '小': [
    { id: 1, points: [{ x: 50, y: 15 }, { x: 50, y: 70 }, { x: 42, y: 80 }], direction: '竖钩' },
    { id: 2, points: [{ x: 35, y: 45 }, { x: 18, y: 70 }], direction: '撇' },
    { id: 3, points: [{ x: 65, y: 45 }, { x: 82, y: 62 }], direction: '点' },
  ],
  '上': [
    { id: 1, points: [{ x: 50, y: 15 }, { x: 50, y: 75 }], direction: '竖' },
    { id: 2, points: [{ x: 25, y: 45 }, { x: 75, y: 45 }], direction: '横' },
    { id: 3, points: [{ x: 15, y: 75 }, { x: 85, y: 75 }], direction: '横' },
  ],
  '下': [
    { id: 1, points: [{ x: 15, y: 25 }, { x: 85, y: 25 }], direction: '横' },
    { id: 2, points: [{ x: 50, y: 25 }, { x: 50, y: 80 }], direction: '竖' },
    { id: 3, points: [{ x: 60, y: 55 }, { x: 78, y: 70 }], direction: '点' },
  ],
  '中': [
    { id: 1, points: [{ x: 25, y: 20 }, { x: 25, y: 65 }], direction: '竖' },
    { id: 2, points: [{ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 75, y: 65 }], direction: '横折' },
    { id: 3, points: [{ x: 25, y: 65 }, { x: 75, y: 65 }], direction: '横' },
    { id: 4, points: [{ x: 50, y: 10 }, { x: 50, y: 90 }], direction: '竖' },
  ],
  '人': [
    { id: 1, points: [{ x: 50, y: 12 }, { x: 22, y: 85 }], direction: '撇' },
    { id: 2, points: [{ x: 50, y: 12 }, { x: 78, y: 85 }], direction: '捺' },
  ],
  '水': [
    { id: 1, points: [{ x: 50, y: 10 }, { x: 50, y: 70 }, { x: 40, y: 82 }], direction: '竖钩' },
    { id: 2, points: [{ x: 45, y: 30 }, { x: 20, y: 45 }], direction: '横撇' },
    { id: 3, points: [{ x: 35, y: 50 }, { x: 15, y: 75 }], direction: '撇' },
    { id: 4, points: [{ x: 55, y: 50 }, { x: 82, y: 78 }], direction: '捺' },
  ],
  '火': [
    { id: 1, points: [{ x: 32, y: 35 }, { x: 22, y: 50 }], direction: '点' },
    { id: 2, points: [{ x: 68, y: 35 }, { x: 78, y: 50 }], direction: '点' },
    { id: 3, points: [{ x: 50, y: 18 }, { x: 25, y: 82 }], direction: '撇' },
    { id: 4, points: [{ x: 50, y: 18 }, { x: 75, y: 82 }], direction: '捺' },
  ],
  '山': [
    { id: 1, points: [{ x: 50, y: 12 }, { x: 50, y: 85 }], direction: '竖' },
    { id: 2, points: [{ x: 18, y: 40 }, { x: 18, y: 85 }, { x: 82, y: 85 }], direction: '竖折' },
    { id: 3, points: [{ x: 82, y: 40 }, { x: 82, y: 85 }], direction: '竖' },
  ],
  '石': [
    { id: 1, points: [{ x: 15, y: 18 }, { x: 85, y: 18 }], direction: '横' },
    { id: 2, points: [{ x: 28, y: 18 }, { x: 12, y: 50 }], direction: '撇' },
    { id: 3, points: [{ x: 38, y: 35 }, { x: 38, y: 82 }], direction: '竖' },
    { id: 4, points: [{ x: 38, y: 35 }, { x: 80, y: 35 }, { x: 80, y: 82 }], direction: '横折' },
    { id: 5, points: [{ x: 38, y: 82 }, { x: 80, y: 82 }], direction: '横' },
  ],
};

export function getStrokeData(char: string): Stroke[] {
  return strokeDatabase[char] || [];
}

export function getSupportedChars(): string[] {
  return Object.keys(strokeDatabase);
}

export function isCharSupported(char: string): boolean {
  return char in strokeDatabase;
}

export function getStrokesForText(text: string): { char: string; strokes: Stroke[] }[] {
  const result: { char: string; strokes: Stroke[] }[] = [];
  for (const char of text) {
    const strokes = getStrokeData(char);
    if (strokes.length > 0) {
      result.push({ char, strokes });
    }
  }
  return result;
}
