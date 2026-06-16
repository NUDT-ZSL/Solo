import {
  CharacterState,
  ElementType,
  applyDamage,
  calculateDamage,
  checkElementAdvantage,
  checkVictory,
  consumeMp,
  createCharacter,
  getPrimarySpellElement,
  recoverMp,
} from './gameLogic';

export interface SpellDefinition {
  id: string;
  name: string;
  elements: ElementType[];
  mpCost: number;
  cooldownTurns: number;
  damageMin: number;
  damageMax: number;
  color: string;
}

export interface ElementCooldownEntry {
  remainingTurns: number;
  sourceSpellId: string;
}

export interface PlayerCooldowns {
  spellCooldowns: { [spellId: string]: number };
  elementCooldowns: { [element in ElementType]?: ElementCooldownEntry };
}

export interface CooldownMap {
  [playerId: number]: PlayerCooldowns;
}

export interface CombatState {
  characters: [CharacterState, CharacterState];
  currentPlayerIndex: 0 | 1;
  turnNumber: number;
  cooldowns: CooldownMap;
  winner: number | null;
}

export const COMBO_SPELLS: SpellDefinition[] = [
  {
    id: 'fire_storm',
    name: '火焰风暴',
    elements: ['fire', 'wind'],
    mpCost: 20,
    cooldownTurns: 2,
    damageMin: 18,
    damageMax: 22,
    color: '#ff8844',
  },
  {
    id: 'ice_thunder',
    name: '冰霜雷击',
    elements: ['ice', 'thunder'],
    mpCost: 25,
    cooldownTurns: 2,
    damageMin: 20,
    damageMax: 24,
    color: '#44eeff',
  },
  {
    id: 'thunder_fire',
    name: '雷火风暴',
    elements: ['thunder', 'fire'],
    mpCost: 30,
    cooldownTurns: 2,
    damageMin: 22,
    damageMax: 25,
    color: '#ffaa22',
  },
  {
    id: 'wind_ice',
    name: '风冰漩涡',
    elements: ['wind', 'ice'],
    mpCost: 25,
    cooldownTurns: 2,
    damageMin: 20,
    damageMax: 24,
    color: '#22ffcc',
  },
  {
    id: 'fire_thunder_burst',
    name: '火雷爆裂',
    elements: ['fire', 'thunder', 'wind'],
    mpCost: 35,
    cooldownTurns: 3,
    damageMin: 23,
    damageMax: 25,
    color: '#ff4400',
  },
  {
    id: 'ice_wind_tide',
    name: '冰风寒潮',
    elements: ['ice', 'wind', 'ice'],
    mpCost: 20,
    cooldownTurns: 1,
    damageMin: 15,
    damageMax: 18,
    color: '#66ffdd',
  },
  {
    id: 'double_fire',
    name: '烈焰爆发',
    elements: ['fire', 'fire'],
    mpCost: 10,
    cooldownTurns: 1,
    damageMin: 15,
    damageMax: 18,
    color: '#ff6b35',
  },
];

function normalizeElements(elements: ElementType[]): ElementType[] {
  return [...elements].sort();
}

export function matchSpellByElements(
  selected: ElementType[],
): SpellDefinition | null {
  if (selected.length < 2 || selected.length > 3) return null;
  const selSorted = normalizeElements(selected);
  for (const spell of COMBO_SPELLS) {
    const spellSorted = normalizeElements(spell.elements);
    if (spellSorted.length !== selSorted.length) continue;
    let match = true;
    for (let i = 0; i < spellSorted.length; i++) {
      if (spellSorted[i] !== selSorted[i]) {
        match = false;
        break;
      }
    }
    if (match) return spell;
  }
  return null;
}

export function selectElementsAndMatch(
  selected: ElementType[],
): { spell: SpellDefinition | null; isValidCount: boolean } {
  const isValidCount = selected.length >= 2 && selected.length <= 3;
  return {
    spell: matchSpellByElements(selected),
    isValidCount,
  };
}

function isSpellOnCooldown(
  cooldowns: PlayerCooldowns,
  spell: SpellDefinition,
): { blocked: boolean; reason: string } {
  const spellCd = cooldowns.spellCooldowns[spell.id] ?? 0;
  if (spellCd > 0) {
    return { blocked: true, reason: `法术冷却中 ${spellCd} 回合` };
  }
  for (const elem of spell.elements) {
    const elemCd = cooldowns.elementCooldowns[elem];
    if (elemCd && elemCd.remainingTurns > 0) {
      return { blocked: true, reason: `${elem}元素冷却中 (${elemCd.sourceSpellId})` };
    }
  }
  return { blocked: false, reason: '' };
}

export function getAvailableSpellsForPlayer(
  state: CombatState,
  playerIndex: 0 | 1,
): Array<{ spell: SpellDefinition; canCast: boolean; remainingCooldown: number; reason: string }> {
  const player = state.characters[playerIndex];
  const pcd = state.cooldowns[player.id] ?? createEmptyPlayerCooldowns();
  return COMBO_SPELLS.map((spell) => {
    const remainingCooldown = pcd.spellCooldowns[spell.id] ?? 0;
    let canCast = true;
    let reason = '';
    if (player.mp < spell.mpCost) {
      canCast = false;
      reason = '蓝量不足';
    } else {
      const cdCheck = isSpellOnCooldown(pcd, spell);
      if (cdCheck.blocked) {
        canCast = false;
        reason = cdCheck.reason;
      }
    }
    return { spell, canCast, remainingCooldown, reason };
  });
}

