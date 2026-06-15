import Phaser from 'phaser';
import { MineController, PlayerId, GameStats, ItemType } from '../controllers/MineController';

const PANEL_WIDTH = 120;
const PANEL_RADIUS = 8;
const AVATAR_SIZE = 48;
const TIMER_BAR_WIDTH = 80;
const TIMER_BAR_HEIGHT = 4;
const P1_COLOR = '#e74c3c';
const P2_COLOR = '#3498db';
const BG_COLOR = 'rgba(26, 37, 44, 0.85)';
const STATS_CARD_RADIUS = 16;

export interface UIElements {
  leftPanel: Phaser.GameObjects.Container;
  rightPanel: Phaser.GameObjects.Container;
  statsOverlay?: Phaser.GameObjects.Container;
}

export class UIManager {
  private scene: Phaser.Scene;
  private controller: MineController;
  private elements!: UIElements;

  p1TimerBar: Phaser.GameObjects.Graphics | null = null;
  p2TimerBar: Phaser.GameObjects.Graphics | null = null;
  p1CountText: Phaser.GameObjects.Text | null = null;
  p2CountText: Phaser.GameObjects.Text | null = null;

  itemCardsP1: Map<ItemType, Phaser.GameObjects.Container> = new Map();
  itemCardsP2: Map<ItemType, Phaser.GameObjects.Container> = new Map();

  selectedItemP1: ItemType | null = null;
  selectedItemP2: ItemType | null = null;

  constructor(scene: Phaser.Scene, controller: MineController) {
    this.scene = scene;
    this.controller = controller;
  }

  createUI(boardX: number, boardY: number, boardWidth: number, boardHeight: number): void {
    const leftX = boardX - PANEL_WIDTH - 16;
    const rightX = boardX + boardWidth + 16;
    const centerY = boardY + boardHeight / 2;

    this.elements = {
      leftPanel: this.createPlayerPanel(leftX, centerY, 1),
      rightPanel: this.createPlayerPanel(rightX, centerY, 2),
    };
  }

