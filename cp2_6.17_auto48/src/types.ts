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
  description: string;
}

export const ROOM_DESCRIPTIONS: Record<RoomType, string[]> = {
  [RoomType.NormalMonster]: [
    '一间散发着霉味的石室，角落里传来低沉的咆哮声。',
    '潮湿的地面上布满了奇怪的爪印，空气中弥漫着血腥味。',
    '火把忽明忽暗，你隐约看到阴影中有东西在蠕动。',
    '残破的盔甲散落在地上，显然曾有冒险者在此陨落。',
    '令人不安的嘶嘶声从天花板的裂缝中传来。',
  ],
  [RoomType.EliteMonster]: [
    '一股强大的压迫感扑面而来，地面在微微震颤。',
    '幽紫色的火焰在石台上燃烧，黑暗中似乎有双眼睛在注视着你。',
    '古老的符文在墙壁上发出诡异的红光，空气中充满魔力波动。',
    '巨大的骸骨散落在王座周围，一股寒意从脊梁升起。',
    '你感觉到了——这里的主人绝非等闲之辈。',
  ],
  [RoomType.Treasure]: [
    '金色的光芒从石缝中透出，这里似乎藏着什么宝贝。',
    '精美的宝箱安静地躺在祭坛上，周围没有任何陷阱的痕迹。',
    '空气中飘着淡淡的香气，墙上的宝石闪烁着迷人的光泽。',
    '一张古老的藏宝图指示这里就是终点！',
    '铺满金币的地面让你几乎无法下脚。',
  ],
};

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
