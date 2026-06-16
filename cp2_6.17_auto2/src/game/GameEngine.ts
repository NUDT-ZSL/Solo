import { PlayerController } from './PlayerController';
import { EnemyAI } from './EnemyAI';
import type { LevelData, TargetItem, HUDData, AlertLevel, LevelProgress } from '../types';

interface GameEngineCallbacks {
  levelId: string;
  progress: Record<string, LevelProgress>;
  onHUDUpdate: (data: HUDData) => void;
  onStolenItem: (levelId: string, itemId: string) => void;
  onAllItemsStolen: () => void;
  onGameOver: () => void;
  onVictory: (levelId: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;
  private player!: PlayerController;
  private enemyAI!: EnemyAI;
  private levelData: LevelData | null = null;
  private items: TargetItem[] = [];
  private running = false;
  private animationFrameId: number = 0;
  private lastTime = 0;
  private hudUpdateTimer = 0;
  private totalDetectionTime = 0;
  private readonly MAX_DETECTION_TIME = 5000;
  private gameOverTriggered = false;
  private allStolenNotified = false;
  private victoryTriggered = false;
  private tileSize = 40;
  private stolenItemsSet: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
  }

  public async init(): Promise<void> {
    try {
      const response = await fetch(`/api/levels/${this.callbacks.levelId}`);
      this.levelData = await response.json();
    } catch (e) {
      console.error('Failed to load level data, using fallback:', e);
      this.levelData = this.getFallbackLevelData();
    }

    this.setupLevel();
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private getFallbackLevelData(): LevelData {
    const tiles: number[][] = [];
    const cols = 24;
    const rows = 16;
    
    for (let y = 0; y < rows; y++) {
      tiles[y] = [];
      for (let x = 0; x < cols; x++) {
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
          tiles[y][x] = 1;
        } else if (
          (x >= 4 && x <= 7 && y >= 3 && y <= 6) ||
          (x >= 14 && x <= 18 && y >= 9 && y <= 12) ||
          (x >= 9 && x <= 12 && y >= 2 && y <= 4) ||
          (x >= 16 && x <= 19 && y >= 3 && y <= 5)
        ) {
          tiles[y][x] = 1;
        } else if (
          (x === 3 && y >= 4 && y <= 5) ||
          (x === 13 && y >= 10 && y <= 11)
        ) {
          tiles[y][x] = 2;
        } else if (
          (x >= 2 && x <= 3 && y >= 11 && y <= 13) ||
          (x >= 19 && x <= 21 && y >= 6 && y <= 7)
        ) {
          tiles[y][x] = 3;
        } else {
          tiles[y][x] = 0;
        }
      }
    }

    return {
      id: '1',
      name: '暗夜街巷',
      width: 960,
      height: 640,
      tileSize: 40,
      tiles,
      enemies: [
        {
          id: 'guard1',
          type: 'patrol',
          x: 360,
          y: 300,
          pathPoints: [
            { x: 360, y: 300 },
            { x: 360, y: 480 },
            { x: 560, y: 480 },
            { x: 560, y: 300 }
          ]
        },
        {
          id: 'light1',
          type: 'searchlight',
          x: 120,
          y: 80,
          pathPoints: [],
          visionAngle: Math.PI / 4,
          rotationSpeed: 0.02
        },
        {
          id: 'light2',
          type: 'searchlight',
          x: 840,
          y: 560,
          pathPoints: [],
          visionAngle: Math.PI + Math.PI / 4,
          rotationSpeed: -0.018
        },
        {
          id: 'dog1',
          type: 'dog',
          x: 700,
          y: 200,
          pathPoints: [
            { x: 700, y: 200 },
            { x: 860, y: 200 },
            { x: 860, y: 360 },
            { x: 700, y: 360 }
          ]
        }
      ],
      targetItems: [
        { id: 'item1', x: 200, y: 160, name: '机密文件', stealTime: 1500, stolen: false },
        { id: 'item2', x: 800, y: 280, name: '钻石项链', stealTime: 1500, stolen: false },
        { id: 'item3', x: 440, y: 540, name: '加密硬盘', stealTime: 1500, stolen: false }
      ],
      playerSpawn: { x: 80, y: 560 },
      exitPoint: { x: 900, y: 560 }
    };
  }

