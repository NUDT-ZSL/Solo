import Phaser from 'phaser';

interface MazeCell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  mirror: boolean;
}

interface Mechanism {
  type: 'pressure_plate' | 'light_pillar' | 'trap';
  cellX: number;
  cellY: number;
  sprite: Phaser.GameObjects.Sprite;
  triggered: boolean;
  linkedDoorCellX?: number;
  linkedDoorCellY?: number;
  linkedDoorSide?: string;
}

interface OrbData {
  cellX: number;
  cellY: number;
  sprite: Phaser.GameObjects.Sprite;
  collected: boolean;
}

const CELL_SIZE = 64;
const PLAYER_SPEED = 160;
const PHANTOM_OPPOSITE_CHANCE = 0.2;

export class GameScene extends Phaser.Scene {
  private level: number = 1;
  private mazeGrid: MazeCell[][] = [];
  private gridW: number = 0;
  private gridH: number = 0;
  private mazeOffsetX: number = 0;
  private mazeOffsetY: number = 0;

  private player!: Phaser.GameObjects.Sprite;
  private playerTrailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private phantoms: Phaser.GameObjects.Sprite[] = [];
  private phantomTrails: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  private mechanisms: Mechanism[] = [];
  private orbs: OrbData[] = [];
  private collectedOrbs: number = 0;
  private totalOrbs: number = 3;

