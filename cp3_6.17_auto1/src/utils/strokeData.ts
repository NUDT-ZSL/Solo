export interface Stroke {
  id: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  direction: string;
  control?: { x: number; y: number };
}

const strokeDatabase: Record<string, Stroke[]> = {
  '大': [
    { id: 1, start: { x: 200, y: 160 }, end: { x: 440, y: 160 }, direction: '横' },
    { id: 2, start: { x: 320, y: 160 }, end: { x: 200, y: 380 }, direction: '撇', control: { x: 260, y: 270 } },
    { id: 3, start: { x: 320, y: 160 }, end: { x: 440, y: 380 }, direction: '捺', control: { x: 380, y: 270 } },
  ],
  '小': [
    { id: 1, start: { x: 320, y: 120 }, end: { x: 320, y: 360 }, direction: '竖钩', control: { x: 320, y: 340 } },
    { id: 2, start: { x: 320, y: 240 }, end: { x: 210, y: 340 }, direction: '撇', control: { x: 260, y: 290 } },
    { id: 3, start: { x: 320, y: 240 }, end: { x: 430, y: 340 }, direction: '点' },
  ],
  '上': [
    { id: 1, start: { x: 320, y: 120 }, end: { x: 320, y: 280 }, direction: '竖' },
    { id: 2, start: { x: 230, y: 200 }, end: { x: 410, y: 200 }, direction: '横' },
    { id: 3, start: { x: 200, y: 340 }, end: { x: 440, y: 340 }, direction: '横' },
  ],
  '下': [
    { id: 1, start: { x: 200, y: 140 }, end: { x: 440, y: 140 }, direction: '横' },
    { id: 2, start: { x: 320, y: 140 }, end: { x: 320, y: 360 }, direction: '竖' },
    { id: 3, start: { x: 320, y: 260 }, end: { x: 420, y: 340 }, direction: '点' },
  ],
  '中': [
    { id: 1, start: { x: 320, y: 100 }, end: { x: 320, y: 380 }, direction: '竖' },
    { id: 2, start: { x: 210, y: 140 }, end: { x: 210, y: 340 }, direction: '竖折', control: { x: 210, y: 340 } },
    { id: 3, start: { x: 210, y: 340 }, end: { x: 430, y: 340 }, direction: '横' },
    { id: 4, start: { x: 430, y: 140 }, end: { x: 430, y: 340 }, direction: '竖' },
    { id: 5, start: { x: 210, y: 140 }, end: { x: 430, y: 140 }, direction: '横' },
  ],
  '人': [
    { id: 1, start: { x: 320, y: 120 }, end: { x: 200, y: 380 }, direction: '撇', control: { x: 260, y: 250 } },
    { id: 2, start: { x: 320, y: 120 }, end: { x: 440, y: 380 }, direction: '捺', control: { x: 380, y: 250 } },
  ],
  '水': [
    { id: 1, start: { x: 320, y: 100 }, end: { x: 320, y: 380 }, direction: '竖钩', control: { x: 320, y: 360 } },
    { id: 2, start: { x: 320, y: 200 }, end: { x: 210, y: 280 }, direction: '横撇', control: { x: 260, y: 200 } },
    { id: 3, start: { x: 260, y: 280 }, end: { x: 190, y: 360 }, direction: '撇', control: { x: 220, y: 320 } },
    { id: 4, start: { x: 320, y: 260 }, end: { x: 440, y: 360 }, direction: '捺', control: { x: 380, y: 310 } },
  ],
  '火': [
    { id: 1, start: { x: 270, y: 180 }, end: { x: 240, y: 230 }, direction: '点' },
    { id: 2, start: { x: 320, y: 120 }, end: { x: 210, y: 340 }, direction: '撇', control: { x: 260, y: 230 } },
    { id: 3, start: { x: 370, y: 180 }, end: { x: 400, y: 230 }, direction: '点' },
    { id: 4, start: { x: 320, y: 180 }, end: { x: 440, y: 340 }, direction: '捺', control: { x: 380, y: 260 } },
  ],
  '山': [
    { id: 1, start: { x: 320, y: 120 }, end: { x: 320, y: 380 }, direction: '竖' },
    { id: 2, start: { x: 200, y: 220 }, end: { x: 200, y: 380 }, direction: '竖折', control: { x: 200, y: 380 } },
    { id: 3, start: { x: 200, y: 380 }, end: { x: 440, y: 380 }, direction: '横' },
    { id: 4, start: { x: 440, y: 220 }, end: { x: 440, y: 380 }, direction: '竖' },
  ],
  '石': [
    { id: 1, start: { x: 200, y: 140 }, end: { x: 440, y: 140 }, direction: '横' },
    { id: 2, start: { x: 320, y: 140 }, end: { x: 200, y: 300 }, direction: '撇', control: { x: 260, y: 220 } },
    { id: 3, start: { x: 250, y: 240 }, end: { x: 250, y: 380 }, direction: '竖' },
    { id: 4, start: { x: 250, y: 240 }, end: { x: 400, y: 240 }, direction: '横折', control: { x: 400, y: 240 } },
    { id: 5, start: { x: 400, y: 240 }, end: { x: 400, y: 380 }, direction: '竖' },
    { id: 6, start: { x: 250, y: 380 }, end: { x: 400, y: 380 }, direction: '横' },
  ],
};

export function getStrokeData(char: string): Stroke[] | null {
  return strokeDatabase[char] || null;
}

export function getStrokeDataForString(str: string): { char: string; strokes: Stroke[] }[] {
  const chars = str.slice(0, 4).split('');
  const result: { char: string; strokes: Stroke[] }[] = [];
  
  for (const char of chars) {
    const strokes = getStrokeData(char);
    if (strokes) {
      result.push({ char, strokes });
    }
  }
  
  return result;
}