  private setupLevel(): void {
    if (!this.levelData) return;

    this.tileSize = this.levelData.tileSize;
    const progress = this.callbacks.progress[this.callbacks.levelId];
    this.stolenItemsSet = new Set(progress?.stolenItems || []);

    this.player = new PlayerController(
      this.levelData.playerSpawn.x,
      this.levelData.playerSpawn.y
    );
    this.player.init();
    this.player.onEcho = (x, y) => {
      if (this.enemyAI) {
        this.enemyAI.triggerEchoAlert(x, y);
      }
    };

    this.enemyAI = new EnemyAI(this.levelData.enemies);

    this.items = this.levelData.targetItems.map(item => ({
      ...item,
      stolen: this.stolenItemsSet.has(item.id)
    }));
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.running) return;

    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.hudUpdateTimer += deltaTime;
    if (this.hudUpdateTimer >= 50) {
      this.hudUpdateTimer = 0;
      this.updateHUD();
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    if (!this.levelData || this.gameOverTriggered || this.victoryTriggered) return;

    this.player.update(deltaTime, this.checkCollision.bind(this));
    this.checkShadow();

    const playerPos = {
      x: this.player.state.x,
      y: this.player.state.y,
      width: this.player.state.width,
      height: this.player.state.height,
      inShadow: this.player.state.inShadow
    };

    const detected = this.enemyAI.update(
      deltaTime,
      playerPos,
      this.checkCollision.bind(this),
      this.checkLineOfSight.bind(this)
    );

    const maxDetection = this.enemyAI.getMaxDetectionTime();
    if (maxDetection > 0) {
      this.totalDetectionTime += deltaTime;
    } else {
      this.totalDetectionTime = Math.max(0, this.totalDetectionTime - deltaTime * 0.3);
    }

    if (this.totalDetectionTime >= this.MAX_DETECTION_TIME) {
      this.gameOverTriggered = true;
      this.callbacks.onGameOver();
      return;
    }

    this.updateStealing(deltaTime);
    this.checkVictory();
  }

  private checkShadow(): void {
    if (!this.levelData) return;
    const center = this.player.getCenter();
    const tx = Math.floor(center.x / this.tileSize);
    const ty = Math.floor(center.y / this.tileSize);

    if (ty >= 0 && ty < this.levelData.tiles.length &&
        tx >= 0 && tx < this.levelData.tiles[0].length) {
      this.player.state.inShadow = this.levelData.tiles[ty][tx] === 3;
    } else {
      this.player.state.inShadow = false;
    }
  }

  private updateStealing(deltaTime: number): void {
    if (!this.player.state.isStealing) return;

    const playerCenter = this.player.getCenter();
    let nearestItem: TargetItem | null = null;
    let nearestDist = Infinity;

    for (const item of this.items) {
      if (item.stolen) continue;
      const dx = playerCenter.x - item.x;
      const dy = playerCenter.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50 && dist < nearestDist) {
        nearestDist = dist;
        nearestItem = item;
      }
    }

