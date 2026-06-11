import Phaser from 'phaser';
import {
  DiceSystem,
  DiceColor,
  DiceFace,
  Dice,
  DiceRarity,
  BattleResult
} from '../systems/DiceSystem';

interface RoundedRect extends Phaser.GameObjects.Graphics {
  currentFillColor: number;
  currentFillAlpha: number;
  currentStrokeColor: number;
  currentStrokeWidth: number;
  width: number;
  height: number;
  radius: number;
  centerX: number;
  centerY: number;
}

interface DiceFaceSprite extends Phaser.GameObjects.Container {
  face: DiceFace;
  background: RoundedRect;
  valueText: Phaser.GameObjects.Text;
  effectText?: Phaser.GameObjects.Text;
  glow?: Phaser.GameObjects.Rectangle;
  gridRow?: number;
  gridCol?: number;
  isDragging: boolean;
  originalX: number;
  originalY: number;
  isInGrid: boolean;
  dragStartX: number;
  dragStartY: number;
}

interface BattleDice extends Phaser.GameObjects.Container {
  dice: Dice;
  background: RoundedRect;
  valueText: Phaser.GameObjects.Text;
  resultFace?: DiceFace;
  originalY: number;
}

interface LayoutConfig {
  forgeWidth: number;
  forgeHeight: number;
  forgeX: number;
  forgeY: number;
  battleWidth: number;
  battleHeight: number;
  battleX: number;
  battleY: number;
  gridStartX: number;
  gridStartY: number;
  poolY: number;
  battleTopY: number;
  buttonY: number;
  isNarrow: boolean;
  diceSize: number;
  battleDiceSize: number;
  titleFontSize: number;
}

export class GameScene extends Phaser.Scene {
  private forgeGrid: (DiceFace | null)[][] = [[], [], []];
  private dicePool: DiceFace[] = [];
  private playerDice: Dice[] = [];
  private aiDice: Dice[] = [];
  private playerHP = 100;
  private aiHP = 100;
  private currentRound = 0;
  private isBattleInProgress = false;
  private layout!: LayoutConfig;

  private forgeGridSprites: (DiceFaceSprite | null)[][] = [[], [], []];
  private poolSprites: DiceFaceSprite[] = [];
  private playerBattleDice: BattleDice[] = [];
  private aiBattleDice: BattleDice[] = [];
  private playerHPBar!: Phaser.GameObjects.Rectangle;
  private aiHPBar!: Phaser.GameObjects.Rectangle;
  private playerHPText!: Phaser.GameObjects.Text;
  private aiHPText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Container;
  private battleButtonText!: Phaser.GameObjects.Text;
  private battleButtonBg!: RoundedRect;
  private forgeArea!: Phaser.GameObjects.Rectangle;
  private battleArea!: Phaser.GameObjects.Rectangle;

  private gridSlots: Phaser.GameObjects.Rectangle[] = [];

  private readonly GRID_SIZE = 3;
  private readonly BASE_DICE_SIZE = 60;
  private readonly GRID_GAP = 10;
  private readonly MAX_DICE = 6;
  private readonly NARROW_THRESHOLD = 768;

