import {
  Creature,
  ColorBlob,
  SplashParticle,
  TrailParticle,
  GameState,
  InputState,
  CreatureParticle,
  Vec2,
} from './types';
import {
  BASE_COLORS,
  clamp,
  randomRange,
  randomInt,
  hueDistance,
  weightedAverageHue,
  distance,
  normalize,
  getComplementaryHue,
  getWarmCreatureHue,
  getCoolCreatureHue,
} from './utils';

const MAX_SPLASH_PARTICLES = 500;
const POOL_SIZE = 500;

class ParticlePool {
  private pool: SplashParticle[] = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 0,
        hue: 0,
        saturation: 0,
        lightness: 0,
        lifetime: 0,
        maxLifetime: 0,
        active: false,
      });
    }
  }

  acquire(): SplashParticle | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        return p;
      }
    }
    return null;
  }

  release(p: SplashParticle): void {
    p.active = false;
  }

  getActive(): SplashParticle[] {
    return this.pool.filter((p) => p.active);
  }

  getAll(): SplashParticle[] {
    return this.pool;
  }
}

export interface GameData {
  creatures: { warm: Creature; cool: Creature };
  blobs: ColorBlob[];
  splashParticles: ParticlePool;
  gameState: GameState;
  arena: { width: number; height: number; left: number; top: number; right: number; bottom: number };
  blobIdCounter: number;
  collisionCooldown: number;
}

let gameData: GameData | null = null;
let lastTime = 0;
let currentTime = 0;
let deltaTime = 0;

const createCreatureParticles = (count: number, baseRadius: number): CreatureParticle[] => {
  const particles: CreatureParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(baseRadius * 0.3, baseRadius * 1.2);
    particles.push({
      offset: {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      },
      radius: randomRange(3, 8),
      angle,
      distance: dist,
    });
  }
  return particles;
};

const createCreature = (
  id: 'warm' | 'cool',
  x: number,
  y: number,
  initialHue: number
): Creature => {
  const baseRadius = 20;
  const particleCount = randomInt(50, 80);
  return {
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    radius: baseRadius,
    baseRadius,
    maxSpeed: 250,
    currentSpeed: 0,
    accelerationTime: 0,
    isAccelerating: false,
    colorPool: [initialHue],
    currentHue: initialHue,
    currentSaturation: 80,
    currentLightness: 55,
    particles: createCreatureParticles(particleCount, baseRadius),
    particleRotation: 0,
    pulseAlpha: 0,
    pulseColor: null,
    pulseTime: 0,
    eatenCount: 0,
    trail: [],
    input: { up: false, down: false, left: false, right: false },
  };
};

const generateBlobs = (
  count: number,
  arena: { width: number; height: number; left: number; top: number; right: number; bottom: number },
  startId: number
): { blobs: ColorBlob[]; nextId: number } => {
  const blobs: ColorBlob[] = [];
  let id = startId;
  const colorCount = BASE_COLORS.length;
  const blobsPerColor = Math.floor(count / colorCount);
  const extraBlobs = count % colorCount;

  const colorDistribution: number[] = [];
  for (let i = 0; i < colorCount; i++) {
    const num = blobsPerColor + (i < extraBlobs ? 1 : 0);
    for (let j = 0; j < num; j++) {
      colorDistribution.push(BASE_COLORS[i].hue);
    }
  }

  for (let i = colorDistribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colorDistribution[i], colorDistribution[j]] = [colorDistribution[j], colorDistribution[i]];
  }

  for (const hue of colorDistribution) {
    const radius = randomRange(15, 30);
    let x = 0;
    let y = 0;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      x = randomRange(arena.left + radius + 20, arena.right - radius - 20);
      y = randomRange(arena.top + radius + 20, arena.bottom - radius - 20);
      attempts++;

      let tooClose = false;
      for (const blob of blobs) {
        if (distance(x, y, blob.position.x, blob.position.y) < radius + blob.radius + 10) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) break;
    } while (attempts < maxAttempts);

    blobs.push({
      id: id++,
      position: { x, y },
      radius,
      hue,
      saturation: 85,
      lightness: 50,
      isFusion: false,
      lifetime: -1,
      maxLifetime: -1,
    });
  }

  return { blobs, nextId: id };
};

