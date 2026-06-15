export type ElementType = 'fire' | 'water' | 'wind' | 'earth';

export interface ElementConfig {
  name: string;
  color: number;
  colorHex: string;
  projectileColor: number;
  generates: ElementType;
  generatesFrom: ElementType;
  icon: string;
  glowColor: number;
}

export const ELEMENTS: Record<ElementType, ElementConfig> = {
  fire: {
    name: '火',
    color: 0xff4500,
    colorHex: '#ff4500',
    projectileColor: 0xff6600,
    generates: 'earth',
    generatesFrom: 'wind',
    icon: '🔥',
    glowColor: 0xff3300
  },
  water: {
    name: '水',
    color: 0x1e90ff,
    colorHex: '#1e90ff',
    projectileColor: 0x44aaff,
    generates: 'wind',
    generatesFrom: 'earth',
    icon: '💧',
    glowColor: 0x0066ff
  },
  wind: {
    name: '风',
    color: 0x7fff00,
    colorHex: '#7fff00',
    projectileColor: 0x99ff44,
    generates: 'fire',
    generatesFrom: 'water',
    icon: '🌀',
    glowColor: 0x33cc00
  },
  earth: {
    name: '地',
    color: 0x8b4513,
    colorHex: '#8b4513',
    projectileColor: 0xaa6633,
    generates: 'water',
    generatesFrom: 'fire',
    icon: '⛰️',
    glowColor: 0x663300
  }
};

export function checkFusion(a: ElementType, b: ElementType): boolean {
  return ELEMENTS[a].generates === b || ELEMENTS[b].generates === a;
}

export const ELEMENT_ORDER: ElementType[] = ['fire', 'water', 'wind', 'earth'];
