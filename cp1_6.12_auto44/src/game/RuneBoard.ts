import Phaser from 'phaser';
import {
  RuneElement,
  RUNE_DEFINITIONS,
  UPGRADED_RUNE_MAP,
  WEAPON_RECIPES,
  findMergeResult,
  findWeaponRecipe,
  UpgradedRune,
  WeaponRecipe,
} from './RuneData';
import { createRoundedRect } from './GraphicsUtil';

export interface GridCell {
  row: number;
  col: number;
  element: RuneElement | null;
  tier: number;
  container: Phaser.GameObjects.Container | null;
}

export interface RuneBoardEvents {
  onRunePlaced: (row: number, col: number, element: RuneElement) => void;
  onRuneMerged: (row: number, col: number, upgraded: UpgradedRune) => void;
  onWeaponForged: (recipe: WeaponRecipe) => void;
  onManaInsufficient: () => void;
}

const GRID_SIZE = 3;
const CELL_SIZE = 80;
const CELL_GAP = 6;
const SNAP_DURATION = 300;
const MERGE_ANIM_DURATION = 400;

export class RuneBoard {
  private scene: Phaser.Scene;
  private grid: GridCell[][] = [];
  private gridContainer!: Phaser.GameObjects.Container;
  private runePoolContainer!: Phaser.GameObjects.Container;
  private runePool: { element: RuneElement; count: number; container: Phaser.GameObjects.Container }[] = [];
  private dragItem: Phaser.GameObjects.Container | null = null;
  private dragElement: RuneElement | null = null;
  private dragFromPool: boolean = false;
  private dragFromGrid: { row: number; col: number } | null = null;
  private events: RuneBoardEvents;
  private boardX: number = 0;
  private boardY: number = 0;
  private cellSize: number = CELL_SIZE;
  private isMobile: boolean = false;

