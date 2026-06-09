import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';
import { GameEvents, ScoreUpdateData, ComboUpdateData, GameOverData } from '../events/EventBus';
import { StarTrail } from '../objects/StarTrail';
import { PlayerShip } from '../objects/PlayerShip';
import { StarDust } from '../objects/StarDust';
import { DarkVoid } from '../objects/DarkVoid';
import { NebulaLayer } from '../objects/NebulaLayer';
import { ParticlePool } from '../utils/ParticlePool';
import { AudioManager } from '../utils/AudioManager';

export class GameScene extends Phaser.Scene {
  private starTrail!: StarTrail;
  private player!: PlayerShip;
  private nebula!: NebulaLayer;
  private particles!: ParticlePool;
  private audio!: AudioManager;

  private starDusts: StarDust[] = [];
  private darkVoids: DarkVoid[] = [];

  private currentSpeed: number = CONFIG.SPEED.INITIAL;
  private score: number = 0;
  private comboStars: number = 0;
  private comboMultiplier: number = CONFIG.COMBO.BASE_MULTIPLIER;
  private totalStarsCollected: number = 0;
  private voidHits: number = 0;
  private playTime: number = 0;
  private lastSpeedIncrease: number = 0;
  private lastSpawnTime: number = 0;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;

  private playerWorldX: number = 0;
  private scrollProgress: number = 0;

  private speedFlashGraphics!: Phaser.GameObjects.Graphics;
  private bgGradient!: Phaser.GameObjects.Graphics;

  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartOffset: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const centerY = h * 0.5;

    this.renderBgGradient();
    this.nebula = new NebulaLayer(this);
    this.starTrail = new StarTrail(this, -200, centerY);
    this.player = new PlayerShip(this, w * 0.3, centerY);
    this.playerWorldX = w * 0.3;

    this.particles = new ParticlePool(this);
    this.audio = new AudioManager(this);

    this.speedFlashGraphics = this.add.graphics().setDepth(50);

    this.setupInput();

    this.score = 0;
    this.comboStars = 0;
    this.comboMultiplier = CONFIG.COMBO.BASE_MULTIPLIER;
    this.totalStarsCollected = 0;
    this.voidHits = 0;
    this.playTime = 0;
    this.currentSpeed = CONFIG.SPEED.INITIAL;
    this.lastSpeedIncrease = 0;
    this.lastSpawnTime = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.scrollProgress = 0;

    this.starDusts.forEach(s => s.destroy());
    this.starDusts = [];
    this.darkVoids.forEach(v => v.destroy());
    this.darkVoids = [];

