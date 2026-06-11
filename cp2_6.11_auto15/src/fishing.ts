import { LakeRenderer } from './lake.js';
import type { Creature } from './creature.js';

export type FishingPhase =
  | 'idle'
  | 'charging'
  | 'casting'
  | 'floating'
  | 'biting'
  | 'reeling'
  | 'escape'
  | 'result';

export interface FloatState {
  x: number;
  y: number;
  baseY: number;
  driftVX: number;
  driftVY: number;
  shakeAmplitude: number;
  shakePhase: number;
  isBiting: boolean;
  biteTimer: number;
  biteWindow: number;
  floatTimer: number;
  nextBiteAt: number;
  haloAngle: number;
}

export interface CastArc {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  elapsed: number;
  peakHeight: number;
}

export interface ReelState {
  progress: number;
  creature: Creature;
  floatX: number;
  floatY: number;
  creatureX: number;
  creatureY: number;
  creatureVX: number;
  creatureVY: number;
  rotation: number;
}

const CAST_SPEED_MIN = 260;
const CAST_SPEED_MAX = 780;
const BITE_WINDOW = 0.8;
const MAX_FLOAT_TIME = 8.0;

export class FishingSystem {
  public phase: FishingPhase = 'idle';
  public chargePower = 0;
  public isCharging = false;
  public float: FloatState | null = null;
  public castArc: CastArc | null = null;
  public reel: ReelState | null = null;
  public mouseX = 0;
  public mouseY = 0;
  public escaped = false;
  private chargeDir = 1;
  private sensitivity = 1;

  constructor(
    private lake: LakeRenderer,
    private onCatch: (creature: Creature) => void,
    private onEscape: () => void,
    private rollCreature: () => Creature,
  ) {}

  setSensitivity(s: number): void {
    this.sensitivity = s;
  }

  startCharge(x: number, y: number): void {
    if (this.phase !== 'idle') return;
    this.phase = 'charging';
    this.isCharging = true;
    this.chargePower = 0;
    this.chargeDir = 1;
    this.mouseX = x;
    this.mouseY = y;
  }

  updateCharge(dt: number): void {
    if (!this.isCharging) return;
    const speed = 0.018 * dt * 60;
    this.chargePower += speed * this.chargeDir;
    if (this.chargePower >= 1) {
      this.chargePower = 1;
      this.chargeDir = -1;
    } else if (this.chargePower <= 0) {
      this.chargePower = 0;
      this.chargeDir = 1;
    }
  }

  releaseCast(targetX: number, targetY: number): void {
    if (!this.isCharging || this.phase !== 'charging') return;
    this.isCharging = false;
    const power = this.chargePower;

    const startX = this.lake.getWidth() * 0.5;
    const startY = this.lake.getHeight() * 0.04;
    const minX = this.lake.getWidth() * 0.08;
    const maxX = this.lake.getWidth() * 0.92;
    const baseY = this.lake.getWaterBaseY();
    const minY = baseY + 10;
    const maxY = this.lake.getHeight() - 80;

    const range = CAST_SPEED_MIN + (CAST_SPEED_MAX - CAST_SPEED_MIN) * power;
    const dx = (targetX - startX) * this.sensitivity;
    const dy = (targetY - startY) * this.sensitivity;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clampedRange = Math.min(dist, range);
    const tx = Math.max(minX, Math.min(maxX, startX + (dx / dist) * clampedRange));
    const ty = Math.max(minY, Math.min(maxY, startY + (dy / dist) * clampedRange));

    this.castArc = {
      startX,
      startY,
      targetX: tx,
      targetY: ty,
      progress: 0,
      duration: 0.35 + power * 0.45,
      elapsed: 0,
      peakHeight: 140 + power * 160,
    };
    this.phase = 'casting';
  }

  updateCast(dt: number): void {
    if (!this.castArc || this.phase !== 'casting') return;
    this.castArc.elapsed += dt / 60;
    this.castArc.progress = Math.min(1, this.castArc.elapsed / this.castArc.duration);

    if (this.castArc.progress >= 1) {
      const { targetX, targetY } = this.castArc;
      this.castArc = null;
      this.enterFloat(targetX, targetY);
    }
  }

