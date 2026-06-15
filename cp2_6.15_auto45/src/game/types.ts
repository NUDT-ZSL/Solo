export type TileType = 'wall' | 'floor';

export interface Position {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  center: Position;
}

export interface Monster {
  id: string;
  position: Position;
  roomId: number;
  hp: number;
  hasTreasure: boolean;
}

export interface Treasure {
  id: string;
  position: Position;
  roomId: number;
  collected: boolean;
}

export interface DungeonMap {
  seed: string;
  threatLevel: number;
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: Room[];
  monsters: Monster[];
  treasures: Treasure[];
  entrance: Position;
  exploredRooms: Set<number>;
}

export interface DifficultyConfig {
  monsterDensityMultiplier: number;
  trapDensityMultiplier: number;
  treasureDropRate: number;
  monsterAIStrength: number;
}

export interface SeedResponse {
  seed: string;
  config: DifficultyConfig;
}

export interface GameRecord {
  id?: number;
  seed: string;
  threatLevel: number;
  timeSpent: number;
  remainingHp: number;
  maxHp: number;
  killCount: number;
  treasureCollected: number;
  cleared: boolean;
  createdAt?: string;
}

export interface PlayerStats {
  totalClears: number;
  totalTreasures: number;
  recentRecords: GameRecord[];
  autoLevelAdjust: number;
  difficultyHint: string;
}
