import Phaser from 'phaser';
import { AudioEngine } from '../audio/AudioEngine';
import { UIManager, type GameStats } from '../ui/UIManager';
import { CardDeck, type SoundCard, type PlayerState, CardType, WaveformType } from '../data/CardDeck';

enum GamePhase {
  MENU = 'menu',
  PLAYER_TURN = 'player_turn',
  PLAYER_ANIM = 'player_anim',
  AI_TURN = 'ai_turn',
  AI_ANIM = 'ai_anim',
  RESULT = 'result'
}

class EchoCasterScene extends Phaser.Scene {
  private audioEngine!: AudioEngine;
  private uiManager!: UIManager;
  private cardDeck!: CardDeck;
  private player!: PlayerState;
  private ai!: PlayerState;
  private phase: GamePhase = GamePhase.MENU;
  private currentRound: number = 1;
  private comboCount: number = 0;
  private maxCombo: number = 0;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private waveformGraphics: Phaser.GameObjects.Graphics[] = [];
  private shieldRings: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'EchoCasterScene' });
  }

  preload(): void {
    // 资源预加载（无外部资源）
  }

  create(): void {
    this.audioEngine = new AudioEngine();
    this.cardDeck = new CardDeck();
    this.uiManager = new UIManager(this);

    this.uiManager.setCallbacks({
      onStartGame: () => this.startGame(),
      onCardPlay: (cardId: string) => this.handleCardPlay(cardId),
      onBackToMenu: () => this.backToMenu(),
      onShowStats: () => this.uiManager.showStatsScreen()
    });

    this.uiManager.showMenu();
  }

  private startGame(): void {
    this.uiManager.playCircleTransition(() => {
      this.initBattle();
      this.uiManager.showBattle();
      this.uiManager.playCircleReveal(() => {
        this.startPlayerTurn();
      });
    });
  }

  private initBattle(): void {
    this.player = this.createPlayerState();
    this.ai = this.createPlayerState();
    this.cardDeck.initPlayerHand(this.player);
    this.cardDeck.initPlayerHand(this.ai);
    this.currentRound = 1;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.clearEffects();
    this.refreshAllUI();
  }

  private createPlayerState(): PlayerState {
    return {
      hp: 30,
      maxHp: 30,
      energy: 5,
      maxEnergy: 5,
      shield: 0,
      hand: [],
      deck: this.cardDeck.createDeck(),
      discard: []
    };
  }

  private startPlayerTurn(): void {
    this.phase = GamePhase.PLAYER_TURN;
    this.restoreEnergy(this.player);
    this.cardDeck.drawCard(this.player);
    this.refreshAllUI();
    this.uiManager.showTurnIndicator(`第 ${this.currentRound} 回合 - 你的回合`);
  }

  private restoreEnergy(p: PlayerState): void {
    p.energy = Math.min(p.maxEnergy, p.energy + 2);
  }

  private refreshAllUI(): void {
    this.uiManager.updatePlayerState(this.player);
    this.uiManager.updateAIState(this.ai);
    this.uiManager.renderHand(this.player.hand, this.player.energy, this.phase === GamePhase.PLAYER_TURN);
  }

  private handleCardPlay(cardId: string): void {
    if (this.phase !== GamePhase.PLAYER_TURN) return;
    const card = this.cardDeck.playCard(this.player, cardId);
    if (!card) return;

    this.phase = GamePhase.PLAYER_ANIM;
    this.uiManager.animateCardPlay(cardId, true);
    this.executeCardEffect(card, this.player, this.ai, true);
    this.playSoundWaveAnimation(card, true);

    this.time.delayedCall(1200, () => {
      if (this.checkGameEnd()) return;
      this.startAITurn();
    });
  }

  private startAITurn(): void {
    this.phase = GamePhase.AI_TURN;
    this.restoreEnergy(this.ai);
    this.cardDeck.drawCard(this.ai);
    this.refreshAllUI();
    this.uiManager.showTurnIndicator('AI 回合');

    this.time.delayedCall(600, () => {
      this.aiDecision();
    });
  }

  private aiDecision(): void {
    const playable = this.ai.hand.filter(c => c.energyCost <= this.ai.energy);
    if (playable.length === 0) {
      this.endAITurn();
      return;
    }

    let chosen: SoundCard | undefined;

    if (this.player.hp <= 15) {
      chosen = this.findBestCard(playable, CardType.ATTACK);
    }
    if (!chosen && this.ai.hp <= 10) {
      chosen = this.findBestCard(playable, CardType.DEFENSE);
    }
    if (!chosen && this.player.energy > 3) {
      chosen = this.findBestCard(playable, CardType.DISRUPT);
    }
    if (!chosen) {
      chosen = this.findBestCard(playable, CardType.ATTACK) || playable[0];
    }

    if (chosen) {
      this.phase = GamePhase.AI_ANIM;
      const card = this.cardDeck.playCard(this.ai, chosen.id);
      if (card) {
        this.executeCardEffect(card, this.ai, this.player, false);
        this.playSoundWaveAnimation(card, false);
        this.refreshAllUI();
        this.time.delayedCall(1200, () => this.endAITurn());
      } else {
        this.endAITurn();
      }
    } else {
      this.endAITurn();
    }
  }

  private findBestCard(cards: SoundCard[], type: CardType): SoundCard | undefined {
    const filtered = cards.filter(c => c.type === type);
    if (filtered.length === 0) return undefined;
    filtered.sort((a, b) => b.value - a.value);
    return filtered[0];
  }

  private endAITurn(): void {
    if (this.checkGameEnd()) return;
    this.currentRound++;
    this.comboCount = 0;
    this.startPlayerTurn();
  }

  private executeCardEffect(card: SoundCard, caster: PlayerState, target: PlayerState, isPlayer: boolean): void {
    this.audioEngine.playCardSound(card);

    switch (card.type) {
      case CardType.ATTACK: {
        let damage = card.value;
        if (target.shield > 0) {
          const absorbed = Math.min(target.shield, damage);
          target.shield -= absorbed;
          damage -= absorbed;
        }
        target.hp = Math.max(0, target.hp - damage);
        this.comboCount++;
        if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
        this.spawnHitParticles(target, isPlayer, card);
        break;
      }
      case CardType.DEFENSE: {
        caster.shield += card.value;
        this.spawnShieldRing(caster, isPlayer);
        break;
      }
      case CardType.DISRUPT: {
        const lost = Math.min(target.energy, card.value);
        target.energy = Math.max(0, target.energy - card.value);
        if (isPlayer) {
          this.uiManager.flashAIEnergyLoss(lost);
        } else {
          this.uiManager.flashPlayerEnergyLoss(lost);
        }
        this.spawnDisruptParticles(target, isPlayer, card);
        break;
      }
    }
    this.refreshAllUI();
  }

  private playSoundWaveAnimation(card: SoundCard, fromPlayer: boolean): void {
    const { width, height } = this.scale;
    const startY = fromPlayer ? height - 120 : 120;
    const endY = fromPlayer ? 120 : height - 120;
    const color = fromPlayer ? this.audioEngine.getWaveformColor(card) : this.audioEngine.getAICardColor(card);

    const graphics = this.add.graphics();
    this.waveformGraphics.push(graphics);
    graphics.setDepth(150);

    const totalDuration = Math.min(card.duration * 1000, 1000);
    const steps = 40;
    const stepDuration = totalDuration / steps;
    let step = 0;

    const freqScale = card.frequency / 200;

    this.time.addEvent({
      delay: stepDuration,
      repeat: steps,
      callback: () => {
        step++;
        const progress = step / steps;
        graphics.clear();
        const currentY = Phaser.Math.Linear(startY, endY, progress);
        const alpha = 1 - progress * 0.6;
        const waveHeight = 30 + Math.sin(progress * Math.PI) * 20;

        graphics.lineStyle(3, color, alpha);
        graphics.beginPath();
        for (let x = 0; x <= width; x += 4) {
          let py: number;
          const t = x / width;
          if (card.waveform === WaveformType.SINE) {
            py = Math.sin(t * Math.PI * 12 * freqScale + progress * Math.PI * 4) * waveHeight;
          } else if (card.waveform === WaveformType.SQUARE) {
            py = (Math.sin(t * Math.PI * 12 * freqScale + progress * Math.PI * 4) >= 0 ? 1 : -1) * waveHeight;
          } else {
            const tt = (t * 6 * freqScale + progress * 2) % 1;
            py = (2 * tt - 1) * waveHeight;
          }
          if (x === 0) graphics.moveTo(x, currentY + py);
          else graphics.lineTo(x, currentY + py);
        }
        graphics.strokePath();

        graphics.lineStyle(2, color, alpha * 0.5);
        graphics.beginPath();
        for (let x = 0; x <= width; x += 4) {
          let py: number;
          const t = x / width;
          if (card.waveform === WaveformType.SINE) {
            py = Math.sin(t * Math.PI * 12 * freqScale + progress * Math.PI * 4 + 0.5) * (waveHeight * 0.6);
          } else if (card.waveform === WaveformType.SQUARE) {
            py = (Math.sin(t * Math.PI * 12 * freqScale + progress * Math.PI * 4 + 0.5) >= 0 ? 1 : -1) * (waveHeight * 0.6);
          } else {
            const tt = (t * 6 * freqScale + progress * 2 + 0.3) % 1;
            py = (2 * tt - 1) * (waveHeight * 0.6);
          }
          if (x === 0) graphics.moveTo(x, currentY + 8 + py);
          else graphics.lineTo(x, currentY + 8 + py);
        }
        graphics.strokePath();

        if (step >= steps) {
          graphics.destroy();
          const idx = this.waveformGraphics.indexOf(graphics);
          if (idx > -1) this.waveformGraphics.splice(idx, 1);
        }
      }
    });

    this.spawnWaveParticles(card, fromPlayer);
  }

  private spawnWaveParticles(card: SoundCard, fromPlayer: boolean): void {
    const { width, height } = this.scale;
    const startY = fromPlayer ? height - 120 : 120;
    const band = this.audioEngine.getFrequencyBand(card);
    let pColor = 0x3b82f6;
    if (band === 'mid') pColor = 0x22c55e;
    if (band === 'high') pColor = 0xef4444;
    if (!fromPlayer) pColor = this.audioEngine.getAICardColor(card);

    const emitter = this.add.particles(0, 0, undefined, {
      x: { min: 100, max: width - 100 },
      y: startY,
      speedY: fromPlayer ? { min: -300, max: -150 } : { min: 150, max: 300 },
      speedX: { min: -50, max: 50 },
      lifespan: 900,
      quantity: 2,
      frequency: 30,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: pColor,
      blendMode: Phaser.BlendModes.ADD
    });

    if (band === 'high') {
      this.tweens.add({
        targets: emitter,
        scale: { from: 0.3, to: 0.8, duration: 80, yoyo: true, repeat: 8 }
      });
    } else if (band === 'mid') {
      emitter.setEmitterAngle({ min: 0, max: 360 });
    }

    this.particles.push(emitter);
    this.time.delayedCall(1000, () => {
      emitter.stop();
      this.time.delayedCall(300, () => {
        emitter.destroy();
        const idx = this.particles.indexOf(emitter);
        if (idx > -1) this.particles.splice(idx, 1);
      });
    });
  }

  private spawnHitParticles(target: PlayerState, isPlayerCaster: boolean, card: SoundCard): void {
    const { width, height } = this.scale;
    const y = isPlayerCaster ? 120 : height - 120;
    const band = this.audioEngine.getFrequencyBand(card);
    let pColor = 0x3b82f6;
    if (band === 'mid') pColor = 0x22c55e;
    if (band === 'high') pColor = 0xef4444;
    if (isPlayerCaster) pColor = this.audioEngine.getAICardColor(card);

    const emitter = this.add.particles(width / 2, y, undefined, {
      speed: { min: 100, max: 250 },
      angle: { min: 0, max: 360 },
      lifespan: 700,
      quantity: 25,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: pColor,
      blendMode: Phaser.BlendModes.ADD
    });

    this.particles.push(emitter);
    this.time.delayedCall(200, () => {
      emitter.stop();
      this.time.delayedCall(700, () => {
        emitter.destroy();
        const idx = this.particles.indexOf(emitter);
        if (idx > -1) this.particles.splice(idx, 1);
      });
    });
  }

  private spawnShieldRing(caster: PlayerState, isPlayer: boolean): void {
    const { width, height } = this.scale;
    const y = isPlayer ? height - 140 : 140;
    const color = isPlayer ? 0x60a5fa : 0xa855f7;

    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics();
      this.shieldRings.push(ring);
      ring.setDepth(160);
      const startRadius = 30 + i * 10;
      const endRadius = 100 + i * 20;

      let radius = startRadius;
      let alpha = 0.8;
      this.tweens.add({
        targets: { r: startRadius, a: 0.8 },
        r: endRadius,
        a: 0,
        duration: 500,
        delay: i * 120,
        ease: 'Power2',
        onUpdate: (tween, target) => {
          radius = target.r;
          alpha = target.a;
          ring.clear();
          ring.lineStyle(4, color, alpha);
          ring.strokeCircle(width / 2, y, radius);
          ring.lineStyle(2, 0xffffff, alpha * 0.5);
          ring.strokeCircle(width / 2, y, radius * 0.9);
        },
        onComplete: () => {
          ring.destroy();
          const idx = this.shieldRings.indexOf(ring);
          if (idx > -1) this.shieldRings.splice(idx, 1);
        }
      });
    }
  }

  private spawnDisruptParticles(target: PlayerState, isPlayerCaster: boolean, card: SoundCard): void {
    const { width, height } = this.scale;
    const y = isPlayerCaster ? 120 : height - 120;
    const color = isPlayerCaster ? 0xfb923c : 0xfde047;

    for (let i = 0; i < 15; i++) {
      const px = width / 2 + (Math.random() - 0.5) * 100;
      const py = y + (Math.random() - 0.5) * 60;
      const particle = this.add.circle(px, py, 3 + Math.random() * 4, color, 0.9);
      particle.setDepth(160);
      this.tweens.add({
        targets: particle,
        x: px + (Math.random() - 0.5) * 200,
        y: py + (Math.random() - 0.5) * 200,
        alpha: 0,
        scale: 0.2,
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  private clearEffects(): void {
    this.particles.forEach(p => p.destroy());
    this.particles = [];
    this.waveformGraphics.forEach(g => g.destroy());
    this.waveformGraphics = [];
    this.shieldRings.forEach(r => r.destroy());
    this.shieldRings = [];
  }

  private checkGameEnd(): boolean {
    if (this.player.hp <= 0 || this.ai.hp <= 0) {
      this.phase = GamePhase.RESULT;
      const playerWon = this.ai.hp <= 0;
      this.saveGameResult(playerWon);
      this.time.delayedCall(600, () => {
        this.uiManager.showResult(playerWon, this.currentRound, this.maxCombo);
      });
      return true;
    }
    return false;
  }

  private saveGameResult(playerWon: boolean): void {
    const stats: GameStats = this.uiManager.loadStats();
    if (playerWon) stats.totalWins++;
    stats.totalRounds += this.currentRound;
    if (this.maxCombo > stats.maxCombo) stats.maxCombo = this.maxCombo;
    this.uiManager.saveStats(stats);
  }

  private backToMenu(): void {
    this.phase = GamePhase.MENU;
    this.clearEffects();
    this.uiManager.playCircleTransition(() => {
      this.uiManager.showMenu();
      this.uiManager.playCircleReveal();
    });
  }

  update(): void {
    // 每帧更新逻辑
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0B0B2A',
  scene: [EchoCasterScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

new Phaser.Game(config);
