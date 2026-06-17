export interface Card {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
}

export interface ValidationErrors {
  name?: string;
  cost?: string;
  attack?: string;
  health?: string;
}

export function validateCard(card: Partial<Card>): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!card.name || card.name.trim() === '') {
    errors.name = '名称不能为空';
  } else if (card.name.length > 10) {
    errors.name = '名称不能超过10个字符';
  }

  if (card.cost === undefined || card.cost === null) {
    errors.cost = '费用不能为空';
  } else if (!Number.isInteger(card.cost)) {
    errors.cost = '费用必须为整数';
  } else if (card.cost < 0 || card.cost > 10) {
    errors.cost = '费用范围为0-10';
  }

  if (card.attack === undefined || card.attack === null) {
    errors.attack = '攻击力不能为空';
  } else if (!Number.isInteger(card.attack)) {
    errors.attack = '攻击力必须为整数';
  } else if (card.attack < 0 || card.attack > 20) {
    errors.attack = '攻击力范围为0-20';
  }

  if (card.health === undefined || card.health === null) {
    errors.health = '生命值不能为空';
  } else if (!Number.isInteger(card.health)) {
    errors.health = '生命值必须为整数';
  } else if (card.health < 0 || card.health > 20) {
    errors.health = '生命值范围为0-20';
  }

  return errors;
}

export function createCard(
  name: string,
  cost: number,
  attack: number,
  health: number
): Card {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    cost,
    attack,
    health
  };
}

export const PRESET_CARDS: Card[] = [
  { id: 'goblin', name: '哥布林', cost: 2, attack: 3, health: 2 },
  { id: 'knight', name: '骑士', cost: 5, attack: 4, health: 6 },
  { id: 'dragon', name: '巨龙', cost: 8, attack: 8, health: 8 }
];

export const STORAGE_KEYS = {
  CURRENT_CARD: 'card_editor_current_card',
  VERSION_HISTORY: 'card_editor_version_history'
} as const;
