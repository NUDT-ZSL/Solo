import { PhysicsEngine } from './engine';
import type { Platform, Spike, Coin } from './engine';
import { WorldGenerator } from './world';
import type { WorldData } from './world';
import { Player } from './player';

interface Star {
  x: number;
  y: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  parallax: number;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  engine: PhysicsEngine;
  worldGen: WorldGenerator;
  world: WorldData;
  player: Player;
  cameraX: number;
  cameraY: number;
  score: number;
  lives: number;
  gameOver: boolean;
  input: { left: boolean; right: boolean; jump: boolean; crouch: boolean; jumpPressed: boolean };
  stars: Star[];
  lastTime: number;
  animTime: number;
  viewW: number;
  viewH: number;
  logicalW: number;
  logicalH: number;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    this.ctx = ctx;

    this.engine = new PhysicsEngine();
    this.worldGen = new WorldGenerator();
    this.world = this.worldGen.generate();
    this.player = new Player(this.world.spawnX, this.world.spawnY);

    this.cameraX = 0;
    this.cameraY = 0;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.animTime = 0;
    this.lastTime = performance.now();

    this.logicalW = 1280;
    this.logicalH = 720;
    this.viewW = this.logicalW;
    this.viewH = this.logicalH;

    this.input = {
      left: false,
      right: false,
      jump: false,
      crouch: false,
      jumpPressed: false,
    };

    this.stars = [];
    this.initStars();

    this.setupCanvas();
    this.setupInput();
    this.setupUI();

    window.addEventListener('resize', () => this.setupCanvas());

