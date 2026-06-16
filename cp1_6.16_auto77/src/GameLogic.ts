export type DiceType = {
  id: string;
  value: number;
  isSelected: boolean;
  isNew: boolean;
  isMerging: boolean;
};

export type GuardType = 'warrior' | 'archer' | 'mage';

export type Guard = {
  id: string;
  type: GuardType;
  row: number;
  col: number;
  damage: number;
  range: number;
  attackSpeed: number;
  lastAttackTime: number;
  isAttacking: boolean;
  attackAnimationKey: number;
};

export type Enemy = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  direction: number;
  spawnSector: number;
};

export type GameState = {
  dice: DiceType[];
  guards: Guard[];
  enemies: Enemy[];
  luck: number;
  lives: number;
  wave: number;
  score: number;
  mergeCount: number;
  isGameOver: boolean;
  waveInProgress: boolean;
  waveTimer: number;
};

export const BOARD_ROWS = 6;
export const BOARD_COLS = 8;
export const MAX_DICE = 6;
export const INITIAL_LUCK = 100;
export const INITIAL_LIVES = 20;
export const LUCK_MERGE_BONUS = 5;
export const LUCK_ENEMY_PENALTY = 10;
export const WAVE_INTERVAL = 8000;
export const ENEMY_BASE_SPEED = 0.02;
export const GUARD_ATTACK_INTERVAL = 1500;

let idCounter = 0;
const generateId = (): string => `id_${++idCounter}_${Date.now()}`;

export const createInitialState = (): GameState => {
  const dice: DiceType[] = [];
  for (let i = 0; i < MAX_DICE; i++) {
    dice.push({
      id: generateId(),
      value: rollDice(INITIAL_LUCK),
      isSelected: false,
      isNew: false,
      isMerging: false,
    });
  }

  return {
    dice,
    guards: [],
    enemies: [],
    luck: INITIAL_LUCK,
    lives: INITIAL_LIVES,
    wave: 0,
    score: 0,
    mergeCount: 0,
    isGameOver: false,
    waveInProgress: false,
    waveTimer: 0,
  };
};

export const rollDice = (luck: number): number => {
  const baseProb = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  let probabilities = [...baseProb];

  if (luck > 80) {
    const boost = 0.2;
    const original56 = probabilities[4] + probabilities[5];
    const new56 = Math.min(original56 + boost, 0.95);
    const actualBoost = new56 - original56;
    probabilities[4] += actualBoost * (probabilities[4] / original56);
    probabilities[5] += actualBoost * (probabilities[5] / original56);
    const reduction = actualBoost / 4;
    for (let i = 0; i < 4; i++) {
      probabilities[i] = Math.max(0.01, probabilities[i] - reduction);
    }
  } else if (luck < 30) {
    const boost = 0.3;
    const original12 = probabilities[0] + probabilities[1];
    const new12 = Math.min(original12 + boost, 0.95);
    const actualBoost = new12 - original12;
    probabilities[0] += actualBoost * (probabilities[0] / original12);
    probabilities[1] += actualBoost * (probabilities[1] / original12);
    const reduction = actualBoost / 4;
    for (let i = 2; i < 6; i++) {
      probabilities[i] = Math.max(0.01, probabilities[i] - reduction);
    }
  }

  const total = probabilities.reduce((a, b) => a + b, 0);
  probabilities = probabilities.map(p => p / total);

  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < 6; i++) {
    cumulative += probabilities[i];
    if (rand < cumulative) {
      return i + 1;
    }
  }
  return 6;
};

export const canMergeDice = (dice1: DiceType, dice2: DiceType): boolean => {
  return dice1.id !== dice2.id;
};

export const findEmptyCell = (guards: Guard[]): { row: number; col: number } | null => {
  const centerRow = Math.floor(BOARD_ROWS / 2);
  const centerCol = Math.floor(BOARD_COLS / 2);

  for (let distance = 1; distance < Math.max(BOARD_ROWS, BOARD_COLS); distance++) {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        if (row === centerRow && col === centerCol) continue;
        const occupied = guards.some(g => g.row === row && g.col === col);
        if (!occupied) {
          return { row, col };
        }
      }
    }
  }
  return null;
};

export const mergeDice = (state: GameState, diceId1: string, diceId2: string): GameState => {
  const dice1 = state.dice.find(d => d.id === diceId1);
  const dice2 = state.dice.find(d => d.id === diceId2);

  if (!dice1 || !dice2 || !canMergeDice(dice1, dice2)) {
    return state;
  }

  const newValue = (dice1.value + dice2.value) % 6;

  const newDice = state.dice.filter(d => d.id !== diceId1 && d.id !== diceId2);

  while (newDice.length < MAX_DICE) {
    newDice.push({
      id: generateId(),
      value: rollDice(state.luck + LUCK_MERGE_BONUS),
      isSelected: false,
      isNew: true,
      isMerging: false,
    });
  }

  let newState: GameState = {
    ...state,
    dice: newDice,
    luck: Math.min(150, state.luck + LUCK_MERGE_BONUS),
    mergeCount: state.mergeCount + 1,
  };

  if (newValue !== 0) {
    const emptyCell = findEmptyCell(state.guards);
    if (emptyCell) {
      newState = placeGuard(newState, emptyCell.row, emptyCell.col, newValue);
    }
  }

  return newState;
};

