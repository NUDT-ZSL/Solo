export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 800;

export const BOARD_COLS = 8;
export const BOARD_ROWS = 8;
export const CELL_SIZE = 60;
export const BOARD_WIDTH = BOARD_COLS * CELL_SIZE;
export const BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE;
export const BOARD_OFFSET_X = (GAME_WIDTH - BOARD_WIDTH) / 2;
export const BOARD_OFFSET_Y = 100;

export const COLOR = {
  BG_TOP: 0x050010,
  BG_BOTTOM: 0x1a0033,
  GRID_LINE_START: 0x3388cc,
  GRID_LINE_END: 0x6622aa,
  CELL_HOVER: 0x4466aa,
  CELL_VALID: 0x22aa66,
  PLAYER1: 0x44aaff,
  PLAYER1_DARK: 0x2266cc,
  PLAYER2: 0xff4466,
  PLAYER2_DARK: 0xcc2244,
  RUNE_INACTIVE: 0x334466,
  RUNE_ACTIVE: 0xffaa00,
  RUNE_GLOW: 0xff6600,
  HP_BAR_BG: 0x333344,
  HP_BAR_P1: 0x44aaff,
  HP_BAR_P2: 0xff4466,
  PANEL_BG: 0x0a0a2e,
  PANEL_BORDER: 0x4466aa,
  TEXT_PRIMARY: '#eeeeff',
  TEXT_SECONDARY: '#8888bb',
  BUTTON_BG: 0x1a1a4e,
  BUTTON_HOVER: 0x2a2a6e,
  BUTTON_BORDER: 0x5577bb,
  ATTACK_FLASH: 0xffffff,
  HEAL: 0x44ff88,
  DAMAGE_BOOST: 0xff8844,
  SHIELD: 0x44aaff,
  DAMAGE_RUNE: 0xff4444,
  SLOW: 0x8844ff,
  CENTER_RUNE: 0xffdd44,
};

export const PIECE_CONFIG = {
  knight: { hp: 120, attack: 25, range: 1, name: '骑士', count: 4, symbol: '⚔' },
  mage: { hp: 60, attack: 40, range: 2, name: '法师', count: 3, symbol: '✦' },
  archer: { hp: 80, attack: 30, range: 3, name: '射手', count: 3, symbol: '➶' },
} as const;

export type PieceType = keyof typeof PIECE_CONFIG;

export const TURN_DURATION = 20;
export const ATTACK_DELAY = 400;
export const RUNE_ACTIVATION_COUNT = 2;
export const RUNE_ACTIVE_TURNS = 3;

export const CENTER_RUNE_CELLS = [
  { col: 3, row: 3 },
  { col: 3, row: 4 },
  { col: 4, row: 3 },
  { col: 4, row: 4 },
];

export const CENTER_OCCUPATION_TIME = 10;
export const RUNE_COUNT = 8;

export enum RuneType {
  HEAL = 'heal',
  DAMAGE_BOOST = 'damage_boost',
  SHIELD = 'shield',
  DAMAGE = 'damage',
  SLOW = 'slow',
}

export const RUNE_EFFECTS: Record<RuneType, { value: number; duration: number; name: string }> = {
  [RuneType.HEAL]: { value: 25, duration: 0, name: '治愈' },
  [RuneType.DAMAGE_BOOST]: { value: 0.5, duration: 2, name: '增伤' },
  [RuneType.SHIELD]: { value: 25, duration: 0, name: '护盾' },
  [RuneType.DAMAGE]: { value: 20, duration: 0, name: '伤害' },
  [RuneType.SLOW]: { value: 1, duration: 2, name: '减速' },
};

export enum GameState {
  PLACEMENT = 'placement',
  ATTACK = 'attack',
  RUNE = 'rune',
  GAME_OVER = 'game_over',
}
