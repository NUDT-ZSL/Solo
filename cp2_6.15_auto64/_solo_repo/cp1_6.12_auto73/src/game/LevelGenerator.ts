export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'floating';
}

export interface Trap {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
  radius: number;
}

export interface PlayerPhysicsInput {
  maxJumpHeight: number;
  horizontalSpeed: number;
  gravity: number;
  jumpVelocity: number;
}

export class LevelGenerator {
  private platforms: Platform[] = [];
  private traps: Trap[] = [];
  private coins: Coin[] = [];
  private generatedUntilX: number = 0;
  private groundY: number;
  private screenHeight: number;
  private physics: PlayerPhysicsInput;
  private chunkSize: number = 800;
  private seed: number = 12345;

  constructor(screenHeight: number, physics: PlayerPhysicsInput, groundY?: number) {
    this.screenHeight = screenHeight;
    this.groundY = groundY ?? screenHeight - 80;
    this.physics = { ...physics };
  }

  private rng(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  reset(): void {
    this.platforms = [];
    this.traps = [];
    this.coins = [];
    this.generatedUntilX = 0;
    this.seed = 12345;
    this.generateInitialChunk();
  }

  private computeMaxHorizontalReach(heightDiff: number): number {
    const { jumpVelocity, gravity, horizontalSpeed } = this.physics;
    const v0y = -jumpVelocity;
    const g = gravity;
    const tUp = v0y / g;
    const maxH = (v0y * v0y) / (2 * g);
    if (heightDiff > maxH * 0.95) return 0;
    const h = Math.max(0, Math.min(heightDiff, maxH * 0.9));
    const tDown = Math.sqrt((2 * (maxH - h)) / g);
    const totalT = tUp + tDown;
    return horizontalSpeed * totalT * 0.75;
  }

  private generateInitialChunk(): void {
    this.platforms.push({
      x: 0,
      y: this.groundY,
      width: 600,
      height: 80,
      type: 'ground'
    });
    this.generatedUntilX = 600;
    this.generateChunk(800);
  }

  generateChunk(targetX: number): void {
    while (this.generatedUntilX < targetX) {
      this.generateOneChunk();
    }
  }

  private generateOneChunk(): void {
    const startX = this.generatedUntilX;
    const { maxJumpHeight, horizontalSpeed } = this.physics;

    const maxGap = this.computeMaxHorizontalReach(0);
    const minGap = Math.max(80, horizontalSpeed * 0.18);
    const gap = minGap + this.rng() * Math.min(maxGap - minGap, 180);

    const heightVariance = maxJumpHeight * 0.55;
    const deltaY = (this.rng() - 0.45) * 2 * heightVariance;
    let newPlatformY = this.getLastGroundY() + deltaY;

    const minY = 120;
    const maxY = this.groundY + 40;
    newPlatformY = Math.max(minY, Math.min(maxY, newPlatformY));

    const platformWidth = 120 + this.rng() * 180;
    const newPlatformX = startX + gap;

    this.platforms.push({
      x: newPlatformX,
      y: newPlatformY,
      width: platformWidth,
      height: this.screenHeight - newPlatformY + 80,
      type: 'floating'
    });

    const prevY = this.getLastGroundY();
    const heightDiff = Math.abs(newPlatformY - prevY);
    const safeReach = this.computeMaxHorizontalReach(heightDiff);
    if (gap > safeReach * 0.95 && this.rng() < 0.5) {
      const midX = startX + gap * 0.5;
      const midY = Math.min(prevY, newPlatformY) - maxJumpHeight * 0.25 - 40 + this.rng() * 40;
      const midW = 90 + this.rng() * 60;
      this.platforms.push({
        x: midX - midW / 2,
        y: Math.max(minY, midY),
        width: midW,
        height: this.screenHeight - midY + 80,
        type: 'floating'
      });
    }

    if (this.rng() < 0.55 && gap > 140) {
      const trapX = startX + minGap * 0.3 + this.rng() * (gap - minGap * 0.5);
      const trapW = 24 + this.rng() * 28;
      const trapBaseY = Math.max(prevY, newPlatformY);
      this.traps.push({
        x: trapX - trapW / 2,
        y: trapBaseY + 8,
        width: trapW,
        height: 16
      });
    }

    const coinCount = 2 + Math.floor(this.rng() * 4);
    for (let i = 0; i < coinCount; i++) {
      const t = (i + 0.5) / coinCount;
      const coinX = newPlatformX + t * platformWidth + (this.rng() - 0.5) * 20;
      const maxCoinHeight = maxJumpHeight * 0.8;
      const coinYOffset = 20 + this.rng() * maxCoinHeight;
      const coinY = newPlatformY - coinYOffset;

      const riseTime = (-this.physics.jumpVelocity) / this.physics.gravity * 0.9;
      const reachLimit = horizontalSpeed * riseTime * 0.6;
      const distFromLeft = Math.abs(coinX - newPlatformX);
      const distFromRight = Math.abs(coinX - (newPlatformX + platformWidth));
      if (coinYOffset < maxJumpHeight * 0.9 && Math.min(distFromLeft, distFromRight) < reachLimit) {
        this.coins.push({
          x: coinX,
          y: coinY,
          collected: false,
          radius: 6
        });
      }
    }

    this.generatedUntilX = newPlatformX + platformWidth;
  }

  private getLastGroundY(): number {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      return this.platforms[i].y;
    }
    return this.groundY;
  }

  getPlatformsInRange(startX: number, endX: number): Platform[] {
    return this.platforms.filter((p) => p.x + p.width > startX && p.x < endX);
  }

  getTrapsInRange(startX: number, endX: number): Trap[] {
    return this.traps.filter((t) => t.x + t.width > startX && t.x < endX);
  }

  getCoinsInRange(startX: number, endX: number): Coin[] {
    return this.coins.filter((c) => !c.collected && c.x + c.radius > startX && c.x - c.radius < endX);
  }

  collectCoin(coin: Coin): void {
    coin.collected = true;
  }

  cleanupBeforeX(x: number): void {
    this.platforms = this.platforms.filter((p) => p.x + p.width > x - 200);
    this.traps = this.traps.filter((t) => t.x + t.width > x - 200);
    this.coins = this.coins.filter((c) => c.x > x - 200);
  }

  getGeneratedUntil(): number {
    return this.generatedUntilX;
  }

  getGroundY(): number {
    return this.groundY;
  }
}