export const initGame = (canvasWidth: number, canvasHeight: number): GameData => {
  const arenaPadding = 60;
  const arena = {
    left: arenaPadding,
    top: arenaPadding,
    right: canvasWidth - arenaPadding,
    bottom: canvasHeight - arenaPadding,
    width: canvasWidth - arenaPadding * 2,
    height: canvasHeight - arenaPadding * 2,
  };

  const warmStartX = arena.left + 80;
  const warmStartY = arena.bottom - 80;
  const coolStartX = arena.right - 80;
  const coolStartY = arena.top + 80;

  const warmCreature = createCreature('warm', warmStartX, warmStartY, getWarmCreatureHue());
  const coolCreature = createCreature('cool', coolStartX, coolStartY, getCoolCreatureHue());

  const blobCount = randomInt(30, 40);
  const { blobs, nextId } = generateBlobs(blobCount, arena, 0);

  gameData = {
    creatures: { warm: warmCreature, cool: coolCreature },
    blobs,
    splashParticles: new ParticlePool(),
    gameState: {
      status: 'start',
      winner: null,
      totalBlobs: blobCount,
      warmEaten: 0,
      coolEaten: 0,
      transitionAlpha: 0,
      transitionTarget: null,
      winRotation: 0,
    },
    arena,
    blobIdCounter: nextId,
    collisionCooldown: 0,
  };

  lastTime = performance.now();
  return gameData;
};

export const resetGame = (): void => {
  if (!gameData) return;

  const arena = gameData.arena;
  const warmStartX = arena.left + 80;
  const warmStartY = arena.bottom - 80;
  const coolStartX = arena.right - 80;
  const coolStartY = arena.top + 80;

  gameData.creatures.warm = createCreature('warm', warmStartX, warmStartY, getWarmCreatureHue());
  gameData.creatures.cool = createCreature('cool', coolStartX, coolStartY, getCoolCreatureHue());

  const blobCount = randomInt(30, 40);
  const { blobs, nextId } = generateBlobs(blobCount, arena, 0);

  gameData.blobs = blobs;
  gameData.blobIdCounter = nextId;
  gameData.collisionCooldown = 0;
  gameData.gameState = {
    status: 'playing',
    winner: null,
    totalBlobs: blobCount,
    warmEaten: 0,
    coolEaten: 0,
    transitionAlpha: 0,
    transitionTarget: null,
    winRotation: 0,
  };
};

const spawnSplashParticles = (
  x: number,
  y: number,
  hue: number,
  saturation: number,
  lightness: number,
  count: number
): void => {
  if (!gameData) return;
  const pool = gameData.splashParticles;

  for (let i = 0; i < count; i++) {
    const p = pool.acquire();
    if (!p) break;

    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(30, 60);

    p.position.x = x;
    p.position.y = y;
    p.velocity.x = Math.cos(angle) * speed;
    p.velocity.y = Math.sin(angle) * speed;
    p.radius = randomRange(2, 4);
    p.hue = hue;
    p.saturation = saturation;
    p.lightness = lightness;
    p.maxLifetime = randomRange(0.5, 1);
    p.lifetime = p.maxLifetime;
  }
};

const addTrailParticle = (creature: Creature): void => {
  const compHue = getComplementaryHue(creature.currentHue);
  const startRadius = Math.max(3, creature.radius * 0.15);
  creature.trail.push({
    position: { x: creature.position.x, y: creature.position.y },
    radius: startRadius,
    alpha: 0.6,
    hue: compHue,
    lifetime: 10,
    maxLifetime: 10,
  });

  while (creature.trail.length > 10) {
    creature.trail.shift();
  }
};

