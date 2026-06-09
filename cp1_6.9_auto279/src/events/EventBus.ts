export const GameEvents = {
  SCORE_UPDATE: 'score:update',
  COMBO_UPDATE: 'combo:update',
  GAME_OVER: 'game:over',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  SPEED_INCREASE: 'speed:increase',
  STAR_COLLECTED: 'star:collected',
  VOID_HIT: 'void:hit',
  COMBO_LEVEL_UP: 'combo:levelup'
} as const;

export type GameEventType = typeof GameEvents[keyof typeof GameEvents];

export interface ScoreUpdateData {
  score: number;
  delta: number;
  x: number;
  y: number;
}

export interface ComboUpdateData {
  multiplier: number;
  collectedStars: number;
}

export interface GameOverData {
  finalScore: number;
  highScore: number;
  totalStars: number;
  playTime: number;
}

export interface StarCollectedData {
  x: number;
  y: number;
}

export interface VoidHitData {
  x: number;
  y: number;
}