  private allElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.calculateLayout();
    this.createBackground();
    this.initializeGrid();
    this.initializeDicePool();
    this.createForgingArea();
    this.createBattleArea();
    this.createDicePoolUI();
    this.createBattleButton();
    this.setupResizeHandler();
    this.initializeAIDice();
  }

  private calculateLayout(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const isNarrow = width < this.NARROW_THRESHOLD;

    const scale = Math.min(width / 1280, height / 800, 1);
    const diceSize = Math.floor(this.BASE_DICE_SIZE * scale);
    const battleDiceSize = Math.floor(50 * scale);

    let forgeWidth: number, forgeHeight: number, forgeX: number, forgeY: number;
    let battleWidth: number, battleHeight: number, battleX: number, battleY: number;

    if (isNarrow) {
      forgeWidth = width;
      forgeHeight = height * 0.5;
      forgeX = 0;
      forgeY = 0;
      battleWidth = width;
      battleHeight = height * 0.5;
      battleX = 0;
      battleY = height * 0.5;
    } else {
      forgeWidth = width * 0.5;
      forgeHeight = height;
      forgeX = 0;
      forgeY = 0;
      battleWidth = width * 0.5;
      battleHeight = height;
      battleX = width * 0.5;
      battleY = 0;
    }

    const gridTotalSize = this.GRID_SIZE * diceSize + (this.GRID_SIZE - 1) * this.GRID_GAP;
    const gridStartX = forgeX + (forgeWidth - gridTotalSize) / 2;
    const gridStartY = forgeY + (isNarrow ? 80 : 120) * scale;

    const poolY = forgeY + (isNarrow ? forgeHeight * 0.75 : forgeHeight * 0.72);
    const battleTopY = battleY + (isNarrow ? 50 : 70) * scale;
    const buttonY = battleY + (isNarrow ? battleHeight * 0.85 : battleHeight * 0.88);

    this.layout = {
      forgeWidth,
      forgeHeight,
      forgeX,
      forgeY,
      battleWidth,
      battleHeight,
      battleX,
      battleY,
      gridStartX,
      gridStartY,
      poolY,
      battleTopY,
      buttonY,
      isNarrow,
      diceSize,
      battleDiceSize,
      titleFontSize: isNarrow ? 18 : 24
    };
  }

  private createRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillColor: number,
    fillAlpha = 1,
    strokeColor?: number,
    strokeWidth = 0
  ): RoundedRect {
    const graphics = this.add.graphics() as RoundedRect;
    graphics.currentFillColor = fillColor;
    graphics.currentFillAlpha = fillAlpha;
    graphics.currentStrokeColor = strokeColor ?? fillColor;
    graphics.currentStrokeWidth = strokeWidth;
    graphics.width = width;
    graphics.height = height;
    graphics.radius = radius;
    graphics.centerX = x;
    graphics.centerY = y;

    this.redrawRoundedRect(graphics);
    return graphics;
  }

  private redrawRoundedRect(graphics: RoundedRect): void {
    graphics.clear();
    graphics.fillStyle(graphics.currentFillColor, graphics.currentFillAlpha);
    graphics.lineStyle(graphics.currentStrokeWidth, graphics.currentStrokeColor, 1);

    const r = graphics.radius;
    const w = graphics.width;
    const h = graphics.height;
    const x = 0;
    const y = 0;

    graphics.beginPath();
    graphics.moveTo(x - w / 2 + r, y - h / 2);
    graphics.lineTo(x + w / 2 - r, y - h / 2);
    graphics.arc(x + w / 2 - r, y - h / 2 + r, r, -Math.PI / 2, 0);
    graphics.lineTo(x + w / 2, y + h / 2 - r);
    graphics.arc(x + w / 2 - r, y + h / 2 - r, r, 0, Math.PI / 2);
    graphics.lineTo(x - w / 2 + r, y + h / 2);
    graphics.arc(x - w / 2 + r, y + h / 2 - r, r, Math.PI / 2, Math.PI);
    graphics.lineTo(x - w / 2, y - h / 2 + r);
    graphics.arc(x - w / 2 + r, y - h / 2 + r, r, Math.PI, -Math.PI / 2);
    graphics.closePath();
    graphics.fillPath();

    if (graphics.currentStrokeWidth > 0) {
      graphics.strokePath();
    }
  }

  private updateRoundedRectColors(
    graphics: RoundedRect,
    fillColor?: number,
    fillAlpha?: number,
    strokeColor?: number,
    strokeWidth?: number
  ): void {
    if (fillColor !== undefined) graphics.currentFillColor = fillColor;
    if (fillAlpha !== undefined) graphics.currentFillAlpha = fillAlpha;
    if (strokeColor !== undefined) graphics.currentStrokeColor = strokeColor;
    if (strokeWidth !== undefined) graphics.currentStrokeWidth = strokeWidth;
    this.redrawRoundedRect(graphics);
  }

  private createBackground(): void {
    this.allElements.forEach(el => el.destroy());
    this.allElements = [];
    this.gridSlots = [];

    const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a2e).setOrigin(0);
    this.allElements.push(bg);

    this.forgeArea = this.add.rectangle(
      this.layout.forgeX,
      this.layout.forgeY,
      this.layout.forgeWidth,
      this.layout.forgeHeight,
      0x202040
    ).setOrigin(0).setAlpha(0.5);
    this.allElements.push(this.forgeArea);

    this.battleArea = this.add.rectangle(
      this.layout.battleX,
      this.layout.battleY,
      this.layout.battleWidth,
      this.layout.battleHeight,
      0x1a1a3a
    ).setOrigin(0).setAlpha(0.5);
    this.allElements.push(this.battleArea);

    const forgeTitle = this.add.text(
      this.layout.forgeX + this.layout.forgeWidth / 2,
      this.layout.forgeY + 30 * (this.layout.isNarrow ? 0.7 : 1),
      '⚒ 锻造区',
      { fontSize: `${this.layout.titleFontSize}px`, color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);
    this.allElements.push(forgeTitle);

    const battleTitle = this.add.text(
      this.layout.battleX + this.layout.battleWidth / 2,
      this.layout.battleY + 30 * (this.layout.isNarrow ? 0.7 : 1),
      '⚔ 战斗区',
      { fontSize: `${this.layout.titleFontSize}px`, color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);
    this.allElements.push(battleTitle);
  }

  private createParticleBurst(x: number, y: number, color: DiceColor): void {
    const colorValue = parseInt(DiceSystem.COLOR_MAP[color].main.replace('#', ''), 16);
    const particleCount = 25;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 100 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 5;
      const life = 700 + Math.random() * 300;

      const particle = this.add.circle(x, y, size, colorValue);
      particle.setAlpha(1);
      particle.setDepth(200);

      let currentLife = life;

      const updateParticle = () => {
        if (currentLife <= 0 || !particle.active) return;
        const delta = 16;
        currentLife -= delta;
        particle.x += (vx * delta) / 1000;
        particle.y += (vy * delta) / 1000;
        particle.y += (100 * delta) / 1000;
        if (currentLife > 0) {
          requestAnimationFrame(updateParticle);
        }
      };
      updateParticle();

      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0,
        duration: life,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private initializeGrid(): void {
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        this.forgeGrid[row][col] = null;
        if (this.forgeGridSprites[row]?.[col]) {
          this.forgeGridSprites[row][col]?.destroy();
        }
        this.forgeGridSprites[row][col] = null;
      }
    }
  }

  private initializeDicePool(): void {
    this.dicePool = DiceSystem.createInitialPool();
  }

  private initializeAIDice(): void {
    this.aiDice = DiceSystem.createAIDice(3);
  }

  private createForgingArea(): void {
    const { gridStartX, gridStartY, diceSize } = this.layout;

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const x = gridStartX + col * (diceSize + this.GRID_GAP) + diceSize / 2;
        const y = gridStartY + row * (diceSize + this.GRID_GAP) + diceSize / 2;

        const slot = this.add.rectangle(x, y, diceSize, diceSize, 0x2a2a4a)
          .setStrokeStyle(2, 0x3a3a6a)
          .setData('row', row)
          .setData('col', col);
        this.gridSlots.push(slot);
        this.allElements.push(slot);

        slot.setInteractive({ dropZone: true });

        slot.on('pointerover', () => {
          slot.setStrokeStyle(3, 0x5a5a8a);
        });

        slot.on('pointerout', () => {
          slot.setStrokeStyle(2, 0x3a3a6a);
        });

        slot.on('drop', (_pointer: Phaser.Input.Pointer, gameObject: DiceFaceSprite) => {
          this.handleDrop(gameObject, row, col);
        });
      }
    }

    const gridTotalSize = this.GRID_SIZE * diceSize + (this.GRID_SIZE - 1) * this.GRID_GAP;
    const hintText = this.add.text(
      this.layout.forgeX + this.layout.forgeWidth / 2,
      gridStartY + gridTotalSize + 20,
      '将骰子面拖入网格，相同颜色3个连成线可合成高级骰子',
      { fontSize: this.layout.isNarrow ? '10px' : '12px', color: '#8888aa' }
    ).setOrigin(0.5);
    this.allElements.push(hintText);
  }

  private createDiceFace(face: DiceFace, x: number, y: number): DiceFaceSprite {
    const container = this.add.container(x, y) as DiceFaceSprite;
    container.face = face;
    container.isDragging = false;
    container.originalX = x;
    container.originalY = y;
    container.isInGrid = false;
    container.dragStartX = x;
    container.dragStartY = y;
    container.setSize(this.layout.diceSize, this.layout.diceSize);

    const colors = DiceSystem.COLOR_MAP[face.color];
    const mainColor = parseInt(colors.main.replace('#', ''), 16);
    const darkColor = parseInt(colors.dark.replace('#', ''), 16);
    const lightColor = parseInt(colors.light.replace('#', ''), 16);

    if (face.rarity === DiceRarity.ADVANCED) {
      container.glow = this.add.rectangle(0, 0, this.layout.diceSize + 10, this.layout.diceSize + 10, lightColor, 0.3)
        .setStrokeStyle(2, lightColor);
      container.add(container.glow);

      this.tweens.add({
        targets: container.glow,
        scale: { from: 1, to: 1.15 },
        alpha: { from: 0.3, to: 0.7 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }

    container.background = this.createRoundedRect(
      0, 0, this.layout.diceSize, this.layout.diceSize, 8, mainColor, 1, darkColor, 3
    );
    container.add(container.background);

    const fontSize = Math.floor(24 * (this.layout.diceSize / 60));
    container.valueText = this.add.text(0, 0, face.value.toString(), {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(container.valueText);

    if (face.effect) {
      const effectFontSize = Math.floor(10 * (this.layout.diceSize / 60));
      container.effectText = this.add.text(0, this.layout.diceSize / 2 + 8, face.effect, {
        fontSize: `${effectFontSize}px`,
        color: colors.light,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(container.effectText);
      container.valueText.setY(-8);
    }

    const hitArea = new Phaser.Geom.Rectangle(
      -this.layout.diceSize / 2,
      -this.layout.diceSize / 2,
      this.layout.diceSize,
      this.layout.diceSize
    );
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    if (container.input) {
      container.input.draggable = true;
      container.input.cursor = 'pointer';
    }

    container.on('pointerover', () => {
      if (!container.isDragging) {
        this.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 120,
          ease: 'Power2.easeOut'
        });
      }
    });

    container.on('pointerout', () => {
      if (!container.isDragging) {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 120,
          ease: 'Power2.easeOut'
        });
      }
    });

    container.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
      container.isDragging = true;
      container.dragStartX = container.x;
      container.dragStartY = container.y;
      container.setDepth(100);
      container.setAlpha(0.7);

      this.tweens.add({
        targets: container,
        scale: 1.15,
        duration: 100
      });
    });

    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
    });

    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      container.isDragging = false;
      container.setDepth(1);
      container.setAlpha(1);

      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 100
      });

      if (!container.isInGrid || (container.gridRow === undefined && container.gridCol === undefined)) {
        const droppedOnSlot = this.gridSlots.some(slot => {
          const bounds = slot.getBounds();
          return bounds.contains(pointer.x, pointer.y);
        });

        if (!droppedOnSlot) {
          this.playRejectAnimation(container);
        } else {
          this.tweens.add({
            targets: container,
            x: container.originalX,
            y: container.originalY,
            duration: 200,
            ease: 'Power2.easeOut'
          });
        }
      }
    });

    return container;
  }

  private playRejectAnimation(sprite: DiceFaceSprite): void {
    const originalX = sprite.originalX;
    const originalY = sprite.originalY;

    this.tweens.add({
      targets: sprite,
      x: originalX,
      y: originalY,
      duration: 300,
      ease: 'Elastic.easeOut',
      easeParams: [1, 0.3]
    });

    this.tweens.add({
      targets: sprite,
      angle: { from: -5, to: 5 },
      duration: 80,
      yoyo: true,
      repeat: 3
    });

    this.cameras.main.shake(80, 0.002);
  }

  private createDicePoolUI(): void {
    const { poolY, forgeX, forgeWidth, diceSize } = this.layout;
    const poolStartX = forgeX + forgeWidth / 2 - (4 * (diceSize + 15)) / 2;

    this.poolSprites.forEach(s => s.destroy());
    this.poolSprites = [];

    this.dicePool.forEach((face, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = poolStartX + col * (diceSize + 15) + diceSize / 2;
      const y = poolY + row * (diceSize + 15) + diceSize / 2;

      const sprite = this.createDiceFace(face, x, y);
      sprite.originalX = x;
      sprite.originalY = y;
      this.poolSprites.push(sprite);
    });

    const poolTitle = this.add.text(
      forgeX + forgeWidth / 2,
      poolY - 40,
      '🎲 骰子池',
      { fontSize: `${16 * (this.layout.isNarrow ? 0.8 : 1)}px`, color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);
    this.allElements.push(poolTitle);
  }

  private handleDrop(sprite: DiceFaceSprite, row: number, col: number): void {
    if (this.isBattleInProgress) {
      this.playRejectAnimation(sprite);
      return;
    }
    if (this.forgeGrid[row][col] !== null) {
      this.playRejectAnimation(sprite);
      return;
    }

    sprite.isInGrid = true;
    sprite.gridRow = row;
    sprite.gridCol = col;
    this.forgeGrid[row][col] = sprite.face;

    const poolIndex = this.poolSprites.indexOf(sprite);
    if (poolIndex > -1) {
      this.poolSprites.splice(poolIndex, 1);
      this.dicePool.splice(poolIndex, 1);
    }

    const { gridStartX, gridStartY, diceSize } = this.layout;
    const targetX = gridStartX + col * (diceSize + this.GRID_GAP) + diceSize / 2;
    const targetY = gridStartY + row * (diceSize + this.GRID_GAP) + diceSize / 2;

    sprite.originalX = targetX;
    sprite.originalY = targetY;

    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration: 200,
      ease: 'Power2.easeOut'
    });

    if (this.forgeGridSprites[row][col]) {
      this.forgeGridSprites[row][col].destroy();
    }
    this.forgeGridSprites[row][col] = sprite;

    this.time.delayedCall(250, () => this.checkAndProcessMerge());
  }

  private checkAndProcessMerge(): void {
    const merges = DiceSystem.checkMerge(this.forgeGrid);
    if (merges.length === 0) return;
    this.processMerges(merges, 0);
  }

  private processMerges(merges: { positions: { row: number; col: number }[]; color: DiceColor }[], index: number): void {
    if (index >= merges.length) return;

    const merge = merges[index];
    const centerPos = merge.positions[Math.floor(merge.positions.length / 2)];
    const centerSprite = this.forgeGridSprites[centerPos.row][centerPos.col];

    if (centerSprite) {
      let totalValue = 0;
      merge.positions.forEach(pos => {
        const face = this.forgeGrid[pos.row][pos.col];
        if (face) totalValue += face.effectValue ?? face.value;
      });
      const advancedValue = Math.ceil(totalValue / merge.positions.length) + 2;

      this.cameras.main.shake(150, 0.008);
      this.createParticleBurst(centerSprite.x, centerSprite.y, merge.color);

      const sprites = merge.positions
        .map(p => this.forgeGridSprites[p.row][p.col])
        .filter(s => s !== null) as DiceFaceSprite[];

      this.tweens.add({
        targets: sprites,
        scale: 1.4,
        alpha: 0,
        duration: 350,
        ease: 'Power2.easeIn',
        onComplete: () => {
          sprites.forEach(s => s.destroy());
          merge.positions.forEach(pos => {
            this.forgeGrid[pos.row][pos.col] = null;
            this.forgeGridSprites[pos.row][pos.col] = null;
          });

          const advancedFace = DiceSystem.createAdvancedFace(merge.color, advancedValue);
          this.forgeGrid[centerPos.row][centerPos.col] = advancedFace;

          const { gridStartX, gridStartY, diceSize } = this.layout;
          const x = gridStartX + centerPos.col * (diceSize + this.GRID_GAP) + diceSize / 2;
          const y = gridStartY + centerPos.row * (diceSize + this.GRID_GAP) + diceSize / 2;

          const newSprite = this.createDiceFace(advancedFace, x, y);
          newSprite.isInGrid = true;
          newSprite.gridRow = centerPos.row;
          newSprite.gridCol = centerPos.col;
          newSprite.originalX = x;
          newSprite.originalY = y;
          newSprite.setScale(0);
          this.forgeGridSprites[centerPos.row][centerPos.col] = newSprite;

          this.tweens.add({
            targets: newSprite,
            scale: 1,
            duration: 500,
            ease: 'Elastic.easeOut',
            easeParams: [1.2, 0.5],
            onComplete: () => {
              this.time.delayedCall(200, () => this.processMerges(merges, index + 1));
            }
          });
        }
      });
    } else {
      this.processMerges(merges, index + 1);
    }
  }

  private createBattleArea(): void {
    const { battleX, battleWidth, battleTopY, isNarrow } = this.layout;
    const battleCenterX = battleX + battleWidth / 2;

    const aiLabel = this.add.text(battleCenterX, battleTopY, '🤖 AI对手', {
      fontSize: isNarrow ? '14px' : '18px',
      color: '#e94560',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.allElements.push(aiLabel);

    const aiHPBg = this.add.rectangle(battleCenterX, battleTopY + 30, 180, 16, 0x333355).setOrigin(0.5);
    this.allElements.push(aiHPBg);

    this.aiHPBar = this.add.rectangle(battleCenterX - 90, battleTopY + 30, 180, 16, 0xe94560).setOrigin(0, 0.5);
    this.allElements.push(this.aiHPBar);

    this.aiHPText = this.add.text(battleCenterX, battleTopY + 30, '100/100', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.allElements.push(this.aiHPText);

    const playerLabel = this.add.text(battleCenterX, battleTopY + 250, '👤 玩家', {
      fontSize: isNarrow ? '14px' : '18px',
      color: '#16c79a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.allElements.push(playerLabel);

    const playerHPBg = this.add.rectangle(battleCenterX, battleTopY + 280, 180, 16, 0x333355).setOrigin(0.5);
    this.allElements.push(playerHPBg);

    this.playerHPBar = this.add.rectangle(battleCenterX - 90, battleTopY + 280, 180, 16, 0x16c79a).setOrigin(0, 0.5);
    this.allElements.push(this.playerHPBar);

    this.playerHPText = this.add.text(battleCenterX, battleTopY + 280, '100/100', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.allElements.push(this.playerHPText);

    this.roundText = this.add.text(battleCenterX, battleTopY + 155, '回合 0', {
      fontSize: isNarrow ? '16px' : '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.allElements.push(this.roundText);

    this.createBattleDiceSlots();
  }

  private createBattleDiceSlots(): void {
    const { battleX, battleWidth, battleTopY, battleDiceSize } = this.layout;
    const battleCenterX = battleX + battleWidth / 2;
    const gap = 8;
    const totalWidth = 6 * battleDiceSize + 5 * gap;
    const startX = battleCenterX - totalWidth / 2 + battleDiceSize / 2;

    this.aiDice.forEach((_, index) => {
      const x = startX + index * (battleDiceSize + gap);
      const y = battleTopY + 80;
      const slot = this.createRoundedRect(x, y, battleDiceSize, battleDiceSize, 6, 0x2a2a4a, 1, 0x3a3a6a, 2);
      this.allElements.push(slot);
    });

    for (let i = this.aiDice.length; i < this.MAX_DICE; i++) {
      const x = startX + i * (battleDiceSize + gap);
      const y = battleTopY + 80;
      const slot = this.createRoundedRect(x, y, battleDiceSize, battleDiceSize, 6, 0x222233, 0.5, 0x333344, 2);
      this.allElements.push(slot);
    }

    for (let i = 0; i < this.MAX_DICE; i++) {
      const x = startX + i * (battleDiceSize + gap);
      const y = battleTopY + 200;
      const slot = this.createRoundedRect(x, y, battleDiceSize, battleDiceSize, 6, 0x2a2a4a, 1, 0x3a3a6a, 2);
      this.allElements.push(slot);
    }
  }

  private createBattleButton(): void {
    const { battleX, battleWidth, buttonY } = this.layout;
    const buttonX = battleX + battleWidth / 2;

    this.battleButton = this.add.container(buttonX, buttonY);
    this.battleButton.setSize(140, 45);

    this.battleButtonBg = this.createRoundedRect(0, 0, 140, 45, 10, 0x0f3460, 1, 0x16c79a, 3);
    this.battleButton.add(this.battleButtonBg);

    this.battleButtonText = this.add.text(0, 0, '开始战斗 ⚔', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.battleButton.add(this.battleButtonText);

    const buttonHitArea = new Phaser.Geom.Rectangle(-70, -22.5, 140, 45);
    this.battleButton.setInteractive(buttonHitArea, Phaser.Geom.Rectangle.Contains);
    if (this.battleButton.input) {
      this.battleButton.input.cursor = 'pointer';
    }

    this.battleButton.on('pointerover', () => {
      this.updateRoundedRectColors(this.battleButtonBg, 0x16c79a, 1, 0xffffff, 3);
    });

    this.battleButton.on('pointerout', () => {
      this.updateRoundedRectColors(this.battleButtonBg, 0x0f3460, 1, 0x16c79a, 3);
    });

    this.battleButton.on('pointerdown', () => {
      if (!this.isBattleInProgress) {
        this.startBattle();
      }
    });
  }

  private createBattleDice(dice: Dice, x: number, y: number, isPlayer: boolean): BattleDice {
    const container = this.add.container(x, y) as BattleDice;
    container.dice = dice;
    container.originalY = y;
    container.setSize(this.layout.battleDiceSize, this.layout.battleDiceSize);

    const tint = isPlayer ? 0x16c79a : 0xe94560;
    container.background = this.createRoundedRect(
      0, 0, this.layout.battleDiceSize, this.layout.battleDiceSize, 6, 0x2a2a4a, 1, tint, 2
    );

    container.valueText = this.add.text(0, 0, '?', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add(container.background);
    container.add(container.valueText);

    return container;
  }

  private startBattle(): void {
    this.collectForgedDice();

    if (this.playerDice.length === 0) {
      this.showFloatingText(
        this.layout.battleX + this.layout.battleWidth / 2,
        this.layout.battleY + this.layout.battleHeight * 0.5,
        '请先锻造骰子！',
        '#e94560'
      );
      return;
    }

    this.isBattleInProgress = true;
    this.currentRound++;
    this.roundText.setText(`回合 ${this.currentRound}`);

    this.battleButton.disableInteractive();
    this.battleButton.setAlpha(0.5);
    this.battleButtonText.setText('战斗中...');
    this.updateRoundedRectColors(this.battleButtonBg, 0x333355, 0.5, 0x333355, 2);

    this.setupBattleDice();
    this.animateDiceRoll();
  }

  private collectForgedDice(): void {
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const face = this.forgeGrid[row][col];
        if (face && this.playerDice.length < this.MAX_DICE) {
          const dice = DiceSystem.createDiceFromFace(face);
          this.playerDice.push(dice);

          const sprite = this.forgeGridSprites[row][col];
          if (sprite) {
            this.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 0.5,
              duration: 300,
              onComplete: () => sprite.destroy()
            });
          }

          this.forgeGrid[row][col] = null;
          this.forgeGridSprites[row][col] = null;
        }
      }
    }
  }

  private setupBattleDice(): void {
    this.playerBattleDice.forEach(d => d.destroy());
    this.aiBattleDice.forEach(d => d.destroy());
    this.playerBattleDice = [];
    this.aiBattleDice = [];

    const { battleX, battleWidth, battleTopY, battleDiceSize } = this.layout;
    const battleCenterX = battleX + battleWidth / 2;
    const gap = 8;
    const totalWidth = 6 * battleDiceSize + 5 * gap;
    const startX = battleCenterX - totalWidth / 2 + battleDiceSize / 2;

    this.aiDice.forEach((dice, index) => {
      const x = startX + index * (battleDiceSize + gap);
      const y = battleTopY + 80;
      const battleDice = this.createBattleDice(dice, x, y, false);
      battleDice.setScale(0);
      this.aiBattleDice.push(battleDice);

      this.tweens.add({
        targets: battleDice,
        scale: 1,
        duration: 250,
        delay: index * 80,
        ease: 'Back.easeOut'
      });
    });

    this.playerDice.forEach((dice, index) => {
      const x = startX + index * (battleDiceSize + gap);
      const y = battleTopY + 200;
      const battleDice = this.createBattleDice(dice, x, y, true);
      battleDice.setScale(0);
      this.playerBattleDice.push(battleDice);

      this.tweens.add({
        targets: battleDice,
        scale: 1,
        duration: 250,
        delay: index * 80,
        ease: 'Back.easeOut'
      });
    });
  }

  private animateDiceRoll(): void {
    const allDice = [...this.playerBattleDice, ...this.aiBattleDice];
    const totalDuration = 2000;

    allDice.forEach((dice, index) => {
      const stagger = index * 120;
      const originalY = dice.originalY;
      const bounceHeight = 70;

      this.tweens.add({
        targets: dice,
        y: originalY - bounceHeight,
        duration: 250,
        delay: stagger,
        ease: 'Cubic.easeOut',
        yoyo: true,
        repeat: 4
      });

      this.tweens.add({
        targets: dice,
        angle: 1080,
        duration: totalDuration,
        delay: stagger,
        ease: 'Cubic.easeOut'
      });

      this.tweens.add({
        targets: dice,
        y: originalY - 15,
        duration: totalDuration * 0.6,
        delay: stagger,
        ease: 'Bounce.easeOut',
        yoyo: true,
        hold: 150
      });
    });

    this.time.delayedCall(totalDuration + 300, () => this.processBattleResults());
  }

  private processBattleResults(): void {
    const battle = DiceSystem.calculateBattle(this.playerDice, this.aiDice);

    this.time.delayedCall(200, () => {
      this.playerBattleDice.forEach((dice, index) => {
        if (battle.playerDiceResults[index]) {
          const result = battle.playerDiceResults[index];
          this.updateBattleDiceDisplay(dice, result.face, result.value);
        }
      });

      this.aiBattleDice.forEach((dice, index) => {
        if (battle.aiDiceResults[index]) {
          const result = battle.aiDiceResults[index];
          this.updateBattleDiceDisplay(dice, result.face, result.value);
        }
      });
    });

    this.time.delayedCall(800, () => {
      this.displayBattleNumbers(battle);
    });

    this.time.delayedCall(1500, () => {
      this.resolveBattle(battle);
    });
  }

  private updateBattleDiceDisplay(dice: BattleDice, face: DiceFace, value: number): void {
    const colors = DiceSystem.COLOR_MAP[face.color];
    const mainColor = parseInt(colors.main.replace('#', ''), 16);
    const darkColor = parseInt(colors.dark.replace('#', ''), 16);

    dice.resultFace = face;
    this.updateRoundedRectColors(dice.background, mainColor, 1, darkColor, 3);
    dice.valueText.setText(value.toString());
    dice.valueText.setColor('#ffffff');

    this.tweens.add({
      targets: dice,
      scale: 1.3,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true
    });
  }

  private displayBattleNumbers(battle: BattleResult): void {
    const { battleX, battleWidth, battleTopY } = this.layout;
    const battleCenterX = battleX + battleWidth / 2;
    const centerY = battleTopY + 145;

    if (battle.playerDamage > 0) {
      this.showFloatingText(battleCenterX, centerY - 10, `攻击 +${battle.playerDamage}`, '#e94560', 18);
    }
    if (battle.playerDefense > 0) {
      this.showFloatingText(battleCenterX - 70, centerY + 15, `防御 +${battle.playerDefense}`, '#0f3460', 16);
    }
    if (battle.playerHeal > 0) {
      this.showFloatingText(battleCenterX + 70, centerY + 15, `治疗 +${battle.playerHeal}`, '#16c79a', 16);
    }

    if (battle.aiDamage > 0) {
      this.showFloatingText(battleCenterX, centerY + 50, `敌方攻击 +${battle.aiDamage}`, '#ff6b6b', 14);
    }
  }

  private resolveBattle(battle: BattleResult): void {
    const result = DiceSystem.resolveBattle(this.playerHP, this.aiHP, battle);

    this.playerHP = result.newPlayerHP;
    this.aiHP = result.newAiHP;

    if (result.playerNetLoss > 0) {
      this.showFloatingText(
        this.playerHPBar.x + this.playerHPBar.width / 2,
        this.playerHPBar.y,
        `-${result.playerNetLoss}`,
        '#ff4444',
        20
      );
    }
    if (result.aiNetLoss > 0) {
      this.showFloatingText(
        this.aiHPBar.x + this.aiHPBar.width / 2,
        this.aiHPBar.y,
        `-${result.aiNetLoss}`,
        '#ff4444',
        20
      );
    }

    this.updateHPBar(this.playerHPBar, this.playerHPText, this.playerHP, '#16c79a', result.playerNetLoss > 0);
    this.updateHPBar(this.aiHPBar, this.aiHPText, this.aiHP, '#e94560', result.aiNetLoss > 0);

    this.time.delayedCall(1000, () => {
      this.checkBattleEnd();
    });
  }

  private updateHPBar(bar: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, hp: number, _color: string, flash: boolean): void {
    const maxWidth = 180;
    const targetWidth = maxWidth * (hp / 100);

    this.tweens.add({
      targets: bar,
      width: targetWidth,
      duration: 600,
      ease: 'Power2.easeOut'
    });

    text.setText(`${hp}/100`);

    if (flash) {
      const flashRect = this.add.rectangle(
        bar.x + bar.width / 2,
        bar.y,
        bar.width,
        bar.height,
        0xff0000,
        0
      ).setOrigin(0.5);
      flashRect.setDepth(bar.depth + 1);

      this.tweens.add({
        targets: flashRect,
        alpha: { from: 0, to: 0.6 },
        duration: 80,
        yoyo: true,
        repeat: 4,
        onComplete: () => flashRect.destroy()
      });

      this.tweens.add({
        targets: bar,
        scaleX: 1.05,
        duration: 100,
        yoyo: true,
        repeat: 2
      });
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string, fontSize = 18): void {
    const floating = this.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    this.tweens.add({
      targets: floating,
      alpha: 1,
      y: y - 30,
      duration: 400,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: floating,
      alpha: 0,
      y: y - 80,
      duration: 500,
      delay: 1000,
      ease: 'Power2.easeIn',
      onComplete: () => floating.destroy()
    });
  }

  private checkBattleEnd(): void {
    let gameEnded = false;

    if (this.playerHP <= 0) {
      this.showBattleResult(false);
      gameEnded = true;
    } else if (this.aiHP <= 0) {
      this.showBattleResult(true);
      gameEnded = true;
    }

    if (!gameEnded) {
      this.time.delayedCall(1200, () => {
        this.resetForRound();
      });
    } else {
      this.time.delayedCall(2500, () => {
        this.resetGame();
      });
    }
  }

  private showBattleResult(playerWon: boolean): void {
    const centerX = this.layout.battleX + this.layout.battleWidth / 2;
    const centerY = this.layout.battleY + this.layout.battleHeight * 0.5;

    const overlay = this.add.rectangle(centerX, centerY, this.layout.battleWidth, 350, 0x000000, 0.85);
    overlay.setDepth(200);

    const resultText = this.add.text(centerX, centerY - 40, playerWon ? '🎉 胜利！' : '💀 失败...', {
      fontSize: '42px',
      color: playerWon ? '#16c79a' : '#e94560',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);

    const subText = this.add.text(centerX, centerY + 20, `回合数: ${this.currentRound}`, {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(201);

    this.tweens.add({
      targets: [overlay, resultText, subText],
      alpha: { from: 0, to: 1 },
      duration: 600,
      ease: 'Power2.easeOut'
    });

    this.tweens.add({
      targets: resultText,
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [overlay, resultText, subText],
        alpha: 0,
        duration: 400,
        onComplete: () => {
          overlay.destroy();
          resultText.destroy();
          subText.destroy();
        }
      });
    });
  }

  private resetForRound(): void {
    this.playerBattleDice.forEach(d => d.destroy());
    this.aiBattleDice.forEach(d => d.destroy());
    this.playerBattleDice = [];
    this.aiBattleDice = [];

    if (this.aiDice.length < this.MAX_DICE && Math.random() > 0.4) {
      const newDice = DiceSystem.createAIDice(1);
      this.aiDice.push(...newDice);
      this.createBattleDiceSlots();
    }

    this.isBattleInProgress = false;
    this.battleButton.setInteractive();
    this.battleButton.setAlpha(1);
    this.battleButtonText.setText('开始战斗 ⚔');
    this.updateRoundedRectColors(this.battleButtonBg, 0x0f3460, 1, 0x16c79a, 3);

    this.refillDicePool();
  }

  private refillDicePool(): void {
    while (this.dicePool.length < 8) {
      const colors = [DiceColor.RED, DiceColor.BLUE, DiceColor.GREEN];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const value = Math.floor(Math.random() * 4) + 1;
      const face = DiceSystem.createBasicFace(color, value);
      this.dicePool.push(face);
    }

    this.poolSprites.forEach(s => s.destroy());
    this.poolSprites = [];

    const { poolY, forgeX, forgeWidth, diceSize } = this.layout;
    const poolStartX = forgeX + forgeWidth / 2 - (4 * (diceSize + 15)) / 2;

    this.dicePool.forEach((face, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = poolStartX + col * (diceSize + 15) + diceSize / 2;
      const y = poolY + row * (diceSize + 15) + diceSize / 2;

      const sprite = this.createDiceFace(face, x, y);
      sprite.setScale(0);
      sprite.originalX = x;
      sprite.originalY = y;
      this.poolSprites.push(sprite);

      this.tweens.add({
        targets: sprite,
        scale: 1,
        duration: 350,
        delay: index * 60,
        ease: 'Back.easeOut'
      });
    });
  }

  private resetGame(): void {
    this.playerHP = 100;
    this.aiHP = 100;
    this.currentRound = 0;
    this.playerDice = [];
    this.aiDice = DiceSystem.createAIDice(3);
    this.isBattleInProgress = false;

    this.playerHPBar.width = 180;
    this.aiHPBar.width = 180;
    this.playerHPText.setText('100/100');
    this.aiHPText.setText('100/100');
    this.roundText.setText('回合 0');

    this.battleButton.setInteractive();
    this.battleButton.setAlpha(1);
    this.battleButtonText.setText('开始战斗 ⚔');
    this.updateRoundedRectColors(this.battleButtonBg, 0x0f3460, 1, 0x16c79a, 3);

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (this.forgeGridSprites[row][col]) {
          this.forgeGridSprites[row][col]?.destroy();
        }
        this.forgeGrid[row][col] = null;
        this.forgeGridSprites[row][col] = null;
      }
    }

    this.playerBattleDice.forEach(d => d.destroy());
    this.aiBattleDice.forEach(d => d.destroy());
    this.playerBattleDice = [];
    this.aiBattleDice = [];

    this.refillDicePool();
  }

  private setupResizeHandler(): void {
    this.scale.on('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    this.calculateLayout();

    this.poolSprites.forEach(s => s.destroy());
    this.forgeGridSprites.flat().forEach(s => s?.destroy());
    this.playerBattleDice.forEach(d => d.destroy());
    this.aiBattleDice.forEach(d => d.destroy());
    this.battleButton.destroy();

    this.initializeGrid();
    this.createBackground();
    this.createForgingArea();
    this.createBattleArea();
    this.createDicePoolUI();
    this.createBattleButton();

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const face = this.forgeGrid[row][col];
        if (face) {
          const { gridStartX, gridStartY, diceSize } = this.layout;
          const x = gridStartX + col * (diceSize + this.GRID_GAP) + diceSize / 2;
          const y = gridStartY + row * (diceSize + this.GRID_GAP) + diceSize / 2;

          const sprite = this.createDiceFace(face, x, y);
          sprite.isInGrid = true;
          sprite.gridRow = row;
          sprite.gridCol = col;
          sprite.originalX = x;
          sprite.originalY = y;
          this.forgeGridSprites[row][col] = sprite;
        }
      }
    }
  }

  update(_time: number, _delta: number): void {
    // Animation updates handled by tweens
  }
}
