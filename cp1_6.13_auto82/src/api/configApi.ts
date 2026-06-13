import axios from 'axios';

export interface Card {
  id: number;
  name: string;
  type: 'attack' | 'defense' | 'energy';
  cost: number;
  damage: number;
  defense: number;
  energy: number;
  description: string;
  instanceId?: string;
}

export interface DeckResponse {
  deck: Card[];
}

export interface CardsResponse {
  cards: Card[];
}

const VALID_TYPES: Card['type'][] = ['attack', 'defense', 'energy'];

export function validateCardData(card: unknown, index: number = 0): Card | null {
  if (!card || typeof card !== 'object') {
    console.warn(`[Card Validation] 卡牌数据不是有效对象，索引 ${index}`);
    return null;
  }

  const c = card as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof c.id !== 'number') {
    errors.push(`id应为数字，实际为${typeof c.id}`);
  } else if (c.id <= 0) {
    errors.push(`id应为正数，实际为${c.id}`);
  }

  if (typeof c.name !== 'string') {
    errors.push(`name应为字符串，实际为${typeof c.name}`);
  } else if (c.name.trim() === '') {
    errors.push(`name不能为空字符串`);
  }

  if (typeof c.type !== 'string' || !VALID_TYPES.includes(c.type as Card['type'])) {
    errors.push(`type应为${VALID_TYPES.join('/')}，实际为${c.type}`);
  }

  if (typeof c.cost !== 'number') {
    errors.push(`cost应为数字，实际为${typeof c.cost}`);
  } else if (c.cost < 0 || c.cost > 10) {
    errors.push(`cost应在0-10之间，实际为${c.cost}`);
  }

  if (typeof c.damage !== 'number') {
    errors.push(`damage应为数字，实际为${typeof c.damage}`);
  } else if (c.damage < 0) {
    errors.push(`damage不能为负数，实际为${c.damage}`);
  }

  if (typeof c.defense !== 'number') {
    errors.push(`defense应为数字，实际为${typeof c.defense}`);
  } else if (c.defense < 0) {
    errors.push(`defense不能为负数，实际为${c.defense}`);
  }

  if (typeof c.energy !== 'number') {
    errors.push(`energy应为数字，实际为${typeof c.energy}`);
  }

  if (typeof c.description !== 'string') {
    errors.push(`description应为字符串，实际为${typeof c.description}`);
  }

  if (errors.length > 0) {
    console.warn(`[Card Validation] 卡牌 ${c.name || c.id || index} 验证失败:`, errors);
    return null;
  }

  return {
    id: c.id as number,
    name: c.name as string,
    type: c.type as Card['type'],
    cost: c.cost as number,
    damage: c.damage as number,
    defense: c.defense as number,
    energy: c.energy as number,
    description: c.description as string
  };
}

export function validateCardArray(data: unknown, source: string): Card[] {
  if (!Array.isArray(data)) {
    console.error(`[Card Validation] ${source} 返回数据不是数组`);
    return [];
  }

  const validCards: Card[] = [];
  let invalidCount = 0;

  data.forEach((item, index) => {
    const validated = validateCardData(item, index);
    if (validated) {
      validCards.push(validated);
    } else {
      invalidCount++;
    }
  });

  if (invalidCount > 0) {
    console.warn(`[Card Validation] ${source} 中有 ${invalidCount} 张卡牌验证失败，已跳过`);
  }

  if (validCards.length === 0) {
    console.error(`[Card Validation] ${source} 中没有有效卡牌数据，返回空数组`);
  } else {
    console.log(`[Card Validation] ${source} 成功验证 ${validCards.length} 张卡牌`);
  }

  return validCards;
}

function createFallbackCard(id: number): Card {
  const fallbackCards: Card[] = [
    { id, name: '蒸汽拳刃', type: 'attack', cost: 1, damage: 3, defense: 0, energy: 0, description: '造成3点伤害' },
    { id: id + 1, name: '铜盾格挡', type: 'defense', cost: 1, damage: 0, defense: 4, energy: 0, description: '获得4点护盾' },
    { id: id + 2, name: '能量充能', type: 'energy', cost: 0, damage: 0, defense: 0, energy: 2, description: '获得2点能量' },
    { id: id + 3, name: '燃烧弹', type: 'attack', cost: 2, damage: 6, defense: 0, energy: 0, description: '造成6点伤害' },
    { id: id + 4, name: '铁甲护甲', type: 'defense', cost: 2, damage: 0, defense: 7, energy: 0, description: '获得7点护盾' }
  ];
  return fallbackCards[id % fallbackCards.length];
}

export function ensureMinimumCards(cards: Card[], minimum: number = 20): Card[] {
  if (cards.length >= minimum) return cards;
  
  console.warn(`[Card Validation] 卡牌数量不足 (${cards.length}/${minimum})，使用补充卡牌`);
  const result = [...cards];
  let nextId = Math.max(1000, ...cards.map(c => c.id)) + 1;
  
  while (result.length < minimum) {
    result.push(createFallbackCard(nextId++));
  }
  
  return result;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const configApi = {
  async getCards(): Promise<Card[]> {
    try {
      const response = await api.get<CardsResponse>('/cards');
      
      if (!response.data || !response.data.cards) {
        console.error('[Card Validation] /cards 接口返回格式不正确，缺少cards字段');
        return ensureMinimumCards([], 20);
      }
      
      const validated = validateCardArray(response.data.cards, '/cards');
      return ensureMinimumCards(validated, 20);
    } catch (error) {
      console.error('[Card Validation] 获取 /cards 数据失败:', error);
      return ensureMinimumCards([], 20);
    }
  },

  async getDeck(): Promise<Card[]> {
    try {
      const response = await api.get<DeckResponse>('/decks');
      
      if (!response.data || !response.data.deck) {
        console.error('[Card Validation] /decks 接口返回格式不正确，缺少deck字段');
        return ensureMinimumCards([], 40);
      }
      
      const validated = validateCardArray(response.data.deck, '/decks');
      return ensureMinimumCards(validated, 40);
    } catch (error) {
      console.error('[Card Validation] 获取 /decks 数据失败:', error);
      return ensureMinimumCards([], 40);
    }
  }
};