  private portal!: Phaser.GameObjects.Sprite;
  private portalActive: boolean = false;
  private portalEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private wallGraphics!: Phaser.GameObjects.Graphics;
  private mirrorWalls: { x1: number; y1: number; x2: number; y2: number }[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private touchTarget: { x: number; y: number } | null = null;

  private levelText!: Phaser.GameObjects.Text;
  private orbText!: Phaser.GameObjects.Text;
  private resetBtn!: Phaser.GameObjects.Container;
  private pauseBtn!: Phaser.GameObjects.Container;
  private isPaused: boolean = false;

  private doorWalls: Set<string> = new Set();
  private doorGraphics!: Phaser.GameObjects.Graphics;
  private mechanismPulseTime: number = 0;

  private playerAlive: boolean = true;
  private playerMoving: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { level?: number }): void {
    this.level = data.level || 1;
    this.collectedOrbs = 0;
    this.portalActive = false;
    this.isPaused = false;
    this.playerAlive = true;
    this.mazeGrid = [];
    this.phantoms = [];
    this.phantomTrails = [];
    this.mechanisms = [];
    this.orbs = [];
    this.doorWalls = new Set();
    this.mirrorWalls = [];
    this.touchTarget = null;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.createBackground(w, h);

    const gridSize = Math.min(5 + Math.floor((this.level - 1) / 2), 8);
    this.gridW = gridSize;
    this.gridH = gridSize;

    this.mazeOffsetX = (w - this.gridW * CELL_SIZE) / 2;
    this.mazeOffsetY = (h - this.gridH * CELL_SIZE) / 2;

    this.generateMaze();
    this.placeMechanisms();
    this.placeOrbs();
    this.placePortal();
    this.drawMaze();

    this.createPlayer();
    this.createPhantoms();
    this.createUI(w, h);

    this.setupInput();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000000, 0x000000, 0x0a0a40, 0x0a0a40, 1);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(-10);
  }

  private generateMaze(): void {
    for (let y = 0; y < this.gridH; y++) {
      this.mazeGrid[y] = [];
      for (let x = 0; x < this.gridW; x++) {
        this.mazeGrid[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          mirror: false,
        };
      }
    }

    const stack: MazeCell[] = [];
    const start = this.mazeGrid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Phaser.Math.Between(0, neighbors.length - 1)];
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      }
    }

    for (let y = 0; y < this.gridH; y++) {
      for (let x = 0; x < this.gridW; x++) {
        if (Math.random() < 0.25) {
          this.mazeGrid[y][x].mirror = true;
        }
      }
    }

    this.addExtraPaths();
  }

  private getUnvisitedNeighbors(cell: MazeCell): MazeCell[] {
    const neighbors: MazeCell[] = [];
    const { x, y } = cell;

    if (y > 0 && !this.mazeGrid[y - 1][x].visited) neighbors.push(this.mazeGrid[y - 1][x]);
    if (x < this.gridW - 1 && !this.mazeGrid[y][x + 1].visited) neighbors.push(this.mazeGrid[y][x + 1]);
    if (y < this.gridH - 1 && !this.mazeGrid[y + 1][x].visited) neighbors.push(this.mazeGrid[y + 1][x]);
    if (x > 0 && !this.mazeGrid[y][x - 1].visited) neighbors.push(this.mazeGrid[y][x - 1]);

    return neighbors;
  }

  private removeWallBetween(a: MazeCell, b: MazeCell): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (dx === 1) { a.walls.right = false; b.walls.left = false; }
    if (dx === -1) { a.walls.left = false; b.walls.right = false; }
    if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
    if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
  }

  private addExtraPaths(): void {
    const extraCount = Phaser.Math.Between(2, Math.max(2, this.gridW));
    for (let i = 0; i < extraCount; i++) {
      const x = Phaser.Math.Between(0, this.gridW - 1);
      const y = Phaser.Math.Between(0, this.gridH - 1);
      const cell = this.mazeGrid[y][x];
      const dirs = ['top', 'right', 'bottom', 'left'] as const;
      const dir = dirs[Phaser.Math.Between(0, 3)];

      const nx = dir === 'right' ? x + 1 : dir === 'left' ? x - 1 : x;
      const ny = dir === 'bottom' ? y + 1 : dir === 'top' ? y - 1 : y;

      if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
        const neighbor = this.mazeGrid[ny][nx];
        this.removeWallBetween(cell, neighbor);
      }
    }
  }

  private placeMechanisms(): void {
    const usedCells = new Set<string>();
    usedCells.add('0,0');
    usedCells.add(`${this.gridW - 1},${this.gridH - 1}`);

    const count = Math.min(3 + this.level, 8);

    for (let i = 0; i < count; i++) {
      let cx: number, cy: number;
      let attempts = 0;

      do {
        cx = Phaser.Math.Between(0, this.gridW - 1);
        cy = Phaser.Math.Between(0, this.gridH - 1);
        attempts++;
      } while (usedCells.has(`${cx},${cy}`) && attempts < 50);

      if (attempts >= 50) continue;
      usedCells.add(`${cx},${cy}`);

      const types: Array<'pressure_plate' | 'light_pillar' | 'trap'> = ['pressure_plate', 'light_pillar', 'trap'];
      const type = types[i % 3];

      const px = this.mazeOffsetX + cx * CELL_SIZE + CELL_SIZE / 2;
      const py = this.mazeOffsetY + cy * CELL_SIZE + CELL_SIZE / 2;

      const sprite = this.add.sprite(px, py, type).setDepth(5);

      let doorX: number | undefined;
      let doorY: number | undefined;
      let doorSide: string | undefined;

      if (type === 'pressure_plate') {
        const adjCells = this.getAdjacentCells(cx, cy);
        if (adjCells.length > 0) {
          const adj = adjCells[Phaser.Math.Between(0, adjCells.length - 1)];
          doorX = adj.x;
          doorY = adj.y;
          doorSide = adj.side;
          const wallKey = this.getDoorWallKey(cx, cy, adj.side);
          this.doorWalls.add(wallKey);
        }
      }

      this.mechanisms.push({
        type,
        cellX: cx,
        cellY: cy,
        sprite,
        triggered: false,
        linkedDoorCellX: doorX,
        linkedDoorCellY: doorY,
        linkedDoorSide: doorSide,
      });
    }
  }

  private getAdjacentCells(cx: number, cy: number): Array<{ x: number; y: number; side: string }> {
    const result: Array<{ x: number; y: number; side: string }> = [];
    if (cy > 0) result.push({ x: cx, y: cy - 1, side: 'top' });
    if (cx < this.gridW - 1) result.push({ x: cx + 1, y: cy, side: 'right' });
    if (cy < this.gridH - 1) result.push({ x: cx, y: cy + 1, side: 'bottom' });
    if (cx > 0) result.push({ x: cx - 1, y: cy, side: 'left' });
    return result;
  }

  private getDoorWallKey(cx: number, cy: number, side: string): string {
    switch (side) {
      case 'top': return `${cx},${cy - 1},bottom`;
      case 'bottom': return `${cx},${cy + 1},top`;
      case 'left': return `${cx - 1},${cy},right`;
      case 'right': return `${cx + 1},${cy},left`;
      default: return '';
    }
  }

  private placeOrbs(): void {
    const usedCells = new Set<string>();
    usedCells.add('0,0');
    usedCells.add(`${this.gridW - 1},${this.gridH - 1}`);
    this.mechanisms.forEach(m => usedCells.add(`${m.cellX},${m.cellY}`));

    for (let i = 0; i < this.totalOrbs; i++) {
      let cx: number, cy: number;
      let attempts = 0;

      do {
        cx = Phaser.Math.Between(0, this.gridW - 1);
        cy = Phaser.Math.Between(0, this.gridH - 1);
        attempts++;
      } while (usedCells.has(`${cx},${cy}`) && attempts < 50);

      if (attempts >= 50) continue;
      usedCells.add(`${cx},${cy}`);

      const px = this.mazeOffsetX + cx * CELL_SIZE + CELL_SIZE / 2;
      const py = this.mazeOffsetY + cy * CELL_SIZE + CELL_SIZE / 2;

      const sprite = this.add.sprite(px, py, 'orb').setDepth(5);

      this.tweens.add({
        targets: sprite,
        y: py - 4,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.orbs.push({ cellX: cx, cellY: cy, sprite, collected: false });
    }
  }

  private placePortal(): void {
    const px = this.mazeOffsetX + (this.gridW - 1) * CELL_SIZE + CELL_SIZE / 2;
    const py = this.mazeOffsetY + (this.gridH - 1) * CELL_SIZE + CELL_SIZE / 2;

    this.portal = this.add.sprite(px, py, 'portal').setDepth(4).setAlpha(0.3);

    this.tweens.add({
      targets: this.portal,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (this.textures.exists('particle')) {
      this.portalEmitter = this.add.particles(px, py, 'particle', {
        speed: { min: 10, max: 30 },
        lifespan: { min: 800, max: 1500 },
        quantity: 1,
        frequency: 300,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.4, end: 0 },
        tint: [0x8040ff, 0xc080ff],
        blendMode: 'ADD',
      }).setDepth(3);
    }
  }

  private drawMaze(): void {
    this.wallGraphics = this.add.graphics().setDepth(2);

    for (let y = 0; y < this.gridH; y++) {
      for (let x = 0; x < this.gridW; x++) {
        const cell = this.mazeGrid[y][x];
        const px = this.mazeOffsetX + x * CELL_SIZE;
        const py = this.mazeOffsetY + y * CELL_SIZE;

        const isMirror = cell.mirror;
        const color = isMirror ? 0xc080ff : 0x3060b0;
        const alpha = isMirror ? 0.8 : 0.5;

        this.wallGraphics.lineStyle(isMirror ? 2 : 1.5, color, alpha);

        if (cell.walls.top) {
          const doorKey = `${x},${y},top`;
          if (!this.doorWalls.has(doorKey)) {
            this.wallGraphics.lineBetween(px, py, px + CELL_SIZE, py);
          } else {
            this.drawDoor(px, py, px + CELL_SIZE, py);
          }
          if (isMirror) this.mirrorWalls.push({ x1: px, y1: py, x2: px + CELL_SIZE, y2: py });
        }
        if (cell.walls.right) {
          const doorKey = `${x + 1},${y},left`;
          if (!this.doorWalls.has(doorKey)) {
            this.wallGraphics.lineBetween(px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE);
          } else {
            this.drawDoor(px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE);
          }
          if (isMirror) this.mirrorWalls.push({ x1: px + CELL_SIZE, y1: py, x2: px + CELL_SIZE, y2: py + CELL_SIZE });
        }
        if (cell.walls.bottom) {
          const doorKey = `${x},${y + 1},top`;
          if (!this.doorWalls.has(doorKey)) {
            this.wallGraphics.lineBetween(px, py + CELL_SIZE, px + CELL_SIZE, py + CELL_SIZE);
          } else {
            this.drawDoor(px, py + CELL_SIZE, px + CELL_SIZE, py + CELL_SIZE);
          }
          if (isMirror) this.mirrorWalls.push({ x1: px, y1: py + CELL_SIZE, x2: px + CELL_SIZE, y2: py + CELL_SIZE });
        }
        if (cell.walls.left) {
          const doorKey = `${x},${y},left`;
          if (!this.doorWalls.has(doorKey)) {
            this.wallGraphics.lineBetween(px, py, px, py + CELL_SIZE);
          } else {
            this.drawDoor(px, py, px, py + CELL_SIZE);
          }
          if (isMirror) this.mirrorWalls.push({ x1: px, y1: py, x2: px, y2: py + CELL_SIZE });
        }
      }
    }

    this.doorGraphics = this.add.graphics().setDepth(2);
    this.redrawDoors();
  }

  private drawDoor(x1: number, y1: number, x2: number, y2: number): void {
    this.wallGraphics.lineStyle(2, 0x30e0a0, 0.6);
    this.wallGraphics.lineBetween(x1, y1, x2, y2);
  }

  private redrawDoors(): void {
    this.doorGraphics.clear();
    for (const mech of this.mechanisms) {
      if (mech.type === 'pressure_plate' && mech.triggered && mech.linkedDoorSide) {
        const cx = mech.linkedDoorCellX!;
        const cy = mech.linkedDoorCellY!;
        const px = this.mazeOffsetX + cx * CELL_SIZE;
        const py = this.mazeOffsetY + cy * CELL_SIZE;

        this.doorGraphics.lineStyle(3, 0x30e0a0, 0.9);
        switch (mech.linkedDoorSide) {
          case 'top':
            this.doorGraphics.lineBetween(px, py, px + CELL_SIZE, py);
            break;
          case 'bottom':
            this.doorGraphics.lineBetween(px, py + CELL_SIZE, px + CELL_SIZE, py + CELL_SIZE);
            break;
          case 'left':
            this.doorGraphics.lineBetween(px, py, px, py + CELL_SIZE);
            break;
          case 'right':
            this.doorGraphics.lineBetween(px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE);
            break;
        }
      }
    }
  }

  private createPlayer(): void {
    const startX = this.mazeOffsetX + CELL_SIZE / 2;
    const startY = this.mazeOffsetY + CELL_SIZE / 2;

    this.player = this.add.sprite(startX, startY, 'player').setDepth(10);

    if (this.textures.exists('particle')) {
      this.playerTrailEmitter = this.add.particles(startX, startY, 'particle', {
        speed: { min: 5, max: 15 },
        lifespan: { min: 300, max: 600 },
        quantity: 1,
        frequency: 40,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: [0x60b0ff, 0x80d0ff],
        follow: this.player,
        blendMode: 'ADD',
      }).setDepth(9);
    }
  }

  private createPhantoms(): void {
    this.phantoms.forEach(p => p.destroy());
    this.phantomTrails.forEach(t => t.destroy());
    this.phantoms = [];
    this.phantomTrails = [];

    const uniqueMirrors = this.getUniqueMirrorWalls();

    for (const wall of uniqueMirrors.slice(0, Math.min(uniqueMirrors.length, 6))) {
      const phantom = this.add.sprite(this.player.x, this.player.y, 'phantom').setDepth(8).setAlpha(0.4);
      this.phantoms.push(phantom);

      if (this.textures.exists('particle')) {
        const trail = this.add.particles(this.player.x, this.player.y, 'particle', {
          speed: { min: 3, max: 10 },
          lifespan: { min: 200, max: 400 },
          quantity: 1,
          frequency: 80,
          scale: { start: 0.3, end: 0 },
          alpha: { start: 0.3, end: 0 },
          tint: [0xc0a0ff, 0xe0d0ff],
          follow: phantom,
          blendMode: 'ADD',
        }).setDepth(7);
        this.phantomTrails.push(trail);
      }
    }
  }

  private getUniqueMirrorWalls(): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const seen = new Set<string>();
    const unique: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (const w of this.mirrorWalls) {
      const key = `${Math.min(w.x1, w.x2)},${Math.min(w.y1, w.y2)},${Math.max(w.x1, w.x2)},${Math.max(w.y1, w.y2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(w);
      }
    }
    return unique;
  }

  private updatePhantoms(): void {
    const uniqueMirrors = this.getUniqueMirrorWalls();

    for (let i = 0; i < this.phantoms.length; i++) {
      const phantom = this.phantoms[i];
      if (i >= uniqueMirrors.length) break;

      const wall = uniqueMirrors[i];
      const isHorizontal = wall.y1 === wall.y2;

      let mirrorX = this.player.x;
      let mirrorY = this.player.y;

      if (isHorizontal) {
        mirrorY = 2 * wall.y1 - this.player.y;
      } else {
        mirrorX = 2 * wall.x1 - this.player.x;
      }

      if (Math.random() < PHANTOM_OPPOSITE_CHANCE) {
        if (isHorizontal) {
          mirrorY += (this.player.y - mirrorY) * 2;
        } else {
          mirrorX += (this.player.x - mirrorX) * 2;
        }
      }

      mirrorX = Phaser.Math.Clamp(mirrorX, this.mazeOffsetX, this.mazeOffsetX + this.gridW * CELL_SIZE);
      mirrorY = Phaser.Math.Clamp(mirrorY, this.mazeOffsetY, this.mazeOffsetY + this.gridH * CELL_SIZE);

      this.tweens.add({
        targets: phantom,
        x: mirrorX,
        y: mirrorY,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    }
  }

  private createUI(w: number, h: number): void {
    this.levelText = this.add.text(16, 16, `第 ${this.level} 层`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#a0c0ff',
      stroke: '#0a0a30',
      strokeThickness: 2,
    }).setDepth(100).setScrollFactor(0);

    this.orbText = this.add.text(16, 42, `光球: 0 / ${this.totalOrbs}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd700',
      stroke: '#0a0a30',
      strokeThickness: 2,
    }).setDepth(100).setScrollFactor(0);

    this.createControlPanel(w, h);
  }

  private createControlPanel(w: number, h: number): void {
    const panelX = w - 110;
    const panelY = h - 50;

    const panelBg = this.add.graphics().setDepth(99);
    panelBg.fillStyle(0x102040, 0.6);
    panelBg.fillRoundedRect(panelX - 50, panelY - 20, 160, 44, 10);

    const resetBg = this.add.graphics().setDepth(99);
    resetBg.fillStyle(0x4060a0, 0.5);
    resetBg.fillRoundedRect(0, 0, 60, 28, 6);
    const resetText = this.add.text(30, 14, '重置', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#c0d8ff',
    }).setOrigin(0.5).setDepth(100);

    this.resetBtn = this.add.container(panelX, panelY, [resetBg, resetText]).setDepth(100);
    this.resetBtn.setSize(60, 28);
    this.resetBtn.setInteractive({ useHandCursor: true });

    this.resetBtn.on('pointerdown', () => {
      this.resetLevel();
    });

    const pauseBg = this.add.graphics().setDepth(99);
    pauseBg.fillStyle(0x4060a0, 0.5);
    pauseBg.fillRoundedRect(0, 0, 60, 28, 6);
    const pauseText = this.add.text(30, 14, '暂停', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#c0d8ff',
    }).setOrigin(0.5).setDepth(100);

    this.pauseBtn = this.add.container(panelX + 70, panelY, [pauseBg, pauseText]).setDepth(100);
    this.pauseBtn.setSize(60, 28);
    this.pauseBtn.setInteractive({ useHandCursor: true });

    this.pauseBtn.on('pointerdown', () => {
      this.togglePause();
    });
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      const w = this.cameras.main.width;
      const h = this.cameras.main.height;
      const overlay = this.add.graphics().setDepth(200);
      overlay.fillStyle(0x000000, 0.5);
      overlay.fillRect(0, 0, w, h);
      overlay.setName('pauseOverlay');
      const pauseLabel = this.add.text(w / 2, h / 2, '已暂停\n点击继续', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#a0c0ff',
        align: 'center',
      }).setOrigin(0.5).setDepth(201).setName('pauseLabel');

      this.input.once('pointerdown', () => {
        overlay.destroy();
        pauseLabel.destroy();
        this.togglePause();
      });
    } else {
      this.physics.resume();
    }
  }

  private resetLevel(): void {
    this.scene.restart({ level: this.level });
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < this.cameras.main.height - 60 || pointer.x < this.cameras.main.width - 160) {
        this.touchTarget = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.touchTarget) {
        this.touchTarget = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointerup', () => {
      this.touchTarget = null;
    });
  }

  update(_time: number, delta: number): void {
    if (this.isPaused || !this.playerAlive) return;

    this.handlePlayerMovement(delta);
    this.updatePhantoms();
    this.checkMechanisms();
    this.checkOrbs();
    this.checkPortal();
    this.updateMechanismVisuals(delta);
  }

  private handlePlayerMovement(delta: number): void {
    if (!this.playerAlive) return;

    let vx = 0;
    let vy = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    }

    if (this.touchTarget) {
      const dx = this.touchTarget.x - this.player.x;
      const dy = this.touchTarget.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }

    this.playerMoving = { x: vx, y: vy };

    const newX = this.player.x + vx * (delta / 1000);
    const newY = this.player.y + vy * (delta / 1000);

    if (!this.isWallCollision(newX, this.player.y)) {
      this.player.x = newX;
    }
    if (!this.isWallCollision(this.player.x, newY)) {
      this.player.y = newY;
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, this.mazeOffsetX + 12, this.mazeOffsetX + this.gridW * CELL_SIZE - 12);
    this.player.y = Phaser.Math.Clamp(this.player.y, this.mazeOffsetY + 12, this.mazeOffsetY + this.gridH * CELL_SIZE - 12);
  }

  private isWallCollision(px: number, py: number): boolean {
    const playerRadius = 10;

    const cellX = Math.floor((px - this.mazeOffsetX) / CELL_SIZE);
    const cellY = Math.floor((py - this.mazeOffsetY) / CELL_SIZE);

    if (cellX < 0 || cellX >= this.gridW || cellY < 0 || cellY >= this.gridH) return true;

    const cell = this.mazeGrid[cellY]?.[cellX];
    if (!cell) return true;

    const localX = px - (this.mazeOffsetX + cellX * CELL_SIZE);
    const localY = py - (this.mazeOffsetY + cellY * CELL_SIZE);

    if (cell.walls.left && localX < playerRadius) {
      if (!this.isDoorOpen(cellX, cellY, 'left')) return true;
    }
    if (cell.walls.right && localX > CELL_SIZE - playerRadius) {
      if (!this.isDoorOpen(cellX, cellY, 'right')) return true;
    }
    if (cell.walls.top && localY < playerRadius) {
      if (!this.isDoorOpen(cellX, cellY, 'top')) return true;
    }
    if (cell.walls.bottom && localY > CELL_SIZE - playerRadius) {
      if (!this.isDoorOpen(cellX, cellY, 'bottom')) return true;
    }

    return false;
  }

  private isDoorOpen(cx: number, cy: number, side: string): boolean {
    for (const mech of this.mechanisms) {
      if (mech.type === 'pressure_plate' && mech.triggered) {
        if (mech.linkedDoorCellX === cx && mech.linkedDoorCellY === cy && mech.linkedDoorSide === side) {
          return true;
        }
      }
    }
    return false;
  }

  private checkMechanisms(): void {
    for (const mech of this.mechanisms) {
      const px = this.mazeOffsetX + mech.cellX * CELL_SIZE + CELL_SIZE / 2;
      const py = this.mazeOffsetY + mech.cellY * CELL_SIZE + CELL_SIZE / 2;

      const playerDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, px, py);
      let phantomOnPlate = false;

      for (const phantom of this.phantoms) {
        const phantomDist = Phaser.Math.Distance.Between(phantom.x, phantom.y, px, py);
        if (phantomDist < 20) {
          phantomOnPlate = true;
          break;
        }
      }

      const isOnPlate = playerDist < 20 || phantomOnPlate;

      switch (mech.type) {
        case 'pressure_plate':
          if (isOnPlate && !mech.triggered) {
            mech.triggered = true;
            this.triggerMechanismEffect(mech);
          } else if (!isOnPlate && mech.triggered) {
            mech.triggered = false;
            this.closeDoor(mech);
          }
          break;

        case 'light_pillar':
          if (playerDist < 20 && !mech.triggered) {
            mech.triggered = true;
            this.activatePortal();
            this.triggerMechanismEffect(mech);
          }
          break;

        case 'trap':
          if (playerDist < 16) {
            this.playerDeath();
          }
          break;
      }
    }
  }

  private triggerMechanismEffect(mech: Mechanism): void {
    this.cameras.main.flash(200, 48, 255, 160, true);

    if (this.textures.exists('particle')) {
      const emitter = this.add.particles(mech.sprite.x, mech.sprite.y, 'particle', {
        speed: { min: 50, max: 150 },
        lifespan: { min: 300, max: 800 },
        quantity: 15,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: mech.type === 'trap' ? [0xff3060] : [0x30e0a0, 0x60ffc0],
        blendMode: 'ADD',
      });
      this.time.delayedCall(1000, () => { emitter.destroy(); });
    }

    this.redrawDoors();
  }

  private closeDoor(mech: Mechanism): void {
    this.redrawDoors();
  }

  private activatePortal(): void {
    this.portalActive = true;
    this.portal.setAlpha(1);

    this.tweens.add({
      targets: this.portal,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 600,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });

    if (this.portalEmitter) {
      this.portalEmitter.setFrequency(80);
    }
  }

  private checkOrbs(): void {
    for (const orb of this.orbs) {
      if (orb.collected) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, orb.sprite.x, orb.sprite.y);
      if (dist < 18) {
        orb.collected = true;
        this.collectedOrbs++;
        this.orbText.setText(`光球: ${this.collectedOrbs} / ${this.totalOrbs}`);

        this.cameras.main.flash(150, 255, 215, 0, true);

        if (this.textures.exists('particle')) {
          const emitter = this.add.particles(orb.sprite.x, orb.sprite.y, 'particle', {
            speed: { min: 30, max: 100 },
            lifespan: { min: 400, max: 800 },
            quantity: 12,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xffd700, 0xffff80],
            blendMode: 'ADD',
          });
          this.time.delayedCall(1000, () => { emitter.destroy(); });
        }

        this.tweens.add({
          targets: orb.sprite,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 300,
          onComplete: () => { orb.sprite.destroy(); },
        });
      }
    }
  }

  private checkPortal(): void {
    if (!this.portalActive) return;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
    if (dist < 24) {
      if (this.collectedOrbs >= this.totalOrbs) {
        this.nextLevel();
      } else {
        this.showMessage(`需要收集全部 ${this.totalOrbs} 个光球！`);
      }
    }
  }

  private showMessage(text: string): void {
    const w = this.cameras.main.width;
    const msg = this.add.text(w / 2, this.cameras.main.height / 2, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ff8060',
      stroke: '#0a0a30',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: msg.y - 40,
      duration: 1500,
      onComplete: () => { msg.destroy(); },
    });
  }

  private playerDeath(): void {
    if (!this.playerAlive) return;
    this.playerAlive = false;

    this.cameras.main.flash(300, 255, 48, 96, true);
    this.cameras.main.shake(300, 0.01);

    if (this.textures.exists('particle')) {
      const emitter = this.add.particles(this.player.x, this.player.y, 'particle', {
        speed: { min: 50, max: 200 },
        lifespan: { min: 500, max: 2000 },
        quantity: 40,
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0x60b0ff, 0xff6090],
        blendMode: 'ADD',
      });
      this.time.delayedCall(2500, () => { emitter.destroy(); });
    }

    this.player.setVisible(false);
    if (this.playerTrailEmitter) this.playerTrailEmitter.setVisible(false);

    this.time.delayedCall(2000, () => {
      this.resetLevel();
    });
  }

  private nextLevel(): void {
    this.playerAlive = false;

    this.cameras.main.flash(500, 128, 64, 255, true);

    if (this.textures.exists('particle')) {
      const emitter = this.add.particles(this.portal.x, this.portal.y, 'particle', {
        speed: { min: 80, max: 250 },
        lifespan: { min: 600, max: 1500 },
        quantity: 30,
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0x8040ff, 0xc080ff, 0xe0c0ff],
        blendMode: 'ADD',
      });
      this.time.delayedCall(2000, () => { emitter.destroy(); });
    }

    const nextLevel = this.level + 1;
    if (nextLevel > 10) {
      this.time.delayedCall(1000, () => {
        this.scene.start('GameOverScene', { level: this.level, totalOrbs: this.collectedOrbs + this.totalOrbs * (this.level - 1) });
      });
    } else {
      this.time.delayedCall(1000, () => {
        this.scene.start('GameScene', { level: nextLevel });
      });
    }
  }

  private updateMechanismVisuals(delta: number): void {
    this.mechanismPulseTime += delta * 0.003;

    for (const mech of this.mechanisms) {
      if (mech.type === 'trap') {
        const scale = 1 + 0.1 * Math.sin(this.mechanismPulseTime * 2);
        mech.sprite.setScale(scale);
        mech.sprite.setAlpha(0.6 + 0.3 * Math.sin(this.mechanismPulseTime * 3));
      } else if (mech.type === 'pressure_plate') {
        mech.sprite.setAlpha(mech.triggered ? 1 : 0.5 + 0.2 * Math.sin(this.mechanismPulseTime * 2));
      } else if (mech.type === 'light_pillar') {
        mech.sprite.setAlpha(mech.triggered ? 1 : 0.4 + 0.3 * Math.sin(this.mechanismPulseTime * 1.5));
        mech.sprite.setScale(1 + 0.15 * Math.sin(this.mechanismPulseTime * 2));
      }
    }
  }
}
