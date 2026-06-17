import type { Character, EnergyBall, PowerUp, Knockback, Buff } from './store';
import type { EntityType } from './store';
import type { Particle } from './utils';
import { clamp, createExplosionParticles } from './utils';

export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 400;
export const WALL_THICKNESS = 20;
export const GROUND_Y = ARENA_HEIGHT - 20;
export const GRAVITY = 1200;
export const JUMP_FORCE = -500;
export const MOVE_SPEED = 200;
export const ENERGY_BALL_SPEED = 300;
export const ENERGY_BALL_RADIUS = 20;
export const CHARGE_THRESHOLD = 0.5;
export const MAX_AURA_DIAMETER = 120;
export const MIN_AURA_DIAMETER = 40;

export interface PhysicsUpdateInput {
  player: Character;
  ai: Character;
  energyBalls: EnergyBall[];
  particles: Particle[];
  powerUps: PowerUp[];
  buffs: Buff[];
  knockbacks: Knockback[];
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
  arenaX: number;
  arenaY: number;
  deltaTime: number;
  gameTime: number;
  combo: number;
  lastHitTime: number;
  comboResetTime: number;
}

export interface PhysicsUpdateOutput {
  player: Character;
  ai: Character;
  energyBalls: EnergyBall[];
  particles: Particle[];
  powerUps: PowerUp[];
  buffs: Buff[];
  knockbacks: Knockback[];
  combo: number;
  lastHitTime: number;
  damageEvents: DamageEvent[];
  collectedPowerUpIds: number[];
  removedBuffIds: number[];
  spawnedParticles: Particle[];
}

export interface DamageEvent {
  target: EntityType;
  damage: number;
  knockbackDirX: number;
  knockbackDirY: number;
  owner: EntityType;
}

export const calculateProjectileDirection = (
  startX: number,
  startY: number,
  targetX: number,
  targetY: number
): { vx: number; vy: number } => {
  const dx = targetX - startX;
  const dy = targetY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) {
    return { vx: 0, vy: 0 };
  }
  return {
    vx: (dx / dist) * ENERGY_BALL_SPEED,
    vy: (dy / dist) * ENERGY_BALL_SPEED
  };
};

export const createEnergyBall = (
  id: number,
  owner: EntityType,
  ownerCharacter: Character,
  targetX: number,
  targetY: number,
  damageMultiplier: number = 1
): EnergyBall => {
  const startX = ownerCharacter.x + ownerCharacter.width / 2;
  const startY = ownerCharacter.y + ownerCharacter.height / 2;
  const { vx, vy } = calculateProjectileDirection(startX, startY, targetX, targetY);

  return {
    id,
    x: startX,
    y: startY,
    vx,
    vy,
    owner,
    damage: 10 * damageMultiplier,
    radius: ENERGY_BALL_RADIUS
  };
};

export const getAuraProperties = (chargeTime: number): { diameter: number; alpha: number } => {
  const t = Math.min(1, chargeTime / 2);
  const chargeMs = chargeTime * 1000;
  return {
    diameter: MIN_AURA_DIAMETER + (MAX_AURA_DIAMETER - MIN_AURA_DIAMETER) * t,
    alpha: Math.min(0.3 + (chargeMs / 500) * 0.5, 0.8)
  };
};

export const updateEnergyBalls = (balls: EnergyBall[], deltaTime: number): EnergyBall[] => {
  return balls
    .map(ball => ({
      ...ball,
      x: ball.x + ball.vx * deltaTime,
      y: ball.y + ball.vy * deltaTime
    }))
    .filter(ball =>
      ball.x > -50 && ball.x < ARENA_WIDTH + 50 &&
      ball.y > -50 && ball.y < ARENA_HEIGHT + 50
    );
};

