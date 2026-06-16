export type ElementType = 'fire' | 'ice' | 'thunder' | 'wind';

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff6b35',
  ice: '#00d4ff',
  thunder: '#ffee00',
  wind: '#44ff44',
};

export const ELEMENT_LABELS: Record<ElementType, string> = {
  fire: '火',
  ice: '冰',
  thunder: '雷',
  wind: '风',
};

export interface CharacterState {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  bodyColor: string;
  haloColor: string;
}

export interface DamageResult {
  baseDamage: number;
  isCountered: boolean;
  totalDamage: number;
  counterBonus: number;
}

export const MAX_HP = 100;
export const MAX_MP = 100;
export const COUNTER_BONUS = 10;

export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType> = {
  fire: 'ice',
  ice: 'thunder',
  thunder: 'wind',
  wind: 'fire',
};

export function createCharacter(
  id: number,
  name: string,
  bodyColor: string,
  haloColor: string,
): CharacterState {
  return {
    id,
    name,
    hp: MAX_HP,
    maxHp: MAX_HP,
    mp: MAX_MP,
    maxMp: MAX_MP,
    bodyColor,
    haloColor,
  };
}

export function checkElementAdvantage(
  attackElements: ElementType[],
  defendPrimaryElement: ElementType,
): boolean {
  for (const elem of attackElements) {
    if (ELEMENT_ADVANTAGE[elem] === defendPrimaryElement) {
      return true;
    }
  }
  return false;
}

export function calculateDamage(
  baseDamageMin: number,
  baseDamageMax: number,
  isCountered: boolean,
): DamageResult {
  const base = Math.floor(
    Math.random() * (baseDamageMax - baseDamageMin + 1) + baseDamageMin,
  );
  const bonus = isCountered ? COUNTER_BONUS : 0;
  return {
    baseDamage: base,
    isCountered,
    counterBonus: bonus,
    totalDamage: base + bonus,
  };
}

export function applyDamage(
  character: CharacterState,
  damage: number,
): CharacterState {
  return {
    ...character,
    hp: Math.max(0, character.hp - damage),
  };
}

export function consumeMp(
  character: CharacterState,
  cost: number,
): CharacterState {
  return {
    ...character,
    mp: Math.max(0, character.mp - cost),
  };
}

export function recoverMp(character: CharacterState, amount: number): CharacterState {
  return {
    ...character,
    mp: Math.min(character.maxMp, character.mp + amount),
  };
}

export function checkVictory(
  characters: [CharacterState, CharacterState],
): number | null {
  if (characters[0].hp <= 0) return 1;
  if (characters[1].hp <= 0) return 0;
  return null;
}

export function getPrimarySpellElement(
  elements: ElementType[],
): ElementType {
  const count = new Map<ElementType, number>();
  for (const e of elements) {
    count.set(e, (count.get(e) ?? 0) + 1);
  }
  let best: ElementType = elements[0];
  let bestCount = 0;
  for (const [elem, c] of count) {
    if (c > bestCount) {
      bestCount = c;
      best = elem;
    }
  }
  return best;
}