function createEmptyPlayerCooldowns(): PlayerCooldowns {
  return { spellCooldowns: {}, elementCooldowns: {} };
}

export function createInitialCombatState(): CombatState {
  return {
    characters: [
      createCharacter(0, '炎魔法师', '#ff6b6b', '#ffaa00'),
      createCharacter(1, '霜魔法师', '#6b9fff', '#00d4ff'),
    ],
    currentPlayerIndex: 0,
    turnNumber: 1,
    cooldowns: { 0: createEmptyPlayerCooldowns(), 1: createEmptyPlayerCooldowns() },
    winner: null,
  };
}

export interface CastSpellResult {
  nextState: CombatState;
  spell: SpellDefinition;
  casterIndex: 0 | 1;
  targetIndex: 0 | 1;
  damageResult: ReturnType<typeof calculateDamage>;
  isCountered: boolean;
}

export function castSpell(
  state: CombatState,
  spell: SpellDefinition,
  casterIndex: 0 | 1,
): CastSpellResult | { error: string } {
  if (state.winner !== null) {
    return { error: '游戏已结束' };
  }
  if (state.currentPlayerIndex !== casterIndex) {
    return { error: '非当前玩家回合' };
  }
  const caster = state.characters[casterIndex];
  if (caster.mp < spell.mpCost) {
    return { error: '蓝量不足' };
  }
  const pcd = state.cooldowns[caster.id] ?? createEmptyPlayerCooldowns();
  const cdCheck = isSpellOnCooldown(pcd, spell);
  if (cdCheck.blocked) {
    return { error: cdCheck.reason };
  }

  const targetIndex = (1 - casterIndex) as 0 | 1;
  const target = state.characters[targetIndex];
  const primaryDefendElement: ElementType = casterIndex === 0 ? 'ice' : 'fire';

  const isCountered = checkElementAdvantage(spell.elements, primaryDefendElement);
  const damageResult = calculateDamage(
    spell.damageMin,
    spell.damageMax,
    spell.elements,
    primaryDefendElement,
  );

  const newCaster = consumeMp(caster, spell.mpCost);
  const newTarget = applyDamage(target, damageResult.totalDamage);

  const newCharacters: [CharacterState, CharacterState] = [
    ...state.characters,
  ] as [CharacterState, CharacterState];
  newCharacters[casterIndex] = newCaster;
  newCharacters[targetIndex] = newTarget;

  const newCooldowns: CooldownMap = deepCloneCooldowns(state.cooldowns);
  const npc = newCooldowns[caster.id] ?? createEmptyPlayerCooldowns();
  npc.spellCooldowns[spell.id] = spell.cooldownTurns;

  const uniqueElements = [...new Set(spell.elements)];
  for (const elem of uniqueElements) {
    const existing = npc.elementCooldowns[elem];
    if (!existing || existing.remainingTurns < spell.cooldownTurns) {
      npc.elementCooldowns[elem] = {
        remainingTurns: spell.cooldownTurns,
        sourceSpellId: spell.id,
      };
    }
  }
  newCooldowns[caster.id] = npc;

  const winner = checkVictory(newCharacters);

  const nextState: CombatState = {
    characters: newCharacters,
    currentPlayerIndex: winner !== null ? state.currentPlayerIndex : targetIndex,
    turnNumber: winner !== null ? state.turnNumber : state.turnNumber,
    cooldowns: newCooldowns,
    winner,
  };

  return {
    nextState,
    spell,
    casterIndex,
    targetIndex,
    damageResult,
    isCountered,
  };
}

function deepCloneCooldowns(cd: CooldownMap): CooldownMap {
  const result: CooldownMap = {};
  for (const pid of Object.keys(cd)) {
    const pcd = cd[Number(pid)];
    result[Number(pid)] = {
      spellCooldowns: { ...pcd.spellCooldowns },
      elementCooldowns: { ...pcd.elementCooldowns },
    };
  }
  return result;
}

export function advanceTurn(state: CombatState): CombatState {
  if (state.winner !== null) return state;

  const newCooldowns: CooldownMap = deepCloneCooldowns(state.cooldowns);
  for (const pid of Object.keys(newCooldowns)) {
    const pcd = newCooldowns[Number(pid)];
    for (const sid of Object.keys(pcd.spellCooldowns)) {
      if (pcd.spellCooldowns[sid] > 0) {
        pcd.spellCooldowns[sid] -= 1;
      }
    }
    for (const elem of Object.keys(pcd.elementCooldowns) as ElementType[]) {
      const entry = pcd.elementCooldowns[elem];
      if (entry && entry.remainingTurns > 0) {
        entry.remainingTurns -= 1;
      }
    }
  }

  const newCharacters: [CharacterState, CharacterState] = state.characters.map(
    (c) => recoverMp(c, 5),
  ) as [CharacterState, CharacterState];

  const nextPlayer = (1 - state.currentPlayerIndex) as 0 | 1;

  return {
    characters: newCharacters,
    currentPlayerIndex: nextPlayer,
    turnNumber: state.turnNumber + 1,
    cooldowns: newCooldowns,
    winner: state.winner,
  };
}

export function resetGame(): CombatState {
  return createInitialCombatState();
}
