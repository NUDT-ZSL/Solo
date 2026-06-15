export interface Point {
  x: number;
  y: number;
}

export interface Character {
  id: string;
  type: CharacterType;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  width: number;
  height: number;
}

export type CharacterType =
  | 'detective'
  | 'owl'
  | 'castle'
  | 'key'
  | 'candle'
  | 'shadow'
  | 'tree'
  | 'moon';

export interface CharacterPreset {
  type: CharacterType;
  name: string;
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  distance: number;
  goldUntil: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  connectionId?: string;
  progress?: number;
  isFirefly?: boolean;
  phase?: number;
}

export interface Dialog {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: number;
}

export interface HistoryState {
  characters: Character[];
  connections: Connection[];
  dialogs: Dialog[];
}

export type HistoryActionType =
  | 'add_character'
  | 'remove_character'
  | 'move_character'
  | 'transform_character'
  | 'add_dialog'
  | 'clear_all';

export interface HistoryEntry {
  type: HistoryActionType;
  before: HistoryState;
  after: HistoryState;
}

export interface StageOptions {
  backgroundColor: string;
  hue: number;
  glowMode: boolean;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { type: 'detective', name: '侦探', width: 70, height: 110 },
  { type: 'owl', name: '猫头鹰', width: 75, height: 85 },
  { type: 'castle', name: '古堡', width: 130, height: 110 },
  { type: 'key', name: '钥匙', width: 90, height: 40 },
  { type: 'candle', name: '蜡烛', width: 40, height: 90 },
  { type: 'shadow', name: '影子', width: 80, height: 110 },
  { type: 'tree', name: '枯树', width: 90, height: 130 },
  { type: 'moon', name: '月亮', width: 80, height: 80 },
];
