import type {
  Card,
  Enemy,
  PlayerState,
  CombatFrame,
  CombatResult,
  StatusEffect,
  CombatEvent,
} from './types';

interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  playerShield: number;
  playerStatusEffects: StatusEffect[];
  enemyHp: number;
  enemyMaxHp: number;
  enemyShield: number;
  enemyStatusEffects: StatusEffect[];
  enemyAtk: number;
  enemyDef: number;
  enemyEffect: StatusEffect | undefined;
  deck: Card[];
  frames: CombatFrame[];
  frameCount: number;
  totalTurns: number;
  events: CombatEvent[];
}

function cloneEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects.map(e => ({ ...e }));
}

function genEventId(): string {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addStatusEffect(
  effects: StatusEffect[],
  effect: StatusEffect | undefined | null
): StatusEffect[] {
  if (!effect) return effects;
  const next = cloneEffects(effects);
  const existing = next.find(e => e.type === effect.type);
  if (existing) {
    existing.value = Math.max(existing.value, effect.value);
    existing.duration = Math.max(existing.duration, effect.duration);
  } else {
    next.push({ ...effect });
  }
  return next;
}

function tickStatusEffects(
  effects: StatusEffect[],
  target: 'player' | 'enemy',
  state: CombatState
): { effects: StatusEffect[]; dotDamage: number; healAmount: number; frozen: boolean } {
  let dotDamage = 0;
  let healAmount = 0;
  let frozen = false;
  const remaining: StatusEffect[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'burn':
      case 'poison':
        dotDamage += effect.value;
        state.events.push({
          id: genEventId(),
          timestamp: performance.now(),
          source: target,
          action: 'dot',
          targetSide: target,
          statusEffect: { ...effect },
          damage: effect.value,
          message: `${target === 'player' ? '玩家' : '敌人'}受到${effect.type === 'burn' ? '灼烧' : '中毒'}${effect.value}点伤害`,
        });
        break;
      case 'regen':
        healAmount += effect.value;
        state.events.push({
          id: genEventId(),
          timestamp: performance.now(),
          source: target,
          action: 'regen',
          targetSide: target,
          statusEffect: { ...effect },
          heal: effect.value,
          message: `${target === 'player' ? '玩家' : '敌人'}恢复${effect.value}点生命`,
        });
        break;
      case 'freeze':
        if (effect.duration > 0) frozen = true;
        break;
    }
    if (effect.duration > 1) {
      remaining.push({ ...effect, duration: effect.duration - 1 });
    }
  }
  return { effects: remaining, dotDamage, healAmount, frozen };
}

function snapshotFrame(
  state: CombatState,
  log: string,
  opts: { activeCard?: Card; activeCardSource?: 'player' | 'enemy'; floatingNumber?: { value: string; position: 'player' | 'enemy'; color: string } } = {}
): CombatFrame {
  const frame: CombatFrame = {
    frameId: state.frameCount++,
    playerHp: state.playerHp,
    playerShield: state.playerShield,
    playerStatusEffects: cloneEffects(state.playerStatusEffects),
    enemyHp: state.enemyHp,
    enemyShield: state.enemyShield,
    enemyStatusEffects: cloneEffects(state.enemyStatusEffects),
    activeCard: opts.activeCard,
    activeCardSource: opts.activeCardSource,
    floatingNumber: opts.floatingNumber,
    log,
    events: [...state.events],
  };
  state.events = [];
  state.frames.push(frame);
  return frame;
}

function applyDamageToTarget(
  state: CombatState,
  target: 'player' | 'enemy',
  rawDamage: number,
  attacker: 'player' | 'enemy',
  card?: Card
): number {
  let dmg = Math.max(0, rawDamage);
  if (target === 'enemy') {
    dmg = Math.max(0, dmg - state.enemyDef);
    const absorbed = Math.min(state.enemyShield, dmg);
    state.enemyShield -= absorbed;
    dmg -= absorbed;
    state.enemyHp = Math.max(0, state.enemyHp - dmg);
    state.events.push({
      id: genEventId(),
      timestamp: performance.now(),
      source: attacker,
      action: 'damage',
      targetSide: 'enemy',
      card,
      damage: rawDamage,
      message: `敌人受到${rawDamage}点伤害${absorbed > 0 ? `(护盾吸收${absorbed})` : ''}`,
    });
    if (card?.effect?.type === 'lifesteal') {
      const healAmt = Math.round(rawDamage * card.effect.value);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmt);
      state.events.push({
        id: genEventId(),
        timestamp: performance.now(),
        source: 'player',
        action: 'lifesteal',
        heal: healAmt,
        message: `吸血恢复${healAmt}点生命`,
      });
    }
  } else {
    let reflectDmg = 0;
    const reflect = state.playerStatusEffects.find(e => e.type === 'reflect');
    if (reflect) reflectDmg = Math.round(rawDamage * reflect.value);
    const absorbed = Math.min(state.playerShield, dmg);
    state.playerShield -= absorbed;
    dmg -= absorbed;
    state.playerHp = Math.max(0, state.playerHp - dmg);
    state.events.push({
      id: genEventId(),
      timestamp: performance.now(),
      source: attacker,
      action: 'damage',
      targetSide: 'player',
      damage: rawDamage,
      message: `玩家受到${rawDamage}点伤害${absorbed > 0 ? `(护盾吸收${absorbed})` : ''}`,
    });
    if (reflectDmg > 0) {
      state.enemyHp = Math.max(0, state.enemyHp - reflectDmg);
      state.events.push({
        id: genEventId(),
        timestamp: performance.now(),
        source: 'player',
        action: 'reflect',
        damage: reflectDmg,
        targetSide: 'enemy',
        message: `反弹${reflectDmg}点伤害`,
      });
    }
    if (attacker === 'enemy' && state.enemyEffect?.type === 'lifesteal') {
      const healAmt = Math.round(rawDamage * state.enemyEffect.value);
      state.enemyHp = Math.min(state.enemyMaxHp, state.enemyHp + healAmt);
    }
  }
  return rawDamage;
}

