import Phaser from 'phaser';
import { AudioEngine } from '../audio/AudioEngine';
import { UIManager, type GameStats } from '../ui/UIManager';
import { CardDeck, type SoundCard, type PlayerState, CardType, WaveformType, getWaveformColor, getAICardColor, getFrequencyBand } from '../data/CardDeck';

enum GamePhase {
  MENU = 'menu',
  PLAYER_TURN = 'player_turn',
  PLAYER_ANIM = 'player_anim',
  AI_TURN = 'ai_turn',
  AI_ANIM = 'ai_anim',
  RESULT = 'result'
}

interface ActiveWaveAnim {
  card: SoundCard;
  fromPlayer: boolean;
  startTime: number;
  duration: number;
  graphics: Phaser.GameObjects.Graphics;
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
  private activeWaves: ActiveWaveAnim[] = [];
  private tempParticles: Phaser.GameObjects.Arc[] = [];
  private shieldRings: Phaser.GameObjects.Graphics[] = [];
  private particleKey = 'waveParticle';

  constructor() {
    super({ key: 'EchoCasterScene' });
  }

  preload(): void {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture(this.particleKey, 16, 16);
    g.destroy();
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
    this.audioEngine.playUIClick();
    this.uiManager.playCircleTransition(() => {
      this.initBattle();
      this.uiManager.showBattle();
      this.uiManager.playCircleReveal(() => {
        this.startPlayerTurn();
      });
    });
  }

  private initBattle(): void {
    this.player = {
      hp: 30, maxHp: 30, energy: 5, maxEnergy: 5,
      shield: 0, hand: [], deck: this.cardDeck.createDeck(), discard: []
    };
    this.ai = {
      hp: 30, maxHp: 30, energy: 5, maxEnergy: 5,
      shield: 0, hand: [], deck: this.cardDeck.createDeck(), discard: []
    };
    this.cardDeck.initPlayerHand(this.player);
    this.cardDeck.initPlayerHand(this.ai);
    this.currentRound = 1;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.clearEffects();
    this.refreshAllUI();
  }

