export type ElementType = 'fire' | 'water' | 'wind' | 'earth' | 'dark' | 'light';

export interface MagicSpell {
  id: string;
  name: string;
  elements: ElementType[];
  damage: number;
  element: ElementType;
  effect?: string;
  description: string;
}

export interface Monster {
  id: string;
  name: string;
  element: ElementType;
  maxHp: number;
  currentHp: number;
  attack: number;
  resistances: ElementType[];
  weaknesses: ElementType[];
  icon: string;
}

export interface MonsterTemplate {
  name: string;
  element: ElementType;
  baseHp: number;
  baseAttack: number;
  resistances: ElementType[];
  weaknesses: ElementType[];
  icon: string;
}

export interface Recipe {
  elements: ElementType[];
  result: MagicSpell;
}

export interface BattleLogEntry {
  id: string;
  type: 'player' | 'monster' | 'system';
  message: string;
  turn: number;
  timestamp: number;
}

export interface ElementInfo {
  name: string;
  color: string;
  symbol: string;
}

export const elementInfo: Record<ElementType, ElementInfo> = {
  fire: { name: '火', color: '#FF4500', symbol: '🔥' },
  water: { name: '水', color: '#1E90FF', symbol: '💧' },
  wind: { name: '风', color: '#98FB98', symbol: '🌪️' },
  earth: { name: '土', color: '#D2691E', symbol: '🪨' },
  dark: { name: '暗', color: '#4B0082', symbol: '🌑' },
  light: { name: '光', color: '#FFD700', symbol: '✨' }
};

export const BASE_ELEMENTS: ElementType[] = ['fire', 'water', 'wind', 'earth'];

export const recipes: Recipe[] = [
  {
    elements: ['fire', 'fire'],
    result: {
      id: 'spell-001',
      name: '烈焰冲击',
      elements: ['fire', 'fire'],
      damage: 30,
      element: 'fire',
      effect: 'burn',
      description: '双火凝聚成的灼热冲击波'
    }
  },
  {
    elements: ['water', 'water'],
    result: {
      id: 'spell-002',
      name: '潮汐涌动',
      elements: ['water', 'water'],
      damage: 28,
      element: 'water',
      effect: 'drown',
      description: '双重水系召唤的巨浪'
    }
  },
  {
    elements: ['wind', 'wind'],
    result: {
      id: 'spell-003',
      name: '狂风斩',
      elements: ['wind', 'wind'],
      damage: 25,
      element: 'wind',
      effect: 'cut',
      description: '极速气流形成的锋利风刃'
    }
  },
  {
    elements: ['earth', 'earth'],
    result: {
      id: 'spell-004',
      name: '岩石崩塌',
      elements: ['earth', 'earth'],
      damage: 35,
      element: 'earth',
      effect: 'crush',
      description: '厚重岩石从天而降'
    }
  },
  {
    elements: ['fire', 'water'],
    result: {
      id: 'spell-005',
      name: '蒸汽爆发',
      elements: ['fire', 'water'],
      damage: 32,
      element: 'fire',
      effect: 'steam',
      description: '水火交融产生的爆炸性蒸汽'
    }
  },
  {
    elements: ['fire', 'wind'],
    result: {
      id: 'spell-006',
      name: '火焰龙卷',
      elements: ['fire', 'wind'],
      damage: 35,
      element: 'fire',
      effect: 'tornado',
      description: '风助火势的烈焰龙卷风'
    }
  },
  {
    elements: ['fire', 'earth'],
    result: {
      id: 'spell-007',
      name: '熔岩喷射',
      elements: ['fire', 'earth'],
      damage: 40,
      element: 'fire',
      effect: 'lava',
      description: '燃烧的岩浆喷涌而出'
    }
  },
  {
    elements: ['water', 'wind'],
    result: {
      id: 'spell-008',
      name: '冰霜风暴',
      elements: ['water', 'wind'],
      damage: 30,
      element: 'water',
      effect: 'ice',
      description: '凛冽寒风裹挟着冰晶'
    }
  },
  {
    elements: ['water', 'earth'],
    result: {
      id: 'spell-009',
      name: '泥沼陷阱',
      elements: ['water', 'earth'],
      damage: 28,
      element: 'water',
      effect: 'mud',
      description: '泥水土融合形成的束缚陷阱'
    }
  },
  {
    elements: ['wind', 'earth'],
    result: {
      id: 'spell-010',
      name: '沙尘暴',
      elements: ['wind', 'earth'],
      damage: 33,
      element: 'wind',
      effect: 'sand',
      description: '漫天黄沙遮蔽一切'
    }
  },
  {
    elements: ['fire', 'water', 'wind'],
    result: {
      id: 'spell-011',
      name: '元素风暴',
      elements: ['fire', 'water', 'wind'],
      damage: 50,
      element: 'light',
      effect: 'storm',
      description: '三元素融合的毁灭风暴'
    }
  },
  {
    elements: ['fire', 'earth', 'water'],
    result: {
      id: 'spell-012',
      name: '创世熔岩',
      elements: ['fire', 'earth', 'water'],
      damage: 55,
      element: 'earth',
      effect: 'genesis',
      description: '混沌初开的创世之力'
    }
  },
  {
    elements: ['fire', 'wind', 'earth'],
    result: {
      id: 'spell-013',
      name: '灭世烈焰',
      elements: ['fire', 'wind', 'earth'],
      damage: 60,
      element: 'fire',
      effect: 'apocalypse',
      description: '焚尽万物的终焉之火'
    }
  },
  {
    elements: ['water', 'wind', 'earth'],
    result: {
      id: 'spell-014',
      name: '自然之怒',
      elements: ['water', 'wind', 'earth'],
      damage: 48,
      element: 'water',
      effect: 'nature',
      description: '自然界三种元素的联合怒火'
    }
  }
];

export const monsterTemplates: MonsterTemplate[] = [
  {
    name: '火焰史莱姆',
    element: 'fire',
    baseHp: 80,
    baseAttack: 12,
    resistances: ['fire', 'earth'],
    weaknesses: ['water'],
    icon: '🔥_SLIME'
  },
  {
    name: '深海巨蟹',
    element: 'water',
    baseHp: 95,
    baseAttack: 10,
    resistances: ['water', 'fire'],
    weaknesses: ['wind', 'earth'],
    icon: '🦀_CRAB'
  },
  {
    name: '风之精灵',
    element: 'wind',
    baseHp: 70,
    baseAttack: 15,
    resistances: ['wind'],
    weaknesses: ['earth', 'fire'],
    icon: '🌬️_SPIRIT'
  },
  {
    name: '岩石巨人',
    element: 'earth',
    baseHp: 120,
    baseAttack: 8,
    resistances: ['earth', 'fire'],
    weaknesses: ['water', 'wind'],
    icon: '🗿_GIANT'
  },
  {
    name: '暗影行者',
    element: 'dark',
    baseHp: 85,
    baseAttack: 14,
    resistances: ['dark', 'water'],
    weaknesses: ['light', 'fire'],
    icon: '👤_SHADOW'
  },
  {
    name: '光明守护',
    element: 'light',
    baseHp: 100,
    baseAttack: 11,
    resistances: ['light', 'wind'],
    weaknesses: ['dark', 'earth'],
    icon: '☀️_GUARDIAN'
  }
];

export const PLAYER_MAX_HP = 150;
export const MONSTERS_TO_WIN = 3;
export const MAX_ELEMENTS_SELECTED = 3;
export const MIN_ELEMENTS_TO_COMPOSE = 2;
export const MAX_LOG_ENTRIES = 50;
export const DEFAULT_LOG_DISPLAY_COUNT = 10;