  private enterFloat(x: number, y: number): void {
    const drift = this.lake.getWaveDrift();
    const biteDelay = 1.5 + Math.random() * 3.5;
    this.float = {
      x,
      y,
      baseY: y,
      driftVX: drift.vx,
      driftVY: drift.vy * 0.3,
      shakeAmplitude: 0,
      shakePhase: 0,
      isBiting: false,
      biteTimer: 0,
      biteWindow: BITE_WINDOW,
      floatTimer: 0,
      nextBiteAt: biteDelay,
      haloAngle: 0,
    };
    this.phase = 'floating';
    this.lake.addSplashParticles(x, y, 18, '#ffffff');
    this.lake.addRipple(x, y, 140, 0.014);
  }

  private pendingCreature: Creature | null = null;

  updateFloat(dt: number): void {
    if (!this.float || this.phase !== 'floating') return;
    const f = this.float;

    f.floatTimer += dt / 60;

    const drift = this.lake.getWaveDrift();
    f.x += drift.vx + f.driftVX * 0.01;
    f.baseY += drift.vy * 0.2 + f.driftVY * 0.005;

    const wh = this.lake.getWaveHeight(f.x, 0);
    f.y = f.baseY + wh;

    f.haloAngle += 0.02 * dt;

    if (f.floatTimer >= f.nextBiteAt && !f.isBiting) {
      f.isBiting = true;
      f.shakeAmplitude = 15;
      f.shakePhase = 0;
      f.biteTimer = 0;
      this.phase = 'biting';
      this.pendingCreature = this.rollCreature();
      return;
    }

    if (f.floatTimer >= MAX_FLOAT_TIME) {
      this.triggerEscape();
      return;
    }

    if (Math.random() < 0.004 * dt) {
      this.lake.addRipple(f.x, f.y, 60, 0.02);
    }
  }

  updateBiting(dt: number): void {
    if (!this.float || this.phase !== 'biting') return;
    const f = this.float;
    f.biteTimer += dt / 60;
    f.shakePhase += dt * 0.35;

    const freq = 3 + Math.random() * 2;
    const shake = Math.sin(f.shakePhase * freq) * f.shakeAmplitude;
    const submerge = 8 + (f.biteTimer / f.biteWindow) * 12;
    const wh = this.lake.getWaveHeight(f.x, 0);
    f.y = f.baseY + wh + submerge + shake * 0.25;
    f.x += shake * 0.04;

    if (f.biteTimer >= f.biteWindow) {
      this.triggerEscape();
    }
  }

  triggerReel(): boolean {
    if (this.phase !== 'biting' || !this.float || !this.pendingCreature) return false;
    const creature = this.pendingCreature;
    this.pendingCreature = null;
    this.reel = {
      progress: 0,
      creature,
      floatX: this.float.x,
      floatY: this.float.y,
      creatureX: this.float.x,
      creatureY: this.float.y,
      creatureVX: (Math.random() - 0.5) * 3,
      creatureVY: -14 - Math.random() * 4,
      rotation: 0,
    };
    this.phase = 'reeling';
    this.float = null;
    this.lake.addBurstParticles(
      this.reel.floatX,
      this.reel.floatY,
      36,
      creature.color,
      creature.secondaryColor,
    );
    this.onCatch(creature);
    return true;
  }

  private triggerEscape(): void {
    if (this.float) {
      this.lake.addRipple(this.float.x, this.float.y, 100, 0.016);
    }
    this.float = null;
    this.pendingCreature = null;
    this.escaped = true;
    this.phase = 'escape';
    this.onEscape();
    setTimeout(() => {
      this.escaped = false;
      this.reset();
    }, 900);
  }

  updateReel(dt: number): boolean {
    if (!this.reel || this.phase !== 'reeling') return false;
    this.reel.progress += (dt / 60) / 1.1;

    const gravity = 0.55;
    this.reel.creatureVY += gravity;
    this.reel.creatureX += this.reel.creatureVX;
    this.reel.creatureY += this.reel.creatureVY;
    this.reel.rotation += 0.08 * dt;

    if (this.reel.progress >= 1) {
      this.reel = null;
      this.phase = 'result';
      setTimeout(() => this.reset(), 1800);
      return true;
    }
    return false;
  }

  getConeSplashState(): { x: number; y: number; progress: number } | null {
    if (!this.reel || this.phase !== 'reeling') return null;
    const p = this.reel.progress;
    const coneDuration = 0.4 / 1.1;
    const coneProgress = Math.min(1, p / coneDuration);
    return { x: this.reel.floatX, y: this.reel.floatY, progress: coneProgress };
  }

