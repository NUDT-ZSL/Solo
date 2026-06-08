import {
  Card,
  ComboResult,
  ComboRule,
  FinishingMove,
  EnergyPool,
  PlayerState,
  RuneType,
  ElementType,
  MAX_ENERGY_POOL,
} from './types';
import { clearAllPositiveBuffs, applyBuff, createBuff } from './BuffSystem';
import { BuffEffectType } from './types';

export const COMBO_RULES: ComboRule[] = [
  {
    name: '烈焰斩',
    runeTypes: [RuneType.Attack],
    elements: [ElementType.Fire],
    result: { comboName: '烈焰斩', bonusDamage: 4, bonusHeal: 0, bonusShield: 0, specialEffect: 'burn' },
    description: '攻击+火元素：额外4点伤害并附加灼烧',
  },
  {
    name: '冰霜壁垒',
    runeTypes: [RuneType.Defense],
    elements: [ElementType.Water],
    result: { comboName: '冰霜壁垒', bonusDamage: 0, bonusHeal: 0, bonusShield: 5, specialEffect: 'freeze' },
    description: '防御+水元素：额外5点防御并冻结敌方',
  },
  {
    name: '风行治愈',
    runeTypes: [RuneType.Heal],
    elements: [ElementType.Wind],
    result: { comboName: '风行治愈', bonusDamage: 0, bonusHeal: 3, bonusShield: 0, specialEffect: 'swift' },
    description: '回复+风元素：额外3点回复并提升攻击力',
  },
  {
    name: '地裂侵蚀',
    runeTypes: [RuneType.Disrupt],
    elements: [ElementType.Earth],
    result: { comboName: '地裂侵蚀', bonusDamage: 3, bonusHeal: 0, bonusShield: 0, specialEffect: 'quicksand' },
    description: '干扰+地元素：额外3点伤害并降低敌方攻击力',
  },
  {
    name: '凤凰涅槃',
    runeTypes: [RuneType.Attack, RuneType.Heal],
    elements: [ElementType.Fire],
    result: { comboName: '凤凰涅槃', bonusDamage: 3, bonusHeal: 5, bonusShield: 0, specialEffect: 'rebirth' },
    description: '攻击+回复+火元素：造成伤害并大量回复',
  },
  {
    name: '暴风盾',
    runeTypes: [RuneType.Defense, RuneType.Disrupt],
    elements: [ElementType.Wind],
    result: { comboName: '暴风盾', bonusDamage: 2, bonusHeal: 0, bonusShield: 4, specialEffect: 'tempest' },
    description: '防御+干扰+风元素：攻防兼备并清除敌方增益',
  },
  {
    name: '熔岩护甲',
    runeTypes: [RuneType.Attack, RuneType.Defense],
    elements: [ElementType.Fire, ElementType.Earth],
    result: { comboName: '熔岩护甲', bonusDamage: 3, bonusHeal: 0, bonusShield: 4, specialEffect: 'lava_armor' },
    description: '攻击+防御+火+地：强力攻防组合',
  },
  {
    name: '海啸净化',
    runeTypes: [RuneType.Heal, RuneType.Defense],
    elements: [ElementType.Water],
    result: { comboName: '海啸净化', bonusDamage: 0, bonusHeal: 4, bonusShield: 3, specialEffect: 'purify' },
    description: '回复+防御+水元素：大量回复并获得防御',
  },
];

export const FINISHING_MOVES: Record<ElementType, FinishingMove> = {
  [ElementType.Fire]: {
    name: '天火焚世',
    description: '召唤天火，焚尽一切',
    baseDamage: 15,
    element: ElementType.Fire,
    inkColor: '#ff4400',
  },
  [ElementType.Water]: {
    name: '沧海横流',
    description: '召唤大海，淹没万物',
    baseDamage: 12,
    element: ElementType.Water,
    inkColor: '#0099ff',
  },
  [ElementType.Wind]: {
    name: '万刃风暴',
    description: '亿万风刃，撕裂苍穹',
    baseDamage: 13,
    element: ElementType.Wind,
    inkColor: '#66dd88',
  },
  [ElementType.Earth]: {
    name: '天崩地裂',
    description: '大地崩裂，万物倾覆',
    baseDamage: 14,
    element: ElementType.Earth,
    inkColor: '#cc8844',
  },
};

export function detectCombo(playedCards: Card[]): ComboResult | null {
  if (playedCards.length < 2) return null;

  const runeTypes = playedCards
    .filter((c) => c.category === 'rune' && c.runeType)
    .map((c) => c.runeType!);
  const elements = playedCards
    .filter((c) => c.category === 'element' && c.elementType)
    .map((c) => c.elementType!);

  if (runeTypes.length === 0 || elements.length === 0) return null;

  let bestCombo: ComboResult | null = null;
  let bestScore = 0;

  for (const rule of COMBO_RULES) {
    const hasAllRunes = rule.runeTypes.every((rt) => runeTypes.includes(rt));
    const hasAllElements = rule.elements.every((el) => elements.includes(el));

    if (hasAllRunes && hasAllElements) {
      const score = rule.runeTypes.length + rule.elements.length;
      if (score > bestScore) {
        bestScore = score;
        const element = rule.elements[0];
        bestCombo = {
          ...rule.result,
          comboName: rule.name,
          element,
        };
      }
    }
  }

  return bestCombo;
}

