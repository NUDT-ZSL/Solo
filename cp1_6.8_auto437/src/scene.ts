export type BallColor = 'red' | 'blue' | 'green' | 'gold';

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SlotData {
  x: number;
  y: number;
  radius: number;
  color: BallColor;
}

export interface BallData {
  x: number;
  y: number;
  radius: number;
  color: BallColor;
}

export interface PendulumAnchor {
  x: number;
  y: number;
  ropeLength: number;
}

export interface ExitData {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LevelData {
  walls: Wall[];
  balls: BallData[];
  slots: SlotData[];
  pendulumAnchor: PendulumAnchor;
  exit: ExitData;
  hint: string;
}

export const COLOR_MAP: Record<BallColor, string> = {
  red: '#ff3b4a',
  blue: '#3b8bff',
  green: '#3bff6f',
  gold: '#ffd93b',
};

export const GLOW_COLOR_MAP: Record<BallColor, string> = {
  red: 'rgba(255,59,74,0.5)',
  blue: 'rgba(59,139,255,0.5)',
  green: 'rgba(59,255,111,0.5)',
  gold: 'rgba(255,217,59,0.5)',
};

export const SLOT_GLOW_COLOR_MAP: Record<BallColor, string> = {
  red: 'rgba(255,59,74,0.35)',
  blue: 'rgba(59,139,255,0.35)',
  green: 'rgba(59,255,111,0.35)',
  gold: 'rgba(255,217,59,0.35)',
};

export const LEVELS: LevelData[] = [
  {
    walls: [
      { x: 100, y: 80, w: 500, h: 20 },
      { x: 100, y: 80, w: 20, h: 500 },
      { x: 580, y: 80, w: 20, h: 240 },
      { x: 580, y: 380, w: 20, h: 200 },
      { x: 100, y: 560, w: 240, h: 20 },
      { x: 440, y: 560, w: 160, h: 20 },
      { x: 300, y: 200, w: 20, h: 180 },
      { x: 300, y: 200, w: 140, h: 20 },
      { x: 420, y: 300, w: 160, h: 20 },
      { x: 180, y: 380, w: 120, h: 20 },
    ],
    balls: [
      { x: 200, y: 150, radius: 18, color: 'red' },
      { x: 480, y: 250, radius: 18, color: 'blue' },
    ],
    slots: [
      { x: 200, y: 480, radius: 24, color: 'red' },
      { x: 500, y: 480, radius: 24, color: 'blue' },
    ],
    pendulumAnchor: { x: 400, y: 60, ropeLength: 200 },
    exit: { x: 600, y: 320, w: 20, h: 60 },
    hint: '拖拽灵摆撞击符文圆球，让它们滚入同色凹槽',
  },
  {
    walls: [
      { x: 80, y: 60, w: 540, h: 20 },
      { x: 80, y: 60, w: 20, h: 540 },
      { x: 600, y: 60, w: 20, h: 540 },
      { x: 80, y: 580, w: 220, h: 20 },
      { x: 380, y: 580, w: 240, h: 20 },
      { x: 220, y: 160, w: 20, h: 200 },
      { x: 220, y: 160, w: 200, h: 20 },
      { x: 400, y: 160, w: 20, h: 120 },
      { x: 300, y: 360, w: 200, h: 20 },
      { x: 460, y: 280, w: 140, h: 20 },
      { x: 150, y: 440, w: 180, h: 20 },
      { x: 460, y: 440, w: 140, h: 20 },
    ],
    balls: [
      { x: 150, y: 130, radius: 18, color: 'red' },
      { x: 500, y: 130, radius: 18, color: 'blue' },
      { x: 300, y: 260, radius: 18, color: 'green' },
    ],
    slots: [
      { x: 150, y: 500, radius: 24, color: 'red' },
      { x: 350, y: 500, radius: 24, color: 'blue' },
      { x: 540, y: 500, radius: 24, color: 'green' },
    ],
    pendulumAnchor: { x: 350, y: 40, ropeLength: 220 },
    exit: { x: 300, y: 580, w: 80, h: 20 },
    hint: '绿色圆球需要绕过障碍才能到达凹槽',
  },
  {
    walls: [
      { x: 60, y: 60, w: 580, h: 20 },
      { x: 60, y: 60, w: 20, h: 560 },
      { x: 620, y: 60, w: 20, h: 560 },
      { x: 60, y: 600, w: 180, h: 20 },
      { x: 320, y: 600, w: 120, h: 20 },
      { x: 520, y: 600, w: 120, h: 20 },
      { x: 180, y: 140, w: 20, h: 180 },
      { x: 180, y: 140, w: 200, h: 20 },
      { x: 360, y: 140, w: 20, h: 100 },
      { x: 420, y: 220, w: 200, h: 20 },
      { x: 140, y: 360, w: 160, h: 20 },
      { x: 300, y: 280, w: 20, h: 160 },
      { x: 400, y: 360, w: 20, h: 180 },
      { x: 400, y: 360, w: 100, h: 20 },
      { x: 500, y: 440, w: 120, h: 20 },
      { x: 120, y: 480, w: 140, h: 20 },
    ],
    balls: [
      { x: 120, y: 110, radius: 18, color: 'red' },
      { x: 500, y: 110, radius: 18, color: 'blue' },
      { x: 260, y: 240, radius: 18, color: 'green' },
      { x: 540, y: 300, radius: 22, color: 'gold' },
    ],
    slots: [
      { x: 120, y: 540, radius: 24, color: 'red' },
      { x: 260, y: 540, radius: 24, color: 'blue' },
      { x: 400, y: 540, radius: 24, color: 'green' },
      { x: 560, y: 540, radius: 28, color: 'gold' },
    ],
    pendulumAnchor: { x: 340, y: 40, ropeLength: 200 },
    exit: { x: 440, y: 600, w: 80, h: 20 },
    hint: '金色圆球需要更大力道',
  },
];

export interface SceneState {
  currentLevel: number;
  swingCount: number;
  isPaused: boolean;
  isLevelComplete: boolean;
  isGameOver: boolean;
  allComplete: boolean;
}

export function createSceneState(): SceneState {
  return {
    currentLevel: 0,
    swingCount: 0,
    isPaused: false,
    isLevelComplete: false,
    isGameOver: false,
    allComplete: false,
  };
}

export function getCurrentLevel(state: SceneState): LevelData {
  return LEVELS[Math.min(state.currentLevel, LEVELS.length - 1)];
}

export function advanceLevel(state: SceneState): void {
  if (state.currentLevel < LEVELS.length - 1) {
    state.currentLevel++;
    state.swingCount = 0;
    state.isLevelComplete = false;
  } else {
    state.allComplete = true;
  }
}

export function resetLevel(state: SceneState): void {
  state.swingCount = 0;
  state.isLevelComplete = false;
  state.isGameOver = false;
}
