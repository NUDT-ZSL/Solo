import {
  Card,
  Deck,
  RuneType,
  ElementType,
  PlayerState,
  INITIAL_HAND_SIZE,
  MAX_HAND_SIZE,
} from './types';

export const ALL_RUNE_CARDS: Card[] = [
  {
    id: 'rune_atk_1',
    name: '烈斩',
    category: 'rune',
    runeType: RuneType.Attack,
    cost: 2,
    power: 5,
    description: '挥出灼热一击，造成5点伤害',
    inkColor: '#ff4444',
  },
  {
    id: 'rune_atk_2',
    name: '裂空',
    category: 'rune',
    runeType: RuneType.Attack,
    cost: 3,
    power: 8,
    description: '撕裂虚空，造成8点伤害',
    inkColor: '#ff2222',
  },
  {
    id: 'rune_atk_3',
    name: '灭世',
    category: 'rune',
    runeType: RuneType.Attack,
    cost: 4,
    power: 11,
    description: '灭世之力，造成11点伤害',
    inkColor: '#cc0000',
  },
  {
    id: 'rune_def_1',
    name: '壁障',
    category: 'rune',
    runeType: RuneType.Defense,
    cost: 1,
    power: 4,
    description: '凝聚护盾，获得4点防御',
    inkColor: '#4488ff',
  },
  {
    id: 'rune_def_2',
    name: '金刚',
    category: 'rune',
    runeType: RuneType.Defense,
    cost: 3,
    power: 7,
    description: '金刚不坏，获得7点防御',
    inkColor: '#2266dd',
  },
  {
    id: 'rune_def_3',
    name: '天盾',
    category: 'rune',
    runeType: RuneType.Defense,
    cost: 4,
    power: 10,
    description: '天降神盾，获得10点防御',
    inkColor: '#1144bb',
  },
  {
    id: 'rune_heal_1',
    name: '回春',
    category: 'rune',
    runeType: RuneType.Heal,
    cost: 2,
    power: 4,
    description: '回复4点生命',
    inkColor: '#44ff88',
  },
  {
    id: 'rune_heal_2',
    name: '涅槃',
    category: 'rune',
    runeType: RuneType.Heal,
    cost: 3,
    power: 7,
    description: '涅槃重生，回复7点生命',
    inkColor: '#22dd66',
  },
  {
    id: 'rune_heal_3',
    name: '天愈',
    category: 'rune',
    runeType: RuneType.Heal,
    cost: 4,
    power: 10,
    description: '天降甘霖，回复10点生命',
    inkColor: '#11bb44',
  },
  {
    id: 'rune_dis_1',
    name: '惑心',
    category: 'rune',
    runeType: RuneType.Disrupt,
    cost: 1,
    power: 3,
    description: '惑乱敌心，造成3点伤害并降低敌方下回合能量1点',
    inkColor: '#aa44ff',
  },
  {
    id: 'rune_dis_2',
    name: '封印',
    category: 'rune',
    runeType: RuneType.Disrupt,
    cost: 3,
    power: 5,
    description: '封印之力，造成5点伤害并眩晕敌方1回合',
    inkColor: '#8822dd',
  },
  {
    id: 'rune_dis_3',
    name: '蚀咒',
    category: 'rune',
    runeType: RuneType.Disrupt,
    cost: 2,
    power: 4,
    description: '侵蚀咒力，造成4点伤害并吸取2点能量',
    inkColor: '#6600bb',
  },
];

