export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeSegment {
  from: StrokePoint;
  to: StrokePoint;
  control?: StrokePoint;
}

export interface StrokeData {
  id: number;
  segments: StrokeSegment[];
  direction: string;
}

export interface CharacterStrokes {
  char: string;
  strokes: StrokeData[];
}

const database: Record<string, StrokeData[]> = {
  '大': [
    {
      id: 1,
      segments: [{ from: { x: 0.08, y: 0.45 }, to: { x: 0.92, y: 0.45 } }],
      direction: '横',
    },
    {
      id: 2,
      segments: [
        {
          from: { x: 0.48, y: 0.08 },
          to: { x: 0.08, y: 0.92 },
          control: { x: 0.28, y: 0.45 },
        },
      ],
      direction: '撇',
    },
    {
      id: 3,
      segments: [
        {
          from: { x: 0.48, y: 0.08 },
          to: { x: 0.92, y: 0.92 },
          control: { x: 0.68, y: 0.45 },
        },
      ],
      direction: '捺',
    },
  ],
  '小': [
    {
      id: 1,
      segments: [{ from: { x: 0.50, y: 0.08 }, to: { x: 0.50, y: 0.88 } }],
      direction: '竖钩',
    },
    {
      id: 2,
      segments: [
        {
          from: { x: 0.38, y: 0.45 },
          to: { x: 0.12, y: 0.72 },
          control: { x: 0.25, y: 0.48 },
        },
      ],
      direction: '撇',
    },
    {
      id: 3,
      segments: [
        { from: { x: 0.62, y: 0.45 }, to: { x: 0.88, y: 0.72 } },
      ],
      direction: '点',
    },
  ],
  '上': [
    {
      id: 1,
      segments: [{ from: { x: 0.30, y: 0.08 }, to: { x: 0.30, y: 0.88 } }],
      direction: '竖',
    },
    {
      id: 2,
      segments: [{ from: { x: 0.30, y: 0.42 }, to: { x: 0.78, y: 0.42 } }],
      direction: '短横',
    },
    {
      id: 3,
      segments: [{ from: { x: 0.08, y: 0.88 }, to: { x: 0.92, y: 0.88 } }],
      direction: '长横',
    },
  ],
  '下': [
    {
      id: 1,
      segments: [{ from: { x: 0.08, y: 0.18 }, to: { x: 0.92, y: 0.18 } }],
      direction: '横',
    },
    {
      id: 2,
      segments: [{ from: { x: 0.50, y: 0.18 }, to: { x: 0.50, y: 0.88 } }],
      direction: '竖',
    },
    {
      id: 3,
      segments: [
        { from: { x: 0.55, y: 0.55 }, to: { x: 0.78, y: 0.78 } },
      ],
      direction: '点',
    },
  ],
  '中': [
    {
      id: 1,
      segments: [{ from: { x: 0.25, y: 0.22 }, to: { x: 0.25, y: 0.78 } }],
      direction: '竖',
    },
    {
      id: 2,
      segments: [
        { from: { x: 0.25, y: 0.22 }, to: { x: 0.75, y: 0.22 } },
        { from: { x: 0.75, y: 0.22 }, to: { x: 0.75, y: 0.78 } },
      ],
      direction: '横折',
    },
    {
      id: 3,
      segments: [{ from: { x: 0.25, y: 0.78 }, to: { x: 0.75, y: 0.78 } }],
      direction: '横',
    },
    {
      id: 4,
      segments: [{ from: { x: 0.50, y: 0.05 }, to: { x: 0.50, y: 0.95 } }],
      direction: '竖',
    },
  ],
  '人': [
    {
      id: 1,
      segments: [
        {
          from: { x: 0.48, y: 0.08 },
          to: { x: 0.08, y: 0.92 },
          control: { x: 0.28, y: 0.45 },
        },
      ],
      direction: '撇',
    },
    {
      id: 2,
      segments: [
        {
          from: { x: 0.48, y: 0.08 },
          to: { x: 0.92, y: 0.92 },
          control: { x: 0.68, y: 0.45 },
        },
      ],
      direction: '捺',
    },
  ],
  '水': [
    {
      id: 1,
      segments: [{ from: { x: 0.50, y: 0.08 }, to: { x: 0.50, y: 0.92 } }],
      direction: '竖钩',
    },
    {
      id: 2,
      segments: [
        {
          from: { x: 0.50, y: 0.38 },
          to: { x: 0.12, y: 0.62 },
          control: { x: 0.32, y: 0.38 },
        },
      ],
      direction: '横撇',
    },
    {
      id: 3,
      segments: [
        {
          from: { x: 0.42, y: 0.58 },
          to: { x: 0.10, y: 0.88 },
          control: { x: 0.25, y: 0.65 },
        },
      ],
      direction: '撇',
    },
    {
      id: 4,
      segments: [
        { from: { x: 0.58, y: 0.58 }, to: { x: 0.90, y: 0.88 } },
      ],
      direction: '捺',
    },
  ],
  '火': [
    {
      id: 1,
      segments: [
        { from: { x: 0.32, y: 0.25 }, to: { x: 0.22, y: 0.42 } },
      ],
      direction: '点',
    },
    {
      id: 2,
      segments: [
        {
          from: { x: 0.68, y: 0.25 },
          to: { x: 0.78, y: 0.42 },
        },
      ],
      direction: '短撇',
    },
    {
      id: 3,
      segments: [
        {
          from: { x: 0.48, y: 0.08 },
          to: { x: 0.08, y: 0.92 },
          control: { x: 0.28, y: 0.45 },
        },
      ],
      direction: '撇',
    },
    {
      id: 4,
      segments: [
        {
          from: { x: 0.48, y: 0.08 },
          to: { x: 0.92, y: 0.92 },
          control: { x: 0.68, y: 0.45 },
        },
      ],
      direction: '捺',
    },
  ],
  '山': [
    {
      id: 1,
      segments: [{ from: { x: 0.50, y: 0.08 }, to: { x: 0.50, y: 0.78 } }],
      direction: '竖',
    },
    {
      id: 2,
      segments: [
        { from: { x: 0.15, y: 0.38 }, to: { x: 0.15, y: 0.78 } },
        { from: { x: 0.15, y: 0.78 }, to: { x: 0.85, y: 0.78 } },
      ],
      direction: '竖折',
    },
    {
      id: 3,
      segments: [{ from: { x: 0.85, y: 0.38 }, to: { x: 0.85, y: 0.92 } }],
      direction: '竖',
    },
  ],
  '石': [
    {
      id: 1,
      segments: [{ from: { x: 0.08, y: 0.15 }, to: { x: 0.92, y: 0.15 } }],
      direction: '横',
    },
    {
      id: 2,
      segments: [
        {
          from: { x: 0.50, y: 0.15 },
          to: { x: 0.15, y: 0.58 },
          control: { x: 0.32, y: 0.30 },
        },
      ],
      direction: '撇',
    },
    {
      id: 3,
      segments: [
        { from: { x: 0.25, y: 0.45 }, to: { x: 0.25, y: 0.92 } },
      ],
      direction: '竖',
    },
    {
      id: 4,
      segments: [
        { from: { x: 0.25, y: 0.45 }, to: { x: 0.75, y: 0.45 } },
        { from: { x: 0.75, y: 0.45 }, to: { x: 0.75, y: 0.92 } },
      ],
      direction: '横折',
    },
    {
      id: 5,
      segments: [
        { from: { x: 0.25, y: 0.92 }, to: { x: 0.75, y: 0.92 } },
      ],
      direction: '横',
    },
  ],
};

export function getStrokes(char: string): StrokeData[] {
  if (database[char]) {
    return database[char].map((s) => ({
      ...s,
      segments: s.segments.map((seg) => ({
        ...seg,
        from: { ...seg.from },
        to: { ...seg.to },
        control: seg.control ? { ...seg.control } : undefined,
      })),
    }));
  }
  return [];
}

export function sampleStrokePath(stroke: StrokeData, stepsPerSegment: number = 60): StrokePoint[] {
  const points: StrokePoint[] = [];

  for (const seg of stroke.segments) {
    for (let i = 0; i <= stepsPerSegment; i++) {
      const t = i / stepsPerSegment;
      let x: number, y: number;

      if (seg.control) {
        const mt = 1 - t;
        x = mt * mt * seg.from.x + 2 * mt * t * seg.control.x + t * t * seg.to.x;
        y = mt * mt * seg.from.y + 2 * mt * t * seg.control.y + t * t * seg.to.y;
      } else {
        x = seg.from.x + t * (seg.to.x - seg.from.x);
        y = seg.from.y + t * (seg.to.y - seg.from.y);
      }

      points.push({ x, y });
    }
  }

  return points;
}

export function getAllChars(): string[] {
  return Object.keys(database);
}
