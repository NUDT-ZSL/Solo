import { GameState, Star, Particle, Trail, Shard } from './game';
import { Direction } from './rhythm';

interface PauseUIState {
  hovered: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr: number = 1;
  private starShape: { x: number; y: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.generateStarShape(18, 5);
  }

  private generateStarShape(outerRadius: number, points: number): void {
    const innerRadius = outerRadius * 0.42;
    const shape: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      shape.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    this.starShape = shape;
  }

  public resize(width: number, height: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public render(state: GameState, pauseUI: PauseUIState): void {
    const ctx = this.ctx;
    const w = state.canvasWidth;
    const h = state.canvasHeight;

    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    this.drawBackground(w, h);
    this.drawCrosshair(w / 2, h / 2, state.pulsePhase);
    this.drawTrails(state.trails);
    this.drawStars(state.stars);
    this.drawShards(state.shards);
    this.drawParticles(state.particles);
    this.drawScore(state.score);
    this.drawCombo(state.combo, state.comboAnim);
    this.drawPauseButton(w - 48, h - 48, pauseUI.hovered, state.paused);
    this.drawHitGrade(state, performance.now());
    this.drawFlashOverlay(state.flashAlpha, state.flashColor, w, h);
    if (state.paused) {
      this.drawPauseOverlay(w, h);
    }
    ctx.restore();
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }

  private drawCrosshair(cx: number, cy: number, phase: number): void {
    const ctx = this.ctx;
    const t = phase;
    for (let i = 0; i < 3; i++) {
      const localT = ((t + i * 0.33) % 1.0);
      const r = 8 + localT * 50;
      const alpha = (1 - localT) * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(136, 204, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 230, 255, 0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(136, 204, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawStars(stars: Star[]): void {
    const ctx = this.ctx;
    for (const star of stars) {
      if (star.isMiss && star.fadeOut <= 0) continue;
      ctx.save();
      ctx.translate(star.x, star.y);
      const alpha = star.isMiss ? star.fadeOut : 1;
      const color = star.isMiss ? '#888888' : star.color;
      ctx.shadowColor = color;
      ctx.shadowBlur = star.isMiss ? 5 : 20;
      ctx.beginPath();
      for (let i = 0; i < this.starShape.length; i++) {
        const pt = this.starShape[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fillStyle = this.hexWithAlpha(color, alpha);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = this.hexWithAlpha('#ffffff', alpha * 0.6);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = this.hexWithAlpha(p.color, alpha);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10 * alpha;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawTrails(trails: Trail[]): void {
    const ctx = this.ctx;
    for (const t of trails) {
      const alpha = t.life / t.maxLife;
      const r = 40 * (1 - alpha) + 10;
      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
      grad.addColorStop(0, this.hexWithAlpha(t.color, alpha * 0.9));
      grad.addColorStop(0.5, this.hexWithAlpha(t.color, alpha * 0.4));
      grad.addColorStop(1, this.hexWithAlpha(t.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShards(shards: Shard[]): void {
    const ctx = this.ctx;
    for (const s of shards) {
      const alpha = s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      ctx.fillStyle = this.hexWithAlpha(s.color, alpha);
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12 * alpha;
      ctx.beginPath();
      ctx.moveTo(s.size * 1.6, 0);
      ctx.lineTo(-s.size, -s.size * 0.7);
      ctx.lineTo(-s.size * 0.5, 0);
      ctx.lineTo(-s.size, s.size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  private drawScore(score: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 32px "Courier New", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(136, 204, 255, 0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(`${score.toLocaleString()}`, 28, 28);
    ctx.font = '14px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(170, 200, 255, 0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('得分 SCORE', 28, 64);
    ctx.restore();
  }

  private drawCombo(combo: number, animScale: number): void {
    const ctx = this.ctx;
    const x = this.canvas.width / this.dpr - 28;
    const y = 28;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.translate(x, y + 10);
    ctx.scale(animScale, animScale);
    ctx.font = 'bold 44px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(255, 220, 120, 0.98)';
    ctx.shadowColor = 'rgba(255, 180, 60, 0.85)';
    ctx.shadowBlur = 12;
    ctx.fillText(`${combo}`, 0, 0);
    ctx.font = 'bold 18px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('COMBO', 0, 48);
    if (combo >= 10) {
      ctx.font = '12px "Courier New", Consolas, monospace';
      let tierText = '';
      let tierColor = '#66aaff';
      if (combo >= 30) {
        tierText = '★★★ 黄金闪耀';
        tierColor = '#ffd700';
      } else if (combo >= 20) {
        tierText = '★★ 紫电分裂';
        tierColor = '#cc66ff';
      } else {
        tierText = '★ 蓝色流光';
        tierColor = '#66aaff';
      }
      ctx.fillStyle = tierColor;
      ctx.shadowColor = tierColor;
      ctx.shadowBlur = 10;
      ctx.fillText(tierText, 0, 72);
    }
    ctx.restore();
  }

  private drawPauseButton(x: number, y: number, hovered: boolean, paused: boolean): void {
    const ctx = this.ctx;
    const r = 28;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const alpha = hovered ? 0.55 : 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const barW = 5;
    const barH = 16;
    const gap = 6;
    ctx.fillStyle = 'rgba(20, 30, 60, 0.9)';
    if (paused) {
      ctx.beginPath();
      ctx.moveTo(-barH / 2 + 2, -barH / 2);
      ctx.lineTo(barH / 2, 0);
      ctx.lineTo(-barH / 2 + 2, barH / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-gap / 2 - barW, -barH / 2, barW, barH);
      ctx.fillRect(gap / 2, -barH / 2, barW, barH);
    }
    ctx.restore();
  }

  private drawPauseOverlay(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(136, 204, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 60px "Courier New", Consolas, monospace';
    ctx.fillText('暂 停', w / 2, h / 2 - 30);
    ctx.font = '20px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(170, 200, 255, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText('点击右下角按钮或按 空格键 继续', w / 2, h / 2 + 30);
    ctx.restore();
  }

  private drawFlashOverlay(alpha: number, color: string, w: number, h: number): void {
    if (alpha <= 0.001) return;
    const ctx = this.ctx;
    ctx.fillStyle = this.hexWithAlpha(color, alpha);
    ctx.fillRect(0, 0, w, h);
  }

  private drawHitGrade(state: GameState, now: number): void {
    if (!state.lastHitGrade) return;
    const elapsed = now - state.lastHitTime;
    if (elapsed > 600) return;
    const t = elapsed / 600;
    const alpha = 1 - t;
    const offset = 50 * t;
    const ctx = this.ctx;
    const cx = state.canvasWidth / 2;
    const cy = state.canvasHeight / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(cx, cy - 80 - offset);
    let text = '';
    let color = '#ffffff';
    let fontSize = 44;
    switch (state.lastHitGrade) {
      case 'perfect':
        text = 'PERFECT!';
        color = '#ffd700';
        fontSize = 52;
        break;
      case 'good':
        text = 'GOOD';
        color = '#88ff88';
        break;
      case 'miss':
        text = 'MISS';
        color = '#ff6666';
        fontSize = 38;
        break;
    }
    ctx.font = `bold ${fontSize}px "Courier New", Consolas, monospace`;
    ctx.fillStyle = this.hexWithAlpha(color, alpha);
    ctx.shadowColor = color;
    ctx.shadowBlur = 16 * alpha;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  private hexWithAlpha(hex: string, alpha: number): string {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
      return hex;
    }
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

export type { PauseUIState };