  constructor(scene: Phaser.Scene, events: RuneBoardEvents) {
    this.scene = scene;
    this.events = events;
    this.isMobile = scene.scale.width < 768;
    this.cellSize = this.isMobile ? 60 : CELL_SIZE;
    this.initGrid();
    this.initRunePool();
    this.setupInput();
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private initGrid() {
    this.gridContainer = this.scene.add.container(0, 0);
    this.grid = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const cellContainer = this.scene.add.container(0, 0);

        const bg = this.scene.add.rectangle(
          0, 0,
          this.cellSize - 4,
          this.cellSize - 4,
          0x1e1e2e,
          1
        );
        bg.setStrokeStyle(2, 0x3d3d5c);
        cellContainer.add(bg);

        const glowBorder = this.scene.add.rectangle(
          0, 0,
          this.cellSize - 2,
          this.cellSize - 2
        );
        glowBorder.setStrokeStyle(3, 0x3d3d5c, 0);
        glowBorder.setName('glowBorder');
        cellContainer.add(glowBorder);

        this.gridContainer.add(cellContainer);

        this.grid[r][c] = {
          row: r,
          col: c,
          element: null,
          tier: 0,
          container: cellContainer,
        };
      }
    }
    this.layoutGrid();
  }

  private layoutGrid() {
    const totalGridSize = this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1);
    this.boardX = this.scene.scale.width / 2 - totalGridSize / 2;
    this.boardY = this.scene.scale.height * 0.35;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = this.boardX + c * (this.cellSize + CELL_GAP) + this.cellSize / 2;
        const y = this.boardY + r * (this.cellSize + CELL_GAP) + this.cellSize / 2;
        this.grid[r][c].container!.setPosition(x, y);
      }
    }
  }

  private initRunePool() {
    this.runePoolContainer = this.scene.add.container(0, 0);
    const elements: RuneElement[] = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];

    elements.forEach((el, index) => {
      const container = this.createRunePoolItem(el, index);
      this.runePool.push({ element: el, count: 3, container });
      this.runePoolContainer.add(container);
    });

    this.layoutRunePool();
  }

  private createRunePoolItem(element: RuneElement, index: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const def = RUNE_DEFINITIONS[element];

    const bg = createRoundedRect(
      this.scene, 0, 0,
      this.cellSize - 8, this.cellSize - 8, 8,
      def.color, 0.85
    );
    container.add(bg);

    const text = this.scene.add.text(0, -4, def.symbol, {
      fontSize: `${this.isMobile ? '20px' : '28px'}`,
      align: 'center',
    }).setOrigin(0.5);
    container.add(text);

    const countText = this.scene.add.text(0, this.cellSize / 2 - 16, 'x3', {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    countText.setName('countText');
    container.add(countText);

    container.setSize(this.cellSize - 8, this.cellSize - 8);
    container.setInteractive({ draggable: true, useHandCursor: true });

    container.on('pointerover', () => {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power1',
      });
    });

    container.on('pointerout', () => {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power1',
      });
    });

    container.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      const poolItem = this.runePool.find(p => p.element === element);
      if (!poolItem || poolItem.count <= 0) return;
      this.dragFromPool = true;
      this.dragFromGrid = null;
      this.dragElement = element;
      this.dragItem = this.createDragGhost(element, pointer.x, pointer.y);
    });

    container.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this.dragItem) {
        this.dragItem.setPosition(pointer.x, pointer.y);
      }
    });

    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.handleDrop(pointer);
    });

    return container;
  }

  private layoutRunePool() {
    const poolY = this.scene.scale.height * 0.75;
    const itemWidth = this.cellSize + 4;
    const totalWidth = this.runePool.length * itemWidth;
    const startX = this.scene.scale.width / 2 - totalWidth / 2 + itemWidth / 2;

    this.runePool.forEach((item, i) => {
      if (this.isMobile && i >= 3) {
        item.container.setPosition(startX + (i - 3) * itemWidth, poolY + this.cellSize + 8);
      } else {
        item.container.setPosition(startX + i * itemWidth, poolY);
      }
    });
  }

  private createRuneVisual(element: RuneElement, tier: number = 0): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const def = RUNE_DEFINITIONS[element];
    const color = tier >= 2 ? (UPGRADED_RUNE_MAP[`${element}_${element}_${element}`]?.color || def.color) : def.color;

    const bg = createRoundedRect(
      this.scene, 0, 0,
      this.cellSize - 8, this.cellSize - 8, 6,
      color, 0.9
    );
    container.add(bg);

    if (tier >= 2) {
      const glow = createRoundedRect(
        this.scene, 0, 0,
        this.cellSize - 4, this.cellSize - 4, 6
      );
      glow.lineStyle(3, def.glowColor, 0.8);
      glow.strokeRoundedRect(-(this.cellSize - 4) / 2, -(this.cellSize - 4) / 2, this.cellSize - 4, this.cellSize - 4, 6);
      glow.setName('tierGlow');
      container.add(glow);

      this.scene.tweens.add({
        targets: glow,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const text = this.scene.add.text(0, -4, def.symbol, {
      fontSize: `${this.isMobile ? '20px' : '28px'}`,
      align: 'center',
    }).setOrigin(0.5);
    container.add(text);

    if (tier >= 2) {
      const tierText = this.scene.add.text(0, this.cellSize / 2 - 16, '★', {
        fontSize: '12px',
        color: '#ffd700',
        align: 'center',
      }).setOrigin(0.5);
      container.add(tierText);
    }

    container.setSize(this.cellSize - 8, this.cellSize - 8);
    container.setInteractive({ draggable: true, useHandCursor: true });

    container.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.dragFromPool = false;
      this.dragFromGrid = null;
      this.dragElement = element;

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.grid[r][c].container === container) {
            this.dragFromGrid = { row: r, col: c };
            break;
          }
        }
      }

      this.dragItem = this.createDragGhost(element, pointer.x, pointer.y);
      container.setAlpha(0.3);
    });

    container.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this.dragItem) {
        this.dragItem.setPosition(pointer.x, pointer.y);
      }
    });

    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      container.setAlpha(1);
      this.handleDrop(pointer);
    });

    return container;
  }

  private createDragGhost(element: RuneElement, x: number, y: number): Phaser.GameObjects.Container {
    const ghost = this.scene.add.container(x, y);
    const def = RUNE_DEFINITIONS[element];

    const shadow = createRoundedRect(
      this.scene, 4, 4,
      this.cellSize - 12, this.cellSize - 12, 6,
      0x000000, 0.3
    );
    ghost.add(shadow);

    const bg = createRoundedRect(
      this.scene, 0, 0,
      this.cellSize - 12, this.cellSize - 12, 6,
      def.color, 0.7
    );
    ghost.add(bg);

    const text = this.scene.add.text(0, -4, def.symbol, {
      fontSize: `${this.isMobile ? '18px' : '24px'}`,
      align: 'center',
    }).setOrigin(0.5);
    ghost.add(text);

    ghost.setDepth(1000);
    ghost.setAlpha(0.8);
    return ghost;
  }

  private handleDrop(pointer: Phaser.Input.Pointer) {
    if (this.dragItem) {
      this.dragItem.destroy();
      this.dragItem = null;
    }

    if (!this.dragElement) return;

    const { row, col } = this.getGridCellAt(pointer.x, pointer.y);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const cell = this.grid[row][col];

      if (cell.element !== null && cell.element !== this.dragElement) {
        this.shakeGrid();
        this.flashGridRed();
        if (this.dragFromGrid) {
          this.restoreDraggedRune();
        }
        return;
      }

      if (this.dragFromPool) {
        const poolItem = this.runePool.find(p => p.element === this.dragElement);
        if (!poolItem || poolItem.count <= 0) return;
        poolItem.count--;
        this.updatePoolCount(poolItem);
      } else if (this.dragFromGrid) {
        const fromCell = this.grid[this.dragFromGrid.row][this.dragFromGrid.col];
        this.clearCell(fromCell);
      }

      this.placeRune(row, col, this.dragElement, 0);
    } else {
      if (this.dragFromGrid) {
        this.restoreDraggedRune();
      }
    }

    this.dragElement = null;
    this.dragFromPool = false;
    this.dragFromGrid = null;
  }

  private restoreDraggedRune() {
    if (!this.dragFromGrid || !this.dragElement) return;
    const fromCell = this.grid[this.dragFromGrid.row][this.dragFromGrid.col];
    if (fromCell.element === null) {
      this.placeRune(fromCell.row, fromCell.col, this.dragElement, fromCell.tier);
    }
  }

  private placeRune(row: number, col: number, element: RuneElement, tier: number) {
    const cell = this.grid[row][col];
    cell.element = element;
    cell.tier = tier;

    this.clearCellVisuals(cell);

    const runeVisual = this.createRuneVisual(element, tier);
    const x = this.boardX + col * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    const y = this.boardY + row * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    runeVisual.setPosition(x, y + 20);
    runeVisual.setScale(1.3);

    this.gridContainer.add(runeVisual);
    cell.container = runeVisual;

    this.scene.tweens.add({
      targets: runeVisual,
      x: x,
      y: y,
      scaleX: 1,
      scaleY: 1,
      duration: SNAP_DURATION,
      ease: 'Back.easeOut',
    });

    this.events.onRunePlaced(row, col, element);
    this.checkMerge(row, col, element);
    this.checkWeaponRecipe();
  }

  private clearCell(cell: GridCell) {
    this.clearCellVisuals(cell);
    cell.element = null;
    cell.tier = 0;
  }

  private clearCellVisuals(cell: GridCell) {
    if (cell.container) {
      this.scene.tweens.killTweensOf(cell.container);
      cell.container.destroy();
      cell.container = null;
    }

    const bgContainer = this.recreateCellBackground(cell.row, cell.col);
    cell.container = bgContainer;
  }

  private recreateCellBackground(row: number, col: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const x = this.boardX + col * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    const y = this.boardY + row * (this.cellSize + CELL_GAP) + this.cellSize / 2;

    const bg = this.scene.add.rectangle(0, 0, this.cellSize - 4, this.cellSize - 4, 0x1e1e2e, 1);
    bg.setStrokeStyle(2, 0x3d3d5c);
    container.add(bg);

    const glowBorder = this.scene.add.rectangle(0, 0, this.cellSize - 2, this.cellSize - 2);
    glowBorder.setStrokeStyle(3, 0x3d3d5c, 0);
    glowBorder.setName('glowBorder');
    container.add(glowBorder);

    container.setPosition(x, y);
    this.gridContainer.add(container);
    return container;
  }

  private checkMerge(row: number, col: number, element: RuneElement) {
    const adjacent: { r: number; c: number }[] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (this.grid[nr][nc].element === element) {
          adjacent.push({ r: nr, c: nc });
        }
      }
    }

    if (adjacent.length >= 2) {
      const allSame = [element, ...adjacent.map(a => this.grid[a.r][a.c].element!)];
      const mergeResult = findMergeResult(allSame);
      if (mergeResult) {
        const mergePositions = [{ r: row, c: col }, ...adjacent.slice(0, 2)];
        const targetCell = this.grid[row][col];

        this.playMergeParticles(row, col, element);

        for (const pos of mergePositions) {
          if (pos.r !== row || pos.c !== col) {
            this.clearCell(this.grid[pos.r][pos.c]);
          }
        }

        targetCell.element = null;
        targetCell.tier = 0;
        this.clearCellVisuals(targetCell);

        this.scene.time.delayedCall(MERGE_ANIM_DURATION / 2, () => {
          this.placeRune(row, col, mergeResult.element, mergeResult.tier);
          this.events.onRuneMerged(row, col, mergeResult);
        });
      }
    }
  }

  private playMergeParticles(row: number, col: number, element: RuneElement) {
    const x = this.boardX + col * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    const y = this.boardY + row * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    const def = RUNE_DEFINITIONS[element];

    const emitter = this.scene.add.particles(x, y, 'mergeParticle', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.8, end: 0 },
      lifespan: 500,
      quantity: 24,
      tint: [def.color, def.glowColor, 0xffffff],
      blendMode: 'ADD',
      emitting: true,
    });

    this.scene.time.delayedCall(600, () => {
      emitter.destroy();
    });
  }

  private checkWeaponRecipe() {
    const rowElements: RuneElement[][] = [[], [], []];
    const colElements: RuneElement[][] = [[], [], []];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const el = this.grid[r][c].element;
        if (el) {
          rowElements[r].push(el);
          colElements[c].push(el);
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      if (rowElements[r].length === 3) {
        const recipe = findWeaponRecipe(rowElements[r]);
        if (recipe) {
          this.forgeWeapon(recipe, r, -1);
          return;
        }
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      if (colElements[c].length === 3) {
        const recipe = findWeaponRecipe(colElements[c]);
        if (recipe) {
          this.forgeWeapon(recipe, -1, c);
          return;
        }
      }
    }
  }

  private forgeWeapon(recipe: WeaponRecipe, row: number, col: number) {
    const furnaceX = this.scene.scale.width / 2;
    const furnaceY = this.scene.scale.height + 50;

    const furnace = this.scene.add.text(furnaceX, furnaceY, '⚒', {
      fontSize: '64px',
      align: 'center',
    }).setOrigin(0.5).setDepth(500);

    this.scene.tweens.add({
      targets: furnace,
      y: this.scene.scale.height * 0.5,
      duration: 600,
      ease: 'Back.easeOut',
    });

    const runePositions: { r: number; c: number }[] = [];
    if (row >= 0) {
      for (let c = 0; c < GRID_SIZE; c++) runePositions.push({ r: row, c });
    } else if (col >= 0) {
      for (let r = 0; r < GRID_SIZE; r++) runePositions.push({ r, c });
    }

    let delay = 600;
    for (const pos of runePositions) {
      const cell = this.grid[pos.r][pos.c];
      if (cell.container) {
        this.scene.tweens.add({
          targets: cell.container,
          x: furnaceX,
          y: this.scene.scale.height * 0.5,
          scaleX: 0.3,
          scaleY: 0.3,
          alpha: 0,
          duration: 400,
          delay: delay,
          ease: 'Power2',
          onComplete: () => {
            this.clearCell(cell);
          },
        });
        delay += 200;
      }
    }

    this.scene.time.delayedCall(delay + 400, () => {
      this.scene.tweens.add({
        targets: furnace,
        y: this.scene.scale.height + 50,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => furnace.destroy(),
      });

      this.playMergeParticles(1, 1, recipe.elementType);

      this.events.onWeaponForged(recipe);
    });
  }

  private shakeGrid() {
    this.scene.tweens.add({
      targets: this.gridContainer,
      x: -8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Power1',
      onComplete: () => {
        this.gridContainer.setX(0);
      },
    });
  }

  private flashGridRed() {
    const flash = this.scene.add.rectangle(
      this.boardX + (this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1)) / 2,
      this.boardY + (this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1)) / 2,
      this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1),
      this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1),
      0xff0000,
      0.3
    ).setDepth(500);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  private getGridCellAt(worldX: number, worldY: number): { row: number; col: number } {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cx = this.boardX + c * (this.cellSize + CELL_GAP) + this.cellSize / 2;
        const cy = this.boardY + r * (this.cellSize + CELL_GAP) + this.cellSize / 2;
        const halfSize = this.cellSize / 2;
        if (worldX >= cx - halfSize && worldX <= cx + halfSize && worldY >= cy - halfSize && worldY <= cy + halfSize) {
          return { row: r, col: c };
        }
      }
    }
    return { row: -1, col: -1 };
  }

  private updatePoolCount(poolItem: { element: RuneElement; count: number; container: Phaser.GameObjects.Container }) {
    const countText = poolItem.container.getByName('countText') as Phaser.GameObjects.Text;
    if (countText) {
      countText.setText(`x${poolItem.count}`);
    }
    if (poolItem.count <= 0) {
      poolItem.container.setAlpha(0.4);
    }
  }

  private setupInput() {
    this.scene.input.on('dragend', () => {
      if (this.dragItem) {
        this.dragItem.destroy();
        this.dragItem = null;
      }
    });
  }

  private handleResize() {
    this.isMobile = this.scene.scale.width < 768;
    this.cellSize = this.isMobile ? 60 : CELL_SIZE;
    this.layoutGrid();
    this.layoutRunePool();
  }

  public getGridState(): GridCell[][] {
    return this.grid;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public getBoardPosition(): { x: number; y: number } {
    return { x: this.boardX, y: this.boardY };
  }

  public resetBoard() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.clearCell(this.grid[r][c]);
      }
    }
    this.runePool.forEach(item => {
      item.count = 3;
      item.container.setAlpha(1);
      this.updatePoolCount(item);
    });
  }

  public triggerManaInsufficientEffect() {
    this.shakeGrid();
    this.flashGridRed();
  }

  public addRuneToPool(element: RuneElement, count: number = 1) {
    const poolItem = this.runePool.find(p => p.element === element);
    if (poolItem) {
      poolItem.count += count;
      poolItem.container.setAlpha(1);
      this.updatePoolCount(poolItem);
    }
  }
}
