import { Monster, MagicSpell, ElementType } from '../data/GameData';

export interface BattleResult {
  damage: number;
  isCritical: boolean;
  isResisted: boolean;
  effectId: string;
  message: string;
}

interface CacheEntry {
  result: Omit<BattleResult, 'message'>;
  timestamp: number;
}

const battleCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 256;
const CACHE_TTL_MS = 30000;

function makeCacheKey(monsterId: string, spellElement: ElementType, spellDamage: number, weaknesses: string, resistances: string): string {
  return `${monsterId}:${spellElement}:${spellDamage}:${weaknesses}:${resistances}`;
}

function evictCache(): void {
  if (battleCache.size < CACHE_MAX_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of battleCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      battleCache.delete(key);
    }
  }
  if (battleCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = battleCache.keys().next().value;
    if (oldestKey) battleCache.delete(oldestKey);
  }
}

export function calculateBattleResult(
  monster: Monster,
  spell: MagicSpell
): BattleResult {
  const startTime = performance.now();

  const weaknessesKey = monster.weaknesses.sort().join(',');
  const resistancesKey = monster.resistances.sort().join(',');
  const cacheKey = makeCacheKey(monster.id, spell.element, spell.damage, weaknessesKey, resistancesKey);

  const cached = battleCache.get(cacheKey);
  if (cached) {
    const elapsed = performance.now() - startTime;
    let modifierText = '';
    if (cached.result.isCritical) modifierText = '【克制 - 伤害 x1.5】';
    else if (cached.result.isResisted) modifierText = '【抵抗 - 伤害 x0.5】';

    return {
      ...cached.result,
      message: `使用【${spell.name}】对 ${monster.name} 造成 ${cached.result.damage} 点伤害${modifierText}（缓存命中 ${elapsed.toFixed(1)}ms）`
    };
  }

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

  const elapsed = performance.now() - startTime;

  const cachedResult: CacheEntry = {
    result: { damage, isCritical, isResisted, effectId },
    timestamp: Date.now()
  };
  evictCache();
  battleCache.set(cacheKey, cachedResult);

  let modifierText = '';
  if (isCritical) modifierText = '【克制 - 伤害 x1.5】';
  else if (isResisted) modifierText = '【抵抗 - 伤害 x0.5】';

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

export function clearBattleCache(): void {
  battleCache.clear();
}
