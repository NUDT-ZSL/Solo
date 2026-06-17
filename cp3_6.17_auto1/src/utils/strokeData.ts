export interface Stroke {
  id: number;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX?: number;
  controlY?: number;
  type: 'line' | 'curve';
}

export interface CharacterStrokes {
  character: string;
  strokes: Stroke[];
}

const canvasWidth = 640;
const canvasHeight = 480;
const cx = canvasWidth / 2;
const cy = canvasHeight / 2;

const strokeDatabase: Record<string, Stroke[]> = {
  '大': [
    { id: 1, name: '横', startX: cx - 140, startY: cy - 100, endX: cx + 140, endY: cy - 100, type: 'line' },
    { id: 2, name: '撇', startX: cx, startY: cy - 100, endX: cx - 150, endY: cy + 130, type: 'curve', controlX: cx - 80, controlY: cy + 20 },
    { id: 3, name: '捺', startX: cx, startY: cy - 100, endX: cx + 160, endY: cy + 130, type: 'curve', controlX: cx + 90, controlY: cy + 20 },
  ],
  '小': [
    { id: 1, name: '竖钩', startX: cx, startY: cy - 130, endX: cx, endY: cy + 120, type: 'curve', controlX: cx - 10, controlY: cy + 80 },
    { id: 2, name: '点', startX: cx - 90, startY: cy - 50, endX: cx - 60, endY: cy - 10, type: 'line' },
    { id: 3, name: '点', startX: cx + 90, startY: cy - 50, endX: cx + 60, endY: cy - 10, type: 'line' },
  ],
  '上': [
    { id: 1, name: '竖', startX: cx, startY: cy - 130, endX: cx, endY: cy + 30, type: 'line' },
    { id: 2, name: '横', startX: cx - 110, startY: cy - 60, endX: cx + 110, endY: cy - 60, type: 'line' },
    { id: 3, name: '横', startX: cx - 150, startY: cy + 100, endX: cx + 150, endY: cy + 100, type: 'line' },
  ],
  '下': [
    { id: 1, name: '横', startX: cx - 150, startY: cy - 100, endX: cx + 150, endY: cy - 100, type: 'line' },
    { id: 2, name: '竖', startX: cx, startY: cy - 100, endX: cx, endY: cy + 110, type: 'line' },
    { id: 3, name: '点', startX: cx + 30, startY: cy - 10, endX: cx + 80, endY: cy + 50, type: 'line' },
  ],
  '中': [
    { id: 1, name: '竖', startX: cx, startY: cy - 160, endX: cx, endY: cy + 160, type: 'line' },
    { id: 2, name: '横折', startX: cx - 130, startY: cy - 90, endX: cx - 130, endY: cy + 90, type: 'line' },
    { id: 3, name: '横', startX: cx - 130, startY: cy - 90, endX: cx + 130, endY: cy - 90, type: 'line' },
    { id: 4, name: '竖', startX: cx + 130, startY: cy - 90, endX: cx + 130, endY: cy + 90, type: 'line' },
    { id: 5, name: '横', startX: cx - 130, startY: cy + 90, endX: cx + 130, endY: cy + 90, type: 'line' },
  ],
  '人': [
    { id: 1, name: '撇', startX: cx, startY: cy - 130, endX: cx - 140, endY: cy + 140, type: 'curve', controlX: cx - 70, controlY: cy + 10 },
    { id: 2, name: '捺', startX: cx, startY: cy - 130, endX: cx + 150, endY: cy + 140, type: 'curve', controlX: cx + 80, controlY: cy + 10 },
  ],
  '水': [
    { id: 1, name: '竖钩', startX: cx, startY: cy - 150, endX: cx, endY: cy + 140, type: 'curve', controlX: cx - 12, controlY: cy + 100 },
    { id: 2, name: '横撇', startX: cx - 10, startY: cy - 50, endX: cx - 130, endY: cy + 50, type: 'curve', controlX: cx - 70, controlY: cy - 20 },
    { id: 3, name: '撇', startX: cx - 30, startY: cy + 30, endX: cx - 100, endY: cy + 130, type: 'line' },
    { id: 4, name: '捺', startX: cx + 10, startY: cy + 30, endX: cx + 140, endY: cy + 130, type: 'curve', controlX: cx + 80, controlY: cy + 70 },
  ],
  '火': [
    { id: 1, name: '点', startX: cx - 100, startY: cy - 80, endX: cx - 70, endY: cy - 30, type: 'line' },
    { id: 2, name: '撇', startX: cx - 10, startY: cy - 120, endX: cx - 130, endY: cy + 60, type: 'curve', controlX: cx - 80, controlY: cy - 20 },
    { id: 3, name: '撇', startX: cx + 20, startY: cy - 80, endX: cx - 40, endY: cy + 140, type: 'curve', controlX: cx - 30, controlY: cy + 40 },
    { id: 4, name: '捺', startX: cx + 20, startY: cy - 80, endX: cx + 140, endY: cy + 140, type: 'curve', controlX: cx + 90, controlY: cy + 40 },
  ],
  '山': [
    { id: 1, name: '竖', startX: cx, startY: cy - 150, endX: cx, endY: cy + 110, type: 'line' },
    { id: 2, name: '竖折', startX: cx - 130, startY: cy - 60, endX: cx - 130, endY: cy + 110, type: 'line' },
    { id: 3, name: '横', startX: cx - 130, startY: cy + 110, endX: cx + 130, endY: cy + 110, type: 'line' },
    { id: 4, name: '竖', startX: cx + 130, startY: cy - 60, endX: cx + 130, endY: cy + 110, type: 'line' },
  ],
  '石': [
    { id: 1, name: '横', startX: cx - 130, startY: cy - 130, endX: cx + 130, endY: cy - 130, type: 'line' },
    { id: 2, name: '撇', startX: cx, startY: cy - 130, endX: cx - 130, endY: cy + 40, type: 'curve', controlX: cx - 80, controlY: cy - 40 },
    { id: 3, name: '竖', startX: cx - 50, startY: cy - 30, endX: cx - 50, endY: cy + 130, type: 'line' },
    { id: 4, name: '横折', startX: cx - 50, startY: cy - 30, endX: cx - 50, endY: cy + 130, type: 'line' },
    { id: 5, name: '横', startX: cx - 50, startY: cy - 30, endX: cx + 100, endY: cy - 30, type: 'line' },
    { id: 6, name: '竖', startX: cx + 100, startY: cy - 30, endX: cx + 100, endY: cy + 130, type: 'line' },
    { id: 7, name: '横', startX: cx - 50, startY: cy + 130, endX: cx + 100, endY: cy + 130, type: 'line' },
  ],
};