export const checkCircleRectCollision = (
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean => {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
};

export const checkCharacterPowerUpCollision = (
  character: Character,
  powerUp: PowerUp
): boolean => {
  const charCx = character.x + character.width / 2;
  const charCy = character.y + character.height / 2;
  const charHalfW = character.width / 2;
  const charHalfH = character.height / 2;
  const puRadius = 16;

  const dist = Math.max(
    Math.abs(powerUp.x - charCx) - charHalfW,
    Math.abs(powerUp.y - charCy) - charHalfH
  );
  return dist < puRadius;
};

export const updateKnockbacks = (
  knockbacks: Knockback[],
  deltaTime: number
): {
  updatedKnockbacks: Knockback[];
  playerPos: { x: number; y: number } | null;
  aiPos: { x: number; y: number } | null;
} => {
  const updated: Knockback[] = [];
  let playerPos: { x: number; y: number } | null = null;
  let aiPos: { x: number; y: number } | null = null;

  for (const kb of knockbacks) {
    const newElapsed = kb.elapsed + deltaTime;
    if (newElapsed >= kb.duration) {
      const pos = { x: kb.targetX, y: kb.targetY };
      if (kb.entity === 'player') playerPos = pos;
      else aiPos = pos;
    } else {
      const t = newElapsed / kb.duration;
      const eased = 1 - Math.pow(1 - t, 3);
      const pos = {
        x: kb.startX + (kb.targetX - kb.startX) * eased,
        y: kb.startY + (kb.targetY - kb.startY) * eased
      };
      if (kb.entity === 'player') playerPos = pos;
      else aiPos = pos;
      updated.push({ ...kb, elapsed: newElapsed });
    }
  }

  return { updatedKnockbacks: updated, playerPos, aiPos };
};

export const createKnockback = (
  entity: EntityType,
  currentX: number,
  currentY: number,
  directionX: number,
  directionY: number,
  distance: number = 80,
  duration: number = 0.2
): Knockback => {
  const mag = Math.sqrt(directionX * directionX + directionY * directionY) || 1;
  return {
    entity,
    startX: currentX,
    startY: currentY,
    targetX: currentX + (directionX / mag) * distance,
    targetY: currentY + Math.min(0, directionY / mag) * distance * 0.5,
    duration,
    elapsed: 0
  };
};

export const updatePlayerMovement = (
  player: Character,
  keys: Record<string, boolean>,
  deltaTime: number,
  speedMultiplier: number = 1
): Character => {
  let { x, y, vx, vy, onGround, facing, chargeTime, energy, isCharging } = player;

  vx = 0;
  const speed = MOVE_SPEED * speedMultiplier;

  if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
    vx = -speed;
    facing = -1;
  }
  if (keys['d'] || keys['D'] || keys['ArrowRight']) {
    vx = speed;
    facing = 1;
  }

  if ((keys['w'] || keys['W'] || keys['ArrowUp'] || keys[' ']) && onGround) {
    vy = JUMP_FORCE;
    onGround = false;
  }

  if (isCharging) {
    chargeTime += deltaTime;
    energy = Math.min(100, (chargeTime / 2) * 100);
  } else {
    energy = 0;
  }

  vy += GRAVITY * deltaTime;
  x += vx * deltaTime;
  y += vy * deltaTime;

  if (y + player.height >= GROUND_Y) {
    y = GROUND_Y - player.height;
    vy = 0;
    onGround = true;
  }

  const leftBound = WALL_THICKNESS;
  const rightBound = ARENA_WIDTH - WALL_THICKNESS;
  x = clamp(x, leftBound, rightBound - player.width);

  return {
    ...player,
    x, y, vx, vy, onGround, facing,
    chargeTime, energy
  };
};