export const ALL_ELEMENT_CARDS: Card[] = [
  {
    id: 'elem_fire_1',
    name: '炎爆',
    category: 'element',
    elementType: ElementType.Fire,
    cost: 2,
    power: 4,
    description: '引爆烈焰，造成4点火焰伤害',
    inkColor: '#ff6600',
  },
  {
    id: 'elem_fire_2',
    name: '业火',
    category: 'element',
    elementType: ElementType.Fire,
    cost: 3,
    power: 6,
    description: '业火焚身，造成6点火焰伤害并附加灼烧',
    inkColor: '#ff4400',
  },
  {
    id: 'elem_water_1',
    name: '冰棺',
    category: 'element',
    elementType: ElementType.Water,
    cost: 2,
    power: 3,
    description: '冰棺封印，造成3点伤害并冻结敌方1回合',
    inkColor: '#00ccff',
  },
  {
    id: 'elem_water_2',
    name: '洪流',
    category: 'element',
    elementType: ElementType.Water,
    cost: 3,
    power: 5,
    description: '召唤洪流，造成5点伤害并回复2点生命',
    inkColor: '#0099dd',
  },
  {
    id: 'elem_wind_1',
    name: '风切',
    category: 'element',
    elementType: ElementType.Wind,
    cost: 1,
    power: 3,
    description: '风刃切割，造成3点风系伤害',
    inkColor: '#88ffaa',
  },
  {
    id: 'elem_wind_2',
    name: '飓风',
    category: 'element',
    elementType: ElementType.Wind,
    cost: 3,
    power: 5,
    description: '召唤飓风，造成5点伤害并清除敌方增益',
    inkColor: '#66dd88',
  },
  {
    id: 'elem_earth_1',
    name: '地裂',
    category: 'element',
    elementType: ElementType.Earth,
    cost: 2,
    power: 4,
    description: '地裂山崩，造成4点伤害并获得2点防御',
    inkColor: '#cc8844',
  },
  {
    id: 'elem_earth_2',
    name: '山岳',
    category: 'element',
    elementType: ElementType.Earth,
    cost: 3,
    power: 3,
    description: '山岳庇护，获得6点防御',
    inkColor: '#aa6622',
  },
];

export const ALL_CARDS: Card[] = [...ALL_RUNE_CARDS, ...ALL_ELEMENT_CARDS];

export function getCardById(id: string): Card | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}

export function buildDeckFromIds(
  runeCardIds: string[],
  elementCardIds: string[],
  name: string
): Deck {
  return {
    id: 'deck_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    name,
    runeCardIds,
    elementCardIds,
  };
}

export function buildCardListFromDeck(deck: Deck): Card[] {
  const runeCards = deck.runeCardIds
    .map((id) => getCardById(id))
    .filter((c): c is Card => c !== undefined);
  const elementCards = deck.elementCardIds
    .map((id) => getCardById(id))
    .filter((c): c is Card => c !== undefined);
  return [...runeCards, ...elementCards];
}

export function shuffleDeck(cards: Card[]): Card[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawCards(player: PlayerState, count: number): PlayerState {
  const newHand = [...player.hand];
  const newDeck = [...player.deck];
  const drawn: Card[] = [];

  for (let i = 0; i < count && newHand.length < MAX_HAND_SIZE && newDeck.length > 0; i++) {
    const card = newDeck.shift()!;
    newHand.push(card);
    drawn.push(card);
  }

  return {
    ...player,
    hand: newHand,
    deck: newDeck,
  };
}

export function drawInitialHand(player: PlayerState): PlayerState {
  return drawCards(player, INITIAL_HAND_SIZE);
}

export function removeCardFromHand(player: PlayerState, handIndex: number): { player: PlayerState; card: Card } | null {
  if (handIndex < 0 || handIndex >= player.hand.length) return null;
  const card = player.hand[handIndex];
  const newHand = player.hand.filter((_, i) => i !== handIndex);
  return {
    player: { ...player, hand: newHand },
    card,
  };
}

export function discardToGraveyard(player: PlayerState, card: Card): PlayerState {
  return {
    ...player,
    graveyard: [...player.graveyard, card],
  };
}

export const DEFAULT_PLAYER_DECK: Deck = {
  id: 'default_player',
  name: '初始卡组',
  runeCardIds: ['rune_atk_1', 'rune_atk_2', 'rune_def_1', 'rune_def_2', 'rune_heal_1', 'rune_dis_1'],
  elementCardIds: ['elem_fire_1', 'elem_water_1', 'elem_wind_1', 'elem_earth_1'],
};

export const DEFAULT_ENEMY_DECK: Deck = {
  id: 'default_enemy',
  name: '暗影卡组',
  runeCardIds: ['rune_atk_2', 'rune_atk_3', 'rune_def_1', 'rune_heal_2', 'rune_dis_1', 'rune_dis_2'],
  elementCardIds: ['elem_fire_2', 'elem_water_2', 'elem_wind_2', 'elem_earth_2'],
};

const DECKS_STORAGE_KEY = 'spell_echo_decks';

export function saveDecksToStorage(decks: Deck[]): void {
  try {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // storage full or unavailable
  }
}

export function loadDecksFromStorage(): Deck[] {
  try {
    const raw = localStorage.getItem(DECKS_STORAGE_KEY);
    if (!raw) return [DEFAULT_PLAYER_DECK];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_PLAYER_DECK];
    return parsed;
  } catch {
    return [DEFAULT_PLAYER_DECK];
  }
}
