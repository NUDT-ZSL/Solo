import Phaser from 'phaser';
import { MusicManager, BeatState } from '../managers/MusicManager';
import { InputManager } from '../managers/InputManager';
import {
  GameState,
  PlayerState,
  PlatformData,
  GameSettings,
  GameTheme,
  THEME_COLORS,
  THEME_THRESHOLDS,
  DEFAULT_SETTINGS
} from '../types/gameTypes';

const GRAVITY = 800;
const JUMP_MIN_VELOCITY = -300;
const JUMP_MAX_VELOCITY = -650;
const CHARGE_MIN_MS = 200;
const CHARGE_MAX_MS = 800;
const BASE_TRACK_SPEED = 10;
const SPEED_INCREMENT = 0.5;
const SPEED_INCREMENT_INTERVAL_MS = 30000;
const LANE_COUNT = 3;
const LANE_WIDTH = 120;
const INITIAL_LIVES = 5;
const FEVER_COMBO_THRESHOLD = 10;
const BEAT_HIT_SCORE = 10;
const BEAT_MISS_DAMAGE = 5;
const AIR_DODGE_ARC_HEIGHT = 40;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  color: number;
}

interface PulseWave {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  color: number;
}

interface AirDodgeState {
  active: boolean;
  startLane: number;
  endLane: number;
  progress: number;
  durationMs: number;
  startX: number;
}

export class BeatScene extends Phaser.Scene {
  private musicManager!: MusicManager;
  private inputManager!: InputManager;
  private settings: GameSettings;

  private gameState!: GameState;
  private player!: PlayerState;
  private platforms: PlatformData[] = [];
  private platformIdCounter: number = 0;

  private trackSpeedUnitsPerSec: number = BASE_TRACK_SPEED;
  private speedAccumulatorMs: number = 0;

  private trackTop: number = 0;
  private trackBottom: number = 0;
  private infoBarHeight: number = 0;
  private trackHeight: number = 0;

  private trackGraphics!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Graphics;
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private pulseGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private particleTexture!: Phaser.Textures.CanvasTexture;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private bpmText!: Phaser.GameObjects.Text;
  private feverText!: Phaser.GameObjects.Text;

  private particles: Particle[] = [];
  private pulseWaves: PulseWave[] = [];

  private lastProcessedBeat: number = -1;
  private lastHitBeat: number = -1;
  private redFlashAlpha: number = 0;

  private airDodge: AirDodgeState = {
    active: false,
    startLane: 0,
    endLane: 0,
    progress: 0,
    durationMs: 300,
    startX: 0
  };

  private jumpChargeMs: number = 0;
  private isCharging: boolean = false;

  private playerLandingTween: { active: boolean; progress: number } = { active: false, progress: 0 };

  constructor(settings?: GameSettings) {
    super('BeatScene');
    this.settings = settings || { ...DEFAULT_SETTINGS };
  }

  init(data: { settings?: GameSettings }): void {
    if (data.settings) {
      this.settings = { ...data.settings };
    }
  }

  preload(): void {
    this.load.audio('bgm', 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1A0A2E');

    this.setupLayout();
    this.createParticleTexture();
    this.createManagers();
    this.createGameState();
    this.createGraphics();
    this.createUI();
    this.generateInitialPlatforms();
    this.setupInputCallbacks();

    this.musicManager.playMusic('bgm');
  }

  private setupLayout(): void {
    const { width, height } = this.scale;
    const isMobile = width < 768;

    if (isMobile) {
      this.trackTop = 0;
      this.trackBottom = height * 0.85;
      this.infoBarHeight = height * 0.15;
    } else {
      this.trackTop = 0;
      this.trackBottom = height * 0.7;
      this.infoBarHeight = height * 0.3;
    }
    this.trackHeight = this.trackBottom - this.trackTop;
  }

  private createParticleTexture(): void {
    const size = 32;
    const canvas = this.textures.createCanvas('particle-gradient', size, size);
    if (!canvas) return;

    this.particleTexture = canvas;
    const ctx = canvas.getContext();

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    canvas.refresh();
  }

  private createManagers(): void {
    this.musicManager = new MusicManager(this, {
      volume: this.settings.musicVolume,
      bpm: 120,
      beatWindow: this.settings.jumpSensitivity
    });

    this.inputManager = new InputManager(this, this.settings.jumpSensitivity);
  }

  private createGameState(): void {
    this.gameState = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: INITIAL_LIVES,
      currentTheme: 'vegetation',
      unlockedThemes: ['vegetation'],
      isFeverMode: false,
      feverComboCount: 0,
      gameOver: false,
      isPaused: false
    };

    const centerX = this.scale.width / 2;
    this.player = {
      x: centerX,
      y: this.trackBottom - 80,
      z: 0,
      velocityY: 0,
      lane: 1,
      targetLane: 1,
      isGrounded: true,
      isJumping: false,
      jumpCharge: 0,
      scale: 1.0,
      canAirDodge: true,
      airDodgeDirection: 0
    };

    this.trackSpeedUnitsPerSec = BASE_TRACK_SPEED * this.settings.scrollSpeed;
    this.speedAccumulatorMs = 0;
  }

