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

const PLAYER_SPEED = 250;
const JUMP_VELOCITY = 400;
const GRAVITY = 800;

const SAFETY_MARGIN = 0.75;

function maxHorizontalDistance(heightDiff: number): number {
  if (heightDiff > 0) {
    const discriminant = JUMP_VELOCITY * JUMP_VELOCITY - 2 * GRAVITY * heightDiff;
    if (discriminant < 0) return 0;
    const time = (JUMP_VELOCITY - Math.sqrt(discriminant)) / GRAVITY;
    return PLAYER_SPEED * time * SAFETY_MARGIN;
  } else {
    const fallHeight = -heightDiff;
    const timeUp = JUMP_VELOCITY / GRAVITY;
    const maxHeight = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
    const totalHeight = maxHeight + fallHeight;
    const timeDown = Math.sqrt((2 * totalHeight) / GRAVITY);
    const totalTime = timeUp + timeDown;
    return PLAYER_SPEED * totalTime * SAFETY_MARGIN;
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

    const groundY = LEVEL_HEIGHT - GROUND_HEIGHT_BASE;

    let currentX = 0;
    let currentGroundHeight = GROUND_HEIGHT_BASE;
    let currentY = groundY;

    while (currentX < LEVEL_WIDTH) {
      const segmentWidth = this.rng.nextInt(100, 300);
      const endX = Math.min(currentX + segmentWidth, LEVEL_WIDTH);
      const actualWidth = endX - currentX;

      platforms.push({
        x: currentX,
        y: currentY,
        width: actualWidth,
        height: currentGroundHeight,
        isGround: true,
      });

      currentX = endX;

      if (currentX >= LEVEL_WIDTH - 200) break;

      const gapWidth = this.rng.nextInt(80, 180);
      const maxJumpDist = maxHorizontalDistance(0);
      const safeGap = Math.min(gapWidth, maxJumpDist * 0.9);

      if (safeGap < 60) {
        currentGroundHeight = GROUND_HEIGHT_BASE;
        currentY = LEVEL_HEIGHT - currentGroundHeight;
        continue;
      }

      const heightChange = this.rng.nextInt(-40, 50);
      const newGroundHeight = Math.max(50, Math.min(150, GROUND_HEIGHT_BASE + heightChange));
      const heightDiff = newGroundHeight - currentGroundHeight;

      const reachableDist = maxHorizontalDistance(Math.abs(heightDiff));
      if (safeGap > reachableDist * 0.85) {
        currentGroundHeight = GROUND_HEIGHT_BASE;
        currentY = LEVEL_HEIGHT - currentGroundHeight;
        continue;
      }

      if (this.rng.next() > 0.4) {
        const spikeCount = Math.min(2, Math.floor(safeGap / 100));
        let lastSpikeX = currentX - 300;

        for (let i = 0; i < spikeCount; i++) {
          const spikeX = currentX + this.rng.nextFloat(20, safeGap - 20);
          if (spikeX - lastSpikeX >= 200) {
            const spikeY = LEVEL_HEIGHT - 24;
            spikes.push({ x: spikeX, y: spikeY, size: SPIKE_SIZE });
            lastSpikeX = spikeX;
          }
        }
      }

      currentX += safeGap;
      currentGroundHeight = newGroundHeight;
      currentY = LEVEL_HEIGHT - currentGroundHeight;
    }

    this.generateFloatingPlatforms(platforms, spikes);
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

  private generateFloatingPlatforms(platforms: Platform[], spikes: Spike[]): void {
    const minY = 150;
    const maxY = LEVEL_HEIGHT - 150;
    let lastPlatformEnd = 0;

    for (let x = 200; x < LEVEL_WIDTH - 200; x += this.rng.nextInt(180, 350)) {
      if (x - lastPlatformEnd < 150) continue;

      const width = this.rng.nextInt(80, 160);
      const y = this.rng.nextInt(minY, maxY);

      let reachable = false;
      for (const p of platforms) {
        if (p.isGround) continue;
        const horizontalGap = Math.abs(p.x + p.width - x);
        const verticalDiff = p.y - y;
        const maxDist = maxHorizontalDistance(Math.abs(verticalDiff));
        if (horizontalGap < maxDist * 0.8) {
          reachable = true;
          break;
        }
      }

      if (!reachable) {
        const groundY = LEVEL_HEIGHT - GROUND_HEIGHT_BASE;
        const verticalDiff = groundY - y;
        const maxDist = maxHorizontalDistance(Math.abs(verticalDiff));
        if (maxDist < 100) continue;
      }

      platforms.push({
        x,
        y,
        width,
        height: PLATFORM_THICKNESS,
        isGround: false,
      });

      lastPlatformEnd = x + width;

      if (this.rng.next() > 0.5) {
        const belowGap = width;
        if (belowGap > 60) {
          const spikeX = x + width / 2 - SPIKE_SIZE / 2;
          let lastSpikeX = -300;
          for (const s of spikes) {
            if (Math.abs(s.x - spikeX) < 200) {
              lastSpikeX = s.x;
              break;
            }
          }
          if (Math.abs(spikeX - lastSpikeX) >= 200) {
            spikes.push({ x: spikeX, y: y + PLATFORM_THICKNESS, size: SPIKE_SIZE });
          }
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
