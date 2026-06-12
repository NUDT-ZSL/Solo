import Phaser from 'phaser';
import type { SoundCard, PlayerState } from '../data/CardDeck';
import { CardType } from '../data/CardDeck';

export interface GameStats {
  totalWins: number;
  totalRounds: number;
  maxCombo: number;
}

export type UIState = 'menu' | 'playing' | 'result' | 'stats';

export class UIManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private cardSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  private aiHpBar!: Phaser.GameObjects.Graphics;
  private aiHpText!: Phaser.GameObjects.Text;
  private playerEnergySlots: Phaser.GameObjects.Graphics[] = [];
  private aiEnergySlots: Phaser.GameObjects.Graphics[] = [];
  private turnIndicator!: Phaser.GameObjects.Text;
  private menuContainer!: Phaser.GameObjects.Container;
  private resultContainer!: Phaser.GameObjects.Container;
  private statsContainer!: Phaser.GameObjects.Container;
  private state: UIState = 'menu';
  private onStartGame!: () => void;
  private onCardPlay!: (cardId: string) => void;
  private onBackToMenu!: () => void;
  private onShowStats!: () => void;
  private playerShieldText!: Phaser.GameObjects.Text;
  private aiShieldText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);
  }

  setCallbacks(callbacks: {
    onStartGame: () => void;
    onCardPlay: (cardId: string) => void;
    onBackToMenu: () => void;
    onShowStats: () => void;
  }): void {
    this.onStartGame = callbacks.onStartGame;
    this.onCardPlay = callbacks.onCardPlay;
    this.onBackToMenu = callbacks.onBackToMenu;
    this.onShowStats = callbacks.onShowStats;
  }

  loadStats(): GameStats {
    try {
      const saved = localStorage.getItem('echocaster_stats');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return { totalWins: 0, totalRounds: 0, maxCombo: 0 };
  }

  saveStats(stats: GameStats): void {
    try {
      localStorage.setItem('echocaster_stats', JSON.stringify(stats));
    } catch {
      // ignore
    }
  }

  showMenu(): void {
    this.state = 'menu';
    this.clearAll();
    this.createMenu();
  }

  showBattle(): void {
    this.state = 'playing';
    this.clearAll();
    this.createBattleUI();
  }

  showResult(playerWon: boolean, rounds: number, maxCombo: number): void {
    this.state = 'result';
    this.createResultScreen(playerWon, rounds, maxCombo);
  }

  showStatsScreen(): void {
    this.state = 'stats';
    this.clearAll();
    this.createStatsScreen();
  }

  private clearAll(): void {
    this.container.removeAll(true);
    this.cardSprites.clear();
    this.playerEnergySlots = [];
    this.aiEnergySlots = [];
  }

  private createMenu(): void {
    const { width, height } = this.scene.scale;

    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(0x0B0B2A, 0x0B0B2A, 0x1A1A4E, 0x1A1A4E, 1);
    bg.fillRect(0, 0, width, height);
    this.container.add(bg);

    this.createNebulaParticles();

    const title = this.scene.add.text(width / 2, height * 0.28, 'ECHOCASTER', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#a78bfa',
      stroke: '#7c3aed',
      strokeThickness: 4
    });
    title.setOrigin(0.5);
    title.setShadow(0, 0, 20, 0x7c3aed, true, true);
    this.container.add(title);

    this.scene.tweens.add({
      targets: title,
      scale: { from: 0.98, to: 1.02 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const subtitle = this.scene.add.text(width / 2, height * 0.36, '声波卡牌对战', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#c4b5fd'
    });
    subtitle.setOrigin(0.5);
    this.container.add(subtitle);

    const startBtn = this.createButton(width / 2, height * 0.52, '开始游戏', 0x7c3aed);
    startBtn.on('pointerup', () => this.onStartGame());

    const statsBtn = this.createButton(width / 2, height * 0.64, '战绩查看', 0x4338ca);
    statsBtn.on('pointerup', () => this.onShowStats());

    const stats = this.loadStats();
    const statsLabel = this.scene.add.text(width / 2, height * 0.8,
      `总胜场: ${stats.totalWins}  |  总回合数: ${stats.totalRounds}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#818cf8'
    });
    statsLabel.setOrigin(0.5);
    this.container.add(statsLabel);
  }

  private createNebulaParticles(): void {
    const { width, height } = this.scene.scale;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 2 + Math.random() * 4;
      const particle = this.scene.add.circle(x, y, size, 0x6366f1, 0.3 + Math.random() * 0.3);
      this.container.add(particle);
      this.scene.tweens.add({
        targets: particle,
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 100,
        alpha: { from: 0.2, to: 0.6 },
        duration: 4000 + Math.random() * 6000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createButton(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const btnContainer = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, 240, 60, color, 0.9);
    bg.setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5);

    btnContainer.add([bg, label]);
    this.container.add(btnContainer);

    bg.on('pointerover', () => {
      this.scene.tweens.add({
        targets: btnContainer,
        scale: 1.05,
        duration: 150,
        ease: 'Power2'
      });
      bg.setFillStyle(color, 1);
    });

    bg.on('pointerout', () => {
      this.scene.tweens.add({
        targets: btnContainer,
        scale: 1,
        duration: 150,
        ease: 'Power2'
      });
      bg.setFillStyle(color, 0.9);
    });

    return btnContainer;
  }

  private createBattleUI(): void {
    const { width, height } = this.scene.scale;

    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(0x0B0B2A, 0x0B0B2A, 0x1A1A4E, 0x1A1A4E, 1);
    bg.fillRect(0, 0, width, height);
    this.container.add(bg);

    this.createBattleNebula();

    this.aiHpBar = this.scene.add.graphics();
    this.aiHpText = this.scene.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '16px', color: '#fff' });
    this.container.add([this.aiHpBar, this.aiHpText]);

    const aiLabel = this.scene.add.text(width / 2 - 300, 60, 'AI对手', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#f0abfc',
      fontStyle: 'bold'
    });
    this.container.add(aiLabel);

    this.createAIEnergySlots();

    this.aiShieldText = this.scene.add.text(width / 2 + 200, 95, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#60a5fa'
    });
    this.container.add(this.aiShieldText);

    this.playerHpBar = this.scene.add.graphics();
    this.playerHpText = this.scene.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '16px', color: '#fff' });
    this.container.add([this.playerHpBar, this.playerHpText]);

    const playerLabel = this.scene.add.text(width / 2 - 300, height - 180, '玩家', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#86efac',
      fontStyle: 'bold'
    });
    this.container.add(playerLabel);

    this.createPlayerEnergySlots();

    this.playerShieldText = this.scene.add.text(width / 2 + 200, height - 145, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#60a5fa'
    });
    this.container.add(this.playerShieldText);

    this.turnIndicator = this.scene.add.text(width / 2, height / 2, '', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#fde68a',
      fontStyle: 'bold'
    });
    this.turnIndicator.setOrigin(0.5);
    this.turnIndicator.setAlpha(0);
    this.container.add(this.turnIndicator);
  }

  private createBattleNebula(): void {
    const { width, height } = this.scene.scale;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = height * 0.3 + Math.random() * height * 0.35;
      const size = 1.5 + Math.random() * 3;
      const particle = this.scene.add.circle(x, y, size, 0x4338ca, 0.25 + Math.random() * 0.25);
      this.container.add(particle);
      this.scene.tweens.add({
        targets: particle,
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        alpha: { from: 0.15, to: 0.5 },
        duration: 5000 + Math.random() * 5000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createPlayerEnergySlots(): void {
    const { width, height } = this.scene.scale;
    const startX = width / 2 - 140;
    const y = height - 140;
    for (let i = 0; i < 5; i++) {
      const slot = this.scene.add.graphics();
      slot.fillStyle(0x1e1b4b, 1);
      slot.fillRoundedRect(startX + i * 60, y, 50, 24, 6);
      slot.lineStyle(2, 0x4f46e5, 0.6);
      slot.strokeRoundedRect(startX + i * 60, y, 50, 24, 6);
      this.container.add(slot);
      this.playerEnergySlots.push(slot);
    }
    const label = this.scene.add.text(startX - 70, y + 4, '能量', {
      fontFamily: 'Arial', fontSize: '16px', color: '#a5b4fc'
    });
    this.container.add(label);
  }

  private createAIEnergySlots(): void {
    const { width } = this.scene.scale;
    const startX = width / 2 - 140;
    const y = 90;
    for (let i = 0; i < 5; i++) {
      const slot = this.scene.add.graphics();
      slot.fillStyle(0x1e1b4b, 1);
      slot.fillRoundedRect(startX + i * 60, y, 50, 24, 6);
      slot.lineStyle(2, 0x9333ea, 0.6);
      slot.strokeRoundedRect(startX + i * 60, y, 50, 24, 6);
      this.container.add(slot);
      this.aiEnergySlots.push(slot);
    }
    const label = this.scene.add.text(startX - 70, y + 4, '能量', {
      fontFamily: 'Arial', fontSize: '16px', color: '#e879f9'
    });
    this.container.add(label);
  }

  updatePlayerState(state: PlayerState): void {
    this.drawHpBar(this.playerHpBar, this.playerHpText, state, this.scene.scale.width / 2 - 300, this.scene.scale.height - 175, 0x22c55e, 0x86efac);
    this.drawEnergySlots(this.playerEnergySlots, state.energy, 0x6366f1);
    this.playerShieldText.setText(state.shield > 0 ? `护盾: ${state.shield}` : '');
  }

  updateAIState(state: PlayerState): void {
    this.drawHpBar(this.aiHpBar, this.aiHpText, state, this.scene.scale.width / 2 - 300, 65, 0xa855f7, 0xe879f9);
    this.drawEnergySlots(this.aiEnergySlots, state.energy, 0x9333ea);
    this.aiShieldText.setText(state.shield > 0 ? `护盾: ${state.shield}` : '');
  }

  private drawHpBar(graphics: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text,
    state: PlayerState, x: number, y: number, color1: number, color2: number): void {
    graphics.clear();
    const barWidth = 400;
    const barHeight = 22;
    const ratio = Math.max(0, state.hp) / state.maxHp;

    graphics.fillStyle(0x1e1b4b, 1);
    graphics.fillRoundedRect(x, y, barWidth, barHeight, 8);

    let fillColor = color1;
    if (ratio < 0.35) {
      fillColor = 0xef4444;
    }
    const fillWidth = Math.max(0, barWidth * ratio);
    graphics.fillGradientStyle(fillColor, fillColor, color2, color2, 1);
    graphics.fillRoundedRect(x, y, fillWidth, barHeight, 8);

    graphics.lineStyle(2, 0xffffff, 0.2);
    graphics.strokeRoundedRect(x, y, barWidth, barHeight, 8);

    text.setPosition(x + barWidth / 2, y + 11);
    text.setText(`${Math.max(0, state.hp)} / ${state.maxHp}`);
    text.setOrigin(0.5);
    text.setFontStyle('bold');

    if (ratio < 0.35) {
      text.setColor('#fecaca');
      graphics.setAlpha(1);
      if (!this.scene.tweens.isTweening(graphics)) {
        this.scene.tweens.add({
          targets: graphics,
          alpha: { from: 0.6, to: 1 },
          duration: 500,
          yoyo: true,
          repeat: -1
        });
      }
    } else {
      text.setColor('#ffffff');
      this.scene.tweens.killTweensOf(graphics);
      graphics.setAlpha(1);
    }
  }

  private drawEnergySlots(slots: Phaser.GameObjects.Graphics[], energy: number, color: number): void {
    slots.forEach((slot, i) => {
      slot.clear();
      const x = 0, y = 0;
      slot.fillStyle(0x1e1b4b, 1);
      slot.fillRoundedRect(x, y, 50, 24, 6);
      if (i < energy) {
        slot.fillGradientStyle(color, color, 0xffffff, color, 0.9);
        slot.fillRoundedRect(x + 3, y + 3, 44, 18, 4);
      }
      slot.lineStyle(2, color, 0.6);
      slot.strokeRoundedRect(x, y, 50, 24, 6);
    });
  }

  flashPlayerEnergyLoss(amount: number): void {
    const slots = this.playerEnergySlots.slice(0, amount);
    slots.forEach((slot, i) => {
      this.scene.tweens.add({
        targets: slot,
        alpha: { from: 1, to: 0.2, duration: 80 },
        yoyo: true,
        repeat: 3,
        delay: i * 80
      });
    });
  }

  flashAIEnergyLoss(amount: number): void {
    const slots = this.aiEnergySlots.slice(0, amount);
    slots.forEach((slot, i) => {
      this.scene.tweens.add({
        targets: slot,
        alpha: { from: 1, to: 0.2, duration: 80 },
        yoyo: true,
        repeat: 3,
        delay: i * 80
      });
    });
  }

  showTurnIndicator(text: string, duration: number = 1500): void {
    this.turnIndicator.setText(text);
    this.turnIndicator.setAlpha(0);
    this.scene.tweens.add({
      targets: this.turnIndicator,
      alpha: { from: 0, to: 1, duration: 300 },
      hold: duration - 600,
      alpha2: { from: 1, to: 0, duration: 300 }
    });
  }

  renderHand(hand: SoundCard[], playerEnergy: number, canPlay: boolean): void {
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const baseY = height - 80;

    this.cardSprites.forEach(sprite => sprite.destroy());
    this.cardSprites.clear();

    const count = hand.length;
    const spread = Math.min(count * 30, 160);

    hand.forEach((card, index) => {
      const offset = count === 1 ? 0 : -spread + (index * (spread * 2) / (count - 1));
      const angle = offset * 0.15;
      const yOffset = Math.abs(offset) * 0.08;
      const cardSprite = this.createCard(card, centerX + offset, baseY + yOffset, angle, canPlay && playerEnergy >= card.energyCost);
      this.cardSprites.set(card.id, cardSprite);
    });
  }

  private createCard(card: SoundCard, x: number, y: number, rotation: number, enabled: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setRotation(Phaser.Math.DegToRad(rotation));
    container.setSize(120, 170);

    const cardW = 120, cardH = 170;

    const bg = this.scene.add.graphics();
    const borderColor = enabled ? 0xffffff : 0x555555;
    bg.fillStyle(card.color, enabled ? 0.9 : 0.5);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    bg.lineStyle(3, borderColor, enabled ? 0.7 : 0.3);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);

    const innerGlow = this.scene.add.graphics();
    innerGlow.fillStyle(0xffffff, 0.1);
    innerGlow.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12, 8);

    const energyBg = this.scene.add.circle(-cardW / 2 + 18, -cardH / 2 + 18, 16, 0x1e1b4b, 0.9);
    energyBg.setStrokeStyle(2, card.color, 0.8);
    const energyText = this.scene.add.text(-cardW / 2 + 18, -cardH / 2 + 18, String(card.energyCost), {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: enabled ? '#fde047' : '#6b7280',
      fontStyle: 'bold'
    });
    energyText.setOrigin(0.5);

    const icon = this.createCardIcon(card, 0, -15);

    const nameText = this.scene.add.text(0, 30, card.name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: enabled ? '#ffffff' : '#9ca3af',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: cardW - 16 }
    });
    nameText.setOrigin(0.5);

    const typeLabel = this.getCardTypeLabel(card.type);
    const typeText = this.scene.add.text(0, 55, typeLabel, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: enabled ? '#fef3c7' : '#6b7280'
    });
    typeText.setOrigin(0.5);

    const valueText = this.scene.add.text(0, 70, `值: ${card.value}`, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: enabled ? '#e5e7eb' : '#6b7280'
    });
    valueText.setOrigin(0.5);

    container.add([bg, innerGlow, energyBg, energyText, icon, nameText, typeText, valueText]);

    if (enabled) {
      container.setSize(cardW, cardH);
      container.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH), Phaser.Geom.Rectangle.Contains);
      container.on('pointerover', () => {
        this.scene.tweens.add({
          targets: container,
          y: y - 30,
          scale: 1.1,
          duration: 200,
          ease: 'Back.easeOut'
        });
        container.setDepth(200);
      });
      container.on('pointerout', () => {
        this.scene.tweens.add({
          targets: container,
          y: y,
          scale: 1,
          duration: 200,
          ease: 'Power2'
        });
        container.setDepth(100);
      });
      container.on('pointerup', () => {
        this.onCardPlay(card.id);
      });
    }

    this.container.add(container);
    return container;
  }

  private createCardIcon(card: SoundCard, x: number, y: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    const amplitude = 14;
    const freq = card.frequency / 200;
    for (let i = -30; i <= 30; i++) {
      let py: number;
      if (card.waveform === 'sine') {
        py = Math.sin((i / 30) * Math.PI * freq) * amplitude;
      } else if (card.waveform === 'square') {
        py = (Math.sin((i / 30) * Math.PI * freq) >= 0 ? 1 : -1) * amplitude;
      } else {
        const t = ((i / 30) * freq) % 1;
        py = (2 * t - 1) * amplitude;
      }
      if (i === -30) g.moveTo(x + i, y + py);
      else g.lineTo(x + i, y + py);
    }
    g.strokePath();
    return g;
  }

  private getCardTypeLabel(type: CardType): string {
    switch (type) {
      case CardType.ATTACK: return '⚔ 攻击';
      case CardType.DEFENSE: return '🛡 防御';
      case CardType.DISRUPT: return '⚡ 干扰';
    }
  }

  animateCardPlay(cardId: string, isPlayer: boolean): void {
    const card = this.cardSprites.get(cardId);
    if (!card) return;
    const targetY = isPlayer ? this.scene.scale.height / 2 : this.scene.scale.height / 2;
    this.scene.tweens.add({
      targets: card,
      y: targetY,
      scale: 0.5,
      alpha: 0,
      duration: 400,
      ease: 'Power2.easeIn',
      onComplete: () => {
        card.destroy();
        this.cardSprites.delete(cardId);
      }
    });
  }

  private createResultScreen(playerWon: boolean, rounds: number, maxCombo: number): void {
    const { width, height } = this.scene.scale;
    this.resultContainer = this.scene.add.container(0, 0);
    this.resultContainer.setDepth(500);

    const maskBg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    this.resultContainer.add(maskBg);

    const resultColor = playerWon ? 0x22c55e : 0xef4444;
    const resultText = playerWon ? '胜 利!' : '失 败';

    const title = this.scene.add.text(width / 2, height * 0.3, resultText, {
      fontFamily: 'Arial Black',
      fontSize: '72px',
      color: playerWon ? '#86efac' : '#fca5a5',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setAlpha(0);
    this.resultContainer.add(title);

    this.scene.tweens.add({
      targets: title,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut'
    });

    const stats1 = this.scene.add.text(width / 2, height * 0.45, `回合数: ${rounds}`, {
      fontFamily: 'Arial', fontSize: '28px', color: '#c7d2fe'
    });
    stats1.setOrigin(0.5);

    const stats2 = this.scene.add.text(width / 2, height * 0.52, `最高连击: ${maxCombo}`, {
      fontFamily: 'Arial', fontSize: '28px', color: '#c7d2fe'
    });
    stats2.setOrigin(0.5);

    this.resultContainer.add([stats1, stats2]);

    const menuBtn = this.createButtonInContainer(this.resultContainer, width / 2, height * 0.68, '返回主菜单', resultColor);
    menuBtn.on('pointerup', () => this.onBackToMenu());
  }

  private createButtonInContainer(container: Phaser.GameObjects.Container, x: number, y: number, text: string, color: number): Phaser.GameObjects.Rectangle {
    const bg = this.scene.add.rectangle(x, y, 240, 60, color, 0.9);
    bg.setStrokeStyle(2, 0xffffff, 0.4);
    bg.setInteractive({ useHandCursor: true });
    const label = this.scene.add.text(x, y, text, {
      fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    });
    label.setOrigin(0.5);
    container.add([bg, label]);

    bg.on('pointerover', () => { bg.setScale(1.05); bg.setFillStyle(color, 1); });
    bg.on('pointerout', () => { bg.setScale(1); bg.setFillStyle(color, 0.9); });

    return bg;
  }

  private createStatsScreen(): void {
    const { width, height } = this.scene.scale;
    this.statsContainer = this.scene.add.container(0, 0);
    this.statsContainer.setDepth(500);

    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(0x0B0B2A, 0x0B0B2A, 0x1A1A4E, 0x1A1A4E, 1);
    bg.fillRect(0, 0, width, height);
    this.statsContainer.add(bg);

    const title = this.scene.add.text(width / 2, height * 0.2, '战 绩 统 计', {
      fontFamily: 'Arial Black', fontSize: '48px', color: '#a78bfa', fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.statsContainer.add(title);

    const stats = this.loadStats();
    const items = [
      { label: '总胜场', value: stats.totalWins, color: '#86efac' },
      { label: '总回合数', value: stats.totalRounds, color: '#93c5fd' },
      { label: '最高连击', value: stats.maxCombo, color: '#fde047' }
    ];

    items.forEach((item, i) => {
      const y = height * 0.38 + i * 80;
      const label = this.scene.add.text(width / 2 - 100, y, item.label, {
        fontFamily: 'Arial', fontSize: '28px', color: '#c7d2fe'
      });
      label.setOrigin(0, 0.5);
      const val = this.scene.add.text(width / 2 + 100, y, String(item.value), {
        fontFamily: 'Arial Black', fontSize: '36px', color: item.color, fontStyle: 'bold'
      });
      val.setOrigin(1, 0.5);
      this.statsContainer.add([label, val]);
    });

    const backBtn = this.createButtonInContainer(this.statsContainer, width / 2, height * 0.75, '返回主菜单', 0x4338ca);
    backBtn.on('pointerup', () => this.onBackToMenu());
  }

  playCircleTransition(onComplete?: () => void): void {
    const { width, height } = this.scene.scale;
    const maskShape = this.scene.add.circle(width / 2, height / 2, 0, 0x000000, 1);
    maskShape.setDepth(999);

    const maxRadius = Math.sqrt(width * width + height * height) / 2;
    this.scene.tweens.add({
      targets: maskShape,
      radius: maxRadius,
      duration: 500,
      ease: 'Power2.easeIn',
      onComplete: () => {
        maskShape.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  playCircleReveal(onComplete?: () => void): void {
    const { width, height } = this.scene.scale;
    const maxRadius = Math.sqrt(width * width + height * height) / 2;
    const maskShape = this.scene.add.circle(width / 2, height / 2, maxRadius, 0x000000, 1);
    maskShape.setDepth(999);

    this.scene.tweens.add({
      targets: maskShape,
      radius: 0,
      duration: 500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        maskShape.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  getState(): UIState {
    return this.state;
  }
}
