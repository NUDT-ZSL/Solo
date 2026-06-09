import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  word: string;
  x: number;
  y: number;
  hue: number;
}

export interface Connection {
  from: string;
  to: string;
}

export interface SilkLine {
  from: Card;
  to: Card;
  path: string;
  color: string;
}

export const EMOTION_WORDS: { word: string; hue: number }[] = [
  { word: '月光', hue: 60 },
  { word: '海浪', hue: 240 },
  { word: '思念', hue: 280 },
  { word: '春风', hue: 120 },
  { word: '秋叶', hue: 30 },
  { word: '星辰', hue: 45 },
  { word: '落日', hue: 15 },
  { word: '晨露', hue: 180 },
  { word: '暗香', hue: 320 },
  { word: '远方', hue: 210 },
  { word: '寂寥', hue: 260 },
  { word: '热烈', hue: 0 },
  { word: '温柔', hue: 340 },
  { word: '漂泊', hue: 200 },
  { word: '归期', hue: 80 },
  { word: '初雪', hue: 200 },
  { word: '繁花', hue: 310 },
  { word: '孤灯', hue: 50 },
  { word: '银河', hue: 270 },
  { word: '细雨', hue: 230 },
  { word: '时光', hue: 30 },
  { word: '故乡', hue: 100 },
  { word: '涟漪', hue: 190 },
  { word: '暮色', hue: 345 },
  { word: '晨曦', hue: 40 },
  { word: '梦境', hue: 290 },
  { word: '清风', hue: 150 },
  { word: '幽窗', hue: 250 },
  { word: '红叶', hue: 5 },
  { word: '白霜', hue: 220 },
  { word: '流水', hue: 200 },
  { word: '高山', hue: 170 },
  { word: '长河', hue: 195 },
  { word: '大漠', hue: 45 },
  { word: '江南', hue: 140 },
  { word: '塞北', hue: 15 },
  { word: '渔火', hue: 25 },
  { word: '钟声', hue: 60 },
  { word: '云烟', hue: 185 },
  { word: '飞鸟', hue: 130 },
  { word: '落花', hue: 315 },
  { word: '残梦', hue: 265 },
  { word: '离歌', hue: 10 },
  { word: '欢颜', hue: 35 },
  { word: '醉意', hue: 350 },
  { word: '清欢', hue: 90 },
  { word: '浮生', hue: 210 },
  { word: '旧痕', hue: 285 },
  { word: '新茶', hue: 110 },
  { word: '老巷', hue: 20 }
];

export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 60;
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const CONNECTION_DISTANCE = 200;

export const getHueForWord = (word: string): number => {
  const found = EMOTION_WORDS.find((w) => w.word === word);
  if (found) return found.hue;
  return Math.floor(Math.random() * 360);
};

export const addCard = (
  cards: Card[],
  word: string,
  x: number,
  y: number
): { card: Card; cards: Card[] } => {
  const card: Card = {
    id: uuidv4(),
    word,
    x: Math.max(0, Math.min(x, CANVAS_WIDTH - CARD_WIDTH)),
    y: Math.max(0, Math.min(y, CANVAS_HEIGHT - CARD_HEIGHT)),
    hue: getHueForWord(word)
  };
  return { card, cards: [...cards, card] };
};

export const removeCard = (cards: Card[], cardId: string): Card[] => {
  return cards.filter((c) => c.id !== cardId);
};

export const updateConnection = (cards: Card[]): Connection[] => {
  const connections: Connection[] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i];
      const b = cards[j];
      const ax = a.x + CARD_WIDTH / 2;
      const ay = a.y + CARD_HEIGHT / 2;
      const bx = b.x + CARD_WIDTH / 2;
      const by = b.y + CARD_HEIGHT / 2;
      const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
      if (dist <= CONNECTION_DISTANCE) {
        connections.push({ from: a.id, to: b.id });
      }
    }
  }
  return connections;
};

export const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(255 * x).toString(16).padStart(2, '0');
    return hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

export const getEmotionColor = (
  hueA: number,
  hueB: number,
  alpha: number = 0.6
): string => {
  let midHue = (hueA + hueB) / 2;
  if (Math.abs(hueA - hueB) > 180) {
    midHue = (hueA + hueB + 360) / 2;
  }
  midHue = midHue % 360;
  return `hsla(${midHue}, 80%, 60%, ${alpha})`;
};

export const getCardEmotionBg = (hue: number): string => {
  return `hsla(${hue}, 80%, 50%, 0.2)`;
};

export const renderSilkLine = (
  from: Card,
  to: Card,
  brightness: number = 1
): SilkLine => {
  const ax = from.x + CARD_WIDTH / 2;
  const ay = from.y + CARD_HEIGHT / 2;
  const bx = to.x + CARD_WIDTH / 2;
  const by = to.y + CARD_HEIGHT / 2;

  const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;

  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const offset = (dist / CONNECTION_DISTANCE) * 50;
  const cp1x = midX + nx * offset;
  const cp1y = midY + ny * offset;

  const path = `M ${ax} ${ay} Q ${cp1x} ${cp1y} ${bx} ${by}`;
  const baseColor = getEmotionColor(from.hue, to.hue, 0.6);
  const lightness = 60 * brightness;
  let hue1 = from.hue;
  let hue2 = to.hue;
  let midHue = (hue1 + hue2) / 2;
  if (Math.abs(hue1 - hue2) > 180) {
    midHue = (hue1 + hue2 + 360) / 2;
  }
  midHue = midHue % 360;
  const color = `hsla(${midHue}, 80%, ${Math.min(lightness, 95)}%, 0.85)`;

  return { from, to, path, color };
};

export const getReadingOrder = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => a.y - b.y || a.x - b.x);
};

export const exportPoemAnimation = (
  cards: Card[],
  connections: Connection[]
): { lines: string[]; lineConnections: string[][]; cards: Card[]; connections: Connection[] } => {
  const ordered = getReadingOrder(cards);
  const lines: string[] = [];
  const lineConnections: string[][] = [];
  let currentY: number | null = null;
  let currentLine = '';
  let currentLineIds: string[] = [];

  ordered.forEach((card, idx) => {
    if (currentY === null || Math.abs(card.y - currentY) > 80) {
      if (currentLine) {
        lines.push(currentLine);
        lineConnections.push(currentLineIds);
      }
      currentY = card.y;
      currentLine = card.word;
      currentLineIds = [card.id];
    } else {
      currentLine += card.word;
      currentLineIds.push(card.id);
    }
    if (idx === ordered.length - 1) {
      lines.push(currentLine);
      lineConnections.push(currentLineIds);
    }
  });

  return { lines, lineConnections, cards: ordered, connections };
};
