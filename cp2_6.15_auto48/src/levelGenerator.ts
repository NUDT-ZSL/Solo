import {
  PlatformBlock,
  Spike,
  Star,
  Player,
  TILE_SIZE,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLATFORM_COLORS,
  PlatformColor,
  SPIKE_SIZE,
  SPIKE_SPEED,
  STAR_SIZE,
  APPEAR_DURATION,
  DISAPPEAR_DURATION,
  SPIKE_SLIDE_DURATION,
  STAR_RESPAWN_TIME,
} from './types';

export class LevelGenerator {
  private platforms: PlatformBlock[] = [];
  private spikes: Spike[] = [];
  private stars: Star[] = [];
  private nextPlatformId = 1;
  private nextSpikeId = 1;
  private nextStarId = 1;
  private lastColor: PlatformColor | null = null;
  private lastPlatformX = 0;
  private level = 1;
  private generatedRightBound = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    const startY = GAME_HEIGHT - TILE_SIZE * 3;
    this.lastPlatformX = 0;
    this.lastColor = null;
    this.generatedRightBound = 0;

    for (let i = 0; i < 8; i++) {
      this.addPlatform(i * TILE_SIZE, startY);
    }

    for (let i = 0; i < 3; i++) {
      this.addStar();
    }
  }

  private pickNextColor(): PlatformColor {
    if (this.lastColor === null) {
      const idx = Math.floor(Math.random() * PLATFORM_COLORS.length);
      const color = PLATFORM_COLORS[idx];
      this.lastColor = color;
      return color;
    }
    const available = PLATFORM_COLORS.filter(c => c !== this.lastColor);
    const color = available[Math.floor(Math.random() * available.length)];
    this.lastColor = color;
    return color;
  }

  private addPlatform(x: number, y: number): PlatformBlock {
    const color = this.pickNextColor();
    const platform: PlatformBlock = {
      id: this.nextPlatformId++,
      x,
      y,
      width: TILE_SIZE,
      height: TILE_SIZE,
      color,
      state: 'appearing',
      stateTime: 0,
      flashTime: 0,
    };
    this.platforms.push(platform);
    this.lastPlatformX = x;

    if (Math.random() < 0.35) {
      this.addSpikeOnPlatform(platform);
    }

    return platform;
  }

  private addSpikeOnPlatform(platform: PlatformBlock): void {
    const fromLeft = Math.random() < 0.5;
    const spike: Spike = {
      id: this.nextSpikeId++,
      x: fromLeft ? platform.x : platform.x + platform.width - SPIKE_SIZE,
      y: platform.y - SPIKE_SIZE,
      size: SPIKE_SIZE,
      platformId: platform.id,
      velocity: fromLeft ? SPIKE_SPEED : -SPIKE_SPEED,
      platformLeft: platform.x,
      platformRight: platform.x + platform.width,
      slideInTime: SPIKE_SLIDE_DURATION,
      slideFromLeft: fromLeft,
    };
    this.spikes.push(spike);
  }

  private addStar(): void {
    const reachable = this.platforms.filter(p => p.state !== 'disappearing');
    if (reachable.length === 0) return;

    const platform = reachable[Math.floor(Math.random() * reachable.length)];
    const star: Star = {
      id: this.nextStarId++,
      x: platform.x + Math.random() * (platform.width - STAR_SIZE),
      y: platform.y - STAR_SIZE - 20 - Math.random() * 40,
      size: STAR_SIZE,
      collected: false,
      respawnTimer: 0,
    };
    this.stars.push(star);
  }

  public flashPlatform(platformId: number): void {
    const p = this.platforms.find(pl => pl.id === platformId);
    if (p) {
      p.flashTime = 0.1;
    }
  }

  public update(player: Player, cameraX: number, dt: number): void {
    this.updatePlatforms(cameraX, dt);
    this.updateSpikes(dt);
    this.updateStars(dt);
    this.generateAhead(player);
    this.cleanupBehind(cameraX);
  }

  private updatePlatforms(cameraX: number, dt: number): void {
    for (const p of this.platforms) {
      if (p.state === 'appearing') {
        p.stateTime += dt;
        if (p.stateTime >= APPEAR_DURATION) {
          p.state = 'visible';
          p.stateTime = APPEAR_DURATION;
        }
      } else if (p.state === 'disappearing') {
        p.stateTime += dt;
      }
      if (p.flashTime > 0) {
        p.flashTime = Math.max(0, p.flashTime - dt);
      }
    }

    const leftBound = cameraX - GAME_WIDTH * 0.5;
    for (const p of this.platforms) {
      if (p.state !== 'disappearing' && p.x + p.width < leftBound) {
        p.state = 'disappearing';
        p.stateTime = 0;
      }
    }

    this.platforms = this.platforms.filter(p => {
      if (p.state === 'disappearing' && p.stateTime >= DISAPPEAR_DURATION) {
        return false;
      }
      return true;
    });
  }

  private updateSpikes(dt: number): void {
    for (const spike of this.spikes) {
      if (spike.slideInTime > 0) {
        spike.slideInTime = Math.max(0, spike.slideInTime - dt);
        continue;
      }

      spike.x += spike.velocity * dt;

      if (spike.x <= spike.platformLeft) {
        spike.x = spike.platformLeft;
        spike.velocity = Math.abs(spike.velocity);
      } else if (spike.x + spike.size >= spike.platformRight) {
        spike.x = spike.platformRight - spike.size;
        spike.velocity = -Math.abs(spike.velocity);
      }
    }

    const activePlatformIds = new Set(this.platforms.map(p => p.id));
    this.spikes = this.spikes.filter(s => activePlatformIds.has(s.platformId));
  }

  private updateStars(dt: number): void {
    for (const star of this.stars) {
      if (star.collected) {
        star.respawnTimer -= dt;
        if (star.respawnTimer <= 0) {
          this.respawnStar(star);
        }
      }
    }
  }

  private respawnStar(star: Star): void {
    const reachable = this.platforms.filter(p => p.state !== 'disappearing');
    if (reachable.length === 0) {
      star.collected = true;
      star.respawnTimer = STAR_RESPAWN_TIME;
      return;
    }
    const platform = reachable[Math.floor(Math.random() * reachable.length)];
    star.x = platform.x + Math.random() * (platform.width - STAR_SIZE);
    star.y = platform.y - STAR_SIZE - 20 - Math.random() * 40;
    star.collected = false;
    star.respawnTimer = 0;
  }

  public collectStar(starId: number): void {
    const star = this.stars.find(s => s.id === starId);
    if (star && !star.collected) {
      star.collected = true;
      star.respawnTimer = STAR_RESPAWN_TIME;
    }
  }

  private generateAhead(player: Player): void {
    const targetRight = player.x + GAME_WIDTH * 1.5;
    const baseY = GAME_HEIGHT - TILE_SIZE * 3;

    while (this.generatedRightBound < targetRight) {
      const gap = Math.random() < 0.7 ? 0 : TILE_SIZE;
      const yVariation = (Math.random() - 0.5) * TILE_SIZE * 2;
      const newX = this.lastPlatformX + TILE_SIZE + gap;
      const newY = Math.max(
        TILE_SIZE * 2,
        Math.min(GAME_HEIGHT - TILE_SIZE * 2, baseY + yVariation)
      );
      this.addPlatform(newX, newY);
      this.generatedRightBound = newX + TILE_SIZE;
      this.level = Math.max(this.level, Math.floor(newX / (GAME_WIDTH * 2)) + 1);
    }
  }

  private cleanupBehind(cameraX: number): void {
    const removeX = cameraX - GAME_WIDTH * 2;
    this.platforms = this.platforms.filter(p => p.x + p.width >= removeX || p.state === 'disappearing');
  }

  public getPlatforms(): PlatformBlock[] {
    return this.platforms;
  }

  public getSpikes(): Spike[] {
    return this.spikes;
  }

  public getStars(): Star[] {
    return this.stars;
  }

  public getLevel(): number {
    return this.level;
  }

  public reset(): void {
    this.platforms = [];
    this.spikes = [];
    this.stars = [];
    this.nextPlatformId = 1;
    this.nextSpikeId = 1;
    this.nextStarId = 1;
    this.lastColor = null;
    this.level = 1;
    this.generatedRightBound = 0;
    this.init();
  }
}
