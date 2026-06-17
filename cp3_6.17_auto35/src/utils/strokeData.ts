export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: number;
  strokeNumber: number;
  direction: string;
  points: StrokePoint[];
}

export interface CharacterStrokes {
  character: string;
  strokes: Stroke[];
}

const strokeDatabase: Record<string, Stroke[]> = {
  '大': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '横',
      points: [
        { x: 180, y: 180 },
        { x: 460, y: 180 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '撇',
      points: [
        { x: 320, y: 100 },
        { x: 320, y: 200 },
        { x: 200, y: 380 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '捺',
      points: [
        { x: 320, y: 200 },
        { x: 440, y: 380 }
      ]
    }
  ],
  '小': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '竖钩',
      points: [
        { x: 320, y: 120 },
        { x: 320, y: 340 },
        { x: 300, y: 360 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '撇',
      points: [
        { x: 280, y: 220 },
        { x: 180, y: 340 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '点',
      points: [
        { x: 380, y: 220 },
        { x: 440, y: 300 }
      ]
    }
  ],
  '上': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '竖',
      points: [
        { x: 320, y: 120 },
        { x: 320, y: 300 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '横',
      points: [
        { x: 220, y: 220 },
        { x: 420, y: 220 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '横',
      points: [
        { x: 180, y: 360 },
        { x: 460, y: 360 }
      ]
    }
  ],
  '下': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '横',
      points: [
        { x: 180, y: 140 },
        { x: 460, y: 140 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '竖',
      points: [
        { x: 320, y: 140 },
        { x: 320, y: 340 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '点',
      points: [
        { x: 360, y: 260 },
        { x: 420, y: 340 }
      ]
    }
  ],
  '中': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '竖',
      points: [
        { x: 320, y: 80 },
        { x: 320, y: 400 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '横折',
      points: [
        { x: 200, y: 160 },
        { x: 440, y: 160 },
        { x: 440, y: 320 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '横',
      points: [
        { x: 200, y: 320 },
        { x: 440, y: 320 }
      ]
    },
    {
      id: 4,
      strokeNumber: 4,
      direction: '竖',
      points: [
        { x: 200, y: 160 },
        { x: 200, y: 320 }
      ]
    }
  ],
  '人': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '撇',
      points: [
        { x: 320, y: 100 },
        { x: 320, y: 200 },
        { x: 180, y: 400 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '捺',
      points: [
        { x: 320, y: 200 },
        { x: 460, y: 400 }
      ]
    }
  ],
  '水': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '竖钩',
      points: [
        { x: 320, y: 80 },
        { x: 320, y: 360 },
        { x: 300, y: 380 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '横撇',
      points: [
        { x: 320, y: 180 },
        { x: 260, y: 180 },
        { x: 180, y: 280 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '撇',
      points: [
        { x: 300, y: 260 },
        { x: 200, y: 400 }
      ]
    },
    {
      id: 4,
      strokeNumber: 4,
      direction: '捺',
      points: [
        { x: 340, y: 260 },
        { x: 460, y: 400 }
      ]
    }
  ],
  '火': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '点',
      points: [
        { x: 220, y: 180 },
        { x: 240, y: 240 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '撇',
      points: [
        { x: 320, y: 100 },
        { x: 320, y: 220 },
        { x: 200, y: 400 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '撇',
      points: [
        { x: 340, y: 220 },
        { x: 420, y: 360 }
      ]
    },
    {
      id: 4,
      strokeNumber: 4,
      direction: '捺',
      points: [
        { x: 340, y: 240 },
        { x: 460, y: 400 }
      ]
    }
  ],
  '山': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '竖',
      points: [
        { x: 320, y: 100 },
        { x: 320, y: 380 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '竖折',
      points: [
        { x: 180, y: 200 },
        { x: 180, y: 380 },
        { x: 460, y: 380 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '竖',
      points: [
        { x: 460, y: 200 },
        { x: 460, y: 380 }
      ]
    }
  ],
  '石': [
    {
      id: 1,
      strokeNumber: 1,
      direction: '横',
      points: [
        { x: 180, y: 120 },
        { x: 420, y: 120 }
      ]
    },
    {
      id: 2,
      strokeNumber: 2,
      direction: '撇',
      points: [
        { x: 300, y: 120 },
        { x: 300, y: 200 },
        { x: 180, y: 340 }
      ]
    },
    {
      id: 3,
      strokeNumber: 3,
      direction: '竖',
      points: [
        { x: 260, y: 240 },
        { x: 260, y: 380 }
      ]
    },
    {
      id: 4,
      strokeNumber: 4,
      direction: '横折',
      points: [
        { x: 260, y: 240 },
        { x: 440, y: 240 },
        { x: 440, y: 380 }
      ]
    },
    {
      id: 5,
      strokeNumber: 5,
      direction: '横',
      points: [
        { x: 260, y: 380 },
        { x: 440, y: 380 }
      ]
    }
  ]
};

export function getCharacterStrokes(input: string): CharacterStrokes[] {
  const result: CharacterStrokes[] = [];
  const chars = input.slice(0, 4).split('');

  for (const char of chars) {
    if (strokeDatabase[char]) {
      result.push({
        character: char,
        strokes: strokeDatabase[char]
      });
    }
  }

  return result;
}

export function getSupportedCharacters(): string[] {
  return Object.keys(strokeDatabase);
}
