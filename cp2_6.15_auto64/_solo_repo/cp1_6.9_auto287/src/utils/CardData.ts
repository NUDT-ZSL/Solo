export interface CatCard {
  id: string;
  pairId: number;
  name: string;
  hue: number;
  color: string;
  accentColor: string;
  emoji: string;
  description: string;
}

export const CAT_BREEDS: Omit<CatCard, 'id'>[] = [
  {
    pairId: 0,
    name: '橘猫小胖',
    hue: 20,
    color: '#FF8C42',
    accentColor: '#D35400',
    emoji: '🐱',
    description: '贪吃又可爱的橘座大人'
  },
  {
    pairId: 1,
    name: '奶牛花花',
    hue: 60,
    color: '#FFD93D',
    accentColor: '#C9A227',
    emoji: '😸',
    description: '黑白相间的活泼奶牛猫'
  },
  {
    pairId: 2,
    name: '布偶仙子',
    hue: 100,
    color: '#6BCB77',
    accentColor: '#2E8B57',
    emoji: '😻',
    description: '温柔如云朵的布偶猫'
  },
  {
    pairId: 3,
    name: '英短蓝蓝',
    hue: 140,
    color: '#4ECDC4',
    accentColor: '#1A8A7E',
    emoji: '😺',
    description: '圆脸蓝眼睛的绅士猫'
  },
  {
    pairId: 4,
    name: '暹罗阿明',
    hue: 180,
    color: '#4D96FF',
    accentColor: '#1E5AA8',
    emoji: '😼',
    description: '优雅话多的暹罗贵族'
  },
  {
    pairId: 5,
    name: '美短虎斑',
    hue: 220,
    color: '#6F69AC',
    accentColor: '#3A3670',
    emoji: '😽',
    description: '聪明活泼的小虎斑'
  },
  {
    pairId: 6,
    name: '波斯雪球',
    hue: 260,
    color: '#A66CFF',
    accentColor: '#6B3FA0',
    emoji: '😸',
    description: '毛茸茸的白色公主'
  },
  {
    pairId: 7,
    name: '孟买小黑',
    hue: 300,
    color: '#FF6FB5',
    accentColor: '#C7438D',
    emoji: '🐈‍⬛',
    description: '神秘优雅的黑豹'
  }
];

export function hslToHex(hue: number, saturation: number = 70, lightness: number = 60): string {
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  if (s === 0) {
    const r = Math.round(l * 255).toString(16).padStart(2, '0');
    return `#${r}${r}${r}`;
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255).toString(16).padStart(2, '0');
  const g = Math.round(hue2rgb(p, q, h) * 255).toString(16).padStart(2, '0');
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function generateShuffledDeck(): CatCard[] {
  const deck: CatCard[] = [];

  CAT_BREEDS.forEach((breed, index) => {
    deck.push({
      ...breed,
      id: `card-${index}-a`
    });
    deck.push({
      ...breed,
      id: `card-${index}-b`
    });
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export const CARD_CONFIG = {
  WIDTH: 80,
  HEIGHT: 100,
  GAP: 15,
  COLS: 4,
  ROWS: 4,
  FLIP_DURATION: 300,
  MEMORY_TIME: 3500,
  WRONG_FLIPBACK: 2000,
  BOUNCE_DISTANCE: -30,
  BOUNCE_DURATION: 500,
  SHAKE_DISTANCE: 5,
  SHAKE_DURATION: 200,
  PARTICLE_COUNT: 8,
  PARTICLE_DURATION: 800
} as const;
