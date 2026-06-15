export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  isGround: boolean;
}

export interface Spike {
  x: number;
  y: number;
  size: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
  phase: number;
}

export interface Portal {
  x: number;
  y: number;
  radius: number;
}

export interface LevelData {
  width: number;
  height: number;
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  portal: Portal;
  seed: number;
}

const LEVEL_WIDTH = 2000;
const LEVEL_HEIGHT = 600;
const GROUND_HEIGHT_BASE = 80;
const PLATFORM_THICKNESS = 20;
const SPIKE_SIZE = 24;
const COIN_SIZE = 20;
const PORTAL_RADIUS = 40;
const SPIKE_MIN_SPACING = 200;

const PLAYER_SPEED = 250;
const JUMP_VELOCITY = 400;
const GRAVITY = 800;
const SAFETY_MARGIN = 0.85;
const SAFETY_HEIGHT = 8;

interface JumpPhysicsConfig {
  speed: number;
  jumpVelocity: number;
  gravity: number;
}

const DEFAULT_PHYSICS: JumpPhysicsConfig = {
  speed: PLAYER_SPEED,
  jumpVelocity: JUMP_VELOCITY,
  gravity: GRAVITY,
};

function canReachPlatform(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  config: JumpPhysicsConfig = DEFAULT_PHYSICS
): boolean {
  const { speed, jumpVelocity, gravity } = config;

  const dx = toX - fromX;
  if (dx <= 0) return false;

  const maxTotalTime = (2 * jumpVelocity) / gravity;
  const timeAtDistance = dx / speed;

  if (timeAtDistance > maxTotalTime * SAFETY_MARGIN) {
    return false;
  }

  const dy = toY - fromY;
  const maxHeight = (jumpVelocity * jumpVelocity) / (2 * gravity);
  if (dy > maxHeight * SAFETY_MARGIN) {
    return false;
  }

  const heightAtTime = jumpVelocity * timeAtDistance - 0.5 * gravity * timeAtDistance * timeAtDistance;
  return heightAtTime >= dy + SAFETY_HEIGHT;
}

