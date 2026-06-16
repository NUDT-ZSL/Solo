import { v4 as uuidv4 } from 'uuid';
import {
  ElementType,
  MagicSpell,
  Monster,
  MonsterTemplate,
  monsterTemplates,
  recipes
} from '../data/GameData';

export interface CompositionResult {
  success: boolean;
  spell?: MagicSpell;
  message: string;
}

export interface BattleResult {
  damage: number;
  isCritical: boolean;
  isResisted: boolean;
  effectId: string;
  message: string;
}

function sortElements(elements: ElementType[]): ElementType[] {
  const priority: Record<ElementType, number> = {
    fire: 0,
    water: 1,
    wind: 2,
    earth: 3,
    dark: 4,
    light: 5
  };
  return [...elements].sort((a, b) => priority[a] - priority[b]);
}

function arraysEqual(a: ElementType[], b: ElementType[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function composeElements(elements: ElementType[]): CompositionResult {
  const startTime = performance.now();

  if (elements.length < 2) {
    return {
      success: false,
      message: '至少需要选择 2 种元素才能合成'
    };
  }

  if (elements.length > 3) {
    return {
      success: false,
      message: '最多只能选择 3 种元素'
    };
  }

  const sortedInput = sortElements(elements);

  for (const recipe of recipes) {
    const sortedRecipe = sortElements(recipe.elements);
    if (arraysEqual(sortedInput, sortedRecipe)) {
      const spell: MagicSpell = {
        ...recipe.result,
        id: `${recipe.result.id}-${uuidv4().slice(0, 8)}`
      };
      const elapsed = performance.now() - startTime;
      return {
        success: true,
        spell,
        message: `合成成功！耗时 ${elapsed.toFixed(1)}ms`
      };
    }
  }

  return {
    success: false,
    message: '元素组合无法匹配任何配方，请尝试其他组合'
  };
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

  let message = `对 ${monster.name} 造成 ${damage} 点${isCritical ? '【克制】' : isResisted ? '【抵抗】' : ''}伤害`;

  const elapsed = performance.now() - startTime;

  return {
    damage,
    isCritical,
    isResisted,
    effectId,
    message: `${message}（计算耗时 ${elapsed.toFixed(1)}ms）`
  };
}

export function spawnRandomMonster(scale: number = 1): Monster {
  const template: MonsterTemplate =
    monsterTemplates[Math.floor(Math.random() * monsterTemplates.length)];

  const maxHp = Math.floor(template.baseHp * scale);

  return {
    id: `monster-${uuidv4().slice(0, 8)}`,
    name: template.name,
    element: template.element,
    maxHp,
    currentHp: maxHp,
    attack: Math.floor(template.baseAttack * scale),
    resistances: [...template.resistances],
    weaknesses: [...template.weaknesses],
    icon: template.icon
  };
}

export function getMonsterDamage(monster: Monster): number {
  const base = monster.attack;
  const variance = Math.floor(Math.random() * 5) - 2;
  return Math.max(5, base + variance);
}

export { sortElements };
