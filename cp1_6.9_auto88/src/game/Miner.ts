import { Vector2, PathPoint, BASE_SPEED } from './types';
import { ParticleSystem } from './ParticleSystem';

export interface MinerState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  hp: number;
  maxHp: number;
  pathIndex: number;
  locked: boolean;
  lockTimer: number;
  slowTimer: number;
  slowFactor: number;
  floatOffset: number;
  dead: boolean;
  arcSlowTimer: number;
  goldMultiplier: number;
}

export class Miner {
  state: MinerState;
  private static nextId = 0;
  private static audioCtx: AudioContext | null = null;

  constructor(startPos: Vector2) {
    this.state = {
      id: Miner.nextId++,
      x: startPos.x,
      y: startPos.y,
      vx: 0,
      vy: 0,
      mass: 1 + Math.floor(Math.random() * 5),
      hp: 0,
      maxHp: 0,
      pathIndex: 0,
      locked: false,
      lockTimer: 0,
      slowTimer: 0,
      slowFactor: 1,
      floatOffset: Math.random() * Math.PI * 2,
      dead: false,
      arcSlowTimer: 0,
      goldMultiplier: 1,
    };
    const baseHp = 30 + this.state.mass * 15;
    this.state.hp = baseHp;
    this.state.maxHp = baseHp;
  }

  static setAudioContext(ctx: AudioContext | null) {
    Miner.audioCtx = ctx;
  }

  get position(): Vector2 {
    return { x: this.state.x, y: this.state.y };
  }

  applyDamage(damage: number): boolean {
    this.state.hp -= damage;
    if (this.state.hp <= 0) {
      this.state.hp = 0;
      this.state.dead = true;
      return true;
    }
    return false;
  }

  shouldShatter(): boolean {
    return this.state.hp / this.state.maxHp < 0.3;
  }

  shatter(particles: ParticleSystem): void {
    particles.spawnShards({ x: this.state.x, y: this.state.y }, 3);
    this.playShatterSound();
  }

  playShatterSound(): void {
    if (!Miner.audioCtx) return;
    const ctx = Miner.audioCtx;
    const freq = 800 + Math.random() * 400;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  update(dt: number, path: PathPoint[], time: number): void {
    if (this.state.locked) {
      this.state.lockTimer -= dt;
      if (this.state.lockTimer <= 0) {
        this.state.locked = false;
      }
      this.state.floatOffset += dt * Math.PI * 3;
      return;
    }

    if (this.state.slowTimer > 0) {
      this.state.slowTimer -= dt;
      if (this.state.slowTimer <= 0) {
        this.state.slowFactor = 1;
      }
    }

    if (this.state.arcSlowTimer > 0) {
      this.state.arcSlowTimer -= dt;
    }

    if (this.state.pathIndex < path.length - 1) {
      const target = path[this.state.pathIndex + 1];
      const dx = target.x - this.state.x;
      const dy = target.y - this.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        this.state.pathIndex++;
      } else {
        const speed = BASE_SPEED * this.state.slowFactor * (this.state.arcSlowTimer > 0 ? 0.7 : 1);
        const pathVx = (dx / dist) * speed;
        const pathVy = (dy / dist) * speed;
        this.state.vx = this.state.vx * 0.85 + pathVx * 0.15;
        this.state.vy = this.state.vy * 0.85 + pathVy * 0.15;
      }
    }

    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;
    this.state.floatOffset += dt * Math.PI * 3;
  }

  applyMagneticForce(fx: number, fy: number, dt: number): void {
    if (this.state.locked) return;
    this.state.vx += (fx / this.state.mass) * dt;
    this.state.vy += (fy / this.state.mass) * dt;
  }

  hasReachedEnd(path: PathPoint[]): boolean {
    if (this.state.pathIndex >= path.length - 1) {
      const last = path[path.length - 1];
      const dx = last.x - this.state.x;
      const dy = last.y - this.state.y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    }
    return false;
  }

  applyArcDamage(damage: number, dt: number): void {
    this.applyDamage(damage * dt);
    this.state.arcSlowTimer = 1;
  }

  slowForTowerHit(): void {
    this.state.slowTimer = 2;
    this.state.slowFactor = 0.5;
    this.state.goldMultiplier = 2;
  }

  getGoldReward(): number {
    return Math.floor(10 * this.state.goldMultiplier);
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const float = Math.sin(time * 3 + this.state.floatOffset) * 2;
    const size = 12;
    const cx = this.state.x;
    const cy = this.state.y + float;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.5 + this.state.floatOffset);

    const hpRatio = this.state.hp / this.state.maxHp;
    const baseColor = `hsl(${200 + (1 - hpRatio) * 40}, 70%, ${50 + (1 - hpRatio) * 20}%)`;
    const edgeColor = `hsl(${200 + (1 - hpRatio) * 40}, 90%, 70%)`;

    ctx.shadowColor = edgeColor;
    ctx.shadowBlur = this.state.locked ? 20 : 10;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, baseColor);
    gradient.addColorStop(1, '#223366');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    if (this.state.locked) {
      ctx.save();
      ctx.strokeStyle = '#AA66FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#AA66FF';
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy + float, size + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const barWidth = 24;
    const barHeight = 4;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - barWidth / 2, cy - size - 12, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.3 ? '#44FF88' : '#FF4444';
    ctx.fillRect(cx - barWidth / 2, cy - size - 12, barWidth * hpRatio, barHeight);
    ctx.restore();
  }
}
