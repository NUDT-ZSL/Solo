import { GameState } from '../types';
import { CARDS, CardData, Rarity } from '../data/cards';

const STORAGE_KEY = 'nature_codex_game_state';

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
export const linear = (t: number): number => t;

export function bezierPoint(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): [number, number] {
  const mt = 1 - t;
  const x = mt * mt * mt * p0[0]
          + 3 * mt * mt * t * p1[0]
          + 3 * mt * t * t * p2[0]
          + t * t * t * p3[0];
  const y = mt * mt * mt * p0[1]
          + 3 * mt * mt * t * p1[1]
          + 3 * mt * t * t * p2[1]
          + t * t * t * p3[1];
  return [x, y];
}

export function bezierTangentAngle(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): number {
  const mt = 1 - t;
  const dx = 3 * mt * mt * (p1[0] - p0[0])
           + 6 * mt * t * (p2[0] - p1[0])
           + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * mt * mt * (p1[1] - p0[1])
           + 6 * mt * t * (p2[1] - p1[1])
           + 3 * t * t * (p3[1] - p2[1]);
  return Math.atan2(dy, dx);
}

export function loadGameState(): GameState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return getDefaultState();
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export function getDefaultState(): GameState {
  return {
    unlockedCardIds: ['dandelion', 'butterfly'],
    fragments: {
      dandelion: 3,
      butterfly: 2,
      mantis: 1,
      rose: 0,
      oak: 0,
      dragonfly: 4,
      sunflower: 2,
      beetle: 0,
      mushroom: 1,
      firefly: 0,
      lotus: 0,
      stagbeetle: 0,
      cactus: 0,
      bee: 1,
      bamboo: 0
    },
    playerExp: 150,
    playerLevel: 2,
    wins: 3,
    losses: 2,
    lastDailyRewardDate: null,
    dailyBrowseCount: 2,
    dailyBattleCount: 1
  };
}

export function addFragment(state: GameState, cardId: string, count: number = 1): GameState {
  const newState = { ...state, fragments: { ...state.fragments } };
  const current = newState.fragments[cardId] || 0;
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return state;
  
  const newCount = current + count;
  const required = card.fragmentsRequired;
  
  if (newCount >= required && !newState.unlockedCardIds.includes(cardId)) {
    newState.fragments[cardId] = required;
  } else {
    newState.fragments[cardId] = Math.min(newCount, required * 2);
  }
  
  return newState;
}

export function unlockCard(state: GameState, cardId: string): GameState {
  if (state.unlockedCardIds.includes(cardId)) return state;
  
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return state;
  
  const currentFragments = state.fragments[cardId] || 0;
  if (currentFragments < card.fragmentsRequired) return state;
  
  return {
    ...state,
    unlockedCardIds: [...state.unlockedCardIds, cardId],
    fragments: {
      ...state.fragments,
      [cardId]: currentFragments - card.fragmentsRequired
    }
  };
}

export function getUnlockedCards(state: GameState): CardData[] {
  return CARDS.filter(c => state.unlockedCardIds.includes(c.id));
}

export function selectEnemyCard(state: GameState): CardData {
  const unlocked = getUnlockedCards(state);
  const progress = unlocked.length / CARDS.length;
  
  let rarityFilter: Rarity[];
  if (progress < 0.3) {
    rarityFilter = ['common'];
  } else if (progress < 0.6) {
    rarityFilter = ['common', 'rare'];
  } else {
    rarityFilter = ['common', 'rare', 'legendary'];
  }
  
  const candidates = CARDS.filter(c => rarityFilter.includes(c.rarity));
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function calculateDamage(attacker: CardData, defender: CardData): number {
  const baseDamage = Math.max(1, attacker.attack - Math.floor(defender.defense * 0.6));
  const variance = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.floor(baseDamage * variance));
}

export function calculateExp