    requestAnimationFrame((t) => this.loop(t));
  }

  initStars(): void {
    this.stars = [];
    for (let i = 0; i < 180; i++) {
      this.stars.push({
        x: Math.random() * this.world.worldWidth,
        y: Math.random() * this.world.worldHeight * 0.7,
        size: Math.random() * 2 + 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
        parallax: 0.1 + Math.random() * 0.4,
      });
    }
  }

  setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.viewW = cssW;
    this.viewH = cssH;
  }

  setupInput(): void {
    const keyMap: Record<string, keyof typeof this.input> = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      Space: 'jump',
      KeyW: 'jump',
      ArrowUp: 'jump',
      KeyS: 'crouch',
      ArrowDown: 'crouch',
    };

    const prevJumpState: Record<string, boolean> = {};

    window.addEventListener('keydown', (e) => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        if (action === 'jump' && !prevJumpState[e.code]) {
          this.input.jumpPressed = true;
        }
        (this.input as Record<string, boolean>)[action] = true;
        prevJumpState[e.code] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        (this.input as Record<string, boolean>)[action] = false;
        prevJumpState[e.code] = false;
      }
    });

    const touchButtons = document.querySelectorAll('.touch-btn[data-action]');
    const touchState: Record<string, boolean> = {};

    for (const btn of touchButtons) {
      const action = (btn as HTMLElement).dataset.action!;

      const setActive = (active: boolean, ev: Event) => {
        ev.preventDefault();
        const mappedAction = action === 'jump' ? 'jump' : action;
        if (action === 'jump' && active && !touchState[action]) {
          this.input.jumpPressed = true;
        }
        touchState[action] = active;
        if (mappedAction in this.input) {
          (this.input as Record<string, boolean>)[mappedAction] = active;
        }
      };

      btn.addEventListener('touchstart', (e) => setActive(true, e), { passive: false });
      btn.addEventListener('touchend', (e) => setActive(false, e), { passive: false });
      btn.addEventListener('touchcancel', (e) => setActive(false, e), { passive: false });
      btn.addEventListener('mousedown', (e) => setActive(true, e));
      btn.addEventListener('mouseup', (e) => setActive(false, e));
      btn.addEventListener('mouseleave', (e) => setActive(false, e));
    }
  }

  setupUI(): void {
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restart());
    }
  }

  restart(): void {
    this.world = this.worldGen.reset();
    this.player.reset(this.world.spawnX, this.world.spawnY);
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.cameraX = 0;
    this.cameraY = 0;
    this.initStars();

    const overlay = document.getElementById('restart-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  respawn(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
      const overlay = document.getElementById('restart-overlay');
      const title = document.getElementById('overlay-title');
      const scoreEl = document.getElementById('overlay-score');
      if (overlay) overlay.style.display = 'flex';
      if (title) title.textContent = '游戏结束';
      if (scoreEl) scoreEl.textContent = `得分: ${this.score}`;
    } else {
      this.player.reset(this.world.spawnX, this.world.spawnY);
      this.cameraX = 0;
    }
  }

  update(dt: number): void {
    if (this.gameOver) return;

    this.animTime += dt;

    for (const coin of this.world.coins) {
      if (!coin.collected) {
        coin.animPhase += dt * 3;
      }
    }

    this.player.crouching = this.input.crouch;

    const wasOnGround = this.player.onGround;
    const wasJumpsLeft = this.player.jumpsLeft;

    this.engine.applyInput(this.player, {
      left: this.input.left,
      right: this.input.right,
      jumpPressed: this.input.jumpPressed,
      crouching: this.input.crouch,
    }, dt);

    if (this.input.jumpPressed) {
      if (wasOnGround) {
        this.player.spawnJumpParticles();
      } else if (wasJumpsLeft > 0) {
        this.player.spawnDoubleJumpParticles();
        this.player.stretch = 1.25;
        this.player.squash = 0.8;
      }
    }
    this.input.jumpPressed = false;

    this.engine.integrate(this.player, dt);
    this.engine.resolveCollisions(this.player, this.world.platforms, dt);

    this.player.update(dt);

    const collectedCoins = this.engine.checkCoinCollisions(this.player, this.world.coins);
    for (const coin of collectedCoins) {
      this.score += 10;
      this.player.spawnCoinParticles(coin.x + coin.w / 2, coin.y + coin.h / 2);
    }

    if (this.engine.checkSpikeCollision(this.player, this.world.spikes) && this.player.invulnerable <= 0) {
      this.respawn();
    }

    if (this.player.y > this.world.worldHeight + 200 && this.player.invulnerable <= 0) {
      this.respawn();
    }

    const targetCamX = this.player.x + this.player.w / 2 - this.viewW / 2;
    const targetCamY = this.player.y + this.player.h / 2 - this.viewH / 2;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 6);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 6);
    this.cameraX = Math.max(0, Math.min(this.world.worldWidth - this.viewW, this.cameraX));
    this.cameraY = Math.max(0, Math.min(this.world.worldHeight - this.viewH, this.cameraY));
  }

  drawBackground(): void {
    const { ctx, viewW, viewH } = this;

    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, '#0d1b4c');
    grad.addColorStop(0.4, '#2a1a5e');
    grad.addColorStop(0.75, '#4a2c7a');
    grad.addColorStop(1, '#1a0f3d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    for (const star of this.stars) {
      const sx = star.x - this.cameraX * star.parallax;
      const sy = star.y - this.cameraY * star.parallax;
      const wrappedX = ((sx % this.world.worldWidth) + this.world.worldWidth) % this.world.worldWidth;
      if (wrappedX > -10 && wrappedX < viewW + 10 && sy > -10 && sy < viewH + 10) {
        const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.animTime * star.twinkleSpeed + star.twinklePhase));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(wrappedX, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlatforms(): void {
    const { ctx, cameraX, cameraY, viewW, viewH } = this;

    for (const plat of this.world.platforms) {
      const sx = plat.x - cameraX;
      const sy = plat.y - cameraY;
      if (sx + plat.w < -50 || sx > viewW + 50) continue;
      if (sy + plat.h < -50 || sy > viewH + 50) continue;

      const platH = plat.h;
      const platW = plat.w;

      const grad = ctx.createLinearGradient(0, sy, 0, sy + Math.min(platH, 120));
      grad.addColorStop(0, '#c49a6c');
      grad.addColorStop(0.3, '#a07848');
      grad.addColorStop(0.7, '#8b6343');
      grad.addColorStop(1, '#5d4129');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, sy, platW, platH);

      ctx.fillStyle = '#d4b088';
      ctx.fillRect(sx, sy, platW, 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(sx, sy, platW, 3);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(sx, sy + platH - 4, platW, 4);

      ctx.strokeStyle = 'rgba(60, 30, 10, 0.35)';
      ctx.lineWidth = 1;
      const stripeCount = Math.floor(platW / 40);
      for (let i = 1; i < stripeCount; i++) {
        const lineX = sx + (platW / stripeCount) * i;
        ctx.beginPath();
        ctx.moveTo(lineX, sy + 8);
        ctx.lineTo(lineX, sy + platH);
        ctx.stroke();
      }

      if (platH > 24) {
        const rowCount = Math.floor(platH / 30);
        for (let r = 1; r < rowCount; r++) {
          const lineY = sy + 8 + (platH - 8) / rowCount * r;
          ctx.beginPath();
          ctx.moveTo(sx, lineY);
          ctx.lineTo(sx + platW, lineY);
          ctx.stroke();
        }
      }
    }
  }

  drawSpikes(): void {
    const { ctx, cameraX, cameraY, viewW, viewH } = this;

    for (const spike of this.world.spikes) {
      const sx = spike.x - cameraX;
      const sy = spike.y - cameraY;
      if (sx + spike.w < -50 || sx > viewW + 50) continue;
      if (sy + spike.h < -50 || sy > viewH + 50) continue;

      const baseY = sy + spike.h;
      const tipY = sy + 4;

      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx + spike.w / 2, tipY);
      ctx.lineTo(sx + spike.w, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.moveTo(sx + 4, baseY);
      ctx.lineTo(sx + spike.w / 2, tipY + 6);
      ctx.lineTo(sx + spike.w / 2 - 2, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.moveTo(sx + spike.w - 6, baseY);
      ctx.lineTo(sx + spike.w / 2 + 3, tipY + 10);
      ctx.lineTo(sx + spike.w / 2 + 8, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#8e0000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx + spike.w / 2, tipY);
      ctx.lineTo(sx + spike.w, baseY);
      ctx.closePath();
      ctx.stroke();
    }
  }

  drawCoins(): void {
    const { ctx, cameraX, cameraY, viewW, viewH, animTime } = this;

    for (const coin of this.world.coins) {
      if (coin.collected) continue;
      const sx = coin.x - cameraX;
      const sy = coin.y - cameraY + Math.sin(animTime * 2 + coin.animPhase) * 4;
      if (sx + coin.w < -50 || sx > viewW + 50) continue;
      if (sy + coin.h < -50 || sy > viewH + 50) continue;

      const scaleX = Math.abs(Math.cos(animTime * 3 + coin.animPhase));
      const cx = sx + coin.w / 2;
      const cy = sy + coin.h / 2;
      const rx = coin.w / 2 * Math.max(0.2, scaleX);
      const ry = coin.h / 2;

      const grad = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 1, cx, cy, ry);
      grad.addColorStop(0, '#fff59d');
      grad.addColorStop(0.4, '#ffd54f');
      grad.addColorStop(0.8, '#ffb300');
      grad.addColorStop(1, '#ff8f00');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      if (scaleX > 0.4) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.35, cy - ry * 0.35, rx * 0.25, ry * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawHUD(): void {
    const { ctx, viewW, viewH } = this;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(16, 16, 220, 80);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 220, 80);

    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`分数: ${this.score}`, 30, 28);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('生命: ', 30, 62);

    for (let i = 0; i < this.lives; i++) {
      this.drawHeart(ctx, 105 + i * 34, 65, 24);
    }
    for (let i = this.lives; i < 3; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.drawHeart(ctx, 105 + i * 34, 65, 24);
    }

    const mapW = 200;
    const mapH = 60;
    const mapX = viewW - mapW - 20;
    const mapY = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    const scaleX = mapW / this.world.worldWidth;
    const scaleY = mapH / this.world.worldHeight;

    ctx.fillStyle = 'rgba(140, 100, 60, 0.7)';
    for (const plat of this.world.platforms) {
      ctx.fillRect(
        mapX + plat.x * scaleX,
        mapY + plat.y * scaleY,
        Math.max(1, plat.w * scaleX),
        Math.max(1, plat.h * scaleY)
      );
    }

    ctx.fillStyle = '#e53935';
    for (const spike of this.world.spikes) {
      ctx.fillRect(
        mapX + spike.x * scaleX,
        mapY + spike.y * scaleY,
        Math.max(1, spike.w * scaleX),
        Math.max(1, spike.h * scaleY)
      );
    }

    for (const coin of this.world.coins) {
      if (!coin.collected) {
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(
          mapX + coin.x * scaleX,
          mapY + coin.y * scaleY,
          Math.max(1, coin.w * scaleX),
          Math.max(1, coin.h * scaleY)
        );
      }
    }

    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(
      mapX + this.player.x * scaleX - 1,
      mapY + this.player.y * scaleY - 1,
      Math.max(2, this.player.w * scaleX),
      Math.max(2, this.player.h * scaleY)
    );

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mapX + this.cameraX * scaleX,
      mapY + this.cameraY * scaleY,
      this.viewW * scaleX,
      this.viewH * scaleY
    );
  }

  drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    const s = size;
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s * 0.4, y, x - s * 0.4, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.4, y + s * 0.55, x, y + s * 0.75, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.75, x + s * 0.4, y + s * 0.55, x + s * 0.4, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 0.4, y, x, y, x, y + s * 0.3);
    ctx.fillStyle = '#ef5350';
    ctx.fill();
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  render(): void {
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;

    this.drawBackground();
    this.drawPlatforms();
    this.drawSpikes();
    this.drawCoins();
    this.player.draw(ctx, this.cameraX);
    this.drawHUD();
  }

  loop(now: number): void {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;

    const steps = Math.ceil(dt / (1 / 120));
    const stepDt = dt / steps;

    for (let i = 0; i < steps; i++) {
      this.update(stepDt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
