import { SpellType, SPELLS } from './SpellMatcher';

export type PlayerId = 'player1' | 'player2';

export type SpellCooldowns = Record<SpellType, number>;

export interface PlayerState {
  id: PlayerId;
  name: string;
  hp: number;
  maxHp: number;
  hasShield: boolean;
  shieldEndTime: number;
  isSlowed: boolean;
  slowEndTime: number;
  isHasted: boolean;
  hasteEndTime: number;
  spellCooldowns: SpellCooldowns;
  combo: number;
  lastSpellTime: number;
}

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  winner: PlayerId | null;
  isGameOver: boolean;
  startTime: number;
}

export interface SpellResult {
  success: boolean;
  spell: SpellType | null;
  damage: number;
  target: PlayerId | null;
  effects: {
    shield?: boolean;
    heal?: number;
    slow?: boolean;
    haste?: boolean;
  };
  onCooldown?: boolean;
}

const SPELL_COOLDOWN_DURATION = 3000;
const SHIELD_DURATION = 2000;
const SLOW_DURATION = 1500;
const HASTE_DURATION = 1000;
const COMBO_TIMEOUT = 3000;

const ALL_SPELLS: SpellType[] = ['fireball', 'iceSpike', 'thunder', 'shield', 'heal', 'haste'];

export function createInitialState(): GameState {
  const now = Date.now();
  return {
    players: {
      player1: createPlayer('player1', '玩家一', now),
      player2: createPlayer('player2', '玩家二', now)
    },
    winner: null,
    isGameOver: false,
    startTime: now
  };
}

function createInitialCooldowns(): SpellCooldowns {
  const cooldowns: Partial<SpellCooldowns> = {};
  for (const spell of ALL_SPELLS) {
    cooldowns[spell] = 0;
  }
  return cooldowns as SpellCooldowns;
}

function createPlayer(id: PlayerId, name: string, now: number): PlayerState {
  return {
    id,
    name,
    hp: 100,
    maxHp: 100,
    hasShield: false,
    shieldEndTime: 0,
    isSlowed: false,
    slowEndTime: 0,
    isHasted: false,
    hasteEndTime: 0,
    spellCooldowns: createInitialCooldowns(),
    combo: 0,
    lastSpellTime: 0
  };
}

export function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === 'player1' ? 'player2' : 'player1';
}

export function isSpellOnCooldown(player: PlayerState, spell: SpellType, now: number): boolean {
  return player.spellCooldowns[spell] > now;
}

export function getSpellCooldownRemaining(player: PlayerState, spell: SpellType, now: number): number {
  return Math.max(0, player.spellCooldowns[spell] - now);
}

export function getAllCooldownRemaining(player: PlayerState, now: number): Record<SpellType, number> {
  const result: Partial<Record<SpellType, number>> = {};
  for (const spell of ALL_SPELLS) {
    result[spell] = getSpellCooldownRemaining(player, spell, now);
  }
  return result as Record<SpellType, number>;
}

export function getAnySpellOnCooldown(player: PlayerState, now: number): SpellType | null {
  for (const spell of ALL_SPELLS) {
    if (isSpellOnCooldown(player, spell, now)) {
      return spell;
    }
  }
  return null;
}

