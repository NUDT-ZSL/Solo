export type RuneElement = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export interface RuneDefinition {
  element: RuneElement;
  name: string;
  color: number;
  glowColor: number;
  symbol: string;
  attackBonus: number;
  defenseBonus: number;
  manaCost: number;
}

export interface UpgradedRune extends RuneDefinition {
  tier: number;
  previousElement: RuneElement;
}

export interface WeaponRecipe {
  name: string;
  symbol: string;
  elements: RuneElement[];
  attackPower: number;
  defensePower: number;
  elementType: RuneElement;
  description: string;
}

export const BASE_MANA_COST = 5;
export const UPGRADED_MANA_COST = 15;
export const WEAPON_FORGE_MANA_COST = 20;

export const RUNE_DEFINITIONS: Record<RuneElement, RuneDefinition> = {
  fire: {
    element: 'fire',
    name: '火焰符文',
    color: 0xe84118,
    glowColor: 0xff6348,
    symbol: '🔥',
    attackBonus: 8,
    defenseBonus: 2,
    manaCost: 5,
  },
  water: {
    element: 'water',
    name: '水流符文',
    color: 0x0984e3,
    glowColor: 0x74b9ff,
    symbol: '💧',
    attackBonus: 4,
    defenseBonus: 8,
    manaCost: 5,
  },
  wind: {
    element: 'wind',
    name: '疾风符文',
    color: 0x00b894,
    glowColor: 0x55efc4,
    symbol: '🌪',
    attackBonus: 6,
    defenseBonus: 5,
    manaCost: 5,
  },
  earth: {
    element: 'earth',
    name: '大地符文',
    color: 0x6c5ce7,
    glowColor: 0xa29bfe,
    symbol: '🪨',
    attackBonus: 3,
    defenseBonus: 10,
    manaCost: 5,
  },
  light: {
    element: 'light',
    name: '圣光符文',
    color: 0xfdcb6e,
    glowColor: 0xffeaa7,
    symbol: '✨',
    attackBonus: 7,
    defenseBonus: 6,
    manaCost: 5,
  },
  dark: {
    element: 'dark',
    name: '暗影符文',
    color: 0x636e72,
    glowColor: 0xb2bec3,
    symbol: '🌑',
    attackBonus: 10,
    defenseBonus: 3,
    manaCost: 5,
  },
};

export const UPGRADED_RUNE_MAP: Record<string, UpgradedRune> = {
  'fire_fire_fire': {
    element: 'fire',
    name: '炎灵符文',
    color: 0xc0392b,
    glowColor: 0xff4757,
    symbol: '🔥',
    tier: 2,
    previousElement: 'fire',
    attackBonus: 20,
    defenseBonus: 5,
    manaCost: 15,
  },
  'water_water_water': {
    element: 'water',
    name: '海啸符文',
    color: 0x0652DD,
    glowColor: 0x1e90ff,
    symbol: '💧',
    tier: 2,
    previousElement: 'water',
    attackBonus: 10,
    defenseBonus: 20,
    manaCost: 15,
  },
  'wind_wind_wind': {
    element: 'wind',
    name: '风暴符文',
    color: 0x009432,
    glowColor: 0x4cd137,
    symbol: '🌪',
    tier: 2,
    previousElement: 'wind',
    attackBonus: 16,
    defenseBonus: 12,
    manaCost: 15,
  },
  'earth_earth_earth': {
    element: 'earth',
    name: '磐石符文',
    color: 0x4a3f6b,
    glowColor: 0x7c6fa6,
    symbol: '🪨',
    tier: 2,
    previousElement: 'earth',
    attackBonus: 8,
    defenseBonus: 25,
    manaCost: 15,
  },
  'light_light_light': {
    element: 'light',
    name: '神耀符文',
    color: 0xf9ca24,
    glowColor: 0xffd32a,
    symbol: '✨',
    tier: 2,
    previousElement: 'light',
    attackBonus: 18,
    defenseBonus: 15,
    manaCost: 15,
  },
  'dark_dark_dark': {
    element: 'dark',
    name: '虚空符文',
    color: 0x2d3436,
    glowColor: 0x636e72,
    symbol: '🌑',
    tier: 2,
    previousElement: 'dark',
    attackBonus: 25,
    defenseBonus: 7,
    manaCost: 15,
  },
};

export const WEAPON_RECIPES: WeaponRecipe[] = [
  {
    name: '火焰剑',
    symbol: '⚔',
    elements: ['fire', 'fire', 'wind'],
    attackPower: 25,
    defensePower: 5,
    elementType: 'fire',
    description: '烈焰与疾风铸成的灼热之剑',
  },
  {
    name: '冰霜盾',
    symbol: '🛡',
    elements: ['water', 'water', 'earth'],
    attackPower: 10,
    defensePower: 30,
    elementType: 'water',
    description: '寒冰与大地之力凝铸的坚盾',
  },
  {
    name: '冰霜弓',
    symbol: '🏹',
    elements: ['water', 'water', 'wind'],
    attackPower: 22,
    defensePower: 8,
    elementType: 'water',
    description: '寒冰凝聚的远程利器',
  },
  {
    name: '大地之锤',
    symbol: '🔨',
    elements: ['earth', 'earth', 'fire'],
    attackPower: 28,
    defensePower: 12,
    elementType: 'earth',
    description: '大地之力与烈焰锻造的重锤',
  },
  {
    name: '圣光之杖',
    symbol: '🪄',
    elements: ['light', 'light', 'wind'],
    attackPower: 20,
    defensePower: 10,
    elementType: 'light',
    description: '圣光祝福的神圣权杖',
  },
  {
    name: '暗影匕首',
    symbol: '🗡',
    elements: ['dark', 'dark', 'wind'],
    attackPower: 30,
    defensePower: 3,
    elementType: 'dark',
    description: '虚空之力凝聚的暗杀利刃',
  },
  {
    name: '风暴长矛',
    symbol: '🌩',
    elements: ['wind', 'wind', 'fire'],
    attackPower: 24,
    defensePower: 6,
    elementType: 'wind',
    description: '暴风与烈焰交织的长矛',
  },
  {
    name: '生命之盾',
    symbol: '💚',
    elements: ['water', 'earth', 'light'],
    attackPower: 15,
    defensePower: 25,
    elementType: 'light',
    description: '守护之力的圣盾',
  },
  {
    name: '毁灭法杖',
    symbol: '💀',
    elements: ['fire', 'dark', 'dark'],
    attackPower: 35,
    defensePower: 2,
    elementType: 'dark',
    description: '焚尽一切的黑暗法杖',
  },
];

export function getRuneColor(element: RuneElement): number {
  return RUNE_DEFINITIONS[element].color;
}

export function getRuneGlowColor(element: RuneElement): number {
  return RUNE_DEFINITIONS[element].glowColor;
}

export function findMergeResult(runes: RuneElement[]): UpgradedRune | null {
  const key = runes.sort().join('_');
  return UPGRADED_RUNE_MAP[key] || null;
}

export function findWeaponRecipe(elements: RuneElement[]): WeaponRecipe | null {
  for (const recipe of WEAPON_RECIPES) {
    if (recipe.elements.length !== elements.length) continue;
    const sortedA = [...recipe.elements].sort();
    const sortedB = [...elements].sort();
    if (sortedA.every((e, i) => e === sortedB[i])) {
      return recipe;
    }
  }
  return null;
}
