import { AudioManager } from './audio';

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  midi: number;
  color: string;
  isGlowing: boolean;
  glowTimer: number;
  landed: boolean;
}

export interface Trap {
  x: number;
  y: number;
  size: number;
  rotation: number;
  active: boolean;
}

export interface BgParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

export interface WaveRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  timer: number;
}

export class Game {
  public canvasWidth: number = 800;
  public canvasHeight: number = 600;

  public platforms: Platform[] = [];
  public traps: Trap[] = [];
  public bgParticles: BgParticle[] = [];
  public waveRipples: WaveRipple[] = [];

  public score: number = 0;
  public energy: number = 0;
  public maxEnergy: number = 100;
  public speedMultiplier: number = 1.0;
  public baseScrollSpeed: number = 200;

  public readonly topTrackY: number = 200;
  public readonly bottomTrackY: number = 400;
  public readonly platformHeight: number = 12;
  public readonly platformMinWidth: number = 120;
  public readonly platformMaxWidth: number = 200;
  public readonly gapMin: number = 80;
  public readonly gapMax: number = 160;
  public readonly trapChance: number = 0.2;
  public readonly trapSize: number = 16;

  public isGameOver: boolean = false;
  public isRunning: boolean = false;

  public lastPlatformX: number = 0;
  public lastTrack: number = 0;
  public bgSpawnTimer: number = 0;
  public goldenPlatformTimer: number = 0;

  public currentNoteName: string = '';
  public energyBlinkTimer: number = 0;

