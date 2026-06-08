export const GAME_CONFIG = {
  width: 800,
  height: 600,
  backgroundColor: '#0a0612',
  scaleMode: 'FIT' as const,
};

export const MAZE_CONFIG = {
  cols: 15,
  rows: 11,
  cellSize: 40,
  phantomInterval: 5000,
  phantomChangeRatio: 0.2,
  phantomTransitionDuration: 600,
};

export const PLAYER_CONFIG = {
  radius: 10,
  speed: 200,
  glowIntensity: 20,
  trailLifespan: 400,
  trailQuantity: 2,
};

export const COLOR_THEME = {
  bgTop: 0x0a0612,
  bgBottom: 0x1a0a2e,
  wallPrimary: 0x7b2ff7,
  wallSecondary: 0x00d4ff,
  wallGlow: 0x9945ff,
  playerCore: 0xc0ffff,
  playerGlow: 0x00ffff,
  exitColor: 0x00ff88,
  phantomFlash: 0x7b2ff7,
  trailColors: [0x00ffff, 0x7b2ff7, 0x00d4ff, 0xff00ff],
  rippleColor: 0x00ffff,
  textPrimary: '#c0ffff',
  textSecondary: '#7b2ff7',
  panelBg: 0x1a0a2e,
  panelAlpha: 0.6,
};

export const AUDIO_CONFIG = {
  masterVolume: 0.3,
  moveFreq: 440,
  moveDuration: 0.08,
  wallHitFreq: 150,
  wallHitDuration: 0.15,
  winFreq: 880,
  winDuration: 0.5,
  phantomSwitchFreq: 220,
  phantomSwitchDuration: 0.3,
};
