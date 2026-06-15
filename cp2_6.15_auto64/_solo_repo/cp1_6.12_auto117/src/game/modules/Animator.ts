import type { FragmentType, RuneActivateEvent } from './Grid';
import type { Monster, MonsterDamageEvent, MonsterSpawnEvent } from './Monster';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'explosion' | 'spark' | 'fire' | 'ice' | 'life' | 'trail' | 'metal';
}

export interface ScreenShake {
  magnitude: number;
  duration: number;
  timer: number;
}

export interface LandingBounce {
  x: number;
  y: number;
  type: FragmentType;
  timer: number;
  duration: number;
  bounces: number;
  maxBounces: number;
}

export interface RuneActivationFx {
  cells: { x: number; y: number }[];
  type: FragmentType;
  timer: number;
  duration: number;
}

export interface HitSpark {
  x: number;
  y: number;
  timer: number;
  duration: number;
  color: string;
}

export interface IAnimator {
  particles: Particle[];
  screenShake: ScreenShake | null;
  landingBounces: LandingBounce[];
  runeActivations: RuneActivationFx[];
  hitSparks: HitSpark[];
  update(deltaTime: number): void;
  getShakeOffset(): { x: number; y: number };
  getLandingOffset(bounce: LandingBounce): number;
  getConnectionProgress(): number;
  getLavaOffset(canvasWidth: number): number;
  getWarningFlashAlpha(): number;
  triggerLandingBounce(x: number, y: number, type: FragmentType): void;
  triggerShake(magnitude: number, duration: number): void;
  triggerRuneActivation(event: RuneActivateEvent): void;
  triggerMonsterHit(event: MonsterDamageEvent): void;
  triggerWaveWarning(): void;
  handleRuneActivate(event: RuneActivateEvent): void;
  handleMonsterDamage(event: MonsterDamageEvent): void;
  handleWaveStart(): void;
  spawnFastMonsterTrail(gridX: number, gridY: number): void;
  spawnBurningParticle(gridX: number, gridY: number): void;
}

export class Animator implements IAnimator {
  particles: Particle[] = [];
  readonly maxParticles = 500;
  screenShake: ScreenShake | null = null;
  landingBounces: LandingBounce[] = [];
  runeActivations: RuneActivationFx[] = [];
  hitSparks: HitSpark[] = [];
  connectionAnimationTime = 0;
  lavaTextureOffset = 0;
  waveShakeTimer = 0;
  warningFlashTimer = 0;
  warningFlashActive = false;
  private readonly LAVA_SCROLL_SPEED = 20;
  private readonly CONNECTION_CYCLE_DURATION = 1.5;

  triggerShake(magnitude: number, duration: number): void {
    if (!this.screenShake || this.screenShake.magnitude < magnitude) {
      this.screenShake = {
        magnitude,
        duration,
        timer: duration
      };
    }
  }

  triggerLandingBounce(x: number, y: number, type: FragmentType): void {
    this.landingBounces.push({
      x,
      y,
      type,
      timer: 0,
      duration: 0.6,
      bounces: 0,
      maxBounces: 2
    });
  }

  triggerRuneActivation(event: RuneActivateEvent): void {
    this.runeActivations.push({
      cells: event.cells,
      type: event.type,
      timer: 0,
      duration: 0.5
    });
    this.triggerShake(3, 0.4);
    for (const cell of event.cells) {
      this.spawnExplosionParticles(cell.x + 0.5, cell.y + 0.5, event.type, 20);
    }
  }

  triggerWaveWarning(): void {
    this.warningFlashActive = true;
    this.warningFlashTimer = 1.5;
    this.waveShakeTimer = 0.5;
    this.triggerShake(4, 0.5);
  }

  triggerMonsterHit(event: MonsterDamageEvent): void {
    const colors: Record<string, string> = {
      fire: '#ff4444',
      ice: '#44aaff',
      life: '#44ff88',
      normal: '#ffffff'
    };
    this.hitSparks.push({
      x: event.monster.x + 0.5,
      y: event.monster.y + 0.5,
      timer: 0,
      duration: 0.2,
      color: colors[event.type] || '#ffffff'
    });
    this.spawnHitParticles(
      event.monster.x + 0.5,
      event.monster.y + 0.5,
      event.type,
      event.monster.type === 'heavy'
    );
    this.triggerShake(1.5, 0.15);
  }