  private audioManager: AudioManager;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
  }

  public reset(): void {
    this.platforms = [];
    this.traps = [];
    this.bgParticles = [];
    this.waveRipples = [];
    this.score = 0;
    this.energy = 0;
    this.speedMultiplier = 1.0;
    this.isGameOver = false;
    this.isRunning = true;
    this.lastPlatformX = 0;
    this.lastTrack = 1;
    this.bgSpawnTimer = 0;
    this.goldenPlatformTimer = 0;
    this.currentNoteName = '';
    this.energyBlinkTimer = 0;

    const startPlatform: Platform = {
      x: 0,
      y: this.bottomTrackY,
      width: 300,
      height: this.platformHeight,
      midi: 60,
      color: this.audioManager.getPlatformColor(60),
      isGlowing: false,
      glowTimer: 0,
      landed: true
    };
    this.platforms.push(startPlatform);
    this.lastPlatformX = startPlatform.x + startPlatform.width;

    while (this.lastPlatformX < this.canvasWidth + 400) {
      this.spawnNextPlatform();
    }
  }

  private spawnNextPlatform(): void {
    const gap = this.gapMin + Math.random() * (this.gapMax - this.gapMin);
    const width = this.platformMinWidth + Math.random() * (this.platformMaxWidth - this.platformMinWidth);
    const track = this.lastTrack === 0 ? 1 : 0;
    const y = track === 0 ? this.topTrackY : this.bottomTrackY;
    const midi = this.audioManager.getRandomMidi();
    const color = this.audioManager.getPlatformColor(midi);

    const platform: Platform = {
      x: this.lastPlatformX + gap,
      y: y,
      width: width,
      height: this.platformHeight,
      midi: midi,
      color: color,
      isGlowing: false,
      glowTimer: 0,
      landed: false
    };
    this.platforms.push(platform);

    if (Math.random() < this.trapChance) {
      const trapY = track === 0 ? this.bottomTrackY : this.topTrackY;
      const trap: Trap = {
        x: platform.x + gap / 2,
        y: trapY,
        size: this.trapSize,
        rotation: 0,
        active: true
      };
      this.traps.push(trap);
    }

    this.lastPlatformX = platform.x + platform.width;
    this.lastTrack = track;
  }

  public checkCollision(playerX: number, playerY: number, playerRadius: number): { hitPlatform: Platform | null; hitTrap: boolean } {
    let hitPlatform: Platform | null = null;
    let hitTrap = false;

    for (const platform of this.platforms) {
      if (
        playerX + playerRadius > platform.x &&
        playerX - playerRadius < platform.x + platform.width &&
        Math.abs(playerY - platform.y) < playerRadius + 5
      ) {
        hitPlatform = platform;
        break;
      }
    }

    for (const trap of this.traps) {
      if (!trap.active) continue;
      const dx = playerX - trap.x;
      const dy = playerY - trap.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < playerRadius + trap.size / 2) {
        hitTrap = true;
        break;
      }
    }

    return { hitPlatform, hitTrap };
  }

  public onPlatformLand(platform: Platform): void {
    if (!platform.landed) {
      platform.landed = true;
      platform.isGlowing = true;
      platform.glowTimer = 0.1;
      this.score += 10;
      this.energy = Math.min(this.energy + 5, this.maxEnergy);
      this.audioManager.playNote(platform.midi, 0.2);
      this.currentNoteName = this.audioManager.midiToNoteName(platform.midi);

      if (this.score > 0 && this.score % 50 === 0) {
        this.speedMultiplier = Math.min(2.0, this.speedMultiplier + 0.05);
      }
    }
  }

  public triggerWaveBurst(playerX: number, playerY: number): boolean {
    if (this.energy < this.maxEnergy) return false;

    this.energy = 0;
    this.energyBlinkTimer = 0;
    this.goldenPlatformTimer = 2.0;
    this.audioManager.playWaveBurst();

    for (let i = 0; i < 3; i++) {
      this.waveRipples.push({
        x: playerX,
        y: playerY,
        radius: 0,
        maxRadius: 400,
        alpha: 0.8,
        duration: 0.6,
        timer: -i * 0.1
      });
    }

    for (const trap of this.traps) {
      if (trap.x > playerX && trap.x < playerX + this.canvasWidth) {
        trap.active = false;
      }
    }

    return true;
  }

  public update(dt: number): void {
    if (!this.isRunning || this.isGameOver) return;

    const scrollSpeed = this.baseScrollSpeed * this.speedMultiplier;

    for (const platform of this.platforms) {
      platform.x -= scrollSpeed * dt;
      if (platform.isGlowing) {
        platform.glowTimer -= dt;
        if (platform.glowTimer <= 0) {
          platform.isGlowing = false;
        }
      }
    }

    for (const trap of this.traps) {
      trap.x -= scrollSpeed * dt;
      trap.rotation += (Math.PI * 2) * dt;
    }

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      if (this.platforms[i].x + this.platforms[i].width < -50) {
        this.platforms.splice(i, 1);
      }
    }

    for (let i = this.traps.length - 1; i >= 0; i--) {
      if (this.traps[i].x + this.traps[i].size < -50) {
        this.traps.splice(i, 1);
      }
    }

    this.lastPlatformX -= scrollSpeed * dt;
    while (this.lastPlatformX < this.canvasWidth + 400) {
      this.spawnNextPlatform();
    }

    this.bgSpawnTimer -= dt;
    if (this.bgSpawnTimer <= 0) {
      this.bgSpawnTimer = 1.0;
      this.bgParticles.push({
        x: this.canvasWidth + 10,
        y: Math.random() * this.canvasHeight,
        radius: 1 + Math.random() * 2,
        speed: 20,
        alpha: 0.3
      });
    }

    for (let i = this.bgParticles.length - 1; i >= 0; i--) {
      const p = this.bgParticles[i];
      p.x -= p.speed * dt;
      if (p.x < -10) {
        this.bgParticles.splice(i, 1);
      }
    }

    for (let i = this.waveRipples.length - 1; i >= 0; i--) {
      const w = this.waveRipples[i];
      if (w.timer < 0) {
        w.timer += dt;
        continue;
      }
      w.timer += dt;
      const t = Math.min(w.timer / w.duration, 1.0);
      w.radius = w.maxRadius * t;
      w.alpha = 0.8 * (1 - t);
      if (t >= 1.0) {
        this.waveRipples.splice(i, 1);
      }
    }

    if (this.goldenPlatformTimer > 0) {
      this.goldenPlatformTimer -= dt;
    }

    if (this.energy >= this.maxEnergy) {
      this.energyBlinkTimer += dt;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.topTrackY);
    ctx.lineTo(this.canvasWidth, this.topTrackY);
    ctx.moveTo(0, this.bottomTrackY);
    ctx.lineTo(this.canvasWidth, this.bottomTrackY);
    ctx.stroke();
    ctx.restore();

    for (const p of this.bgParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const platform of this.platforms) {
      this.drawPlatform(ctx, platform);
    }

    for (const trap of this.traps) {
      if (!trap.active) continue;
      this.drawTrap(ctx, trap);
    }

    for (const wave of this.waveRipples) {
      if (wave.timer < 0) continue;
      ctx.save();
      ctx.globalAlpha = wave.alpha;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.drawEnergyBar(ctx);
  }

  private drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform): void {
    ctx.save();

    let color = platform.color;
    if (this.goldenPlatformTimer > 0) {
      color = '#FFD700';
    }

    const brightness = platform.isGlowing ? 1.5 : 1.0;

    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * brightness;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;

    const x = platform.x;
    const y = platform.y - platform.height / 2;
    const w = platform.width;
    const h = platform.height;
    const r = 6;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawTrap(ctx: CanvasRenderingContext2D, trap: Trap): void {
    ctx.save();
    ctx.translate(trap.x, trap.y);
    ctx.rotate(trap.rotation);

    ctx.fillStyle = '#4A5568';
    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4A5568';
    ctx.shadowBlur = 4;

    const s = trap.size;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeRect(-s / 2, -s / 2, s, s);

    ctx.restore();
  }

  private drawEnergyBar(ctx: CanvasRenderingContext2D): void {
    const barX = 20;
    const barY = 50;
    const barW = 200;
    const barH = 12;

    ctx.save();

    ctx.fillStyle = '#2D1B4E';
    ctx.fillRect(barX, barY, barW, barH);

    const fillW = (this.energy / this.maxEnergy) * barW;
    const gradient = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(1, '#FFE66D');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, fillW, barH);

    if (this.energy >= this.maxEnergy) {
      const blink = Math.sin(this.energyBlinkTimer * Math.PI * 10) > 0;
      if (blink) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 8;
        ctx.strokeRect(barX, barY, barW, barH);
      }
    }

    ctx.restore();
  }
}