export const selectDice = (state: GameState, diceId: string): GameState => {
  const selectedCount = state.dice.filter(d => d.isSelected).length;
  const dice = state.dice.map(d => {
    if (d.id === diceId) {
      if (d.isSelected) {
        return { ...d, isSelected: false };
      } else if (selectedCount < 2) {
        return { ...d, isSelected: true };
      }
    }
    return d;
  });
  return { ...state, dice };
};

export const getSelectedDice = (state: GameState): DiceType[] => {
  return state.dice.filter(d => d.isSelected);
};

export const getGuardTypeFromDice = (value: number): GuardType => {
  if (value >= 1 && value <= 2) return 'warrior';
  if (value >= 3 && value <= 4) return 'archer';
  return 'mage';
};

export const placeGuard = (state: GameState, row: number, col: number, diceValue: number): GameState => {
  const existing = state.guards.find(g => g.row === row && g.col === col);
  if (existing) return state;

  const type = getGuardTypeFromDice(diceValue);
  let damage = 10;
  let range = 1;

  if (type === 'warrior') {
    damage = 15 + diceValue * 5;
    range = 1;
  } else if (type === 'archer') {
    damage = 10 + (diceValue - 2) * 5;
    range = 3;
  } else {
    damage = 12 + (diceValue - 4) * 6;
    range = 2;
  }

  const guard: Guard = {
    id: generateId(),
    type,
    row,
    col,
    damage,
    range,
    attackSpeed: GUARD_ATTACK_INTERVAL,
    lastAttackTime: 0,
    isAttacking: false,
    attackAnimationKey: 0,
  };

  return {
    ...state,
    guards: [...state.guards, guard],
  };
};

export const spawnWave = (state: GameState): GameState => {
  const wave = state.wave + 1;
  const enemyCount = Math.min(3 + wave - 1, 15);
  const enemies: Enemy[] = [];

  for (let i = 0; i < enemyCount; i++) {
    const sector = Math.floor(Math.random() * 6);
    const angle = (sector * 60 + Math.random() * 60 - 30) * (Math.PI / 180);
    const distance = 5;
    const centerX = BOARD_COLS / 2;
    const centerY = BOARD_ROWS / 2;

    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    const dx = centerX - x;
    const dy = centerY - y;
    const dir = Math.atan2(dy, dx);

    const hpMultiplier = 1 + (wave - 1) * 0.2;

    enemies.push({
      id: generateId(),
      x,
      y,
      hp: 30 * hpMultiplier,
      maxHp: 30 * hpMultiplier,
      speed: ENEMY_BASE_SPEED * (1 + wave * 0.03),
      direction: dir,
      spawnSector: sector,
    });
  }

  return {
    ...state,
    wave,
    enemies: [...state.enemies, ...enemies],
    waveInProgress: true,
  };
};

export const updateGame = (state: GameState, deltaTime: number, currentTime: number): GameState => {
  if (state.isGameOver) return state;

  let newState = { ...state };

  newState.enemies = state.enemies.map(enemy => {
    const centerX = BOARD_COLS / 2;
    const centerY = BOARD_ROWS / 2;
    const dx = centerX - enemy.x;
    const dy = centerY - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.3) {
      return { ...enemy, hp: -1 };
    }

    const moveX = Math.cos(enemy.direction) * enemy.speed * deltaTime / 16;
    const moveY = Math.sin(enemy.direction) * enemy.speed * deltaTime / 16;

    return {
      ...enemy,
      x: enemy.x + moveX,
      y: enemy.y + moveY,
    };
  });

  const reachedEnemies = newState.enemies.filter(e => e.hp === -1);
  if (reachedEnemies.length > 0) {
    newState.lives -= reachedEnemies.length;
    newState.luck = Math.max(0, newState.luck - reachedEnemies.length * LUCK_ENEMY_PENALTY);
    if (newState.lives <= 0) {
      newState.lives = 0;
      newState.isGameOver = true;
      newState.score = calculateScore(newState);
    }
  }
  newState.enemies = newState.enemies.filter(e => e.hp > 0);

  newState.guards = state.guards.map(guard => {
    if (currentTime - guard.lastAttackTime < guard.attackSpeed) {
      return guard;
    }

    const targets = newState.enemies.filter(enemy => {
      const dx = (enemy.x - guard.col - 0.5);
      const dy = (enemy.y - guard.row - 0.5);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= guard.range;
    });

    if (targets.length > 0) {
      const target = targets[0];
      target.hp -= guard.damage;
      return {
        ...guard,
        lastAttackTime: currentTime,
        attackAnimationKey: guard.attackAnimationKey + 1,
      };
    }

    return guard;
  });

  newState.enemies = newState.enemies.filter(e => e.hp > 0);

  if (newState.waveInProgress && newState.enemies.length === 0) {
    newState.waveInProgress = false;
  }

  return newState;
};

export const calculateScore = (state: GameState): number => {
  return state.wave * 50 + state.mergeCount * 10 + state.luck * 2;
};

export const clearDiceMergeFlags = (state: GameState): GameState => {
  return {
    ...state,
    dice: state.dice.map(d => ({ ...d, isNew: false, isMerging: false })),
  };
};
