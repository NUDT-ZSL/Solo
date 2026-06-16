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

const ELEMENT_PRIORITY: Record<ElementType, number> = {
  fire: 0,
  water: 1,
  wind: 2,
  earth: 3,
  dark: 4,
  light: 5
};

const compositionCache = new Map<string, CompositionResult>();

function sortElements(elements: ElementType[]): ElementType[] {
  return [...elements].sort((a, b) => ELEMENT_PRIORITY[a] - ELEMENT_PRIORITY[b]);
}

function arraysEqual(a: ElementType[], b: ElementType[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function makeCacheKey(elements: ElementType[]): string {
  return sortElements(elements).join('+');
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

  const cacheKey = makeCacheKey(elements);
  const cached = compositionCache.get(cacheKey);
  if (cached) {
    const spell: MagicSpell = {
      ...cached.spell!,
      id: `${cached.spell!.id.split('-').slice(0, 2).join('-')}-${uuidv4().slice(0, 8)}`
    };
    return { ...cached, spell };
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
      const result: CompositionResult = {
        success: true,
        spell: { ...recipe.result, id: recipe.result.id },
        message: `合成成功！耗时 ${elapsed.toFixed(1)}ms`
      };
      compositionCache.set(cacheKey, result);
      return { ...result, spell };
    }
  }

  const result: CompositionResult = {
    success: false,
    message: '元素组合无法匹配任何配方，请尝试其他组合'
  };
  compositionCache.set(cacheKey, result);

  return result;
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
