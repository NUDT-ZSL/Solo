export enum RoomType {
  NormalMonster = 'normal_monster',
  EliteMonster = 'elite_monster',
  Treasure = 'treasure',
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: 'potion' | 'shield' | 'weapon' | 'treasure';
}

export interface Monster {
  name: string;
  hp: number;
  maxHp: number;
  minAttack: number;
  maxAttack: number;
  loot: string[];
  color: string;
}

export interface Room {
  x: number;
  y: number;
  type: RoomType;
  monster?: Monster;
  treasures?: Item[];
  visited: boolean;
  cleared: boolean;
  eventText: string;
}

export interface Player {
  hp: number;
  maxHp: number;
  gold: number;
  inventory: Item[];
  position: { x: number; y: number };
}

export interface GameState {
  rooms: Room[][];
  player: Player;
  currentEvent: string | null;
  currentRoom: Room | null;
  inBattle: boolean;
  battleLog: string[];
  gameOver: boolean;
  inventoryOpen: boolean;
  transitioning: boolean;
}

export const ITEM_POOL: Item[] = [
  { id: 'hp_potion', name: '生命药水', description: '恢复1点生命', icon: '❤️', color: '#e53e3e', type: 'potion' },
  { id: 'defense_shield', name: '防御护盾', description: '增强防御力', icon: '🛡️', color: '#3182ce', type: 'shield' },
  { id: 'fire_staff', name: '火焰法杖', description: '火焰攻击', icon: '🔥', color: '#ed8936', type: 'weapon' },
  { id: 'golden_ring', name: '黄金戒指', description: '价值50金币', icon: '💍', color: '#d69e2e', type: 'treasure' },
  { id: 'magic_amulet', name: '魔法护符', description: '神秘力量', icon: '📿', color: '#805ad5', type: 'treasure' },
  { id: 'ice_blade', name: '寒冰之刃', description: '冰冷攻击', icon: '⚔️', color: '#4fd1c5', type: 'weapon' },
  { id: 'ancient_scroll', name: '古老卷轴', description: '神秘知识', icon: '📜', color: '#edf2f7', type: 'treasure' },
  { id: 'dragon_gem', name: '龙之心宝石', description: '龙之力量', icon: '💎', color: '#e53e3e', type: 'treasure' },
  { id: 'elixir', name: '神圣药剂', description: '完全恢复', icon: '🧪', color: '#48bb78', type: 'potion' },
  { id: 'stealth_cloak', name: '隐身斗篷', description: '潜行能力', icon: '🧥', color: '#2d3748', type: 'shield' },
];

export const NORMAL_MONSTERS: Monster[] = [
  { name: '哥布林', hp: 20, maxHp: 20, minAttack: 5, maxAttack: 10, loot: ['hp_potion'], color: '#48bb78' },
  { name: '骷髅兵', hp: 25, maxHp: 25, minAttack: 6, maxAttack: 12, loot: ['golden_ring'], color: '#e2e8f0' },
  { name: '蝙蝠群', hp: 15, maxHp: 15, minAttack: 4, maxAttack: 8, loot: ['ancient_scroll'], color: '#2d3748' },
  { name: '巨型蜘蛛', hp: 30, maxHp: 30, minAttack: 7, maxAttack: 13, loot: ['magic_amulet'], color: '#805ad5' },
];

export const ELITE_MONSTERS: Monster[] = [
  { name: '暗黑骑士', hp: 60, maxHp: 60, minAttack: 10, maxAttack: 15, loot: ['fire_staff', 'dragon_gem'], color: '#e53e3e' },
  { name: '巫妖', hp: 50, maxHp: 50, minAttack: 12, maxAttack: 18, loot: ['ice_blade', 'elixir'], color: '#805ad5' },
  { name: '龙人战士', hp: 70, maxHp: 70, minAttack: 11, maxAttack: 16, loot: ['stealth_cloak', 'dragon_gem'], color: '#d69e2e' },
];
