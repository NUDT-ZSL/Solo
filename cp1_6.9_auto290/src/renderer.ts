import { Player } from './player';
import { GameMap } from './map';
import { ParticleSystem, Particle } from './particle';

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VictoryState {
  active: boolean;
  progress: number;
  candleRise: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private readonly ASPECT_RATIO = 16 / 9;
  private viewportWidth: number = 1280;
  private viewportHeight: number = 720;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private dirtyRects: { x: number; y: number; w: number; h: number }[] = [];
  private lastPlayerX: number = -1;
  private lastPlayerY: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    let vw = cw;
    let vh = cw / this.ASPECT_RATIO;

    if (vh > ch) {
      vh = ch;
      vw = ch * this.ASPECT_RATIO;
    }

    this.viewportWidth = Math.floor(vw);
    this.viewportHeight = Math.floor(vh);

    const scale = window.devicePixelRatio || 1;
    this.canvas.width = this.viewportWidth * scale;
    this.canvas.height = this.viewportHeight * scale;
    this.canvas.style.width = this.viewportWidth + 'px';
    this.canvas.style.height = this.viewportHeight + 'px';
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);

    this.offscreenCanvas.width = this.viewportWidth;
    this.offscreenCanvas.height = this.viewportHeight;
  }

  getViewportWidth(): number { return this.viewportWidth; }
  getViewportHeight(): number { return this.viewportHeight; }

  computeCamera(player: Player, map: GameMap): Camera {
    let camX = player.state.x - this.viewportWidth / 2;
    let camY = player.state.y - this.viewportHeight / 2;

    camX = Math.max(0, Math.min(map.width - this.viewportWidth, camX));
    camY = Math.max(0, Math.min(map.height - this.viewportHeight, camY));

    if (map.width < this.viewportWidth) {
      camX = (map.width - this.viewportWidth) / 2;
    }
    if (map.height < this.viewportHeight) {
      camY = (map.height - this.viewportHeight) / 2;
    }

    return { x: camX, y: camY, width: this.viewportWidth, height: this.viewportHeight };
  }

  render(
    player: Player,
    map: GameMap,
    particles: ParticleSystem,
    camera: Camera,
    victory: VictoryState,
    deltaTime: number
  ): void {
    const ctx = this.ctx;

    this.drawBackground(victory);
    this.drawLightingAndScene(player, map, camera, victory, deltaTime);
    this.drawParticles(particles.getParticles(), camera);
    this.drawUI(player);
    this.drawVictoryOverlay(player, camera, victory);
  }

  private drawBackground(victory: VictoryState): void {
    const ctx = this.ctx;
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    if (victory.active) {
      const t = Math.min(1, victory.progress / 2000);
      const bgR = Math.floor(0 + t * 10);
      const bgG = Math.floor(0 + t * 10);
      const bgB = Math.floor(0 + t * 60);
      ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    } else {
      ctx.fillStyle = '#000';
    }
    ctx.fillRect(0, 0, w, h);
  }

  private drawLightingAndScene(
    player: Player,
    map: GameMap,
    camera: Camera,
    victory: VictoryState,
    deltaTime: number
  ): void {
    const offCtx = this.offscreenCtx;
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    offCtx.save();
    offCtx.globalCompositeOperation = 'source-over';

    const floorColor = victory.active
      ? `hsl(260, 30%, ${10 + victory.progress / 200}%)`
      : 'hsl(270, 30%, 10%)';
    offCtx.fillStyle = floorColor;
    offCtx.fillRect(0, 0, w, h);

    this.drawMap(map, camera, player);
    this.drawHiddenDoors(map, camera);
    this.drawPortals(map, camera, player.state.isIgnited);
    this.drawAltar(map, camera, player, victory);
    this.drawRunes(map, camera, player);

    offCtx.restore();

    const lightCanvas = document.createElement('canvas');
    lightCanvas.width = w;
    lightCanvas.height = h;
    const lightCtx = lightCanvas.getContext('2d')!;
    this.drawLightMask(lightCtx, player, camera);

    const ctx = this.ctx;
    ctx.save();
    ctx.drawImage(this.offscreenCanvas, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightCanvas, 0, 0);
    ctx.restore();

    const ctx2 = this.ctx;
    ctx2.save();
    ctx2.globalCompositeOperation = 'lighter';
    this.drawCandleGlow(player, camera, victory);
    ctx2.restore();
  }

  private drawMap(map: GameMap, camera: Camera, player: Player): void {
    const offCtx = this.offscreenCtx;
    const ts = map.tileSize;
    const startCol = Math.max(0, Math.floor(camera.x / ts) - 1);
    const startRow = Math.max(0, Math.floor(camera.y / ts) - 1);
    const endCol = Math.min(map.getCols(), Math.ceil((camera.x + camera.width) / ts) + 1);
    const endRow = Math.min(map.getRows(), Math.ceil((camera.y + camera.height) / ts) + 1);

    const px = player.state.x;
    const py = player.state.y;
    const pr = player.state.currentRadius + 20;

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = map.getTile(c, r);
        if (tile === 1) {
          const wx = c * ts - camera.x;
          const wy = r * ts - camera.y;
          const centerX = c * ts + ts / 2;
          const centerY = r * ts + ts / 2;
          const dist = Math.hypot(px - centerX, py - centerY);
          const inLight = dist < pr;

          offCtx.fillStyle = inLight ? 'hsl(0, 0%, 32%)' : 'hsl(0, 0%, 25%)';
          offCtx.fillRect(wx, wy, ts, ts);

          const hasPattern = map.brickPatternCache.get(`${c},${r}`);
          offCtx.strokeStyle = inLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.35)';
          offCtx.lineWidth = 1;
          offCtx.beginPath();
          if (hasPattern) {
            offCtx.moveTo(wx + ts / 2, wy);
            offCtx.lineTo(wx + ts / 2, wy + ts / 2);
            offCtx.moveTo(wx, wy + ts / 2);
            offCtx.lineTo(wx + ts, wy + ts / 2);
            offCtx.moveTo(wx + ts / 2, wy + ts / 2);
            offCtx.lineTo(wx + ts / 2, wy + ts);
          } else {
            offCtx.moveTo(wx, wy + ts / 3);
            offCtx.lineTo(wx + ts, wy + ts / 3);
            offCtx.moveTo(wx + ts / 3, wy + ts / 3);
            offCtx.lineTo(wx + ts / 3, wy + ts);
            offCtx.moveTo(wx + (2 * ts) / 3, wy);
            offCtx.lineTo(wx + (2 * ts) / 3, wy + ts / 3);
            offCtx.moveTo(wx, wy + (2 * ts) / 3);
            offCtx.lineTo(wx + (2 * ts) / 3, wy + (2 * ts) / 3);
            offCtx.moveTo(wx + (2 * ts) / 3, wy + (2 * ts) / 3);
            offCtx.lineTo(wx + (2 * ts) / 3, wy + ts);
          }
          offCtx.stroke();

          offCtx.strokeStyle = inLight ? 'rgba(100, 80, 50, 0.6)' : 'rgba(60, 50, 35, 0.4)';
          offCtx.lineWidth = 1.5;
          offCtx.strokeRect(wx + 0.5, wy + 0.5, ts - 1, ts - 1);

          if (inLight) {
            const edgeHighlight = Math.max(0, 1 - dist / pr);
            offCtx.strokeStyle = `rgba(255, 220, 150, ${edgeHighlight * 0.5})`;
            offCtx.lineWidth = 2;
            offCtx.strokeRect(wx + 0.5, wy + 0.5, ts - 1, ts - 1);
          }
        }
      }
    }
  }

  private drawLightMask(lightCtx: CanvasRenderingContext2D, player: Player, camera: Camera): void {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    lightCtx.fillStyle = 'hsl(280, 30%, 5%)';
    lightCtx.fillRect(0, 0, w, h);

    const px = player.state.x - camera.x;
    const py = player.state.y - camera.y;
    const r = player.state.currentRadius;
    const brightness = player.state.pulseBrightness;

    lightCtx.globalCompositeOperation = 'destination-out';
    const grad = lightCtx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * brightness})`);
    grad.addColorStop(0.3, `rgba(255, 255, 255, ${0.7 * brightness})`);
    grad.addColorStop(0.7, `rgba(255, 255, 255, ${0.3 * brightness})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    lightCtx.fillStyle = grad;
    lightCtx.beginPath();
    lightCtx.arc(px, py, r, 0, Math.PI * 2);
    lightCtx.fill();
    lightCtx.globalCompositeOperation = 'source-over';

    lightCtx.globalCompositeOperation = 'destination-out';
    const innerGrad = lightCtx.createRadialGradient(px, py, 0, px, py, r * 0.5);
    innerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.05 * brightness})`);
    innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    lightCtx.fillStyle = innerGrad;
    lightCtx.beginPath();
    lightCtx.arc(px, py, r * 0.5, 0, Math.PI * 2);
    lightCtx.fill();
    lightCtx.globalCompositeOperation = 'source-over';
  }

  private drawCandleGlow(player: Player, camera: Camera, victory: VictoryState): void {
    const ctx = this.ctx;
    let px = player.state.x - camera.x;
    let py = player.state.y - camera.y;

    if (victory.active) {
      py -= victory.candleRise;
      if (victory.progress > 1500) {
        const alpha = 1 - Math.min(1, (victory.progress - 1500) / 1500);
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
      }
    }

    const brightness = player.state.pulseBrightness;
    const r = player.state.currentRadius;

    if (player.state.isIgnited) {
      const outerGrad = ctx.createRadialGradient(px, py, 0, px, py, r * 0.5);
      outerGrad.addColorStop(0, `hsla(20, 100%, 60%, ${0.3 * brightness})`);
      outerGrad.addColorStop(0.5, `hsla(10, 100%, 50%, ${0.15 * brightness})`);
      outerGrad.addColorStop(1, 'hsla(0, 100%, 40%, 0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const mainGrad = ctx.createRadialGradient(px, py, 0, px, py, 40);
    const innerHue = 40;
    const innerLight = 80 + 20 * brightness;
    mainGrad.addColorStop(0, `hsla(${innerHue}, 100%, ${innerLight}%, ${0.95})`);
    mainGrad.addColorStop(0.3, `hsla(${innerHue - 5}, 100%, 70%, ${0.7})`);
    mainGrad.addColorStop(0.6, `hsla(${innerHue - 10}, 90%, 55%, ${0.35})`);
    mainGrad.addColorStop(1, `hsla(${innerHue - 15}, 80%, 45%, 0)`);
    ctx.fillStyle = mainGrad;
    ctx.beginPath();
    ctx.arc(px, py, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(50, 100%, 95%, ${0.9 + 0.1 * brightness})`;
    ctx.beginPath();
    ctx.arc(px, py, 6 + 2 * brightness, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(45, 100%, 85%, ${0.7 + 0.2 * brightness})`;
    const flicker = Math.sin(Date.now() / 80) * 0.5;
    ctx.beginPath();
    ctx.ellipse(px, py - 8 - flicker, 4 + brightness, 10 + 4 * brightness, 0, 0, Math.PI * 2);
    ctx.fill();

    if (player.state.isIgnited) {
      ctx.strokeStyle = `hsla(15, 100%, 60%, ${0.6 * brightness})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 25 + 3 * Math.sin(Date.now() / 100), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawHiddenDoors(map: GameMap, camera: Camera): void {
    const offCtx = this.offscreenCtx;
    for (const door of map.hiddenDoors) {
      if (door.revealed && door.revealProgress > 0) {
        const dx = door.x - camera.x;
        const dy = door.y - camera.y;
        const alpha = door.revealProgress;

        offCtx.fillStyle = `rgba(80, 60, 40, ${alpha * 0.3})`;
        offCtx.fillRect(dx, dy, door.width, door.height);
        offCtx.strokeStyle = `rgba(255, 220, 150, ${alpha * 0.8})`;
        offCtx.lineWidth = 2;
        offCtx.strokeRect(dx + 1, dy + 1, door.width - 2, door.height - 2);
      }
    }
  }

  private drawPortals(map: GameMap, camera: Camera, isIgnited: boolean): void {
    if (!isIgnited) return;
    const offCtx = this.offscreenCtx;
    const time = Date.now() / 1000;

    for (const portal of map.portals) {
      const px = portal.x - camera.x;
      const py = portal.y - camera.y;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + portal.x);
      const alpha = 0.4 + 0.3 * pulse;

      for (let i = 3; i >= 0; i--) {
        const r = 25 + i * 8;
        const a = alpha * (1 - i / 4);
        const grad = offCtx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `hsla(270, 80%, 70%, ${a})`);
        grad.addColorStop(0.5, `hsla(280, 70%, 50%, ${a * 0.5})`);
        grad.addColorStop(1, 'hsla(290, 60%, 40%, 0)');
        offCtx.fillStyle = grad;
        offCtx.beginPath();
        offCtx.arc(px, py, r, 0, Math.PI * 2);
        offCtx.fill();
      }

      offCtx.strokeStyle = `hsla(270, 90%, 80%, ${0.7 + 0.3 * pulse})`;
      offCtx.lineWidth = 2;
      offCtx.beginPath();
      offCtx.arc(px, py, 20, 0, Math.PI * 2);
      offCtx.stroke();
    }
  }

  private drawAltar(map: GameMap, camera: Camera, player: Player, victory: VictoryState): void {
    const offCtx = this.offscreenCtx;
    const ax = map.altar.x - camera.x;
    const ay = map.altar.y - camera.y;
    const r = map.altar.radius;
    const time = Date.now() / 1000;

    if (victory.active) {
      const t = Math.min(1, victory.progress / 2000);
      offCtx.fillStyle = `rgba(255, 220, 120, ${0.6 + 0.4 * t})`;
    } else {
      const pulse = 0.3 + 0.2 * Math.sin(time * 2);
      offCtx.fillStyle = `rgba(255, 200, 100, ${pulse})`;
    }
    offCtx.beginPath();
    offCtx.arc(ax, ay, r, 0, Math.PI * 2);
    offCtx.fill();

    offCtx.fillStyle = victory.active ? '#ffd700' : '#8b7355';
    offCtx.fillRect(ax - 25, ay - 15, 50, 30);
    offCtx.fillStyle = victory.active ? '#ffed4e' : '#6b5a45';
    offCtx.fillRect(ax - 30, ay + 10, 60, 15);

    if (!victory.active) {
      const flameH = 15 + 5 * Math.sin(time * 8);
      const grad = offCtx.createRadialGradient(ax, ay - 25, 0, ax, ay - 25, flameH);
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
      grad.addColorStop(0.5, 'rgba(255, 180, 50, 0.6)');
      grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(ax, ay - 25, flameH, 0, Math.PI * 2);
      offCtx.fill();
    }
  }

  private drawRunes(map: GameMap, camera: Camera, player: Player): void {
    const offCtx = this.offscreenCtx;
    const time = Date.now() / 1000;

    for (const rune of map.runes) {
      const rx = rune.x - camera.x;
      const ry = rune.y - camera.y;
      const dist = Math.hypot(player.state.x - rune.x, player.state.y - rune.y);
      const inRange = dist < player.state.currentRadius;

      if (inRange) {
        if (rune.activated) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2 + rune.x);
          offCtx.fillStyle = `rgba(255, 215, 0, ${0.6 + 0.3 * pulse})`;
          offCtx.beginPath();
          offCtx.arc(rx, ry, 12, 0, Math.PI * 2);
          offCtx.fill();
          offCtx.strokeStyle = `rgba(255, 255, 200, ${0.8 + 0.2 * pulse})`;
          offCtx.lineWidth = 2;
          this.drawRuneSymbol(offCtx, rx, ry, 8);
        } else {
          const pulse = 0.5 + 0.5 * Math.sin(time * 4);
          offCtx.fillStyle = `rgba(180, 160, 100, ${0.3 + 0.2 * pulse})`;
          offCtx.beginPath();
          offCtx.arc(rx, ry, 14, 0, Math.PI * 2);
          offCtx.fill();
          offCtx.strokeStyle = `rgba(200, 180, 120, ${0.5 + 0.3 * pulse})`;
          offCtx.lineWidth = 1.5;
          this.drawRuneSymbol(offCtx, rx, ry, 9);
        }
      }
    }
  }

  private drawRuneSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y - size);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.moveTo(x - size * 0.7, y + size * 0.5);
    ctx.lineTo(x + size * 0.7, y + size * 0.5);
    ctx.moveTo(x - size * 0.5, y - size * 0.5);
    ctx.lineTo(x + size * 0.5, y + size * 0.5);
    ctx.stroke();
  }

  private drawParticles(particles: Particle[], camera: Camera): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const px = p.x - camera.x;
      const py = p.y - camera.y;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawUI(player: Player): void {
    const ctx = this.ctx;
    const w = this.viewportWidth;

    const uiX = 20;
    const uiY = 20;
    const barWidth = 220;
    const barHeight = 24;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(ctx, uiX - 8, uiY - 8, barWidth + 16, barHeight + 60, 8);
    ctx.fill();

    ctx.fillStyle = 'hsl(45, 100%, 75%)';
    ctx.font = 'bold 13px Microsoft YaHei, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('生命值', uiX, uiY + barHeight / 2);

    const labelW = 55;
    const barX = uiX + labelW + 5;
    const barActualW = barWidth - labelW - 5;
    ctx.fillStyle = 'rgba(50, 30, 20, 0.8)';
    ctx.fillRect(barX, uiY, barActualW, barHeight);

    const hpRatio = Math.max(0, player.state.health / player.state.maxHealth);
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barActualW, 0);
    hpGrad.addColorStop(0, 'hsl(30, 100%, 55%)');
    hpGrad.addColorStop(1, hpRatio > 0.3 ? 'hsl(10, 100%, 50%)' : 'hsl(0, 100%, 40%)');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, uiY, barActualW * hpRatio, barHeight);

    ctx.strokeStyle = 'hsl(45, 80%, 50%)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX + 0.5, uiY + 0.5, barActualW - 1, barHeight - 1);

    ctx.fillStyle = `hsl(45, 100%, ${85 + 10 * player.state.pulseBrightness}%)`;
    ctx.font = 'bold 12px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(player.state.health)}/${player.state.maxHealth}`, barX + barActualW - 4, uiY + barHeight / 2);
    ctx.textAlign = 'left';

    const infoY = uiY + barHeight + 12;
    ctx.fillStyle = 'hsl(45, 100%, 70%)';
    ctx.font = '12px Microsoft YaHei, sans-serif';

    if (player.state.isIgnited) {
      ctx.fillStyle = 'hsl(20, 100%, 65%)';
      ctx.fillText('🔥 点燃状态中...', uiX, infoY);
    } else if (player.state.igniteCooldown > 0) {
      const cd = Math.ceil(player.state.igniteCooldown / 1000);
      ctx.fillStyle = 'hsl(0, 0%, 60%)';
      ctx.fillText(`⏳ 冷却: ${cd}秒`, uiX, infoY);
    } else {
      ctx.fillStyle = 'hsl(45, 100%, 70%)';
      ctx.fillText('空格键: 点燃 (放大视野)', uiX, infoY);
    }

    ctx.fillStyle = 'hsl(45, 100%, 55%)';
    ctx.font = '11px Microsoft YaHei, sans-serif';
    ctx.fillText('WASD 移动', uiX, infoY + 20);

    this.drawFPSCounter(ctx, w);
  }

  private fpsFrames: number = 0;
  private fpsLastTime: number = performance.now();
  private fpsDisplay: number = 60;

  private drawFPSCounter(ctx: CanvasRenderingContext2D, w: number): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.fpsDisplay = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(ctx, w - 80, 20, 60, 28, 6);
    ctx.fill();
    ctx.fillStyle = this.fpsDisplay >= 55 ? '#7fff7f' : this.fpsDisplay >= 30 ? '#ffdd55' : '#ff5555';
    ctx.font = 'bold 14px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.fpsDisplay} FPS`, w - 50, 39);
    ctx.textAlign = 'left';
  }

  private drawVictoryOverlay(player: Player, camera: Camera, victory: VictoryState): void {
    if (!victory.active) return;
    const ctx = this.ctx;
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    const t = Math.min(1, victory.progress / 3000);

    if (t > 0.6) {
      const textAlpha = (t - 0.6) / 0.4;
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, h / 2 - 80, w, 160);

      ctx.fillStyle = 'hsl(45, 100%, 70%)';
      ctx.font = 'bold 42px Microsoft YaHei, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦ 祭坛抵达 ✦', w / 2, h / 2 - 20);

      ctx.fillStyle = 'hsl(40, 80%, 60%)';
      ctx.font = '18px Microsoft YaHei, sans-serif';
      ctx.fillText('烛火指引你穿越了幽暗古堡', w / 2, h / 2 + 30);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
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
