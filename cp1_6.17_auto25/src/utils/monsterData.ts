export type PartType = 'head' | 'torso' | 'legs' | 'tail';

export interface Part {
  id: string;
  type: PartType;
  name: string;
  hp: number;
  attack: number;
  speed: number;
  color: string;
  accentColor: string;
}

export interface Monster {
  id: string;
  name: string;
  parts: {
    head: Part | null;
    torso: Part | null;
    legs: Part | null;
    tail: Part | null;
  };
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  speed: number;
}

export interface BattleMonster extends Monster {
  currentHp: number;
  currentMp: number;
  isPlayer: boolean;
}

export interface PokedexEntry {
  id: string;
  partIds: string[];
  totalPower: number;
  name: string;
  unlockedAt: number;
}

export interface BattleLog {
  id: string;
  timestamp: number;
  playerTeam: string[][];
  enemyTeam: string[][];
  result: 'win' | 'lose';
  turns: number;
}

export const PARTS: Part[] = [
  { id: 'h1', type: 'head', name: '火龙头', hp: 30, attack: 12, speed: 5, color: '#E53935', accentColor: '#FF8A80' },
  { id: 'h2', type: 'head', name: '冰霜头', hp: 25, attack: 10, speed: 7, color: '#29B6F6', accentColor: '#81D4FA' },
  { id: 'h3', type: 'head', name: '雷兽头', hp: 22, attack: 15, speed: 8, color: '#FDD835', accentColor: '#FFF59D' },
  { id: 'h4', type: 'head', name: '毒蟾头', hp: 28, attack: 11, speed: 4, color: '#7CB342', accentColor: '#C5E1A5' },
  { id: 'h5', type: 'head', name: '暗龙头', hp: 35, attack: 14, speed: 3, color: '#5E35B1', accentColor: '#B39DDB' },
  { id: 'h6', type: 'head', name: '狮王头', hp: 32, attack: 13, speed: 6, color: '#FB8C00', accentColor: '#FFCC80' },

  { id: 't1', type: 'torso', name: '石甲身', hp: 50, attack: 10, speed: 2, color: '#8D6E63', accentColor: '#BCAAA4' },
  { id: 't2', type: 'torso', name: '火焰身', hp: 40, attack: 15, speed: 4, color: '#F4511E', accentColor: '#FFAB91' },
  { id: 't3', type: 'torso', name: '水晶身', hp: 45, attack: 8, speed: 6, color: '#26C6DA', accentColor: '#80DEEA' },
  { id: 't4', type: 'torso', name: '肌肉身', hp: 55, attack: 12, speed: 3, color: '#8E24AA', accentColor: '#CE93D8' },
  { id: 't5', type: 'torso', name: '铁甲身', hp: 60, attack: 11, speed: 1, color: '#546E7A', accentColor: '#B0BEC5' },
  { id: 't6', type: 'torso', name: '鳞甲身', hp: 48, attack: 13, speed: 5, color: '#2E7D32', accentColor: '#A5D6A7' },

  { id: 'l1', type: 'legs', name: '疾风腿', hp: 15, attack: 5, speed: 10, color: '#00BCD4', accentColor: '#80DEEA' },
  { id: 'l2', type: 'legs', name: '重锤腿', hp: 25, attack: 10, speed: 3, color: '#6D4C41', accentColor: '#D7CCC8' },
  { id: 'l3', type: 'legs', name: '弹簧腿', hp: 18, attack: 6, speed: 8, color: '#9CCC65', accentColor: '#DCE775' },
  { id: 'l4', type: 'legs', name: '利爪腿', hp: 20, attack: 12, speed: 5, color: '#C62828', accentColor: '#EF9A9A' },
  { id: 'l5', type: 'legs', name: '悬浮腿', hp: 16, attack: 7, speed: 9, color: '#3949AB', accentColor: '#9FA8DA' },
  { id: 'l6', type: 'legs', name: '岩柱腿', hp: 30, attack: 8, speed: 2, color: '#757575', accentColor: '#E0E0E0' },

  { id: 'ta1', type: 'tail', name: '刺尾', hp: 10, attack: 8, speed: 2, color: '#455A64', accentColor: '#90A4AE' },
  { id: 'ta2', type: 'tail', name: '毒尾', hp: 8, attack: 10, speed: 3, color: '#689F38', accentColor: '#C0CA33' },
  { id: 'ta3', type: 'tail', name: '闪电尾', hp: 7, attack: 12, speed: 5, color: '#FFEB3B', accentColor: '#FFF176' },
  { id: 'ta4', type: 'tail', name: '缠绕尾', hp: 15, attack: 6, speed: 4, color: '#00897B', accentColor: '#4DB6AC' },
  { id: 'ta5', type: 'tail', name: '火球尾', hp: 9, attack: 11, speed: 3, color: '#EF6C00', accentColor: '#FFB74D' },
  { id: 'ta6', type: 'tail', name: '冰锥尾', hp: 11, attack: 9, speed: 4, color: '#0277BD', accentColor: '#4FC3F7' },
];

export const MONSTER_NAMES_PREFIX = ['炎', '冰', '雷', '毒', '暗', '光', '狂', '圣', '神', '魔'];
export const MONSTER_NAMES_SUFFIX = ['兽', '龙', '鬼', '王', '皇', '者', '尊', '灵', '魔', '怪'];

export function generateMonsterName(): string {
  const prefix = MONSTER_NAMES_PREFIX[Math.floor(Math.random() * MONSTER_NAMES_PREFIX.length)];
  const suffix = MONSTER_NAMES_SUFFIX[Math.floor(Math.random() * MONSTER_NAMES_SUFFIX.length)];
  const num = Math.floor(Math.random() * 100);
  return `${prefix}${suffix}${num}`;
}

export function createMonsterFromParts(parts: {
  head: Part | null;
  torso: Part | null;
  legs: Part | null;
  tail: Part | null;
}): Monster | null {
  if (!parts.head || !parts.torso || !parts.legs || !parts.tail) return null;

  const totalHp = parts.head.hp + parts.torso.hp + parts.legs.hp + parts.tail.hp;
  const totalAttack = parts.head.attack + parts.torso.attack + parts.legs.attack + parts.tail.attack;
  const totalSpeed = parts.head.speed + parts.torso.speed + parts.legs.speed + parts.tail.speed;

  return {
    id: `${parts.head.id}-${parts.torso.id}-${parts.legs.id}-${parts.tail.id}-${Date.now()}`,
    name: generateMonsterName(),
    parts,
    hp: totalHp,
    maxHp: totalHp,
    mp: 50,
    maxMp: 50,
    attack: totalAttack,
    speed: totalSpeed,
  };
}

export function calculateDamage(attacker: BattleMonster, defender: BattleMonster): number {
  const baseDamage = attacker.attack;
  const variance = Math.floor(Math.random() * 6) - 2;
  const defenseFactor = 0.1 + (defender.maxHp / 500) * 0.15;
  const damage = Math.max(1, Math.floor(baseDamage * (1 - defenseFactor) + variance));
  return damage;
}

export function calculatePower(monster: Monster): number {
  return Math.floor(monster.maxHp * 0.5 + monster.attack * 2 + monster.speed * 1.5);
}

export function getPartsByType(type: PartType): Part[] {
  return PARTS.filter(p => p.type === type);
}

export function getPartById(id: string): Part | undefined {
  return PARTS.find(p => p.id === id);
}
