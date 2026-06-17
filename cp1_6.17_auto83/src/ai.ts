import type { Character, PowerUp, Buff, EntityType, BuffType } from './store';
import { clamp, randomRange } from './utils';
import {
  ARENA_WIDTH,
  WALL_THICKNESS,
  GROUND_Y,
  GRAVITY,
  JUMP_FORCE,
  MOVE_SPEED,
  clampAiPosition
} from './physics';

export interface AIState {
  direction: number;
  directionChangeTimer: number;
  nextDirectionChangeTime: number;
  jumpTimer: number;
  nextJumpTime: number;
  attackTimer: number;
  nextAttackTime: number;
  powerUpSpawnTimer: number;
  powerUpSpawnInterval: number;
  isCharging: boolean;
  chargeTime: number;
}

export const createInitialAIState = (): AIState => ({
  direction: Math.random() > 0.5 ? 1 : -1,
  directionChangeTimer: 0,
  nextDirectionChangeTime: randomRange(2, 3),
  jumpTimer: 0,
  nextJumpTime: randomRange(1, 3),
  attackTimer: 0,
  nextAttackTime: randomRange(2, 4),
  powerUpSpawnTimer: 0,
  powerUpSpawnInterval: randomRange(8, 15),
  isCharging: false,
  chargeTime: 0
});

export interface AIUpdateInput {
  ai: Character;
  player: Character;
  deltaTime: number;
  gameTime: number;
  aiState: AIState;
  powerUps: PowerUp[];
  buffs: Buff[];
  knockbackActive: boolean;
}

export interface AIUpdateOutput {
  updatedAi: Character;
  updatedAIState: AIState;
  shouldAttack: boolean;
  attackTargetX: number;
  attackTargetY: number;
  newPowerUpsToSpawn: number;
}

let powerUpIdCounter = 1000;
const getNextPowerUpId = () => ++powerUpIdCounter;

export const createPowerUp = (): PowerUp => {
  const types: BuffType[] = ['attack', 'speed'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const colors: Record<BuffType, string[]> = {
    attack: ['#E94560', '#533483'],
    speed: ['#00B4D8']
  };
  
  const colorOptions = colors[type];
  const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
  
  const minX = WALL_THICKNESS + 30;
  const maxX = ARENA_WIDTH - WALL_THICKNESS - 46;
  const minY = 80;
  const maxY = GROUND_Y - 100;
  
  return {
    id: getNextPowerUpId(),
    x: randomRange(minX, maxX),
    y: randomRange(minY, maxY),
    type,
    color,
    rotation: 0,
    collected: false
  };
};

export const spawnInitialPowerUps = (count: number = 3): PowerUp[] => {
  return Array.from({ length: count }, () => createPowerUp());
};

export const updateAI = (input: AIUpdateInput): AIUpdateOutput => {
  const { ai, player, deltaTime, aiState, buffs, knockbackActive } = input;
  const updatedAIState = { ...aiState };

  if (knockbackActive) {
    return {
      updatedAi: ai,
      updatedAIState,
      shouldAttack: false,
      attackTargetX: 0,
      attackTargetY: 0,
      newPowerUpsToSpawn: 0
    };
  }

  const speedBuff = buffs.find(b => b.entity === 'ai' && b.type === 'speed');
  const speedMul = speedBuff ? 1.3 : 1;

  let { x, y, vx, vy, onGround, facing, hp, maxHp, width, height, isCharging, chargeTime, energy } = ai;

  updatedAIState.directionChangeTimer += deltaTime;
  if (updatedAIState.directionChangeTimer >= updatedAIState.nextDirectionChangeTime) {
    updatedAIState.directionChangeTimer = 0;
    updatedAIState.nextDirectionChangeTime = randomRange(2, 3);
    updatedAIState.direction = Math.random() > 0.5 ? 1 : -1;
    
    const dxToPlayer = player.x - x;
    if (Math.random() < 0.4 && Math.abs(dxToPlayer) > 50) {
      updatedAIState.direction = dxToPlayer > 0 ? 1 : -1;
    }
  }

  updatedAIState.jumpTimer += deltaTime;
  if (updatedAIState.jumpTimer >= updatedAIState.nextJumpTime) {
    updatedAIState.jumpTimer = 0;
    updatedAIState.nextJumpTime = randomRange(1.5, 3.5);
    if (onGround && Math.random() < 0.7) {
      vy = JUMP_FORCE;
      onGround = false;
    }
  }

  updatedAIState.attackTimer += deltaTime;
  const attackBuff = buffs.find(b => b.entity === 'ai' && b.type === 'attack');
  const attackInterval = attackBuff ? randomRange(1.5, 3) : randomRange(2.5, 4.5);
  
  let shouldAttack = false;
  let attackTargetX = 0;
  let attackTargetY = 0;

  if (updatedAIState.attackTimer >= attackInterval) {
    const distToPlayer = Math.sqrt(
      Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2)
    );
    if (distToPlayer < 500 && distToPlayer > 50) {
      updatedAIState.isCharging = true;
      updatedAIState.chargeTime = 0;
      updatedAIState.attackTimer = 0;
    }
  }

  if (updatedAIState.isCharging) {
    updatedAIState.chargeTime += deltaTime;
    chargeTime = updatedAIState.chargeTime;
    isCharging = true;
    energy = Math.min(100, (chargeTime / 2) * 100);
    
    if (updatedAIState.chargeTime >= 0.6) {
      shouldAttack = true;
      attackTargetX = player.x + player.width / 2 + randomRange(-30, 30);
      attackTargetY = player.y + player.height / 2 + randomRange(-30, 30);
      updatedAIState.isCharging = false;
      updatedAIState.chargeTime = 0;
      chargeTime = 0;
      isCharging = false;
      energy = 0;
    }
  } else {
    isCharging = false;
    chargeTime = 0;
    energy = 0;
  }

  vx = updatedAIState.direction * MOVE_SPEED * speedMul;
  facing = updatedAIState.direction > 0 ? 1 : -1;

  vy += GRAVITY * deltaTime;
  x += vx * deltaTime;
  y += vy * deltaTime;

  if (y + height >= GROUND_Y) {
    y = GROUND_Y - height;
    vy = 0;
    onGround = true;
  }

  x = clampAiPosition(x, width);
  
  if (x <= WALL_THICKNESS + 1) {
    updatedAIState.direction = 1;
  } else if (x >= ARENA_WIDTH - WALL_THICKNESS - width - 1) {
    updatedAIState.direction = -1;
  }

  updatedAIState.powerUpSpawnTimer += deltaTime;
  let newPowerUpsToSpawn = 0;
  
  if (updatedAIState.powerUpSpawnTimer >= updatedAIState.powerUpSpawnInterval) {
    updatedAIState.powerUpSpawnTimer = 0;
    updatedAIState.powerUpSpawnInterval = randomRange(8, 15);
    newPowerUpsToSpawn = 1;
  }

  const updatedAi: Character = {
    x, y, vx, vy, onGround, facing,
    hp, maxHp, width, height,
    maxEnergy: 100,
    isCharging, chargeTime, energy
  };

  return {
    updatedAi,
    updatedAIState,
    shouldAttack,
    attackTargetX,
    attackTargetY,
    newPowerUpsToSpawn
  };
};