  private createGraphics(): void {
    this.trackGraphics = this.add.graphics();
    this.pulseGraphics = this.add.graphics();
    this.particleGraphics = this.add.graphics();
    this.playerSprite = this.add.graphics();
    this.uiGraphics = this.add.graphics();
  }

  private createUI(): void {
    const { width, height } = this.scale;
    const isMobile = width < 768;

    this.scoreText = this.add.text(width - 20, this.trackBottom + 20, '0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '16px' : '24px',
      color: '#00FFFF'
    }).setOrigin(1, 0).setScrollFactor(0);

    this.comboText = this.add.text(width - 20, this.trackBottom + 55, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '16px',
      color: '#FF00FF'
    }).setOrigin(1, 0).setScrollFactor(0).setVisible(false);

    this.livesText = this.add.text(20, this.trackBottom + 20, '♥♥♥♥♥', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '16px' : '20px',
      color: '#FF0066'
    }).setOrigin(0, 0).setScrollFactor(0);

    this.bpmText = this.add.text(20, this.trackBottom + 55, 'BPM: 120', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FFFFFF'
    }).setOrigin(0, 0).setScrollFactor(0);

    this.feverText = this.add.text(width / 2, 50, 'RHYTHM FEVER!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '18px' : '28px',
      color: '#FFD700'
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

    this.drawInfoBar();
  }

  private drawInfoBar(): void {
    const { width } = this.scale;
    this.uiGraphics.clear();

    this.uiGraphics.fillGradientStyle(
      0x1A0A2E, 0x1A0A2E,
      0x2A1A4E, 0x2A1A4E,
      0.95, 0.95, 0.95, 0.95
    );
    this.uiGraphics.fillRect(0, this.trackBottom, width, this.infoBarHeight);

    this.uiGraphics.lineStyle(2, 0x00FFFF, 0.5);
    this.uiGraphics.strokeRect(2, this.trackBottom + 2, width - 4, this.infoBarHeight - 4);

    this.uiGraphics.lineStyle(3, 0x00FFFF, 0.3);
    this.uiGraphics.strokeRect(0, this.trackBottom, width, this.infoBarHeight);
  }

  private generateInitialPlatforms(): void {
    this.platforms = [];
    this.platformIdCounter = 0;

    const beatDurationMs = this.musicManager.getBeatDurationMs();
    const beatDurationSec = beatDurationMs / 1000;
    const distancePerBeat = this.trackSpeedUnitsPerSec * beatDurationSec;
    const pixelsPerUnit = 40;

    for (let beatIndex = 0; beatIndex < 40; beatIndex++) {
      this.createPlatformForBeat(beatIndex, distancePerBeat, pixelsPerUnit);
    }
  }

  private createPlatformForBeat(
    beatIndex: number,
    distancePerBeat: number,
    pixelsPerUnit: number
  ): void {
    if (this.platforms.some(p => p.beatIndex === beatIndex)) return;

    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const rand = Math.random();
    let type: PlatformData['type'] = 'normal';

    if (beatIndex > 8) {
      if (rand < 0.12) type = 'obstacle';
      else if (rand < 0.22) type = 'high';
      else if (rand < 0.28) type = 'low';
      else if (rand < 0.34) type = 'rotate';
    }

    const centerX = this.scale.width / 2;
    const laneOffset = (lane - 1) * LANE_WIDTH;
    const playerY = this.trackBottom - 80;
    const y = playerY - beatIndex * distancePerBeat * pixelsPerUnit;

    const platform: PlatformData = {
      id: this.platformIdCounter++,
      beatIndex,
      x: centerX + laneOffset,
      y,
      z: beatIndex,
      lane,
      type,
      width: type === 'obstacle' ? 80 : 100,
      height: type === 'high' ? 60 : type === 'low' ? 20 : 40,
      passed: false,
      hit: false
    };

    this.platforms.push(platform);
  }

  private setupInputCallbacks(): void {
    this.inputManager.setOnJumpCallback(() => {
      if (this.gameState.gameOver || this.gameState.isPaused) return;
      this.startCharging();
    });

    this.inputManager.setOnJumpReleaseCallback(() => {
      if (this.gameState.gameOver || this.gameState.isPaused) return;
      this.releaseJump();
    });

    this.input.keyboard!.on('keydown-A', () => this.tryAirDodge(-1), this);
    this.input.keyboard!.on('keydown-LEFT', () => this.tryAirDodge(-1), this);
    this.input.keyboard!.on('keydown-D', () => this.tryAirDodge(1), this);
    this.input.keyboard!.on('keydown-RIGHT', () => this.tryAirDodge(1), this);
  }

  private startCharging(): void {
    if (this.player.isGrounded && !this.player.isJumping) {
      this.isCharging = true;
      this.jumpChargeMs = 0;
    }
  }

  private releaseJump(): void {
    if (!this.isCharging) return;
    this.isCharging = false;

    if (this.player.isGrounded) {
      this.executeJump(this.jumpChargeMs);
    }
    this.jumpChargeMs = 0;
  }

  private executeJump(chargeMs: number): void {
    const clampedCharge = Phaser.Math.Clamp(chargeMs, CHARGE_MIN_MS, CHARGE_MAX_MS);
    const chargeRatio = (clampedCharge - CHARGE_MIN_MS) / (CHARGE_MAX_MS - CHARGE_MIN_MS);

    const jumpVelocity = Phaser.Math.Linear(JUMP_MIN_VELOCITY, JUMP_MAX_VELOCITY, chargeRatio);
    this.player.velocityY = jumpVelocity;
    this.player.isGrounded = false;
    this.player.isJumping = true;
    this.player.canAirDodge = true;
    this.player.jumpCharge = chargeRatio;

    this.tweens.add({
      targets: this.player,
      scale: { from: 0.8, to: 1.2 },
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.player.scale = 1.0;
      }
    });

    const audioTime = this.musicManager.getAudioTimeSec();
    const beatResult = this.musicManager.checkBeatHitAtAudioTime(audioTime);

    if (beatResult.hit && beatResult.beatIndex !== this.lastHitBeat) {
      this.onBeatHit(beatResult.accuracy, beatResult.beatIndex);
    } else if (!beatResult.hit && Math.abs(beatResult.offsetMs) < 200) {
      if (beatResult.beatIndex !== this.lastHitBeat) {
        this.onBeatMiss();
        this.lastHitBeat = beatResult.beatIndex;
      }
    }
  }

  private tryAirDodge(direction: number): void {
    if (this.gameState.gameOver || this.gameState.isPaused) return;
    if (this.player.isGrounded || !this.player.canAirDodge || this.airDodge.active) return;

    const newLane = this.player.targetLane + direction;
    if (newLane < 0 || newLane >= LANE_COUNT) return;

    this.airDodge = {
      active: true,
      startLane: this.player.lane,
      endLane: newLane,
      progress: 0,
      durationMs: 300,
      startX: this.player.x
    };

    this.player.targetLane = newLane;
    this.player.canAirDodge = false;
    this.player.airDodgeDirection = direction;
  }

  private onBeatHit(accuracy: number, beatIndex: number): void {
    this.lastHitBeat = beatIndex;
    this.gameState.combo++;
    this.gameState.feverComboCount++;

    if (this.gameState.combo > this.gameState.maxCombo) {
      this.gameState.maxCombo = this.gameState.combo;
    }

    let scoreGain = BEAT_HIT_SCORE;
    if (this.gameState.isFeverMode) {
      scoreGain *= 2;
    }
    scoreGain = Math.floor(scoreGain * (0.8 + accuracy * 0.4));
    this.gameState.score += scoreGain;

    if (this.gameState.feverComboCount >= FEVER_COMBO_THRESHOLD && !this.gameState.isFeverMode) {
      this.enterFeverMode();
    }

    this.spawnHitParticles(this.player.x, this.player.y - 30);
    this.spawnPulseWave(this.player.x, this.player.y);
    this.checkThemeUnlock();
    this.updateUI();
  }

  private onBeatMiss(): void {
    this.gameState.combo = 0;
    this.gameState.feverComboCount = 0;
    this.gameState.lives--;
    this.gameState.score = Math.max(0, this.gameState.score - BEAT_MISS_DAMAGE);

    if (this.gameState.isFeverMode) {
      this.exitFeverMode();
    }

    this.redFlashAlpha = 1;
    this.cameras.main.shake(200, 0.005);
    this.spawnMissParticles(this.player.x, this.player.y - 30);

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }

    this.updateUI();
  }

  private enterFeverMode(): void {
    this.gameState.isFeverMode = true;
    this.feverText.setVisible(true);

    this.tweens.add({
      targets: this.feverText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.out'
    });

    this.cameras.main.flash(300, 255, 215, 0);
  }

  private exitFeverMode(): void {
    this.gameState.isFeverMode = false;
    this.feverText.setVisible(false);
  }

  private checkThemeUnlock(): void {
    for (const threshold of THEME_THRESHOLDS) {
      if (this.gameState.score >= threshold.score &&
          !this.gameState.unlockedThemes.includes(threshold.theme)) {
        this.gameState.unlockedThemes.push(threshold.theme);
      }
    }

    const newTheme = this.getCurrentThemeForScore();
    if (newTheme !== this.gameState.currentTheme) {
      this.gameState.currentTheme = newTheme;
      this.onThemeChange(newTheme);
    }
  }

  private getCurrentThemeForScore(): GameTheme {
    let theme: GameTheme = 'vegetation';
    for (const threshold of THEME_THRESHOLDS) {
      if (this.gameState.score >= threshold.score) {
        theme = threshold.theme;
      }
    }
    return theme;
  }

  private onThemeChange(theme: GameTheme): void {
    const colors = THEME_COLORS[theme];
    this.cameras.main.setBackgroundColor('#' + colors.bg.toString(16).padStart(6, '0'));
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 80 + Math.random() * 140;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 1,
        maxLife: 1,
        startSize: 16,
        endSize: 2,
        color: 0x00FF88
      });
    }
  }

  private spawnMissParticles(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const speed = 40 + Math.random() * 70;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.9,
        maxLife: 0.9,
        startSize: 12,
        endSize: 2,
        color: 0xFF3333
      });
    }
  }

  private spawnLandingParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
      const speed = 30 + Math.random() * 60;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.4,
        life: 0.6,
        maxLife: 0.6,
        startSize: 8,
        endSize: 1,
        color: 0x999999
      });
    }
  }

  private spawnPulseWave(x: number, y: number): void {
    const color = this.gameState.isFeverMode ? 0xFFD700 : 0x00FFFF;
    this.pulseWaves.push({
      x, y,
      life: 1,
      maxLife: 1,
      maxRadius: 180,
      color
    });

    this.time.delayedCall(400, () => {
      this.pulseWaves.push({
        x, y,
        life: 1,
        maxLife: 1,
        maxRadius: 120,
        color
      });
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameState.gameOver || this.gameState.isPaused) return;

    const deltaSec = delta / 1000;
    this.inputManager.update(this.time.now);

    if (this.isCharging) {
      this.jumpChargeMs += delta;
    }

    this.updateTrackSpeed(delta);
    this.updateAirDodge(delta);
    this.updatePlayerPhysics(deltaSec);
    this.updatePlatforms(deltaSec);
    this.updateParticles(deltaSec);
    this.updatePulseWaves(deltaSec);
    this.checkBeatSync();
    this.updateRedFlash(deltaSec);
    this.updatePlayerLandingTween(delta);

    this.render();
  }

  private updateTrackSpeed(delta: number): void {
    this.speedAccumulatorMs += delta;
    while (this.speedAccumulatorMs >= SPEED_INCREMENT_INTERVAL_MS) {
      this.speedAccumulatorMs -= SPEED_INCREMENT_INTERVAL_MS;
      this.trackSpeedUnitsPerSec += SPEED_INCREMENT * this.settings.scrollSpeed;
    }
  }

  private updateAirDodge(delta: number): void {
    if (!this.airDodge.active) return;

    this.airDodge.progress += delta / this.airDodge.durationMs;
    if (this.airDodge.progress >= 1) {
      this.airDodge.progress = 1;
      this.airDodge.active = false;
      this.player.lane = this.airDodge.endLane;
    }

    const t = this.airDodge.progress;
    const centerX = this.scale.width / 2;
    const endX = centerX + (this.airDodge.endLane - 1) * LANE_WIDTH;

    const linearX = Phaser.Math.Linear(this.airDodge.startX, endX, t);
    const arcOffset = Math.sin(t * Math.PI) * AIR_DODGE_ARC_HEIGHT;

    this.player.x = linearX + arcOffset * (this.airDodge.endLane > this.airDodge.startLane ? 1 : -1) * 0.3;
  }

  private updatePlayerPhysics(deltaSec: number): void {
    if (!this.player.isGrounded) {
      this.player.velocityY += GRAVITY * deltaSec;
      this.player.y += this.player.velocityY * deltaSec;

      if (this.player.velocityY > 0) {
        this.checkPlatformLanding();
      }
    } else {
      this.syncPlayerToNearestBeat();
    }

    if (!this.airDodge.active && this.player.isGrounded) {
      const centerX = this.scale.width / 2;
      this.player.x = centerX + (this.player.lane - 1) * LANE_WIDTH;
    }
  }

  private syncPlayerToNearestBeat(): void {
    const beatState = this.musicManager.getBeatState();
    const beatDurationMs = this.musicManager.getBeatDurationMs();
    const beatDurationSec = beatDurationMs / 1000;
    const distancePerBeat = this.trackSpeedUnitsPerSec * beatDurationSec;
    const pixelsPerUnit = 40;

    const baseY = this.trackBottom - 80;
    const offsetPixels = beatState.beatProgress * distancePerBeat * pixelsPerUnit;

    this.player.y = baseY - offsetPixels;
  }

  private checkPlatformLanding(): void {
    const playerBottom = this.player.y + 15;
    const playerCenterX = this.player.x;
    const currentLane = this.airDodge.active ? this.player.targetLane : this.player.lane;

    for (const platform of this.platforms) {
      if (platform.passed || platform.type === 'obstacle') continue;
      if (platform.lane !== currentLane && !this.airDodge.active) continue;

      const platformTop = platform.y;
      const platformLeft = platform.x - platform.width / 2;
      const platformRight = platform.x + platform.width / 2;

      const laneMatch = this.airDodge.active
        ? Math.abs(playerCenterX - platform.x) < platform.width / 2 + 30
        : (playerCenterX >= platformLeft && playerCenterX <= platformRight);

      if (this.player.velocityY > 0 &&
          playerBottom >= platformTop - 8 &&
          playerBottom <= platformTop + 30 &&
          laneMatch) {

        this.player.y = platformTop - 15;
        this.player.velocityY = 0;
        this.player.isGrounded = true;
        this.player.isJumping = false;
        this.player.canAirDodge = false;
        this.player.scale = 1.0;

        if (!platform.hit) {
          platform.hit = true;
          this.spawnLandingParticles(this.player.x, platformTop);
          this.playerLandingTween = { active: true, progress: 0 };
        }
        break;
      }
    }
  }

  private updatePlayerLandingTween(delta: number): void {
    if (!this.playerLandingTween.active) return;

    this.playerLandingTween.progress += delta / 100;
    if (this.playerLandingTween.progress >= 1) {
      this.playerLandingTween.active = false;
      this.playerLandingTween.progress = 0;
      this.player.scale = 1.0;
      return;
    }

    const t = this.playerLandingTween.progress;
    this.player.scale = 1.0 + Math.sin(t * Math.PI) * 0.15;
  }

  private updatePlatforms(deltaSec: number): void {
    const beatDurationSec = this.musicManager.getBeatDurationSec();
    const distancePerBeat = this.trackSpeedUnitsPerSec * beatDurationSec;
    const pixelsPerUnit = 40;
    const scrollPixelsPerSec = (this.trackSpeedUnitsPerSec * pixelsPerUnit) / beatDurationSec;
    const scrollAmount = scrollPixelsPerSec * deltaSec;

    for (const platform of this.platforms) {
      platform.y += scrollAmount;

      if (platform.y > this.trackBottom + 150 && !platform.passed) {
        platform.passed = true;
      }
    }

    this.platforms = this.platforms.filter(p => p.y < this.scale.height + 300);

    const beatState = this.musicManager.getBeatState();
    const currentBeat = beatState.currentBeat;

    const beatsToGenerateAhead = 40;
    for (let bi = currentBeat - 5; bi <= currentBeat + beatsToGenerateAhead; bi++) {
      if (bi >= 0) {
        this.createPlatformForBeat(bi, distancePerBeat, pixelsPerUnit);
      }
    }

    this.repositionPlatformsToBeats();
  }

  private repositionPlatformsToBeats(): void {
    const beatState = this.musicManager.getBeatState();
    const beatDurationSec = this.musicManager.getBeatDurationSec();
    const distancePerBeat = this.trackSpeedUnitsPerSec * beatDurationSec;
    const pixelsPerUnit = 40;
    const playerY = this.trackBottom - 80;

    for (const platform of this.platforms) {
      const beatDelta = platform.beatIndex - beatState.currentBeat - beatState.beatProgress;
      platform.y = playerY - beatDelta * distancePerBeat * pixelsPerUnit;

      const centerX = this.scale.width / 2;
      platform.x = centerX + (platform.lane - 1) * LANE_WIDTH;
    }
  }

  private updateParticles(deltaSec: number): void {
    for (const p of this.particles) {
      p.x += p.vx * deltaSec;
      p.y += p.vy * deltaSec;
      p.vy += 250 * deltaSec;
      p.life -= deltaSec;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updatePulseWaves(deltaSec: number): void {
    for (const wave of this.pulseWaves) {
      wave.life -= deltaSec * 2;
    }
    this.pulseWaves = this.pulseWaves.filter(w => w.life > 0);
  }

  private checkBeatSync(): void {
    const beatState = this.musicManager.getBeatState();

    if (beatState.currentBeat !== this.lastProcessedBeat && this.lastProcessedBeat >= 0) {
      if (this.player.isGrounded && this.lastHitBeat < beatState.currentBeat - 1) {
        if (!this.isCharging) {
          this.onBeatMiss();
          this.lastHitBeat = beatState.currentBeat - 1;
        }
      }
    }

    this.lastProcessedBeat = beatState.currentBeat;
  }

  private updateRedFlash(deltaSec: number): void {
    if (this.redFlashAlpha > 0) {
      this.redFlashAlpha -= deltaSec * 3;
      if (this.redFlashAlpha < 0) this.redFlashAlpha = 0;
    }
  }

  private render(): void {
    this.trackGraphics.clear();
    this.pulseGraphics.clear();
    this.particleGraphics.clear();
    this.playerSprite.clear();

    this.renderTrack();
    this.renderPlatforms();
    this.renderPulseWaves();
    this.renderParticles();
    this.renderPlayer();
    this.renderRedFlash();
  }

  private renderTrack(): void {
    const { width } = this.scale;
    const centerX = width / 2;
    const trackWidth = LANE_COUNT * LANE_WIDTH + 60;

    const beatState = this.musicManager.getBeatState();
    const beatGlow = 0.4 + Math.sin(beatState.beatProgress * Math.PI * 2) * 0.3;

    this.trackGraphics.lineStyle(3, 0x00FFFF, 0.5);
    this.trackGraphics.strokeRect(
      centerX - trackWidth / 2,
      this.trackTop + 20,
      trackWidth,
      this.trackBottom - this.trackTop - 40
    );

    this.trackGraphics.lineStyle(5, 0x00FFFF, beatGlow * 0.4);
    this.trackGraphics.strokeRect(
      centerX - trackWidth / 2 - 6,
      this.trackTop + 14,
      trackWidth + 12,
      this.trackBottom - this.trackTop - 28
    );

    this.trackGraphics.lineStyle(1, 0xFF00FF, 0.25);
    for (let lane = 0; lane < LANE_COUNT - 1; lane++) {
      const x = centerX - LANE_WIDTH + lane * LANE_WIDTH + LANE_WIDTH / 2;
      this.trackGraphics.beginPath();
      this.trackGraphics.moveTo(x, this.trackTop + 20);
      this.trackGraphics.lineTo(x, this.trackBottom - 20);
      this.trackGraphics.strokePath();
    }
  }

  private renderPlatforms(): void {
    const colors = THEME_COLORS[this.gameState.currentTheme];
    const beatState = this.musicManager.getBeatState();

    for (const platform of this.platforms) {
      if (platform.y < -150 || platform.y > this.scale.height + 200) continue;

      const beatDelta = platform.beatIndex - beatState.currentBeat;
      const depthFactor = Phaser.Math.Clamp(1 - Math.abs(beatDelta) * 0.1, 0.3, 1);

      const px = platform.x;
      const py = platform.y;
      const pw = platform.width * depthFactor;
      const ph = platform.height * depthFactor * 0.3;

      if (platform.type === 'obstacle') {
        this.trackGraphics.fillStyle(0xFF3366, 0.9 * depthFactor);
        this.trackGraphics.fillRect(px - pw / 2, py - ph - 15 * depthFactor, pw, ph + 25 * depthFactor);
        this.trackGraphics.lineStyle(2, 0xFF0066, 0.8 * depthFactor);
        this.trackGraphics.strokeRect(px - pw / 2, py - ph - 15 * depthFactor, pw, ph + 25 * depthFactor);
      } else if (platform.type === 'rotate') {
        const phase = Math.sin(this.time.now / 400 + platform.beatIndex * 0.5);
        const scaleW = 1 + phase * 0.25;
        const actualPw = pw * scaleW;

        this.trackGraphics.fillStyle(colors.platform, 0.85 * depthFactor);
        this.trackGraphics.fillRect(px - actualPw / 2, py - ph, actualPw, ph);
        this.trackGraphics.lineStyle(2, colors.accent, 0.9 * depthFactor);
        this.trackGraphics.strokeRect(px - actualPw / 2, py - ph, actualPw, ph);

        const glowAlpha = (0.3 + Math.abs(phase) * 0.4) * depthFactor;
        this.trackGraphics.fillStyle(colors.accent, glowAlpha);
        this.trackGraphics.fillRect(px - actualPw / 2 + 3, py - ph + 2, actualPw - 6, 3);
      } else {
        const isApproaching = Math.abs(beatDelta) <= 2;
        const fillColor = platform.hit ? colors.glow : (isApproaching ? colors.accent : colors.platform);
        const alpha = platform.hit ? 1 : (0.85 + (isApproaching ? beatState.beatProgress * 0.15 : 0));

        this.trackGraphics.fillStyle(fillColor, alpha * depthFactor);
        this.trackGraphics.fillRect(px - pw / 2, py - ph, pw, ph);

        this.trackGraphics.lineStyle(2, colors.accent, 0.75 * depthFactor);
        this.trackGraphics.strokeRect(px - pw / 2, py - ph, pw, ph);

        this.trackGraphics.fillStyle(0xFFFFFF, 0.35 * depthFactor);
        this.trackGraphics.fillRect(px - pw / 2 + 4, py - ph + 2, pw - 8, 3);

        if (isApproaching && !platform.hit) {
          const pulseAlpha = Math.sin(beatState.beatProgress * Math.PI) * 0.5;
          this.trackGraphics.lineStyle(3, 0xFFFFFF, pulseAlpha * depthFactor);
          this.trackGraphics.strokeRect(px - pw / 2 - 3, py - ph - 3, pw + 6, ph + 6);
        }
      }
    }
  }

  private renderPlayer(): void {
    const px = this.player.x;
    const py = this.player.y;
    const scale = this.player.scale;
    const size = 15;

    if (this.gameState.isFeverMode) {
      const glowIntensity = 0.4 + Math.sin(this.time.now / 80) * 0.3;
      this.playerSprite.fillStyle(0xFFD700, glowIntensity * 0.3);
      this.playerSprite.fillCircle(px, py, size * 2.5 * scale);

      this.playerSprite.lineStyle(2, 0xFFD700, glowIntensity * 0.6);
      this.playerSprite.strokeCircle(px, py, size * 2.2 * scale);
    }

    this.playerSprite.fillStyle(0x00FFFF, 1);
    this.playerSprite.fillCircle(px, py, size * scale);

    this.playerSprite.fillGradientStyle(
      0xFF00FF, 0xFF00FF,
      0x00FFFF, 0x00FFFF,
      0.7, 0.7, 0.9, 0.9
    );
    this.playerSprite.fillCircle(px, py - size * scale * 0.35, size * scale * 0.65);

    this.playerSprite.lineStyle(2, 0xFFFFFF, 0.85);
    this.playerSprite.strokeCircle(px, py, size * scale);

    this.playerSprite.fillStyle(0xFFFFFF, 0.75);
    this.playerSprite.fillCircle(px - size * 0.28, py - size * 0.28, size * scale * 0.25);

    if (this.isCharging && this.player.isGrounded) {
      const chargeRatio = Phaser.Math.Clamp(
        (this.jumpChargeMs - CHARGE_MIN_MS) / (CHARGE_MAX_MS - CHARGE_MIN_MS),
        0, 1
      );

      this.playerSprite.lineStyle(5, 0x00FF00, 0.9);
      this.playerSprite.beginPath();
      this.playerSprite.arc(px, py, size * scale + 12, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2);
      this.playerSprite.strokePath();

      if (chargeRatio > 0.95) {
        this.playerSprite.lineStyle(3, 0xFFFF00, 0.6 + Math.sin(this.time.now / 50) * 0.4);
        this.playerSprite.strokeCircle(px, py, size * scale + 18);
      }
    }

    if (this.airDodge.active) {
      const trailAlpha = 1 - this.airDodge.progress;
      this.playerSprite.fillStyle(0xFF00FF, trailAlpha * 0.3);
      this.playerSprite.fillCircle(
        this.airDodge.startX + (px - this.airDodge.startX) * (1 - this.airDodge.progress),
        py,
        size * scale * (1 + this.airDodge.progress * 0.3)
      );
    }
  }

  private renderParticles(): void {
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const currentSize = Phaser.Math.Linear(p.endSize, p.startSize, lifeRatio);
      const alpha = lifeRatio * 0.9;

      this.particleGraphics.fillStyle(p.color, alpha);
      this.particleGraphics.fillCircle(p.x, p.y, currentSize);

      this.particleGraphics.fillStyle(0xFFFFFF, alpha * 0.5);
      this.particleGraphics.fillCircle(p.x, p.y, currentSize * 0.4);
    }
  }

  private renderPulseWaves(): void {
    for (const wave of this.pulseWaves) {
      const lifeRatio = wave.life / wave.maxLife;

      const expansionPhase = lifeRatio > 0.5 ? 1 : lifeRatio * 2;
      const contractionPhase = lifeRatio <= 0.5 ? 0 : (lifeRatio - 0.5) * 2;

      const expandRadius = wave.maxRadius * Phaser.Math.Easing.Sine.Out(expansionPhase);
      const currentRadius = expandRadius * (1 - contractionPhase * 0.6);

      const alpha = lifeRatio * 0.7;
      const lineWidth = 2 + (1 - lifeRatio) * 3;

      this.pulseGraphics.lineStyle(lineWidth, wave.color, alpha);
      this.pulseGraphics.strokeCircle(wave.x, wave.y, currentRadius);

      this.pulseGraphics.lineStyle(lineWidth * 0.6, wave.color, alpha * 0.4);
      this.pulseGraphics.strokeCircle(wave.x, wave.y, currentRadius * 0.65);
    }
  }

  private renderRedFlash(): void {
    if (this.redFlashAlpha <= 0) return;
    const { width, height } = this.scale;
    this.playerSprite.fillStyle(0xFF0000, this.redFlashAlpha * 0.35);
    this.playerSprite.fillRect(0, 0, width, height);
  }

  private updateUI(): void {
    this.scoreText.setText(this.gameState.score.toString());

    if (this.gameState.combo > 1) {
      this.comboText.setText(`Combo: ${this.gameState.combo}`);
      this.comboText.setVisible(true);

      const pulse = 1 + Math.sin(this.time.now / 80) * 0.1;
      this.comboText.setScale(pulse);
    } else {
      this.comboText.setVisible(false);
    }

    let hearts = '';
    for (let i = 0; i < this.gameState.lives; i++) hearts += '♥';
    for (let i = this.gameState.lives; i < INITIAL_LIVES; i++) hearts += '♡';
    this.livesText.setText(hearts);

    this.bpmText.setText(`BPM: ${this.musicManager.getBpm()}`);
  }

  private gameOver(): void {
    this.gameState.gameOver = true;
    this.musicManager.stop();

    this.scene.start('GameOverScene', {
      score: this.gameState.score,
      maxCombo: this.gameState.maxCombo,
      unlockedThemes: this.gameState.unlockedThemes,
      settings: this.settings
    });
  }

  getMusicManager(): MusicManager {
    return this.musicManager;
  }

  getInputManager(): InputManager {
    return this.inputManager;
  }

  destroy(): void {
    if (this.musicManager) this.musicManager.destroy();
    if (this.inputManager) this.inputManager.destroy();
  }
}
