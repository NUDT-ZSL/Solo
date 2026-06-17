import { Card } from './types';
import { v4 as uuidv4 } from 'uuid';

const CARD_TEMPLATES: Omit<Card, 'id'>[] = [
  { name: '火球术', attack: 8, cost: 4, description: '造成8点伤害' },
  { name: '闪电链', attack: 5, cost: 3, description: '造成5点伤害' },
  { name: '暗影箭', attack: 3, cost: 2, description: '造成3点伤害' },
  { name: '烈焰风暴', attack: 10, cost: 5, description: '造成10点伤害' },
  { name: '寒冰箭', attack: 4, cost: 2, description: '造成4点伤害' },
  { name: '奥术飞弹', attack: 2, cost: 1, description: '造成2点伤害' },
  { name: '灵魂之火', attack: 6, cost: 3, description: '造成6点伤害' },
  { name: '死亡缠绕', attack: 7, cost: 4, description: '造成7点伤害' },
  { name: '炎爆术', attack: 12, cost: 6, description: '造成12点伤害' },
  { name: '腐蚀术', attack: 3, cost: 1, description: '造成3点伤害' },
  { name: '神圣之光', attack: 5, cost: 3, description: '造成5点伤害' },
  { name: '月火术', attack: 2, cost: 1, description: '造成2点伤害' },
  { name: '愤怒', attack: 4, cost: 2, description: '造成4点伤害' },
  { name: '星涌术', attack: 9, cost: 5, description: '造成9点伤害' },
  { name: '暗言术痛', attack: 6, cost: 3, description: '造成6点伤害' },
];

export function createCard(template?: Omit<Card, 'id'>): Card {
  const tpl = template || CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
  return { ...tpl, id: uuidv4() };
}

export function createDeck(count: number): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < count; i++) {
    deck.push(createCard());
  }
  return deck;
}

export function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}