export function castSpell(
  state: GameState,
  casterId: PlayerId,
  spell: SpellType,
  now: number
): { newState: GameState; result: SpellResult } {
  if (state.isGameOver) {
    return {
      newState: state,
      result: {
        success: false,
        spell: null,
        damage: 0,
        target: null,
        effects: {}
      }
    };
  }

  const caster = state.players[casterId];
  
  if (isSpellOnCooldown(caster, spell, now)) {
    return {
      newState: state,
      result: {
        success: false,
        spell: spell,
        damage: 0,
        target: null,
        effects: {},
        onCooldown: true
      }
    };
  }

  const spellInfo = SPELLS[spell];
  const result: SpellResult = {
    success: true,
    spell,
    damage: 0,
    target: null,
    effects: {}
  };

  const newPlayers = { ...state.players };
  const newCaster = { 
    ...caster, 
    spellCooldowns: { ...caster.spellCooldowns }
  };
  
  const timeSinceLastSpell = now - newCaster.lastSpellTime;
  if (timeSinceLastSpell < COMBO_TIMEOUT && newCaster.combo > 0) {
    newCaster.combo += 1;
  } else {
    newCaster.combo = 1;
  }
  newCaster.lastSpellTime = now;
  newCaster.spellCooldowns[spell] = now + SPELL_COOLDOWN_DURATION;

  if (spell === 'shield') {
    newCaster.hasShield = true;
    newCaster.shieldEndTime = now + SHIELD_DURATION;
    result.effects.shield = true;
  } else if (spell === 'heal') {
    const healAmount = Math.abs(spellInfo.damage);
    const actualHeal = Math.min(healAmount, newCaster.maxHp - newCaster.hp);
    newCaster.hp = Math.min(newCaster.maxHp, newCaster.hp + healAmount);
    result.effects.heal = actualHeal;
  } else if (spell === 'haste') {
    newCaster.isHasted = true;
    newCaster.hasteEndTime = now + HASTE_DURATION;
    result.effects.haste = true;
  } else {
    const targetId = getOpponent(casterId);
    const target = { 
      ...newPlayers[targetId],
      spellCooldowns: { ...newPlayers[targetId].spellCooldowns }
    };
    
    let damage = spellInfo.damage;
    
    if (target.hasShield && target.shieldEndTime > now) {
      damage = Math.floor(damage / 2);
      target.hasShield = false;
      target.shieldEndTime = 0;
    }
    
    target.hp = Math.max(0, target.hp - damage);
    result.damage = damage;
    result.target = targetId;
    
    if (spell === 'iceSpike') {
      target.isSlowed = true;
      target.slowEndTime = now + SLOW_DURATION;
      result.effects.slow = true;
    }
    
    newPlayers[targetId] = target;
  }
  
  newPlayers[casterId] = newCaster;

  const newState: GameState = {
    ...state,
    players: newPlayers
  };

  let winner: PlayerId | null = null;
  if (newPlayers.player1.hp <= 0) {
    winner = 'player2';
  } else if (newPlayers.player2.hp <= 0) {
    winner = 'player1';
  }

  if (winner) {
    newState.winner = winner;
    newState.isGameOver = true;
  }

  return { newState, result };
}

export function resetCombo(player: PlayerState, now: number): PlayerState {
  return {
    ...player,
    combo: 0,
    lastSpellTime: 0
  };
}

export function updatePlayerStatuses(state: GameState, now: number): GameState {
  const newPlayers = { ...state.players };
  
  for (const playerId of Object.keys(newPlayers) as PlayerId[]) {
    const player = { 
      ...newPlayers[playerId],
      spellCooldowns: { ...newPlayers[playerId].spellCooldowns }
    };
    
    if (player.hasShield && player.shieldEndTime <= now) {
      player.hasShield = false;
    }
    
    if (player.isSlowed && player.slowEndTime <= now) {
      player.isSlowed = false;
    }
    
    if (player.isHasted && player.hasteEndTime <= now) {
      player.isHasted = false;
    }
    
    if (player.combo > 0 && now - player.lastSpellTime > COMBO_TIMEOUT) {
      player.combo = 0;
    }
    
    newPlayers[playerId] = player;
  }
  
  return {
    ...state,
    players: newPlayers
  };
}

export function resetGame(): GameState {
  return createInitialState();
}

export function getSpeedMultiplier(player: PlayerState, now: number): number {
  let multiplier = 1;
  
  if (player.isSlowed && player.slowEndTime > now) {
    multiplier *= 0.7;
  }
  
  if (player.isHasted && player.hasteEndTime > now) {
    multiplier *= 1.2;
  }
  
  return multiplier;
}

export const SPELL_ICONS: Record<SpellType, string> = {
  fireball: '🔥',
  iceSpike: '❄️',
  thunder: '⚡',
  shield: '🛡️',
  heal: '💚',
  haste: '💨'
};

export const SPELL_NAMES: Record<SpellType, string> = {
  fireball: '火球',
  iceSpike: '冰锥',
  thunder: '雷电',
  shield: '护盾',
  heal: '治疗',
  haste: '加速'
};
