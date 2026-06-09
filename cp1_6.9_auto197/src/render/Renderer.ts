import { Grid, PillarColor, PILLAR_COLOR_HEX } from '../core/Grid';
import { Player, CELL_SIZE } from '../core/Player';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.substring(0, 2), 16),
    g: parseInt(m.substring(2, 4), 16),
    b: parseInt(m.substring(4, 6), 16),
  };
}

function rgbToHue(r: number, g: number, b: number): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max === min) h = 0;
  else if (max === r) h = ((g - b) / (max - min)) * 60;
  else if (max === g) h = (2 + (b - r) / (max - min)) * 60;
  else h = (4 + (r - g) / (max - min)) * 60;
  if (h < 0) h += 360;
  return h;
}

function hueShift(hex: string, shiftDeg: number): string {
  const { r, g, b } = hexToRgb(hex);
  const h = rgbToHue(r, g, b) + shiftDeg;
  const s = 1, l = 0.63;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hp < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hp < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hp < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const m = l - c / 2;
  const R = Math.round((r1 + m) * 255);
  const G = Math.round((g1 + m) * 255);
  const B = Math.round((b1 + m) * 255);
  return `rgb(${R}, ${G}, ${B})`;
}

export interface RenderState {
  win: boolean;
  winPhase: number;
  paused: boolean;
  levelProgress: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas 2D not supported');
    this.ctx = c;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(grid: Grid, player: Player, state: RenderState, now: number): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    ctx.fillStyle = '#0B0C1E';
    ctx.fillRect(0, 0, W, H);
    const offsetX = W / 2;
    const offsetY = H / 2;
    this.drawGrid(grid.size, offsetX, offsetY, state.paused, now);
    this.drawPillars(grid, offsetX, offsetY, state, now);
    this.drawTrail(player, state.levelProgress, now);
    this.drawPlayer(player);
    if (state.win) this.drawWinOverlay(state, W, H, now);
  }

  private drawGrid(size: number, ox: number, oy: number, paused: boolean, now: number): void {
    const ctx = this.ctx;
    const totalW = size * CELL_SIZE;
    const left = ox - totalW / 2;
    const top = oy - totalW / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(58, 60, 94, 0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      const x = left + i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + totalW);
      ctx.stroke();
      const y = top + i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + totalW, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private cellCenter(row: number, col: number, size: number, ox: number, oy: number): { x: number; y: number } {
    const totalW = size * CELL_SIZE;
    return {
      x: ox - totalW / 2 + (col + 0.5) * CELL_SIZE,
      y: oy - totalW / 2 + (row + 0.5) * CELL_SIZE,
    };
  }

  private drawPillars(grid: Grid, ox: number, oy: number, state: RenderState, now: number): void {
    const ctx = this.ctx;
    const size = grid.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const p = grid.getPillar(r, c)!;
        const { x, y } = this.cellCenter(r, c, size, ox, oy);
        let brightness = p.brightness;
        let flash = p.flashPhase;
        let winBoost = 1;
        if (state.win && state.winPhase > 0.5) {
          const t = (state.winPhase - 0.5) * 2;
          const burst = Math.sin(t * Math.PI);
          winBoost = 1 + burst * 0.5;
          if (!p.extinguished) brightness = 1;
        }
        let colorHex = PILLAR_COLOR_HEX[p.color as PillarColor];
        if (p.extinguished && !state.win) {
          colorHex = '#555555';
        } else {
          if (flash !== 0) {
            colorHex = hueShift(colorHex, flash);
          }
        }
        const rgb = hexToRgb(colorHex);
        const cr = rgb.r, cg = rgb.g, cb = rgb.b;
        const finalBright = Math.min(1.5, brightness * winBoost);
        const pillarColor = `rgba(${Math.round(cr * finalBright)}, ${Math.round(cg * finalBright)}, ${Math.round(cb * finalBright)}, 1)`;
        const glowColor = `rgba(${cr}, ${cg}, ${cb}, ${0.3 * finalBright})`;
        const extinguishedFinal = p.extinguished && !state.win;
        if (!extinguishedFinal || state.win) {
          ctx.save();
          const glowRadius = 25 * finalBright;
          const grd = ctx.createRadialGradient(x, y + 10, 2, x, y + 10, glowRadius);
          grd.addColorStop(0, glowColor);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(x, y + 10, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        const topY = y - 20;
        const botY = y + 20;
        const bodyR = 10;
        const pillarGrad = ctx.createLinearGradient(x - bodyR, topY, x + bodyR, topY);
        pillarGrad.addColorStop(0, `rgba(${Math.round(cr * 0.6 * finalBright)}, ${Math.round(cg * 0.6 * finalBright)}, ${Math.round(cb * 0.6 * finalBright)}, 1)`);
        pillarGrad.addColorStop(0.5, pillarColor);
        pillarGrad.addColorStop(1, `rgba(${Math.round(cr * 0.8 * finalBright)}, ${Math.round(cg * 0.8 * finalBright)}, ${Math.round(cb * 0.8 * finalBright)}, 1)`);
        ctx.fillStyle = pillarGrad;
        ctx.strokeStyle = `rgba(${Math.round(cr * finalBright)}, ${Math.round(cg * finalBright)}, ${Math.round(cb * finalBright)}, 0.9)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - bodyR, topY);
        ctx.lineTo(x - bodyR, botY);
        ctx.quadraticCurveTo(x - bodyR, botY + bodyR, x, botY + bodyR);
        ctx.quadraticCurveTo(x + bodyR, botY + bodyR, x + bodyR, botY);
        ctx.lineTo(x + bodyR, topY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(${Math.round(cr * 1.1 * finalBright)}, ${Math.round(cg * 1.1 * finalBright)}, ${Math.round(cb * 1.1 * finalBright)}, 1)`;
        ctx.beginPath();
        ctx.ellipse(x, topY, bodyR, bodyR * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (!extinguishedFinal && state.winPhase < 0.01) {
          const pulse = 1 + Math.sin(now / 400 + r * 0.5 + c * 0.3) * 0.05;
          ctx.globalAlpha = 0.4 * pulse;
          ctx.shadowColor = PILLAR_COLOR_HEX[p.color as PillarColor];
          ctx.shadowBlur = 12 * finalBright;
          ctx.strokeStyle = pillarColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(x, topY, bodyR + 1, bodyR * 0.4 + 1, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  private drawTrail(player: Player, levelProgress: number, now: number): void {
    const ctx = this.ctx;
    const trail = player.getTrail();
    const hueStart = 200;
    const hueEnd = 20;
    const hue = hueStart + (hueEnd - hueStart) * levelProgress;
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const next = trail[i + 1];
      const progress = i / Math.max(1, trail.length - 1);
      const curHue = hue + progress * 30;
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.9;
      const color = `hsla(${curHue}, 90%, 70%, ${p.alpha})`;
      ctx.fillStyle = color;
      ctx.shadowColor = `hsla(${curHue}, 100%, 60%, 0.8)`;
      ctx.shadowBlur = 10;
      const r = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (next) {
        ctx.globalAlpha = p.alpha * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    const { x, y } = player.renderPos;
    ctx.save();
    const outerR = 35;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawWinOverlay(state: RenderState, W: number, H: number, now: number): void {
    const ctx = this.ctx;
    const phase = Math.min(1, state.winPhase);
    ctx.save();
    if (phase < 0.6) {
      const t = phase / 0.6;
      const textAlpha = t;
      const fontSize = 40 + t * 60;
      const colorT = t;
      const startColor = { r: 255, g: 255, b: 255 };
      const endColor = { r: 255, g: 215, b: 0 };
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * colorT);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * colorT);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * colorT);
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.shadowBlur = 30;
      ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('通 关', W / 2, H / 2);
    }
    ctx.restore();
  }
}
