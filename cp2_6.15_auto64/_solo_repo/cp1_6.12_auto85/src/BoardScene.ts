import Phaser from 'phaser';
import { MineController, PlayerId, ItemType } from './controllers/MineController';
import { UIManager } from './ui/UIManager';

const NUMBER_COLORS: Record<number, string> = {
  1: '#3498db',
  2: '#2ecc71',
  3: '#e74c3c',
  4: '#9b59b6',
  5: '#e67e22',
  6: '#1abc9c',
  7: '#34495e',
  8: '#7f8c8d',
};

const TURN_TIME = 15;
const FROZEN_TURN_TIME = 5;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  alpha: number;
}

interface FlagAnimation {
  row: number;
  col: number;
  progress: number;
  expanding: boolean;
}

interface ShieldBreakAnim {
  row: number;
  col: number;
  progress: number;
}

export class BoardScene extends Phaser.Scene {
  private controller!: MineController;
  private uiManager!: UIManager;

  private cellSize = 40;
  private boardX = 0;
  private boardY = 0;

  private boardGraphics!: Phaser.GameObjects.Graphics;
  private numberTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private flagGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private rippleGraphics!: Phaser.GameObjects.Graphics;
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private radarGraphics!: Phaser.GameObjects.Graphics;
  private shieldGraphics!: Phaser.GameObjects.Graphics;

  private cursor1Graphics!: Phaser.GameObjects.Graphics;
  private cursor2Graphics!: Phaser.GameObjects.Graphics;

  private particles: Particle[] = [];
  private ripples: RippleEffect[] = [];
  private flagAnims: FlagAnimation[] = [];
  private shieldBreakAnims: ShieldBreakAnim[] = [];

  private turnTimer = 0;
  private currentTurnTime = TURN_TIME;
  private gameOver = false;

  private keysP1!: { [key: string]: Phaser.Input.Keyboard.Key };
  private keysP2!: { [key: string]: Phaser.Input.Keyboard.Key };
  private moveCooldownP1 = 0;
  private moveCooldownP2 = 0;
  private readonly MOVE_COOLDOWN = 120;

  private lastTime = 0;
  private fpsCounter = 0;
  private fpsTime = 0;

  constructor() {
    super({ key: 'BoardScene' });
  }

  preload(): void {}

  create(): void {
    this.controller = new MineController();
    this.uiManager = new UIManager(this, this.controller);

    this.boardGraphics = this.add.graphics();
    this.rippleGraphics = this.add.graphics();
    this.radarGraphics = this.add.graphics();
    this.shieldGraphics = this.add.graphics();

    this.particleCanvas = document.createElement('canvas');
    this.particleCtx = this.particleCanvas.getContext('2d')!;

    const texture = this.textures.createCanvas('particleTex', 1024, 1024);
    this.particleSprite = this.add.image(0, 0, 'particleTex').setOrigin(0, 0);
    this.particleSprite.setDepth(50);

    this.cursor1Graphics = this.add.graphics();
    this.cursor2Graphics = this.add.graphics();
    this.cursor1Graphics.setDepth(100);
    this.cursor2Graphics.setDepth(100);

    this.setupInput();
    this.resizeBoard();

    this.scale.on('resize', this.onResize, this);

    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
  }

  private setupInput(): void {
    this.keysP1 = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      click: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      flag: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      item: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      itemNext: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
    };

