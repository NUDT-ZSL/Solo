import Phaser from 'phaser';
import { CatCard, generateShuffledDeck, CARD_CONFIG } from '../utils/CardData';

interface CardState {
  data: CatCard;
  container: Phaser.GameObjects.Container;
  backSprite: Phaser.GameObjects.Container;
  frontSprite: Phaser.GameObjects.Container;
  matchedBorder: Phaser.GameObjects.Graphics;
  isFlipped: boolean;
  isMatched: boolean;
  originalX: number;
  originalY: number;
  memoryTimer?: Phaser.Time.TimerEvent;
}

export class GameScene extends Phaser.Scene {
  private cards: CardState[] = [];
  private firstCard: CardState | null = null;
  private secondCard: CardState | null = null;
  private isProcessing: boolean = false;
  private timerText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private elapsedTime: number = 0;
  private moveCount: number = 0;
  private matchedPairs: number = 0;
  private gameTimer!: Phaser.Time.TimerEvent;
  private cardBackKey: string = 'cardBack';
  private audioCtx: AudioContext | null = null;


  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.generateCardBackTexture();
    this.generateCardFrontTextures();
    this.initAudio();
  }

  private initAudio(): void {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AC();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private resumeAudio(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playPurrSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(25, now);
    osc.frequency.linearRampToValueAtTime(35, now + 0.1);
    osc.frequency.linearRampToValueAtTime(25, now + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(2, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.setValueAtTime(0.25, now + 0.35);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  private playMeowSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.25);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  private playFlipSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private generateCardBackTexture(): void {
    const gfx = this.add.graphics();
    const w = CARD_CONFIG.WIDTH;
    const h = CARD_CONFIG.HEIGHT;

    gfx.fillStyle(0xF5E6D8, 1);
    gfx.fillRoundedRect(0, 0, w, h, 8);

    gfx.lineStyle(3, 0xD4A574, 1);
    gfx.strokeRoundedRect(2, 2, w - 4, h - 4, 6);

    gfx.fillStyle(0xFF9999, 1);
    gfx.fillEllipse(w / 2, h / 2 + 8, 26, 20);

    gfx.fillStyle(0xFFB3B3, 1);
    gfx.fillEllipse(w / 2 - 20, h / 2 - 12, 11, 10);
    gfx.fillEllipse(w / 2 + 20, h / 2 - 12, 11, 10);
    gfx.fillEllipse(w / 2 - 10, h / 2 - 25, 9, 9);
    gfx.fillEllipse(w / 2 + 10, h / 2 - 25, 9, 9);

    gfx.lineStyle(1, 0xE88888, 0.5);
    gfx.beginPath();
    gfx.arc(w / 2, h / 2 + 6, 10, 0, Math.PI * 2);
    gfx.strokePath();

    gfx.generateTexture(this.cardBackKey, w, h);
    gfx.destroy();
  }

  private generateCardFrontTextures(): void {
    const deck = generateShuffledDeck();
    const uniqueCats = [...new Map(deck.map(c => [c.pairId, c])).values()];

    uniqueCats.forEach((cat) => {
      this.generateSingleCardTexture(cat);
    });
  }

  private generateSingleCardTexture(cat: CatCard): void {
    const w = CARD_CONFIG.WIDTH;
    const h = CARD_CONFIG.HEIGHT;
    const key = `catFront_${cat.pairId}`;
    const gfx = this.add.graphics();

    gfx.fillStyle(0xFFFBF5, 1);
    gfx.fillRoundedRect(0, 0, w, h, 8);

    const borderColor = Phaser.Display.Color.HexStringToColor(cat.accentColor).color;
    gfx.lineStyle(3, borderColor, 1);
    gfx.strokeRoundedRect(2, 2, w - 4, h - 4, 6);

    const baseColor = Phaser.Display.Color.HexStringToColor(cat.color);
    const bR = (baseColor as unknown as { red: number }).red;
    const bG = (baseColor as unknown as { green: number }).green;
    const bB = (baseColor as unknown as { blue: number }).blue;

    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const r = Phaser.Math.Linear(bR, Math.min(255, bR + 35), t);
      const g = Phaser.Math.Linear(bG, Math.min(255, bG + 35), t);
      const b = Phaser.Math.Linear(bB, Math.min(255, bB + 35), t);
      gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      gfx.fillRoundedRect(6 + i * 0.4, 6 + i * 0.4, w - 12 - i * 0.8, h - 12 - i * 0.8, 5);
    }

    gfx.fillStyle(0xFFFFFF, 1);
    gfx.fillEllipse(w / 2, h / 2 - 2, 46, 50);

    const faceColor = Phaser.Display.Color.GetColor(bR, bG, bB);
    gfx.fillStyle(faceColor, 1);
    gfx.fillEllipse(w / 2, h / 2, 36, 38);

    gfx.fillTriangle(
      w / 2 - 22, h / 2 - 20,
      w / 2 - 10, h / 2 - 36,
      w / 2 - 6, h / 2 - 18
    );
    gfx.fillTriangle(
      w / 2 + 22, h / 2 - 20,
      w / 2 + 10, h / 2 - 36,
      w / 2 + 6, h / 2 - 18
    );

    gfx.fillStyle(0xFFCCD6, 1);
    gfx.fillTriangle(
      w / 2 - 18, h / 2 - 22,
      w / 2 - 12, h / 2 - 31,
      w / 2 - 9, h / 2 - 20
    );
    gfx.fillTriangle(
      w / 2 + 18, h / 2 - 22,
      w / 2 + 12, h / 2 - 31,
      w / 2 + 9, h / 2 - 20
    );

    gfx.fillStyle(0x222222, 1);
    gfx.fillEllipse(w / 2 - 10, h / 2 - 5, 5, 7);
    gfx.fillEllipse(w / 2 + 10, h / 2 - 5, 5, 7);

    gfx.fillStyle(0xFFFFFF, 1);
    gfx.fillEllipse(w / 2 - 12, h / 2 - 7, 2, 2);
    gfx.fillEllipse(w / 2 + 8, h / 2 - 7, 2, 2);

    gfx.fillStyle(0xFF88AA, 1);
    gfx.fillTriangle(
      w / 2, h / 2 + 3,
      w / 2 - 4, h / 2 - 1,
      w / 2 + 4, h / 2 - 1
    );

    gfx.lineStyle(1.5, 0x222222, 1);
    gfx.beginPath();
    gfx.moveTo(w / 2, h / 2 + 4);
    gfx.bezierCurveTo(w / 2 - 4, h / 2 + 9, w / 2 - 8, h / 2 + 7, w / 2 - 8, h / 2 + 11);
    gfx.moveTo(w / 2, h / 2 + 4);
    gfx.bezierCurveTo(w / 2 + 4, h / 2 + 9, w / 2 + 8, h / 2 + 7, w / 2 + 8, h / 2 + 11);
    gfx.strokePath();

    gfx.lineStyle(1, 0x555555, 0.7);
    for (let i = -1; i <= 1; i++) {
      gfx.beginPath();
      gfx.moveTo(w / 2 - 17, h / 2 + 2 + i * 4);
      gfx.lineTo(w / 2 - 32, h / 2 + i * 4 - 2);
      gfx.strokePath();

      gfx.beginPath();
      gfx.moveTo(w / 2 + 17, h / 2 + 2 + i * 4);
      gfx.lineTo(w / 2 + 32, h / 2 + i * 4 - 2);
      gfx.strokePath();
    }

    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }

  create(): void {
    this.createBackground();
    this.createDecorativePaws();
    this.createHUD();
    this.createCards();
    this.startGameTimer();
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    const w = 800;
    const h = 600;

    const steps = 50;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.sqrt(w * w + h * h) / 2;

    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const radius = maxRadius * (1 + t * 0.3);
      const r = Math.floor(Phaser.Math.Linear(43, 26, t));
      const g = Math.floor(Phaser.Math.Linear(31, 37, t));
      const b = Math.floor(Phaser.Math.Linear(58, 51, t));
      gradient.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      gradient.fillCircle(centerX, centerY, radius);
    }

    const vignette = this.add.graphics();
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      vignette.fillStyle(0x000000, t * 0.12);
      vignette.fillRoundedRect(0, 0, w, h, 0);
    }

    const border = this.add.graphics();
    border.lineStyle(6, 0x4A3728, 1);
    border.strokeRoundedRect(0, 0, w, h, 0);
    border.lineStyle(3, 0x6B4423, 1);
    border.strokeRoundedRect(6, 6, w - 12, h - 12, 8);
  }

  private createDecorativePaws(): void {
    const totalWidth = CARD_CONFIG.COLS * (CARD_CONFIG.WIDTH + CARD_CONFIG.GAP) - CARD_CONFIG.GAP;
    const totalHeight = CARD_CONFIG.ROWS * (CARD_CONFIG.HEIGHT + CARD_CONFIG.GAP) - CARD_CONFIG.GAP;
    const safeZone = {
      x1: 800 / 2 - totalWidth / 2 - 40,
      x2: 800 / 2 + totalWidth / 2 + 40,
      y1: 600 / 2 - totalHeight / 2 - 70,
      y2: 600 / 2 + totalHeight / 2 + 40
    };

    const positions: { x: number; y: number; scale: number; angle: number }[] = [];

    for (let i = 0; i < 16; i++) {
      let x = 0, y = 0;
      let attempts = 0;
      do {
        x = Phaser.Math.Between(25, 775);
        y = Phaser.Math.Between(25, 575);
        attempts++;
      } while (
        attempts < 40 &&
        x > safeZone.x1 && x < safeZone.x2 &&
        y > safeZone.y1 && y < safeZone.y2
      );

      positions.push({
        x,
        y,
        scale: Phaser.Math.FloatBetween(0.5, 1.3),
        angle: Phaser.Math.FloatBetween(-Math.PI / 2.5, Math.PI / 2.5)
      });
    }

    positions.forEach((pos) => {
      const paw = this.createPawGraphic(pos.scale);
      paw.setPosition(pos.x, pos.y);
      paw.setRotation(pos.angle);
      paw.setAlpha(0.15);
      paw.setDepth(0);
    });
  }

  private createPawGraphic(scale: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const gfx = this.add.graphics();

    const s = 16 * scale;
    gfx.fillStyle(0xD4A574, 1);
    gfx.fillEllipse(0, s * 0.5, s * 1.3, s);
    gfx.fillEllipse(-s * 0.9, -s * 0.3, s * 0.5, s * 0.45);
    gfx.fillEllipse(s * 0.9, -s * 0.3, s * 0.5, s * 0.45);
    gfx.fillEllipse(-s * 0.45, -s * 0.85, s * 0.4, s * 0.4);
    gfx.fillEllipse(s * 0.45, -s * 0.85, s * 0.4, s * 0.4);

    container.add(gfx);
    container.setSize(s * 2.6, s * 2.2);
    return container;
  }

  private createHUD(): void {
    this.add.text(20, 16, '⏱ 时间', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#00000080',
        blur: 0,
        fill: true
      }
    }).setDepth(100);

    this.timerText = this.add.text(20, 40, '0 秒', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFD700',
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#00000080',
        blur: 0,
        fill: true
      }
    }).setDepth(100);

    this.add.text(780, 16, '🎴 回合', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#00000080',
        blur: 0,
        fill: true
      }
    }).setOrigin(1, 0).setDepth(100);

    this.movesText = this.add.text(780, 40, '0 次', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFD700',
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#00000080',
        blur: 0,
        fill: true
      }
    }).setOrigin(1, 0).setDepth(100);
  }

  private createCards(): void {
    const deck = generateShuffledDeck();
    const totalWidth = CARD_CONFIG.COLS * (CARD_CONFIG.WIDTH + CARD_CONFIG.GAP) - CARD_CONFIG.GAP;
    const totalHeight = CARD_CONFIG.ROWS * (CARD_CONFIG.HEIGHT + CARD_CONFIG.GAP) - CARD_CONFIG.GAP;
    const startX = (800 - totalWidth) / 2 + CARD_CONFIG.WIDTH / 2;
    const startY = (600 - totalHeight) / 2 + CARD_CONFIG.HEIGHT / 2 + 20;

    deck.forEach((catData, index) => {
      const col = index % CARD_CONFIG.COLS;
      const row = Math.floor(index / CARD_CONFIG.COLS);
      const x = startX + col * (CARD_CONFIG.WIDTH + CARD_CONFIG.GAP);
      const y = startY + row * (CARD_CONFIG.HEIGHT + CARD_CONFIG.GAP);

      const cardState = this.createSingleCard(catData, x, y);
      this.cards.push(cardState);

      cardState.container.setAlpha(0);
      cardState.container.setScale(0.5);
      this.tweens.add({
        targets: cardState.container,
        alpha: 1,
        scale: 1,
        duration: 350,
        delay: index * 40,
        ease: 'Back.easeOut',
        easeParams: [1.5]
      });
    });
  }

  private createSingleCard(data: CatCard, x: number, y: number): CardState {
    const container = this.add.container(x, y);
    container.setSize(CARD_CONFIG.WIDTH, CARD_CONFIG.HEIGHT);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(3, 5, CARD_CONFIG.WIDTH, CARD_CONFIG.HEIGHT, 8);
    container.add(shadow);

    const backContainer = this.add.container(0, 0);
    const backImg = this.add.image(0, 0, this.cardBackKey);
    backContainer.add(backImg);

    const frontContainer = this.add.container(0, 0);
    frontContainer.setVisible(false);
    const frontImg = this.add.image(0, 0, `catFront_${data.pairId}`);
    frontContainer.add(frontImg);

    const nameText = this.add.text(0, CARD_CONFIG.HEIGHT / 2 - 10, data.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000AA',
        fill: true
      }
    }).setOrigin(0.5);
    frontContainer.add(nameText);

    const matchedBorder = this.add.graphics();
    matchedBorder.lineStyle(4, 0x00FF66, 1);
    matchedBorder.strokeRoundedRect(
      -CARD_CONFIG.WIDTH / 2,
      -CARD_CONFIG.HEIGHT / 2,
      CARD_CONFIG.WIDTH,
      CARD_CONFIG.HEIGHT,
      8
    );
    matchedBorder.setVisible(false);
    frontContainer.add(matchedBorder);

    container.add(backContainer);
    container.add(frontContainer);

    container.setSize(CARD_CONFIG.WIDTH, CARD_CONFIG.HEIGHT);
    container.setInteractive({ useHandCursor: true });

    const cardState: CardState = {
      data,
      container,
      backSprite: backContainer,
      frontSprite: frontContainer,
      matchedBorder,
      isFlipped: false,
      isMatched: false,
      originalX: x,
      originalY: y,
      memoryTimer: undefined
    };

    container.on('pointerover', () => {
      if (!cardState.isMatched && !this.isProcessing && (!cardState.isFlipped || !this.isCardLocked(cardState))) {
        this.tweens.add({
          targets: container,
          scale: 1.05,
          duration: 150,
          ease: 'Sine.easeOut'
        });
        backImg.setTint(0xDDDDDD);
        frontImg.setTint(0xDDDDDD);
      }
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 150,
        ease: 'Sine.easeOut'
      });
      backImg.clearTint();
      frontImg.clearTint();
    });

    container.on('pointerdown', () => {
      this.resumeAudio();
      this.onCardClick(cardState);
    });

    return cardState;
  }

  private isCardLocked(card: CardState): boolean {
    return card === this.firstCard && this.secondCard !== null;
  }

  private onCardClick(card: CardState): void {
    if (this.isProcessing || card.isFlipped || card.isMatched) return;
    if (this.firstCard && this.secondCard) return;

    this.playFlipSound();
    this.flipCard(card, true);

    if (!this.firstCard) {
      this.firstCard = card;
      card.memoryTimer = this.time.delayedCall(CARD_CONFIG.MEMORY_TIME, () => {
        if (card.isFlipped && !card.isMatched && this.firstCard === card && !this.secondCard) {
          this.flipCard(card, false);
          this.firstCard = null;
        }
      });
    } else {
      this.secondCard = card;
      this.moveCount++;
      this.movesText.setText(`${this.moveCount} 次`);

      if (this.firstCard.memoryTimer) {
        this.firstCard.memoryTimer.remove(false);
      }

      this.isProcessing = true;
      this.checkMatch();
    }
  }

  private flipCard(card: CardState, showFront: boolean): void {
    const halfDuration = CARD_CONFIG.FLIP_DURATION / 2;

    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: halfDuration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        card.isFlipped = showFront;
        card.backSprite.setVisible(!showFront);
        card.frontSprite.setVisible(showFront);

        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          duration: halfDuration,
          ease: 'Back.easeOut',
          easeParams: [1.2]
        });
      }
    });
  }

  private checkMatch(): void {
    if (!this.firstCard || !this.secondCard) return;

    const isMatch = this.firstCard.data.pairId === this.secondCard.data.pairId;

    if (isMatch) {
      this.time.delayedCall(380, () => {
        this.onMatchSuccess(this.firstCard!, this.secondCard!);
      });
    } else {
      this.time.delayedCall(420, () => {
        this.onMatchFail(this.firstCard!, this.secondCard!);
      });
    }
  }

  private onMatchSuccess(card1: CardState, card2: CardState): void {
    this.playPurrSound();
    card1.isMatched = true;
    card2.isMatched = true;
    this.matchedPairs++;

    card1.matchedBorder.setVisible(true);
    card2.matchedBorder.setVisible(true);

    this.spawnStardustParticles(card1.originalX, card1.originalY - CARD_CONFIG.HEIGHT / 2 - 10);
    this.spawnStardustParticles(card2.originalX, card2.originalY - CARD_CONFIG.HEIGHT / 2 - 10);

    const bounceTween = (card: CardState) => {
      this.tweens.add({
        targets: card.container,
        y: card.originalY + CARD_CONFIG.BOUNCE_DISTANCE,
        duration: CARD_CONFIG.BOUNCE_DURATION / 2,
        ease: 'Quad.easeOut',
        yoyo: true,
        hold: 80,
        onYoyo: () => {
          this.tweens.add({
            targets: card.container,
            angle: { from: -5, to: 5 },
            duration: 120,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              card.container.setAngle(0);
            }
          });
        },
        onComplete: () => {
          card.container.setY(card.originalY);
        }
      });
    };

    bounceTween(card1);
    bounceTween(card2);

    this.tweens.add({
      targets: [card1.frontSprite, card2.frontSprite],
      scale: { from: 1, to: 1.08 },
      duration: 200,
      delay: 100,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    this.firstCard = null;
    this.secondCard = null;
    this.isProcessing = false;

    if (this.matchedPairs >= 8) {
      this.time.delayedCall(900, () => {
        this.showGameEnd();
      });
    }
  }

  private onMatchFail(card1: CardState, card2: CardState): void {
    this.playMeowSound();

    const shakeTween = (card: CardState) => {
      const origX = card.container.x;
      this.tweens.add({
        targets: card.container,
        x: origX + CARD_CONFIG.SHAKE_DISTANCE,
        duration: CARD_CONFIG.SHAKE_DURATION / 4,
        ease: 'Linear',
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          card.container.setX(origX);
        }
      });
    };

    shakeTween(card1);
    shakeTween(card2);

    this.tweens.add({
      targets: [card1.frontSprite, card2.frontSprite],
      alpha: { from: 1, to: 0.5 },
      duration: 100,
      yoyo: true,
      repeat: 1,
      hold: 80,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(CARD_CONFIG.WRONG_FLIPBACK, () => {
      this.flipCard(card1, false);
      this.flipCard(card2, false);

      this.time.delayedCall(CARD_CONFIG.FLIP_DURATION + 50, () => {
        this.firstCard = null;
        this.secondCard = null;
        this.isProcessing = false;
      });
    });
  }

  private spawnStardustParticles(x: number, y: number): void {
    const particles = this.add.graphics();
    const particleData: { x: number; y: number; vx: number; vy: number; size: number; life: number; maxLife: number; color: number }[] = [];

    const colors = [0xFFD700, 0xFFEC8B, 0xFFF4B0, 0xFFEE99, 0xFFC700, 0xFFFA80];

    for (let i = 0; i < CARD_CONFIG.PARTICLE_COUNT; i++) {
      const angle = (i / CARD_CONFIG.PARTICLE_COUNT) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const speed = Phaser.Math.FloatBetween(40, 100);
      particleData.push({
        x: x + Phaser.Math.FloatBetween(-15, 15),
        y: y + Phaser.Math.FloatBetween(-5, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: Phaser.Math.FloatBetween(2, 4),
        life: 0,
        maxLife: CARD_CONFIG.PARTICLE_DURATION / 1000,
        color: Phaser.Utils.Array.GetRandom(colors)
      });
    }

    const startTime = this.time.now;

    const updateParticles = () => {
      const elapsed = (this.time.now - startTime) / 1000;
      particles.clear();

      let allDead = true;

      particleData.forEach((p) => {
        const t = elapsed;
        if (t >= p.maxLife) return;
        allDead = false;

        const dt = 1 / 60;
        p.vy += 180 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life = t / p.maxLife;

        const alpha = 1 - p.life;
        const size = p.size * (1 - p.life * 0.4);

        particles.fillStyle(p.color, alpha);
        particles.fillCircle(p.x, p.y, size);

        if (Math.random() > 0.5) {
          particles.fillStyle(0xFFFFFF, alpha * 0.8);
          particles.fillCircle(p.x - size * 0.3, p.y - size * 0.3, size * 0.3);
        }
      });

      if (allDead) {
        particles.destroy();
        this.events.off('update', updateParticles);
      }
    };

    this.events.on('update', updateParticles);
  }

  private startGameTimer(): void {
    this.gameTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.elapsedTime++;
        this.timerText.setText(`${this.elapsedTime} 秒`);
      }
    });
  }

  private showGameEnd(): void {
    this.gameTimer.remove(false);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setDepth(500);

    const container = this.add.container(400, 300);
    container.setDepth(501);
    container.setScale(0);

    const panel = this.add.graphics();
    const pw = 420;
    const ph = 340;

    panel.fillStyle(0x2B1F3A, 0.98);
    panel.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 20);

    panel.lineStyle(5, 0xFFD700, 1);
    panel.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 20);

    panel.lineStyle(2, 0x9B59B6, 1);
    panel.strokeRoundedRect(-pw / 2 + 10, -ph / 2 + 10, pw - 20, ph - 20, 14);

    container.add(panel);

    const title = this.add.text(0, -ph / 2 + 50, '🎉 恭喜通关！🎉', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000AA',
        fill: true
      }
    }).setOrigin(0.5);
    container.add(title);

    const subTitle = this.add.text(0, -ph / 2 + 90, '🐱 你找到了所有的猫伙伴！ 🐱', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#E8D5B7',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    container.add(subTitle);

    const timeLabel = this.add.text(-80, -30, '⏱ 总用时', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    container.add(timeLabel);

    const timeValue = this.add.text(80, -30, `${this.elapsedTime} 秒`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#6BCB77'
    }).setOrigin(0.5);
    container.add(timeValue);

    const movesLabel = this.add.text(-80, 25, '🎴 翻牌次数', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    container.add(movesLabel);

    const movesValue = this.add.text(80, 25, `${this.moveCount} 次`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#4ECDC4'
    }).setOrigin(0.5);
    container.add(movesValue);

    const avgLabel = this.add.text(0, 70, `平均每对 ${(this.moveCount / 8).toFixed(1)} 次翻牌`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#B8A5C7'
    }).setOrigin(0.5);
    container.add(avgLabel);

    const btnBg = this.add.graphics();
    const btnW = 200;
    const btnH = 55;
    btnBg.fillStyle(0xFF6FB5, 1);
    btnBg.fillRoundedRect(-btnW / 2, 105, btnW, btnH, 28);
    btnBg.lineStyle(3, 0xFFD700, 1);
    btnBg.strokeRoundedRect(-btnW / 2, 105, btnW, btnH, 28);
    container.add(btnBg);

    const btnText = this.add.text(0, 132, '🎮 再来一局', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#8B3A6A',
      strokeThickness: 2
    }).setOrigin(0.5);
    container.add(btnText);

    const btnInteractive = this.add.zone(0, 132, btnW, btnH);
    btnInteractive.setInteractive({ useHandCursor: true });
    container.add(btnInteractive);

    btnInteractive.on('pointerover', () => {
      this.tweens.add({
        targets: btnBg,
        scale: { x: 1.05, y: 1.08 },
        y: -5,
        duration: 150,
        ease: 'Sine.easeOut'
      });
      this.tweens.add({
        targets: btnText,
        scale: 1.08,
        duration: 150,
        ease: 'Sine.easeOut'
      });
    });

    btnInteractive.on('pointerout', () => {
      this.tweens.add({
        targets: btnBg,
        scale: { x: 1, y: 1 },
        y: 0,
        duration: 150,
        ease: 'Sine.easeOut'
      });
      this.tweens.add({
        targets: btnText,
        scale: 1,
        duration: 150,
        ease: 'Sine.easeOut'
      });
    });

    btnInteractive.on('pointerdown', () => {
      this.resumeAudio();
      this.tweens.add({
        targets: container,
        scale: 0.8,
        alpha: 0,
        duration: 250,
        ease: 'Back.easeIn',
        onComplete: () => {
          overlay.destroy();
          container.destroy();
          this.restartGame();
        }
      });
    });

    this.gameEndOverlay = container;

    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      easeParams: [1.3]
    });

    this.cameras.main.flash(300, 255, 215, 0, true);
    this.spawnFireworks();
  }

  private spawnFireworks(): void {
    for (let burst = 0; burst < 5; burst++) {
      this.time.delayedCall(burst * 200, () => {
        const bx = Phaser.Math.Between(100, 700);
        const by = Phaser.Math.Between(80, 250);
        const colors = [0xFFD700, 0xFF6FB5, 0x6BCB77, 0x4ECDC4, 0xA66CFF, 0xFF8C42];
        const burstColor = Phaser.Utils.Array.GetRandom(colors);
        const fwParticles = this.add.graphics();
        const fwData: { x: number; y: number; vx: number; vy: number; size: number; life: number; maxLife: number; color: number }[] = [];

        for (let i = 0; i < 25; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const speed = Phaser.Math.FloatBetween(80, 180);
          fwData.push({
            x: bx,
            y: by,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Phaser.Math.FloatBetween(2, 5),
            life: 0,
            maxLife: Phaser.Math.FloatBetween(0.8, 1.3),
            color: i % 3 === 0 ? 0xFFFFFF : burstColor
          });
        }

        const fwStart = this.time.now;
        const fwUpdate = () => {
          const elapsed = (this.time.now - fwStart) / 1000;
          fwParticles.clear();
          let allDead = true;

          fwData.forEach((p) => {
            if (elapsed >= p.maxLife) return;
            allDead = false;

            const dt = 1 / 60;
            p.vy += 140 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life = elapsed / p.maxLife;

            const alpha = 1 - p.life;
            const size = p.size * (1 - p.life * 0.5);
            fwParticles.fillStyle(p.color, alpha);
            fwParticles.fillCircle(p.x, p.y, size);
          });

          if (allDead) {
            fwParticles.destroy();
            this.events.off('update', fwUpdate);
          }
        };
        this.events.on('update', fwUpdate);
      });
    }
  }

  private restartGame(): void {
    this.cards.forEach(card => {
      card.container.destroy();
    });
    this.cards = [];
    this.firstCard = null;
    this.secondCard = null;
    this.isProcessing = false;
    this.elapsedTime = 0;
    this.moveCount = 0;
    this.matchedPairs = 0;
    this.timerText.setText('0 秒');
    this.movesText.setText('0 次');

    this.generateCardFrontTextures();
    this.createCards();
    this.startGameTimer();
  }
}
