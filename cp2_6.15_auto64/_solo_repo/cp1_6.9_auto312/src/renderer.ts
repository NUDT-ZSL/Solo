import { GameMap, TILE_SIZE, TileType, GRID_WIDTH, GRID_HEIGHT } from './map';
import { Player, PLAYER_HEAD_RADIUS, PLAYER_BODY_LENGTH } from './player';
import { EntityManager, Particle, Mushroom, ShadowCreature, Rune, Teleport, ExtraLight } from './entities';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const VISION_RADIUS = 200;

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  offscreenCanvas: HTMLCanvasElement;
  offscreenCtx: CanvasRenderingContext2D;
  lightCanvas: HTMLCanvasElement;
  lightCtx: CanvasRenderingContext2D;
  time: number;
  gameOverAlpha: number;
  gameOver: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = CANVAS_WIDTH;
    this.offscreenCanvas.height = CANVAS_HEIGHT;
    const octx = this.offscreenCanvas.getContext('2d');
    if (!octx) throw new Error('Cannot get offscreen context');
    this.offscreenCtx = octx;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = CANVAS_WIDTH;
    this.lightCanvas.height = CANVAS_HEIGHT;
    const lctx = this.lightCanvas.getContext('2d');
    if (!lctx) throw new Error('Cannot get light context');
    this.lightCtx = lctx;

    this.time = 0;
    this.gameOverAlpha = 0;
    this.gameOver = false;
  }

  reset(): void {
    this.gameOverAlpha = 0;
    this.gameOver = false;
  }

  triggerGameOver(): void {
    this.gameOver = true;
  }

  setGameOverAlpha(a: number): void {
    this.gameOverAlpha = a;
  }

  render(dt: number, map: GameMap, player: Player, entities: EntityManager): void {
    this.time += dt;

    this.offscreenCtx.fillStyle = '#0a0c12';
    this.offscreenCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawMap(this.offscreenCtx, map);
    this.drawMushrooms(this.offscreenCtx, entities.mushrooms);
    this.drawRunes(this.offscreenCtx, entities.runes);
    this.drawTeleports(this.offscreenCtx, entities.teleports);
    this.drawCreatures(this.offscreenCtx, entities.creatures);
    this.drawPlayer(this.offscreenCtx, player);
    this.drawBullets(this.offscreenCtx, player);
    this.drawParticles(this.offscreenCtx, entities.particles);

    this.applyLighting(map, player, entities.extraLights);

    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    this.drawUI(this.ctx, player, entities);
    this.drawScreenFlash(this.ctx, entities);

    if (this.gameOver || this.gameOverAlpha > 0) {
      this.ctx.fillStyle = `rgba(0,0,0,${this.gameOverAlpha})`;
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  private drawMap(ctx: CanvasRenderingContext2D, map: GameMap): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = map.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TileType.FLOOR) {
          ctx.fillStyle = '#1a2030';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = 'rgba(30,50,70,0.3)';
          for (let i = 0; i < 3; i++) {
            const sx = px + ((x * 7 + i * 13) % TILE_SIZE);
            const sy = py + ((y * 11 + i * 17) % TILE_SIZE);
            ctx.fillRect(sx, sy, 2, 2);
          }
        } else {
          const noise = map.wallNoise[y][x];
          const baseColor = Math.floor(60 * noise);
          const g = Math.floor(45 * noise);
          const b = Math.floor(30 * noise);
          ctx.fillStyle = `rgb(${baseColor + 20},${g + 15},${b + 5})`;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          ctx.fillStyle = `rgba(0,0,0,${0.3 + noise * 0.2})`;
          const dots = Math.floor(3 + noise * 4);
          for (let i = 0; i < dots; i++) {
            const sx = px + ((x * 17 + y * 13 + i * 23) % (TILE_SIZE - 4)) + 2;
            const sy = py + ((x * 19 + y * 29 + i * 31) % (TILE_SIZE - 4)) + 2;
            const ss = 1 + ((i + x + y) % 3);
            ctx.fillRect(sx, sy, ss, ss);
          }

          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }

    for (const moss of map.mossPatches) {
      const pulse = 0.7 + Math.sin(this.time * 1.5 + moss.x * 0.1) * 0.3;
      const grad = ctx.createRadialGradient(moss.x, moss.y, 0, moss.x, moss.y, moss.size);
      grad.addColorStop(0, `rgba(80, 180, 140, ${0.45 * pulse})`);
      grad.addColorStop(0.6, `rgba(60, 140, 120, ${0.2 * pulse})`);
      grad.addColorStop(1, 'rgba(40, 100, 100, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(moss.x, moss.y, moss.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMushrooms(ctx: CanvasRenderingContext2D, mushrooms: Mushroom[]): void {
    for (const m of mushrooms) {
      if (m.collected) continue;
      const pulse = 0.7 + Math.sin(m.pulsePhase) * 0.3;

      const glowGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 18);
      glowGrad.addColorStop(0, `rgba(120, 255, 180, ${0.35 * pulse})`);
      glowGrad.addColorStop(0.5, `rgba(80, 220, 150, ${0.15 * pulse})`);
      glowGrad.addColorStop(1, 'rgba(60, 200, 120, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(140, 100, 70, ${0.9})`;
      ctx.fillRect(m.x - 2, m.y + 2, 4, 6);

      ctx.fillStyle = `rgba(80, 230, 140, ${0.95})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y - 1, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(160, 255, 200, ${0.9})`;
      ctx.beginPath();
      ctx.arc(m.x - 2, m.y - 2, 1.5, 0, Math.PI * 2);
      ctx.arc(m.x + 2, m.y - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCreatures(ctx: CanvasRenderingContext2D, creatures: ShadowCreature[]): void {
    for (const c of creatures) {
      if (!c.alive) continue;

      const jx = c.jitterX;
      const jy = c.jitterY;
      const drawX = c.x + jx;
      const drawY = c.y + jy;

      for (let layer = 3; layer >= 0; layer--) {
        const lr = c.radius + layer * 3;
        const la = layer === 0 ? 0.75 : 0.15 + (3 - layer) * 0.05;
        const wob = Math.sin(c.wobblePhase * (2 + layer * 0.5)) * 2;
        const grad = ctx.createRadialGradient(drawX + wob, drawY - wob, 0, drawX + wob, drawY - wob, lr);
        grad.addColorStop(0, `rgba(10, 5, 20, ${la})`);
        grad.addColorStop(0.7, `rgba(15, 10, 30, ${la * 0.6})`);
        grad.addColorStop(1, 'rgba(5, 0, 15, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX + wob, drawY - wob, lr, 0, Math.PI * 2);
        ctx.fill();
      }

      const eyePulse = 0.6 + Math.sin(this.time * 4 + c.x) * 0.4;
      ctx.fillStyle = `rgba(200, 40, 80, ${eyePulse})`;
      ctx.beginPath();
      ctx.arc(drawX - c.radius * 0.3, drawY - c.radius * 0.2, 2, 0, Math.PI * 2);
      ctx.arc(drawX + c.radius * 0.3, drawY - c.radius * 0.2, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 100, 130, ${eyePulse})`;
      ctx.beginPath();
      ctx.arc(drawX - c.radius * 0.3, drawY - c.radius * 0.2, 0.8, 0, Math.PI * 2);
      ctx.arc(drawX + c.radius * 0.3, drawY - c.radius * 0.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRunes(ctx: CanvasRenderingContext2D, runes: Rune[]): void {
    for (const r of runes) {
      const intensity = r.glowIntensity;

      if (intensity > 0.25) {
        const glowGrad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 40);
        glowGrad.addColorStop(0, `rgba(80, 160, 255, ${intensity * 0.4})`);
        glowGrad.addColorStop(1, 'rgba(60, 120, 220, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(r.x, r.y);
      const rotPulse = r.activated ? this.time * 0.5 : 0;
      ctx.rotate(rotPulse);
      ctx.strokeStyle = `rgba(100, 180, 255, ${Math.min(1, intensity)})`;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 12;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(-5, 5);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTeleports(ctx: CanvasRenderingContext2D, teleports: Teleport[]): void {
    for (const tp of teleports) {
      if (!tp.active) continue;

      ctx.save();
      ctx.translate(tp.x, tp.y);

      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, tp.radius + 10);
      glowGrad.addColorStop(0, 'rgba(180, 80, 255, 0.5)');
      glowGrad.addColorStop(0.6, 'rgba(140, 50, 220, 0.25)');
      glowGrad.addColorStop(1, 'rgba(100, 30, 180, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, tp.radius + 10, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        ctx.rotate(tp.rotation + i * (Math.PI * 2 / 3));
        ctx.strokeStyle = `rgba(200, 100, 255, ${0.6 - i * 0.15})`;
        ctx.lineWidth = 2.5 - i * 0.6;
        ctx.beginPath();
        const spiralR = tp.radius - i * 4;
        for (let a = 0; a < Math.PI * 1.5; a += 0.1) {
          const r = spiralR * (a / (Math.PI * 1.5));
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(220, 160, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
    const headX = player.x;
    const headY = player.y - PLAYER_BODY_LENGTH;
    const color = player.getLanternColor();
    const glowR = player.getLanternGlowRadius();
    const pulseAmt = player.getPulseAmount();

    const bodyGrad = ctx.createLinearGradient(player.x, player.y, player.x, headY);
    bodyGrad.addColorStop(0, 'rgba(120, 90, 70, 0.9)');
    bodyGrad.addColorStop(0.5, 'rgba(180, 140, 100, 0.8)');
    bodyGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
    ctx.strokeStyle = bodyGrad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(100, 80, 60, 0.85)';
    ctx.lineWidth = 1.5;
    const armSway = Math.sin(this.time * 6) * (Math.abs(player.displayVx) + Math.abs(player.displayVy) > 5 ? 4 : 1);
    ctx.beginPath();
    ctx.moveTo(player.x - 6, player.y - 8 + armSway);
    ctx.lineTo(player.x, player.y - 14);
    ctx.lineTo(player.x + 6, player.y - 8 - armSway);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(player.x - 5, player.y);
    ctx.lineTo(player.x - 3, player.y + 5);
    ctx.moveTo(player.x + 5, player.y);
    ctx.lineTo(player.x + 3, player.y + 5);
    ctx.stroke();

    for (let g = 4; g >= 0; g--) {
      const gr = glowR + g * 12;
      const ga = 0.08 + (4 - g) * 0.05 + pulseAmt * 0.04;
      const glowGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, gr);
      glowGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${ga})`);
      glowGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g - 30}, ${color.b - 40}, ${ga * 0.5})`);
      glowGrad.addColorStop(1, `rgba(${color.r - 50}, ${color.g - 100}, 0, 0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(headX, headY, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    const headGrad = ctx.createRadialGradient(headX - 3, headY - 3, 0, headX, headY, PLAYER_HEAD_RADIUS);
    headGrad.addColorStop(0, `rgba(255, ${Math.min(255, color.g + 40)}, ${Math.min(255, color.b + 40)}, 1)`);
    headGrad.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, 0.95)`);
    headGrad.addColorStop(1, `rgba(${color.r - 40}, ${color.g - 80}, ${Math.max(0, color.b - 60)}, 0.7)`);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(headX, headY, PLAYER_HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(200, 160, 100, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(headX, headY, PLAYER_HEAD_RADIUS + 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(headX - 3, headY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const innerPulse = 0.7 + pulseAmt * 0.6;
    ctx.fillStyle = `rgba(255, 240, 200, ${innerPulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(headX, headY + 1, 3 + pulseAmt, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBullets(ctx: CanvasRenderingContext2D, player: Player): void {
    for (const b of player.bullets) {
      if (!b.alive) continue;

      for (let i = b.trail.length - 1; i >= 0; i--) {
        const t = b.trail[i];
        const alpha = (1 - i / b.trail.length) * 0.5;
        const size = b.radius * (1 - i / b.trail.length * 0.5);
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, size);
        grad.addColorStop(0, `rgba(255, 220, 120, ${alpha})`);
        grad.addColorStop(1, 'rgba(255, 180, 60, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius + 6);
      grad.addColorStop(0, 'rgba(255, 250, 200, 1)');
      grad.addColorStop(0.3, 'rgba(255, 220, 120, 0.8)');
      grad.addColorStop(1, 'rgba(255, 180, 60, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fffbe0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + lifeRatio * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private applyLighting(map: GameMap, player: Player, extraLights: ExtraLight[]): void {
    this.lightCtx.globalCompositeOperation = 'source-over';
    this.lightCtx.fillStyle = 'rgba(0,0,0,1)';
    this.lightCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.lightCtx.globalCompositeOperation = 'destination-out';

    const headX = player.x;
    const headY = player.y - PLAYER_BODY_LENGTH;
    const baseR = VISION_RADIUS;

    const mainGrad = this.lightCtx.createRadialGradient(headX, headY, 0, headX, headY, baseR);
    mainGrad.addColorStop(0, 'rgba(0,0,0,1)');
    mainGrad.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    mainGrad.addColorStop(0.85, 'rgba(0,0,0,0.35)');
    mainGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.lightCtx.fillStyle = mainGrad;
    this.lightCtx.beginPath();
    this.lightCtx.arc(headX, headY, baseR, 0, Math.PI * 2);
    this.lightCtx.fill();

    for (const el of extraLights) {
      const lifeRatio = el.life / el.maxLife;
      const alpha = Math.min(1, lifeRatio * 1.4);
      const grad = this.lightCtx.createRadialGradient(el.x, el.y, 0, el.x, el.y, el.radius + baseR * 0.3);
      grad.addColorStop(0, `rgba(0,0,0,${0.7 * alpha})`);
      grad.addColorStop(0.5, `rgba(0,0,0,${0.4 * alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      this.lightCtx.fillStyle = grad;
      this.lightCtx.beginPath();
      this.lightCtx.arc(el.x, el.y, el.radius + baseR * 0.3, 0, Math.PI * 2);
      this.lightCtx.fill();
    }

    this.lightCtx.globalCompositeOperation = 'source-over';

    this.offscreenCtx.globalCompositeOperation = 'destination-in';
    this.offscreenCtx.drawImage(this.lightCanvas, 0, 0);
    this.offscreenCtx.globalCompositeOperation = 'source-over';

    const warmColor = player.getLanternColor();
    const warmGrad = this.offscreenCtx.createRadialGradient(headX, headY, 0, headX, headY, baseR);
    warmGrad.addColorStop(0, `rgba(${warmColor.r}, ${warmColor.g}, ${warmColor.b}, 0.08)`);
    warmGrad.addColorStop(0.5, `rgba(${warmColor.r}, ${warmColor.g - 50}, 0, 0.04)`);
    warmGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.offscreenCtx.fillStyle = warmGrad;
    this.offscreenCtx.beginPath();
    this.offscreenCtx.arc(headX, headY, baseR, 0, Math.PI * 2);
    this.offscreenCtx.fill();
  }

  private drawUI(ctx: CanvasRenderingContext2D, player: Player, entities: EntityManager): void {
    const barX = 16;
    const barY = 14;
    const barW = 200;
    const barH = 16;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    this.roundRect(ctx, barX - 1, barY - 1, barW + 2, barH + 2, 4);
    ctx.fill();

    const ratio = Math.max(0, Math.min(1, player.lanternTime / player.maxLanternTime));
    const fillW = Math.floor(barW * ratio);

    const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    const r = Math.floor(255 * (1 - ratio));
    const g = Math.floor(80 + 175 * ratio);
    const b = 40;
    fillGrad.addColorStop(0, `rgb(${Math.min(255, 100 + r * 0.6)}, ${g}, ${b})`);
    fillGrad.addColorStop(1, `rgb(${Math.min(255, 200 + r * 0.2)}, ${Math.min(255, 140 + g * 0.3)}, ${b + 40})`);
    ctx.fillStyle = fillGrad;
    if (fillW > 0) {
      this.roundRect(ctx, barX, barY, fillW, barH, 3);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, barX, barY, barW, barH, 3);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const timeText = `${player.lanternTime.toFixed(1)}s`;
    ctx.fillText(timeText, barX + barW / 2, barY + barH / 2 + 4);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`🍄 菌菇: ${player.collectedMushrooms}`, barX, barY + barH + 18);

    const bullets = player.getAvailableBullets();
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillText(`光弹:`, CANVAS_WIDTH - 16 - bullets * 18 - 42, CANVAS_HEIGHT - 20);
    for (let i = 0; i < bullets && i < 20; i++) {
      this.drawMiniLantern(ctx, CANVAS_WIDTH - 16 - (bullets - i) * 18, CANVAS_HEIGHT - 24);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`💀 ${player.defeatedCreatures}`, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 44);
  }

  private drawMiniLantern(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const grad = ctx.createRadialGradient(x + 6, y + 6, 0, x + 6, y + 6, 10);
    grad.addColorStop(0, 'rgba(255, 220, 120, 0.7)');
    grad.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x + 6, y + 6, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd070';
    ctx.beginPath();
    ctx.arc(x + 6, y + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a07030';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawScreenFlash(ctx: CanvasRenderingContext2D, entities: EntityManager): void {
    const sf = entities.screenFlash;
    if (sf.type && sf.life > 0) {
      const alpha = (sf.life / sf.maxLife) * 0.35;
      let color: string;
      switch (sf.type) {
        case 'green': color = `rgba(100, 255, 150, ${alpha})`; break;
        case 'yellow': color = `rgba(255, 220, 100, ${alpha})`; break;
        case 'white': color = `rgba(255, 255, 255, ${alpha * 1.8})`; break;
        default: return;
      }
      const grad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.6, color.replace(/[\d.]+\)$/, `${alpha * 0.4})`));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
