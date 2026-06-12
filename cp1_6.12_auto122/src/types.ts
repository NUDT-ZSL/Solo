export const CELL_SIZE = 32;
export const GRID_ROWS = 16;
export const GRID_COLS = 16;
export const MINE_COUNT = 80;
export const CELL_BORDER = '1px solid #555';
export const FRAGMENT_DROP_CHANCE = 0.08;
export const CRYSTAL_INTERVAL = 20;
export const FRAGMENT_FLY_DURATION = 600;
export const SUMMON_DURATION = 1200;
export const BATTLE_INTERVAL_MS = 2000;

export const NUMBER_COLORS: Record<number, string> = {
  1: '#ff0000',
  2: '#ff8c00',
  3: '#ffd700',
  4: '#00ff00',
  5: '#00bfff',
  6: '#4b0082',
  7: '#8a2be2',
  8: '#ff69b4'
};

export const RARITY_BORDER: Record<string, string> = {
  common: '#808080',
  rare: '#4169e1',
  epic: '#9932cc',
  legendary: '#ffd700'
};

export const RARITY_ICONS: Record<string, string> = {
  common: '⚔️',
  rare: '🛡️',
  epic: '🔥',
  legendary: '🐉'
};

export const CHARACTER_AVATARS: Record<string, string> = {
  warrior_common: '⚔️',
  archer_common: '🏹',
  mage_common: '🔮',
  knight_rare: '🛡️',
  assassin_rare: '🗡️',
  priest_rare: '✨',
  berserker_epic: '🔥',
  necromancer_epic: '💀',
  paladin_epic: '⚡',
  dragon_legendary: '🐉',
  archmage_legendary: '🌟',
  god_legendary: '👑'
};

export const BOSS_AVATARS: string[] = [
  '👺', '💀', '🕷️', '🪨', '🐲',
  '🔥', '❄️', '👹', '🦅', '🌀'
];

export type CellState = 'hidden' | 'revealed' | 'flagged' | 'questioned';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type TabId = 'minesweeper' | 'characters' | 'boss';

export interface FlyingFragment {
  id: string;
  characterId: string;
  characterName: string;
  rarity: Rarity;
  startX: number;
  startY: number;
  timestamp: number;
}

export interface DamageFloat {
  id: string;
  damage: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface SummonState {
  active: boolean;
  characterName: string;
  rarity: Rarity;
  characterId: string;
  startTime: number;
}
