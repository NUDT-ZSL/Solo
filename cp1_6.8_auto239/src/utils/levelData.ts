export interface WallSegment {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Gap {
  x: number;
  y: number;
  w: number;
  h: number;
  needsFootbridge: boolean;
}

export interface Prism {
  x: number;
  y: number;
  radius: number;
  speed: number;
}

export interface PulseOrb {
  x: number;
  y: number;
  radius: number;
  period: number;
  maxRadius: number;
}

export interface LevelConfig {
  level: number;
  colorTheme: { main: number; glow: number; trail: number; footprint: number };
  playerStart: { x: number; y: number };
  goal: { x: number; y: number };
  walls: WallSegment[];
  gaps: Gap[];
  prisms: Prism[];
  pulseOrbs: PulseOrb[];
  par: number;
}

const COLOR_BLUE_PURPLE = { main: 0x8b5cf6, glow: 0xa78bfa, trail: 0x6d28d9, footprint: 0xc4b5fd };
const COLOR_EMERALD = { main: 0x10b981, glow: 0x34d399, trail: 0x059669, footprint: 0x6ee7b7 };
const COLOR_WARM_ORANGE = { main: 0xf59e0b, glow: 0xfbbf24, trail: 0xd97706, footprint: 0xfde68a };

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    colorTheme: COLOR_BLUE_PURPLE,
    playerStart: { x: 100, y: 500 },
    goal: { x: 700, y: 100 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20 },
      { x: 0, y: 580, w: 800, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 780, y: 0, w: 20, h: 600 },
      { x: 200, y: 20, w: 20, h: 350 },
      { x: 400, y: 230, w: 20, h: 350 },
      { x: 600, y: 20, w: 20, h: 300 },
    ],
    gaps: [
      { x: 400, y: 400, w: 120, h: 20, needsFootbridge: false },
    ],
    prisms: [],
    pulseOrbs: [],
    par: 12,
  },
  {
    level: 2,
    colorTheme: COLOR_BLUE_PURPLE,
    playerStart: { x: 100, y: 500 },
    goal: { x: 700, y: 100 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20 },
      { x: 0, y: 580, w: 800, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 780, y: 0, w: 20, h: 600 },
      { x: 150, y: 20, w: 20, h: 280 },
      { x: 300, y: 300, w: 20, h: 280 },
      { x: 450, y: 20, w: 20, h: 320 },
      { x: 600, y: 260, w: 20, h: 320 },
    ],
    gaps: [
      { x: 150, y: 300, w: 150, h: 20, needsFootbridge: true },
      { x: 450, y: 340, w: 150, h: 20, needsFootbridge: true },
    ],
    prisms: [
      { x: 225, y: 180, radius: 30, speed: 0.02 },
    ],
    pulseOrbs: [],
    par: 18,
  },
  {
    level: 3,
    colorTheme: COLOR_EMERALD,
    playerStart: { x: 100, y: 500 },
    goal: { x: 700, y: 80 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20 },
      { x: 0, y: 580, w: 800, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 780, y: 0, w: 20, h: 600 },
      { x: 120, y: 20, w: 20, h: 200 },
      { x: 120, y: 320, w: 20, h: 260 },
      { x: 280, y: 180, w: 20, h: 400 },
      { x: 440, y: 20, w: 20, h: 260 },
      { x: 440, y: 380, w: 20, h: 200 },
      { x: 600, y: 140, w: 20, h: 300 },
    ],
    gaps: [
      { x: 120, y: 220, w: 160, h: 20, needsFootbridge: true },
      { x: 280, y: 380, w: 160, h: 20, needsFootbridge: true },
      { x: 440, y: 280, w: 160, h: 20, needsFootbridge: false },
    ],
    prisms: [
      { x: 200, y: 140, radius: 25, speed: 0.025 },
      { x: 520, y: 440, radius: 35, speed: 0.018 },
    ],
    pulseOrbs: [
      { x: 360, y: 300, radius: 20, period: 3000, maxRadius: 80 },
    ],
    par: 24,
  },
  {
    level: 4,
    colorTheme: COLOR_EMERALD,
    playerStart: { x: 60, y: 540 },
    goal: { x: 740, y: 60 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20 },
      { x: 0, y: 580, w: 800, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 780, y: 0, w: 20, h: 600 },
      { x: 100, y: 80, w: 20, h: 300 },
      { x: 100, y: 460, w: 20, h: 120 },
      { x: 250, y: 20, w: 20, h: 220 },
      { x: 250, y: 360, w: 20, h: 220 },
      { x: 400, y: 120, w: 20, h: 300 },
      { x: 550, y: 20, w: 20, h: 200 },
      { x: 550, y: 340, w: 20, h: 240 },
      { x: 680, y: 160, w: 20, h: 260 },
    ],
    gaps: [
      { x: 100, y: 380, w: 150, h: 20, needsFootbridge: true },
      { x: 250, y: 240, w: 150, h: 20, needsFootbridge: true },
      { x: 400, y: 420, w: 150, h: 20, needsFootbridge: true },
      { x: 550, y: 220, w: 130, h: 20, needsFootbridge: false },
    ],
    prisms: [
      { x: 175, y: 500, radius: 28, speed: 0.03 },
      { x: 475, y: 80, radius: 32, speed: 0.022 },
    ],
    pulseOrbs: [
      { x: 325, y: 300, radius: 22, period: 2500, maxRadius: 90 },
      { x: 625, y: 500, radius: 18, period: 3500, maxRadius: 70 },
    ],
    par: 30,
  },
  {
    level: 5,
    colorTheme: COLOR_WARM_ORANGE,
    playerStart: { x: 60, y: 540 },
    goal: { x: 740, y: 60 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20 },
      { x: 0, y: 580, w: 800, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 780, y: 0, w: 20, h: 600 },
      { x: 80, y: 100, w: 20, h: 180 },
      { x: 80, y: 380, w: 20, h: 200 },
      { x: 200, y: 20, w: 20, h: 160 },
      { x: 200, y: 280, w: 20, h: 140 },
      { x: 200, y: 520, w: 20, h: 60 },
      { x: 320, y: 100, w: 20, h: 180 },
      { x: 320, y: 380, w: 20, h: 200 },
      { x: 440, y: 20, w: 20, h: 120 },
      { x: 440, y: 240, w: 20, h: 180 },
      { x: 440, y: 520, w: 20, h: 60 },
      { x: 560, y: 100, w: 20, h: 200 },
      { x: 560, y: 400, w: 20, h: 180 },
      { x: 680, y: 20, w: 20, h: 140 },
      { x: 680, y: 260, w: 20, h: 140 },
      { x: 680, y: 500, w: 20, h: 80 },
    ],
    gaps: [
      { x: 80, y: 280, w: 120, h: 20, needsFootbridge: true },
      { x: 200, y: 420, w: 120, h: 20, needsFootbridge: true },
      { x: 320, y: 280, w: 120, h: 20, needsFootbridge: true },
      { x: 440, y: 140, w: 120, h: 20, needsFootbridge: true },
      { x: 560, y: 300, w: 120, h: 20, needsFootbridge: true },
      { x: 680, y: 400, w: 100, h: 20, needsFootbridge: false },
    ],
    prisms: [
      { x: 140, y: 480, radius: 26, speed: 0.032 },
      { x: 380, y: 60, radius: 30, speed: 0.028 },
      { x: 620, y: 340, radius: 34, speed: 0.02 },
    ],
    pulseOrbs: [
      { x: 260, y: 200, radius: 20, period: 2000, maxRadius: 85 },
      { x: 500, y: 460, radius: 24, period: 3000, maxRadius: 95 },
      { x: 700, y: 200, radius: 18, period: 2500, maxRadius: 70 },
    ],
    par: 40,
  },
];
