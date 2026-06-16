import { v4 as uuidv4 } from 'uuid';
import type { GameConfig } from '../services/api';

export interface Microbe {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  energy: number;
  color: string;
  angle: number;
  turnTimer: number;
  turnInterval: number;
  speedBoostTimer: number;
  flashTimer: number;
  baseSpeed: number;
}

export type ChemicalType = 'attractor' | 'repellent';

export interface Chemical {
  id: string;
  type: ChemicalType;
  x: number;
  y: number;
  radius: number;
  createdAt: number;
  duration: number;
}

const COLOR_START_R = 0;
const COLOR_START_G = 255;
const COLOR_START_B = 136;
const COLOR_END_R = 0;
const COLOR_END_G = 170;
const COLOR_END_B = 255;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(t: number): string {
  const tt = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(lerp(COLOR_START_R, COLOR_END_R, tt))}, ${Math.round(lerp(COLOR_START_G, COLOR_END_G, tt))}, ${Math.round(lerp(COLOR_START_B, COLOR_END_B, tt))})`;
}

function parseRGB(c: string): { r: number; g: number; b: number } {
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return { r: 128, g: 128, b: 128 };
  return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
}

function mixColors(c1: string, c2: string): string {
  const a = parseRGB(c1);
  const b = parseRGB(c2);
  return `rgb(${Math.round((a.r + b.r) / 2)}, ${Math.round((a.g + b.g) / 2)}, ${Math.round((a.b + b.b) / 2)})`;
}

function energyToColor(energy: number): string {
  const t = Math.max(0, Math.min(1, energy / 100));
  const r = Math.round(255 * (1 - t));
  const g = Math.round(107 + 148 * t);
  const b = Math.round(107 * (1 - t));
  return `rgb(${r}, ${g}, ${b})`;
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export class GameEngine {
  microbes: Microbe[] = [];
  chemicals: Chemical[] = [];
  config: GameConfig;
  width: number;
  height: number;
  maxMicrobeCount: number = 0;

  private chemicalAccumulator: number = 0;
  private readonly CHEMICAL_UPDATE_DT: number = 1000 / 15;

  constructor(width: number, height: number, config: GameConfig) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.initMicrobes();
  }

  private initMicrobes(): void {
    const { initialCount } = this.config.microbe;
    this.microbes = [];
    for (let i = 0; i < initialCount; i++) {
      this.microbes.push(this.createMicrobe());
    }
    this.maxMicrobeCount = this.microbes.length;
  }

  private createMicrobe(
    x?: number,
    y?: number,
    radius?: number,
    energy?: number,
    color?: string
  ): Microbe {
    const mc = this.config.microbe;
    const r = radius ?? mc.minRadius + Math.random() * (mc.maxRadius - mc.minRadius);
    const speed = mc.minSpeed + Math.random() * (mc.maxSpeed - mc.minSpeed);
    const angle = Math.random() * Math.PI * 2;
    const px = x ?? r + Math.random() * (this.width - 2 * r);
    const py = y ?? r + Math.random() * (this.height - 2 * r);
    return {
      id: uuidv4(),
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: r,
      energy: energy ?? 50 + Math.random() * 50,
      color: color ?? lerpColor(Math.random()),
      angle,
      turnTimer: 0,
      turnInterval: 1000 / (mc.minTurnFrequency + Math.random() * (mc.maxTurnFrequency - mc.minTurnFrequency)),
      speedBoostTimer: 0,
      flashTimer: 0,
      baseSpeed: speed,
    };
  }

  addChemical(x: number, y: number, type: ChemicalType): boolean {
    const ch = this.config.chemical;
    const current = this.chemicals.filter((c) => c.type === type).length;
    const max = type === 'attractor' ? ch.maxAttractors : ch.maxRepellents;
    if (current >= max) return false;
    this.chemicals.push({
      id: uuidv4(),
      type,
      x,
      y,
      radius: ch.radius,
      createdAt: performance.now(),
      duration: ch.duration,
    });
    return true;
  }

  private sampleConcentration(mx: number, my: number): {
    attractor: number;
    repellent: number;
    gradX: number;
    gradY: number;
  } {
    let attractor = 0;
    let repellent = 0;
    let gx = 0;
    let gy = 0;
    for (const c of this.chemicals) {
      const dx = c.x - mx;
      const dy = c.y - my;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < c.radius * c.radius && dist2 > 0.0001) {
        const dist = Math.sqrt(dist2);
        const conc = (1 - dist / c.radius) * 100;
        if (c.type === 'attractor') {
          attractor = Math.max(attractor, conc);
          gx += (dx / dist) * conc;
          gy += (dy / dist) * conc;
        } else {
          repellent = Math.max(repellent, conc);
          gx -= (dx / dist) * conc;
          gy -= (dy / dist) * conc;
        }
      }
    }
    return { attractor, repellent, gradX: gx, gradY: gy };
  }

  update(dtMs: number): void {
    const dtSec = dtMs / 1000;
    const now = performance.now();

    this.chemicalAccumulator += dtMs;
    while (this.chemicalAccumulator >= this.CHEMICAL_UPDATE_DT) {
      this.chemicalAccumulator -= this.CHEMICAL_UPDATE_DT;
      this.chemicals = this.chemicals.filter((c) => now - c.createdAt < c.duration);
    }

    const ch = this.config.chemical;
    const col = this.config.collision;
    const mc = this.config.microbe;

    for (const m of this.microbes) {
      m.turnTimer += dtMs;
      if (m.speedBoostTimer > 0) m.speedBoostTimer = Math.max(0, m.speedBoostTimer - dtMs);
      if (m.flashTimer > 0) m.flashTimer = Math.max(0, m.flashTimer - dtMs);

      const conc = this.sampleConcentration(m.x, m.y);
      const totalConc = Math.max(conc.attractor, conc.repellent);
      if (totalConc > ch.highConcentrationThreshold && m.speedBoostTimer <= 0) {
        m.speedBoostTimer = ch.speedBoostDuration;
      }

      if (m.turnTimer >= m.turnInterval) {
        m.turnTimer = 0;
        const gMag = Math.sqrt(conc.gradX * conc.gradX + conc.gradY * conc.gradY);

        if (gMag > 0.5) {
          const targetAngle = Math.atan2(conc.gradY, conc.gradX);
          const angleDiff = normalizeAngle(targetAngle - m.angle);
          const isAttractor = conc.attractor >= conc.repellent;
          const maxDeflect = isAttractor ? Math.PI / 4 : Math.PI / 6;
          const randomOff = (Math.random() - 0.5) * (isAttractor ? Math.PI / 12 : Math.PI / 9);
          let deflect = Math.max(-maxDeflect, Math.min(maxDeflect, angleDiff));
          deflect += randomOff;
          m.angle = normalizeAngle(m.angle + deflect);
        } else {
          m.angle = normalizeAngle(m.angle + (Math.random() - 0.5) * Math.PI * 0.6);
        }
      }

      const speedMul = m.speedBoostTimer > 0 ? ch.speedBoost : 1;
      const currentSpeed = m.baseSpeed * speedMul;
      m.vx = Math.cos(m.angle) * currentSpeed;
      m.vy = Math.sin(m.angle) * currentSpeed;

      m.x += m.vx * dtSec;
      m.y += m.vy * dtSec;

      if (m.x - m.radius < 0) {
        m.x = m.radius;
        m.angle = Math.PI - m.angle;
      } else if (m.x + m.radius > this.width) {
        m.x = this.width - m.radius;
        m.angle = Math.PI - m.angle;
      }
      if (m.y - m.radius < 0) {
        m.y = m.radius;
        m.angle = -m.angle;
      } else if (m.y + m.radius > this.height) {
        m.y = this.height - m.radius;
        m.angle = -m.angle;
      }

      m.energy = Math.max(0, m.energy - mc.energyDecayRate * dtSec);
    }

    const removed: Set<string> = new Set();
    const added: Microbe[] = [];

    const n = this.microbes.length;
    for (let i = 0; i < n; i++) {
      const a = this.microbes[i];
      if (removed.has(a.id)) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.microbes[j];
        if (removed.has(b.id)) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist > 0 && dist < minDist * 3) {
          if (a.energy < col.fusionEnergyThreshold && b.energy < col.fusionEnergyThreshold) {
            const nx = dx / dist;
            const ny = dy / dist;
            const fusionSpeed = 40;
            a.x += nx * fusionSpeed * dtSec;
            a.y += ny * fusionSpeed * dtSec;
            b.x -= nx * fusionSpeed * dtSec;
            b.y -= ny * fusionSpeed * dtSec;
            a.angle = Math.atan2(ny, nx);
            b.angle = Math.atan2(-ny, -nx);
          }
        }

        if (dist > 0 && dist < minDist) {
          if (a.energy < col.fusionEnergyThreshold && b.energy < col.fusionEnergyThreshold) {
            removed.add(a.id);
            removed.add(b.id);
            const nx = (a.x + b.x) / 2;
            const ny = (a.y + b.y) / 2;
            const nr = (a.radius + b.radius) / 2 + col.fusionRadiusBonus;
            const ne = Math.min(100, (a.energy + b.energy) * col.fusionEnergyFactor);
            const nc = mixColors(a.color, b.color);
            const fused = this.createMicrobe(nx, ny, nr, ne, nc);
            fused.flashTimer = col.flashDuration * 2;
            added.push(fused);
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const aSpeed = m_baseSpeed(a, col.bounceSpeedFactor);
            const bSpeed = m_baseSpeed(b, col.bounceSpeedFactor);
            a.vx = -nx * aSpeed;
            a.vy = -ny * aSpeed;
            b.vx = nx * bSpeed;
            b.vy = ny * bSpeed;
            a.angle = Math.atan2(a.vy, a.vx);
            b.angle = Math.atan2(b.vy, b.vx);
            a.baseSpeed = Math.max(a.baseSpeed * 0.95, aSpeed);
            b.baseSpeed = Math.max(b.baseSpeed * 0.95, bSpeed);
            a.flashTimer = col.flashDuration;
            b.flashTimer = col.flashDuration;
          }
        }
      }
    }

    this.microbes = this.microbes.filter((m) => !removed.has(m.id) && m.energy > 0.01);
    this.microbes.push(...added);

    if (this.microbes.length > this.maxMicrobeCount) {
      this.maxMicrobeCount = this.microbes.length;
    }
  }

  getMicrobeAt(x: number, y: number): Microbe | null {
    for (let i = this.microbes.length - 1; i >= 0; i--) {
      const m = this.microbes[i];
      const dx = x - m.x;
      const dy = y - m.y;
      if (dx * dx + dy * dy <= m.radius * m.radius) {
        return m;
      }
    }
    return null;
  }

  getStats(): {
    count: number;
    avgEnergy: number;
    attractorsLeft: number;
    repellentsLeft: number;
    histogram: number[];
  } {
    const count = this.microbes.length;
    let sumEnergy = 0;
    const histogram = new Array(10).fill(0);
    for (const m of this.microbes) {
      sumEnergy += m.energy;
      const idx = Math.min(9, Math.floor(Math.max(0, m.energy) / 10));
      histogram[idx]++;
    }
    const avgEnergy = count > 0 ? sumEnergy / count : 0;
    const ch = this.config.chemical;
    const attractorsLeft = ch.maxAttractors - this.chemicals.filter((c) => c.type === 'attractor').length;
    const repellentsLeft = ch.maxRepellents - this.chemicals.filter((c) => c.type === 'repellent').length;
    return { count, avgEnergy, attractorsLeft, repellentsLeft, histogram };
  }

  render(ctx: CanvasRenderingContext2D, hovered: Microbe | null): void {
    ctx.clearRect(0, 0, this.width, this.height);

    const now = performance.now();
    const gridPulse = 0.12 + 0.08 * Math.sin((now / 3000) * Math.PI * 2);
    ctx.strokeStyle = `rgba(26, 35, 50, ${gridPulse})`;
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    for (const c of this.chemicals) {
      const age = now - c.createdAt;
      const alpha = Math.max(0, 1 - age / c.duration);
      const rgb = c.type === 'attractor' ? '0, 255, 136' : '255, 107, 107';
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      grad.addColorStop(0, `rgba(${rgb}, ${0.4 * alpha})`);
      grad.addColorStop(0.7, `rgba(${rgb}, ${0.15 * alpha})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const m of this.microbes) {
      let displayRadius = m.radius;
      let flashAlpha = 0;
      if (m.flashTimer > 0) {
        const t = 1 - m.flashTimer / (this.config.collision.flashDuration * 2);
        displayRadius = m.radius * (1 + 0.5 * (1 - t));
        flashAlpha = 0.8 * (1 - t);
      }

      if (flashAlpha > 0) {
        const glowGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, displayRadius * 2);
        glowGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha * 0.6})`);
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, displayRadius * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = m.color;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(m.x, m.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (m.energy < 30) {
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, displayRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (hovered) {
      const eColor = energyToColor(hovered.energy);
      const text = `${hovered.energy.toFixed(0)}`;
      ctx.font = 'bold 12px monospace';
      const textWidth = ctx.measureText(text).width;
      const lx = hovered.x + hovered.radius + 8;
      const ly = hovered.y - 8;
      ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(lx - 6, ly - 14, textWidth + 12, 20, 4);
      } else {
        ctx.rect(lx - 6, ly - 14, textWidth + 12, 20);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = eColor;
      ctx.fillText(text, lx, ly + 1);
    }
  }
}

function m_baseSpeed(m: Microbe, factor: number): number {
  return Math.sqrt(m.vx * m.vx + m.vy * m.vy) * factor;
}