    if (nearestItem) {
      if (this.player.state.stealTargetId !== nearestItem.id) {
        this.player.state.stealTargetId = nearestItem.id;
        this.player.state.stealProgress = 0;
      }
      this.player.state.stealProgress += deltaTime;

      if (this.player.state.stealProgress >= nearestItem.stealTime) {
        nearestItem.stolen = true;
        this.stolenItemsSet.add(nearestItem.id);
        this.callbacks.onStolenItem(this.callbacks.levelId, nearestItem.id);
        this.player.state.stealProgress = 0;
        this.player.state.stealTargetId = null;

        const remaining = this.items.filter(i => !i.stolen);
        if (remaining.length === 0 && !this.allStolenNotified) {
          this.allStolenNotified = true;
          this.callbacks.onAllItemsStolen();
        }
      }
    } else {
      this.player.state.stealProgress = 0;
      this.player.state.stealTargetId = null;
    }
  }

  private checkVictory(): void {
    if (!this.levelData) return;
    const remaining = this.items.filter(i => !i.stolen);
    if (remaining.length > 0) return;

    const playerCenter = this.player.getCenter();
    const exit = this.levelData.exitPoint;
    const dx = playerCenter.x - exit.x;
    const dy = playerCenter.y - exit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 40 && !this.victoryTriggered) {
      this.victoryTriggered = true;
      this.callbacks.onVictory(this.callbacks.levelId);
    }
  }

  private checkCollision(x: number, y: number, w: number, h: number): boolean {
    if (!this.levelData) return true;

    if (x < 0 || y < 0 || x + w > this.levelData.width || y + h > this.levelData.height) {
      return true;
    }

    const left = Math.floor(x / this.tileSize);
    const right = Math.floor((x + w - 1) / this.tileSize);
    const top = Math.floor(y / this.tileSize);
    const bottom = Math.floor((y + h - 1) / this.tileSize);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (ty < 0 || ty >= this.levelData.tiles.length ||
            tx < 0 || tx >= this.levelData.tiles[0].length) {
          return true;
        }
        const tile = this.levelData.tiles[ty][tx];
        if (tile === 1) return true;
      }
    }
    return false;
  }

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    if (!this.levelData) return false;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / (this.tileSize / 4));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const tx = Math.floor(px / this.tileSize);
      const ty = Math.floor(py / this.tileSize);

      if (ty >= 0 && ty < this.levelData.tiles.length &&
          tx >= 0 && tx < this.levelData.tiles[0].length) {
        if (this.levelData.tiles[ty][tx] === 1) return false;
      }
    }
    return true;
  }

  private render(): void {
    if (!this.levelData) return;
    const ctx = this.ctx;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderTiles();
    this.renderExit();
    this.renderItems();
    this.renderVisionCones();
    this.renderSearchlights();
    this.renderEnemies();
    this.renderPlayer();
    this.renderEchoEffects();
    this.renderStealProgress();
    this.renderShadowOverlay();
  }

  private renderTiles(): void {
    if (!this.levelData) return;
    const ctx = this.ctx;
    const tiles = this.levelData.tiles;

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const tile = tiles[y][x];

        switch (tile) {
          case 0:
            ctx.fillStyle = '#2d2d44';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#252538';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);
            ctx.fillStyle = '#32324d';
            for (let i = 0; i < 2; i++) {
              const sx = px + 4 + ((x * 3 + i * 17) % (this.tileSize - 12));
              const sy = py + 4 + ((y * 7 + i * 23) % (this.tileSize - 12));
              ctx.fillRect(sx, sy, 4, 4);
            }
            break;
          case 1:
            const gradient = ctx.createLinearGradient(px, py, px, py + this.tileSize);
            gradient.addColorStop(0, '#4a4a6a');
            gradient.addColorStop(0.3, '#2a2a45');
            gradient.addColorStop(1, '#0f0f23');
            ctx.fillStyle = gradient;
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.fillStyle = '#5a5a7a';
            ctx.fillRect(px, py, this.tileSize, 6);
            ctx.strokeStyle = '#1a1a35';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);
            break;
          case 2:
            ctx.fillStyle = '#2d2d44';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.fillStyle = '#5a5a8a';
            for (let ly = 0; ly < this.tileSize; ly += 10) {
              ctx.fillRect(px, py + ly, this.tileSize, 2);
            }
            ctx.strokeStyle = '#6a6aaa';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
            break;
          case 3:
            ctx.fillStyle = '#2d2d44';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#252538';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);
            break;
        }
      }
    }
  }

  private renderShadowOverlay(): void {
    if (!this.levelData) return;
    const ctx = this.ctx;
    const tiles = this.levelData.tiles;

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        if (tiles[y][x] === 3) {
          const px = x * this.tileSize;
          const py = y * this.tileSize;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        }
      }
    }
  }

  private renderVisionCones(): void {
    const ctx = this.ctx;

    for (const enemy of this.enemyAI.enemies) {
      if (enemy.type === 'searchlight') continue;

      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      let visionAngle = enemy.facingAngle;

      let color: string;
      if (enemy.detectTimer > 2000) {
        color = 'rgba(239, 68, 68, 0.2)';
      } else if (enemy.state === 'alert' || enemy.state === 'investigate' || enemy.state === 'chase') {
        color = 'rgba(234, 179, 8, 0.18)';
      } else {
        color = 'rgba(255, 224, 102, 0.1)';
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const halfAngle = enemy.visionConeAngle / 2;
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const angle = visionAngle - halfAngle + (enemy.visionConeAngle * i) / steps;
        const rx = cx + Math.cos(angle) * enemy.visionRange;
        const ry = cy + Math.sin(angle) * enemy.visionRange;
        ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  }

  private renderSearchlights(): void {
    const ctx = this.ctx;

    for (const enemy of this.enemyAI.enemies) {
      if (enemy.type !== 'searchlight') continue;

      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      const angle = enemy.searchlightAngle;

      const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, enemy.visionRange);
      if (enemy.detectTimer > 2000) {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (enemy.detectTimer > 0) {
        gradient.addColorStop(0, 'rgba(234, 179, 8, 0.5)');
        gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 224, 102, 0.45)');
        gradient.addColorStop(0.5, 'rgba(255, 221, 87, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 221, 87, 0)');
      }

      const halfAngle = enemy.visionConeAngle / 2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const a = angle - halfAngle + (enemy.visionConeAngle * i) / steps;
        ctx.lineTo(
          cx + Math.cos(a) * enemy.visionRange,
          cy + Math.sin(a) * enemy.visionRange
        );
      }
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#1a1a35';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a4a6a';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffdd57';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18);
      ctx.stroke();
    }
  }

  private renderEnemies(): void {
    const ctx = this.ctx;

    for (const enemy of this.enemyAI.enemies) {
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;

      switch (enemy.type) {
        case 'patrol':
          this.drawGuard(ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.facingAngle, enemy.animFrame, enemy.state);
          break;
        case 'dog':
          this.drawDog(ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.facingAngle, enemy.animFrame, enemy.state);
          break;
      }

      if (enemy.state === 'alert' || enemy.state === 'investigate' || enemy.state === 'chase') {
        ctx.save();
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        const text = enemy.state === 'chase' ? '❗' : '!';
        const color = enemy.state === 'chase' ? '#ef4444' : '#eab308';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillText(text, cx, enemy.y - 8);
        ctx.restore();
      }

      if (enemy.type === 'dog' && enemy.hasBarked) {
        ctx.save();
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#ffdd57';
        ctx.textAlign = 'center';
        ctx.fillText('汪！', cx + 20, enemy.y - 4);
        ctx.restore();
      }

      if (enemy.detectTimer > 0) {
        const barWidth = 36;
        const barHeight = 4;
        const progress = Math.min(1, enemy.detectTimer / 3000);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(cx - barWidth / 2, enemy.y - 16, barWidth, barHeight);
        ctx.fillStyle = progress > 0.6 ? '#ef4444' : '#eab308';
        ctx.fillRect(cx - barWidth / 2, enemy.y - 16, barWidth * progress, barHeight);
      }
    }
  }

  private drawGuard(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    angle: number, frame: number, state: string
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const bob = Math.sin(frame * Math.PI / 2) * 1.5;

    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x + 2, y + 10 + bob, w - 4, h - 14);

    ctx.fillStyle = '#2d4a7f';
    ctx.fillRect(x + 1, y + 10 + bob, w - 2, 6);

    ctx.fillStyle = '#e0c098';
    ctx.beginPath();
    ctx.arc(cx, y + 8 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = state === 'chase' ? '#5f1e1e' : '#1a2744';
    ctx.fillRect(cx - 7, y + 2 + bob, 14, 5);

    ctx.fillStyle = '#1a2744';
    const legOffset = Math.sin(frame * Math.PI / 2) * 3;
    ctx.fillRect(x + 4, y + h - 6, 5, 6 + legOffset);
    ctx.fillRect(x + w - 9, y + h - 6, 5, 6 - legOffset);

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + bob);
    ctx.lineTo(cx + Math.cos(angle) * 16, cy + Math.sin(angle) * 16 + bob);
    ctx.stroke();
  }

  private drawDog(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    angle: number, frame: number, state: string
  ): void {
    const cx = x + w / 2;
    const bob = Math.sin(frame * Math.PI / 2) * 1.5;

    ctx.fillStyle = state === 'chase' ? '#6b3a3a' : '#5a4a3a';
    ctx.fillRect(x + 2, y + 4 + bob, w - 6, h - 8);

    const headX = angle > -Math.PI / 2 && angle < Math.PI / 2 ? x + w - 8 : x;
    ctx.fillStyle = state === 'chase' ? '#7b4a4a' : '#6a5a4a';
    ctx.beginPath();
    ctx.arc(headX + 4, y + 7 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(headX + (angle > -Math.PI / 2 && angle < Math.PI / 2 ? 7 : 1), y + 6 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (state === 'chase') {
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.fillText('︿', headX + 2, y + 3 + bob);
    }

    ctx.fillStyle = state === 'chase' ? '#6b3a3a' : '#5a4a3a';
    const legOffset = Math.sin(frame * Math.PI / 2) * 2;
    ctx.fillRect(x + 4, y + h - 5, 4, 5 + legOffset);
    ctx.fillRect(x + w - 10, y + h - 5, 4, 5 - legOffset);
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const s = this.player.state;
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;
    const bob = s.isMoving ? Math.sin(s.animFrame * Math.PI / 2) * 2 : Math.sin(s.idleTimer / 500) * 0.8;

    if (s.inShadow) {
      ctx.save();
      ctx.globalAlpha = 0.7;
    }

    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(s.x + 2, s.y + 10 + bob, s.width - 4, s.height - 14);

    ctx.fillStyle = '#3a3a5a';
    ctx.fillRect(s.x + 1, s.y + 10 + bob, s.width - 2, 5);

    ctx.fillStyle = '#d0b088';
    ctx.beginPath();
    ctx.arc(cx, s.y + 8 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(cx - 7, s.y + 5 + bob, 14, 4);
    ctx.fillStyle = '#1a5a7a';
    ctx.fillRect(cx - 5, s.y + 6 + bob, 4, 2);
    ctx.fillRect(cx + 1, s.y + 6 + bob, 4, 2);

    ctx.fillStyle = '#2a2a4a';
    const legOffset = s.isMoving ? Math.sin(s.animFrame * Math.PI / 2) * 3 : 0;
    ctx.fillRect(s.x + 3, s.y + s.height - 6, 5, 6 + legOffset);
    ctx.fillRect(s.x + s.width - 8, s.y + s.height - 6, 5, 6 - legOffset);

    if (s.inShadow) {
      ctx.restore();
    }

    if (s.echoCooldown <= 0) {
      ctx.save();
      const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255, 221, 87, ${pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderEchoEffects(): void {
    const ctx = this.ctx;

    for (const effect of this.player.echoEffects) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 221, 87, ${effect.alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffdd57';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (effect.radius > 40) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 221, 87, ${effect.alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private renderItems(): void {
    const ctx = this.ctx;
    const time = Date.now();

    for (const item of this.items) {
      if (item.stolen) continue;

      const bob = Math.sin(time / 400 + item.x) * 3;

      ctx.save();
      const pulse = Math.sin(time / 300) * 0.2 + 0.8;
      ctx.shadowColor = '#ffdd57';
      ctx.shadowBlur = 15 * pulse;

      ctx.fillStyle = '#ffdd57';
      ctx.strokeStyle = '#aa8822';
      ctx.lineWidth = 2;

      ctx.beginPath();
      const size = 14;
      ctx.moveTo(item.x, item.y - size / 2 + bob);
      ctx.lineTo(item.x + size / 2, item.y + bob);
      ctx.lineTo(item.x, item.y + size / 2 + bob);
      ctx.lineTo(item.x - size / 2, item.y + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(item.x - 3, item.y - 2 + bob, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.save();
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#a0a0b0';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, item.x, item.y + 28 + bob);
      ctx.restore();
    }
  }

  private renderExit(): void {
    if (!this.levelData) return;
    const remaining = this.items.filter(i => !i.stolen);
    if (remaining.length > 0) return;

    const ctx = this.ctx;
    const exit = this.levelData.exitPoint;
    const time = Date.now();
    const pulse = Math.sin(time / 200) * 0.3 + 0.7;

    ctx.save();
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 20 * pulse;

    ctx.fillStyle = `rgba(34, 197, 94, ${0.3 * pulse})`;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(exit.x - 10, exit.y - 15);
    ctx.lineTo(exit.x + 15, exit.y);
    ctx.lineTo(exit.x - 10, exit.y + 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(34, 197, 94, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText('出口', exit.x, exit.y + 48);
  }

  private renderStealProgress(): void {
    if (!this.player.state.isStealing || !this.player.state.stealTargetId) return;

    const item = this.items.find(i => i.id === this.player.state.stealTargetId);
    if (!item) return;

    const ctx = this.ctx;
    const progress = this.player.state.stealProgress / item.stealTime;
    const radius = 24;

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 30, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffdd57';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffdd57';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 30, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffdd57';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(progress * 100)}%`, item.x, item.y - 26);
    ctx.restore();
  }

  private updateHUD(): void {
    if (!this.levelData) return;

    const alertLevel: AlertLevel = this.enemyAI.globalAlertLevel;
    const stolenCount = this.items.filter(i => i.stolen).length;
    const detectionProgress = Math.min(1, this.totalDetectionTime / this.MAX_DETECTION_TIME);

    const data: HUDData = {
      alertLevel,
      stolenCount,
      totalItems: this.items.length,
      echoCooldown: this.player.state.echoCooldown,
      maxEchoCooldown: this.player.state.maxEchoCooldown,
      detectionProgress,
      currentLevelName: this.levelData.name
    };

    this.callbacks.onHUDUpdate(data);
  }

  public destroy(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.player) {
      this.player.destroy();
    }
  }
}