  private startPlayerTurn(): void {
    this.phase = GamePhase.PLAYER_TURN;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 2);
    this.cardDeck.drawCard(this.player);
    this.refreshAllUI();
    this.uiManager.showTurnIndicator(`第 ${this.currentRound} 回合 — 你的回合`);
  }

  private refreshAllUI(): void {
    this.uiManager.updatePlayerState(this.player);
    this.uiManager.updateAIState(this.ai);
    this.uiManager.renderHand(
      this.player.hand,
      this.player.energy,
      this.phase === GamePhase.PLAYER_TURN
    );
  }

  private handleCardPlay(cardId: string): void {
    if (this.phase !== GamePhase.PLAYER_TURN) return;
    const card = this.cardDeck.playCard(this.player, cardId);
    if (!card) return;

    this.phase = GamePhase.PLAYER_ANIM;
    this.audioEngine.playCardSound(card);
    this.uiManager.animateCardPlay(cardId, true);
    this.executeCardEffect(card, this.player, this.ai, true);
    this.startWaveAnimation(card, true);

    this.time.delayedCall(1200, () => {
      if (this.checkGameEnd()) return;
      this.startAITurn();
    });
  }

  private startAITurn(): void {
    this.phase = GamePhase.AI_TURN;
    this.ai.energy = Math.min(this.ai.maxEnergy, this.ai.energy + 2);
    this.cardDeck.drawCard(this.ai);
    this.refreshAllUI();
    this.uiManager.showTurnIndicator('AI 回合');

    this.time.delayedCall(500, () => this.aiDecision());
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
        this.audioEngine.playCardSound(card);
        this.executeCardEffect(card, this.ai, this.player, false);
        this.startWaveAnimation(card, false);
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
    return filtered.reduce((best, c) => c.value > best.value ? c : best, filtered[0]);
  }

  private endAITurn(): void {
    if (this.checkGameEnd()) return;
    this.currentRound++;
    this.comboCount = 0;
    this.startPlayerTurn();
  }

  private executeCardEffect(card: SoundCard, caster: PlayerState, target: PlayerState, isPlayer: boolean): void {
    switch (card.type) {
      case CardType.ATTACK: {
        let damage = card.value;
        if (target.shield > 0) {
          const absorbed = Math.min(target.shield, damage);
          target.shield -= absorbed;
          damage -= absorbed;
        }
        target.hp = Math.max(0, target.hp - damage);
        if (isPlayer) {
          this.comboCount++;
          if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
        }
        this.spawnHitParticles(target, isPlayer, card);
        break;
      }
      case CardType.DEFENSE: {
        caster.shield += card.value;
        this.spawnShieldRing(caster, isPlayer, card);
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

  private startWaveAnimation(card: SoundCard, fromPlayer: boolean): void {
    const graphics = this.add.graphics();
    graphics.setDepth(150);

    this.activeWaves.push({
      card,
      fromPlayer,
      startTime: this.time.now,
      duration: Math.min(card.duration * 1000, 1000),
      graphics
    });

    this.spawnWaveParticles(card, fromPlayer);
  }

  private updateWaveAnimations(): void {
    const now = this.time.now;
    const analysis = this.audioEngine.getAnalysis();

    for (let i = this.activeWaves.length - 1; i >= 0; i--) {
      const wave = this.activeWaves[i];
      const elapsed = now - wave.startTime;
      const progress = Math.min(elapsed / wave.duration, 1);

      if (progress >= 1) {
        wave.graphics.destroy();
        this.activeWaves.splice(i, 1);
        continue;
      }

      const { width, height } = this.scale;
      const card = wave.card;
      const startY = wave.fromPlayer ? height - 140 : 140;
      const endY = wave.fromPlayer ? 140 : height - 140;
      const currentY = Phaser.Math.Linear(startY, endY, progress);
      const fadeAlpha = 1 - progress * 0.7;

      const waveColor = wave.fromPlayer ? getWaveformColor(card.waveform) : getAICardColor(card.waveform);
      const freqDensity = card.frequency / 100;

      wave.graphics.clear();

      const useRealAudio = analysis.isPlaying && analysis.rms > 0.01;
      const sampleStep = Math.max(1, Math.floor(512 / (width / 3)));

      if (useRealAudio) {
        wave.graphics.lineStyle(3, waveColor, fadeAlpha);
        wave.graphics.beginPath();
        for (let x = 0; x < width; x += 3) {
          const sampleIdx = Math.floor((x / width) * 512);
          const sampleVal = analysis.waveform[sampleIdx] || 0;
          const amplitude = Math.max(20, Math.abs(sampleVal) * 150 + 20);
          let py: number;
          if (card.waveform === WaveformType.SINE) {
            py = Math.sin((x / width) * Math.PI * 8 * freqDensity + progress * Math.PI * 6) * amplitude;
            py += sampleVal * 60;
          } else if (card.waveform === WaveformType.SQUARE) {
            const base = (Math.sin((x / width) * Math.PI * 8 * freqDensity + progress * Math.PI * 6) >= 0 ? 1 : -1);
            py = base * amplitude + sampleVal * 40;
          } else {
            const period = (((x / width) * 4 * freqDensity + progress * 3) % 1 + 1) % 1;
            py = (2 * period - 1) * amplitude + sampleVal * 40;
          }
          if (x === 0) wave.graphics.moveTo(x, currentY + py);
          else wave.graphics.lineTo(x, currentY + py);
        }
        wave.graphics.strokePath();

        wave.graphics.lineStyle(2, waveColor, fadeAlpha * 0.5);
        wave.graphics.beginPath();
        for (let x = 0; x < width; x += 3) {
          const si2 = Math.min(511, Math.floor((x / width) * 512) + 50);
          const sv2 = analysis.waveform[si2] || 0;
          const amp2 = Math.max(12, Math.abs(sv2) * 80 + 12);
          let py2: number;
          if (card.waveform === WaveformType.SINE) {
            py2 = Math.sin((x / width) * Math.PI * 8 * freqDensity + progress * Math.PI * 6 + 1) * amp2;
          } else if (card.waveform === WaveformType.SQUARE) {
            py2 = (Math.sin((x / width) * Math.PI * 8 * freqDensity + progress * Math.PI * 6 + 1) >= 0 ? 1 : -1) * amp2;
          } else {
            const p2 = (((x / width) * 4 * freqDensity + progress * 3 + 0.5) % 1 + 1) % 1;
            py2 = (2 * p2 - 1) * amp2;
          }
          if (x === 0) wave.graphics.moveTo(x, currentY + 10 + py2);
          else wave.graphics.lineTo(x, currentY + 10 + py2);
        }
        wave.graphics.strokePath();
      } else {
        const waveHeight = 25 + Math.sin(progress * Math.PI) * 20;
        wave.graphics.lineStyle(3, waveColor, fadeAlpha);
        wave.graphics.beginPath();
        for (let x = 0; x < width; x += 4) {
          const t = x / width;
          let py: number;
          if (card.waveform === WaveformType.SINE) {
            py = Math.sin(t * Math.PI * 10 * freqDensity + progress * Math.PI * 6) * waveHeight;
          } else if (card.waveform === WaveformType.SQUARE) {
            py = (Math.sin(t * Math.PI * 10 * freqDensity + progress * Math.PI * 6) >= 0 ? 1 : -1) * waveHeight;
          } else {
            const period = (((t * 5 * freqDensity + progress * 3) % 1) + 1) % 1;
            py = (2 * period - 1) * waveHeight;
          }
          if (x === 0) wave.graphics.moveTo(x, currentY + py);
          else wave.graphics.lineTo(x, currentY + py);
        }
        wave.graphics.strokePath();

        wave.graphics.lineStyle(2, waveColor, fadeAlpha * 0.4);
        wave.graphics.beginPath();
        for (let x = 0; x < width; x += 4) {
          const t = x / width;
          let py: number;
          if (card.waveform === WaveformType.SINE) {
            py = Math.sin(t * Math.PI * 10 * freqDensity + progress * Math.PI * 6 + 1.2) * waveHeight * 0.55;
          } else if (card.waveform === WaveformType.SQUARE) {
            py = (Math.sin(t * Math.PI * 10 * freqDensity + progress * Math.PI * 6 + 1.2) >= 0 ? 1 : -1) * waveHeight * 0.55;
          } else {
            const period = (((t * 5 * freqDensity + progress * 3 + 0.4) % 1) + 1) % 1;
            py = (2 * period - 1) * waveHeight * 0.55;
          }
          if (x === 0) wave.graphics.moveTo(x, currentY + 12 + py);
          else wave.graphics.lineTo(x, currentY + 12 + py);
        }
        wave.graphics.strokePath();
      }
    }
  }

  private spawnWaveParticles(card: SoundCard, fromPlayer: boolean): void {
    const { width, height } = this.scale;
    const startY = fromPlayer ? height - 140 : 140;
    const band = getFrequencyBand(card.frequency);
    let pColor = band === 'low' ? 0x3b82f6 : band === 'mid' ? 0x22c55e : 0xef4444;
    if (!fromPlayer) pColor = getAICardColor(card.waveform);

    const emitter = this.add.particles(width / 2, startY, this.particleKey, {
      speed: {
        x: { min: -80, max: 80 },
        y: fromPlayer ? { min: -300, max: -100 } : { min: 100, max: 300 }
      },
      lifespan: 800,
      quantity: 3,
      frequency: 25,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: pColor,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Line(-width / 3, 0, width / 3, 0)
      }
    });
    emitter.setDepth(155);

    this.time.delayedCall(900, () => {
      emitter.stop();
      this.time.delayedCall(400, () => emitter.destroy());
    });
  }

  private spawnHitParticles(target: PlayerState, isPlayerCaster: boolean, card: SoundCard): void {
    const { width, height } = this.scale;
    const y = isPlayerCaster ? 140 : height - 140;
    const band = getFrequencyBand(card.frequency);
    let pColor = band === 'low' ? 0x3b82f6 : band === 'mid' ? 0x22c55e : 0xef4444;
    if (!isPlayerCaster) pColor = getAICardColor(card.waveform);

    const emitter = this.add.particles(width / 2, y, this.particleKey, {
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      lifespan: 600,
      quantity: 20,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: pColor,
      blendMode: Phaser.BlendModes.ADD
    });
    emitter.setDepth(155);

    this.time.delayedCall(150, () => {
      emitter.stop();
      this.time.delayedCall(600, () => emitter.destroy());
    });

    const count = band === 'low' ? 10 : band === 'mid' ? 14 : 20;
    for (let i = 0; i < count; i++) {
      const px = width / 2 + (Math.random() - 0.5) * 120;
      const py = y + (Math.random() - 0.5) * 40;
      const size = band === 'high' ? 2 + Math.random() * 3 : 3 + Math.random() * 5;
      const p = this.add.circle(px, py, size, pColor, 0.9);
      p.setDepth(160);
      this.tempParticles.push(p);

      let targetX: number, targetY: number;
      if (band === 'low') {
        targetX = px + (Math.random() - 0.5) * 150;
        targetY = py + (Math.random() - 0.5) * 150;
      } else if (band === 'mid') {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 80;
        targetX = px + Math.cos(angle) * dist;
        targetY = py + Math.sin(angle) * dist;
      } else {
        targetX = px + (Math.random() - 0.5) * 250;
        targetY = py + (Math.random() - 0.5) * 250;
      }

      this.tweens.add({
        targets: p, x: targetX, y: targetY, alpha: 0, scale: 0.2,
        duration: band === 'high' ? 300 : band === 'mid' ? 500 : 700,
        ease: band === 'mid' ? 'Sine.easeInOut' : 'Power2',
        onComplete: () => {
          p.destroy();
          const idx = this.tempParticles.indexOf(p);
          if (idx > -1) this.tempParticles.splice(idx, 1);
        }
      });
    }
  }

  private spawnShieldRing(caster: PlayerState, isPlayer: boolean, card: SoundCard): void {
    const { width, height } = this.scale;
    const y = isPlayer ? height - 160 : 160;
    const baseColor = isPlayer ? 0x60a5fa : 0xa855f7;

    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics();
      ring.setDepth(160);
      this.shieldRings.push(ring);

      const startR = 30 + i * 8;
      const endR = 90 + i * 15;
      const delay = i * 100;

      this.tweens.add({
        targets: { r: startR, a: 0.9 },
        r: endR, a: 0,
        duration: 500,
        delay,
        ease: 'Power2',
        onUpdate: (_tween, target: { r: number; a: number }) => {
          ring.clear();
          ring.lineStyle(4, baseColor, target.a);
          ring.strokeCircle(width / 2, y, target.r);
          ring.lineStyle(2, 0xffffff, target.a * 0.4);
          ring.strokeCircle(width / 2, y, target.r * 0.85);
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
    const y = isPlayerCaster ? 140 : height - 140;
    const color = isPlayerCaster ? 0xfb923c : 0xfde047;

    for (let i = 0; i < 18; i++) {
      const px = width / 2 + (Math.random() - 0.5) * 120;
      const py = y + (Math.random() - 0.5) * 60;
      const p = this.add.circle(px, py, 2 + Math.random() * 4, color, 0.9);
      p.setDepth(160);
      this.tempParticles.push(p);

      this.tweens.add({
        targets: p,
        x: px + (Math.random() - 0.5) * 200,
        y: py + (Math.random() - 0.5) * 200,
        alpha: 0, scale: 0.15,
        duration: 500 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => {
          p.destroy();
          const idx = this.tempParticles.indexOf(p);
          if (idx > -1) this.tempParticles.splice(idx, 1);
        }
      });
    }
  }

  private clearEffects(): void {
    this.activeWaves.forEach(w => w.graphics.destroy());
    this.activeWaves = [];
    this.tempParticles.forEach(p => p.destroy());
    this.tempParticles = [];
    this.shieldRings.forEach(r => r.destroy());
    this.shieldRings = [];
  }

  private checkGameEnd(): boolean {
    if (this.player.hp <= 0 || this.ai.hp <= 0) {
      this.phase = GamePhase.RESULT;
      const playerWon = this.ai.hp <= 0;
      this.saveGameResult(playerWon);
      this.audioEngine.playResultSound(playerWon);
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
    this.audioEngine.playUIClick();
    this.phase = GamePhase.MENU;
    this.clearEffects();
    this.audioEngine.stopAll();
    this.uiManager.playCircleTransition(() => {
      this.uiManager.clearOverlay();
      this.uiManager.showMenu();
      this.uiManager.playCircleReveal();
    });
  }

  update(): void {
    if (this.activeWaves.length > 0) {
      this.updateWaveAnimations();
    }
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