export const detectEnergyBallHits = (
  balls: EnergyBall[],
  player: Character,
  ai: Character
): {
  remainingBalls: EnergyBall[];
  damageEvents: DamageEvent[];
  newParticles: Particle[];
} => {
  const remainingBalls: EnergyBall[] = [];
  const damageEvents: DamageEvent[] = [];
  let allParticles: Particle[] = [];
  let particleId = Date.now();

  for (const ball of balls) {
    let hit = false;
    let target: Character | null = null;
    let targetType: EntityType | null = null;

    if (ball.owner !== 'player' && player.hp > 0) {
      if (checkCircleRectCollision(
        ball.x, ball.y, ball.radius,
        player.x, player.y, player.width, player.height
      )) {
        target = player;
        targetType = 'player';
        hit = true;
      }
    }

    if (!hit && ball.owner !== 'ai' && ai.hp > 0) {
      if (checkCircleRectCollision(
        ball.x, ball.y, ball.radius,
        ai.x, ai.y, ai.width, ai.height
      )) {
        target = ai;
        targetType = 'ai';
        hit = true;
      }
    }

    if (hit && target && targetType) {
      const targetCx = target.x + target.width / 2;
      const targetCy = target.y + target.height / 2;
      const dx = ball.x - targetCx;
      const dy = ball.y - targetCy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      damageEvents.push({
        target: targetType,
        damage: ball.damage,
        knockbackDirX: -dx / dist,
        knockbackDirY: -dy / dist,
        owner: ball.owner
      });

      const particles = createExplosionParticles(ball.x, ball.y, 6);
      particles.forEach(p => {
        p.id = ++particleId;
      });
      allParticles = [...allParticles, ...particles];
    } else {
      remainingBalls.push(ball);
    }
  }

  return { remainingBalls, damageEvents, newParticles: allParticles };
};

export const collectPowerUps = (
  character: Character,
  powerUps: PowerUp[],
  entity: EntityType
): { remainingPowerUps: PowerUp[]; collectedIds: number[] } => {
  const collectedIds: number[] = [];
  const remaining = powerUps.filter(pu => {
    if (pu.collected) return false;
    if (checkCharacterPowerUpCollision(character, pu)) {
      collectedIds.push(pu.id);
      return false;
    }
    return true;
  });
  return { remainingPowerUps: remaining, collectedIds };
};

export const updateComboState = (
  currentCombo: number,
  comboStartTime: number,
  gameTime: number,
  resetThreshold: number,
  hitsThisFrame: number
): { combo: number; comboStartTime: number } => {
  if (hitsThisFrame > 0) {
    return {
      combo: currentCombo + hitsThisFrame,
      comboStartTime: gameTime
    };
  }
  if (currentCombo > 0 && gameTime - comboStartTime > resetThreshold) {
    return { combo: 0, comboStartTime: -999 };
  }
  return { combo: currentCombo, comboStartTime };
};

export const updateBuffs = (buffs: Buff[], deltaTime: number): {
  activeBuffs: Buff[];
  removedIds: number[];
} => {
  const removedIds: number[] = [];
  const active = buffs.filter(b => {
    const newDuration = b.duration - deltaTime;
    if (newDuration <= 0) {
      removedIds.push(b.id);
      return false;
    }
    b.duration = newDuration;
    return true;
  });
  return { activeBuffs: active, removedIds };
};

export const getBuffMultipliers = (
  buffs: Buff[],
  entity: EntityType
): { attack: number; speed: number } => {
  let attack = 1;
  let speed = 1;
  for (const b of buffs) {
    if (b.entity !== entity) continue;
    if (b.type === 'attack') attack = 2;
    if (b.type === 'speed') speed = 1.3;
  }
  return { attack, speed };
};

export const shouldSpawnEnergyBall = (
  isCharging: boolean,
  chargeTime: number,
  wasCharging: boolean
): boolean => {
  return wasCharging && !isCharging && chargeTime >= CHARGE_THRESHOLD;
};

export const clampAiPosition = (x: number, width: number): number => {
  const leftBound = WALL_THICKNESS;
  const rightBound = ARENA_WIDTH - WALL_THICKNESS;
  return clamp(x, leftBound, rightBound - width);
};