export function canUseFinishingMove(energy: number): boolean {
  return energy >= MAX_ENERGY_POOL;
}

export function getFinishingMove(element: ElementType): FinishingMove {
  return FINISHING_MOVES[element];
}

export function getDominantElement(cards: Card[]): ElementType {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    if (card.elementType) {
      counts[card.elementType] = (counts[card.elementType] || 0) + 1;
    }
  }
  let maxEl = ElementType.Fire;
  let maxCount = 0;
  for (const [el, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxEl = el as ElementType;
    }
  }
  return maxEl;
}

export function applyComboEffects(
  combo: ComboResult,
  target: PlayerState,
  caster: PlayerState
): { target: PlayerState; caster: PlayerState } {
  let newTarget = { ...target };
  let newCaster = { ...caster };

  if (combo.bonusDamage > 0) {
    let shield = newTarget.shield;
    let hp = newTarget.hp;
    const dmg = combo.bonusDamage;
    if (shield >= dmg) {
      shield -= dmg;
    } else {
      const rem = dmg - shield;
      shield = 0;
      hp -= rem;
    }
    newTarget = { ...newTarget, shield, hp: Math.max(0, hp) };
  }

  if (combo.bonusHeal > 0) {
    newCaster = { ...newCaster, hp: Math.min(newCaster.maxHp, newCaster.hp + combo.bonusHeal) };
  }

  if (combo.bonusShield > 0) {
    newCaster = { ...newCaster, shield: newCaster.shield + combo.bonusShield };
  }

  if (combo.specialEffect) {
    switch (combo.specialEffect) {
      case 'burn': {
        const burnBuff = createBuff({
          name: '灼烧',
          duration: 2,
          effectType: BuffEffectType.DamageOverTime,
          value: 3,
          sourceCardId: 'combo_burn',
          element: ElementType.Fire,
        });
        newTarget = applyBuff(newTarget, burnBuff);
        break;
      }
      case 'freeze': {
        const freezeBuff = createBuff({
          name: '冻结',
          duration: 1,
          effectType: BuffEffectType.Stun,
          value: 0,
          sourceCardId: 'combo_freeze',
        });
        newTarget = applyBuff(newTarget, freezeBuff);
        break;
      }
      case 'swift': {
        const swiftBuff = createBuff({
          name: '疾风',
          duration: 2,
          effectType: BuffEffectType.PowerBoost,
          value: 4,
          sourceCardId: 'combo_swift',
          element: ElementType.Wind,
        });
        newCaster = applyBuff(newCaster, swiftBuff);
        break;
      }
      case 'quicksand': {
        const slowBuff = createBuff({
          name: '流沙',
          duration: 2,
          effectType: BuffEffectType.PowerReduce,
          value: 4,
          sourceCardId: 'combo_quicksand',
          element: ElementType.Earth,
        });
        newTarget = applyBuff(newTarget, slowBuff);
        break;
      }
      case 'rebirth':
        newCaster = { ...newCaster, hp: Math.min(newCaster.maxHp, newCaster.hp + 5) };
        break;
      case 'tempest':
        newTarget = clearAllPositiveBuffs(newTarget);
        break;
      case 'lava_armor': {
        const lavaBuff = createBuff({
          name: '熔岩甲',
          duration: 2,
          effectType: BuffEffectType.Shield,
          value: 4,
          sourceCardId: 'combo_lava',
          element: ElementType.Fire,
        });
        newCaster = applyBuff(newCaster, lavaBuff);
        break;
      }
      case 'purify': {
        const purifyBuff = createBuff({
          name: '净化',
          duration: 1,
          effectType: BuffEffectType.Shield,
          value: 3,
          sourceCardId: 'combo_purify',
          element: ElementType.Water,
        });
        newCaster = applyBuff(newCaster, purifyBuff);
        newCaster.buffs = newCaster.buffs.filter(
          (b) => b.effectType !== BuffEffectType.DamageOverTime && b.effectType !== BuffEffectType.PowerReduce
        );
        break;
      }
    }
  }

  return { target: newTarget, caster: newCaster };
}

export function executeFinishingMove(
  move: FinishingMove,
  target: PlayerState,
  caster: PlayerState
): { target: PlayerState; caster: PlayerState; damageDealt: number } {
  const multiplier = getPowerBoostMultiplierSafe(caster);
  const totalDamage = Math.round(move.baseDamage * multiplier);

  let shield = target.shield;
  let hp = target.hp;
  if (shield >= totalDamage) {
    shield -= totalDamage;
  } else {
    const rem = totalDamage - shield;
    shield = 0;
    hp -= rem;
  }

  return {
    target: { ...target, shield, hp: Math.max(0, hp) },
    caster: { ...caster, shield: caster.shield + 3 },
    damageDealt: totalDamage,
  };
}

function getPowerBoostMultiplierSafe(player: PlayerState): number {
  const boost = player.buffs
    .filter((b) => b.effectType === BuffEffectType.PowerBoost)
    .reduce((sum, b) => sum + b.value, 0);
  const reduce = player.buffs
    .filter((b) => b.effectType === BuffEffectType.PowerReduce)
    .reduce((sum, b) => sum + b.value, 0);
  return 1 + (boost - reduce) / 10;
}