export function getStrokeData(characters: string): CharacterStrokes[] {
  const result: CharacterStrokes[] = [];
  const chars = characters.slice(0, 4).split('');

  const spacing = chars.length > 1 ? canvasWidth / chars.length : canvasWidth;
  const offsetX = chars.length > 1 ? spacing / 2 - cx : 0;

  chars.forEach((char, index) => {
    const baseStrokes = strokeDatabase[char];
    if (baseStrokes) {
      const charOffsetX = chars.length > 1 ? index * spacing : 0;
      const scale = chars.length > 1 ? 0.7 : 1;

      const adjustedStrokes: Stroke[] = baseStrokes.map((stroke) => ({
        ...stroke,
        startX: (stroke.startX - cx) * scale + cx + charOffsetX + offsetX,
        startY: (stroke.startY - cy) * scale + cy,
        endX: (stroke.endX - cx) * scale + cx + charOffsetX + offsetX,
        endY: (stroke.endY - cy) * scale + cy,
        controlX: stroke.controlX !== undefined ? (stroke.controlX - cx) * scale + cx + charOffsetX + offsetX : undefined,
        controlY: stroke.controlY !== undefined ? (stroke.controlY - cy) * scale + cy : undefined,
      }));
      result.push({ character: char, strokes: adjustedStrokes });
    }
  });

  return result;
}

export function getAllStrokes(characters: string): Stroke[] {
  return getStrokeData(characters).flatMap((cs) => cs.strokes);
}

export function getSupportedCharacters(): string[] {
  return Object.keys(strokeDatabase);
}
