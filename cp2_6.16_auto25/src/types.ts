export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  shield: number;
  maxShield: number;
  cargo: string[];
  cargoCapacity: number;
  miningSpeed: number;
  level: number;
  targetAsteroid: number | null;
  miningProgress: number;
  score: number;
  asteroidsMined: number;
  damaged?: boolean;
}

export interface AsteroidState {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'iron' | 'copper' | 'crystal';
  volume: number;
  vertices: { angle: number; radius: number }[];
}

export interface MeteorState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'flame' | 'debris' | 'shockwave' | 'meteor_trail';
}

export interface ChatMessage {
  playerId: number;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  players: PlayerState[];
  asteroids: AsteroidState[];
  meteors: MeteorState[];
  gameTime: number;
  alarmActive: boolean;
}

export interface UpgradeType {
  type: 'cargo' | 'shield' | 'mining';
  name: string;
  description: string;
  cost: { iron?: number; copper?: number; crystal?: number };
}

export const ORE_COLORS: Record<string, string> = {
  iron: '#b5651d',
  copper: '#cd7f32',
  crystal: '#00e5ff'
};

export const ORE_VALUES: Record<string, number> = {
  iron: 10,
  copper: 25,
  crystal: 100
};

export const ORE_NAMES: Record<string, string> = {
  iron: '铁矿石',
  copper: '铜矿石',
  crystal: '稀有晶矿'
};