    this.keysP2 = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      click: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      flag: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      item: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O),
      itemNext: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P),
    };

    this.keysP1.click.on('down', () => {
      if (this.controller.currentPlayer === 1 && !this.gameOver) {
        this.handleClick(1);
      }
    });

    this.keysP2.click.on('down', () => {
      if (this.controller.currentPlayer === 2 && !this.gameOver) {
        this.handleClick(2);
      }
    });

    this.keysP1.flag.on('down', () => {
      if (this.controller.currentPlayer === 1 && !this.gameOver) {
        this.handleFlag(1);
      }
    });

    this.keysP2.flag.on('down', () => {
      if (this.controller.currentPlayer === 2 && !this.gameOver) {
        this.handleFlag(2);
      }
    });

    this.keysP1.item.on('down', () => {
      if (this.controller.currentPlayer === 1 && !this.gameOver) {
        this.useItem(1);
      }
    });

    this.keysP2.item.on('down', () => {
      if (this.controller.currentPlayer === 2 && !this.gameOver) {
        this.useItem(2);
      }
    });

    this.keysP1.itemNext.on('down', () => {
      if (!this.gameOver) {
        this.uiManager.cycleSelectedItem(1, true);
      }
    });

    this.keysP2.itemNext.on('down', () => {
      if (!this.gameOver) {
        this.uiManager.cycleSelectedItem(2, true);
      }
    });
  }

  private resizeBoard(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    const panelTotal = 120 * 2 + 32;
    const availableW = w - panelTotal - 40;
    const availableH = h - 40;

    let size = Math.floor(Math.min(availableW / 16, availableH / 16));
    size = Math.max(36, Math.min(64, size));
    this.cellSize = size;

    const boardPixelSize = size * 16;
    this.boardX = (w - boardPixelSize) / 2;
    this.boardY = (h - boardPixelSize) / 2;

    this.particleCanvas.width = w;
    this.particleCanvas.height = h;
    if (this.textures.exists('particleTex')) {
      this.textures.remove('particleTex');
    }
    this.textures.createCanvas('particleTex', w, h);

    this.rebuildBoard();
    this.uiManager.createUI(this.boardX, this.boardY, boardPixelSize, boardPixelSize);
    this.uiManager.updateItemCards();
    this.uiManager.updatePlayerCounts();
  }

  private rebuildBoard(): void {
    this.boardGraphics.clear();
    this.rippleGraphics.clear();
    this.radarGraphics.clear();
    this.shieldGraphics.clear();

    this.numberTexts.forEach(t => t.destroy());
    this.numberTexts.clear();

    this.flagGraphics.forEach(g => g.destroy());
    this.flagGraphics.clear();

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const x = this.boardX + c * this.cellSize;
        const y = this.boardY + r * this.cellSize;
        const cell = this.controller.getCell(r, c);

        this.drawCellBackground(x, y, cell);

        if (cell.state === 'revealed') {
          if (cell.isMine && !cell.shieldBroken) {
            this.drawMine(x, y);
          } else if (cell.adjacentMines > 0) {
            this.drawNumber(r, c, x, y, cell.adjacentMines);
          }
          if (cell.shieldBroken) {
            this.drawShieldIcon(x, y);
          }
        } else if (cell.state === 'flagged') {
          this.drawFlag(r, c, x, y);
        }
      }
    }
  }

  private drawCellBackground(x: number, y: number, cell: any): void {
    const size = this.cellSize;
    const border = 1;

    this.boardGraphics.lineStyle(border, 0x34495e, 1);

    if (cell.state === 'hidden' || cell.state === 'flagged') {
      this.boardGraphics.fillStyle(0x3d566e, 1);
      this.boardGraphics.fillRect(x, y, size - border, size - border);
      this.boardGraphics.strokeRect(x, y, size - border, size - border);

      this.boardGraphics.fillStyle(0x4a6b8a, 1);
      this.boardGraphics.fillRect(x + 2, y + 2, size - 6, size - 6);
    } else if (cell.state === 'revealed') {
      const bgColor = cell.revealedBy === 1 ? 0x4a2c3a : cell.revealedBy === 2 ? 0x2c3a4a : 0x34495e;
      this.boardGraphics.fillStyle(bgColor, 1);
      this.boardGraphics.fillRect(x, y, size - border, size - border);
      this.boardGraphics.strokeRect(x, y, size - border, size - border);
    }
  }

  private drawNumber(row: number, col: number, x: number, y: number, num: number): void {
    const key = `${row},${col}`;
    const color = NUMBER_COLORS[num] || '#ffffff';
    const text = this.add.text(x + this.cellSize / 2, y + this.cellSize / 2, num.toString(), {
      fontSize: `${Math.floor(this.cellSize * 0.55)}px`,
      fontStyle: 'bold',
      color: color,
    }).setOrigin(0.5);
    this.numberTexts.set(key, text);
  }

  private drawMine(x: number, y: number): void {
    const cx = x + this.cellSize / 2;
    const cy = y + this.cellSize / 2;
    const r = this.cellSize * 0.35;

    this.boardGraphics.fillStyle(0x000000, 1);
    this.boardGraphics.fillCircle(cx, cy, r);

    this.boardGraphics.fillStyle(0x2c3e50, 0.8);
    this.boardGraphics.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.25);
  }

  private drawFlag(row: number, col: number, x: number, y: number): void {
    const key = `${row},${col}`;
    const g = this.add.graphics();
    const poleX = x + this.cellSize * 0.35;
    const poleTop = y + this.cellSize * 0.2;
    const poleBottom = y + this.cellSize * 0.8;

    g.lineStyle(2, 0xbdc3c7, 1);
    g.strokeLineShape(new Phaser.Geom.Line(poleX, poleTop, poleX, poleBottom));

    g.fillStyle(0xe74c3c, 1);
    const flagW = this.cellSize * 0.35;
    const flagH = this.cellSize * 0.25;
    g.fillTriangle(poleX, poleTop, poleX + flagW, poleTop + flagH / 2, poleX, poleTop + flagH);

    this.flagGraphics.set(key, g);
  }

  private drawShieldIcon(x: number, y: number): void {
    const cx = x + this.cellSize / 2;
    const cy = y + this.cellSize / 2;
    const size = this.cellSize * 0.5;

    this.shieldGraphics.fillStyle(0x27ae60, 0.8);
    this.shieldGraphics.lineStyle(2, 0x2ecc71, 1);

    this.shieldGraphics.beginPath();
    this.shieldGraphics.moveTo(cx, cy - size * 0.5);
    this.shieldGraphics.lineTo(cx + size * 0.45, cy - size * 0.2);
    this.shieldGraphics.lineTo(cx + size * 0.4, cy + size * 0.3);
    this.shieldGraphics.lineTo(cx, cy + size * 0.5);
    this.shieldGraphics.lineTo(cx - size * 0.4, cy + size * 0.3);
    this.shieldGraphics.lineTo(cx - size * 0.45, cy - size * 0.2);
    this.shieldGraphics.closePath();
    this.shieldGraphics.fillPath();
    this.shieldGraphics.strokePath();
  }

  private handleClick(playerId: PlayerId): void {
    const player = this.controller.getPlayer(playerId);
    const row = player.cursorRow;
    const col = player.cursorCol;

    const cell = this.controller.getCell(row, col);
    if (cell.state !== 'hidden') return;

    const result = this.controller.revealCell(row, col, playerId);

    result.revealed.forEach(c => {
      this.refreshCell(c.row, c.col);
      this.addRipple(c.row, c.col);
    });

    if (result.hitMine) {
      this.addExplosion(row, col);
      this.endGame();
    }

    if (result.shieldTriggered) {
      this.addShieldBreak(row, col);
    }

    this.uiManager.updatePlayerCounts();
    this.uiManager.updateItemCards();

    if (!result.hitMine && this.controller.gameStatus === 'playing') {
      this.endTurn();
    }
  }

  private handleFlag(playerId: PlayerId): void {
    const player = this.controller.getPlayer(playerId);
    const row = player.cursorRow;
    const col = player.cursorCol;

    const cell = this.controller.getCell(row, col);
    if (cell.state === 'revealed') return;

    const wasFlagged = cell.state === 'flagged';
    this.controller.toggleFlag(row, col);

    if (!wasFlagged) {
      this.flagAnims.push({ row, col, progress: 0, expanding: true });
    } else {
      const key = `${row},${col}`;
      const g = this.flagGraphics.get(key);
      if (g) {
        g.destroy();
        this.flagGraphics.delete(key);
      }
    }
  }

  private useItem(playerId: PlayerId): void {
    let selected = this.uiManager.getSelectedItem(playerId);
    if (!selected) {
      selected = this.uiManager.cycleSelectedItem(playerId, true);
      if (!selected) return;
    }

    const result = this.controller.useItem(playerId, selected);
    if (result.success) {
      if (result.effect === 'radar' && result.radarResult) {
        // radar effect handled in update loop
      }
      this.uiManager.updateItemCards();
    }
  }

  private refreshCell(row: number, col: number): void {
    const x = this.boardX + col * this.cellSize;
    const y = this.boardY + row * this.cellSize;
    const cell = this.controller.getCell(row, col);
    const key = `${row},${col}`;

    const oldText = this.numberTexts.get(key);
    if (oldText) {
      oldText.destroy();
      this.numberTexts.delete(key);
    }

    const oldFlag = this.flagGraphics.get(key);
    if (oldFlag) {
      oldFlag.destroy();
      this.flagGraphics.delete(key);
    }

    this.drawCellBackground(x, y, cell);

    if (cell.state === 'revealed') {
      if (cell.isMine && !cell.shieldBroken) {
        this.drawMine(x, y);
      } else if (cell.adjacentMines > 0) {
        this.drawNumber(row, col, x, y, cell.adjacentMines);
      }
      if (cell.shieldBroken) {
        this.drawShieldIcon(x, y);
      }
    } else if (cell.state === 'flagged') {
      this.drawFlag(row, col, x, y);
    }
  }

  private addRipple(row: number, col: number): void {
    const cx = this.boardX + col * this.cellSize + this.cellSize / 2;
    const cy = this.boardY + row * this.cellSize + this.cellSize / 2;

    this.ripples.push({
      x: cx,
      y: cy,
      radius: 0,
      maxRadius: this.cellSize * 0.8,
      life: 0,
      maxLife: 350,
      alpha: 0.6,
    });
  }

  private addExplosion(row: number, col: number): void {
    const cx = this.boardX + col * this.cellSize + this.cellSize / 2;
    const cy = this.boardY + row * this.cellSize + this.cellSize / 2;
    const count = Math.min(60, 80);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      const colors = ['#e74c3c', '#e67e22', '#f39c12', '#d35400', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 500,
        maxLife: 500,
        size: 2 + Math.random() * 5,
        color,
        alpha: 1,
      });
    }
  }

  private addShieldBreak(row: number, col: number): void {
    this.shieldBreakAnims.push({ row, col, progress: 0 });
  }

  private endTurn(): void {
    this.controller.endTurn();
    this.resetTurnTimer();
  }

  private resetTurnTimer(): void {
    const isFrozen = this.controller.isCurrentPlayerFrozen();
    this.currentTurnTime = isFrozen ? FROZEN_TURN_TIME : TURN_TIME;
    this.turnTimer = 0;
  }

  private endGame(): void {
    this.gameOver = true;
    const stats = this.controller.getStats();
    this.time.delayedCall(800, () => {
      this.uiManager.showStatsPanel(stats, () => {
        this.restartGame();
      });
    });
  }

  private restartGame(): void {
    this.controller.restart();
    this.gameOver = false;
    this.particles = [];
    this.ripples = [];
    this.flagAnims = [];
    this.shieldBreakAnims = [];
    this.resetTurnTimer();
    this.rebuildBoard();
    this.uiManager.updatePlayerCounts();
    this.uiManager.updateItemCards();
    this.uiManager.setSelectedItem(1, null);
    this.uiManager.setSelectedItem(2, null);
  }

  private onResize = (gameSize: Phaser.Structs.Size): void => {
    this.resizeBoard();
  };

  update(time: number, delta: number): void {
    const dt = delta;

    this.fpsCounter++;
    if (time - this.fpsTime >= 1000) {
      this.fpsTime = time;
      this.fpsCounter = 0;
    }

    if (!this.gameOver) {
      this.turnTimer += dt;
      const remaining = Math.max(0, this.currentTurnTime - this.turnTimer / 1000);
      this.uiManager.updateTimer(this.controller.currentPlayer, remaining, this.currentTurnTime);

      if (this.turnTimer >= this.currentTurnTime * 1000) {
        this.endTurn();
      }
    }

    this.handleMovement(dt);
    this.updateCursors();
    this.updateRipples(dt);
    this.updateParticles(dt);
    this.updateFlagAnims(dt);
    this.updateShieldBreakAnims(dt);
    this.updateRadarEffect();
  }

  private handleMovement(dt: number): void {
    if (this.gameOver) return;

    this.moveCooldownP1 -= dt;
    this.moveCooldownP2 -= dt;

    const isFrozen = this.controller.isCurrentPlayerFrozen();
    const curPlayer = this.controller.currentPlayer;

    const p1Active = curPlayer === 1;
    const p2Active = curPlayer === 2;
    const p1SpeedMod = (isFrozen && curPlayer === 1) ? 2 : 1;
    const p2SpeedMod = (isFrozen && curPlayer === 2) ? 2 : 1;

    if (this.moveCooldownP1 <= 0) {
      let dr = 0, dc = 0;
      if (this.keysP1.up.isDown) dr = -1;
      else if (this.keysP1.down.isDown) dr = 1;
      if (this.keysP1.left.isDown) dc = -1;
      else if (this.keysP1.right.isDown) dc = 1;

      if ((dr !== 0 || dc !== 0) && p1Active) {
        this.controller.moveCursor(1, dr, dc);
        this.moveCooldownP1 = this.MOVE_COOLDOWN * p1SpeedMod;
      }
    }

    if (this.moveCooldownP2 <= 0) {
      let dr = 0, dc = 0;
      if (this.keysP2.up.isDown) dr = -1;
      else if (this.keysP2.down.isDown) dr = 1;
      if (this.keysP2.left.isDown) dc = -1;
      else if (this.keysP2.right.isDown) dc = 1;

      if ((dr !== 0 || dc !== 0) && p2Active) {
        this.controller.moveCursor(2, dr, dc);
        this.moveCooldownP2 = this.MOVE_COOLDOWN * p2SpeedMod;
      }
    }
  }

  private updateCursors(): void {
    this.cursor1Graphics.clear();
    this.cursor2Graphics.clear();

    const p1 = this.controller.getPlayer(1);
    const p2 = this.controller.getPlayer(2);

    this.drawCursor(this.cursor1Graphics, p1.cursorRow, p1.cursorCol, '#e74c3c', this.controller.currentPlayer === 1);
    this.drawCursor(this.cursor2Graphics, p2.cursorRow, p2.cursorCol, '#3498db', this.controller.currentPlayer === 2);
  }

  private drawCursor(graphics: Phaser.GameObjects.Graphics, row: number, col: number, color: string, active: boolean): void {
    const x = this.boardX + col * this.cellSize;
    const y = this.boardY + row * this.cellSize;
    const size = this.cellSize - 2;

    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    graphics.lineStyle(3, colorNum, active ? 1 : 0.4);
    graphics.strokeRect(x + 1, y + 1, size, size);

    if (active) {
      graphics.lineStyle(1, 0xffffff, 0.6);
      graphics.strokeRect(x + 3, y + 3, size - 4, size - 4);
    }
  }

  private updateRipples(dt: number): void {
    this.rippleGraphics.clear();

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += dt;

      const t = r.life / r.maxLife;
      if (t >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      r.radius = r.maxRadius * t;
      r.alpha = 0.6 * (1 - t);

      this.rippleGraphics.lineStyle(2, 0xffffff, r.alpha);
      this.rippleGraphics.strokeCircle(r.x, r.y, r.radius);
    }
  }

  private updateParticles(dt: number): void {
    const ctx = this.particleCtx;
    const w = this.particleCanvas.width;
    const h = this.particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy += 400 * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0 || p.y > h + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    const texture = this.textures.get('particleTex') as Phaser.Textures.CanvasTexture;
    if (texture && texture.source) {
      const source = texture.getSourceImage() as HTMLCanvasElement;
      if (source.width !== w || source.height !== h) {
        texture.setSize(w, h);
      }
      const srcCtx = source.getContext('2d');
      if (srcCtx) {
        srcCtx.clearRect(0, 0, source.width, source.height);
        srcCtx.drawImage(this.particleCanvas, 0, 0);
      }
      texture.refresh();
    }
  }

  private updateFlagAnims(dt: number): void {
    for (let i = this.flagAnims.length - 1; i >= 0; i--) {
      const anim = this.flagAnims[i];
      anim.progress += dt / 200;

      if (anim.progress >= 1) {
        this.flagAnims.splice(i, 1);
        continue;
      }

      const key = `${anim.row},${anim.col}`;
      let g = this.flagGraphics.get(key);
      if (!g) {
        g = this.add.graphics();
        this.flagGraphics.set(key, g);
      }
      g.clear();

      const x = this.boardX + anim.col * this.cellSize;
      const y = this.boardY + anim.row * this.cellSize;
      const progress = anim.progress;

      const poleX = x + this.cellSize * 0.35;
      const poleTop = y + this.cellSize * 0.2;
      const poleBottom = y + this.cellSize * 0.8;
      const currentPoleBottom = poleTop + (poleBottom - poleTop) * Math.min(1, progress * 1.5);

      g.lineStyle(2, 0xbdc3c7, 1);
      g.strokeLineShape(new Phaser.Geom.Line(poleX, poleTop, poleX, currentPoleBottom));

      if (progress > 0.3) {
        const flagProgress = (progress - 0.3) / 0.7;
        g.fillStyle(0xe74c3c, 1);
        const flagW = this.cellSize * 0.35 * flagProgress;
        const flagH = this.cellSize * 0.25 * flagProgress;
        g.fillTriangle(poleX, poleTop, poleX + flagW, poleTop + flagH / 2, poleX, poleTop + flagH);
      }
    }
  }

  private updateShieldBreakAnims(dt: number): void {
    for (let i = this.shieldBreakAnims.length - 1; i >= 0; i--) {
      const anim = this.shieldBreakAnims[i];
      anim.progress += dt / 600;

      if (anim.progress >= 1) {
        this.shieldBreakAnims.splice(i, 1);
        continue;
      }

      const x = this.boardX + anim.col * this.cellSize + this.cellSize / 2;
      const y = this.boardY + anim.row * this.cellSize + this.cellSize / 2;

      this.shieldGraphics.clear();
      const t = anim.progress;
      const pieces = 6;
      const size = this.cellSize * 0.4;

      for (let j = 0; j < pieces; j++) {
        const angle = (j / pieces) * Math.PI * 2;
        const dist = size * t * 2;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const rotAngle = t * 3 + j;

        this.shieldGraphics.fillStyle(0x27ae60, 1 - t);
        const w = size * 0.3;
        const h = size * 0.5;
        const hw = w / 2;
        const hh = h / 2;

        const corners = [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: hw, y: hh },
          { x: -hw, y: hh },
        ];

        const rotated = corners.map(c => {
          const rx = c.x * Math.cos(rotAngle) - c.y * Math.sin(rotAngle);
          const ry = c.x * Math.sin(rotAngle) + c.y * Math.cos(rotAngle);
          return { x: px + rx, y: py + ry };
        });

        this.shieldGraphics.beginPath();
        this.shieldGraphics.moveTo(rotated[0].x, rotated[0].y);
        this.shieldGraphics.lineTo(rotated[1].x, rotated[1].y);
        this.shieldGraphics.lineTo(rotated[2].x, rotated[2].y);
        this.shieldGraphics.lineTo(rotated[3].x, rotated[3].y);
        this.shieldGraphics.closePath();
        this.shieldGraphics.fillPath();
      }
    }
  }

  private updateRadarEffect(): void {
    this.radarGraphics.clear();

    const radarMines = this.controller.isRadarActive();
    if (radarMines.length === 0) return;

    const time = performance.now();
    const blink = Math.sin(time * Math.PI * 2 * 5) > 0;

    if (blink) {
      radarMines.forEach(m => {
        const x = this.boardX + m.col * this.cellSize;
        const y = this.boardY + m.row * this.cellSize;
        this.radarGraphics.fillStyle(0xe74c3c, 0.7);
        this.radarGraphics.fillRect(x + 4, y + 4, this.cellSize - 10, this.cellSize - 10);

        this.radarGraphics.lineStyle(2, 0xff0000, 0.9);
        this.radarGraphics.strokeRect(x + 2, y + 2, this.cellSize - 6, this.cellSize - 6);
      });
    }
  }
}
