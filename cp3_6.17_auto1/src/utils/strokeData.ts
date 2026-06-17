export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: number;
  startPoint: StrokePoint;
  endPoint: StrokePoint;
  controlPoints?: StrokePoint[];
  direction: string;
  type: 'line' | 'curve';
}

export interface CharacterStrokes {
  character: string;
  strokes: Stroke[];
  totalStrokes: number;
  offsetX: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const SINGLE_CHAR_WIDTH = CANVAS_WIDTH;

const buildCharDatabase = (): Record<string, Omit<CharacterStrokes, 'offsetX'> & { offsetX?: number }> => {
  const cx = SINGLE_CHAR_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;

  return {
    '大': {
      character: '大',
      totalStrokes: 3,
      strokes: [
        { id: 1, type: 'line', direction: '横', startPoint: { x: cx - 140, y: cy - 100 }, endPoint: { x: cx + 140, y: cy - 100 } },
        { id: 2, type: 'line', direction: '撇', startPoint: { x: cx, y: cy - 180 }, endPoint: { x: cx - 150, y: cy + 160 } },
        { id: 3, type: 'line', direction: '捺', startPoint: { x: cx, y: cy - 180 }, endPoint: { x: cx + 160, y: cy + 160 } },
      ],
    },
    '小': {
      character: '小',
      totalStrokes: 3,
      strokes: [
        { id: 1, type: 'line', direction: '竖钩', startPoint: { x: cx, y: cy - 150 }, endPoint: { x: cx, y: cy + 150 } },
        { id: 2, type: 'line', direction: '左点', startPoint: { x: cx - 120, y: cy - 40 }, endPoint: { x: cx - 80, y: cy + 50 } },
        { id: 3, type: 'line', direction: '右点', startPoint: { x: cx + 120, y: cy - 40 }, endPoint: { x: cx + 80, y: cy + 50 } },
      ],
    },
    '上': {
      character: '上',
      totalStrokes: 3,
      strokes: [
        { id: 1, type: 'line', direction: '竖', startPoint: { x: cx, y: cy - 150 }, endPoint: { x: cx, y: cy + 100 } },
        { id: 2, type: 'line', direction: '短横', startPoint: { x: cx - 80, y: cy - 60 }, endPoint: { x: cx + 80, y: cy - 60 } },
        { id: 3, type: 'line', direction: '长横', startPoint: { x: cx - 160, y: cy + 140 }, endPoint: { x: cx + 160, y: cy + 140 } },
      ],
    },
    '下': {
      character: '下',
      totalStrokes: 3,
      strokes: [
        { id: 1, type: 'line', direction: '横', startPoint: { x: cx - 160, y: cy - 140 }, endPoint: { x: cx + 160, y: cy - 140 } },
        { id: 2, type: 'line', direction: '竖', startPoint: { x: cx, y: cy - 140 }, endPoint: { x: cx, y: cy + 120 } },
        { id: 3, type: 'line', direction: '点', startPoint: { x: cx + 40, y: cy - 20 }, endPoint: { x: cx + 100, y: cy + 60 } },
      ],
    },
    '中': {
      character: '中',
      totalStrokes: 4,
      strokes: [
        { id: 1, type: 'line', direction: '竖', startPoint: { x: cx, y: cy - 180 }, endPoint: { x: cx, y: cy + 180 } },
        { id: 2, type: 'line', direction: '横折', startPoint: { x: cx - 140, y: cy - 120 }, endPoint: { x: cx - 140, y: cy + 120 } },
        { id: 3, type: 'line', direction: '横', startPoint: { x: cx - 140, y: cy - 120 }, endPoint: { x: cx + 140, y: cy - 120 } },
        { id: 4, type: 'line', direction: '竖', startPoint: { x: cx + 140, y: cy - 120 }, endPoint: { x: cx + 140, y: cy + 120 } },
      ],
    },
    '人': {
      character: '人',
      totalStrokes: 2,
      strokes: [
        { id: 1, type: 'line', direction: '撇', startPoint: { x: cx, y: cy - 160 }, endPoint: { x: cx - 160, y: cy + 170 } },
        { id: 2, type: 'line', direction: '捺', startPoint: { x: cx, y: cy - 160 }, endPoint: { x: cx + 170, y: cy + 170 } },
      ],
    },
    '水': {
      character: '水',
      totalStrokes: 4,
      strokes: [
        { id: 1, type: 'line', direction: '竖钩', startPoint: { x: cx, y: cy - 170 }, endPoint: { x: cx, y: cy + 170 } },
        { id: 2, type: 'curve', direction: '横撇', startPoint: { x: cx - 50, y: cy - 100 }, endPoint: { x: cx - 160, y: cy + 80 }, controlPoints: [{ x: cx - 100, y: cy - 80 }] },
        { id: 3, type: 'line', direction: '撇', startPoint: { x: cx - 30, y: cy - 20 }, endPoint: { x: cx - 140, y: cy + 160 } },
        { id: 4, type: 'line', direction: '捺', startPoint: { x: cx + 30, y: cy - 20 }, endPoint: { x: cx + 170, y: cy + 160 } },
      ],
    },
    '火': {
      character: '火',
      totalStrokes: 4,
      strokes: [
        { id: 1, type: 'line', direction: '左点', startPoint: { x: cx - 130, y: cy - 60 }, endPoint: { x: cx - 90, y: cy + 20 } },
        { id: 2, type: 'line', direction: '右点', startPoint: { x: cx + 130, y: cy - 60 }, endPoint: { x: cx + 90, y: cy + 20 } },
        { id: 3, type: 'line', direction: '撇', startPoint: { x: cx, y: cy - 160 }, endPoint: { x: cx - 140, y: cy + 170 } },
        { id: 4, type: 'line', direction: '捺', startPoint: { x: cx, y: cy - 160 }, endPoint: { x: cx + 150, y: cy + 170 } },
      ],
    },
    '山': {
      character: '山',
      totalStrokes: 3,
      strokes: [
        { id: 1, type: 'line', direction: '中竖', startPoint: { x: cx, y: cy - 170 }, endPoint: { x: cx, y: cy + 150 } },
        { id: 2, type: 'line', direction: '竖折', startPoint: { x: cx - 150, y: cy - 80 }, endPoint: { x: cx - 150, y: cy + 150 } },
        { id: 3, type: 'line', direction: '右竖', startPoint: { x: cx + 150, y: cy - 80 }, endPoint: { x: cx + 150, y: cy + 150 } },
      ],
    },
    '石': {
      character: '石',
      totalStrokes: 5,
      strokes: [
        { id: 1, type: 'line', direction: '横', startPoint: { x: cx - 150, y: cy - 150 }, endPoint: { x: cx + 150, y: cy - 150 } },
        { id: 2, type: 'line', direction: '撇', startPoint: { x: cx - 40, y: cy - 150 }, endPoint: { x: cx - 170, y: cy + 20 } },
        { id: 3, type: 'line', direction: '竖', startPoint: { x: cx - 50, y: cy - 60 }, endPoint: { x: cx - 50, y: cy + 150 } },
        { id: 4, type: 'line', direction: '横折', startPoint: { x: cx - 50, y: cy - 60 }, endPoint: { x: cx + 110, y: cy - 60 } },
        { id: 5, type: 'line', direction: '横', startPoint: { x: cx + 110, y: cy - 60 }, endPoint: { x: cx + 110, y: cy + 150 } },
      ],
    },
  };
};

const DATABASE = buildCharDatabase();
export const SUPPORTED_CHARACTERS = Object.keys(DATABASE);

export function isCharacterSupported(char: string): boolean {
  return Object.prototype.hasOwnProperty.call(DATABASE, char);
}

export function getSingleCharacterStroke(char: string): CharacterStrokes | null {
  const raw = DATABASE[char];
  if (!raw) return null;
  return {
    character: raw.character,
    strokes: raw.strokes,
    totalStrokes: raw.totalStrokes,
    offsetX: raw.offsetX ?? 0,
  };
}

export function getCharacterStrokes(characters: string): CharacterStrokes[] {
  const result: CharacterStrokes[] = [];
  const chars = Array.from(characters).slice(0, 4);
  const charCount = chars.length;
  if (charCount === 0) return result;

  const layoutWidth = SINGLE_CHAR_WIDTH / charCount;
  const paddingX = layoutWidth * 0.08;
  const effectiveWidth = layoutWidth - paddingX * 2;
  const scale = effectiveWidth / SINGLE_CHAR_WIDTH;
  const scaleY = 0.9;

  chars.forEach((ch, idx) => {
    const raw = DATABASE[ch];
    const centerX = layoutWidth * idx + layoutWidth / 2;
    const offsetX = centerX - (SINGLE_CHAR_WIDTH / 2) * scale;
    const offsetY = (CANVAS_HEIGHT - CANVAS_HEIGHT * scaleY) / 2;

    if (!raw) {
      result.push({
        character: ch,
        strokes: [],
        totalStrokes: 0,
        offsetX: 0,
      });
      return;
    }

    const transformedStrokes: Stroke[] = raw.strokes.map((s) => {
      const transform = (p: StrokePoint): StrokePoint => ({
        x: offsetX + p.x * scale,
        y: offsetY + p.y * scaleY,
      });
      return {
        ...s,
        startPoint: transform(s.startPoint),
        endPoint: transform(s.endPoint),
        controlPoints: s.controlPoints?.map(transform),
      };
    });

    result.push({
      character: raw.character,
      strokes: transformedStrokes,
      totalStrokes: raw.totalStrokes,
      offsetX,
    });
  });

  return result;
}
