import { Buff, BuffEffectType, PlayerState, ElementType } from './types';

let buffIdCounter = 0;

function nextBuffId(): string {
  return 'buff_' + (++buffIdCounter);
}

export function createBuff(opts: {
  name: string;
  duration: number;
  effectType: BuffEffectType;
  value: number;
  sourceCardId: string;
  element?: ElementType;
}): Buff {
  return {
    id: nextBuffId(),
    name: opts.name,
    duration: opts.duration,
    remainingTurns: opts.duration,
    effectType: opts.effectType,
    value: opts.value,
    sourceCardId: opts.sourceCardId,
    element: opts.element,
  };
}

export function applyBuff(player: PlayerState, buff: Buff): PlayerState {
  const existing = player.buffs.find(
    (b) => b.name === buff.name && b.sourceCardId === buff.sourceCardId
  );
  if (existing) {
    const updated = player.buffs.map((b) =>
      b.id === existing.id ? { ...b, remainingTurns: Math.max(b.remainingTurns, buff.remainingTurns), value: Math.max(b.value, buff.value) } : b
    );
    return { ...player, buffs: updated };
  }
  return { ...player, buffs: [...player.buffs, { ...buff }] };
}

export function removeBuff(player: PlayerState, buffId: string): PlayerState {
  return {
    ...player,
    buffs: player.buffs.filter((b) => b.id !== buffId),
  };
}

export function tickBuffs(player: PlayerState): PlayerState {
  const ticked = player.buffs
    .map((b) => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
    .filter((b) => b.remainingTurns > 0);
  return { ...player, buffs: ticked };
}

export function processBuffTickEffects(player: PlayerState): PlayerState {
  let hp = player.hp;
  let shield = player.shield;
  let energy = player.energy;
  let isStunned = false;

  for (const buff of player.buffs) {
    switch (buff.effectType) {
      case BuffEffectType.DamageOverTime:
        const dotDmg = buff.value;
        if (shield >= dotDmg) {
          shield -= dotDmg;
        } else {
          const remaining = dotDmg - shield;
          shield = 0;
          hp -= remaining;
        }
        break;
      case BuffEffectType.HealOverTime:
        hp = Math.min(player.maxHp, hp + buff.value);
        break;
      case BuffEffectType.EnergyDrain:
        energy = Math.max(0, energy - buff.value);
        break;
      case BuffEffectType.Stun:
        isStunned = true;
        break;
    }
  }

  return {
    ...player,
    hp: Math.max(0, hp),
    shield: Math.max(0, shield),
    energy,
    isStunned,
  };
}

export function calculateBuffModifier(player: PlayerState, effectType: BuffEffectType): number {
  return player.buffs
    .filter((b) => b.effectType === effectType)
    .reduce((sum, b) => sum + b.value, 0);
}

export function applyShieldBuff(player: PlayerState): PlayerState {
  const shieldValue = calculateBuffModifier(player, BuffEffectType.Shield);
  return { ...player, shield: player.shield + shieldValue };
}

export function getPowerBoostMultiplier(player: PlayerState): number {
  const boost = calculateBuffModifier(player, BuffEffectType.PowerBoost);
  const reduce = calculateBuffModifier(player, BuffEffectType.PowerReduce);
  const net = boost - reduce;
  return 1 + net / 10;
}

export function clearBuffsByElement(player: PlayerState, _element: ElementType): PlayerState {
  return {
    ...player,
    buffs: player.buffs.filter((b) => b.element !== _element),
  };
}

export function clearAllPositiveBuffs(player: PlayerState): PlayerState {
  const positiveTypes = [BuffEffectType.Shield, BuffEffectType.PowerBoost, BuffEffectType.HealOverTime];
  return {
    ...player,
    buffs: player.buffs.filter((b) => !positiveTypes.includes(b.effectType)),
  };
}

export function applyCardBuffs(player: PlayerState, cardId: string): PlayerState {
  const burnBuff = createBuff({
    name: '灼烧',
    duration: 2,
    effectType: BuffEffectType.DamageOverTime,
    value: 2,
    sourceCardId: cardId,
    element: ElementType.Fire,
  });

  const shieldBuff = createBuff({
    name: '水盾',
    duration: 2,
    effectType: BuffEffectType.Shield,
    value: 3,
    sourceCardId: cardId,
    element: ElementType.Water,
  });

  const swiftBuff = createBuff({
    name: '疾风',
    duration: 2,
    effectType: BuffEffectType.PowerBoost,
    value: 3,
    sourceCardId: cardId,
    element: ElementType.Wind,
  });

  const earthShieldBuff = createBuff({
    name: '磐石',
    duration: 3,
    effectType: BuffEffectType.Shield,
    value: 2,
    sourceCardId: cardId,
    element: ElementType.Earth,
  });

  const stunBuff = createBuff({
    name: '眩晕',
    duration: 1,
    effectType: BuffEffectType.Stun,
    value: 0,
    sourceCardId: cardId,
  });

  const drainBuff = createBuff({
    name: '能量汲取',
    duration: 1,
    effectType: BuffEffectType.EnergyDrain,
    value: 1,
    sourceCardId: cardId,
  });

  switch (cardId) {
    case 'elem_fire_2':
      return applyBuff(player, burnBuff);
    case 'elem_water_1':
      return applyBuff(player, stunBuff);
    case 'elem_water_2':
      return { ...applyBuff(player, shieldBuff), hp: Math.min(player.maxHp, player.hp + 2) };
    case 'elem_wind_2':
      return applyBuff(player, swiftBuff);
    case 'elem_earth_1':
      return { ...player, shield: player.shield + 2 };
    case 'elem_earth_2':
      return applyBuff(player, earthShieldBuff);
    case 'rune_dis_1':
      return applyBuff(player, drainBuff);
    case 'rune_dis_2':
      return applyBuff(player, stunBuff);
    case 'rune_dis_3':
      return { ...applyBuff(player, drainBuff), energy: player.energy + 2 };
    default:
      return player;
  }
}

export function applyCardBuffsToEnemy(enemy: PlayerState, cardId: string): PlayerState {
  switch (cardId) {
    case 'elem_fire_2': {
      const burnBuff = createBuff({
        name: '灼烧',
        duration: 2,
        effectType: BuffEffectType.DamageOverTime,
        value: 2,
        sourceCardId: cardId,
        element: ElementType.Fire,
      });
      return applyBuff(enemy, burnBuff);
    }
    case 'elem_water_1': {
      const stunBuff = createBuff({
        name: '冻结',
        duration: 1,
        effectType: BuffEffectType.Stun,
        value: 0,
        sourceCardId: cardId,
      });
      return applyBuff(enemy, stunBuff);
    }
    case 'rune_dis_1': {
      const drainBuff = createBuff({
        name: '能量汲取',
        duration: 1,
        effectType: BuffEffectType.EnergyDrain,
        value: 1,
        sourceCardId: cardId,
      });
      return applyBuff(enemy, drainBuff);
    }
    case 'rune_dis_2': {
      const stunBuff = createBuff({
        name: '眩晕',
        duration: 1,
        effectType: BuffEffectType.Stun,
        value: 0,
        sourceCardId: cardId,
      });
      return applyBuff(enemy, stunBuff);
    }
    default:
      return enemy;
  }
}