function playCard(state: CombatState, card: Card) {
  snapshotFrame(state, `玩家使用【${card.name}】`, {
    activeCard: card,
    activeCardSource: 'player',
  });

  switch (card.type) {
    case 'attack': {
      const times = card.effect?.type === 'double' ? (card.effect.value || 2) : 1;
      for (let i = 0; i < times; i++) {
        applyDamageToTarget(state, 'enemy', card.value, 'player', card);
        snapshotFrame(state, `造成${card.value}点伤害${times > 1 ? ` (第${i + 1}次)` : ''}`, {
          floatingNumber: { value: `-${card.value}`, position: 'enemy', color: '#ef4444' },
        });
      }
      if (card.effect && ['burn', 'freeze', 'poison'].includes(card.effect.type)) {
        state.enemyStatusEffects = addStatusEffect(state.enemyStatusEffects, card.effect);
        snapshotFrame(state, `敌人附加${statusName(card.effect.type)}效果`);
      }
      break;
    }
    case 'defense': {
      state.playerShield += card.value;
      state.events.push({
        id: genEventId(),
        timestamp: performance.now(),
        source: 'player',
        action: 'shield',
        shieldChange: card.value,
        card,
        message: `获得${card.value}点护盾`,
      });
      snapshotFrame(state, `获得${card.value}点护盾`, {
        floatingNumber: { value: `+${card.value}护盾`, position: 'player', color: '#22c55e' },
      });
      if (card.effect?.type === 'freeze') {
        state.enemyStatusEffects = addStatusEffect(state.enemyStatusEffects, card.effect);
        snapshotFrame(state, `敌人被冰冻`);
      }
      if (card.effect?.type === 'reflect') {
        state.playerStatusEffects = addStatusEffect(state.playerStatusEffects, card.effect);
        snapshotFrame(state, `获得伤害反弹效果`);
      }
      break;
    }
    case 'heal': {
      const actualHeal = Math.min(card.value, state.playerMaxHp - state.playerHp);
      state.playerHp += actualHeal;
      state.events.push({
        id: genEventId(),
        timestamp: performance.now(),
        source: 'player',
        action: 'heal',
        heal: actualHeal,
        card,
        message: `恢复${actualHeal}点生命`,
      });
      snapshotFrame(state, `恢复${actualHeal}点生命`, {
        floatingNumber: { value: `+${actualHeal}`, position: 'player', color: '#10b981' },
      });
      if (card.effect?.type === 'regen') {
        state.playerStatusEffects = addStatusEffect(state.playerStatusEffects, card.effect);
        snapshotFrame(state, `附加持续回复效果`);
      }
      if (card.effect?.type === 'cleanse') {
        state.playerStatusEffects = state.playerStatusEffects.filter(
          e => !['burn', 'poison', 'freeze'].includes(e.type)
        );
        snapshotFrame(state, `清除负面状态`);
      }
      break;
    }
  }
}

function statusName(type: string): string {
  const map: Record<string, string> = {
    burn: '灼烧',
    freeze: '冰冻',
    poison: '中毒',
    lifesteal: '吸血',
    regen: '生命回复',
    reflect: '伤害反弹',
    double: '双重打击',
    cleanse: '净化',
  };
  return map[type] || type;
}

