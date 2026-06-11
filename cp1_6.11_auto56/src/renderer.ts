import { ReactionState, Ray } from './reaction';
import { Atom, Fragment, Bond, lerpColor } from './atom';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 2D 渲染上下文');
    this.ctx = ctx;
  }

  public resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public render(state: ReactionState): void {
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.drawBackground(w, h);
    this.drawBonds(state.bonds, state.atoms, state.bondActivation);
    this.drawRays(state.rays);
    this.drawShockwaves(state.atoms);
    this.drawAtoms(state.atoms);
    this.drawFragments(state.fragments);
    this.drawEnergySymbols(state.atoms);
  }

  public getFPS(): number {
    return this.fps;
  }

  private drawBackground(w: number, h: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#1A1A4A');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % w;
      const y = (i * 97.3) % h;
      const r = (i % 3) * 0.5 + 0.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawBonds(bonds: Bond[], atoms: Atom[], activation: number): void {
    const atomMap = new Map<number, Atom>();
    for (const a of atoms) atomMap.set(a.id, a);

    const baseAlpha = 0.2 + activation * 0.3;
    const baseColor = activation < 0.5
      ? `rgba(255, 255, 255, ${baseAlpha})`
      : lerpColor('rgba(255,255,255,', '#FF8C00', (activation - 0.5) * 2).replace('rgb(', 'rgba(').replace(')', `, ${baseAlpha})`);

    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = baseColor;

    for (const bond of bonds) {
      const a = atomMap.get(bond.from);
      const b = atomMap.get(bond.to);
      if (!a || !b) continue;
      if (!a.isAlive() && !b.isAlive()) continue;

      let alpha = baseAlpha;
      if (!a.isAlive() || !b.isAlive()) alpha *= 0.4;

      const color = activation > 0.3
        ? this.lerpBondColor(activation, alpha)
        : `rgba(255, 255, 255, ${alpha})`;

      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(a.pos.x, a.pos.y);
      this.ctx.lineTo(b.pos.x, b.pos.y);
      this.ctx.stroke();
    }
  }

  private lerpBondColor(t: number, alpha: number): string {
    const r1 = 255, g1 = 255, b1 = 255;
    const r2 = 255, g2 = 140, b2 = 0;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private drawRays(rays: Ray[]): void {
    for (const ray of rays) {
      if (ray.trail.length < 2) continue;

      this.ctx.lineCap = 'round';

      for (let i = 1; i < ray.trail.length; i++) {
        const alpha = (i / ray.trail.length) * 0.6;
        const width = 1 + (i / ray.trail.length) * 1.5;
        this.ctx.strokeStyle = `rgba(224, 255, 255, ${alpha})`;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(ray.trail[i - 1].x, ray.trail[i - 1].y);
        this.ctx.lineTo(ray.trail[i].x, ray.trail[i].y);
        this.ctx.stroke();
      }

      this.ctx.strokeStyle = '#E0FFFF';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#E0FFFF';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(ray.start.x, ray.start.y);
      this.ctx.lineTo(ray.end.x, ray.end.y);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawShockwaves(atoms: Atom[]): void {
    for (const atom of atoms) {
      if (!atom.shockwaveActive) continue;
      const progress = Math.min(atom.shockwaveRadius / atom.shockwaveMaxRadius, 1);
      const alpha = (1 - progress) * 0.8;

      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(atom.pos.x, atom.pos.y, atom.shockwaveRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawAtoms(atoms: Atom[]): void {
    for (const atom of atoms) {
      if (atom.state === 'split') continue;

      const scale = atom.splitScale;
      const r = atom.radius * scale;
      const alpha = atom.state === 'splitting' ? Math.max(0, 1 - atom.splitProgress / 0.4) : 1;

      const gradient = this.ctx.createRadialGradient(
        atom.pos.x - r * 0.3, atom.pos.y - r * 0.3, 0,
        atom.pos.x, atom.pos.y, r
      );
      gradient.addColorStop(0, this.addAlpha(atom.color, Math.min(1, alpha * 1.2)));
      gradient.addColorStop(0.6, this.addAlpha(atom.color, alpha));
      gradient.addColorStop(1, this.addAlpha(this.darkenColor(atom.color, 0.5), alpha * 0.7));

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(atom.pos.x, atom.pos.y, r, 0, Math.PI * 2);
      this.ctx.fill();

      if (atom.state === 'idle') {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(atom.pos.x - r * 0.3, atom.pos.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
      }

      if (atom.state === 'splitting') {
        this.ctx.shadowColor = atom.color;
        this.ctx.shadowBlur = 20;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(atom.pos.x, atom.pos.y, r + 2, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
      }
    }
  }

  private drawFragments(fragments: Fragment[]): void {
    for (const fragment of fragments) {
      const alpha = Math.min(1, fragment.life / fragment.maxLife);
      const r = fragment.radius * (0.5 + alpha * 0.5);

      this.ctx.fillStyle = this.addAlpha(fragment.color, alpha);
      this.ctx.shadowColor = fragment.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(fragment.pos.x, fragment.pos.y, r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawEnergySymbols(atoms: Atom[]): void {
    for (const atom of atoms) {
      if (!atom.energySymbol || atom.state === 'split') continue;

      const duration = 0.4;
      const t = Math.min(atom.energySymbolTime / duration, 1);
      const scale = 1 - t * 0.7;
      const rotation = t * Math.PI * 2;
      const alpha = 1 - t;

      if (alpha <= 0) continue;

      this.ctx.save();
      this.ctx.translate(atom.pos.x, atom.pos.y);
      this.ctx.rotate(rotation);
      this.ctx.scale(scale, scale);
      this.ctx.font = `${atom.radius * 2}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 15;
      this.ctx.fillText(atom.energySymbol, 0, 0);
      this.ctx.restore();
    }
  }

  private addAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  private darkenColor(color: string, factor: number): string {
    let r: number, g: number, b: number;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      const match = color.match(/\d+/g);
      if (!match) return color;
      [r, g, b] = match.map(Number);
    }
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
