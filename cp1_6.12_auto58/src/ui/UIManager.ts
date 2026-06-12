import Phaser from 'phaser';
import type { SoundCard, PlayerState } from '../data/CardDeck';
import { CardType, WaveformType, getWaveformColor, getWaveformColorHex } from '../data/CardDeck';

export interface GameStats {
  totalWins: number;
  totalRounds: number;
  maxCombo: number;
}

const STATS_KEY = 'echocaster_stats';

export type UIState = 'menu' | 'playing' | 'result' | 'stats';

export class UIManager {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private cardContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private cardBasePositions: Map<string, { x: number; y: number; rot: number }> = new Map();
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  private aiHpBar!: Phaser.GameObjects.Graphics;
  private aiHpText!: Phaser.GameObjects.Text;
  private playerEnergySlots: Phaser.GameObjects.Graphics[] = [];
  private aiEnergySlots: Phaser.GameObjects.Graphics[] = [];
  private turnIndicator!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private state: UIState = 'menu';
  private onStartGame!: () => void;
  private onCardPlay!: (cardId: string) => void;
  private onBackToMenu!: () => void;
  private onShowStats!: () => void;
  private playerShieldText!: Phaser.GameObjects.Text;
  private aiShieldText!: Phaser.GameObjects.Text;
  private aiAvatar!: Phaser.GameObjects.Graphics;
  private playerAvatar!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);
    this.overlay = this.scene.add.container(0, 0);
    this.overlay.setDepth(500);
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
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { totalWins: 0, totalRounds: 0, maxCombo: 0 };
  }

  saveStats(stats: GameStats): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch { /* ignore */ }
  }

  showMenu(): void {
    this.state = 'menu';
    this.clearAll();
    this.overlay.removeAll(true);
    this.buildMenu();
  }

  showBattle(): void {
    this.state = 'playing';
    this.clearAll();
    this.overlay.removeAll(true);
    this.buildBattleUI();
  }

  showResult(playerWon: boolean, rounds: number, maxCombo: number): void {
    this.state = 'result';
    this.buildResultScreen(playerWon, rounds, maxCombo);
  }

  showStatsScreen(): void {
    this.state = 'stats';
    this.clearAll();
    this.buildStatsScreen();
  }

  private clearAll(): void {
    this.container.removeAll(true);
    this.cardContainers.clear();
    this.cardBasePositions.clear();
    this.playerEnergySlots = [];
    this.aiEnergySlots = [];
  }

  private buildGradientBg(): Phaser.GameObjects.Graphics {
    const { width, height } = this.scene.scale;
    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(0x0B0B2A, 0x0B0B2A, 0x1A1A4E, 0x1A1A4E, 1);
    bg.fillRect(0, 0, width, height);
    return bg;
  }

  private buildNebula(count: number, yMin: number, yMax: number): void {
    const { width } = this.scene.scale;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = yMin + Math.random() * (yMax - yMin);
      const size = 1.5 + Math.random() * 3.5;
      const p = this.scene.add.circle(x, y, size, 0x6366f1, 0.15 + Math.random() * 0.35);
      this.container.add(p);
      this.scene.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 50,
        alpha: { from: 0.1, to: 0.5 },
        duration: 4000 + Math.random() * 6000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private buildMenu(): void {
    const { width, height } = this.scene.scale;
    this.container.add(this.buildGradientBg());
    this.buildNebula(60, 0, height);

    const title = this.scene.add.text(width / 2, height * 0.25, 'ECHOCASTER', {
      fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
      fontSize: '80px',
      fontStyle: 'bold',
      color: '#c4b5fd',
      stroke: '#7c3aed',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    this.container.add(title);

    const glow = this.scene.add.ellipse(width / 2, height * 0.25, 600, 100, 0x7c3aed, 0.15);
    this.container.add(glow);
    this.scene.tweens.add({
      targets: glow,
      scaleX: { from: 0.95, to: 1.05 },
      alpha: { from: 0.1, to: 0.25 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: title,
      scale: { from: 0.98, to: 1.02 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const subtitle = this.scene.add.text(width / 2, height * 0.34, '声 波 卡 牌 对 战', {
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontSize: '26px',
      color: '#a78bfa',
      letterSpacing: 8
    });
    subtitle.setOrigin(0.5);
    this.container.add(subtitle);

    const startBtn = this.makeButton(width / 2, height * 0.50, '开 始 游 戏', 0x7c3aed);
    startBtn.on('pointerup', () => this.onStartGame());

    const statsBtn = this.makeButton(width / 2, height * 0.62, '战 绩 查 看', 0x4338ca);
    statsBtn.on('pointerup', () => this.onShowStats());

    const stats = this.loadStats();
    const footer = this.scene.add.text(width / 2, height * 0.78,
      `总胜场: ${stats.totalWins}   |   总回合数: ${stats.totalRounds}   |   最高连击: ${stats.maxCombo}`, {
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontSize: '16px',
      color: '#818cf8'
    });
    footer.setOrigin(0.5);
    this.container.add(footer);
  }

  private makeButton(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, 260, 58, color, 0.85);
    bg.setStrokeStyle(2, 0xffffff, 0.25);
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add.text(0, 0, text, {
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
      letterSpacing: 4
    });
    label.setOrigin(0.5);

    btn.add([bg, label]);
    this.container.add(btn);

    bg.on('pointerover', () => {
      this.scene.tweens.killTweensOf(btn);
      this.scene.tweens.add({ targets: btn, scale: 1.08, duration: 120, ease: 'Back.easeOut' });
      bg.setFillStyle(color, 1);
    });
    bg.on('pointerout', () => {
      this.scene.tweens.killTweensOf(btn);
      this.scene.tweens.add({ targets: btn, scale: 1, duration: 120, ease: 'Power2' });
      bg.setFillStyle(color, 0.85);
    });
    return btn;
  }

  private buildBattleUI(): void {
    const { width, height } = this.scene.scale;
    this.container.add(this.buildGradientBg());
    this.buildNebula(35, height * 0.25, height * 0.65);

    this.aiAvatar = this.scene.add.graphics();
    this.aiAvatar.fillStyle(0x9333ea, 0.9);
    this.aiAvatar.fillCircle(width / 2 - 280, 55, 22);
    this.aiAvatar.fillStyle(0x1e1b4b, 0.9);
    this.aiAvatar.fillCircle(width / 2 - 280, 55, 18);
    this.aiAvatar.fillStyle(0xc084fc, 0.9);
    this.aiAvatar.fillCircle(width / 2 - 280, 50, 6);
    this.aiAvatar.fillCircle(width / 2 - 278, 50, 6);
    this.container.add(this.aiAvatar);

    const aiName = this.scene.add.text(width / 2 - 245, 45, 'AI 对手', {
      fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: '20px', color: '#e879f9', fontStyle: 'bold'
    });
    this.container.add(aiName);

    this.aiHpBar = this.scene.add.graphics();
    this.aiHpText = this.scene.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '15px', color: '#fff' });
    this.container.add([this.aiHpBar, this.aiHpText]);

    this.buildEnergySlots(width / 2 - 140, 85, 0x9333ea, 'ai');

    this.aiShieldText = this.scene.add.text(width / 2 + 210, 85, '', {
      fontFamily: 'Arial', fontSize: '15px', color: '#60a5fa'
    });
    this.container.add(this.aiShieldText);

    this.playerAvatar = this.scene.add.graphics();
    this.playerAvatar.fillStyle(0x22c55e, 0.9);
    this.playerAvatar.fillCircle(width / 2 - 280, height - 165, 22);
    this.playerAvatar.fillStyle(0x1e1b4b, 0.9);
    this.playerAvatar.fillCircle(width / 2 - 280, height - 165, 18);
    this.playerAvatar.fillStyle(0x86efac, 0.9);
    this.playerAvatar.fillCircle(width / 2 - 280, height - 170, 6);
    this.playerAvatar.fillCircle(width / 2 - 278, height - 170, 6);
    this.container.add(this.playerAvatar);

    const playerName = this.scene.add.text(width / 2 - 245, height - 175, '玩 家', {
      fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: '20px', color: '#86efac', fontStyle: 'bold'
    });
    this.container.add(playerName);

    this.playerHpBar = this.scene.add.graphics();
    this.playerHpText = this.scene.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '15px', color: '#fff' });
    this.container.add([this.playerHpBar, this.playerHpText]);

    this.buildEnergySlots(width / 2 - 140, height - 130, 0x6366f1, 'player');

    this.playerShieldText = this.scene.add.text(width / 2 + 210, height - 130, '', {
      fontFamily: 'Arial', fontSize: '15px', color: '#60a5fa'
    });
    this.container.add(this.playerShieldText);

    this.turnIndicator = this.scene.add.text(width / 2, height / 2, '', {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: '36px',
      color: '#fde68a',
      fontStyle: 'bold',
      stroke: '#92400e',
      strokeThickness: 3
    });
    this.turnIndicator.setOrigin(0.5);
    this.turnIndicator.setAlpha(0);
    this.container.add(this.turnIndicator);
  }

  private buildEnergySlots(startX: number, y: number, tint: number, owner: string): void {
    const slots: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < 5; i++) {
      const slot = this.scene.add.graphics();
      this.container.add(slot);
      slots.push(slot);
    }
    if (owner === 'player') {
      this.playerEnergySlots = slots;
    } else {
      this.aiEnergySlots = slots;
    }
    const label = this.scene.add.text(startX - 65, y + 4, '能量', {
      fontFamily: 'Arial', fontSize: '14px', color: tint === 0x6366f1 ? '#a5b4fc' : '#e879f9'
    });
    this.container.add(label);
  }

  updatePlayerState(state: PlayerState): void {
    const { width, height } = this.scene.scale;
    this.drawHpBar(this.playerHpBar, this.playerHpText, state,
      width / 2 - 200, height - 160, 0x22c55e, 0x86efac);
    this.drawEnergySlots(this.playerEnergySlots, state.energy, 0x6366f1);
    this.playerShieldText.setText(state.shield > 0 ? `护盾: ${state.shield}` : '');
  }

  updateAIState(state: PlayerState): void {
    const { width } = this.scene.scale;
    this.drawHpBar(this.aiHpBar, this.aiHpText, state,
      width / 2 - 200, 60, 0xa855f7, 0xc084fc);
    this.drawEnergySlots(this.aiEnergySlots, state.energy, 0x9333ea);
    this.aiShieldText.setText(state.shield > 0 ? `护盾: ${state.shield}` : '');
  }

  private drawHpBar(g: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text,
    state: PlayerState, x: number, y: number, c1: number, c2: number): void {
    g.clear();
    const w = 350, h = 20;
    const ratio = Math.max(0, state.hp) / state.maxHp;

    g.fillStyle(0x1e1b4b, 1);
    g.fillRoundedRect(x, y, w, h, 8);

    let fill = c1;
    if (ratio < 0.35) fill = 0xef4444;
    const fw = Math.max(0, w * ratio);
    g.fillGradientStyle(fill, fill, c2, c2, 1);
    g.fillRoundedRect(x, y, fw, h, 8);

    g.lineStyle(2, 0xffffff, 0.15);
    g.strokeRoundedRect(x, y, w, h, 8);

    text.setPosition(x + w / 2, y + h / 2);
    text.setText(`${Math.max(0, state.hp)} / ${state.maxHp}`);
    text.setOrigin(0.5);
    text.setFontStyle('bold');
    text.setColor(ratio < 0.35 ? '#fecaca' : '#ffffff');

    if (ratio < 0.35 && ratio > 0) {
      if (!this.scene.tweens.isTweening(g)) {
        this.scene.tweens.add({
          targets: g, alpha: { from: 0.5, to: 1 }, duration: 400, yoyo: true, repeat: -1
        });
      }
    } else {
      this.scene.tweens.killTweensOf(g);
      g.setAlpha(1);
    }
  }

  private drawEnergySlots(slots: Phaser.GameObjects.Graphics[], energy: number, color: number): void {
    const startX = this.scene.scale.width / 2 - 140;
    slots.forEach((slot, i) => {
      slot.clear();
      const sx = startX + i * 55;
      slot.fillStyle(0x1e1b4b, 1);
      slot.fillRoundedRect(sx, 0, 46, 22, 6);
      if (i < energy) {
        slot.fillGradientStyle(color, color, 0xffffff, color, 0.9);
        slot.fillRoundedRect(sx + 3, 3, 40, 16, 4);
      }
      slot.lineStyle(1.5, color, 0.5);
      slot.strokeRoundedRect(sx, 0, 46, 22, 6);
    });
  }

  flashPlayerEnergyLoss(amount: number): void {
    this.playerEnergySlots.slice(0, Math.min(amount, 5)).forEach((slot, i) => {
      this.scene.tweens.add({
        targets: slot, alpha: { from: 1, to: 0.15, duration: 70 },
        yoyo: true, repeat: 4, delay: i * 60
      });
    });
  }

  flashAIEnergyLoss(amount: number): void {
    this.aiEnergySlots.slice(0, Math.min(amount, 5)).forEach((slot, i) => {
      this.scene.tweens.add({
        targets: slot, alpha: { from: 1, to: 0.15, duration: 70 },
        yoyo: true, repeat: 4, delay: i * 60
      });
    });
  }

  showTurnIndicator(text: string): void {
    this.turnIndicator.setText(text);
    this.turnIndicator.setAlpha(0);
    this.scene.tweens.add({
      targets: this.turnIndicator,
      alpha: { from: 0, to: 1 },
      duration: 250,
      hold: 1000,
      alpha2: { from: 1, to: 0 },
      duration2: 250
    });
  }

  renderHand(hand: SoundCard[], playerEnergy: number, canPlay: boolean): void {
    this.cardContainers.forEach(c => c.destroy());
    this.cardContainers.clear();
    this.cardBasePositions.clear();

    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const baseY = height - 65;
    const count = hand.length;
    if (count === 0) return;

    const cardW = 110;
    const cardSpacing = cardW + 15;
    const arcAngle = 35;
    const arcRadius = 800;

    hand.forEach((card, index) => {
      const normalizedPos = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
      const angleDeg = normalizedPos * arcAngle;
      const angleRad = Phaser.Math.DegToRad(angleDeg);

      const x = centerX + Math.sin(angleRad) * arcRadius;
      const y = baseY - (1 - Math.cos(angleRad)) * arcRadius;
      const rot = angleDeg;

      this.cardBasePositions.set(card.id, { x, y, rot });
      const enabled = canPlay && playerEnergy >= card.energyCost;
      const cardCont = this.buildCard(card, x, y, rot, enabled);
      this.cardContainers.set(card.id, cardCont);
    });
  }

  private buildCard(card: SoundCard, x: number, y: number, rotation: number, enabled: boolean): Phaser.GameObjects.Container {
    const cont = this.scene.add.container(x, y);
    cont.setDepth(100);
    cont.setRotation(Phaser.Math.DegToRad(rotation));

    const cardW = 110, cardH = 160;
    const waveColor = getWaveformColor(card.waveform);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f0f2e, enabled ? 0.95 : 0.6);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);

    bg.fillStyle(waveColor, enabled ? 0.25 : 0.1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);

    bg.lineStyle(2.5, waveColor, enabled ? 0.85 : 0.35);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);

    if (enabled) {
      bg.lineStyle(1, 0xffffff, 0.08);
      bg.strokeRoundedRect(-cardW / 2 + 4, -cardH / 2 + 4, cardW - 8, cardH - 8, 7);
    }

    const energyCircle = this.scene.add.circle(-cardW / 2 + 20, -cardH / 2 + 20, 15, 0x1e1b4b, 0.95);
    energyCircle.setStrokeStyle(2, waveColor, 0.9);
    const energyText = this.scene.add.text(-cardW / 2 + 20, -cardH / 2 + 20, String(card.energyCost), {
      fontFamily: '"Arial Black", sans-serif', fontSize: '17px',
      color: enabled ? '#fde047' : '#4b5563', fontStyle: 'bold'
    });
    energyText.setOrigin(0.5);

    const waveIcon = this.drawWaveformIcon(card, 0, -20);

    const nameText = this.scene.add.text(0, 28, card.name, {
      fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: '15px',
      color: enabled ? '#ffffff' : '#6b7280', fontStyle: 'bold', align: 'center'
    });
    nameText.setOrigin(0.5);

    const typeStr = card.type === CardType.ATTACK ? '攻击' : card.type === CardType.DEFENSE ? '防御' : '干扰';
    const typeColor = enabled ? getWaveformColorHex(card.waveform) : '#6b7280';
    const typeText = this.scene.add.text(0, 48, typeStr, {
      fontFamily: 'Arial', fontSize: '13px', color: typeColor
    });
    typeText.setOrigin(0.5);

    const valStr = card.type === CardType.ATTACK ? `伤害 ${card.value}` :
      card.type === CardType.DEFENSE ? `护盾 ${card.value}` : `-${card.value}能量`;
    const valText = this.scene.add.text(0, 63, valStr, {
      fontFamily: 'Arial', fontSize: '11px', color: enabled ? '#d1d5db' : '#6b7280'
    });
    valText.setOrigin(0.5);

    cont.add([bg, energyCircle, energyText, waveIcon, nameText, typeText, valText]);

    if (enabled) {
      cont.setSize(cardW, cardH);
      cont.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains);

      cont.on('pointerover', () => {
        cont.setDepth(200);
        this.scene.tweens.add({
          targets: cont, y: y - 35, scale: 1.12, duration: 180, ease: 'Back.easeOut'
        });
      });
      cont.on('pointerout', () => {
        cont.setDepth(100);
        this.scene.tweens.add({
          targets: cont, y: y, scale: 1, duration: 180, ease: 'Power2'
        });
      });
      cont.on('pointerup', () => this.onCardPlay(card.id));
    }

    this.container.add(cont);
    return cont;
  }

  private drawWaveformIcon(card: SoundCard, x: number, y: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const color = getWaveformColor(card.waveform);
    g.lineStyle(2.5, color, 0.95);
    g.beginPath();

    const amp = 16;
    const freq = card.frequency / 200;

    for (let i = -35; i <= 35; i++) {
      const t = i / 35;
      let py: number;
      if (card.waveform === WaveformType.SINE) {
        py = Math.sin(t * Math.PI * 4 * freq) * amp;
      } else if (card.waveform === WaveformType.SQUARE) {
        py = (Math.sin(t * Math.PI * 4 * freq) >= 0 ? 1 : -1) * amp;
      } else {
        const period = ((t * 2 * freq) % 1 + 1) % 1;
        py = (2 * period - 1) * amp;
      }
      if (i === -35) g.moveTo(x + i, y + py);
      else g.lineTo(x + i, y + py);
    }
    g.strokePath();
    return g;
  }

  animateCardPlay(cardId: string, isPlayer: boolean): void {
    const cont = this.cardContainers.get(cardId);
    if (!cont) return;
    const targetY = this.scene.scale.height / 2;
    this.scene.tweens.add({
      targets: cont, y: targetY, scale: 0.4, alpha: 0,
      duration: 350, ease: 'Power2.easeIn',
      onComplete: () => {
        cont.destroy();
        this.cardContainers.delete(cardId);
      }
    });
  }

  private buildResultScreen(playerWon: boolean, rounds: number, maxCombo: number): void {
    this.overlay.removeAll(true);
    const { width, height } = this.scene.scale;

    const mask = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.overlay.add(mask);

    const color = playerWon ? 0x22c55e : 0xef4444;
    const titleStr = playerWon ? '胜 利 !' : '失 败';
    const titleColor = playerWon ? '#86efac' : '#fca5a5';

    const title = this.scene.add.text(width / 2, height * 0.28, titleStr, {
      fontFamily: '"Arial Black", sans-serif', fontSize: '72px',
      color: titleColor, fontStyle: 'bold', stroke: playerWon ? '#166534' : '#7f1d1d', strokeThickness: 4
    });
    title.setOrigin(0.5);
    title.setAlpha(0);
    this.overlay.add(title);

    this.scene.tweens.add({
      targets: title, alpha: { from: 0, to: 1 }, scale: { from: 0.4, to: 1 },
      duration: 600, ease: 'Back.easeOut'
    });

    const r1 = this.scene.add.text(width / 2, height * 0.44, `回 合 数 : ${rounds}`, {
      fontFamily: '"Segoe UI", Arial', fontSize: '30px', color: '#c7d2fe'
    });
    r1.setOrigin(0.5);

    const r2 = this.scene.add.text(width / 2, height * 0.52, `最高连击 : ${maxCombo}`, {
      fontFamily: '"Segoe UI", Arial', fontSize: '30px', color: '#fde047'
    });
    r2.setOrigin(0.5);
    this.overlay.add([r1, r2]);

    const btnBg = this.scene.add.rectangle(width / 2, height * 0.68, 240, 56, color, 0.9);
    btnBg.setStrokeStyle(2, 0xffffff, 0.3);
    btnBg.setInteractive({ useHandCursor: true });
    const btnLabel = this.scene.add.text(width / 2, height * 0.68, '返回主菜单', {
      fontFamily: '"Segoe UI", Arial', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
    });
    btnLabel.setOrigin(0.5);
    this.overlay.add([btnBg, btnLabel]);

    btnBg.on('pointerover', () => { btnBg.setScale(1.05); btnBg.setFillStyle(color, 1); });
    btnBg.on('pointerout', () => { btnBg.setScale(1); btnBg.setFillStyle(color, 0.9); });
    btnBg.on('pointerup', () => this.onBackToMenu());
  }

  private buildStatsScreen(): void {
    this.overlay.removeAll(true);
    const { width, height } = this.scene.scale;

    const bg = this.buildGradientBg();
    this.overlay.add(bg);

    const title = this.scene.add.text(width / 2, height * 0.18, '战 绩 统 计', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '48px', color: '#c4b5fd', fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.overlay.add(title);

    const stats = this.loadStats();
    const items: Array<{ label: string; value: number; color: string }> = [
      { label: '总胜场', value: stats.totalWins, color: '#86efac' },
      { label: '总回合数', value: stats.totalRounds, color: '#93c5fd' },
      { label: '最高连击', value: stats.maxCombo, color: '#fde047' }
    ];

    items.forEach((item, i) => {
      const iy = height * 0.36 + i * 85;
      const label = this.scene.add.text(width / 2 - 100, iy, item.label, {
        fontFamily: '"Segoe UI", Arial', fontSize: '26px', color: '#c7d2fe'
      });
      label.setOrigin(0, 0.5);
      const val = this.scene.add.text(width / 2 + 100, iy, String(item.value), {
        fontFamily: '"Arial Black", sans-serif', fontSize: '40px', color: item.color, fontStyle: 'bold'
      });
      val.setOrigin(1, 0.5);
      this.overlay.add([label, val]);
    });

    const btnBg = this.scene.add.rectangle(width / 2, height * 0.75, 240, 56, 0x4338ca, 0.9);
    btnBg.setStrokeStyle(2, 0xffffff, 0.3);
    btnBg.setInteractive({ useHandCursor: true });
    const btnLabel = this.scene.add.text(width / 2, height * 0.75, '返回主菜单', {
      fontFamily: '"Segoe UI", Arial', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
    });
    btnLabel.setOrigin(0.5);
    this.overlay.add([btnBg, btnLabel]);

    btnBg.on('pointerover', () => { btnBg.setScale(1.05); });
    btnBg.on('pointerout', () => { btnBg.setScale(1); });
    btnBg.on('pointerup', () => this.onBackToMenu());
  }

  playCircleTransition(onComplete?: () => void): void {
    const { width, height } = this.scene.scale;
    const maxR = Math.sqrt(width * width + height * height) / 2;
    const circle = this.scene.add.circle(width / 2, height / 2, 0, 0x000000, 1);
    circle.setDepth(999);
    this.scene.tweens.add({
      targets: circle, radius: maxR, duration: 500, ease: 'Power2.easeIn',
      onComplete: () => { circle.destroy(); if (onComplete) onComplete(); }
    });
  }

  playCircleReveal(onComplete?: () => void): void {
    const { width, height } = this.scene.scale;
    const maxR = Math.sqrt(width * width + height * height) / 2;
    const circle = this.scene.add.circle(width / 2, height / 2, maxR, 0x000000, 1);
    circle.setDepth(999);
    this.scene.tweens.add({
      targets: circle, radius: 0, duration: 500, ease: 'Power2.easeOut',
      onComplete: () => { circle.destroy(); if (onComplete) onComplete(); }
    });
  }

  clearOverlay(): void {
    this.overlay.removeAll(true);
  }

  getState(): UIState {
    return this.state;
  }
}
