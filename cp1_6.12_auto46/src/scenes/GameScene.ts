import Phaser from 'phaser';
import {
  DiceSystem,
  DiceColor,
  DiceFace,
  Dice,
  DiceRarity,
  BattleResult
} from '../systems/DiceSystem';

interface DiceFaceSprite extends Phaser.GameObjects.Container {
  face: DiceFace;
  background: Phaser.GameObjects.Graphics;
  valueText: Phaser.GameObjects.Text;
  effectText?: Phaser.GameObjects.Text;
  glow?: Phaser.GameObjects.Rectangle;
  gridRow?: number;
  gridCol?: number;
  isDragging: boolean;
  originalX: number;
  originalY: number;
  isInGrid: boolean;
}

interface BattleDice extends Phaser.GameObjects.Container {
  dice: Dice;
  background: Phaser.GameObjects.Graphics;
  valueText: Phaser.GameObjects.Text;
  resultFace?: DiceFace;
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
  private isNarrowScreen = false;

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
  private forgeArea!: Phaser.GameObjects.Rectangle;
  private battleArea!: Phaser.GameObjects.Rectangle;
  private particleGraphics!: Phaser.GameObjects.Graphics;

  private readonly GRID_SIZE = 3;
  private readonly DICE_SIZE = 60;
  private readonly GRID_GAP = 10;
  private readonly MAX_DICE = 6;

  private layoutWidth = 0;
  private layoutHeight = 0;
  private forgeX = 0;
  private forgeY = 0;
  private battleX = 0;
  private battleY = 0;
  private forgeWidth = 0;
  private battleWidth = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.layoutWidth = this.cameras.main.width;
    this.layoutHeight = this.cameras.main.height;
    this.isNarrowScreen = this.layoutWidth < 768;