  private spawnExplosionParticles(
    gridX: number,
    gridY: number,
    type: FragmentType,
    count: number
  ): void {
    const colors: Record<FragmentType, string[]> = {
      ice: ['#88ccff', '#44aaff', '#0088ff'],
      fire: ['#ff8844', '#ff4444', '#ffaa00'],
      life: ['#88ff88', '#44ff44', '#00ff88']
    };
    const palette = colors[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: gridX,
        y: gridY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: 3 + Math.random() * 4,
        type: 'explosion'
      });
    }
  }

  private spawnHitParticles(
    gridX: number,
    gridY: number,
    damageType: string,
    isMetal: boolean
  ): void {
    const count = isMetal ? 12 : 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: gridX,
        y: gridY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: isMetal ? '#ffcc44' : (damageType === 'fire' ? '#ff6644' : '#ffffff'),
        size: 2 + Math.random() * 2,
        type: isMetal ? 'metal' : 'spark'
      });
    }
  }

  spawnFastMonsterTrail(gridX: number, gridY: number): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x: gridX + 0.5,
      y: gridY + 0.5,
      vx: 0,
      vy: 0.5,
      life: 0.4,
      maxLife: 0.4,
      color: '#aa66ff',
      size: 4,
      type: 'trail'
    });
  }

  spawnBurningParticle(gridX: number, gridY: number): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x: gridX + 0.3 + Math.random() * 0.4,
      y: gridY + 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1 - Math.random() * 1,
      life: 0.5,
      maxLife: 0.5,
      color: Math.random() > 0.5 ? '#ff4444' : '#ffaa00',
      size: 2 + Math.random() * 2,
      type: 'fire'
    });
  }

  getShakeOffset(): { x: number; y: number } {
    if (!this.screenShake || this.screenShake.timer <= 0) {
      return { x: 0, y: 0 };
    }
    const progress = this.screenShake.timer / this.screenShake.duration;
    const magnitude = this.screenShake.magnitude * progress;
    return {
      x: (Math.random() - 0.5) * magnitude * 2,
      y: (Math.random() - 0.5) * magnitude * 2
    };
  }

  getLandingOffset(bounce: LandingBounce): number {
    const t = bounce.timer / bounce.duration;
    const bounceHeights = [0.6, 0.3];
    const currentBounce = Math.min(bounce.bounces, bounceHeights.length - 1);
    const bounceDuration = bounce.duration / bounce.maxBounces;
    const timeInBounce = bounce.timer % bounceDuration;
    const bounceProgress = timeInBounce / bounceDuration;
    const baseHeight = bounceHeights[currentBounce];
    const parabola = Math.sin(bounceProgress * Math.PI) * baseHeight;
    return parabola * (1 - t * 0.2);
  }

  getConnectionProgress(): number {
    return (this.connectionAnimationTime % this.CONNECTION_CYCLE_DURATION) / this.CONNECTION_CYCLE_DURATION;
  }

  getLavaOffset(canvasWidth: number): number {
    return this.lavaTextureOffset % canvasWidth;
  }

  getWarningFlashAlpha(): number {
    if (!this.warningFlashActive) return 0;
    const flash = Math.sin(this.warningFlashTimer * 20) * 0.5 + 0.5;
    return flash * (this.warningFlashTimer / 1.5);
  }

  update(deltaTime: number): void {
    this.connectionAnimationTime += deltaTime;
    this.lavaTextureOffset += this.LAVA_SCROLL_SPEED * deltaTime;

    if (this.screenShake) {
      this.screenShake.timer -= deltaTime;
      if (this.screenShake.timer <= 0) {
        this.screenShake = null;
      }
    }

    if (this.warningFlashActive) {
      this.warningFlashTimer -= deltaTime;
      if (this.warningFlashTimer <= 0) {
        this.warningFlashActive = false;
      }
    }

    if (this.waveShakeTimer > 0) {
      this.waveShakeTimer -= deltaTime;
    }

    for (let i = this.landingBounces.length - 1; i >= 0; i--) {
      const bounce = this.landingBounces[i];
      bounce.timer += deltaTime;
      const totalBounceTime = bounce.duration / bounce.maxBounces;
      bounce.bounces = Math.floor(bounce.timer / totalBounceTime);
      if (bounce.timer >= bounce.duration) {
        this.landingBounces.splice(i, 1);
      }
    }

    for (let i = this.runeActivations.length - 1; i >= 0; i--) {
      const fx = this.runeActivations[i];
      fx.timer += deltaTime;
      if (fx.timer >= fx.duration) {
        this.runeActivations.splice(i, 1);
      }
    }

    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      const spark = this.hitSparks[i];
      spark.timer += deltaTime;
      if (spark.timer >= spark.duration) {
        this.hitSparks.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 5 * deltaTime;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  handleRuneActivate(event: RuneActivateEvent): void {
    this.triggerRuneActivation(event);
  }

  handleMonsterDamage(event: MonsterDamageEvent): void {
    this.triggerMonsterHit(event);
  }

  handleWaveStart(): void {
    this.triggerWaveWarning();
  }
}
