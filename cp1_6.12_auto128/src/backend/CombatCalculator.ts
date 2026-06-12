import {
  Rune,
  CombinationRule,
  DamageResult,
  DamagePoint,
  StatusEffect,
  ElementType,
  RuneCombination,
} from '../shared/RuneTypes';
import { DataManager } from './DataManager';

const ELEMENT_COUNTER_COLORS: Record<string, string> = {
  'fire-ice': '#FF6B35',
  'ice-fire': '#4FC3F7',
  'thunder-water': '#FFEB3B',
  'water-thunder': '#29B6F6',
  'holy-shadow': '#FFD700',
  'shadow-holy': '#AB47BC',
  'earth-wind': '#8D6E63',
  'wind-earth': '#B2EBF2',
  'poison-holy': '#66BB6A',
  'holy-poison': '#FFCA28',
};

function getCombinationKey(elements: ElementType[]): string {
  return [...elements].sort().join('-');
}

function rulesMatch(ruleElements: ElementType[], runeElements: ElementType[]): boolean {
  const sortedRule = [...ruleElements].sort();
  const sortedRunes = [...runeElements].sort();
  let ruleIdx = 0;
  for (let i = 0; i < sortedRunes.length && ruleIdx < sortedRule.length; i++) {
    if (sortedRunes[i] === sortedRule[ruleIdx]) {
      ruleIdx++;
    }
  }
  return ruleIdx === sortedRule.length;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const combine = (start: number, current: T[]) => {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      combine(i + 1, current);
      current.pop();
    }
  };
  combine(0, []);
  return result;
}

function getElementCounterColor(runes: Rune[]): string {
  const elements = runes.map((r) => r.element);
  for (const [key, color] of Object.entries(ELEMENT_COUNTER_COLORS)) {
    const [e1, e2] = key.split('-') as ElementType[];
    if (elements.includes(e1) && elements.includes(e2)) {
      return color;
    }
  }
  if (runes.length > 0) {
    return runes[0].color;
  }
  return '#00D4FF';
}

export class CombatCalculator {
  static async calculate(combination: RuneCombination): Promise<DamageResult> {
    const runes = await DataManager.getRunesByIds(combination.runeIds);
    const allRules = await DataManager.getAllRules();

    if (runes.length === 0) {
      return this.emptyResult();
    }

    const runeElements = runes.map((r) => r.element);

    const triggeredRules: CombinationRule[] = [];
    const sizes = [2, 3, 4];
    for (const size of sizes) {
      const elementCombos = getCombinations(runeElements, size);
      for (const combo of elementCombos) {
        for (const rule of allRules) {
          const alreadyTriggered = triggeredRules.some((tr) => tr.id === rule.id);
          if (!alreadyTriggered && rule.elements.length === size && rulesMatch(rule.elements, combo)) {
            triggeredRules.push(rule);
          }
        }
      }
    }

    const baseDamage = runes.reduce((sum, r) => sum + r.baseDamage, 0);
    const baseCooldown = runes.reduce((max, r) => Math.max(max, r.cooldown), 0);
    const range = Math.max(...runes.map((r) => r.range));

    let totalMultiplier = 1;
    let totalCooldownReduction = 0;
    const allStatusEffects: StatusEffect[] = [];

    for (const rule of triggeredRules) {
      totalMultiplier *= rule.damageMultiplier;
      totalCooldownReduction = Math.min(totalCooldownReduction + rule.cooldownReduction, 0.8);
      if (rule.statusEffect) {
        const existing = allStatusEffects.find((s) => s.name === rule.statusEffect!.name);
        if (existing) {
          existing.duration = Math.max(existing.duration, rule.statusEffect.duration);
          if (rule.statusEffect.damagePerSecond) {
            existing.damagePerSecond = (existing.damagePerSecond || 0) + rule.statusEffect.damagePerSecond;
          }
        } else {
          allStatusEffects.push({ ...rule.statusEffect });
        }
      }
    }

    const effectiveDamage = baseDamage * totalMultiplier;
    const finalCooldown = Math.max(baseCooldown * (1 - totalCooldownReduction), 0.5);
    const totalDamage = effectiveDamage + this.calculateStatusDamage(allStatusEffects);

    const damageCurve = this.generateDamageCurve(
      effectiveDamage,
      finalCooldown,
      allStatusEffects,
      triggeredRules
    );

    return {
      totalDamage: parseFloat(totalDamage.toFixed(2)),
      baseDamage: parseFloat(baseDamage.toFixed(2)),
      effectiveDamage: parseFloat(effectiveDamage.toFixed(2)),
      cooldown: parseFloat(finalCooldown.toFixed(2)),
      range,
      statusEffects: allStatusEffects,
      damageCurve,
      triggeredRules,
      elementAdvantageColor: getElementCounterColor(runes),
    };
  }

  private static calculateStatusDamage(effects: StatusEffect[]): number {
    return effects.reduce((sum, e) => {
      if (e.damagePerSecond) {
        return sum + e.damagePerSecond * e.duration;
      }
      return sum;
    }, 0);
  }

  private static generateDamageCurve(
    damagePerHit: number,
    cooldown: number,
    statusEffects: StatusEffect[],
    triggeredRules: CombinationRule[]
  ): DamagePoint[] {
    const totalTime = 10;
    const points: DamagePoint[] = [];
    let cumulativeDamage = 0;
    const step = 0.1;

    const burstTimes = new Map<number, string>();
    for (const rule of triggeredRules) {
      if (rule.triggerTime) {
        burstTimes.set(rule.triggerTime, rule.name);
        const secondTrigger = rule.triggerTime + cooldown * 2;
        if (secondTrigger <= totalTime) {
          burstTimes.set(secondTrigger, rule.name);
        }
      }
    }

    for (let t = 0; t <= totalTime; t += step) {
      const time = parseFloat(t.toFixed(1));
      let damageAtPoint = 0;

      if (time > 0 && Math.abs(time % cooldown) < step / 2) {
        damageAtPoint += damagePerHit;
      }

      for (const effect of statusEffects) {
        if (effect.damagePerSecond && time <= effect.duration + 0.5 && time > 0) {
          damageAtPoint += effect.damagePerSecond * step;
        }
      }

      let isBurst = false;
      let burstRuleName: string | undefined;
      for (const [burstTime, ruleName] of burstTimes.entries()) {
        if (Math.abs(time - burstTime) < step / 2) {
          isBurst = true;
          burstRuleName = ruleName;
          damageAtPoint *= 1.5;
          break;
        }
      }

      cumulativeDamage += damageAtPoint;
      points.push({
        time,
        damage: parseFloat(damageAtPoint.toFixed(2)),
        cumulativeDamage: parseFloat(cumulativeDamage.toFixed(2)),
        isBurst,
        burstRuleName,
      });
    }

    return points;
  }

  private static emptyResult(): DamageResult {
    return {
      totalDamage: 0,
      baseDamage: 0,
      effectiveDamage: 0,
      cooldown: 0,
      range: 0,
      statusEffects: [],
      damageCurve: Array.from({ length: 101 }, (_, i) => ({
        time: parseFloat((i * 0.1).toFixed(1)),
        damage: 0,
        cumulativeDamage: 0,
        isBurst: false,
      })),
      triggeredRules: [],
      elementAdvantageColor: '#00D4FF',
    };
  }
}
