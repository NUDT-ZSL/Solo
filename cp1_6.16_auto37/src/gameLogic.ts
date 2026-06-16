import { v4 as uuidv4 } from 'uuid';

export interface Character {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  skillName: string;
  skillPower: number;
  avatar?: string;
  isDefeated?: boolean;
}

export interface DiceResult {
  dice: number[];
  total: number;
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  attacker: string;
  target: string;
  skillName: string;
  diceResult: DiceResult;
  damage: number;
  message: string;
}

export interface BattleRecord {
  id: string;
  startTime: number;
  endTime?: number;
  playerTeam: Character[];
  enemyTeam: Character[];
  logs: CombatLogEntry[];
  winner?: 'player' | 'enemy';
}

export interface GameState {
  phase: 'select' | 'battle' | 'finished';
  playerTeam: Character[];
  enemyTeam: Character[];
  selectedTargetId: string | null;
  currentTurn: 'player' | 'enemy';
  currentAttackerIndex: number;
  logs: CombatLogEntry[];
  battleRecord: BattleRecord | null;
  isRolling: boolean;
  lastDamage: { targetId: string; damage: number } | null;
}

export function rollDice(count: number = 5): DiceResult {
  const dice: number[] = [];
  for (let i = 0; i < count; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  const total = dice.reduce((sum, val) => sum + val, 0);
  return { dice, total };
}

export function calculateDamage(
  diceTotal: number,
  skillPower: number,
  attackerAttack: number
): number {
  return Math.floor(diceTotal * skillPower + attackerAttack * 0.5);
}

export function resolveTurn(
  state: GameState,
  diceResult: DiceResult
): {
  newState: GameState;
  damage: number;
  targetDefeated: boolean;
} {
  const { playerTeam, enemyTeam, selectedTargetId, currentTurn, currentAttackerIndex } = state;
  
  const attackingTeam = currentTurn === 'player' ? playerTeam : enemyTeam;
  const defendingTeam = currentTurn === 'player' ? enemyTeam : playerTeam;
  
  const attacker = attackingTeam[currentAttackerIndex];
  if (!attacker || attacker.isDefeated) {
    return { newState: state, damage: 0, targetDefeated: false };
  }
  
  const targetId = selectedTargetId || defendingTeam.find(c => !c.isDefeated)?.id;
  if (!targetId) {
    return { newState: state, damage: 0, targetDefeated: false };
  }
  
  const targetIndex = defendingTeam.findIndex(c => c.id === targetId);
  if (targetIndex === -1) {
    return { newState: state, damage: 0, targetDefeated: false };
  }
  
  const damage = calculateDamage(diceResult.total, attacker.skillPower, attacker.attack);
  
  const newDefendingTeam = defendingTeam.map((c, idx) => {
    if (idx === targetIndex) {
      const newHp = Math.max(0, c.currentHp - damage);
      return {
        ...c,
        currentHp: newHp,
        isDefeated: newHp <= 0,
      };
    }
    return c;
  });
  
  const target = newDefendingTeam[targetIndex];
  const targetDefeated = target.isDefeated || false;
  
  const logEntry: CombatLogEntry = {
    id: uuidv4(),
    timestamp: Date.now(),
    attacker: attacker.name,
    target: target.name,
    skillName: attacker.skillName,
    diceResult,
    damage,
    message: `${attacker.name} 使用 ${attacker.skillName} 对 ${target.name} 造成 ${damage} 点伤害${targetDefeated ? '，目标被击败！' : '！'}`,
  };
  
  let newPlayerTeam: Character[];
  let newEnemyTeam: Character[];
  
  if (currentTurn === 'player') {
    newPlayerTeam = [...playerTeam];
    newEnemyTeam = newDefendingTeam;
  } else {
    newPlayerTeam = newDefendingTeam;
    newEnemyTeam = [...enemyTeam];
  }
  
  const playerAlive = newPlayerTeam.some(c => !c.isDefeated);
  const enemyAlive = newEnemyTeam.some(c => !c.isDefeated);
  
  let newPhase = state.phase;
  let winner: 'player' | 'enemy' | undefined;
  
  if (!playerAlive) {
    newPhase = 'finished';
    winner = 'enemy';
  } else if (!enemyAlive) {
    newPhase = 'finished';
    winner = 'player';
  }
  
  let nextAttackerIndex = currentAttackerIndex + 1;
  let nextTurn = currentTurn;
  
  while (true) {
    const team = nextTurn === 'player' ? newPlayerTeam : newEnemyTeam;
    if (nextAttackerIndex >= team.length) {
      nextAttackerIndex = 0;
      nextTurn = nextTurn === 'player' ? 'enemy' : 'player';
    }
    const nextTeam = nextTurn === 'player' ? newPlayerTeam : newEnemyTeam;
    const nextAttacker = nextTeam[nextAttackerIndex];
    if (!nextAttacker?.isDefeated) {
      break;
    }
    nextAttackerIndex++;
  }
  
  let newSelectedTargetId: string | null = null;
  const nextDefendingTeam = nextTurn === 'player' ? newEnemyTeam : newPlayerTeam;
  const aliveTargets = nextDefendingTeam.filter(c => !c.isDefeated);
  if (aliveTargets.length > 0) {
    newSelectedTargetId = aliveTargets[0].id;
  }
  
  const newState: GameState = {
    ...state,
    phase: newPhase,
    playerTeam: newPlayerTeam,
    enemyTeam: newEnemyTeam,
    selectedTargetId: newSelectedTargetId,
    currentTurn: nextTurn,
    currentAttackerIndex: nextAttackerIndex,
    logs: [logEntry, ...state.logs],
    lastDamage: { targetId: target.id, damage },
    battleRecord: state.battleRecord
      ? {
          ...state.battleRecord,
          playerTeam: newPlayerTeam,
          enemyTeam: newEnemyTeam,
          logs: [logEntry, ...state.battleRecord.logs],
          winner,
          endTime: newPhase === 'finished' ? Date.now() : undefined,
        }
      : null,
  };
  
  return { newState, damage, targetDefeated };
}

export function createInitialState(): GameState {
  return {
    phase: 'select',
    playerTeam: [],
    enemyTeam: [],
    selectedTargetId: null,
    currentTurn: 'player',
    currentAttackerIndex: 0,
    logs: [],
    battleRecord: null,
    isRolling: false,
    lastDamage: null,
  };
}

export function startBattle(
  playerTeam: Character[],
  enemyTeam: Character[]
): GameState {
  const battleRecord: BattleRecord = {
    id: uuidv4(),
    startTime: Date.now(),
    playerTeam: JSON.parse(JSON.stringify(playerTeam)),
    enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
    logs: [],
  };
  
  const firstAliveTarget = enemyTeam.find(c => !c.isDefeated);
  
  return {
    phase: 'battle',
    playerTeam: JSON.parse(JSON.stringify(playerTeam)),
    enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
    selectedTargetId: firstAliveTarget?.id || null,
    currentTurn: 'player',
    currentAttackerIndex: 0,
    logs: [],
    battleRecord,
    isRolling: false,
    lastDamage: null,
  };
}

export function cloneCharacter(char: Character): Character {
  return {
    ...char,
    currentHp: char.maxHp,
    isDefeated: false,
  };
}