  reset(): void {
    this.phase = 'idle';
    this.float = null;
    this.castArc = null;
    this.reel = null;
    this.pendingCreature = null;
    this.chargePower = 0;
    this.isCharging = false;
  }

  clickAction(): void {
    if (this.phase === 'biting') {
      this.triggerReel();
    }
  }

  getCastPreviewPos(): { x: number; y: number } | null {
    if (!this.castArc) return null;
    const a = this.castArc;
    const t = a.progress;
    const x = a.startX + (a.targetX - a.startX) * t;
    const arcY = -4 * a.peakHeight * t * (1 - t);
    const y = a.startY + (a.targetY - a.startY) * t + arcY;
    return { x, y };
  }

  update(dt: number): void {
    this.updateCharge(dt);
    this.updateCast(dt);
    this.updateFloat(dt);
    this.updateBiting(dt);
    if (this.phase === 'reeling') {
      this.updateReel(dt);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isCharging) {
      this.renderTargetRing(ctx);
    }
    const castPos = this.getCastPreviewPos();
    if (castPos) {
      this.renderFloat(ctx, castPos.x, castPos.y, false, 0, 0, 1);
    }
    if (this.float) {
      this.renderFloatHalo(ctx, this.float);
      const shakeX = this.float.isBiting ? Math.sin(this.float.shakePhase * 4) * 3 : 0;
      const scale = this.float.isBiting ? 1.2 : 1;
      const red = this.float.isBiting;
      this.renderFloat(
        ctx,
        this.float.x + shakeX,
        this.float.y,
        red,
        this.float.haloAngle,
        this.float.isBiting ? this.float.biteTimer : 0,
        scale,
      );
    }
    if (this.reel) {
      this.renderCreatureFlying(ctx, this.reel);
    }
  }

  private renderTargetRing(ctx: CanvasRenderingContext2D): void {
    const power = this.chargePower;
    ctx.save();
    const grad = ctx.createRadialGradient(
      this.mouseX, this.mouseY, 10,
      this.mouseX, this.mouseY, 18 + 50 * power,
    );
    grad.addColorStop(0, 'rgba(100, 255, 218, 0.0)');
    grad.addColorStop(0.7, 'rgba(100, 255, 218, 0.25)');
    grad.addColorStop(1, 'rgba(100, 255, 218, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 18 + 50 * power, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(100, 255, 218, ${0.4 + 0.4 * power})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 22 + 50 * power, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderFloatHalo(ctx: CanvasRenderingContext2D, f: FloatState): void {
    if (f.isBiting) return;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.haloAngle);
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
    halo.addColorStop(0, 'rgba(100, 200, 255, 0.55)');
    halo.addColorStop(0.5, 'rgba(100, 200, 255, 0.15)');
    halo.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(150, 220, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r1 = 20;
      const r2 = 32;
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderFloat(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    red: boolean,
    _halo: number,
    biteTimer: number,
    scale: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    let color = '#ffffff';
    let accent = '#64ffda';
    if (red) {
      const blink = Math.sin(biteTimer * Math.PI * 4) > 0;
      color = blink ? '#ff4757' : '#ffffff';
      accent = '#ff4757';
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = red ? '#ff6b6b' : 'rgba(100, 255, 218, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(7, -4, 6, 6, 0, 12);
    ctx.bezierCurveTo(-6, 6, -7, -4, 0, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -28);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -30, 3, 0, Math.PI * 2);
    ctx.fill();

    if (red) {
      ctx.shadowColor = '#ff4757';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255, 71, 87, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCreatureFlying(ctx: CanvasRenderingContext2D, r: ReelState): void {
    const { creature, creatureX: x, creatureY: y, rotation, progress } = r;
    const alpha = progress < 0.85 ? 1 : 1 - (progress - 0.85) / 0.15;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const { w, h } = creature.size;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(w, h) * 0.9);
    grad.addColorStop(0, creature.color + 'cc');
    grad.addColorStop(1, (creature.secondaryColor ?? creature.color) + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(w, h) * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${h}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = creature.color;
    ctx.shadowBlur = 16;
    ctx.fillText(creature.emoji, 0, 0);

    ctx.restore();
  }
}