const updateCreature = (creature: Creature, input: { up: boolean; down: boolean; left: boolean; right: boolean }, dt: number): void => {
  if (!gameData) return;
  const arena = gameData.arena;

  creature.input = { ...input };

  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  const isMoving = dx !== 0 || dy !== 0;
  creature.isAccelerating = isMoving;

  if (isMoving) {
    creature.accelerationTime = Math.min(creature.accelerationTime + dt, 0.5);
  } else {
    creature.accelerationTime = Math.max(creature.accelerationTime - dt * 2, 0);
  }

  const accelProgress = creature.accelerationTime / 0.5;
  const sizePenalty = 1 - Math.min((creature.radius - creature.baseRadius) / 100, 0.6);
  creature.currentSpeed = creature.maxSpeed * accelProgress * sizePenalty;

  if (isMoving) {
    const dir = normalize(dx, dy);
    creature.velocity.x = dir.x * creature.currentSpeed;
    creature.velocity.y = dir.y * creature.currentSpeed;
  } else {
    creature.velocity.x *= 0.88;
    creature.velocity.y *= 0.88;
  }

  creature.position.x += creature.velocity.x * dt;
  creature.position.y += creature.velocity.y * dt;

  if (creature.position.x - creature.radius < arena.left) {
    creature.position.x = arena.left + creature.radius;
    creature.velocity.x = -creature.velocity.x * 0.5;
  }
  if (creature.position.x + creature.radius > arena.right) {
    creature.position.x = arena.right - creature.radius;
    creature.velocity.x = -creature.velocity.x * 0.5;
  }
  if (creature.position.y - creature.radius < arena.top) {
    creature.position.y = arena.top + creature.radius;
    creature.velocity.y = -creature.velocity.y * 0.5;
  }
  if (creature.position.y + creature.radius > arena.bottom) {
    creature.position.y = arena.bottom - creature.radius;
    creature.velocity.y = -creature.velocity.y * 0.5;
  }

  creature.particleRotation += 0.02;
  const cosR = Math.cos(creature.particleRotation);
  const sinR = Math.sin(creature.particleRotation);
  for (const p of creature.particles) {
    const newAngle = p.angle + creature.particleRotation * 0.01;
    p.offset.x = Math.cos(newAngle) * p.distance;
    p.offset.y = Math.sin(newAngle) * p.distance;
  }

  if (creature.pulseTime > 0) {
    creature.pulseTime -= dt;
    const progress = 1 - creature.pulseTime / 0.3;
    creature.pulseAlpha = Math.max(0, 1 - progress * 0.8);
  } else {
    creature.pulseAlpha = 0;
    creature.pulseColor = null;
  }

  if (isMoving || creature.velocity.x !== 0 || creature.velocity.y !== 0) {
    if (Math.random() < 0.3) {
      addTrailParticle(creature);
    }
  }

  for (let i = creature.trail.length - 1; i >= 0; i--) {
    const t = creature.trail[i];
    t.lifetime -= dt * 30;
    const lifeProgress = t.lifetime / t.maxLifetime;
    t.alpha = 0.6 * lifeProgress;
    t.radius = Math.max(0, 3 * lifeProgress);
    if (t.lifetime <= 0 || t.radius <= 0) {
      creature.trail.splice(i, 1);
    }
  }

  creature.currentHue = weightedAverageHue(creature.colorPool);
};

const tryEatBlobs = (creature: Creature): void => {
  if (!gameData) return;

  for (let i = gameData.blobs.length - 1; i >= 0; i--) {
    const blob = gameData.blobs[i];
    const dist = distance(creature.position.x, creature.position.y, blob.position.x, blob.position.y);

    if (dist < creature.radius + blob.radius * 0.5) {
      const hDist = hueDistance(creature.currentHue, blob.hue);
      if (hDist <= 30) {
        creature.colorPool.push(blob.hue);
        if (creature.colorPool.length > 5) {
          creature.colorPool.shift();
        }

        creature.radius += 2;
        creature.eatenCount++;

        creature.pulseAlpha = 1;
        creature.pulseTime = 0.3;
        creature.pulseColor = {
          hue: blob.hue,
          saturation: blob.saturation,
          lightness: blob.lightness,
        };

        spawnSplashParticles(
          blob.position.x,
          blob.position.y,
          blob.hue,
          blob.saturation,
          blob.lightness,
          randomInt(5, 8)
        );

        if (creature.id === 'warm') {
          gameData.gameState.warmEaten++;
        } else {
          gameData.gameState.coolEaten++;
        }

        gameData.blobs.splice(i, 1);
        checkWinCondition();
      }
    }
  }
};

const checkWinCondition = (): void => {
  if (!gameData) return;
  const total = gameData.gameState.totalBlobs;
  const threshold = Math.ceil(total * 0.7);
  const warmWon = gameData.gameState.warmEaten >= threshold;
  const coolWon = gameData.gameState.coolEaten >= threshold;

  if (warmWon || coolWon) {
    gameData.gameState.winner = warmWon ? 'warm' : 'cool';
    gameData.gameState.transitionTarget = 'ended';
    gameData.gameState.transitionAlpha = 0;
  }
};

