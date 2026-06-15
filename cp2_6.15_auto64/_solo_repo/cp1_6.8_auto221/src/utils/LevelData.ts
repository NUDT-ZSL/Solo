export interface WallData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
}

export interface GapData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface PrismData {
  x: number;
  y: number;
  rotationSpeed: number;
  armLength: number;
  armCount: number;
}

export interface PulseOrbData {
  x: number;
  y: number;
  radius: number;
  pulseSpeed: number;
  activeDuration: number;
  inactiveDuration: number;
}

export interface ColorTheme {
  primary: number;
  secondary: number;
  glow: number;
  trailPrimary: number;
  trailSecondary: number;
  footprint: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  colorTheme: ColorTheme;
  walls: WallData[];
  gaps: GapData[];
  prisms: PrismData[];
  pulseOrbs: PulseOrbData[];
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  parTime: number;
}

const BLUE_PURPLE: ColorTheme = {
  primary: 0x6c5ce7,
  secondary: 0xa29bfe,
  glow: 0x4a3dbd,
  trailPrimary: 0x7c6ff7,
  trailSecondary: 0xb8b0ff,
  footprint: 0x9b8cff,
};

const EMERALD_GREEN: ColorTheme = {
  primary: 0x00b894,
  secondary: 0x55efc4,
  glow: 0x009975,
  trailPrimary: 0x10d8a4,
  trailSecondary: 0x75ffdb,
  footprint: 0x3de8b8,
};

