export interface Stroke {
  id: number
  order: number
  startX: number
  startY: number
  endX: number
  endY: number
  controlX?: number
  controlY?: number
  secondControlX?: number
  secondControlY?: number
  direction: string
  pathType: 'line' | 'quad' | 'cubic'
}

export interface CharacterStrokes {
  character: string
  strokes: Stroke[]
}

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 480
const CENTER_X = CANVAS_WIDTH / 2
const CENTER_Y = CANVAS_HEIGHT / 2
const SCALE = 1.8

const cx = (x: number) => CENTER_X + (x - 100) * SCALE
const cy = (y: number) => CENTER_Y + (y - 100) * SCALE

const strokeDatabase: Record<string, CharacterStrokes> = {
  '大': {
    character: '大',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(45), startY: cy(35),
        endX: cx(155), endY: cy(35),
        direction: '横', pathType: 'line'
      },
      {
        id: 2, order: 2,
        startX: cx(100), startY: cy(15),
        endX: cx(35), endY: cy(175),
        direction: '撇', pathType: 'quad',
        controlX: cx(75), controlY: cy(95)
      },
      {
        id: 3, order: 3,
        startX: cx(100), startY: cy(15),
        endX: cx(170), endY: cy(175),
        direction: '捺', pathType: 'quad',
        controlX: cx(135), controlY: cy(95)
      }
    ]
  },
  '小': {
    character: '小',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(100), startY: cy(20),
        endX: cx(100), endY: cy(175),
        direction: '竖钩', pathType: 'cubic',
        controlX: cx(98), controlY: cy(150),
        secondControlX: cx(88), secondControlY: cy(168)
      },
      {
        id: 2, order: 2,
        startX: cx(62), startY: cy(80),
        endX: cx(35), endY: cy(140),
        direction: '点', pathType: 'quad',
        controlX: cx(45), controlY: cy(105)
      },
      {
        id: 3, order: 3,
        startX: cx(138), startY: cy(80),
        endX: cx(165), endY: cy(140),
        direction: '点', pathType: 'quad',
        controlX: cx(155), controlY: cy(105)
      }
    ]
  },
  '上': {
    character: '上',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(100), startY: cy(25),
        endX: cx(100), endY: cy(160),
        direction: '竖', pathType: 'line'
      },
      {
        id: 2, order: 2,
        startX: cx(48), startY: cy(115),
        endX: cx(152), endY: cy(115),
        direction: '横', pathType: 'line'
      },
      {
        id: 3, order: 3,
        startX: cx(32), startY: cy(160),
        endX: cx(168), endY: cy(160),
        direction: '横', pathType: 'line'
      }
    ]
  },
  '下': {
    character: '下',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(32), startY: cy(35),
        endX: cx(168), endY: cy(35),
        direction: '横', pathType: 'line'
      },
      {
        id: 2, order: 2,
        startX: cx(100), startY: cy(35),
        endX: cx(100), endY: cy(170),
        direction: '竖', pathType: 'line'
      },
      {
        id: 3, order: 3,
        startX: cx(100), startY: cy(100),
        endX: cx(162), endY: cy(168),
        direction: '点', pathType: 'quad',
        controlX: cx(130), controlY: cy(135)
      }
    ]
  },
  '中': {
    character: '中',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(50), startY: cy(40),
        endX: cx(50), endY: cy(155),
        direction: '竖', pathType: 'line'
      },
      {
        id: 2, order: 2,
        startX: cx(50), startY: cy(40),
        endX: cx(150), endY: cy(40),
        direction: '横折', pathType: 'cubic',
        controlX: cx(148), controlY: cy(40),
        secondControlX: cx(150), secondControlY: cy(42)
      },
      {
        id: 3, order: 3,
        startX: cx(150), startY: cy(40),
        endX: cx(150), endY: cy(155),
        direction: '竖', pathType: 'line'
      },
      {
        id: 4, order: 4,
        startX: cx(50), startY: cy(155),
        endX: cx(150), endY: cy(155),
        direction: '横', pathType: 'line'
      },
      {
        id: 5, order: 5,
        startX: cx(100), startY: cy(18),
        endX: cx(100), endY: cy(182),
        direction: '竖', pathType: 'line'
      }
    ]
  },
  '人': {
    character: '人',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(100), startY: cy(18),
        endX: cx(32), endY: cy(178),
        direction: '撇', pathType: 'cubic',
        controlX: cx(80), controlY: cy(85),
        secondControlX: cx(48), secondControlY: cy(145)
      },
      {
        id: 2, order: 2,
        startX: cx(100), startY: cy(18),
        endX: cx(170), endY: cy(178),
        direction: '捺', pathType: 'cubic',
        controlX: cx(122), controlY: cy(85),
        secondControlX: cx(155), secondControlY: cy(148)
      }
    ]
  },
  '水': {
    character: '水',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(100), startY: cy(15),
        endX: cx(100), endY: cy(182),
        direction: '竖钩', pathType: 'cubic',
        controlX: cx(98), controlY: cy(155),
        secondControlX: cx(85), secondControlY: cy(175)
      },
      {
        id: 2, order: 2,
        startX: cx(98), startY: cy(58),
        endX: cx(38), endY: cy(108),
        direction: '横撇', pathType: 'cubic',
        controlX: cx(68), controlY: cy(65),
        secondControlX: cx(48), secondControlY: cy(88)
      },
      {
        id: 3, order: 3,
        startX: cx(92), startY: cy(98),
        endX: cx(32), endY: cy(172),
        direction: '撇', pathType: 'quad',
        controlX: cx(58), controlY: cy(145)
      },
      {
        id: 4, order: 4,
        startX: cx(108), startY: cy(98),
        endX: cx(172), endY: cy(172),
        direction: '捺', pathType: 'quad',
        controlX: cx(145), controlY: cy(142)
      }
    ]
  },
  '火': {
    character: '火',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(68), startY: cy(65),
        endX: cx(48), endY: cy(102),
        direction: '点', pathType: 'quad',
        controlX: cx(55), controlY: cy(82)
      },
      {
        id: 2, order: 2,
        startX: cx(132), startY: cy(65),
        endX: cx(152), endY: cy(102),
        direction: '点', pathType: 'quad',
        controlX: cx(145), controlY: cy(82)
      },
      {
        id: 3, order: 3,
        startX: cx(100), startY: cy(28),
        endX: cx(38), endY: cy(178),
        direction: '撇', pathType: 'cubic',
        controlX: cx(78), controlY: cy(90),
        secondControlX: cx(52), secondControlY: cy(148)
      },
      {
        id: 4, order: 4,
        startX: cx(100), startY: cy(28),
        endX: cx(168), endY: cy(178),
        direction: '捺', pathType: 'cubic',
        controlX: cx(125), controlY: cy(92),
        secondControlX: cx(155), secondControlY: cy(148)
      }
    ]
  },
  '山': {
    character: '山',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(100), startY: cy(22),
        endX: cx(100), endY: cy(168),
        direction: '竖', pathType: 'line'
      },
      {
        id: 2, order: 2,
        startX: cx(45), startY: cy(72),
        endX: cx(45), endY: cy(168),
        direction: '竖折', pathType: 'cubic',
        controlX: cx(45), controlY: cy(166),
        secondControlX: cx(47), secondControlY: cy(168)
      },
      {
        id: 3, order: 3,
        startX: cx(45), startY: cy(168),
        endX: cx(155), endY: cy(168),
        direction: '横', pathType: 'line'
      },
      {
        id: 4, order: 4,
        startX: cx(155), startY: cy(72),
        endX: cx(155), endY: cy(168),
        direction: '竖', pathType: 'line'
      }
    ]
  },
  '石': {
    character: '石',
    strokes: [
      {
        id: 1, order: 1,
        startX: cx(30), startY: cy(32),
        endX: cx(170), endY: cy(32),
        direction: '横', pathType: 'line'
      },
      {
        id: 2, order: 2,
        startX: cx(100), startY: cy(32),
        endX: cx(100), endY: cy(92),
        direction: '撇', pathType: 'quad',
        controlX: cx(82), controlY: cy(62)
      },
      {
        id: 3, order: 3,
        startX: cx(55), startY: cy(92),
        endX: cx(55), endY: cy(168),
        direction: '竖', pathType: 'line'
      },
      {
        id: 4, order: 4,
        startX: cx(55), startY: cy(92),
        endX: cx(145), endY: cy(92),
        direction: '横折', pathType: 'cubic',
        controlX: cx(143), controlY: cy(92),
        secondControlX: cx(145), secondControlY: cy(94)
      },
      {
        id: 5, order: 5,
        startX: cx(145), startY: cy(92),
        endX: cx(145), endY: cy(168),
        direction: '竖', pathType: 'line'
      },
      {
        id: 6, order: 6,
        startX: cx(55), startY: cy(168),
        endX: cx(145), endY: cy(168),
        direction: '横', pathType: 'line'
      }
    ]
  }
}

export function getStrokeData(characters: string): CharacterStrokes[] {
  const result: CharacterStrokes[] = []
  for (const char of characters) {
    if (strokeDatabase[char]) {
      result.push(strokeDatabase[char])
    }
  }
  return result
}

export function getAllSupportedCharacters(): string[] {
  return Object.keys(strokeDatabase)
}