const handleCreatureCollision = (): void => {
  if (!gameData) return;
  if (gameData.collisionCooldown > 0) {
    gameData.collisionCooldown -= deltaTime;
    return;
  }

  const warm = gameData.creatures.warm;
  const cool = gameData.creatures.cool;

  const dist = distance(warm.position.x, warm.position.y, cool.position.x, cool.position.y);
  const minDist = warm.radius + cool.radius;

  if (dist < minDist) {
    const nx = (cool.position.x - warm.position.x) / dist;
    const ny = (cool.position.y - warm.position.y) / dist;

    const warmSpeed = Math.sqrt(warm.velocity.x ** 2 + warm.velocity.y ** 2);
    const coolSpeed = Math.sqrt(cool.velocity.x ** 2 + cool.velocity.y ** 2);

    warm.velocity.x = -nx * Math.max(warmSpeed * 1.5, 100);
    warm.velocity.y = -ny * Math.max(warmSpeed * 1.5, 100);
    cool.velocity.x = nx * Math.max(coolSpeed * 1.5, 100);
    cool.velocity.y = ny * Math.max(coolSpeed * 1.5, 100);

    const overlap = minDist - dist;
    warm.position.x -= nx * overlap * 0.5;
    warm.position.y -= ny * overlap * 0.5;
    cool.position.x += nx * overlap * 0.5;
    cool.position.y += ny * overlap * 0.5;

    const contactX = (warm.position.x + cool.position.x) / 2;
    const contactY = (warm.position.y + cool.position.y) / 2;

    const avgHue = (warm.currentHue + cool.currentHue) / 2;
    const avgSat = (warm.currentSaturation + cool.currentSaturation) / 2;
    const avgLight = (warm.currentLightness + cool.currentLightness) / 2;

    gameData.blobs.push({
      id: gameData.blobIdCounter++,
      position: { x: contactX, y: contactY },
      radius: 20,
      hue: avgHue % 360,
      saturation: avgSat,
      lightness: avgLight,
      isFusion: true,
      lifetime: 8,
      maxLifetime: 8,
    });

    spawnSplashParticles(contactX, contactY, avgHue % 360, avgSat, avgLight, 12);

    gameData.collisionCooldown = 0.3;
  }
};

const updateSplashParticles = (dt: number): void => {
  if (!gameData) return;
  const pool = gameData.splashParticles;

  for (const p of pool.getAll()) {
    if (!p.active) continue;

    p.lifetime -= dt;
    if (p.lifetime <= 0) {
      pool.release(p);
      continue;
    }

    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.velocity.x *= 0.96;
    p.velocity.y *= 0.96;
  }
};

const updateFusionBlobs = (dt: number): void => {
  if (!gameData) return;

  for (let i = gameData.blobs.length - 1; i >= 0; i--) {
    const blob = gameData.blobs[i];
    if (blob.isFusion && blob.lifetime > 0) {
      blob.lifetime -= dt;
      const lifeProgress = blob.lifetime / blob.maxLifetime;
      blob.saturation = 85 * lifeProgress;
      if (blob.lifetime <= 0) {
        gameData.blobs.splice(i, 1);
      }
    }
  }
};

const updateTransition = (dt: number): void => {
  if (!gameData) return;
  const gs = gameData.gameState;

  if (gs.transitionTarget === 'playing' && gs.status === 'start') {
    gs.transitionAlpha += dt * 2;
    if (gs.transitionAlpha >= 1) {
      gs.transitionAlpha = 1;
      gs.status = 'playing';
      gs.transitionTarget = null;
    }
  } else if (gs.transitionTarget === 'ended' && gs.status !== 'ended') {
    gs.transitionAlpha += dt * 2;
    if (gs.transitionAlpha >= 1) {
      gs.transitionAlpha = 1;
      gs.status = 'ended';
    }
  }

  if (gs.status === 'ended') {
    gs.winRotation += dt * 2;
  }
};

export const handleInput = (input: InputState): void => {
  if (!gameData) return;

  if (input.space) {
    const gs = gameData.gameState;
    if (gs.status === 'start' && gs.transitionTarget !== 'playing') {
      gs.transitionTarget = 'playing';
      gs.transitionAlpha = 0;
    } else if (gs.status === 'ended') {
      resetGame();
    }
  }
};

export const updateGame = (time: number): void => {
  if (!gameData) return;

  currentTime = time;
  deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  const gs = gameData.gameState;

  if (gs.status === 'playing') {
    updateCreature(gameData.creatures.warm, gameData.creatures.warm.input, deltaTime);
    updateCreature(gameData.creatures.cool, gameData.creatures.cool.input, deltaTime);

    tryEatBlobs(gameData.creatures.warm);
    tryEatBlobs(gameData.creatures.cool);

    handleCreatureCollision();

    updateSplashParticles(deltaTime);
    updateFusionBlobs(deltaTime);
  }

  updateTransition(deltaTime);
};

export const getGameData = (): GameData | null => gameData;