function enemyTurn(state: CombatState) {
  snapshotFrame(state, `敌人回合开始`);

  const tickResult = tickStatusEffects(state.enemyStatusEffects, 'enemy', state);
  state.enemyStatusEffects = tickResult.effects;
  if (tickResult.dotDamage > 0) {
    state.enemyHp = Math.max(0, state.enemyHp - tickResult.dotDamage);
    snapshotFrame(state, `敌人受到持续伤害${tickResult.dotDamage}点`, {
      floatingNumber: { value: `-${tickResult.dotDamage}`, position: 'enemy', color: '#f97316' },
    });
  }
  if (state.enemyHp <= 0) return;

  if (tickResult.frozen) {
    snapshotFrame(state, `敌人被冰冻，无法行动`);
    return;
  }

  const roll = Math.random();
  if (roll < 0.2) {
    const shieldGain = Math.round(state.enemyDef * 1.5 + state.enemyAtk * 0.3 + 3);
    state.enemyShield += shieldGain;
    snapshotFrame(state, `敌人进入防御姿态，获得${shieldGain}点护盾`, {
      floatingNumber: { value: `+${shieldGain}护盾`, position: 'enemy', color: '#22c55e' },
    });
  } else {
    const baseDmg = state.enemyAtk;
    const dmgVar = Math.round((Math.random() * 0.4 - 0.2) * baseDmg);
    const rawDmg = Math.max(1, baseDmg + dmgVar);
    applyDamageToTarget(state, 'player', rawDmg, 'enemy');
    snapshotFrame(state, `敌人攻击造成${rawDmg}点伤害`, {
      floatingNumber: { value: `-${rawDmg}`, position: 'player', color: '#ef4444' },
    });

    if (state.enemyEffect && state.enemyEffect.type === 'lifesteal') {
      const healAmt = Math.round(rawDmg * state.enemyEffect.value);
      state.enemyHp = Math.min(state.enemyMaxHp, state.enemyHp + healAmt);
      snapshotFrame(state, `敌人吸血恢复${healAmt}点生命`, {
        floatingNumber: { value: `+${healAmt}`, position: 'enemy', color: '#10b981' },
      });
    }
    if (state.enemyEffect && ['burn', 'poison'].includes(state.enemyEffect.type)) {
      state.playerStatusEffects = addStatusEffect(state.playerStatusEffects, state.enemyEffect);
      snapshotFrame(state, `玩家附加${statusName(state.enemyEffect.type)}效果`);
    }
  }
}

function playerStatusTick(state: CombatState) {
  const tickResult = tickStatusEffects(state.playerStatusEffects, 'player', state);
  state.playerStatusEffects = tickResult.effects;
  if (tickResult.dotDamage > 0) {
    state.playerHp = Math.max(0, state.playerHp - tickResult.dotDamage);
    snapshotFrame(state, `玩家受到持续伤害${tickResult.dotDamage}点`, {
      floatingNumber: { value: `-${tickResult.dotDamage}`, position: 'player', color: '#f97316' },
    });
  }
  if (tickResult.healAmount > 0) {
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + tickResult.healAmount);
    snapshotFrame(state, `玩家持续回复${tickResult.healAmount}点生命`, {
      floatingNumber: { value: `+${tickResult.healAmount}`, position: 'player', color: '#10b981' },
    });
  }
}

export function runCombat(player: PlayerState, enemy: Enemy): CombatResult {
  const state: CombatState = {
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    playerShield: 0,
    playerStatusEffects: [],
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.maxHp,
    enemyShield: 0,
    enemyStatusEffects: [],
    enemyAtk: enemy.atk,
    enemyDef: enemy.def,
    enemyEffect: enemy.effect,
    deck: player.deck.map(c => ({ ...c })),
    frames: [],
    frameCount: 0,
    totalTurns: 0,
    events: [],
  };

  snapshotFrame(state, `战斗开始！对手：${enemy.name}`);

  const MAX_TURNS = 50;
  let victory = false;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    state.totalTurns = turn;
    state.playerShield = 0;

    playerStatusTick(state);
    if (state.playerHp <= 0) break;
    if (state.enemyHp <= 0) {
      victory = true;
      break;
    }

    snapshotFrame(state, `— 第 ${turn} 回合 —`);

    for (const card of state.deck) {
      playCard(state, card);
      if (state.enemyHp <= 0) {
        victory = true;
        break;
      }
    }

    if (victory || state.playerHp <= 0) break;

    enemyTurn(state);

    if (state.enemyHp <= 0) {
      victory = true;
      break;
    }
    if (state.playerHp <= 0) break;
  }

  snapshotFrame(
    state,
    victory ? `战斗胜利！用了 ${state.totalTurns} 回合` : `战斗失败...`
  );

  return {
    victory,
    playerFinalHp: state.playerHp,
    enemyFinalHp: state.enemyHp,
    frames: state.frames,
    totalTurns: state.totalTurns,
    summary: victory
      ? `击败${enemy.name}！用时${state.totalTurns}回合，剩余生命${state.playerHp}/${state.playerMaxHp}`
      : `被${enemy.name}击败。坚持了${state.totalTurns}回合。`,
  };
}
