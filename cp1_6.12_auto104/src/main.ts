import { SpellManager, type SpellResult } from './spellManager';
import {
  CombatSystem,
  SPEED_BOOST_DURATION,
  CHAIN_SLOW_DURATION,
  ULTIMATE_RUNE_DURATION
} from './combatSystem';
import { Renderer, type MageState, type UIState } from './renderer';

type GamePhase = 'countdown' | 'playing' | 'roundEnd' | 'gameOver';

const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_SCALE_DURATION = 0.2;
const CARD_BOB_PERIOD = 3;
const CARD_BOB_AMPLITUDE = 2;
const RUNE_ROTATION_SPEED = 60;
const CHAIN_ANIM_DURATION = 0.8;

class Game {
  private canvas: HTMLCanvasElement;
  private spellManager: SpellManager;
  private combatSystem: CombatSystem;
  private renderer: Renderer;

  private phase: GamePhase = 'countdown';
  private globalTime: number = 0;
  private lastFrameTime: number = 0;
  private animationFrameId: number = 0;
  private fps: number = 60;

  private countdownValue: number = COUNTDOWN_SECONDS;
  private countdownTimer: number = 0;
  private countdownScaleTimer: number = 0;

  private blueStreak: number = 0;
  private redStreak: number = 0;
  private blueErrorCount: number = 0;
  private redErrorCount: number = 0;

  private blueSpeedBoostTime: number = 0;
  private redSpeedBoostTime: number = 0;

  private blueUltimateReady: boolean = false;
  private redUltimateReady: boolean = false;
  private blueRuneTime: number = 0;
  private redRuneTime: number = 0;

  private blueChained: boolean = false;
  private redChained: boolean = false;
  private blueChainTime: number = 0;
  private redChainTime: number = 0;
  private blueChainProgress: number = 0;
  private redChainProgress: number = 0;

  private progressGlowIntensity: number = 0;
  private progressGlowDir: number = 1;

  private winner: 'blue' | 'red' | null = null;

  private inputBuffer: { player: 'blue' | 'red'; key: string; time: number }[] = [];

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.spellManager = new SpellManager();
    this.combatSystem = new CombatSystem(
      this.canvas.width,
      this.canvas.height,
      this.spellManager
    );
    this.renderer = new Renderer(this.canvas);

