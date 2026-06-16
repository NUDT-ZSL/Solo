import { Monster, MagicSpell } from '../data/GameData';

export interface BattleResult {
  damage: number;
  isCritical: boolean;
  isResisted: boolean;
  effectId: string;
  message: string;
}

export function calculateBattleResult(
  monster: Monster,
  spell: MagicSpell
): BattleResult {
  const startTime = performance.now();
  let damage = spell.damage;
  let isCritical = false;
  let isResisted = false;

  if (monster.weaknesses.includes(spell.element)) {
    damage = Math.floor(damage * 1.5);
    isCritical = true;
  }

  if (monster.resistances.includes(spell.element)) {
    damage = Math.floor(damage * 0.5);
    isResisted = true;
  }

  damage = Math.max(1, damage);

  const effectId = spell.effect || `effect-${spell.element}`;

  let modifierText = '';
  if (isCritical) {
    modifierText = '【克制 - 伤害 x1.5】';
  } else if (isResisted) {
    modifierText = '【抵抗 - 伤害 x0.5】';
  }

  const elapsed = performance.now() - startTime;

  return {
    damage,
    isCritical,
    isResisted,
    effectId,
    message: `使用【${spell.name}】对 ${monster.name} 造成 ${damage} 点伤害${modifierText}（计算耗时 ${elapsed.toFixed(1)}ms）`
  };
}

export function getMonsterDamage(monster: Monster): number {
  const base = monster.attack;
  const variance = Math.floor(Math.random() * 5) - 2;
  return Math.max(5, base + variance);
}
