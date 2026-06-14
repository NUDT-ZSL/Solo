export type CellType = 'start' | 'end' | 'chest' | 'trap' | 'monster' | 'shop' | 'empty';

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  visited: boolean;
  resolved: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  icon: string;
  damage: number;
  rarity: 'common' | 'rare' | 'epic';
}

export interface Monster {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  attack: number;
  gold: number;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  gold: number;
  weapons: Weapon[];
  currentWeaponId?: string;
}

export interface ChestData {
  gold: number;
  weapon?: Weapon;
}

export interface GameOverData {
  victory: boolean;
  totalGold: number;
  killCount: number;
  reachedFloor: number;
}

export interface ShopItem {
  type: 'weapon' | 'heal';
  price: number;
  payload: Weapon | number;
  label: string;
  icon: string;
}

export interface ShopData {
  items: ShopItem[];
}

export type LogType = 'info' | 'warn' | 'success' | 'danger' | 'dice';

export interface LogEntry {
  id: number;
  message: string;
  type: LogType;
  timestamp: number;
}

export type ModalId = 'chest' | 'gameover' | 'shop';

export interface GameEvents {
  'dice:roll': void;
  'player:attack': { weaponId: string };
  'battle:flee': void;
  'game:restart': void;
  'modal:close': { modalId: ModalId };
  'shop:buy': { index: number };

  'dice:rolling': void;
  'dice:result': { value: number };
  'player:move-start': { steps: number };
  'player:position': { x: number; y: number };
  'player:move-end': { x: number; y: number };
  'event:trigger': {
    type: CellType;
    x: number;
    y: number;
  };
  'player:hp-change': { hp: number; delta: number };
  'player:gold-change': { gold: number; delta: number };
  'player:weapon-add': { weapon: Weapon };
  'battle:start': { monster: Monster };
  'battle:player-attack': { damage: number; anim: 'slash' };
  'battle:monster-attack': { damage: number };
  'battle:end': { victory: boolean };
  'log:add': { message: string; type?: LogType };
  'modal:open': {
    id: ModalId;
    data: ChestData | GameOverData | ShopData;
  };
  'game:over': {
    victory: boolean;
    stats: { gold: number; kills: number; floors: number };
  };
  'trap:flash': { x: number; y: number };
}

export type EventName = keyof GameEvents;
