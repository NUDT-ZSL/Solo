export interface Wall {
  x: number
  y: number
  w: number
  h: number
}

export interface PressurePlate {
  id: string
  x: number
  y: number
  size: number
  activated: boolean
  required: 'player' | 'echo' | 'both' | 'any'
}

export interface LaserBeam {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  active: boolean
  linkedDoorId: string
}

export interface Door {
  id: string
  x: number
  y: number
  w: number
  h: number
  open: boolean
}

export interface PushableBlock {
  id: string
  x: number
  y: number
  size: number
  targetX: number
  targetY: number
}

export interface Trap {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface Exit {
  x: number
  y: number
  size: number
}

export interface Level {
  id: number
  name: string
  hint: string
  width: number
  height: number
  walls: Wall[]
  plates: PressurePlate[]
  lasers: LaserBeam[]
  doors: Door[]
  blocks: PushableBlock[]
  traps: Trap[]
  playerStart: { x: number; y: number }
  exit: Exit
  requiredActivations: number
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Level 1: Awakening',
    hint: '激活所有压力板以打开出口',
    width: 1600,
    height: 1200,
    walls: [
      { x: 0, y: 0, w: 1600, h: 30 },
      { x: 0, y: 1170, w: 1600, h: 30 },
      { x: 0, y: 0, w: 30, h: 1200 },
      { x: 1570, y: 0, w: 30, h: 1200 },
      { x: 400, y: 0, w: 30, h: 700 },
      { x: 800, y: 500, w: 30, h: 700 },
      { x: 1200, y: 0, w: 30, h: 700 },
    ],
    plates: [
      { id: 'p1', x: 200, y: 400, size: 60, activated: false, required: 'any' },
      { id: 'p2', x: 600, y: 900, size: 60, activated: false, required: 'any' },
      { id: 'p3', x: 1000, y: 300, size: 60, activated: false, required: 'any' },
    ],
    lasers: [],
    doors: [],
    blocks: [],
    traps: [],
    playerStart: { x: 150, y: 150 },
    exit: { x: 1400, y: 1000, size: 80 },
    requiredActivations: 3,
  },
  {
    id: 2,
    name: 'Level 2: Double Path',
    hint: '放置回声分身同时踩下两块压力板',
    width: 1800,
    height: 1200,
    walls: [
      { x: 0, y: 0, w: 1800, h: 30 },
      { x: 0, y: 1170, w: 1800, h: 30 },
      { x: 0, y: 0, w: 30, h: 1200 },
      { x: 1770, y: 0, w: 30, h: 1200 },
      { x: 600, y: 30, w: 30, h: 500 },
      { x: 600, y: 670, w: 30, h: 500 },
      { x: 1200, y: 30, w: 30, h: 500 },
      { x: 1200, y: 670, w: 30, h: 500 },
    ],
    plates: [
      { id: 'p1', x: 300, y: 300, size: 60, activated: false, required: 'any' },
      { id: 'p2', x: 900, y: 900, size: 60, activated: false, required: 'any' },
      { id: 'p3', x: 1500, y: 300, size: 60, activated: false, required: 'any' },
      { id: 'p4', x: 300, y: 900, size: 60, activated: false, required: 'echo' },
    ],
    lasers: [],
    doors: [],
    blocks: [],
    traps: [
      { id: 't1', x: 850, y: 570, w: 100, h: 30 },
    ],
    playerStart: { x: 150, y: 600 },
    exit: { x: 1600, y: 900, size: 80 },
    requiredActivations: 4,
  },
  {
    id: 3,
    name: 'Level 3: Light Gate',
    hint: '用方块或身体遮挡激光光束',
    width: 1800,
    height: 1400,
    walls: [
      { x: 0, y: 0, w: 1800, h: 30 },
      { x: 0, y: 1370, w: 1800, h: 30 },
      { x: 0, y: 0, w: 30, h: 1400 },
      { x: 1770, y: 0, w: 30, h: 1400 },
      { x: 30, y: 400, w: 700, h: 30 },
      { x: 1070, y: 400, w: 700, h: 30 },
      { x: 500, y: 800, w: 800, h: 30 },
    ],
    plates: [
      { id: 'p1', x: 200, y: 1100, size: 60, activated: false, required: 'any' },
      { id: 'p2', x: 1500, y: 1100, size: 60, activated: false, required: 'any' },
    ],
    lasers: [
      { id: 'l1', x1: 730, y1: 415, x2: 1070, y2: 415, active: true, linkedDoorId: 'd1' },
    ],
    doors: [
      { id: 'd1', x: 1700, y: 600, w: 30, h: 200, open: false },
    ],
    blocks: [
      { id: 'b1', x: 300, y: 600, size: 60, targetX: 300, targetY: 600 },
    ],
    traps: [],
    playerStart: { x: 150, y: 150 },
    exit: { x: 1650, y: 650, size: 80 },
    requiredActivations: 3,
  },
  {
    id: 4,
    name: 'Level 4: Maze of Echoes',
    hint: '善用回声分身穿越迷宫',
    width: 2000,
    height: 1600,
    walls: [
      { x: 0, y: 0, w: 2000, h: 30 },
      { x: 0, y: 1570, w: 2000, h: 30 },
      { x: 0, y: 0, w: 30, h: 1600 },
      { x: 1970, y: 0, w: 30, h: 1600 },
      { x: 200, y: 200, w: 30, h: 600 },
      { x: 200, y: 200, w: 600, h: 30 },
      { x: 500, y: 500, w: 30, h: 700 },
      { x: 800, y: 200, w: 30, h: 800 },
      { x: 500, y: 1200, w: 800, h: 30 },
      { x: 1100, y: 400, w: 30, h: 830 },
      { x: 1100, y: 400, w: 600, h: 30 },
      { x: 1400, y: 800, w: 30, h: 770 },
      { x: 1700, y: 600, w: 30, h: 970 },
    ],
    plates: [
      { id: 'p1', x: 350, y: 900, size: 60, activated: false, required: 'any' },
      { id: 'p2', x: 950, y: 600, size: 60, activated: false, required: 'echo' },
      { id: 'p3', x: 1250, y: 1000, size: 60, activated: false, required: 'any' },
      { id: 'p4', x: 1800, y: 400, size: 60, activated: false, required: 'any' },
      { id: 'p5', x: 650, y: 1400, size: 60, activated: false, required: 'echo' },
    ],
    lasers: [
      { id: 'l1', x1: 1400, y1: 815, x2: 1700, y2: 815, active: true, linkedDoorId: 'd1' },
    ],
    doors: [
      { id: 'd1', x: 1900, y: 100, w: 30, h: 300, open: false },
    ],
    blocks: [
      { id: 'b1', x: 950, y: 1000, size: 60, targetX: 950, targetY: 1000 },
    ],
    traps: [
      { id: 't1', x: 600, y: 250, w: 180, h: 30 },
      { id: 't2', x: 1200, y: 1450, w: 200, h: 30 },
    ],
    playerStart: { x: 100, y: 100 },
    exit: { x: 1850, y: 200, size: 80 },
    requiredActivations: 6,
  },
  {
    id: 5,
    name: 'Level 5: The Final Rift',
    hint: '综合运用所有技巧逃离镜像世界',
    width: 2200,
    height: 1800,
    walls: [
      { x: 0, y: 0, w: 2200, h: 30 },
      { x: 0, y: 1770, w: 2200, h: 30 },
      { x: 0, y: 0, w: 30, h: 1800 },
      { x: 2170, y: 0, w: 30, h: 1800 },
      { x: 400, y: 300, w: 1400, h: 30 },
      { x: 400, y: 300, w: 30, h: 600 },
      { x: 1770, y: 300, w: 30, h: 600 },
      { x: 700, y: 600, w: 30, h: 800 },
      { x: 1470, y: 600, w: 30, h: 800 },
      { x: 700, y: 1400, w: 800, h: 30 },
      { x: 300, y: 1100, w: 400, h: 30 },
      { x: 1500, y: 1100, w: 400, h: 30 },
      { x: 1000, y: 300, w: 30, h: 300 },
      { x: 1000, y: 900, w: 200, h: 30 },
    ],
    plates: [
      { id: 'p1', x: 200, y: 150, size: 60, activated: false, required: 'any' },
      { id: 'p2', x: 2000, y: 150, size: 60, activated: false, required: 'any' },
      { id: 'p3', x: 550, y: 800, size: 60, activated: false, required: 'echo' },
      { id: 'p4', x: 1650, y: 800, size: 60, activated: false, required: 'echo' },
      { id: 'p5', x: 1100, y: 500, size: 60, activated: false, required: 'player' },
      { id: 'p6', x: 1100, y: 1600, size: 60, activated: false, required: 'any' },
      { id: 'p7', x: 150, y: 1600, size: 60, activated: false, required: 'echo' },
    ],
    lasers: [
      { id: 'l1', x1: 430, y1: 1115, x2: 700, y2: 1115, active: true, linkedDoorId: 'd1' },
      { id: 'l2', x1: 1500, y1: 1115, x2: 1770, y2: 1115, active: true, linkedDoorId: 'd2' },
    ],
    doors: [
      { id: 'd1', x: 30, y: 1300, w: 200, h: 30, open: false },
      { id: 'd2', x: 1970, y: 1300, w: 200, h: 30, open: false },
    ],
    blocks: [
      { id: 'b1', x: 900, y: 1200, size: 60, targetX: 900, targetY: 1200 },
      { id: 'b2', x: 1300, y: 1200, size: 60, targetX: 1300, targetY: 1200 },
    ],
    traps: [
      { id: 't1', x: 900, y: 350, w: 100, h: 30 },
      { id: 't2', x: 800, y: 1500, w: 150, h: 30 },
      { id: 't3', x: 1250, y: 1500, w: 150, h: 30 },
    ],
    playerStart: { x: 100, y: 100 },
    exit: { x: 1050, y: 1650, size: 80 },
    requiredActivations: 9,
  },
]

export function cloneLevel(level: Level): Level {
  return JSON.parse(JSON.stringify(level))
}