    this.calculateLayout();
    this.createBackground();
    this.createParticles();
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
    if (this.isNarrowScreen) {
      this.forgeWidth = this.layoutWidth;
      this.battleWidth = this.layoutWidth;
      this.forgeX = 0;
      this.forgeY = 0;
      this.battleX = 0;
      this.battleY = this.layoutHeight * 0.5;
    } else {
      this.forgeWidth = this.layoutWidth * 0.5;
      this.battleWidth = this.layoutWidth * 0.5;
      this.forgeX = 0;
      this.forgeY = 0;
      this.battleX = this.layoutWidth * 0.5;
      this.battleY = 0;
    }
  }

  private createBackground(): void {
    this.add.rectangle(0, 0, this.layoutWidth, this.layoutHeight, 0x1a1a2e).setOrigin(0);

    this.forgeArea = this.add.rectangle(
      this.forgeX,
      this.forgeY,
      this.forgeWidth,
      this.isNarrowScreen ? this.layoutHeight * 0.5 : this.layoutHeight,
      0x202040
    ).setOrigin(0).setAlpha(0.5);

    this.battleArea = this.add.rectangle(
      this.battleX,
      this.battleY,
      this.battleWidth,
      this.isNarrowScreen ? this.layoutHeight * 0.5 : this.layoutHeight,
      0x1a1a3a
    ).setOrigin(0).setAlpha(0.5);

    const forgeTitle = this.add.text(
      this.forgeX + this.forgeWidth / 2,
      this.forgeY + 30,
      '⚒ 锻造区',
      { fontSize: '24px', color: '#ffffff', fontWeight: 'bold' }
    ).setOrigin(0.5);

    const battleTitle = this.add.text(
      this.battleX + this.battleWidth / 2,
      this.battleY + 30,
      '⚔ 战斗区',
      { fontSize: '24px', color: '#ffffff', fontWeight: 'bold' }
    ).setOrigin(0.5);

    if (this.isNarrowScreen) {
      forgeTitle.setFontSize(18);
      battleTitle.setFontSize(18);
    }
  }

  private createParticles(): void {
    this.particleGraphics = this.add.graphics();
  }

  private createParticleBurst(x: number, y: number, color: DiceColor): void {
    const colorValue = parseInt(DiceSystem.COLOR_MAP[color].main.replace('#', ''), 16);
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 80 + Math.random() * 170;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 4 + Math.random() * 4;
      const life = 600;

      const startX = x;
      const startY = y;
      let currentLife = life;

      const particle = this.add.circle(x, y, size, colorValue);
      particle.setAlpha(1);

      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0,
        duration: life,
        ease: 'Power2.easeOut'
      });

      const updateParticle = () => {
        if (currentLife <= 0 || !particle.active) return;
        const delta = 16;
        currentLife -= delta;
        particle.x += (vx * delta) / 1000;
        particle.y += (vy * delta) / 1000;
        if (currentLife > 0) {
          requestAnimationFrame(updateParticle);
        }
      };
      updateParticle();
    }
  }

  private initializeGrid(): void {
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        this.forgeGrid[row][col] = null;
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
    const gridTotalSize = this.GRID_SIZE * this.DICE_SIZE + (this.GRID_SIZE - 1) * this.GRID_GAP;
    const gridStartX = this.forgeX + (this.forgeWidth - gridTotalSize) / 2;
    const gridStartY = this.forgeY + (this.isNarrowScreen ? 120 : 150);

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const x = gridStartX + col * (this.DICE_SIZE + this.GRID_GAP) + this.DICE_SIZE / 2;
        const y = gridStartY + row * (this.DICE_SIZE + this.GRID_GAP) + this.DICE_SIZE / 2;

        const slot = this.add.rectangle(x, y, this.DICE_SIZE, this.DICE_SIZE, 0x2a2a4a)
          .setStrokeStyle(2, 0x3a3a6a)
          .setData('row', row)
          .setData('col', col);

        slot.setInteractive({ dropZone: true });

        this.input.setDraggable(slot);

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

    this.add.text(
      this.forgeX + this.forgeWidth / 2,
      gridStartY + gridTotalSize + 20,
      '将骰子面拖入网格，相同颜色3个连成线可合成高级骰子',
      { fontSize: this.isNarrowScreen ? '11px' : '13px', color: '#8888aa' }
    ).setOrigin(0.5);
  }

  private createDiceFace(face: DiceFace, x: number, y: number): DiceFaceSprite {
    const container = this.add.container(x, y) as DiceFaceSprite;
    container.face = face;
    container.isDragging = false;
    container.originalX = x;
    container.originalY = y;
    container.isInGrid = false;
    container.setSize(this.DICE_SIZE, this.DICE_SIZE);

    const colors = DiceSystem.COLOR_MAP[face.color];
    const mainColor = parseInt(colors.main.replace('#', ''), 16);
    const darkColor = parseInt(colors.dark.replace('#', ''), 16);
    const lightColor = parseInt(colors.light.replace('#', ''), 16);

    if (face.rarity === DiceRarity.ADVANCED) {
      container.glow = this.add.rectangle(0, 0, this.DICE_SIZE + 8, this.DICE_SIZE + 8, lightColor, 0.3)
        .setStrokeStyle(2, lightColor);
      container.add(container.glow);

      this.tweens.add({
        targets: container.glow,
        scale: { from: 1, to: 1.1 },
        alpha: { from: 0.3, to: 0.6 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }

    container.background = this.createRoundedRect(0, 0, this.DICE_SIZE, this.DICE_SIZE, 8, mainColor, 1, darkColor, 3);

    container.valueText = this.add.text(0, 0, face.value.toString(), {
      fontSize: '24px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    container.add(container.background);
    container.add(container.valueText);

    if (face.effect) {
      container.effectText = this.add.text(0, this.DICE_SIZE / 2 + 8, face.effect, {
        fontSize: '10px',
        color: colors.light,
        fontWeight: 'bold'
      }).setOrigin(0.5);
      container.add(container.effectText);
      container.valueText.setY(-8);
    }

    container.setInteractive({ draggable: true });

    container.on('pointerover', () => {
      if (!container.isDragging) {
        this.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 150,
          ease: 'Power2.easeOut'
        });
      }
    });

    container.on('pointerout', () => {
      if (!container.isDragging) {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 150,
          ease: 'Power2.easeOut'
        });
      }
    });

    container.on('dragstart', () => {
      container.isDragging = true;
      container.setDepth(100);
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

    container.on('dragend', () => {
      container.isDragging = false;
      container.setDepth(1);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 100
      });

      if (!container.isInGrid || (container.gridRow === undefined && container.gridCol === undefined)) {
        this.tweens.add({
          targets: container,
          x: container.originalX,
          y: container.originalY,
          duration: 200,
          ease: 'Power2.easeOut'
        });
      }
    });

    return container;
  }

  private createDicePoolUI(): void {
    const poolY = this.forgeY + (this.isNarrowScreen ? this.layoutHeight * 0.4 : this.layoutHeight * 0.75);
    const poolStartX = this.forgeX + this.forgeWidth / 2 - (4 * (this.DICE_SIZE + 15)) / 2;

    this.dicePool.forEach((face, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = poolStartX + col * (this.DICE_SIZE + 15) + this.DICE_SIZE / 2;
      const y = poolY + row * (this.DICE_SIZE + 15) + this.DICE_SIZE / 2;

      const sprite = this.createDiceFace(face, x, y);
      sprite.originalX = x;
      sprite.originalY = y;
      this.poolSprites.push(sprite);
    });

    this.add.text(
      this.forgeX + this.forgeWidth / 2,
      poolY - 40,
      '🎲 骰子池',
      { fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }
    ).setOrigin(0.5);
  }

  private handleDrop(sprite: DiceFaceSprite, row: number, col: number): void {
    if (this.isBattleInProgress) return;
    if (this.forgeGrid[row][col] !== null) return;

    sprite.isInGrid = true;
    sprite.gridRow = row;
    sprite.gridCol = col;

    this.forgeGrid[row][col] = sprite.face;

    const poolIndex = this.poolSprites.indexOf(sprite);
    if (poolIndex > -1) {
      this.poolSprites.splice(poolIndex, 1);
      this.dicePool.splice(poolIndex, 1);
    }

    const gridTotalSize = this.GRID_SIZE * this.DICE_SIZE + (this.GRID_SIZE - 1) * this.GRID_GAP;
    const gridStartX = this.forgeX + (this.forgeWidth - gridTotalSize) / 2;
    const gridStartY = this.forgeY + (this.isNarrowScreen ? 120 : 150);
    const targetX = gridStartX + col * (this.DICE_SIZE + this.GRID_GAP) + this.DICE_SIZE / 2;
    const targetY = gridStartY + row * (this.DICE_SIZE + this.GRID_GAP) + this.DICE_SIZE / 2;

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

    let totalValue = 0;
    merge.positions.forEach(pos => {
      const face = this.forgeGrid[pos.row][pos.col];
      if (face) {
        totalValue += face.effectValue ?? face.value;
      }
    });
    const advancedValue = Math.ceil(totalValue / merge.positions.length) + 2;

    const centerPos = merge.positions[Math.floor(merge.positions.length / 2)];
    const centerSprite = this.forgeGridSprites[centerPos.row][centerPos.col];

    if (centerSprite) {
      this.cameras.main.shake(150, 0.005);

      this.createParticleBurst(centerSprite.x, centerSprite.y, merge.color);

      this.tweens.add({
        targets: merge.positions.map(p => this.forgeGridSprites[p.row][p.col]).filter(s => s !== null),
        scale: 1.3,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => {
          merge.positions.forEach(pos => {
            const sprite = this.forgeGridSprites[pos.row][pos.col];
            if (sprite) {
              sprite.destroy();
            }
            this.forgeGrid[pos.row][pos.col] = null;
            this.forgeGridSprites[pos.row][pos.col] = null;
          });

          const advancedFace = DiceSystem.createAdvancedFace(merge.color, advancedValue);
          this.forgeGrid[centerPos.row][centerPos.col] = advancedFace;

          const gridTotalSize = this.GRID_SIZE * this.DICE_SIZE + (this.GRID_SIZE - 1) * this.GRID_GAP;
          const gridStartX = this.forgeX + (this.forgeWidth - gridTotalSize) / 2;
          const gridStartY = this.forgeY + (this.isNarrowScreen ? 120 : 150);
          const x = gridStartX + centerPos.col * (this.DICE_SIZE + this.GRID_GAP) + this.DICE_SIZE / 2;
          const y = gridStartY + centerPos.row * (this.DICE_SIZE + this.GRID_GAP) + this.DICE_SIZE / 2;

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
            duration: 400,
            ease: 'Elastic.easeOut',
            onComplete: () => {
              this.processMerges(merges, index + 1);
            }
          });
        }
      });
    } else {
      this.processMerges(merges, index + 1);
    }
  }

  private createBattleArea(): void {
    const battleCenterX = this.battleX + this.battleWidth / 2;
    const battleTopY = this.battleY + (this.isNarrowScreen ? 60 : 80);

    const aiLabel = this.add.text(battleCenterX, battleTopY, '🤖 AI对手', {
      fontSize: '18px',
      color: '#e94560',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    const aiHPBg = this.add.rectangle(battleCenterX, battleTopY + 35, 200, 20, 0x333355).setOrigin(0.5);
    this.aiHPBar = this.add.rectangle(battleCenterX - 100, battleTopY + 35, 200, 20, 0xe94560).setOrigin(0, 0.5);
    this.aiHPText = this.add.text(battleCenterX, battleTopY + 35, '100/100', {
      fontSize: '12px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    const playerLabel = this.add.text(battleCenterX, battleTopY + 280, '👤 玩家', {
      fontSize: '18px',
      color: '#16c79a',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    const playerHPBg = this.add.rectangle(battleCenterX, battleTopY + 315, 200, 20, 0x333355).setOrigin(0.5);
    this.playerHPBar = this.add.rectangle(battleCenterX - 100, battleTopY + 315, 200, 20, 0x16c79a).setOrigin(0, 0.5);
    this.playerHPText = this.add.text(battleCenterX, battleTopY + 315, '100/100', {
      fontSize: '12px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    this.roundText = this.add.text(battleCenterX, battleTopY + 175, '回合 0', {
      fontSize: '20px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    this.createBattleDiceSlots();
  }

  private createBattleDiceSlots(): void {
    const battleCenterX = this.battleX + this.battleWidth / 2;
    const battleTopY = this.battleY + (this.isNarrowScreen ? 60 : 80);
    const diceSize = 50;
    const gap = 8;
    const totalWidth = 6 * diceSize + 5 * gap;
    const startX = battleCenterX - totalWidth / 2 + diceSize / 2;

    this.aiDice.forEach((_, index) => {
      const x = startX + index * (diceSize + gap);
      const y = battleTopY + 90;

      this.createRoundedRect(x, y, diceSize, diceSize, 6, 0x2a2a4a, 1, 0x3a3a6a, 2);
    });

    for (let i = this.aiDice.length; i < this.MAX_DICE; i++) {
      const x = startX + i * (diceSize + gap);
      const y = battleTopY + 90;

      this.createRoundedRect(x, y, diceSize, diceSize, 6, 0x222233, 0.5, 0x333344, 2);
    }

    for (let i = 0; i < this.MAX_DICE; i++) {
      const x = startX + i * (diceSize + gap);
      const y = battleTopY + 220;

      this.createRoundedRect(x, y, diceSize, diceSize, 6, 0x2a2a4a, 1, 0x3a3a6a, 2);
    }
  }

  private createBattleButton(): void {
    const buttonX = this.battleX + this.battleWidth / 2;
    const buttonY = this.battleY + (this.isNarrowScreen ? this.layoutHeight * 0.42 : this.layoutHeight * 0.85);

    this.battleButton = this.add.container(buttonX, buttonY);
    this.battleButton.setSize(160, 50);

    const buttonBg = this.createRoundedRect(0, 0, 160, 50, 10, 0x0f3460, 1, 0x16c79a, 3);
    this.battleButton.add(buttonBg);

    this.battleButtonText = this.add.text(0, 0, '开始战斗 ⚔', {
      fontSize: '18px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    this.battleButton.add(this.battleButtonText);

    this.battleButton.setInteractive({ useHandCursor: true });

    this.battleButton.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x16c79a, 1);
      buttonBg.lineStyle(3, 0xffffff, 1);
      const w = 160, h = 50, r = 10;
      buttonBg.beginPath();
      buttonBg.moveTo(-w / 2 + r, -h / 2);
      buttonBg.lineTo(w / 2 - r, -h / 2);
      buttonBg.arc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0);
      buttonBg.lineTo(w / 2, h / 2 - r);
      buttonBg.arc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2);
      buttonBg.lineTo(-w / 2 + r, h / 2);
      buttonBg.arc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI);
      buttonBg.lineTo(-w / 2, -h / 2 + r);
      buttonBg.arc(-w / 2 + r, -h / 2 + r, r, Math.PI, -Math.PI / 2);
      buttonBg.closePath();
      buttonBg.fillPath();
      buttonBg.strokePath();
    });

    this.battleButton.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x0f3460, 1);
      buttonBg.lineStyle(3, 0x16c79a, 1);
      const w = 160, h = 50, r = 10;
      buttonBg.beginPath();
      buttonBg.moveTo(-w / 2 + r, -h / 2);
      buttonBg.lineTo(w / 2 - r, -h / 2);
      buttonBg.arc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0);
      buttonBg.lineTo(w / 2, h / 2 - r);
      buttonBg.arc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2);
      buttonBg.lineTo(-w / 2 + r, h / 2);
      buttonBg.arc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI);
      buttonBg.lineTo(-w / 2, -h / 2 + r);
      buttonBg.arc(-w / 2 + r, -h / 2 + r, r, Math.PI, -Math.PI / 2);
      buttonBg.closePath();
      buttonBg.fillPath();
      buttonBg.strokePath();
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
    container.setSize(50, 50);

    const tint = isPlayer ? 0x16c79a : 0xe94560;
    container.background = this.createRoundedRect(0, 0, 50, 50, 6, 0x2a2a4a, 1, tint, 2);

    container.valueText = this.add.text(0, 0, '?', {
      fontSize: '20px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    container.add(container.background);
    container.add(container.valueText);

    return container;
  }

  private startBattle(): void {
    this.collectForgedDice();

    if (this.playerDice.length === 0) {
      this.showFloatingText(
        this.battleX + this.battleWidth / 2,
        this.battleY + this.layoutHeight * 0.5,
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

    const battleCenterX = this.battleX + this.battleWidth / 2;
    const battleTopY = this.battleY + (this.isNarrowScreen ? 60 : 80);
    const diceSize = 50;
    const gap = 8;
    const totalWidth = 6 * diceSize + 5 * gap;
    const startX = battleCenterX - totalWidth / 2 + diceSize / 2;

    this.aiDice.forEach((dice, index) => {
      const x = startX + index * (diceSize + gap);
      const y = battleTopY + 90;
      const battleDice = this.createBattleDice(dice, x, y, false);
      this.aiBattleDice.push(battleDice);
    });

    this.playerDice.forEach((dice, index) => {
      const x = startX + index * (diceSize + gap);
      const y = battleTopY + 220;
      const battleDice = this.createBattleDice(dice, x, y, true);
      this.playerBattleDice.push(battleDice);
    });
  }

  private animateDiceRoll(): void {
    const allDice = [...this.playerBattleDice, ...this.aiBattleDice];
    const duration = 1500;

    allDice.forEach((dice, index) => {
      const originalY = dice.y;
      const bounceHeight = 60;
      const stagger = index * 100;

      this.tweens.add({
        targets: dice,
        y: originalY - bounceHeight,
        duration: 300,
        delay: stagger,
        ease: 'Cubic.easeOut',
        yoyo: true,
        repeat: 3
      });

      this.tweens.add({
        targets: dice,
        angle: 720,
        duration: duration,
        delay: stagger,
        ease: 'Cubic.easeOut'
      });

      this.tweens.add({
        targets: dice,
        y: originalY - 10,
        duration: duration / 2,
        delay: stagger,
        ease: 'Bounce.easeOut',
        yoyo: true,
        hold: 100
      });
    });

    this.time.delayedCall(duration + 500, () => this.processBattleResults());
  }

  private processBattleResults(): void {
    const battle = DiceSystem.calculateBattle(this.playerDice, this.aiDice);

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

    this.time.delayedCall(500, () => {
      this.displayBattleNumbers(battle);
    });

    this.time.delayedCall(1000, () => {
      this.resolveBattle(battle);
    });
  }

  private updateBattleDiceDisplay(dice: BattleDice, face: DiceFace, value: number): void {
    const colors = DiceSystem.COLOR_MAP[face.color];
    const mainColor = parseInt(colors.main.replace('#', ''), 16);
    const darkColor = parseInt(colors.dark.replace('#', ''), 16);

    dice.resultFace = face;

    dice.background.clear();
    dice.background.fillStyle(mainColor, 1);
    dice.background.lineStyle(3, darkColor, 1);
    const w = 50, h = 50, r = 6;
    dice.background.beginPath();
    dice.background.moveTo(-w / 2 + r, -h / 2);
    dice.background.lineTo(w / 2 - r, -h / 2);
    dice.background.arc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0);
    dice.background.lineTo(w / 2, h / 2 - r);
    dice.background.arc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2);
    dice.background.lineTo(-w / 2 + r, h / 2);
    dice.background.arc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI);
    dice.background.lineTo(-w / 2, -h / 2 + r);
    dice.background.arc(-w / 2 + r, -h / 2 + r, r, Math.PI, -Math.PI / 2);
    dice.background.closePath();
    dice.background.fillPath();
    dice.background.strokePath();

    dice.valueText.setText(value.toString());
    dice.valueText.setColor('#ffffff');

    this.tweens.add({
      targets: dice,
      scale: 1.2,
      duration: 200,
      yoyo: true
    });
  }

  private displayBattleNumbers(battle: BattleResult): void {
    const battleCenterX = this.battleX + this.battleWidth / 2;
    const battleTopY = this.battleY + (this.isNarrowScreen ? 60 : 80);

    if (battle.playerDamage > 0) {
      this.showFloatingText(battleCenterX, battleTopY + 140, `攻击 +${battle.playerDamage}`, '#e94560');
    }
    if (battle.playerDefense > 0) {
      this.showFloatingText(battleCenterX - 60, battleTopY + 160, `防御 +${battle.playerDefense}`, '#0f3460');
    }
    if (battle.playerHeal > 0) {
      this.showFloatingText(battleCenterX + 60, battleTopY + 160, `治疗 +${battle.playerHeal}`, '#16c79a');
    }
  }

  private resolveBattle(battle: BattleResult): void {
    const result = DiceSystem.resolveBattle(this.playerHP, this.aiHP, battle);

    this.playerHP = result.newPlayerHP;
    this.aiHP = result.newAiHP;

    this.updateHPBar(this.playerHPBar, this.playerHPText, this.playerHP, '#16c79a', result.playerNetLoss > 0);
    this.updateHPBar(this.aiHPBar, this.aiHPText, this.aiHP, '#e94560', result.aiNetLoss > 0);

    this.time.delayedCall(800, () => {
      this.checkBattleEnd();
    });
  }

  private updateHPBar(bar: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, hp: number, _color: string, flash: boolean): void {
    const targetWidth = 200 * (hp / 100);

    this.tweens.add({
      targets: bar,
      width: targetWidth,
      duration: 500,
      ease: 'Power2.easeOut'
    });

    text.setText(`${hp}/100`);

    if (flash) {
      this.tweens.add({
        targets: bar,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          bar.setAlpha(1);
        }
      });
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const floating = this.add.text(x, y, text, {
      fontSize: '18px',
      color: color,
      fontWeight: 'bold'
    }).setOrigin(0.5).setAlpha(0).setDepth(50);

    this.tweens.add({
      targets: floating,
      alpha: 1,
      y: y - 40,
      duration: 500,
      ease: 'Power2.easeOut'
    });

    this.tweens.add({
      targets: floating,
      alpha: 0,
      y: y - 80,
      duration: 500,
      delay: 800,
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
      this.time.delayedCall(1000, () => {
        this.resetForRound();
      });
    } else {
      this.time.delayedCall(2000, () => {
        this.resetGame();
      });
    }
  }

  private showBattleResult(playerWon: boolean): void {
    const centerX = this.battleX + this.battleWidth / 2;
    const centerY = this.battleY + this.layoutHeight * 0.5;

    const overlay = this.add.rectangle(centerX, centerY, this.battleWidth, 300, 0x000000, 0.8);
    const resultText = this.add.text(centerX, centerY - 30, playerWon ? '🎉 胜利！' : '💀 失败...', {
      fontSize: '48px',
      color: playerWon ? '#16c79a' : '#e94560',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    const subText = this.add.text(centerX, centerY + 30, `回合数: ${this.currentRound}`, {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [overlay, resultText, subText],
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Power2.easeOut'
    });

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [overlay, resultText, subText],
        alpha: 0,
        duration: 300,
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

    if (this.aiDice.length < this.MAX_DICE && Math.random() > 0.5) {
      const newDice = DiceSystem.createAIDice(1);
      this.aiDice.push(...newDice);
    }

    this.isBattleInProgress = false;
    this.battleButton.setInteractive();
    this.battleButton.setAlpha(1);
    this.battleButtonText.setText('开始战斗 ⚔');

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

    const poolY = this.forgeY + (this.isNarrowScreen ? this.layoutHeight * 0.4 : this.layoutHeight * 0.75);
    const poolStartX = this.forgeX + this.forgeWidth / 2 - (4 * (this.DICE_SIZE + 15)) / 2;

    this.dicePool.forEach((face, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = poolStartX + col * (this.DICE_SIZE + 15) + this.DICE_SIZE / 2;
      const y = poolY + row * (this.DICE_SIZE + 15) + this.DICE_SIZE / 2;

      const sprite = this.createDiceFace(face, x, y);
      sprite.setScale(0);
      sprite.originalX = x;
      sprite.originalY = y;
      this.poolSprites.push(sprite);

      this.tweens.add({
        targets: sprite,
        scale: 1,
        duration: 300,
        delay: index * 50,
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

    this.playerHPBar.width = 200;
    this.aiHPBar.width = 200;
    this.playerHPText.setText('100/100');
    this.aiHPText.setText('100/100');
    this.roundText.setText('回合 0');

    this.battleButton.setInteractive();
    this.battleButton.setAlpha(1);
    this.battleButtonText.setText('开始战斗 ⚔');

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
    this.scale.on('resize', (_gameSize: Phaser.Structs.Size, _baseSize: Phaser.Structs.Size) => {
      // Handle resize if needed
    });
  }

  private createRoundedRect(x: number, y: number, width: number, height: number, radius: number, fillColor: number, fillAlpha = 1, strokeColor?: number, strokeWidth = 0): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.lineStyle(strokeWidth, strokeColor ?? fillColor, 1);

    const r = radius;
    const w = width;
    const h = height;

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

    if (strokeWidth > 0 && strokeColor !== undefined) {
      graphics.strokePath();
    }

    return graphics;
  }

  update(_time: number, _delta: number): void {
    // Animation updates handled by tweens
  }
}