    this.setupInput();
    this.startCountdown();
  }

  private resizeCanvas(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.combatSystem.resize(width, height);
    if (this.renderer) {
      this.renderer.resize(width, height);
    }
  }

  private setupInput(): void {
    const blueKeys = new Set<string>();
    const redKeys = new Set<string>();

    window.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      if (key.length !== 1 || key < 'A' || key > 'Z') return;

      const now = performance.now();
      const isBlueSide = !e.shiftKey;

      if (isBlueSide && !blueKeys.has(key)) {
        blueKeys.add(key);
        this.inputBuffer.push({ player: 'blue', key, time: now });
      } else if (!isBlueSide && !redKeys.has(key)) {
        redKeys.add(key);
        this.inputBuffer.push({ player: 'red', key, time: now });
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toUpperCase();
      blueKeys.delete(key);
      redKeys.delete(key);
    });
  }

  private startCountdown(): void {
    this.phase = 'countdown';
    this.countdownValue = COUNTDOWN_SECONDS;
    this.countdownTimer = 0;
    this.countdownScaleTimer = 0;
    this.spellManager.pickNewWord();
    this.combatSystem.reset();
    this.blueStreak = 0;
    this.redStreak = 0;
    this.blueErrorCount = 0;
    this.redErrorCount = 0;
    this.blueSpeedBoostTime = 0;
    this.redSpeedBoostTime = 0;
    this.blueUltimateReady = false;
    this.redUltimateReady = false;
    this.blueChained = false;
    this.redChained = false;
    this.blueChainTime = 0;
    this.redChainTime = 0;
    this.winner = null;
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    const maxDt = 1 / 30;
    if (dt > maxDt) dt = maxDt;

    this.fps = 1 / dt;
    this.globalTime += dt;

    this.processInput();
    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private processInput(): void {
    if (this.phase !== 'playing') {
      this.inputBuffer = [];
      return;
    }

    while (this.inputBuffer.length > 0) {
      const input = this.inputBuffer.shift()!;
      this.handleSpellInput(input.player, input.key);
    }
  }

  private handleSpellInput(player: 'blue' | 'red', key: string): void {
    const slowFactor = this.isChained(player) ? 0.5 : 1;
    const boostFactor = this.hasSpeedBoost(player) ? 2 : 1;
    const effectiveSpeed = slowFactor * boostFactor;

    if (effectiveSpeed < 1 && Math.random() > effectiveSpeed) {
      return;
    }

    const result = this.spellManager.handleInput(player, key);
    this.handleSpellResult(result, player);
  }

  private handleSpellResult(result: SpellResult, player: 'blue' | 'red'): void {
    if (result.correct) {
      if (player === 'blue') {
        this.blueErrorCount = 0;
        this.blueStreak++;
        if (this.blueStreak >= 3 && !this.blueUltimateReady) {
          this.blueUltimateReady = true;
          this.blueRuneTime = ULTIMATE_RUNE_DURATION;
          this.blueStreak = 0;
        }
      } else {
        this.redErrorCount = 0;
        this.redStreak++;
        if (this.redStreak >= 3 && !this.redUltimateReady) {
          this.redUltimateReady = true;
          this.redRuneTime = ULTIMATE_RUNE_DURATION;
          this.redStreak = 0;
        }
      }

      if (result.complete) {
        const isUltimate = player === 'blue' ? this.blueUltimateReady : this.redUltimateReady;
        this.combatSystem.fireSpell(player, isUltimate);

        if (isUltimate) {
          if (player === 'blue') {
            this.blueUltimateReady = false;
            this.blueRuneTime = 0;
          } else {
            this.redUltimateReady = false;
            this.redRuneTime = 0;
          }
        }

        if (player === 'blue') {
          this.blueSpeedBoostTime = SPEED_BOOST_DURATION;
        } else {
          this.redSpeedBoostTime = SPEED_BOOST_DURATION;
        }

        setTimeout(() => {
          if (this.phase === 'playing') {
            this.spellManager.pickNewWord();
          }
        }, 300);
      }
    } else {
      if (player === 'blue') {
        this.blueStreak = 0;
        this.blueErrorCount++;
        if (this.blueErrorCount >= 3) {
          this.blueErrorCount = 0;
          this.blueChained = true;
          this.blueChainTime = CHAIN_SLOW_DURATION;
          this.blueChainProgress = 0;
        }
      } else {
        this.redStreak = 0;
        this.redErrorCount++;
        if (this.redErrorCount >= 3) {
          this.redErrorCount = 0;
          this.redChained = true;
          this.redChainTime = CHAIN_SLOW_DURATION;
          this.redChainProgress = 0;
        }
      }
    }
  }

  private isChained(player: 'blue' | 'red'): boolean {
    return player === 'blue' ? this.blueChained : this.redChained;
  }

  private hasSpeedBoost(player: 'blue' | 'red'): boolean {
    return player === 'blue' ? this.blueSpeedBoostTime > 0 : this.redSpeedBoostTime > 0;
  }

  private update(dt: number): void {
    if (this.phase === 'countdown') {
      this.updateCountdown(dt);
    }

    if (this.phase === 'playing') {
      this.combatSystem.update(dt);
      this.updateBuffs(dt);
      this.checkGameOver();
    }

    this.progressGlowIntensity += this.progressGlowDir * dt * 80;
    if (this.progressGlowIntensity > 30) {
      this.progressGlowIntensity = 30;
      this.progressGlowDir = -1;
    } else if (this.progressGlowIntensity < 10) {
      this.progressGlowIntensity = 10;
      this.progressGlowDir = 1;
    }
  }

  private updateCountdown(dt: number): void {
    this.countdownTimer += dt;
    this.countdownScaleTimer += dt;

    const scaleT = Math.min(1, this.countdownScaleTimer / COUNTDOWN_SCALE_DURATION);
    const _scale = 1.5 - 0.5 * this.easeOut(scaleT);

    if (this.countdownTimer >= 1) {
      this.countdownTimer = 0;
      this.countdownScaleTimer = 0;
      this.countdownValue--;

      if (this.countdownValue <= 0) {
        this.phase = 'playing';
      }
    }
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateBuffs(dt: number): void {
    if (this.blueSpeedBoostTime > 0) {
      this.blueSpeedBoostTime = Math.max(0, this.blueSpeedBoostTime - dt);
    }
    if (this.redSpeedBoostTime > 0) {
      this.redSpeedBoostTime = Math.max(0, this.redSpeedBoostTime - dt);
    }

    if (this.blueRuneTime > 0) {
      this.blueRuneTime = Math.max(0, this.blueRuneTime - dt);
      if (this.blueRuneTime <= 0) {
        this.blueUltimateReady = false;
      }
    }
    if (this.redRuneTime > 0) {
      this.redRuneTime = Math.max(0, this.redRuneTime - dt);
      if (this.redRuneTime <= 0) {
        this.redUltimateReady = false;
      }
    }

    if (this.blueChained) {
      this.blueChainTime -= dt;
      if (this.blueChainProgress < 1) {
        this.blueChainProgress = Math.min(1, this.blueChainProgress + dt / CHAIN_ANIM_DURATION);
      }
      if (this.blueChainTime <= 0) {
        this.blueChained = false;
        this.blueChainProgress = 0;
      }
    }
    if (this.redChained) {
      this.redChainTime -= dt;
      if (this.redChainProgress < 1) {
        this.redChainProgress = Math.min(1, this.redChainProgress + dt / CHAIN_ANIM_DURATION);
      }
      if (this.redChainTime <= 0) {
        this.redChained = false;
        this.redChainProgress = 0;
      }
    }
  }

  private checkGameOver(): void {
    const blueHp = this.combatSystem.getHealth('blue');
    const redHp = this.combatSystem.getHealth('red');

    if (blueHp <= 0) {
      this.winner = 'red';
      this.phase = 'gameOver';
    } else if (redHp <= 0) {
      this.winner = 'blue';
      this.phase = 'gameOver';
    }
  }

  private render(): void {
    const bluePos = this.combatSystem.getMagePosition('blue');
    const redPos = this.combatSystem.getMagePosition('red');

    const blueMage: MageState = {
      x: bluePos.x,
      y: bluePos.y,
      isHitRecovering: this.combatSystem.isHitRecovering('blue'),
      hasSpeedBoost: this.blueSpeedBoostTime > 0,
      hasUltimateReady: this.blueUltimateReady,
      isChained: this.blueChained,
      runeRotation: (this.globalTime * RUNE_ROTATION_SPEED * Math.PI) / 180,
      chainProgress: this.blueChainProgress
    };

    const redMage: MageState = {
      x: redPos.x,
      y: redPos.y,
      isHitRecovering: this.combatSystem.isHitRecovering('red'),
      hasSpeedBoost: this.redSpeedBoostTime > 0,
      hasUltimateReady: this.redUltimateReady,
      isChained: this.redChained,
      runeRotation: -(this.globalTime * RUNE_ROTATION_SPEED * Math.PI) / 180,
      chainProgress: this.redChainProgress
    };

    const bobOffset = Math.sin((this.globalTime * Math.PI * 2) / CARD_BOB_PERIOD) * CARD_BOB_AMPLITUDE;

    let countdown: number | null = null;
    let countdownScale = 1;
    if (this.phase === 'countdown' && this.countdownValue > 0) {
      countdown = this.countdownValue;
      const scaleT = Math.min(1, this.countdownScaleTimer / COUNTDOWN_SCALE_DURATION);
      countdownScale = 1.5 - 0.5 * this.easeOut(scaleT);
    }

    const uiState: UIState = {
      countdown,
      countdownScale,
      shuffledLetters: this.spellManager.getShuffledLetters(),
      currentWord: this.spellManager.getCurrentWord(),
      blueProgress: this.spellManager.getProgress('blue'),
      redProgress: this.spellManager.getProgress('red'),
      blueHealth: this.combatSystem.getHealth('blue'),
      redHealth: this.combatSystem.getHealth('red'),
      cardBobOffset: bobOffset,
      progressGlowIntensity: this.progressGlowIntensity
    };

    this.renderer.render(
      this.combatSystem.getState(),
      blueMage,
      redMage,
      uiState,
      this.globalTime
    );

    if (this.phase === 'gameOver' && this.winner) {
      this.renderGameOver();
    }
  }

  private renderGameOver(): void {
    const ctx = (this.renderer as unknown as { ctx: CanvasRenderingContext2D }).ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    const winnerText = this.winner === 'blue' ? 'Blue Mage Wins!' : 'Red Mage Wins!';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.winner === 'blue' ? '#60a5fa' : '#f87171';
    ctx.shadowColor = this.winner === 'blue' ? '#3b82f6' : '#ef4444';
    ctx.shadowBlur = 30;
    ctx.fillText(winnerText, width / 2, height / 2 - 20);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 0;
    ctx.fillText('Press Enter to restart', width / 2, height / 2 + 40);
    ctx.restore();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.phase === 'gameOver') {
        this.startCountdown();
      }
    }, { once: true });
  }

  getFps(): number {
    return this.fps;
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('load', () => {
  const game = new Game();
  game.start();
  (window as unknown as { game: Game }).game = game;
});
