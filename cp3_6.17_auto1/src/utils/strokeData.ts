export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: number;
  startPoint: Point;
  endPoint: Point;
  controlPoints?: Point[];
  direction: string;
  path: string;
}

export interface CharacterStrokes {
  char: string;
  strokes: Stroke[];
  offsetX: number;
  offsetY: number;
  scale: number;
}

const strokeDatabase: Record<string, Omit<CharacterStrokes, 'char'>> = {
  '大': {
    offsetX: 170,
    offsetY: 90,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 80, y: 60 },
        endPoint: { x: 240, y: 60 },
        direction: '横',
        path: 'M 80 60 L 240 60'
      },
      {
        id: 2,
        startPoint: { x: 160, y: 30 },
        endPoint: { x: 60, y: 280 },
        direction: '撇',
        controlPoints: [{ x: 140, y: 120 }, { x: 100, y: 200 }],
        path: 'M 160 30 C 140 120, 100 200, 60 280'
      },
      {
        id: 3,
        startPoint: { x: 160, y: 30 },
        endPoint: { x: 270, y: 280 },
        direction: '捺',
        controlPoints: [{ x: 180, y: 120 }, { x: 230, y: 200 }],
        path: 'M 160 30 C 180 120, 230 200, 270 280'
      }
    ]
  },
  '小': {
    offsetX: 190,
    offsetY: 120,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 130, y: 30 },
        endPoint: { x: 130, y: 220 },
        direction: '竖钩',
        controlPoints: [{ x: 130, y: 180 }, { x: 115, y: 210 }],
        path: 'M 130 30 L 130 200 Q 130 220, 110 215'
      },
      {
        id: 2,
        startPoint: { x: 50, y: 110 },
        endPoint: { x: 110, y: 170 },
        direction: '撇',
        controlPoints: [{ x: 70, y: 130 }, { x: 90, y: 150 }],
        path: 'M 50 110 C 70 130, 90 150, 110 170'
      },
      {
        id: 3,
        startPoint: { x: 210, y: 110 },
        endPoint: { x: 150, y: 170 },
        direction: '点',
        controlPoints: [{ x: 190, y: 130 }, { x: 170, y: 150 }],
        path: 'M 210 110 C 190 130, 170 150, 150 170'
      }
    ]
  },
  '上': {
    offsetX: 190,
    offsetY: 120,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 60, y: 90 },
        endPoint: { x: 200, y: 90 },
        direction: '横',
        path: 'M 60 90 L 200 90'
      },
      {
        id: 2,
        startPoint: { x: 130, y: 30 },
        endPoint: { x: 130, y: 210 },
        direction: '竖',
        path: 'M 130 30 L 130 210'
      },
      {
        id: 3,
        startPoint: { x: 40, y: 210 },
        endPoint: { x: 220, y: 210 },
        direction: '横',
        path: 'M 40 210 L 220 210'
      }
    ]
  },
  '下': {
    offsetX: 190,
    offsetY: 120,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 40, y: 60 },
        endPoint: { x: 220, y: 60 },
        direction: '横',
        path: 'M 40 60 L 220 60'
      },
      {
        id: 2,
        startPoint: { x: 130, y: 60 },
        endPoint: { x: 130, y: 240 },
        direction: '竖',
        path: 'M 130 60 L 130 240'
      },
      {
        id: 3,
        startPoint: { x: 80, y: 160 },
        endPoint: { x: 130, y: 210 },
        direction: '点',
        controlPoints: [{ x: 100, y: 180 }, { x: 120, y: 200 }],
        path: 'M 80 160 C 100 180, 120 200, 130 210'
      }
    ]
  },
  '中': {
    offsetX: 190,
    offsetY: 100,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 60, y: 60 },
        endPoint: { x: 60, y: 240 },
        direction: '竖',
        path: 'M 60 60 L 60 240'
      },
      {
        id: 2,
        startPoint: { x: 60, y: 60 },
        endPoint: { x: 200, y: 60 },
        direction: '横折',
        controlPoints: [{ x: 200, y: 60 }],
        path: 'M 60 60 L 200 60 L 200 240'
      },
      {
        id: 3,
        startPoint: { x: 60, y: 240 },
        endPoint: { x: 200, y: 240 },
        direction: '横',
        path: 'M 60 240 L 200 240'
      },
      {
        id: 4,
        startPoint: { x: 130, y: 30 },
        endPoint: { x: 130, y: 270 },
        direction: '竖',
        path: 'M 130 30 L 130 270'
      }
    ]
  },
  '人': {
    offsetX: 180,
    offsetY: 110,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 140, y: 30 },
        endPoint: { x: 40, y: 280 },
        direction: '撇',
        controlPoints: [{ x: 120, y: 120 }, { x: 80, y: 200 }],
        path: 'M 140 30 C 120 120, 80 200, 40 280'
      },
      {
        id: 2,
        startPoint: { x: 140, y: 30 },
        endPoint: { x: 250, y: 280 },
        direction: '捺',
        controlPoints: [{ x: 160, y: 120 }, { x: 210, y: 200 }],
        path: 'M 140 30 C 160 120, 210 200, 250 280'
      }
    ]
  },
  '水': {
    offsetX: 180,
    offsetY: 90,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 145, y: 30 },
        endPoint: { x: 145, y: 180 },
        direction: '竖钩',
        controlPoints: [{ x: 145, y: 180 }, { x: 130, y: 195 }],
        path: 'M 145 30 L 145 180 Q 145 200, 125 195'
      },
      {
        id: 2,
        startPoint: { x: 130, y: 80 },
        endPoint: { x: 50, y: 150 },
        direction: '横撇',
        controlPoints: [{ x: 100, y: 100 }, { x: 70, y: 120 }],
        path: 'M 130 80 L 90 80 C 70 100, 50 120, 50 150'
      },
      {
        id: 3,
        startPoint: { x: 80, y: 170 },
        endPoint: { x: 40, y: 270 },
        direction: '撇',
        controlPoints: [{ x: 65, y: 210 }, { x: 50, y: 240 }],
        path: 'M 80 170 C 65 210, 50 240, 40 270'
      },
      {
        id: 4,
        startPoint: { x: 170, y: 130 },
        endPoint: { x: 250, y: 270 },
        direction: '捺',
        controlPoints: [{ x: 200, y: 180 }, { x: 230, y: 230 }],
        path: 'M 170 130 C 200 180, 230 230, 250 270'
      }
    ]
  },
  '火': {
    offsetX: 180,
    offsetY: 100,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 70, y: 130 },
        endPoint: { x: 110, y: 190 },
        direction: '点',
        controlPoints: [{ x: 85, y: 150 }, { x: 100, y: 170 }],
        path: 'M 70 130 C 85 150, 100 170, 110 190'
      },
      {
        id: 2,
        startPoint: { x: 220, y: 130 },
        endPoint: { x: 180, y: 190 },
        direction: '点',
        controlPoints: [{ x: 205, y: 150 }, { x: 190, y: 170 }],
        path: 'M 220 130 C 205 150, 190 170, 180 190'
      },
      {
        id: 3,
        startPoint: { x: 145, y: 50 },
        endPoint: { x: 50, y: 290 },
        direction: '撇',
        controlPoints: [{ x: 120, y: 130 }, { x: 80, y: 210 }],
        path: 'M 145 50 C 120 130, 80 210, 50 290'
      },
      {
        id: 4,
        startPoint: { x: 145, y: 50 },
        endPoint: { x: 250, y: 290 },
        direction: '捺',
        controlPoints: [{ x: 170, y: 130 }, { x: 220, y: 210 }],
        path: 'M 145 50 C 170 130, 220 210, 250 290'
      }
    ]
  },
  '山': {
    offsetX: 190,
    offsetY: 120,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 130, y: 40 },
        endPoint: { x: 130, y: 220 },
        direction: '竖',
        path: 'M 130 40 L 130 220'
      },
      {
        id: 2,
        startPoint: { x: 50, y: 110 },
        endPoint: { x: 50, y: 220 },
        direction: '竖折',
        path: 'M 50 110 L 50 220 L 210 220'
      },
      {
        id: 3,
        startPoint: { x: 210, y: 110 },
        endPoint: { x: 210, y: 220 },
        direction: '竖',
        path: 'M 210 110 L 210 220'
      }
    ]
  },
  '石': {
    offsetX: 180,
    offsetY: 110,
    scale: 1,
    strokes: [
      {
        id: 1,
        startPoint: { x: 50, y: 50 },
        endPoint: { x: 230, y: 50 },
        direction: '横',
        path: 'M 50 50 L 230 50'
      },
      {
        id: 2,
        startPoint: { x: 80, y: 50 },
        endPoint: { x: 80, y: 140 },
        direction: '撇',
        controlPoints: [{ x: 80, y: 100 }, { x: 50, y: 140 }],
        path: 'M 80 50 L 80 110 C 70 125, 55 135, 40 140'
      },
      {
        id: 3,
        startPoint: { x: 100, y: 110 },
        endPoint: { x: 200, y: 110 },
        direction: '横',
        path: 'M 100 110 L 200 110'
      },
      {
        id: 4,
        startPoint: { x: 100, y: 110 },
        endPoint: { x: 100, y: 230 },
        direction: '竖',
        path: 'M 100 110 L 100 230'
      },
      {
        id: 5,
        startPoint: { x: 100, y: 230 },
        endPoint: { x: 200, y: 230 },
        direction: '横',
        path: 'M 100 230 L 200 230'
      },
      {
        id: 6,
        startPoint: { x: 200, y: 110 },
        endPoint: { x: 200, y: 230 },
        direction: '竖',
        path: 'M 200 110 L 200 230'
      }
    ]
  }
};

export function getStrokeData(char: string): CharacterStrokes | null {
  const data = strokeDatabase[char];
  if (!data) return null;
  return {
    char,
    ...data
  };
}

export function getStrokesForString(str: string): CharacterStrokes[] {
  const result: CharacterStrokes[] = [];
  for (const char of str) {
    const data = getStrokeData(char);
    if (data) {
      result.push(data);
    }
  }
  return result;
}

export function getSupportedCharacters(): string[] {
  return Object.keys(strokeDatabase);
}
