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

const COLOR_START = { r: 0, g: 255, b: 136 };
const COLOR_END = { r: 0, g: 170, b: 255 };

function lerpColor(t: number): string {
  const r = Math.round(COLOR_START.r + (COLOR_END.r - COLOR_START.r) * t);
  const g = Math.round(COLOR_START.g + (COLOR_END.g - COLOR_START.g) * t);
  const b = Math.round(COLOR_START.b + (COLOR_END.b - COLOR_START.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function mixColors(c1: string, c2: string): string {
  const parse = (c: string) => {
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  };
  const a = parse(c1);
  const b = parse(c2);
  return `rgb(${Math.round((a.r + b.r) / 2)}, ${Math.round((a.g + b.g) / 2)}, ${Math.round((a.b + b.b) / 2)})`;
}

function energyToColor(energy: number): string {
  const t = Math.max(0, Math.min(1, energy / 100));
  const r = Math.round(255 * (1 - t));
  const g = Math.round(107 + 109 * t);
  const b = Math.round(107 * (1 - t));
  return `rgb(${r}, ${g}, ${b})`;
}

export class GameEngine {
  microbes: Microbe[] = [];
  chemicals: Chemical[] = [];
  config: GameConfig;
  width: number;
  height: number;
  private lastTime: number = 0;
  private startTime: number = 0;
  maxMicrobeCount: number = 0;

  constructor(width: number, height: number, config: GameConfig) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.startTime = performance.now();
    this.initMicrobes();
  }

  private initMicrobes(): void {
    const { initialCount, minRadius, maxRadius, minSpeed, maxSpeed, minTurnFrequency, maxTurnFrequency } = this.config.microbe;
    for (let i = 0; i < initialCount; i++) {
      this.microbes.push(this.createMicrobe());
    }
    this.maxMicrobeCount = this.microbes.length;
    void minRadius; void maxRadius; void minSpeed; void maxSpeed; void minTurnFrequency; void maxTurnFrequency;
  }

  private createMicrobe(x?: number, y?: number, radius?: number, energy?: number, color?: string): Microbe {
    const { minRadius, maxRadius, minSpeed, maxSpeed, minTurnFrequency, maxTurnFrequency } = this.config.microbe;
    const r = radius ?? minRadius + Math.random() * (maxRadius - minRadius);
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const angle = Math.random() * Math.PI * 2;
    return {
      id: uuidv4(),
      x: x ?? r + Math.random() * (this.width - 2 * r),
      y: y ?? r + Math.random() * (this.height - 2 * r),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: r,
      energy: energy ?? 50 + Math.random() * 50,
      color: color ?? lerpColor(Math.random()),
      angle,
      turnTimer: 0,
      turnInterval: 1000 / (minTurnFrequency + Math.random() * (maxTurnFrequency - minTurnFrequency)),
      speedBoostTimer: 0,
      flashTimer: 0,
      baseSpeed: speed,
    };
  }

  addChemical(x: number, y: number, type: ChemicalType): boolean {
    const { maxAttractors, maxRepellents, radius, duration } = this.config.chemical;
    const current = this.chemicals.filter((c) => c.type === type).length;
    const max = type === 'attractor' ? maxAttractors : maxRepellents;
    if (current >= max) return false;
    this.chemicals.push({
      id: uuidv4(),
      type,
      x,
      y,
      radius,
      createdAt: performance.now(),
      duration,
    });
    return true;
  }

  getChemicalConcentration(mx: number, my: number): { attractor: number; repellent: number; gradientX: number; gradientY: number } {
    let attractor = 0;
    let repellent = 0;
    let gx = 0;
    let gy = 0;
    for (const c of this.chemicals) {
      const dx = c.x - mx;
      const dy = c.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < c.radius && dist > 0.001) {
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
    return { attractor, repellent, gradientX: gx, gradientY: gy };
  }

  update(dt: number): void {
    const now = performance.now();
    this.chemicals = this.chemicals.filter((c) => now - c.createdAt < c.duration);

    const { speedBoost, speedBoostDuration, highConcentrationThreshold } = this.config.chemical;
    const { bounceSpeedFactor, flashDuration, fusionEnergyThreshold, fusionEnergyFactor, fusionRadiusBonus } = this.config.collision;
    const { energyDecayRate } = this.config.microbe;

    for (const m of this.microbes) {
      m.turnTimer += dt;
      if (m.speedBoostTimer > 0) m.speedBoostTimer -= dt;
      if (m.flashTimer > 0) m.flashTimer -= dt;

      const conc = this.getChemicalConcentration(m.x, m.y);
      const totalConc = Math.max(conc.attractor, conc.repellent);
      if (totalConc > highConcentrationThreshold) {
        m.speedBoostTimer = speedBoostDuration;
      }

      if (m.turnTimer >= m.turnInterval) {
        m.turnTimer = 0;
        const gMag = Math.sqrt(conc.gradientX * conc.gradientX + conc.gradientY * conc.gradientY);
        if (gMag > 1) {
          const targetAngle = Math.atan2(conc.gradientY, conc.gradientX);
          const baseDeflect = conc.attractor >= conc.repellent ? (Math.PI / 4) : (Math.PI / 6);
          const randomOffset = (Math.random() - 0.5) * (conc.attractor >= conc.repellent ? (Math.PI / 12) : (Math.PI / 9));
          let newAngle = targetAngle + baseDeflect * (conc.attractor >= conc.repellent ? 1 : -1) + randomOffset;
          const diff = ((newAngle - m.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
          m.angle += diff * 0.3;
        } else {
          m.angle += (Math.random() - 0.5) * Math.PI * 0.5;
        }
      }

      const speedMul = m.speedBoostTimer > 0 ? speedBoost : 1;
      m.vx = Math.cos(m.angle) * m.baseSpeed * speedMul;
      m.vy = Math.sin(m.angle) * m.baseSpeed * speedMul;

      m.x += m.vx * (dt / 1000);
      m.y += m.vy * (dt / 1000);

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

      m.energy = Math.max(0, m.energy - energyDecayRate * (dt / 1000));
    }

    const toRemove = new Set<string>();
    const toAdd: Microbe[] = [];

    for (let i = 0; i < this.microbes.length; i++) {
      for (let j = i + 1; j < this.microbes.length; j++) {
        const a = this.microbes[i];
        const b = this.microbes[j];
        if (toRemove.has(a.id) || toRemove.has(b.id)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0.001) {
          if (a.energy < fusionEnergyThreshold && b.energy < fusionEnergyThreshold) {
            toRemove.add(a.id);
            toRemove.add(b.id);
            const nx = (a.x + b.x) / 2;
            const ny = (a.y + b.y) / 2;
            const nr = (a.radius + b.radius) / 2 + fusionRadiusBonus;
            const ne = (a.energy + b.energy) * fusionEnergyFactor;
            const nc = mixColors(a.color, b.color);
            toAdd.push(this.createMicrobe(nx, ny, nr, Math.min(100, ne), nc));
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            const aSpeed = Math.sqrt(a.vx * a.vx + a.vy * a.vy) * bounceSpeedFactor;
            const bSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * bounceSpeedFactor;
            a.vx = -nx * aSpeed;
            a.vy = -ny * aSpeed;
            b.vx = nx * bSpeed;
            b.vy = ny * bSpeed;
            a.angle = Math.atan2(a.vy, a.vx);
            b.angle = Math.atan2(b.vy, b.vx);
            a.baseSpeed = aSpeed;
            b.baseSpeed = bSpeed;
            a.flashTimer = flashDuration;
            b.flashTimer = flashDuration;
          }
        }
      }
    }

    this.microbes = this.microbes.filter((m) => !toRemove.has(m.id) && m.energy > 0);
    this.microbes.push(...toAdd);

    if (this.microbes.length > this.maxMicrobeCount) {
      this.maxMicrobeCount = this.microbes.length;
    }
    void this.lastTime;
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

  getStats(): { count: number; avgEnergy: number; attractorsLeft: number; repellentsLeft: number; histogram: number[] } {
    const count = this.microbes.length;
    const avgEnergy = count > 0 ? this.microbes.reduce((s, m) => s + m.energy, 0) / count : 0;
    const histogram = new Array(10).fill(0);
    for (const m of this.microbes) {
      const idx = Math.min(9, Math.floor(m.energy / 10));
      histogram[idx]++;
    }
    const { maxAttractors, maxRepellents } = this.config.chemical;
    const attractorsLeft = maxAttractors - this.chemicals.filter((c) => c.type === 'attractor').length;
    const repellentsLeft = maxRepellents - this.chemicals.filter((c) => c.type === 'repellent').length;
    return { count, avgEnergy, attractorsLeft, repellentsLeft, histogram };
  }

  render(ctx: CanvasRenderingContext2D, hoveredMicrobe: Microbe | null, mouseX: number, mouseY: number): void {
    ctx.clearRect(0, 0, this.width, this.height);

    const now = performance.now();
    const gridPulse = 0.15 + 0.1 * Math.sin((now / 3000) * Math.PI * 2);
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
      const color = c.type === 'attractor' ? '0, 255, 136' : '255, 107, 107';
      const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      gradient.addColorStop(0, `rgba(${color}, ${0.5 * alpha})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const m of this.microbes) {
      let displayRadius = m.radius;
      let flashAlpha = 0;
      if (m.flashTimer > 0) {
        const t = 1 - m.flashTimer / this.config.collision.flashDuration;
        displayRadius = m.radius * (1 + 0.5 * (1 - t));
        flashAlpha = 0.8 * (1 - t);
      }
      if (flashAlpha > 0) {
        const glowGradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, displayRadius * 1.5);
        glowGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha * 0.5})`);
        glowGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(m.x, m.y, displayRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = m.color;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(m.x, m.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (hoveredMicrobe) {
      const energyColor = energyToColor(hoveredMicrobe.energy);
      const text = `${hoveredMicrobe.energy.toFixed(0)}`;
      ctx.font = 'bold 12px monospace';
      const textWidth = ctx.measureText(text).width;
      const labelX = hoveredMicrobe.x + hoveredMicrobe.radius + 8;
      const labelY = hoveredMicrobe.y - 8;
      ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
      ctx.fillRect(labelX - 4, labelY - 12, textWidth + 8, 18);
      ctx.fillStyle = energyColor;
      ctx.fillText(text, labelX, labelY + 2);
      void mouseX; void mouseY;
    }
  }
}