    this.scale.on('resize', this.handleResize, this);
    this.events.on('shutdown', this.cleanup, this);
  }

  private renderBgGradient(): void {
    if (this.bgGradient) {
      this.bgGradient.destroy();
    }
    const w = this.scale.width;
    const h = this.scale.height;
    this.bgGradient = this.add.graphics().setDepth(-1);

    const steps = 50;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const hue = Phaser.Math.Linear(220, 290, t);
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.7, 0.15);
      const y1 = t * h;
      const y2 = (t + 1 / steps) * h;
      this.bgGradient.fillStyle(color.color, 1);
      this.bgGradient.fillRect(0, y1, w, y2 - y1 + 1);
    }
  }

  private handleResize(): void {
    this.renderBgGradient();
    this.nebula.resize();
    this.starTrail.updateCenterY(this.scale.height * 0.5);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused || this.isGameOver) return;
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartOffset = this.player.getTargetOffset();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isPaused || this.isGameOver) return;
      const deltaY = pointer.y - this.dragStartY;
      this.player.setTargetOffset(this.dragStartOffset + deltaY);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    this.input.on('pointerupoutside', () => {
      this.isDragging = false;
    });
  }

  update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver) return;

    const dtSec = delta / 1000;
    this.playTime += delta;

    const slowFactor = this.player.getSlowMultiplier();
    const effectiveSpeed = this.currentSpeed * slowFactor;
    const deltaScroll = effectiveSpeed * dtSec;
    this.scrollProgress += deltaScroll;

    this.nebula.update(delta);
    this.starTrail.update(deltaScroll, time);

    const trailPos = this.starTrail.getNodeWorldX(this.playerWorldX + this.scrollProgress);
    const tangentAngle = this.starTrail.getTangentAngle(this.playerWorldX + this.scrollProgress);

    const baseY = trailPos.y;
    this.player.setAngle(tangentAngle);
    this.player.update(time, delta, baseY);

    const playerOffset = this.player.getY() - baseY;
    if (Math.abs(playerOffset) > CONFIG.PLAYER.WARN_DISTANCE) {
      this.player.showWarning();
      this.player.forceReturn(baseY);
    }

    this.updateStarsAndVoids(deltaScroll, time);
    this.checkCollisions();
    this.cleanupEntities();

    this.updateDifficulty(time);
    this.spawnEntities(time);
  }

  private updateStarsAndVoids(deltaScroll: number, time: number): void {
    for (const star of this.starDusts) {
      star.update(time, deltaScroll);
    }
    for (const v of this.darkVoids) {
      v.update(time, deltaScroll);
    }
  }

  private cleanupEntities(): void {
    for (let i = this.starDusts.length - 1; i >= 0; i--) {
      if (this.starDusts[i].isOffScreen() || this.starDusts[i].collected) {
        if (!this.starDusts[i].collected) {
          if (!this.starDusts[i].compensation) {
            this.resetCombo();
          }
        }
        this.starDusts[i].destroy();
        this.starDusts.splice(i, 1);
      }
    }

    for (let i = this.darkVoids.length - 1; i >= 0; i--) {
      if (this.darkVoids[i].isOffScreen() || this.darkVoids[i].hit) {
        this.darkVoids[i].destroy();
        this.darkVoids.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    const playerX = this.player.getX();
    const playerY = this.player.getY();
    const playerR = this.player.getCollisionRadius();

    const toCheck = Math.min(this.starDusts.length + this.darkVoids.length, CONFIG.COLLISION_LIMIT);
    let checked = 0;

    for (let i = this.starDusts.length - 1; i >= 0 && checked < toCheck; i--, checked++) {
      const star = this.starDusts[i];
      if (star.collected) continue;

      const dx = playerX - star.getX();
      const dy = playerY - star.worldY;
      const distSq = dx * dx + dy * dy;
      const thresholdR = playerR + CONFIG.STAR.RADIUS * 0.7;

      if (distSq < thresholdR * thresholdR) {
        this.collectStar(star);
      }
    }

    for (let i = this.darkVoids.length - 1; i >= 0 && checked < toCheck; i--, checked++) {
      const v = this.darkVoids[i];
      if (v.hit) continue;

      const dx = playerX - v.getX();
      const dy = playerY - v.worldY;
      const distSq = dx * dx + dy * dy;
      const thresholdR = playerR + CONFIG.VOID.RADIUS * 0.6;

      if (distSq < thresholdR * thresholdR) {
        this.hitVoid(v);
      }
    }
  }

  private collectStar(star: StarDust): void {
    star.collected = true;

    const baseScore = star.getScoreValue();
    const addedScore = Math.round(baseScore * this.comboMultiplier);
    this.score += addedScore;
    this.totalStarsCollected++;
    this.comboStars++;

    const maxComboStarsInLevel = CONFIG.COMBO.STARS_PER_LEVEL;
    if (this.comboStars >= maxComboStarsInLevel && this.comboMultiplier < CONFIG.COMBO.MAX_MULTIPLIER) {
      this.comboStars -= maxComboStarsInLevel;
      this.comboMultiplier = Math.min(
        this.comboMultiplier + CONFIG.COMBO.INCREASE_PER_LEVEL,
        CONFIG.COMBO.MAX_MULTIPLIER
      );
      const newLevel = Math.round((this.comboMultiplier - CONFIG.COMBO.BASE_MULTIPLIER) / CONFIG.COMBO.INCREASE_PER_LEVEL);
      this.player.setComboLevel(newLevel);
      this.audio.playComboLevelUp();
      this.game.events.emit(GameEvents.COMBO_LEVEL_UP, { multiplier: this.comboMultiplier });
    }

    const level = Math.round((this.comboMultiplier - CONFIG.COMBO.BASE_MULTIPLIER) / CONFIG.COMBO.INCREASE_PER_LEVEL);
    this.player.setComboLevel(level);

    this.particles.emitStarBurst(star.getX(), star.worldY);
    this.audio.playStarCollect();

    this.game.events.emit(GameEvents.SCORE_UPDATE, {
      score: this.score,
      delta: addedScore,
      x: star.getX(),
      y: star.worldY
    } as ScoreUpdateData);

    this.game.events.emit(GameEvents.COMBO_UPDATE, {
      multiplier: this.comboMultiplier,
      collectedStars: this.comboStars
    } as ComboUpdateData);

    this.game.events.emit(GameEvents.STAR_COLLECTED, {
      x: star.getX(),
      y: star.worldY
    });
  }

  private hitVoid(v: DarkVoid): void {
    v.hit = true;
    this.voidHits++;

    this.score = Math.max(0, this.score - CONFIG.VOID.PENALTY_SCORE);
    this.player.applySlow();

    this.resetCombo();

    this.particles.emitVoidShockwave(v.getX(), v.worldY);

    const compCount = Phaser.Math.Between(1, 3);
    if (compCount > 0) {
      for (let i = 0; i < compCount; i++) {
        const cx = v.getX() + Phaser.Math.FloatBetween(-20, 20);
        const cy = v.worldY + Phaser.Math.FloatBetween(-20, 20);
        const compStar = new StarDust(this, cx, cy, true);
        this.starDusts.push(compStar);
      }
      this.particles.emitCompensationStars(v.getX(), v.worldY, compCount);
    }

    this.audio.playVoidHit();

    this.game.events.emit(GameEvents.SCORE_UPDATE, {
      score: this.score,
      delta: -CONFIG.VOID.PENALTY_SCORE,
      x: v.getX(),
      y: v.worldY
    } as ScoreUpdateData);

    this.game.events.emit(GameEvents.VOID_HIT, {
      x: v.getX(),
      y: v.worldY
    });

    if (this.voidHits >= CONFIG.VOID.MAX_HITS || this.score < 0) {
      this.triggerGameOver();
    }
  }

  private resetCombo(): void {
    this.comboStars = 0;
    this.comboMultiplier = CONFIG.COMBO.BASE_MULTIPLIER;
    this.player.setComboLevel(0);

    this.game.events.emit(GameEvents.COMBO_UPDATE, {
      multiplier: this.comboMultiplier,
      collectedStars: this.comboStars
    } as ComboUpdateData);
  }

  private updateDifficulty(time: number): void {
    if (time - this.lastSpeedIncrease >= CONFIG.SPEED.INCREASE_INTERVAL) {
      this.lastSpeedIncrease = time;
      const newSpeed = Math.min(this.currentSpeed * (1 + CONFIG.SPEED.INCREASE_RATE), CONFIG.SPEED.MAX);
      if (newSpeed > this.currentSpeed) {
        this.currentSpeed = newSpeed;
        this.showSpeedFlash();
        this.audio.playSpeedIncrease();
        this.game.events.emit(GameEvents.SPEED_INCREASE, { speed: this.currentSpeed });
      }
    }
  }

  private showSpeedFlash(): void {
    this.speedFlashGraphics.clear();
    const w = this.scale.width;
    const h = this.scale.height;
    const strokeWidth = 8;

    this.speedFlashGraphics.lineStyle(strokeWidth, 0xffffff, 0.8);
    this.speedFlashGraphics.strokeRect(strokeWidth / 2, strokeWidth / 2, w - strokeWidth, h - strokeWidth);

    this.time.delayedCall(CONFIG.SPAWN.SPEED_FLASH_DURATION, () => {
      this.speedFlashGraphics.clear();
    });
  }

  private getCurrentSpawnInterval(): number {
    const progress = (this.currentSpeed - CONFIG.SPEED.INITIAL) / (CONFIG.SPEED.MAX - CONFIG.SPEED.INITIAL);
    return Phaser.Math.Linear(
      CONFIG.SPAWN.INITIAL_INTERVAL,
      CONFIG.SPAWN.MIN_INTERVAL,
      Phaser.Math.Clamp(progress, 0, 1)
    );
  }

  private getCurrentVoidChance(): number {
    const progress = (this.currentSpeed - CONFIG.SPEED.INITIAL) / (CONFIG.SPEED.MAX - CONFIG.SPEED.INITIAL);
    return Phaser.Math.Linear(
      CONFIG.SPAWN.INITIAL_VOID_CHANCE,
      CONFIG.SPAWN.MAX_VOID_CHANCE,
      Phaser.Math.Clamp(progress, 0, 1)
    );
  }

  private spawnEntities(time: number): void {
    if (time - this.lastSpawnTime < this.getCurrentSpawnInterval()) return;
    this.lastSpawnTime = time;

    const spawnX = this.scale.width + 100;
    const centerY = this.scale.height * 0.5;
    const variance = this.scale.height * 0.2;

    const isVoid = Math.random() < this.getCurrentVoidChance();
    const offsetY = Phaser.Math.FloatBetween(-variance, variance);

    if (isVoid) {
      const v = new DarkVoid(this, spawnX, centerY + offsetY);
      this.darkVoids.push(v);
    } else {
      const clusterCount = Phaser.Math.Between(1, 3);
      for (let i = 0; i < clusterCount; i++) {
        const sx = spawnX + i * 40;
        const sy = centerY + offsetY + Math.sin(i * 1.2) * 20;
        const star = new StarDust(this, sx, sy);
        this.starDusts.push(star);
      }
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.physics.world.timeScale = paused ? 0 : 1;
  }

  private triggerGameOver(): void {
    this.isGameOver = true;

    const highScoreKey = 'star_trail_high_score';
    const saved = localStorage.getItem(highScoreKey);
    const prevHigh = saved ? parseInt(saved, 10) : 0;
    const newHigh = Math.max(this.score, prevHigh);
    localStorage.setItem(highScoreKey, newHigh.toString());

    const data: GameOverData = {
      finalScore: this.score,
      highScore: newHigh,
      totalStars: this.totalStarsCollected,
      playTime: this.playTime
    };
    this.game.events.emit(GameEvents.GAME_OVER, data);
  }

  public restartGame(): void {
    this.cleanup();
    this.scene.restart();
  }

  private cleanup(): void {
    this.starDusts.forEach(s => s.destroy());
    this.darkVoids.forEach(v => v.destroy());
    this.starDusts = [];
    this.darkVoids = [];
    this.starTrail?.destroy();
    this.player?.destroy();
    this.nebula?.destroy();
    this.particles?.clear();
    this.scale.off('resize', this.handleResize, this);
    this.events.off('shutdown', this.cleanup, this);
  }
}
