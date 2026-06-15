import { useMemo } from 'react';

export interface Card {
  id: string;
  name: string;
  attack: number;
  defense: number;
  critRate: number;
  maxHp: number;
  hp: number;
}

export interface BattleLogEntry {
  round: number;
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  damage: number;
  isCrit: boolean;
  isBlocked: boolean;
  isCombo: boolean;
  remainingHp: { [cardId: string]: number };
}

export interface BattleStats {
  totalDamage: { [cardId: string]: number };
  critCount: { [cardId: string]: number };
  comboCount: { [cardId: string]: number };
  winner: string | null;
  totalRounds: number;
}

const MAX_ROUNDS = 50;
const COMBO_THRESHOLD = 2;

function calculateDamage(
  attack: number,
  defense: number,
  isCrit: boolean,
  isBlocked: boolean
): number {
  let damage = Math.max(1, attack - defense * 0.5);
  if (isCrit) damage *= 2;
  if (isBlocked) damage *= 0.3;
  return Math.floor(damage);
}

function simulateBattle(card1: Card, card2: Card): {
  logs: BattleLogEntry[];
  stats: BattleStats;
} {
  const logs: BattleLogEntry[] = [];
  const totalDamage: { [cardId: string]: number } = { [card1.id]: 0, [card2.id]: 0 };
  const critCount: { [cardId: string]: number } = { [card1.id]: 0, [card2.id]: 0 };
  const comboCount: { [cardId: string]: number } = { [card1.id]: 0, [card2.id]: 0 };

  let hp1 = card1.maxHp;
  let hp2 = card2.maxHp;
  let consecutiveNormalAttacks: { [cardId: string]: number } = { [card1.id]: 0, [card2.id]: 0 };
  let round = 1;
  let currentAttacker = 0;
  const cards = [card1, card2];

  while (round <= MAX_ROUNDS && hp1 > 0 && hp2 > 0) {
    const attacker = cards[currentAttacker];
    const defender = cards[currentAttacker === 0 ? 1 : 0];

    const isCrit = Math.random() < attacker.critRate;
    const isBlocked = Math.random() < 0.2;
    const damage = calculateDamage(attacker.attack, defender.defense, isCrit, isBlocked);

    if (attacker.id === card1.id) {
      hp2 = Math.max(0, hp2 - damage);
    } else {
      hp1 = Math.max(0, hp1 - damage);
    }

    totalDamage[attacker.id] += damage;
    if (isCrit) critCount[attacker.id]++;

    const isCombo = !isCrit && consecutiveNormalAttacks[attacker.id] >= COMBO_THRESHOLD - 1;
    if (isCombo) comboCount[attacker.id]++;

    if (!isCrit) {
      consecutiveNormalAttacks[attacker.id]++;
    } else {
      consecutiveNormalAttacks[attacker.id] = 0;
    }

    logs.push({
      round,
      attackerId: attacker.id,
      attackerName: attacker.name,
      defenderId: defender.id,
      defenderName: defender.name,
      damage,
      isCrit,
      isBlocked,
      isCombo,
      remainingHp: { [card1.id]: hp1, [card2.id]: hp2 },
    });

    if (isCombo) {
      const comboDamage = calculateDamage(attacker.attack, defender.defense, false, false);
      if (attacker.id === card1.id) {
        hp2 = Math.max(0, hp2 - comboDamage);
      } else {
        hp1 = Math.max(0, hp1 - comboDamage);
      }
      totalDamage[attacker.id] += comboDamage;
      logs.push({
        round,
        attackerId: attacker.id,
        attackerName: attacker.name,
        defenderId: defender.id,
        defenderName: defender.name,
        damage: comboDamage,
        isCrit: false,
        isBlocked: false,
        isCombo: true,
        remainingHp: { [card1.id]: hp1, [card2.id]: hp2 },
      });
    }

    currentAttacker = currentAttacker === 0 ? 1 : 0;
    if (currentAttacker === 0) round++;
  }

  let winner: string | null = null;
  if (hp1 <= 0 && hp2 > 0) winner = card2.id;
  else if (hp2 <= 0 && hp1 > 0) winner = card1.id;
  else if (hp1 <= 0 && hp2 <= 0) winner = 'draw';

  return {
    logs,
    stats: {
      totalDamage,
      critCount,
      comboCount,
      winner,
      totalRounds: round - 1,
    },
  };
}

export function useBattleSimulator(card1: Card | null, card2: Card | null, start: boolean) {
  return useMemo(() => {
    if (!card1 || !card2 || !start) {
      return { logs: [], stats: null };
    }
    return simulateBattle({ ...card1, hp: card1.maxHp }, { ...card2, hp: card2.maxHp });
  }, [card1, card2, start]);
}

export const PRESET_CARDS: Card[] = [
  { id: 'c1', name: '火焰骑士', attack: 35, defense: 15, critRate: 0.25, maxHp: 200, hp: 200 },
  { id: 'c2', name: '冰霜法师', attack: 45, defense: 8, critRate: 0.3, maxHp: 160, hp: 160 },
  { id: 'c3', name: '暗影刺客', attack: 50, defense: 10, critRate: 0.4, maxHp: 140, hp: 140 },
  { id: 'c4', name: '神圣守卫', attack: 25, defense: 30, critRate: 0.15, maxHp: 280, hp: 280 },
  { id: 'c5', name: '狂战士', attack: 55, defense: 12, critRate: 0.35, maxHp: 180, hp: 180 },
  { id: 'c6', name: '森林游侠', attack: 40, defense: 18, critRate: 0.35, maxHp: 170, hp: 170 },
];
