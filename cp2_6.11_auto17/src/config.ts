export const COLORS = {
  BACKGROUND_START: 0x0A1128,
  BACKGROUND_END: 0x1B0A2E,
  STELE_MAIN: 0x5a5a65,
  STELE_EDGE: 0xD4AF37,
  SYMBOL_BASE: 0x6FA3D9,
  SYMBOL_HOVER: 0xF5C842,
  LIGHT_BEAM: 0xffffff,
  ENERGY_DEEP: 0x0a2a5e,
  ENERGY_BRIGHT: 0x2e86ff,
} as const;

export const DIMENSIONS = {
  STELE_WIDTH_RATIO: 0.45,
  STELE_HEIGHT_RATIO: 0.65,
  STELE_TILT: 15,
  BEAM_HEIGHT: 80,
  BASE_RADIUS: 1.8,
  BASE_HEIGHT: 0.25,
} as const;

export const TIMING = {
  EDGE_BREATH_PERIOD: 3,
  SYMBOL_MIN_INTERVAL: 1.2,
  SYMBOL_MAX_INTERVAL: 2.5,
  SYMBOL_TRAVEL_SECONDS: 12,
  SYMBOL_SPAWN_MIN: 1,
  SYMBOL_SPAWN_MAX: 5,
  ARC_DURATION: 2,
  ARC_SPEED: 30,
  PARTICLE_DURATION: 1.5,
  SHAKE_DURATION: 300,
  SHAKE_INTENSITY: 2,
} as const;

export const PARTICLES = {
  RESONANCE_COUNT: 50,
  MAX_TOTAL: 200,
  MIN_SIZE: 5,
  MAX_SIZE: 10,
} as const;

export const CAMERA = {
  MIN_ROTATION: -Math.PI / 4,
  MAX_ROTATION: Math.PI / 4,
  MIN_SCALE: 0.8,
  MAX_SCALE: 1.5,
} as const;

export const SYMBOL_COUNT = 12;

export const SYMBOL_SEQUENCE: number[] = [0, 3, 7, 11, 5, 2, 9, 4, 10, 1, 8, 6];

export const TONE_FREQUENCIES: Record<number, { freq: number; type: string }> = {
  0: { freq: 523.25, type: 'sine' },
  1: { freq: 587.33, type: 'triangle' },
  2: { freq: 659.25, type: 'sine' },
  3: { freq: 698.46, type: 'triangle' },
  4: { freq: 783.99, type: 'sine' },
  5: { freq: 880.00, type: 'triangle' },
  6: { freq: 987.77, type: 'sine' },
  7: { freq: 1046.50, type: 'triangle' },
  8: { freq: 1174.66, type: 'sine' },
  9: { freq: 1318.51, type: 'triangle' },
  10: { freq: 1396.91, type: 'sine' },
  11: { freq: 1567.98, type: 'triangle' },
};

export const RAINBOW_COLORS = [
  0xff0000, 0xff7f00, 0xffff00, 0x00ff00,
  0x0000ff, 0x4b0082, 0x9400d3,
];
