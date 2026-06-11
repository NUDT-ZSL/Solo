import type { AudioParams } from './audioProcessor';
import type { CreatureState } from './creature';
import type { MazeState, Maze } from './maze';

export interface RenderState {
  audio: AudioParams;
  creature: CreatureState;
  maze: MazeState;
  mazeRef: Maze;
  elapsed: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private cellSize = 80;
  private mazeSize = 9;
  private offsetX = 0;
  private offsetY = 0;
  private lastShake = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(window.innerWidth - 40, window.innerHeight - 40, 1000);
    const size = Math.max(540, w);
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cellSize = (size - 40) / this.mazeSize;
    this.offsetX = 20;
    this.offsetY = 20;
  }

  render(state: RenderState): void {
    const { ctx } = this;
    const cs = this.cellSize;
    const now = performance.now();

    this.drawBackground(ctx, state.elapsed);

    ctx.save();
    if (now - this.lastShake < 150) {
      const t = (now - this.lastShake) / 150;
      const s = (1 - t) * 6;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    this.drawMaze(ctx, state, now);
    this.drawFoods(ctx, state, now);
    this.drawParticles(ctx, state);
    this.drawCreature(ctx, state, now);

    ctx.restore();

    this.drawHUD(ctx, state);
  }

  notifyShake(): void {
    this.lastShake = performance.now();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, t: number): void {
    const { width: w, height: h } = this.canvas;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, '#1C1C5E');
    grad.addColorStop(1, '#0A0A2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.5 + t * 4) % (w + 40)) - 20;
      const sy = ((i * 89.3 + t * 1.2) % (h + 40)) - 20;
      const r = 0.6 + (i % 5) * 0.25;
      ctx.fillStyle = i % 7 === 0 ? '#CE93D8' : '#4FC3F7';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMaze(ctx: CanvasRenderingContext2D, state: RenderState, now: number): void {
    const cs = this.cellSize;
    const maze = state.maze;
    for (let y = 0; y < this.mazeSize; y++) {
      for (let x = 0; x < this.mazeSize; x++) {
        const cell = maze.grid[y][x];
        const px = this.offsetX + x * cs;
        const py = this.offsetY + y * cs;

        if (cell === 0) {
          ctx.strokeStyle = 'rgba(79, 195, 247, 0.18)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cs, cs);
        } else {
          const ws = state.mazeRef.getWallState(x, y);
          const isTransparent = ws ? now < ws.transparentUntil : false;
          const isFlashing = ws ? now < ws.flashUntil : false;

          let alpha = 0.6;
          let color: [number, number, number] = [79, 195, 247];
          let glow = 0;
          let skipDraw = false;

          if (isFlashing) {
            const t = (ws!.flashUntil - now) / 300;
            alpha = 0.5 + t * 0.4;
            color = [255, 82, 82];
            glow = 20 * t;
          }
          if (isTransparent) {
            const remaining = ws!.transparentUntil - now;
            const totalDuration = 2000;
            const fadeInLen = 200;
            const fadeOutLen = 300;

            let factor: number;
            if (remaining > totalDuration - fadeInLen) {
              factor = (totalDuration - remaining) / fadeInLen;
            } else if (remaining < fadeOutLen) {
              factor = remaining / fadeOutLen;
            } else {
              factor = 1;
            }

            alpha = 0.03 + 0.57 * (1 - factor);
            color = [206, 147, 216];
            glow = 16 * factor;

            if (factor > 0.95) {
              skipDraw = true;
            }
          }

          if (skipDraw) {
            ctx.save();
            ctx.strokeStyle = 'rgba(206, 147, 216, 0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(px + 4, py + 4, cs - 8, cs - 8);
            ctx.setLineDash([]);
            ctx.restore();
            continue;
          }

          const [r, g, b] = color;
          ctx.save();
          ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
          ctx.shadowBlur = glow;
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.35})`;
          ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
          ctx.restore();
        }
      }
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(79, 195, 247, 0.6)';
    ctx.shadowBlur = 14;
    ctx.strokeRect(this.offsetX, this.offsetY, cs * this.mazeSize, cs * this.mazeSize);
    ctx.restore();
  }

  private drawFoods(ctx: CanvasRenderingContext2D, state: RenderState, _now: number): void {
    const cs = this.cellSize;
    for (const f of state.maze.foods) {
      const px = this.offsetX + f.gx * cs + cs / 2;
      const py = this.offsetY + f.gy * cs + cs / 2;
      const baseR = cs * 0.18;
      const pulse = 1 + Math.sin(f.pulse) * 0.18;
      const r = baseR * pulse;

      let color = '#FF5252';
      let glow = 'rgba(255, 82, 82, 0.9)';
      if (f.color === 'blue') { color = '#448AFF'; glow = 'rgba(68, 138, 255, 0.9)'; }
      if (f.color === 'gold') { color = '#FFD740'; glow = 'rgba(255, 215, 64, 0.9)'; }

      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 22;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
      g.addColorStop(0, color);
      g.addColorStop(0.5, color + '80');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffffcc';
      ctx.beginPath();
      ctx.arc(px - r * 0.25, py - r * 0.25, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const cs = this.cellSize;
    const parts = state.creature.particles;
    const n = parts.length;
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      const px = this.offsetX + p.x * cs + cs / 2;
      const py = this.offsetY + p.y * cs + cs / 2;
      const t = Math.max(0, p.life / p.maxLife);
      const r = (cs * 0.14) * (0.4 + t * 0.6);
      ctx.save();
      ctx.globalAlpha = t * 0.85;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12 * t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCreature(ctx: CanvasRenderingContext2D, state: RenderState, _now: number): void {
    const cs = this.cellSize;
    const c = state.creature;
    const px = this.offsetX + c.x * cs + cs / 2;
    const py = this.offsetY + c.y * cs + cs / 2;

    const breathe = 1 + Math.sin(c.pulsePhase) * 0.1;
    const baseR = (c.size / 2) * breathe;
    const { h, s, l } = c.color;
    const colorStr = `hsl(${h} ${s}% ${l}%)`;
    const colorBright = `hsl(${h} ${s}% ${Math.min(90, l + 20)}%)`;
    const colorDeep = `hsl(${h} ${s}% ${Math.max(20, l - 20)}%)`;

    ctx.save();

    if (c.isSlowed) {
      ctx.shadowColor = '#FF5252';
      ctx.shadowBlur = 30;
      const slowPulse = 0.4 + Math.sin(performance.now() / 50) * 0.3;
      ctx.globalAlpha = 0.5 + slowPulse * 0.5;
    } else {
      ctx.shadowColor = colorStr;
      ctx.shadowBlur = 36 + c.evolutionLevel * 6;
    }

    const halo = ctx.createRadialGradient(px, py, baseR * 0.5, px, py, baseR * 3);
    if (c.isSlowed) {
      halo.addColorStop(0, 'rgba(255, 82, 82, 0.5)');
      halo.addColorStop(0.5, 'rgba(255, 82, 82, 0.12)');
      halo.addColorStop(1, 'transparent');
    } else {
      halo.addColorStop(0, `hsla(${h},${s}%,${l}%,0.55)`);
      halo.addColorStop(0.5, `hsla(${h},${s}%,${l}%,0.18)`);
      halo.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, baseR * 3, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(
      px - baseR * 0.35, py - baseR * 0.35, baseR * 0.1,
      px, py, baseR
    );
    if (c.isSlowed) {
      body.addColorStop(0, '#FF8A80');
      body.addColorStop(0.55, '#FF5252');
      body.addColorStop(1, '#B71C1C');
    } else {
      body.addColorStop(0, colorBright);
      body.addColorStop(0.55, colorStr);
      body.addColorStop(1, colorDeep);
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(px, py, baseR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (c.evolutionLevel > 0) {
      ctx.save();
      const spiralColor = c.isSlowed
        ? 'rgba(255, 138, 128, 0.85)'
        : `hsla(${h},${s}%,${l}%,0.85)`;
      ctx.strokeStyle = spiralColor;
      ctx.lineWidth = 1.6 + c.evolutionLevel * 0.3;
      ctx.shadowColor = c.isSlowed ? '#FF5252' : colorStr;
      ctx.shadowBlur = 10 + c.evolutionLevel * 3;
      const maxSpirals = Math.min(c.evolutionLevel, 5);
      for (let i = 0; i < maxSpirals; i++) {
        ctx.beginPath();
        const rr = baseR * (0.5 + i * 0.16);
        const rot = c.pulsePhase + i * 0.7;
        const petalCount = 3 + i;
        for (let a = 0; a <= Math.PI * 2; a += 0.03) {
          const spiralArm = Math.sin(a * petalCount + rot) * (baseR * 0.1);
          const r = rr + spiralArm;
          const x = px + Math.cos(a + rot * 0.25) * r;
          const y = py + Math.sin(a + rot * 0.25) * r;
          if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = c.isSlowed ? 'rgba(255,200,200,0.85)' : 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(px - baseR * 0.3, py - baseR * 0.35, baseR * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHUD(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pad = 24;
    const cardW = Math.max(260, this.canvas.width * 0.28);
    const cardH = 208;
    const x = pad;
    const y = pad;
    const c = state.creature;
    const a = state.audio;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 46, 0.72)';
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(79, 195, 247, 0.35)';
    ctx.shadowBlur = 18;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    let cy = y + 24;
    drawHudLabel(ctx, x + 18, cy, 'AUDIO · 音频参数');
    cy += 22;
    this.drawBar(ctx, x + 18, cy, cardW - 36, '响度 LOUD', a.loudness / 100, `${a.loudness.toFixed(0)}`, '#4FC3F7');
    cy += 22;
    const freqNorm = Math.min(1, Math.max(0, (a.frequency - 60) / 2000));
    const hue = freqNorm < 0.33 ? 300 : freqNorm < 0.66 ? 190 : 45;
    this.drawBar(ctx, x + 18, cy, cardW - 36, '频率 FREQ', freqNorm, `${a.frequency.toFixed(0)} Hz`, `hsl(${hue} 90% 65%)`);
    cy += 22;
    this.drawBar(ctx, x + 18, cy, cardW - 36, '节奏 BPM', a.bpm / 240, `${a.bpm.toFixed(0)}`, '#CE93D8');
    cy += 28;

    drawHudLabel(ctx, x + 18, cy, 'LIFE · 生命');
    cy += 18;
    this.drawHpBar(ctx, x + 18, cy, cardW - 36, c.hp / 100, c.hp.toFixed(0));
    cy += 34;

    const mz = state.maze;
    const counts = c.evolutionCounts;
    const dotY = cy + 14;
    drawFoodBadge(ctx, x + 18, dotY, '#FF5252', counts.red);
    drawFoodBadge(ctx, x + 74, dotY, '#448AFF', counts.blue);
    drawFoodBadge(ctx, x + 130, dotY, '#FFD740', counts.gold);

    ctx.font = "500 12px 'Rajdhani', sans-serif";
    ctx.fillStyle = 'rgba(224, 247, 250, 0.75)';
    ctx.fillText(`总计 ${mz.totalFoodCollected}`, x + 186, dotY + 4);

    this.drawEvoBadge(ctx, x + cardW - 66, cy + 2, c.evolutionLevel);
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, t: number, value: string, color: string): void {
    const barH = 12;
    const labelW = 86;
    ctx.save();
    ctx.font = "600 10px 'Orbitron', 'Rajdhani', sans-serif";
    ctx.fillStyle = 'rgba(224, 247, 250, 0.65)';
    ctx.fillText(label, x, y + 8);
    ctx.restore();

    const bx = x + labelW + 6;
    const bw = w - labelW - 56;
    ctx.save();
    ctx.fillStyle = 'rgba(79, 195, 247, 0.1)';
    roundRect(ctx, bx, y, bw, barH, 4);
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    roundRect(ctx, bx, y, Math.max(0, bw * t), barH, 4);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = "700 10px 'Orbitron', monospace";
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.fillText(value, x + w, y + 9);
    ctx.restore();
  }

  private drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, value: string): void {
    const h = 14;
    const hue = 120 * t;
    const color = `hsl(${hue} 80% 55%)`;
    const colorEnd = `hsl(${hue} 90% 40%)`;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, x, y, w, h, 7);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(1, colorEnd);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, Math.max(0, w * t), h, 7);
    ctx.fill();

    ctx.font = "700 10px 'Orbitron', monospace";
    ctx.fillStyle = '#ffffffee';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fillText(`HP ${value}`, x + w / 2, y + 10);
    ctx.restore();
  }

  private drawEvoBadge(ctx: CanvasRenderingContext2D, x: number, y: number, level: number): void {
    const r = 22;
    const cx = x + r;
    const cy = y + r;
    ctx.save();
    ctx.shadowColor = '#FFD740';
    ctx.shadowBlur = 14 + Math.sin(performance.now() / 300) * 4;
    const g = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, r);
    g.addColorStop(0, '#FFF9C4');
    g.addColorStop(0.4, '#FFD740');
    g.addColorStop(1, '#FF8F00');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#3E2723';
    ctx.font = "900 14px 'Orbitron', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(`Lv${level}`, cx, cy + 1);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawHudLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  ctx.save();
  ctx.font = "700 11px 'Orbitron', sans-serif";
  ctx.fillStyle = 'rgba(79, 195, 247, 0.9)';
  ctx.letterSpacing = '2px';
  ctx.shadowColor = 'rgba(79, 195, 247, 0.6)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawFoodBadge(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, count: number): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 12, y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffffee';
  ctx.font = "800 11px 'Orbitron', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText(String(count), x + 12, y + 1);
  ctx.restore();
}
