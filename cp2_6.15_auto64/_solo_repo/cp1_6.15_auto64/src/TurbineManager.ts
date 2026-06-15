import { WindSimulation } from './WindSimulation';

export interface Turbine {
  id: number;
  x: number;
  y: number;
  rpm: number;
  windAngle: number;
  bladeAngle: number;
  efficiency: number;
  placeAnim: number;
  effectiveRpm: number;
}

const TURBINE_RADIUS = 12;
const BLADE_LENGTH = 18;
const BLADE_COLOR = '#B0B0B0';
const BASE_COLOR = '#607D8B';
const HIT_RADIUS = 20;

export class TurbineManager {
  private turbines: Turbine[] = [];
  private nextId = 1;
  private windSim: WindSimulation;
  private selectedId: number | null = null;
  private hoveredId: number | null = null;

  constructor(windSim: WindSimulation) {
    this.windSim = windSim;
  }

  addTurbine(x: number, y: number): Turbine {
    const t: Turbine = {
      id: this.nextId++,
      x,
      y,
      rpm: 12,
      windAngle: 0,
      bladeAngle: Math.random() * Math.PI * 2,
      efficiency: 100,
      placeAnim: 0,
      effectiveRpm: 12,
    };
    this.turbines.push(t);
    this.recomputeWake();
    return t;
  }

  removeTurbine(id: number): void {
    this.turbines = this.turbines.filter((t) => t.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.recomputeWake();
  }

  clearAll(): void {
    this.turbines = [];
    this.nextId = 1;
    this.selectedId = null;
    this.hoveredId = null;
  }

  getTurbines(): Turbine[] {
    return this.turbines;
  }

  getTurbineAt(lx: number, ly: number): Turbine | null {
    for (let i = this.turbines.length - 1; i >= 0; i--) {
      const t = this.turbines[i];
      const dx = lx - t.x;
      const dy = ly - t.y;
      if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
        return t;
      }
    }
    return null;
  }

  selectTurbine(id: number | null): void {
    this.selectedId = id;
  }

  getSelectedId(): number | null {
    return this.selectedId;
  }

  setHovered(id: number | null): void {
    this.hoveredId = id;
  }

  getHoveredId(): number | null {
    return this.hoveredId;
  }

  updateConfig(id: number, rpm: number, windAngle: number): void {
    const t = this.turbines.find((t) => t.id === id);
    if (t) {
      t.rpm = rpm;
      t.windAngle = windAngle;
      this.recomputeWake();
    }
  }

  recomputeWake(): void {
    this.windSim.setSourceCache(
      this.turbines.map((t) => ({ id: t.id, x: t.x, y: t.y })),
    );
    this.windSim.updateWakeEffect(
      this.turbines.map((t) => ({ id: t.id, x: t.x, y: t.y, windAngle: t.windAngle })),
    );

    for (const t of this.turbines) {
      t.efficiency = this.windSim.computeEfficiency(t.id, t.x, t.y, this.turbines);
      t.effectiveRpm = t.rpm * (t.efficiency / 100);
    }
  }

  update(dt: number): void {
    for (const t of this.turbines) {
      if (t.placeAnim < 1) {
        t.placeAnim = Math.min(1, t.placeAnim + dt / 0.2);
      }
      const rpmToUse = t.effectiveRpm;
      t.bladeAngle += (rpmToUse * 2 * Math.PI) / 60 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, scale: { x: number; y: number }): void {
    for (const t of this.turbines) {
      const sx = t.x * scale.x;
      const sy = t.y * scale.y;
      const sc = (scale.x + scale.y) / 2;

      const animScale = this.easeOut(t.placeAnim);
      const isHovered = this.hoveredId === t.id;
      const hoverScale = isHovered ? 1.1 : 1;
      const finalScale = animScale * hoverScale * sc;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(finalScale, finalScale);

      ctx.fillStyle = BASE_COLOR;
      ctx.beginPath();
      ctx.arc(0, 0, TURBINE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, TURBINE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const angle = t.bladeAngle + (i * Math.PI * 2) / 3;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = BLADE_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-3, -BLADE_LENGTH * 0.3);
        ctx.lineTo(0, -BLADE_LENGTH);
        ctx.lineTo(3, -BLADE_LENGTH * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#37474F';
      ctx.font = `bold ${10}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${t.id}`, 0, 0);

      const effText = `${t.efficiency}%`;
      ctx.font = `${9}px sans-serif`;
      ctx.fillStyle = t.efficiency < 100 ? '#E53935' : '#43A047';
      ctx.textBaseline = 'top';
      ctx.fillText(effText, 0, TURBINE_RADIUS + 4);

      ctx.restore();
    }
  }

  getWindSim(): WindSimulation {
    return this.windSim;
  }

  exportData(): object[] {
    return this.turbines.map((t) => ({
      id: t.id,
      x: Math.round(t.x * 10) / 10,
      y: Math.round(t.y * 10) / 10,
      rpm: t.rpm,
      windAngle: t.windAngle,
      efficiency: t.efficiency,
    }));
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