const WARM_ORANGE: ColorTheme = {
  primary: 0xe17055,
  secondary: 0xfab1a0,
  glow: 0xc4512a,
  trailPrimary: 0xf08060,
  trailSecondary: 0xffb899,
  footprint: 0xf5a080,
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '初光之径',
    colorTheme: BLUE_PURPLE,
    parTime: 30,
    startPos: { x: 80, y: 500 },
    endPos: { x: 720, y: 100 },
    walls: [
      { x1: 40, y1: 40, x2: 760, y2: 40 },
      { x1: 40, y1: 40, x2: 40, y2: 560 },
      { x1: 760, y1: 40, x2: 760, y2: 560 },
      { x1: 40, y1: 560, x2: 760, y2: 560 },
      { x1: 200, y1: 40, x2: 200, y2: 380 },
      { x1: 200, y1: 380, x2: 350, y2: 380 },
      { x1: 400, y1: 160, x2: 400, y2: 560 },
      { x1: 400, y1: 160, x2: 560, y2: 160 },
      { x1: 560, y1: 160, x2: 560, y2: 340 },
      { x1: 560, y1: 340, x2: 760, y2: 340 },
      { x1: 120, y1: 240, x2: 300, y2: 240 },
      { x1: 300, y1: 240, x2: 300, y2: 120 },
    ],
    gaps: [
      { x1: 350, y1: 380, x2: 400, y2: 380, width: 50 },
    ],
    prisms: [],
    pulseOrbs: [],
  },
  {
    id: 2,
    name: '棱镜回廊',
    colorTheme: EMERALD_GREEN,
    parTime: 50,
    startPos: { x: 80, y: 500 },
    endPos: { x: 720, y: 80 },
    walls: [
      { x1: 40, y1: 40, x2: 760, y2: 40 },
      { x1: 40, y1: 40, x2: 40, y2: 560 },
      { x1: 760, y1: 40, x2: 760, y2: 560 },
      { x1: 40, y1: 560, x2: 760, y2: 560 },
      { x1: 160, y1: 40, x2: 160, y2: 300 },
      { x1: 160, y1: 300, x2: 280, y2: 300 },
      { x1: 280, y1: 200, x2: 280, y2: 400 },
      { x1: 280, y1: 200, x2: 440, y2: 200 },
      { x1: 440, y1: 200, x2: 440, y2: 400 },
      { x1: 280, y1: 400, x2: 440, y2: 400 },
      { x1: 440, y1: 100, x2: 600, y2: 100 },
      { x1: 600, y1: 100, x2: 600, y2: 300 },
      { x1: 600, y1: 300, x2: 760, y2: 300 },
      { x1: 500, y1: 300, x2: 500, y2: 560 },
      { x1: 300, y1: 480, x2: 500, y2: 480 },
      { x1: 80, y1: 160, x2: 200, y2: 160 },
    ],
    gaps: [
      { x1: 280, y1: 300, x2: 300, y2: 300, width: 20 },
      { x1: 420, y1: 200, x2: 440, y2: 200, width: 20 },
      { x1: 500, y1: 480, x2: 500, y2: 500, width: 20 },
    ],
    prisms: [
      { x: 360, y: 300, rotationSpeed: 0.8, armLength: 50, armCount: 3 },
    ],
    pulseOrbs: [],
  },
  {
    id: 3,
    name: '脉冲迷域',
    colorTheme: WARM_ORANGE,
    parTime: 75,
    startPos: { x: 80, y: 520 },
    endPos: { x: 720, y: 80 },
    walls: [
      { x1: 40, y1: 40, x2: 760, y2: 40 },
      { x1: 40, y1: 40, x2: 40, y2: 560 },
      { x1: 760, y1: 40, x2: 760, y2: 560 },
      { x1: 40, y1: 560, x2: 760, y2: 560 },
      { x1: 140, y1: 40, x2: 140, y2: 200 },
      { x1: 140, y1: 200, x2: 260, y2: 200 },
      { x1: 260, y1: 120, x2: 260, y2: 280 },
      { x1: 260, y1: 120, x2: 380, y2: 120 },
      { x1: 380, y1: 120, x2: 380, y2: 280 },
      { x1: 260, y1: 280, x2: 380, y2: 280 },
      { x1: 380, y1: 200, x2: 520, y2: 200 },
      { x1: 520, y1: 40, x2: 520, y2: 300 },
      { x1: 520, y1: 300, x2: 640, y2: 300 },
      { x1: 640, y1: 300, x2: 640, y2: 440 },
      { x1: 640, y1: 440, x2: 760, y2: 440 },
      { x1: 100, y1: 360, x2: 300, y2: 360 },
      { x1: 300, y1: 360, x2: 300, y2: 480 },
      { x1: 300, y1: 480, x2: 500, y2: 480 },
      { x1: 500, y1: 360, x2: 500, y2: 560 },
      { x1: 100, y1: 360, x2: 100, y2: 560 },
      { x1: 40, y1: 440, x2: 100, y2: 440 },
      { x1: 640, y1: 120, x2: 760, y2: 120 },
    ],
    gaps: [
      { x1: 140, y1: 200, x2: 160, y2: 200, width: 20 },
      { x1: 260, y1: 280, x2: 280, y2: 280, width: 20 },
      { x1: 380, y1: 200, x2: 400, y2: 200, width: 20 },
      { x1: 500, y1: 480, x2: 500, y2: 500, width: 20 },
      { x1: 640, y1: 300, x2: 640, y2: 320, width: 20 },
    ],
    prisms: [
      { x: 320, y: 200, rotationSpeed: 1.0, armLength: 45, armCount: 4 },
      { x: 580, y: 180, rotationSpeed: -0.7, armLength: 40, armCount: 3 },
    ],
    pulseOrbs: [
      { x: 200, y: 300, radius: 30, pulseSpeed: 1.2, activeDuration: 2000, inactiveDuration: 1500 },
      { x: 580, y: 400, radius: 35, pulseSpeed: 0.8, activeDuration: 2500, inactiveDuration: 1000 },
    ],
  },
];

export function getLevel(id: number): LevelConfig | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getNextLevelId(currentId: number): number | null {
  const idx = LEVELS.findIndex(l => l.id === currentId);
  if (idx === -1 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}
