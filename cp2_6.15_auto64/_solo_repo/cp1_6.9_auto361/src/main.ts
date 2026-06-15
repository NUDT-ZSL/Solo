import { MazeMap, TOTAL_COLS, TOTAL_ROWS, GRID_SIZE, Chest } from './map';
import { Player, VISION_RADIUS, Spore, Explosion } from './player';
import { EnemyManager, Slime } from './enemy';

type GameState = 'menu' | 'playing' | 'victory' | 'defeat';

const WALL_COLOR = '#2d2d2d';
const FLOOR_COLOR = '#3d2b1f';
const BG_COLOR = '#1a1a1a';
const UI_TEXT_COLOR = '#e0e0e0';
const KEY_COLOR = '#ffcc00';

const GAME_DURATION = 5 * 60;
const ASPECT_RATIO = 16 / 9;
const CELL_PX = 20;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState = 'menu';
  private map!: MazeMap;
  private player!: Player;
  private enemies!: EnemyManager;
  private lastTime = 0;
  private timeLeft = GAME_DURATION;
  private victoryTimer = 0;
  private defeatTimer = 0;
  private particles: Particle[] = [];
  private hoverGridX = -1;
  private hoverGridY = -1;
  private cameraX = 0;
  private cameraY = 0;
  private viewWidth = 0;
  private viewHeight = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private explosionTextureCache: HTMLCanvasElement | null = null;
  private btnFlashTime = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.setupCanvas();
    this.setupEventListeners();
    this.precomputeTextures();
    this.startGameLoop();
  }

  private setupCanvas(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    let canvasW = w;
    let canvasH = w / ASPECT_RATIO;
    if (canvasH > h) {
      canvasH = h;
      canvasW = h * ASPECT_RATIO;
    }

    this.canvas.width = Math.floor(canvasW);
    this.canvas.height = Math.floor(canvasH);
    this.canvas.style.width = `${canvasW}px`;
    this.canvas.style.height = `${canvasH}px`;

    this.viewWidth = this.canvas.width;
    this.viewHeight = this.canvas.height;

    const mapPixelW = TOTAL_COLS * CELL_PX;
    const mapPixelH = TOTAL_ROWS * CELL_PX;
    const scaleX = this.viewWidth / mapPixelW;
    const scaleY = this.viewHeight / mapPixelH;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (this.viewWidth - mapPixelW * this.scale) / 2;
    this.offsetY = (this.viewHeight - mapPixelH * this.scale) / 2;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onClick(new MouseEvent('click', {
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove(new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
    }, { passive: false });
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private getGridFromCanvas(canvasX: number, canvasY: number): { gx: number; gy: number; worldX: number; worldY: number } {
    const worldX = (canvasX - this.offsetX) / this.scale;
    const worldY = (canvasY - this.offsetY) / this.scale;
    const gx = Math.floor(worldX / CELL_PX);
    const gy = Math.floor(worldY / CELL_PX);
    return { gx, gy, worldX, worldY };
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    const { gx, gy } = this.getGridFromCanvas(x, y);
    this.hoverGridX = gx;
    this.hoverGridY = gy;
  }

  private onMouseDown(e: MouseEvent): void {
    this.btnFlashTime = 0.2;
  }

  private onMouseUp(e: MouseEvent): void {
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    if (this.state === 'menu') {
      this.startNewGame();
      return;
    }

    if (this.state === 'victory' && this.victoryTimer >= 3) {
      this.state = 'menu';
      return;
    }

    if (this.state === 'defeat') {
      this.state = 'menu';
      return;
    }

    if (this.state !== 'playing') return;

    const { gx, gy, worldX, worldY } = this.getGridFromCanvas(x, y);

    const playerWorldX = this.player.gridX * CELL_PX + CELL_PX / 2;
    const playerWorldY = this.player.gridY * CELL_PX + CELL_PX / 2;

    this.player.fireSpore(playerWorldX, playerWorldY, worldX, worldY);
    this.player.setTarget(gx, gy, this.map);
  }

  private startNewGame(): void {
    this.map = new MazeMap();
    this.player = new Player(this.map.spawnX, this.map.spawnY);
    this.enemies = new EnemyManager(this.map.slimeSpawns);
    this.timeLeft = GAME_DURATION;
    this.victoryTimer = 0;
    this.defeatTimer = 0;
    this.particles = [];
    this.state = 'playing';
  }

  private precomputeTextures(): void {
    const size = 120;
    this.explosionTextureCache = document.createElement('canvas');
    this.explosionTextureCache.width = size;
    this.explosionTextureCache.height = size;
    const ectx = this.explosionTextureCache.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    const gradient = ectx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 150, 50, 0.5)');
    gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ectx.fillStyle = gradient;
    ectx.fillRect(0, 0, size, size);
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      if (this.lastTime === 0) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 1 / 30);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    if (this.btnFlashTime > 0) this.btnFlashTime -= dt;

    if (this.state === 'playing') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = 'defeat';
        this.spawnDefeatParticles();
      }

      this.map.update(dt);
      this.player.update(dt, this.map);
      this.enemies.update(dt, this.map, this.player);

      const totalKeys = this.map.chests.length;
      if (this.player.keysCollected >= totalKeys && totalKeys > 0) {
        this.state = 'victory';
        this.victoryTimer = 0;
        this.spawnVictoryParticles();
      }

      if (this.enemies.checkPlayerCollision(this.player)) {
        this.state = 'defeat';
        this.defeatTimer = 0;
        this.spawnDefeatParticles();
      }

      this.updateParticles(dt);
    } else if (this.state === 'victory') {
      this.victoryTimer += dt;
      this.updateParticles(dt);
      if (this.victoryTimer > 3 && this.particles.length === 0) {
      }
    } else if (this.state === 'defeat') {
      this.defeatTimer += dt;
      this.updateParticles(dt);
    }
  }

  private spawnVictoryParticles(): void {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    const colors = ['#ffcc00', '#ff8800', '#ff4488', '#00ff88', '#00ccff'];
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2 + Math.random() * 2,
        maxLife: 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5
      });
    }
  }

  private spawnDefeatParticles(): void {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 1.5,
        maxLife: 2.5,
        color: '#ff3333',
        size: 2 + Math.random() * 4
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    if (this.state === 'menu') {
      this.renderMenu();
      return;
    }

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.renderMap();
    this.renderChests();
    this.renderEnemies();
    this.renderSpores();
    this.renderExplosions();
    this.renderPlayer();
    this.renderFog();

    ctx.restore();

    this.renderUI();
    this.renderHoverTooltip();
    this.renderParticles();

    if (this.state === 'victory') {
      this.renderVictoryScreen();
    } else if (this.state === 'defeat') {
      this.renderDefeatScreen();
    }
  }

  private renderMap(): void {
    const ctx = this.ctx;
    const litCells = this.map.litCells;

    for (let y = 0; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < TOTAL_COLS; x++) {
        const px = x * CELL_PX;
        const py = y * CELL_PX;

        if (this.map.grid[y][x] === 1) {
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(px, py, CELL_PX, CELL_PX);

          const key = `${x},${y}`;
          if (litCells.has(key)) {
            const lit = litCells.get(key)!;
            const alpha = Math.min(lit.timeLeft / 1.5, 1) * 0.5;
            ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
            ctx.fillRect(px, py, CELL_PX, CELL_PX);
          }
        } else {
          ctx.fillStyle = FLOOR_COLOR;
          ctx.fillRect(px, py, CELL_PX, CELL_PX);
        }
      }
    }
  }

  private renderChests(): void {
    const ctx = this.ctx;
    for (const chest of this.map.chests) {
      if (chest.collected) continue;

      const cx = chest.gridX * CELL_PX + CELL_PX / 2;
      const cy = chest.gridY * CELL_PX + CELL_PX / 2;
      const flicker = (Math.sin(chest.flickerPhase) + 1) / 2;
      const alpha = 0.6 + flicker * 0.4;
      const size = 14;

      ctx.save();
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 8 + flicker * 6;
      ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      ctx.strokeStyle = `rgba(255, 220, 80, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
      ctx.fillStyle = `rgba(180, 120, 0, ${alpha})`;
      ctx.fillRect(cx - size / 2, cy - 1, size, 2);
      ctx.restore();
    }
  }

  private renderEnemies(): void {
    const ctx = this.ctx;
    for (const slime of this.enemies.slimes) {
      const sx = slime.gridX * CELL_PX + CELL_PX / 2;
      const sy = slime.gridY * CELL_PX + CELL_PX / 2;
      const r = slime.radius * (CELL_PX / 40);

      const distToPlayer = Math.sqrt(
        Math.pow(slime.gridX - this.player.gridX, 2) +
        Math.pow(slime.gridY - this.player.gridY, 2)
      );
      if (distToPlayer > VISION_RADIUS) continue;

      ctx.save();
      ctx.shadowColor = slime.state === 'chase' ? '#ff0000' : '#00ff66';
      ctx.shadowBlur = 10;
      ctx.fillStyle = slime.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderSpores(): void {
    const ctx = this.ctx;
    for (const spore of this.player.spores) {
      const { r, g, b } = spore.color;
      const radius = 7;

      ctx.save();
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowBlur = 15;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(spore.x, spore.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 255, 255, 0.6)`;
      ctx.beginPath();
      ctx.arc(spore.x, spore.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderExplosions(): void {
    const ctx = this.ctx;
    if (!this.explosionTextureCache) return;

    for (const exp of this.player.explosions) {
      const progress = 1 - (exp.timeLeft / exp.duration);
      const alpha = 0.8 * (1 - progress);
      const currentRadius = exp.radius * (0.5 + progress * 1.5);
      const texSize = 120;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        this.explosionTextureCache,
        exp.x - currentRadius,
        exp.y - currentRadius,
        currentRadius * 2,
        currentRadius * 2
      );
      ctx.restore();
    }
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const px = this.player.gridX * CELL_PX + CELL_PX / 2;
    const py = this.player.gridY * CELL_PX + CELL_PX / 2;
    const r = CELL_PX * 0.35;

    ctx.save();
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, r * 1.5);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(30, 100, 200, 0)');

    ctx.shadowColor = '#66ccff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#88ddff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(px, py, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderFog(): void {
    const ctx = this.ctx;
    const px = this.player.gridX * CELL_PX + CELL_PX / 2;
    const py = this.player.gridY * CELL_PX + CELL_PX / 2;
    const visRadius = VISION_RADIUS * CELL_PX;
    const fadeWidth = 1.5 * CELL_PX;
    const innerRadius = visRadius - fadeWidth;

    const mapW = TOTAL_COLS * CELL_PX;
    const mapH = TOTAL_ROWS * CELL_PX;

    ctx.save();

    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = mapW;
    fogCanvas.height = mapH;
    const fogCtx = fogCanvas.getContext('2d')!;

    fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    fogCtx.fillRect(0, 0, mapW, mapH);

    fogCtx.globalCompositeOperation = 'destination-out';
    const gradient = fogCtx.createRadialGradient(px, py, 0, px, py, visRadius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(innerRadius / visRadius, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fogCtx.fillStyle = gradient;
    fogCtx.beginPath();
    fogCtx.arc(px, py, visRadius, 0, Math.PI * 2);
    fogCtx.fill();

    ctx.drawImage(fogCanvas, 0, 0);

    ctx.globalCompositeOperation = 'source-over';
    const blueFog = ctx.createRadialGradient(px, py, 0, px, py, visRadius);
    blueFog.addColorStop(0, 'rgba(20, 40, 80, 0)');
    blueFog.addColorStop(0.6, 'rgba(20, 40, 80, 0.08)');
    blueFog.addColorStop(1, 'rgba(20, 40, 80, 0.15)');
    ctx.fillStyle = blueFog;
    ctx.beginPath();
    ctx.arc(px, py, visRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderUI(): void {
    const ctx = this.ctx;
    const totalKeys = this.map ? this.map.chests.length : 0;

    ctx.save();

    ctx.shadowColor = KEY_COLOR;
    ctx.shadowBlur = 8;
    ctx.fillStyle = KEY_COLOR;
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';

    const keyText = `${this.player ? this.player.keysCollected : 0}/${totalKeys}`;
    ctx.fillText(`🔑 ${keyText}`, 20, 20);

    ctx.shadowBlur = 0;
    ctx.fillStyle = UI_TEXT_COLOR;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = Math.floor(this.timeLeft % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (this.timeLeft < 60) {
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 6;
    }
    ctx.fillText(timeStr, this.viewWidth - 20, 22);

    ctx.restore();
  }

  private renderHoverTooltip(): void {
    if (this.hoverGridX < 0 || this.hoverGridY < 0) return;
    if (this.hoverGridX >= TOTAL_COLS || this.hoverGridY >= TOTAL_ROWS) return;

    const distToPlayer = Math.sqrt(
      Math.pow(this.hoverGridX - this.player.gridX, 2) +
      Math.pow(this.hoverGridY - this.player.gridY, 2)
    );
    if (distToPlayer > VISION_RADIUS) return;

    const ctx = this.ctx;
    const isWall = this.map.isWall(this.hoverGridX, this.hoverGridY);
    const typeText = isWall ? '墙壁' : '通道';
    const text = `(${this.hoverGridX},${this.hoverGridY}) ${typeText}`;

    ctx.save();
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const metrics = ctx.measureText(text);
    const padding = 6;
    const tw = metrics.width + padding * 2;
    const th = 20;

    let mouseCanvasX = (this.hoverGridX * CELL_PX + CELL_PX) * this.scale + this.offsetX;
    let mouseCanvasY = (this.hoverGridY * CELL_PX) * this.scale + this.offsetY - th - 4;

    if (mouseCanvasX + tw > this.viewWidth - 4) mouseCanvasX = this.viewWidth - tw - 4;
    if (mouseCanvasX < 4) mouseCanvasX = 4;
    if (mouseCanvasY < 4) mouseCanvasY = 4;

    ctx.fillStyle = '#00000080';
    ctx.fillRect(mouseCanvasX, mouseCanvasY, tw, th);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mouseCanvasX, mouseCanvasY, tw, th);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, mouseCanvasX + padding, mouseCanvasY + th / 2);
    ctx.restore();
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = Math.min(p.life / p.maxLife, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderMenu(): void {
    const ctx = this.ctx;
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;

    ctx.save();

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(i * 1.7) * 0.5 + 0.5) * this.viewWidth;
      const y = (Math.cos(i * 2.3) * 0.5 + 0.5) * this.viewHeight;
      const r = 2 + Math.sin(Date.now() * 0.001 + i) * 1.5;
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.002 + i * 0.5) * 0.2;
      ctx.fillStyle = i % 3 === 0 ? '#00ff88' : '#6688ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowColor = '#66ccff';
    ctx.shadowBlur = 25;
    const grd = ctx.createLinearGradient(cx - 200, cy - 80, cx + 200, cy - 80);
    grd.addColorStop(0, '#88ffcc');
    grd.addColorStop(0.5, '#66ccff');
    grd.addColorStop(1, '#aa88ff');
    ctx.fillStyle = grd;
    ctx.fillText('幽光诡域', cx, cy - 80);

    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#aaccee';
    ctx.fillText('Ghostlight Crypt', cx, cy - 30);

    const btnW = 220;
    const btnH = 56;
    const btnX = cx - btnW / 2;
    const btnY = cy + 40;

    let btnColor = '#1a4a6e';
    let btnBorder = '#44aaff';
    let btnText = '#ffffff';
    if (this.btnFlashTime > 0) {
      btnColor = '#3a7aae';
    }

    ctx.fillStyle = btnColor;
    ctx.shadowColor = btnBorder;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = btnBorder;
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = btnText;
    ctx.fillText('开始探索', cx, btnY + btnH / 2 + 2);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8899aa';
    ctx.fillText('🖱️ 点击地面移动  |  点击方向发射荧光孢子', cx, cy + 135);
    ctx.fillText('收集所有钥匙碎片即可通关  |  小心暗处的史莱姆！', cx, cy + 160);

    ctx.restore();
  }

  private renderVictoryScreen(): void {
    const ctx = this.ctx;
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    const alpha = Math.min(this.victoryTimer * 2, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const grd = ctx.createLinearGradient(cx - 200, cy - 60, cx + 200, cy - 60);
    grd.addColorStop(0, '#ffdd44');
    grd.addColorStop(0.5, '#ff8844');
    grd.addColorStop(1, '#ff44aa');
    ctx.fillStyle = grd;
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 30;
    ctx.fillText('🎉 胜利！', cx, cy - 60);

    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffeecc';
    const mins = Math.floor((GAME_DURATION - this.timeLeft) / 60);
    const secs = Math.floor((GAME_DURATION - this.timeLeft) % 60);
    ctx.fillText(`用时 ${mins}分${secs}秒  收集 ${this.player.keysCollected}/${this.map.chests.length} 个钥匙碎片`, cx, cy + 10);

    const remaining = Math.max(0, 3 - this.victoryTimer);
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#aabbcc';
    ctx.shadowBlur = 0;
    ctx.fillText(`${remaining.toFixed(1)}秒后返回主菜单...`, cx, cy + 60);

    ctx.restore();
  }

  private renderDefeatScreen(): void {
    const ctx = this.ctx;
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    const alpha = Math.min(this.defeatTimer * 2, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(30, 5, 5, 0.85)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillText('💀 探险失败', cx, cy - 50);

    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffaaaa';
    const collected = this.player ? this.player.keysCollected : 0;
    const total = this.map ? this.map.chests.length : 0;
    if (this.timeLeft <= 0) {
      ctx.fillText('时间耗尽了... 墓穴的黑暗吞噬了你', cx, cy + 10);
    } else {
      ctx.fillText('你被史莱姆抓住了！', cx, cy + 10);
    }
    ctx.fillStyle = '#ccaaaa';
    ctx.font = '18px';
    ctx.fillText(`已收集 ${collected}/${total} 个钥匙碎片`, cx, cy + 50);

    if (this.defeatTimer > 1.5) {
      const btnW = 200;
      const btnH = 50;
      const btnX = cx - btnW / 2;
      const btnY = cy + 100;
      ctx.fillStyle = '#6e1a1a';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 2;
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('返回主菜单', cx, btnY + btnH / 2 + 2);
    }

    ctx.restore();
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

new Game();
