import { TowerType, TOWER_CONFIGS, Vector2, CELL_SIZE } from './types';
import { Miner } from './Miner';

export interface TowerState {
  id: number;
  type: TowerType;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  level: number;
  cooldownTimer: number;
  selected: boolean;
  pulseTimer: number;
  attractForce: number;
  fireEffectRadius: number;
  fireEffectAlpha: number;
}

export class Tower {
  state: TowerState;
  private static nextId = 0;

  constructor(type: TowerType, gridX: number, gridY: number) {
    const config = TOWER_CONFIGS[type];
    this.state = {
      id: Tower.nextId++,
      type,
      gridX,
      gridY,
      x: gridX * CELL_SIZE + CELL_SIZE / 2,
      y: gridY * CELL_SIZE + CELL_SIZE / 2,
      level: 1,
      cooldownTimer: 0,
      selected: false,
      pulseTimer: 0,
      attractForce: 0,
      fireEffectRadius: 0,
      fireEffectAlpha: 0,
    };
    void config;
  }

  getConfig() {
    return TOWER_CONFIGS[this.state.type];
  }

  getRadius(): number {
    return this.getConfig().baseRadius * (1 + (this.state.level - 1) * 0.15);
  }

  getDamage(): number {
    return this.getConfig().baseDamage * (1 + (this.state.level - 1) * 0.10);
  }

  getUpgradeCost(): number {
    return Math.floor(this.getConfig().upgradeCost * Math.pow(1.5, this.state.level - 1));
  }

  canUpgrade(): boolean {
    return this.state.level < 3;
  }

  upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    this.state.level++;
    return true;
  }

  update(dt: number): void {
    if (this.state.cooldownTimer > 0) {
      this.state.cooldownTimer -= dt;
    }
    if (this.state.type === 'attract') {
      this.state.attractForce += dt * 20;
      const maxForce = 80;
      if (this.state.attractForce > maxForce) this.state.attractForce = maxForce;
    }
    if (this.state.pulseTimer > 0) {
      this.state.pulseTimer -= dt;
    }
    if (this.state.fireEffectAlpha > 0) {
      this.state.fireEffectRadius += 40 / 0.3 * dt;
      this.state.fireEffectAlpha = Math.max(0, this.state.fireEffectAlpha - 0.7 / 0.3 * dt);
    }
  }

  triggerFireEffect(): void {
    this.state.fireEffectRadius = 0;
    this.state.fireEffectAlpha = 0.7;
  }

  applyEffect(miners: Miner[], dt: number): Miner | null {
    if (this.state.cooldownTimer > 0) return null;

    const radius = this.getRadius();
    let targetMiner: Miner | null = null;
    let closestDist = Infinity;
    const tx = this.state.x;
    const ty = this.state.y;

    for (const miner of miners) {
      if (miner.state.dead || miner.state.locked) continue;
      const dx = miner.state.x - tx;
      const dy = miner.state.y - ty;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist < closestDist) {
        closestDist = dist;
        targetMiner = miner;
      }
    }

    if (!targetMiner) {
      if (this.state.type === 'attract') {
        this.state.attractForce = Math.max(0, this.state.attractForce - dt * 10);
      }
      return null;
    }

    const dx = targetMiner.state.x - tx;
    const dy = targetMiner.state.y - ty;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist;
    const ny = dy / dist;

    switch (this.state.type) {
      case 'attract': {
        const force = this.state.attractForce;
        targetMiner.applyMagneticForce(-nx * force, -ny * force, dt);
        this.triggerFireEffect();
        break;
      }
      case 'repel': {
        const force = 4 * 60;
        targetMiner.applyMagneticForce(nx * force, ny * force, dt);
        this.state.cooldownTimer = this.getConfig().cooldown;
        this.triggerFireEffect();
        break;
      }
      case 'lock': {
        targetMiner.state.locked = true;
        targetMiner.state.lockTimer = 1.5;
        targetMiner.applyDamage(this.getDamage() * 1.5);
        this.state.cooldownTimer = this.getConfig().cooldown;
        this.triggerFireEffect();
        break;
      }
    }

    void dt;
    return targetMiner;
  }

  isAdjacent(other: Tower): boolean {
    const dx = Math.abs(this.state.gridX - other.state.gridX);
    const dy = Math.abs(this.state.gridY - other.state.gridY);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  getPosition(): Vector2 {
    return { x: this.state.x, y: this.state.y };
  }

  setSelected(selected: boolean): void {
    this.state.selected = selected;
    this.state.pulseTimer = 0;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const { x, y, type, level, selected, fireEffectRadius, fireEffectAlpha } = this.state;
    const config = this.getConfig();

    if (fireEffectAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = fireEffectAlpha;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = config.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, y, fireEffectRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);

    const size = 16;
    ctx.shadowColor = config.color;
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#1A1D3A';
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const px = Math.cos(a) * size;
      const py = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = config.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;

    if (type === 'attract') {
      const s = 7;
      ctx.beginPath();
      ctx.moveTo(-s, -s); ctx.lineTo(0, 0); ctx.lineTo(s, -s);
      ctx.moveTo(0, 0); ctx.lineTo(0, s);
      ctx.moveTo(-s, s); ctx.lineTo(0, 0); ctx.lineTo(s, s);
      ctx.moveTo(0, 0); ctx.lineTo(-s, 0);
      ctx.stroke();
    } else if (type === 'repel') {
      const s = 7;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-s, -s);
      ctx.moveTo(0, 0); ctx.lineTo(s, -s);
      ctx.moveTo(0, 0); ctx.lineTo(0, -s);
      ctx.moveTo(0, 0); ctx.lineTo(-s, s);
      ctx.moveTo(0, 0); ctx.lineTo(s, s);
      ctx.moveTo(0, 0); ctx.lineTo(-s, 0);
      ctx.moveTo(0, 0); ctx.lineTo(s, 0);
      ctx.moveTo(0, 0); ctx.lineTo(0, s);
      ctx.stroke();
    } else if (type === 'lock') {
      const s = 6;
      ctx.strokeStyle = config.color;
      ctx.beginPath();
      ctx.arc(0, -2, s * 0.7, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = config.color;
      ctx.fillRect(-s, 0, s * 2, s + 2);
      ctx.fillStyle = '#1A1D3A';
      ctx.beginPath();
      ctx.arc(0, s / 2 + 1, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < level; i++) {
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(-6 + i * 6, size + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (selected) {
      const pulsePhase = (time * 4) % (Math.PI * 2);
      const pulseSize = 2 + Math.sin(pulsePhase) * 1.5;
      const alpha = 0.6 + Math.sin(pulsePhase) * 0.3;
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = pulseSize;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.strokeRect(x - size - 6, y - size - 6, (size + 6) * 2, (size + 6) * 2);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = config.color;
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, this.getRadius(), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