  private createPlayerPanel(x: number, y: number, playerId: PlayerId): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(x, y);
    const height = 360;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a252c, 0.85);
    bg.lineStyle(1, 0x34495e, 0.6);
    bg.strokeRoundedRect(-PANEL_WIDTH / 2, -height / 2, PANEL_WIDTH, height, PANEL_RADIUS);
    bg.fillRoundedRect(-PANEL_WIDTH / 2, -height / 2, PANEL_WIDTH, height, PANEL_RADIUS);
    panel.add(bg);

    const color = playerId === 1 ? P1_COLOR : P2_COLOR;
    const avatarBg = this.scene.add.graphics();
    avatarBg.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    avatarBg.fillCircle(0, -height / 2 + 40, AVATAR_SIZE / 2);
    panel.add(avatarBg);

    const avatarText = this.scene.add.text(0, -height / 2 + 40, `P${playerId}`, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    panel.add(avatarText);

    const nameText = this.scene.add.text(0, -height / 2 + 80, `玩家 ${playerId}`, {
      fontSize: '14px',
      color: '#ecf0f1',
    }).setOrigin(0.5);
    panel.add(nameText);

    const countLabel = this.scene.add.text(0, -height / 2 + 105, '已翻开', {
      fontSize: '11px',
      color: '#95a5a6',
    }).setOrigin(0.5);
    panel.add(countLabel);

    const countText = this.scene.add.text(0, -height / 2 + 125, '0', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    panel.add(countText);

    if (playerId === 1) {
      this.p1CountText = countText;
    } else {
      this.p2CountText = countText;
    }

    const timerLabel = this.scene.add.text(0, -height / 2 + 155, '剩余时间', {
      fontSize: '11px',
      color: '#95a5a6',
    }).setOrigin(0.5);
    panel.add(timerLabel);

    const timerBarBg = this.scene.add.graphics();
    timerBarBg.fillStyle(0x34495e, 0.5);
    timerBarBg.fillRect(-TIMER_BAR_WIDTH / 2, -height / 2 + 175, TIMER_BAR_WIDTH, TIMER_BAR_HEIGHT);
    panel.add(timerBarBg);

    const timerBar = this.scene.add.graphics();
    timerBar.fillStyle(0x2ecc71, 1);
    timerBar.fillRect(-TIMER_BAR_WIDTH / 2, -height / 2 + 175, TIMER_BAR_WIDTH, TIMER_BAR_HEIGHT);
    panel.add(timerBar);

    if (playerId === 1) {
      this.p1TimerBar = timerBar;
    } else {
      this.p2TimerBar = timerBar;
    }

    const shieldIcon = this.scene.add.graphics();
    shieldIcon.visible = false;
    shieldIcon.fillStyle(0x27ae60, 1);
    shieldIcon.fillCircle(-PANEL_WIDTH / 2 + 18, -height / 2 + 190, 8);
    panel.add(shieldIcon);

    const shieldText = this.scene.add.text(-PANEL_WIDTH / 2 + 18, -height / 2 + 190, '盾', {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    shieldText.visible = false;
    panel.add(shieldText);

    if (playerId === 1) {
      (panel as any).shieldIcon = shieldIcon;
      (panel as any).shieldText = shieldText;
    } else {
      (panel as any).shieldIcon = shieldIcon;
      (panel as any).shieldText = shieldText;
    }

    const itemsLabel = this.scene.add.text(0, -height / 2 + 215, '道具', {
      fontSize: '11px',
      color: '#95a5a6',
    }).setOrigin(0.5);
    panel.add(itemsLabel);

    const cardWidth = PANEL_WIDTH - 24;
    const cardHeight = 42;
    const startY = -height / 2 + 240;
    const spacing = 8;

    const items: ItemType[] = ['radar', 'shield', 'freeze'];
    const itemNames: Record<ItemType, string> = {
      radar: '雷达',
      shield: '护盾',
      freeze: '冻结',
    };
    const itemEmojis: Record<ItemType, string> = {
      radar: '📡',
      shield: '🛡️',
      freeze: '❄️',
    };

    items.forEach((itemType, i) => {
      const cardY = startY + i * (cardHeight + spacing);
      const card = this.createItemCard(0, cardY, cardWidth, cardHeight, itemType, itemNames[itemType], itemEmojis[itemType]);
      panel.add(card);

      if (playerId === 1) {
        this.itemCardsP1.set(itemType, card);
      } else {
        this.itemCardsP2.set(itemType, card);
      }
    });

    const hintText = this.scene.add.text(0, height / 2 - 30, playerId === 1 ? 'WASD 移动\n空格 点击\nQ 使用道具' : '方向键 移动\n回车 点击\nO 使用道具', {
      fontSize: '10px',
      color: '#7f8c8d',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    panel.add(hintText);

    return panel;
  }

  private createItemCard(x: number, y: number, width: number, height: number, type: ItemType, name: string, icon: string): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);
    card.setSize(width, height);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.lineStyle(1, 0x34495e, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    card.add(bg);

    const iconText = this.scene.add.text(-width / 2 + 14, 0, icon, {
      fontSize: '18px',
    }).setOrigin(0.5);
    card.add(iconText);

    const nameText = this.scene.add.text(-width / 2 + 32, -6, name, {
      fontSize: '12px',
      color: '#bdc3c7',
    }).setOrigin(0, 0.5);
    card.add(nameText);

    const countBg = this.scene.add.graphics();
    countBg.fillStyle(0x1a252c, 1);
    countBg.fillCircle(width / 2 - 10, 0, 8);
    card.add(countBg);

    const countText = this.scene.add.text(width / 2 - 10, 0, '0', {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5);
    card.add(countText);

    (card as any).bg = bg;
    (card as any).countText = countText;
    (card as any).nameText = nameText;
    (card as any).itemType = type;

    card.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

    card.on('pointerover', () => {
      this.scene.tweens.add({
        targets: card,
        scale: 1.1,
        duration: 150,
      });
      (card as any).nameText.setColor('#ffffff');
    });

    card.on('pointerout', () => {
      this.scene.tweens.add({
        targets: card,
        scale: 1.0,
        duration: 150,
      });
      (card as any).nameText.setColor('#bdc3c7');
    });

    return card;
  }

  updateTimer(playerId: PlayerId, remaining: number, total: number): void {
    const bar = playerId === 1 ? this.p1TimerBar : this.p2TimerBar;
    if (!bar) return;

    const ratio = Math.max(0, remaining / total);
    const width = TIMER_BAR_WIDTH * ratio;

    bar.clear();

    let color: number;
    if (ratio > 0.5) {
      color = 0x2ecc71;
    } else if (ratio > 0.25) {
      color = 0xf39c12;
    } else {
      color = 0xe74c3c;
    }

    bar.fillStyle(color, 1);
    bar.fillRect(-TIMER_BAR_WIDTH / 2, 0, width, TIMER_BAR_HEIGHT);
  }

  updatePlayerCounts(): void {
    const p1 = this.controller.getPlayer(1);
    const p2 = this.controller.getPlayer(2);

    if (this.p1CountText) {
      this.p1CountText.setText(p1.revealedSafe.toString());
    }
    if (this.p2CountText) {
      this.p2CountText.setText(p2.revealedSafe.toString());
    }
  }

  updateItemCards(): void {
    const p1 = this.controller.getPlayer(1);
    const p2 = this.controller.getPlayer(2);

    this.itemCardsP1.forEach((card, type) => {
      const count = p1.inventory.get(type) || 0;
      const countText = (card as any).countText as Phaser.GameObjects.Text;
      countText.setText(count.toString());
      const bg = (card as any).bg as Phaser.GameObjects.Graphics;
      bg.clear();
      if (this.selectedItemP1 === type && count > 0) {
        bg.fillStyle(0x2980b9, 1);
      } else {
        bg.fillStyle(0x2c3e50, 1);
      }
      bg.lineStyle(2, this.selectedItemP1 === type && count > 0 ? 0x3498db : 0x34495e, 1);
      bg.strokeRoundedRect(-48, -21, 96, 42, 6);
      bg.fillRoundedRect(-48, -21, 96, 42, 6);
      card.setAlpha(count > 0 ? 1 : 0.4);
    });

    this.itemCardsP2.forEach((card, type) => {
      const count = p2.inventory.get(type) || 0;
      const countText = (card as any).countText as Phaser.GameObjects.Text;
      countText.setText(count.toString());
      const bg = (card as any).bg as Phaser.GameObjects.Graphics;
      bg.clear();
      if (this.selectedItemP2 === type && count > 0) {
        bg.fillStyle(0x2980b9, 1);
      } else {
        bg.fillStyle(0x2c3e50, 1);
      }
      bg.lineStyle(2, this.selectedItemP2 === type && count > 0 ? 0xe74c3c : 0x34495e, 1);
      bg.strokeRoundedRect(-48, -21, 96, 42, 6);
      bg.fillRoundedRect(-48, -21, 96, 42, 6);
      card.setAlpha(count > 0 ? 1 : 0.4);
    });

    const p1ShieldIcon = (this.elements.leftPanel as any).shieldIcon;
    const p1ShieldText = (this.elements.leftPanel as any).shieldText;
    if (p1ShieldIcon && p1ShieldText) {
      p1ShieldIcon.visible = p1.hasShield;
      p1ShieldText.visible = p1.hasShield;
    }

    const p2ShieldIcon = (this.elements.rightPanel as any).shieldIcon;
    const p2ShieldText = (this.elements.rightPanel as any).shieldText;
    if (p2ShieldIcon && p2ShieldText) {
      p2ShieldIcon.visible = p2.hasShield;
      p2ShieldText.visible = p2.hasShield;
    }
  }

  setSelectedItem(playerId: PlayerId, itemType: ItemType | null): void {
    if (playerId === 1) {
      this.selectedItemP1 = itemType;
    } else {
      this.selectedItemP2 = itemType;
    }
    this.updateItemCards();
  }

  cycleSelectedItem(playerId: PlayerId, forward: boolean = true): ItemType | null {
    const player = this.controller.getPlayer(playerId);
    const items: ItemType[] = ['radar', 'shield', 'freeze'];
    const availableItems = items.filter(t => (player.inventory.get(t) || 0) > 0);

    if (availableItems.length === 0) return null;

    let currentIndex = -1;
    const current = playerId === 1 ? this.selectedItemP1 : this.selectedItemP2;
    if (current) {
      currentIndex = availableItems.indexOf(current);
    }

    let nextIndex: number;
    if (forward) {
      nextIndex = (currentIndex + 1) % availableItems.length;
    } else {
      nextIndex = currentIndex <= 0 ? availableItems.length - 1 : currentIndex - 1;
    }

    const nextItem = availableItems[nextIndex];
    this.setSelectedItem(playerId, nextItem);
    return nextItem;
  }

  getSelectedItem(playerId: PlayerId): ItemType | null {
    return playerId === 1 ? this.selectedItemP1 : this.selectedItemP2;
  }

  showStatsPanel(stats: GameStats, onClose: () => void): void {
    if (this.elements.statsOverlay) {
      this.elements.statsOverlay.destroy();
    }

    const overlay = this.scene.add.container(this.scene.scale.width / 2, this.scene.scale.height / 2);
    overlay.setDepth(1000);

    const maskBg = this.scene.add.graphics();
    maskBg.fillStyle(0x000000, 0.65);
    maskBg.fillRect(-this.scene.scale.width / 2, -this.scene.scale.height / 2, this.scene.scale.width, this.scene.scale.height);
    maskBg.setInteractive(new Phaser.Geom.Rectangle(-this.scene.scale.width / 2, -this.scene.scale.height / 2, this.scene.scale.width, this.scene.scale.height), Phaser.Geom.Rectangle.Contains);
    maskBg.on('pointerdown', () => {
      this.hideStatsPanel();
      onClose();
    });
    overlay.add(maskBg);

    const cardWidth = 420;
    const cardHeight = 380;

    const cardBg = this.scene.add.graphics();
    this.drawCheckerboardBg(cardBg, cardWidth, cardHeight);
    cardBg.lineStyle(1, 0x34495e, 0.8);
    cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, STATS_CARD_RADIUS);
    overlay.add(cardBg);

    const titleY = -cardHeight / 2 + 40;
    let titleText = '游戏结束';
    let titleColor = '#f1c40f';
    if (stats.winner === 1) {
      titleText = '🏆 玩家 1 获胜！';
      titleColor = P1_COLOR;
    } else if (stats.winner === 2) {
      titleText = '🏆 玩家 2 获胜！';
      titleColor = P2_COLOR;
    } else {
      titleText = '🤝 平局！';
      titleColor = '#f1c40f';
    }

    const title = this.scene.add.text(0, titleY, titleText, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: titleColor,
    }).setOrigin(0.5);
    overlay.add(title);

    const statsStartY = -cardHeight / 2 + 90;
    const rowHeight = 36;
    const colX = [-140, 0, 140];

    const headers = ['', '玩家 1', '玩家 2'];
    headers.forEach((h, i) => {
      const color = i === 1 ? P1_COLOR : i === 2 ? P2_COLOR : '#95a5a6';
      const headerText = this.scene.add.text(colX[i], statsStartY, h, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: color,
      }).setOrigin(0.5);
      overlay.add(headerText);
    });

    const statsRows = [
      { label: '安全格子', p1: stats.p1RevealedSafe, p2: stats.p2RevealedSafe },
      { label: '踩雷数', p1: stats.p1RevealedMines, p2: stats.p2RevealedMines },
      { label: '使用道具', p1: stats.p1ItemsUsed, p2: stats.p2ItemsUsed },
    ];

    statsRows.forEach((row, i) => {
      const y = statsStartY + 30 + (i + 1) * rowHeight;
      const label = this.scene.add.text(colX[0], y, row.label, {
        fontSize: '13px',
        color: '#bdc3c7',
      }).setOrigin(0.5);
      overlay.add(label);

      const v1 = this.scene.add.text(colX[1], y, row.p1.toString(), {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ecf0f1',
      }).setOrigin(0.5);
      overlay.add(v1);

      const v2 = this.scene.add.text(colX[2], y, row.p2.toString(), {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ecf0f1',
      }).setOrigin(0.5);
      overlay.add(v2);
    });

    const totalTurnsY = statsStartY + 30 + (statsRows.length + 1) * rowHeight + 10;
    const turnsText = this.scene.add.text(0, totalTurnsY, `总回合数: ${stats.totalTurns}`, {
      fontSize: '14px',
      color: '#95a5a6',
    }).setOrigin(0.5);
    overlay.add(turnsText);

    const restartBtnY = cardHeight / 2 - 50;
    const btnWidth = 160;
    const btnHeight = 44;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x3498db, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, restartBtnY - btnHeight / 2, btnWidth, btnHeight, 8);
    btnBg.setInteractive(new Phaser.Geom.Rectangle(-btnWidth / 2, restartBtnY - btnHeight / 2, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
    btnBg.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2980b9, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, restartBtnY - btnHeight / 2, btnWidth, btnHeight, 8);
    });
    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x3498db, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, restartBtnY - btnHeight / 2, btnWidth, btnHeight, 8);
    });
    btnBg.on('pointerdown', () => {
      this.hideStatsPanel();
      onClose();
    });
    overlay.add(btnBg);

    const btnText = this.scene.add.text(0, restartBtnY, '再来一局', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    overlay.add(btnText);

    overlay.y = this.scene.scale.height + cardHeight / 2;
    this.scene.tweens.add({
      targets: overlay,
      y: this.scene.scale.height / 2,
      duration: 400,
      ease: 'Cubic.easeOut',
    });

    this.elements.statsOverlay = overlay;
  }

  private drawCheckerboardBg(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const cellSize = 20;
    const halfW = width / 2;
    const halfH = height / 2;

    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -halfW + c * cellSize;
        const y = -halfH + r * cellSize;
        if ((r + c) % 2 === 0) {
          graphics.fillStyle(0xffffff, 0.08);
        } else {
          graphics.fillStyle(0xecf0f1, 0.05);
        }
        graphics.fillRect(x, y, cellSize, cellSize);
      }
    }

    const mask = this.scene.make.graphics({});
    mask.fillRoundedRect(-halfW, -halfH, width, height, STATS_CARD_RADIUS);
    graphics.mask = new Phaser.Display.Masks.GeometryMask(this.scene, mask);
  }

  hideStatsPanel(): void {
    if (this.elements.statsOverlay) {
      this.elements.statsOverlay.destroy();
      this.elements.statsOverlay = undefined;
    }
  }

  updatePositions(boardX: number, boardY: number, boardWidth: number, boardHeight: number): void {
    const leftX = boardX - PANEL_WIDTH - 16;
    const rightX = boardX + boardWidth + 16;
    const centerY = boardY + boardHeight / 2;

    this.elements.leftPanel.setPosition(leftX, centerY);
    this.elements.rightPanel.setPosition(rightX, centerY);

    if (this.elements.statsOverlay) {
      this.elements.statsOverlay.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    }
  }
}
