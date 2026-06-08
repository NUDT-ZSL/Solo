export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const DEFAULT_BOARD_SIZE = 8;
export const MIN_BOARD_SIZE = 4;
export const MAX_BOARD_SIZE = 12;

export const DEFAULT_FLUCTUATION_SPEED = 1.0;
export const MIN_FLUCTUATION_SPEED = 0.2;
export const MAX_FLUCTUATION_SPEED = 3.0;

export const GAME_DURATION = 60;

export const CELL_PADDING = 4;

export const COLORS = {
  bgTop: 0x0a0010,
  bgBottom: 0x1a0030,
  superposition: {
    inner: 0x6622cc,
    outer: 0x2244ff,
    glow: 0x8844ff,
  },
  collapsed: {
    inner: 0xffffff,
    outer: 0xccddff,
    glow: 0xaabbff,
  },
  particle: [0x8844ff, 0x44aaff, 0xffffff, 0xcc66ff, 0x2244ff],
  ripple: 0x6622cc,
  textPrimary: 0xeeeeff,
  textSecondary: 0x8888aa,
  panelBg: 0x1a0030,
  panelBorder: 0x4422aa,
};

export const ANIMATION = {
  cellFlipDuration: 250,
  eliminateDuration: 500,
  particleLifespan: 800,
  particleCount: 20,
  particleSpeed: 200,
  rippleDuration: 600,
  rippleMaxRadius: 120,
  glowPulseMin: 0.3,
  glowPulseMax: 1.0,
  glowPulseSpeed: 2.0,
  fluctuationColorCycle: 3000,
  fadeInDuration: 500,
  scorePopupDuration: 1000,
  scorePopupY: -40,
};

export const SCENES = {
  GAME: 'GameScene',
  UI: 'UIControlPanel',
};

export const SCORE_PER_LINE = 100;

export const LINE_LENGTH = 3;