function maxHorizontalDistanceForHeight(
  heightDiff: number,
  config: JumpPhysicsConfig = DEFAULT_PHYSICS
): number {
  const { speed, jumpVelocity, gravity } = config;

  if (heightDiff > 0) {
    const maxHeight = (jumpVelocity * jumpVelocity) / (2 * gravity);
    if (heightDiff > maxHeight * SAFETY_MARGIN) return 0;

    const discriminant = jumpVelocity * jumpVelocity - 2 * gravity * heightDiff;
    if (discriminant < 0) return 0;

    const time = (jumpVelocity - Math.sqrt(discriminant)) / gravity;
    return speed * time * SAFETY_MARGIN;
  } else {
    const fallHeight = -heightDiff;
    const timeUp = jumpVelocity / gravity;
    const maxHeight = (jumpVelocity * jumpVelocity) / (2 * gravity);
    const totalHeight = maxHeight + fallHeight;
    const timeDown = Math.sqrt((2 * totalHeight) / gravity);
    const totalTime = timeUp + timeDown;
    return speed * totalTime * SAFETY_MARGIN;
  }
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

export class LevelGenerator {
  private rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  generate(): LevelData {
    const platforms: Platform[] = [];
    const spikes: Spike[] = [];
    const coins: Coin[] = [];

    let lastSpikeX = -SPIKE_MIN_SPACING * 2;

    const groundY = LEVEL_HEIGHT - GROUND_HEIGHT_BASE;

    let currentX = 0;
    let currentGroundHeight = GROUND_HEIGHT_BASE;
    let currentY = groundY;

    while (currentX < LEVEL_WIDTH) {
      const segmentWidth = this.rng.nextInt(120, 280);
      const endX = Math.min(currentX + segmentWidth, LEVEL_WIDTH);
      const actualWidth = endX - currentX;

      const newGround: Platform = {
        x: currentX,
        y: currentY,
        width: actualWidth,
        height: currentGroundHeight,
        isGround: true,
      };
      platforms.push(newGround);

      currentX = endX;

      if (currentX >= LEVEL_WIDTH - 200) break;

      const gapWidth = this.rng.nextInt(70, 160);

      const heightChange = this.rng.nextInt(-50, 60);
      const newGroundHeight = Math.max(50, Math.min(150, GROUND_HEIGHT_BASE + heightChange));
      const newY = LEVEL_HEIGHT - newGroundHeight;

      const fromJumpX = newGround.x + newGround.width - 10;
      const fromJumpY = newGround.y;
      const toJumpX = currentX + gapWidth + 10;
      const toJumpY = newY;

      const reachable = canReachPlatform(fromJumpX, fromJumpY, toJumpX, toJumpY);

      let actualGap = gapWidth;
      if (!reachable) {
        const heightDiff = currentGroundHeight - newGroundHeight;
        const maxDist = maxHorizontalDistanceForHeight(heightDiff);
        actualGap = Math.max(60, Math.floor(maxDist * 0.75));
      }

      if (actualGap < 50) {
        actualGap = 0;
      }

      if (actualGap > 0 && this.rng.next() > 0.35) {
        const spikeCount = Math.min(1, Math.floor(actualGap / 120));
        for (let i = 0; i < spikeCount; i++) {
          const spikeX = currentX + this.rng.nextFloat(20, actualGap - 20);
          if (spikeX - lastSpikeX >= SPIKE_MIN_SPACING) {
            const spikeY = LEVEL_HEIGHT - SPIKE_SIZE;
            spikes.push({ x: spikeX, y: spikeY, size: SPIKE_SIZE });
            lastSpikeX = spikeX;
          }
        }
      }

      currentX += actualGap;
      currentGroundHeight = newGroundHeight;
      currentY = newY;
    }

    this.generateFloatingPlatforms(platforms, spikes, lastSpikeX);
    this.generateCoins(coins, platforms);

    const portal: Portal = {
      x: LEVEL_WIDTH - 80,
      y: LEVEL_HEIGHT - GROUND_HEIGHT_BASE - PORTAL_RADIUS * 2 + 10,
      radius: PORTAL_RADIUS,
    };

    return {
      width: LEVEL_WIDTH,
      height: LEVEL_HEIGHT,
      platforms,
      spikes,
      coins,
      portal,
      seed: this.rng['seed'] as number,
    };
  }

  private generateFloatingPlatforms(
    platforms: Platform[],
    spikes: Spike[],
    initialLastSpikeX: number
  ): void {
    let lastSpikeX = initialLastSpikeX;
    const minY = 150;
    const maxY = LEVEL_HEIGHT - 180;
    let lastPlatformEnd = 0;

    for (let x = 250; x < LEVEL_WIDTH - 250; x += this.rng.nextInt(220, 400)) {
      if (x - lastPlatformEnd < 180) continue;

      const width = this.rng.nextInt(70, 140);
      const y = this.rng.nextInt(minY, maxY);

      let reachable = false;

      for (const p of platforms) {
        if (p.isGround) {
          const fromX = p.x + p.width / 2;
          const fromY = p.y;
          const toX = x + width / 2;
          const toY = y;
          if (canReachPlatform(fromX, fromY, toX, toY)) {
            reachable = true;
            break;
          }
        } else {
          const fromX = p.x + p.width;
          const fromY = p.y;
          const toX = x;
          const toY = y;
          if (canReachPlatform(fromX, fromY, toX, toY)) {
            reachable = true;
            break;
          }
        }
      }

      if (!reachable) continue;

      platforms.push({
        x,
        y,
        width,
        height: PLATFORM_THICKNESS,
        isGround: false,
      });

      lastPlatformEnd = x + width;

      if (this.rng.next() > 0.5) {
        const spikeX = x + width / 2 - SPIKE_SIZE / 2;
        if (spikeX - lastSpikeX >= SPIKE_MIN_SPACING) {
          spikes.push({ x: spikeX, y: y + PLATFORM_THICKNESS, size: SPIKE_SIZE });
          lastSpikeX = spikeX;
        }
      }
    }
  }

  private generateCoins(coins: Coin[], platforms: Platform[]): void {
    const interval = 500;
    for (let x = 250; x < LEVEL_WIDTH - 100; x += interval) {
      let coinY = LEVEL_HEIGHT - GROUND_HEIGHT_BASE - 50;
      for (const p of platforms) {
        if (!p.isGround && x >= p.x && x <= p.x + p.width) {
          coinY = p.y - 40;
          break;
        }
      }
      coins.push({
        x,
        y: coinY,
        collected: false,
        phase: this.rng.next() * Math.PI * 2,
      });
    }
  }
}