export const checkAIPowerUpCollision = (
  aiCharacter: Character,
  powerUps: PowerUp[]
): number[] => {
  const collectedIds: number[] = [];
  const aiCx = aiCharacter.x + aiCharacter.width / 2;
  const aiCy = aiCharacter.y + aiCharacter.height / 2;
  const aiHalfW = aiCharacter.width / 2;
  const aiHalfH = aiCharacter.height / 2;
  const puRadius = 16;

  for (const pu of powerUps) {
    if (pu.collected) continue;
    const dist = Math.max(
      Math.abs(pu.x - aiCx) - aiHalfW,
      Math.abs(pu.y - aiCy) - aiHalfH
    );
    if (dist < puRadius) {
      collectedIds.push(pu.id);
    }
  }

  return collectedIds;
};

export const rotatePowerUps = (
  powerUps: PowerUp[],
  deltaTime: number
): PowerUp[] => {
  return powerUps.map(pu => ({
    ...pu,
    rotation: pu.rotation + 60 * deltaTime
  }));
};

export const maintainPowerUpCount = (
  currentPowerUps: PowerUp[],
  targetMinCount: number = 3,
  targetMaxCount: number = 5
): PowerUp[] => {
  const activeCount = currentPowerUps.filter(p => !p.collected).length;
  const result = [...currentPowerUps];
  
  while (activeCount < targetMinCount && result.filter(p => !p.collected).length < targetMinCount) {
    result.push(createPowerUp());
  }
  
  return result;
};

export const applyBuffToCharacter = (
  entity: EntityType,
  powerUp: PowerUp
): Buff => {
  let buffIdCounter = 5000;
  return {
    id: ++buffIdCounter,
    type: powerUp.type,
    entity,
    duration: 5,
    maxDuration: 5,
    color: powerUp.color
  };
};

export const generateInitialPowerUps = (): PowerUp[] => {
  return spawnInitialPowerUps(3);
};

export interface ComboState {
  combo: number;
  comboStartTime: number;
  comboResetTime: number;
}

export const updateComboSystem = (
  state: ComboState,
  gameTime: number,
  hitsThisFrame: number
): ComboState => {
  if (hitsThisFrame > 0) {
    return {
      ...state,
      combo: state.combo + hitsThisFrame,
      comboStartTime: gameTime
    };
  }
  if (state.combo > 0 && gameTime - state.comboStartTime > state.comboResetTime) {
    return {
      ...state,
      combo: 0,
      comboStartTime: -999
    };
  }
  return state;
};

export interface BuffPulseState {
  pulsePhase: number;
}

export const updateBuffPulseState = (
  state: BuffPulseState,
  deltaTime: number,
  frequency: number = 2
): BuffPulseState => {
  return {
    pulsePhase: state.pulsePhase + deltaTime * frequency * Math.PI * 2
  };
};

export const getBuffPulseAlpha = (pulsePhase: number): number => {
  return 0.5 + 0.5 * Math.sin(pulsePhase);
};

export const updateBuffsDurations = (
  buffs: Buff[],
  deltaTime: number
): { activeBuffs: Buff[]; removedIds: number[] } => {
  const removedIds: number[] = [];
  const activeBuffs: Buff[] = [];
  
  for (const b of buffs) {
    const newDuration = b.duration - deltaTime;
    if (newDuration <= 0) {
      removedIds.push(b.id);
    } else {
      activeBuffs.push({ ...b, duration: newDuration });
    }
  }
  
  return { activeBuffs, removedIds };
};
