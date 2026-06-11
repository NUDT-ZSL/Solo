import { Atom, Fragment, Bond } from './atom';
import { Ray, Shockwave, EnergySymbol, ReactionState } from './reaction';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private frameCount: number = 0;
  private fps: number = 60;
  private lastFpsUpdate: number = 0;
  private bgGradient: CanvasGradient | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.createGradient();
  }

  private createGradient(): void {
    this.bgGradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    this.bgGradient.addColorStop(0, '#1A1A4A');
    this.bgGradient.addColorStop(1, '#0A0A2E');
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.createGradient();
  }

  private clear(): void {
    if (this.bgGradient) {
      this.ctx.fillStyle = this.bgGradient;
    } else {
      this.ctx.fillStyle = '#0A0A2E';
    }
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private drawBonds(bonds: Bond[], atoms: Atom[], reactionProgress: number): void {
    const atomMap = new Map<number, Atom>();
    for (const atom of atoms) {
      atomMap.set(atom.id, atom);
    }

    for (const bond of bonds) {
      const from = atomMap.get(bond.from);
      const to = atomMap.get(bond.to);
      if (!from || !to) continue;
      if (from.state === 'split' || to.state === 'split') continue;

      const baseAlpha = 0.2 + (1 - bond.distance / 120) * 0.3;
      const alpha = baseAlpha * (1 - reactionProgress * 0.5);

      if (reactionProgress > 0.01) {
        const t = Math.min(1, reactionProgress * 3);
        const white = { r: 255, g: 255, b: 255 };
        const orange = this.hexToRgb('#FF8C00');
        const r = Math.round(white.r + (orange.r - white.r) * t);
        const g = Math.round(white.g + (orange.g - white.g) * t);
        const b = Math.round(white.b + (orange.b - white.b) * t);
        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha + t * 0.3})`;
      } else {
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      }

      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();
    }
  }

  private drawAtoms(atoms: Atom[]): void {
    for (const atom of atoms) {
      if (atom.state === 'split') continue;

      const radius = atom.radius * atom.splitScale;
      if (radius <= 0) continue;

      const gradient = this.ctx.createRadialGradient(
        atom.x - radius * 0.3,
        atom.y - radius * 0.3,
        0,
        atom.x,
        atom.y,
        radius
      );

      const rgb = this.hexToRgb(atom.color);
      gradient.addColorStop(0, `rgba(${Math.min(255, rgb.r + 50)}, ${Math.min(255, rgb.g + 50)}, ${Math.min(255, rgb.b + 50)}, 1)`);
      gradient.addColorStop(0.7, atom.color);
      gradient.addColorStop(1, `rgba(${rgb.r * 0.5}, ${rgb.g * 0.5}, ${rgb.b * 0.5}, 0.8)`);

      this.ctx.beginPath();
      this.ctx.arc(atom.x, atom.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(atom.x, atom.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      if (atom.state === 'splitting') {
        this.ctx.beginPath();
        this.ctx.arc(atom.x, atom.y, radius + 5, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 200, 100, ${0.5 * (1 - atom.splitProgress)})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
  }

  private drawRays(rays: Ray[]): void {
    for (const ray of rays) {
      if (ray.trail.length > 1) {
        for (let i = 1; i < ray.trail.length; i++) {
          const prev = ray.trail[i - 1];
          const curr = ray.trail[i];
          const alpha = curr.alpha * 0.6;

          this.ctx.beginPath();
          this.ctx.moveTo(prev.x, prev.y);
          this.ctx.lineTo(curr.x, curr.y);
          this.ctx.strokeStyle = `rgba(224, 255, 255, ${alpha})`;
          this.ctx.lineWidth = 2;
          this.ctx.lineCap = 'round';
          this.ctx.stroke();
        }
      }

      this.ctx.beginPath();
      this.ctx.moveTo(ray.startX, ray.startY);
      this.ctx.lineTo(ray.currentX, ray.currentY);
      this.ctx.strokeStyle = '#E0FFFF';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.shadowColor = '#E0FFFF';
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawFragments(fragments: Fragment[]): void {
    for (const f of fragments) {
      const alpha = f.alpha;
      if (alpha <= 0) continue;

      const rgb = this.hexToRgb(f.color);

      const gradient = this.ctx.createRadialGradient(
        f.x, f.y, 0,
        f.x, f.y, f.radius * 2
      );
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, f.radius * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 80)}, ${Math.min(255, rgb.g + 80)}, ${Math.min(255, rgb.b + 80)}, ${alpha})`;
      this.ctx.fill();
    }
  }

  private drawShockwaves(shockwaves: Shockwave[]): void {
    for (const sw of shockwaves) {
      if (sw.alpha <= 0) continue;

      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius * 0.9, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 200, 150, ${sw.alpha * 0.5})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private drawEnergySymbols(symbols: EnergySymbol[]): void {
    this.ctx.font = '28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const es of symbols) {
      if (es.alpha <= 0) continue;

      this.ctx.save();
      this.ctx.translate(es.x, es.y);
      this.ctx.rotate(es.rotation);
      this.ctx.scale(es.scale, es.scale);
      this.ctx.globalAlpha = es.alpha;

      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 15;
      this.ctx.fillText(es.symbol, 0, 0);
      this.ctx.shadowBlur = 0;

      this.ctx.restore();
    }
    this.ctx.globalAlpha = 1;
  }

  private updateFPS(_dt: number, time: number): void {
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 1) {
      this.fps = Math.round(this.frameCount / (time - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }
  }

  render(state: ReactionState, dt: number, time: number): void {
    this.updateFPS(dt, time);
    this.clear();

    this.drawBonds(state.bonds, state.atoms, state.reactionProgress);
    this.drawAtoms(state.atoms);
    this.drawRays(state.rays);
    this.drawFragments(state.fragments);
    this.drawShockwaves(state.shockwaves);
    this.drawEnergySymbols(state.energySymbols);
  }

  getFPS(): number {
    return this.fps;
  }
}
