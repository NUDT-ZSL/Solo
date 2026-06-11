import Phaser from 'phaser';
import { MusicManager } from '../managers/MusicManager';
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
const JUMP_MIN_FORCE = 250;
const JUMP_MAX_FORCE = 500;
const CHARGE_MIN_TIME = 200;
const CHARGE_MAX_TIME = 800;
const BASE_SCROLL_SPEED = 10;
const SPEED_INCREMENT = 0.5;
const SPEED_INCREMENT_INTERVAL = 30000;
const LANE_COUNT = 3;
const LANE_WIDTH = 120;
const INITIAL_LIVES = 5;
const FEVER_COMBO_THRESHOLD = 10;
const BEAT_HIT_SCORE = 10;
const BEAT_MISS_DAMAGE = 5;

export class BeatScene extends Phaser.Scene {
  private musicManager!: MusicManager;
  private inputManager!: InputManager;
  private settings: GameSettings;

  private gameState!: GameState;
  private player!: PlayerState;
  private platforms: PlatformData[] = [];
  private platformIdCounter: number = 0;

  private scrollSpeed: number = BASE_SCROLL_SPEED;
  private speedTimer: number = 0;
  private gameTime: number = 0;

  private trackGraphics!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Graphics;
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private pulseGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private bpmText!: Phaser.GameObjects.Text;
  private feverText!: Phaser.GameObjects.Text;

  private particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[] = [];
  private pulseWaves: { x: number; y: number; radius: number; maxRadius: number; life: number; maxLife: number }[] = [];

  private cameraY: number = 0;
  private lastBeatIndex: number = -1;
  private shakeAmount: number = 0;
  private redFlash: number = 0;

  private trackTop: number = 0;
  private trackBottom: number = 0;
  private infoBarHeight: number = 0;

  private laneChangeTween: number = 0;
  private isLaneChanging: boolean = false;

  private beatHitPending: boolean = false;
  private lastHitBeat: number = -1;

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
      y: this.trackBottom - 100,
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

    this.scrollSpeed = BASE_SCROLL_SPEED * this.settings.scrollSpeed;
    this.gameTime = 0;
    this.speedTimer = 0;
  }

  private createGraphics(): void {
    this.trackGraphics = this.add.graphics();
    this.particleGraphics = this.add.graphics();
    this.pulseGraphics = this.add.graphics();
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

    this.comboText = this.add.text(width - 20, this.trackBottom + 55, 'Combo: 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '16px',
      color: '#FF00FF'
    }).setOrigin(1, 0).setScrollFactor(0);

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
      1
    );
    this.uiGraphics.fillRect(0, this.trackBottom, width, this.infoBarHeight);

    this.uiGraphics.lineStyle(2, 0x00FFFF, 0.5);
    this.uiGraphics.strokeRect(2, this.trackBottom + 2, width - 4, this.infoBarHeight - 4);

    this.uiGraphics.lineStyle(3, 0x00FFFF, 0.3);
    this.uiGraphics.strokeRect(0, this.trackBottom, width, this.infoBarHeight);
  }

  private generateInitialPlatforms(): void {
    this.platforms = [];
    const beatDuration = this.musicManager.getBeatDuration();
    const platformSpacing = (this.scrollSpeed * beatDuration) / 1000;

    for (let i = 0; i < 30; i++) {
      this.createPlatform(i, platformSpacing);
    }
  }

  private createPlatform(beatIndex: number, spacing: number): void {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const rand = Math.random();
    let type: PlatformData['type'] = 'normal';

    if (beatIndex > 5) {
      if (rand < 0.15) type = 'obstacle';
      else if (rand < 0.25) type = 'high';
      else if (rand < 0.30) type = 'low';
      else if (rand < 0.35) type = 'rotate';
    }

    const centerX = this.scale.width / 2;
    const laneOffset = (lane - 1) * LANE_WIDTH;

    const platform: PlatformData = {
      id: this.platformIdCounter++,
      beatIndex,
      x: centerX + laneOffset,
      y: this.trackBottom - 50 - beatIndex * spacing,
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
      this.startJumpCharge();
    });

    this.inputManager.setOnJumpReleaseCallback(() => {
      if (this.gameState.gameOver || this.gameState.isPaused) return;
      this.executeJump();
    });

    this.input.keyboard!.on('keydown-A', () => this.tryAirDodge(-1), this);
    this.input.keyboard!.on('keydown-LEFT', () => this.tryAirDodge(-1), this);
    this.input.keyboard!.on('keydown-D', () => this.tryAirDodge(1), this);
    this.input.keyboard!.on('keydown-RIGHT', () => this.tryAirDodge(1), this);
  }

  private startJumpCharge(): void {
    if (this.player.isGrounded && !this.player.isJumping) {
      this.player.jumpCharge = 0;
    }
  }

  private executeJump(): void {
    if (!this.player.isGrounded && this.player.canAirDodge) {
      return;
    }

    if (!this.player.isGrounded) return;

    const holdDuration = this.inputManager.getHoldDuration();
    const chargeRatio = Phaser.Math.Clamp(
      (holdDuration - CHARGE_MIN_TIME) / (CHARGE_MAX_TIME - CHARGE_MIN_TIME),
      0, 1
    );

    const jumpForce = JUMP_MIN_FORCE + (JUMP_MAX_FORCE - JUMP_MIN_FORCE) * chargeRatio;
    this.player.velocityY = -jumpForce;
    this.player.isGrounded = false;
    this.player.isJumping = true;
    this.player.canAirDodge = true;

    this.tweens.add({
      targets: this.player,
      scale: { from: 0.8, to: 1.2 },
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.player.scale = 1.0;
      }
    });

    const beatState = this.musicManager.getBeatState(this.time.now);
    if (beatState.isNearBeat) {
      this.checkBeatHit();
    }
  }

  private tryAirDodge(direction: number): void {
    if (this.player.isGrounded || !this.player.canAirDodge || this.isLaneChanging) return;

    const newLane = this.player.targetLane + direction;
    if (newLane < 0 || newLane >= LANE_COUNT) return;

    this.player.targetLane = newLane;
    this.player.canAirDodge = false;
    this.isLaneChanging = true;
    this.laneChangeTween = 0;
  }

  private checkBeatHit(): void {
    const result = this.musicManager.checkBeatHit(this.time.now);
    const nearestBeat = Math.round(
      this.musicManager.getElapsedTime(this.time.now) / this.musicManager.getBeatDuration()
    );

    if (nearestBeat === this.lastHitBeat) return;

    if (result.hit) {
      this.onBeatHit(result.accuracy);
      this.lastHitBeat = nearestBeat;
    } else if (Math.abs(result.offset) < 150) {
      this.onBeatMiss();
      this.lastHitBeat = nearestBeat;
    }
  }

  private onBeatHit(accuracy: number): void {
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

    this.redFlash = 1;
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
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15 + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 1,
        maxLife: 1,
        color: 0x00FF88,
        size: 6 + Math.random() * 4
      });
    }
  }

  private spawnMissParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const speed = 30 + Math.random() * 50;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 1,
        maxLife: 1,
        color: 0xFF3333,
        size: 5 + Math.random() * 3
      });
    }
  }

  private spawnLandingParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
      const speed = 20 + Math.random() * 40;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 0.8,
        maxLife: 0.8,
        color: 0x888888,
        size: 3 + Math.random() * 3
      });
    }
  }

  private spawnPulseWave(x: number, y: number): void {
    this.pulseWaves.push({
      x, y,
      radius: 10,
      maxRadius: 200,
      life: 1,
      maxLife: 1
    });
  }

  update(time: number, delta: number): void {
    if (this.gameState.gameOver || this.gameState.isPaused) return;

    const deltaSec = delta / 1000;
    this.gameTime += delta;
    this.inputManager.update(time);

    this.updateSpeed(delta);
    this.updatePlayer(deltaSec);
    this.updatePlatforms(deltaSec);
    this.updateParticles(deltaSec);
    this.updatePulseWaves(deltaSec);
    this.updateBeatSync(time);
    this.updateLaneChange(deltaSec);
    this.updateRedFlash(deltaSec);

    this.render();
  }

  private updateSpeed(delta: number): void {
    this.speedTimer += delta;
    if (this.speedTimer >= SPEED_INCREMENT_INTERVAL) {
      this.speedTimer -= SPEED_INCREMENT_INTERVAL;
      this.scrollSpeed += SPEED_INCREMENT * this.settings.scrollSpeed;
    }
  }

  private updatePlayer(deltaSec: number): void {
    if (!this.player.isGrounded) {
      this.player.velocityY += GRAVITY * deltaSec;
      this.player.y += this.player.velocityY * deltaSec;

      if (this.player.velocityY > 0) {
        this.checkPlatformCollision();
      }
    }

    const beatDuration = this.musicManager.getBeatDuration();
    const beatProgress = this.musicManager.getBeatState(this.time.now).beatProgress;

    const targetY = this.trackBottom - 80 - beatProgress * (this.scrollSpeed * beatDuration / 1000);

    if (this.player.isGrounded) {
      this.player.y = targetY;
    }
  }

  private checkPlatformCollision(): void {
    const playerBottom = this.player.y + 15;
    const playerCenterX = this.player.x;

    for (const platform of this.platforms) {
      if (platform.passed || platform.type === 'obstacle') continue;

      const platformTop = platform.y;
      const platformLeft = platform.x - platform.width / 2;
      const platformRight = platform.x + platform.width / 2;

      if (this.player.velocityY > 0 &&
          playerBottom >= platformTop - 5 &&
          playerBottom <= platformTop + 20 &&
          playerCenterX >= platformLeft &&
          playerCenterX <= platformRight &&
          this.player.lane === platform.lane) {

        this.player.y = platformTop - 15;
        this.player.velocityY = 0;
        this.player.isGrounded = true;
        this.player.isJumping = false;
        this.player.canAirDodge = false;
        this.player.scale = 1.0;

        if (!platform.hit) {
          platform.hit = true;
          this.spawnLandingParticles(this.player.x, platformTop);
          this.tweens.add({
            targets: this.player,
            scale: { from: 1.2, to: 1.0 },
            duration: 100,
            ease: 'Elastic.out'
          });
        }
        break;
      }
    }
  }

  private updatePlatforms(deltaSec: number): void {
    const scrollAmount = this.scrollSpeed * deltaSec * 60;

    for (const platform of this.platforms) {
      platform.y += scrollAmount;

      if (platform.y > this.trackBottom + 100 && !platform.passed) {
        platform.passed = true;

        if (!platform.hit && platform.type !== 'obstacle' && platform.beatIndex > 2) {
          const beatState = this.musicManager.getBeatState(this.time.now);
          if (!beatState.isNearBeat && this.lastHitBeat !== platform.beatIndex) {
            this.onBeatMiss();
            this.lastHitBeat = platform.beatIndex;
          }
        }
      }
    }

    this.platforms = this.platforms.filter(p => p.y < this.scale.height + 200);

    const topPlatform = this.platforms.reduce(
      (min, p) => p.beatIndex < min.beatIndex ? p : min,
      this.platforms[0]
    );

    if (topPlatform && topPlatform.beatIndex < this.lastHitBeat + 30) {
      const beatDuration = this.musicManager.getBeatDuration();
      const platformSpacing = (this.scrollSpeed * beatDuration) / 1000;

      for (let i = 0; i < 5; i++) {
        const newBeatIndex = topPlatform.beatIndex - 1 - i;
        if (newBeatIndex >= 0 && !this.platforms.some(p => p.beatIndex === newBeatIndex)) {
          const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
          const rand = Math.random();
          let type: PlatformData['type'] = 'normal';

          if (newBeatIndex > 5) {
            if (rand < 0.15) type = 'obstacle';
            else if (rand < 0.25) type = 'high';
            else if (rand < 0.30) type = 'low';
            else if (rand < 0.35) type = 'rotate';
          }

          const centerX = this.scale.width / 2;
          const laneOffset = (lane - 1) * LANE_WIDTH;

          this.platforms.push({
            id: this.platformIdCounter++,
            beatIndex: newBeatIndex,
            x: centerX + laneOffset,
            y: topPlatform.y - (i + 1) * platformSpacing,
            z: newBeatIndex,
            lane,
            type,
            width: type === 'obstacle' ? 80 : 100,
            height: type === 'high' ? 60 : type === 'low' ? 20 : 40,
            passed: false,
            hit: false
          });
        }
      }
    }
  }

  private updateParticles(deltaSec: number): void {
    for (const p of this.particles) {
      p.x += p.vx * deltaSec;
      p.y += p.vy * deltaSec;
      p.vy += 200 * deltaSec;
      p.life -= deltaSec;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updatePulseWaves(deltaSec: number): void {
    for (const wave of this.pulseWaves) {
      const progress = 1 - wave.life / wave.maxLife;
      wave.radius = wave.maxRadius * progress;
      wave.life -= deltaSec * 2;
    }
    this.pulseWaves = this.pulseWaves.filter(w => w.life > 0);
  }

  private updateBeatSync(time: number): void {
    const beatState = this.musicManager.getBeatState(time);

    if (beatState.currentBeat !== this.lastBeatIndex) {
      if (beatState.currentBeat > this.lastBeatIndex && this.lastBeatIndex >= 0) {
        if (this.player.isGrounded && this.lastHitBeat !== beatState.currentBeat - 1) {
        }
      }
      this.lastBeatIndex = beatState.currentBeat;
    }
  }

  private updateLaneChange(deltaSec: number): void {
    if (!this.isLaneChanging) return;

    this.laneChangeTween += deltaSec * 5;
    if (this.laneChangeTween >= 1) {
      this.laneChangeTween = 1;
      this.isLaneChanging = false;
      this.player.lane = this.player.targetLane;
    }

    const startLane = this.player.lane;
    const endLane = this.player.targetLane;
    const t = this.laneChangeTween;

    const arcHeight = 30;
    const verticalOffset = Math.sin(t * Math.PI) * arcHeight;

    const currentLane = startLane + (endLane - startLane) * t;
    const centerX = this.scale.width / 2;
    this.player.x = centerX + (currentLane - 1) * LANE_WIDTH;
  }

  private updateRedFlash(deltaSec: number): void {
    if (this.redFlash > 0) {
      this.redFlash -= deltaSec * 3;
      if (this.redFlash < 0) this.redFlash = 0;
    }
  }

  private render(): void {
    this.trackGraphics.clear();
    this.playerSprite.clear();
    this.particleGraphics.clear();
    this.pulseGraphics.clear();

    this.renderTrack();
    this.renderPlatforms();
    this.renderParticles();
    this.renderPulseWaves();
    this.renderPlayer();
    this.renderRedFlash();
  }

  private renderTrack(): void {
    const { width } = this.scale;
    const centerX = width / 2;

    const trackWidth = LANE_COUNT * LANE_WIDTH + 40;

    this.trackGraphics.lineStyle(3, 0x00FFFF, 0.6);
    this.trackGraphics.strokeRect(
      centerX - trackWidth / 2,
      this.trackTop + 20,
      trackWidth,
      this.trackBottom - this.trackTop - 40
    );

    this.trackGraphics.lineStyle(1, 0xFF00FF, 0.3);
    for (let lane = 0; lane < LANE_COUNT - 1; lane++) {
      const x = centerX - LANE_WIDTH + lane * LANE_WIDTH + LANE_WIDTH / 2;
      this.trackGraphics.beginPath();
      this.trackGraphics.moveTo(x, this.trackTop + 20);
      this.trackGraphics.lineTo(x, this.trackBottom - 20);
      this.trackGraphics.strokePath();
    }

    const beatState = this.musicManager.getBeatState(this.time.now);
    const beatGlowIntensity = 0.3 + Math.sin(beatState.beatProgress * Math.PI * 2) * 0.2;

    this.trackGraphics.lineStyle(4, 0x00FFFF, beatGlowIntensity);
    this.trackGraphics.strokeRect(
      centerX - trackWidth / 2 - 4,
      this.trackTop + 16,
      trackWidth + 8,
      this.trackBottom - this.trackTop - 32
    );
  }

  private renderPlatforms(): void {
    const colors = THEME_COLORS[this.gameState.currentTheme];

    for (const platform of this.platforms) {
      if (platform.y < -100 || platform.y > this.scale.height + 100) continue;

      const depth = 1 - (platform.y - this.trackTop) / (this.trackBottom - this.trackTop);
      const scale = 0.5 + depth * 0.5;

      const px = platform.x;
      const py = platform.y;
      const pw = platform.width * scale;
      const ph = platform.height * scale * 0.3;

      if (platform.type === 'obstacle') {
        this.trackGraphics.fillStyle(0xFF3366, 0.9);
        this.trackGraphics.fillRect(px - pw / 2, py - ph, pw, ph + 20 * scale);

        this.trackGraphics.lineStyle(2, 0xFF0066, 0.8);
        this.trackGraphics.strokeRect(px - pw / 2, py - ph, pw, ph + 20 * scale);
      } else if (platform.type === 'rotate') {
        const rotationPhase = Math.sin(this.time.now / 500 + platform.beatIndex);
        const scaleW = 1 + rotationPhase * 0.2;
        const actualPw = pw * scaleW;
        this.trackGraphics.fillStyle(colors.platform, 0.8);
        this.trackGraphics.fillRect(px - actualPw / 2, py - ph, actualPw, ph);
        this.trackGraphics.lineStyle(2, colors.accent, 0.9);
        this.trackGraphics.strokeRect(px - actualPw / 2, py - ph, actualPw, ph);
        const glowAlpha = 0.3 + Math.abs(rotationPhase) * 0.3;
        this.trackGraphics.fillStyle(colors.accent, glowAlpha);
        this.trackGraphics.fillRect(px - actualPw / 2 + 2, py - ph + 2, actualPw - 4, 3);
      } else {
        const fillColor = platform.hit ? colors.glow : colors.platform;
        const alpha = platform.hit ? 1 : 0.85;

        this.trackGraphics.fillStyle(fillColor, alpha);
        this.trackGraphics.fillRect(px - pw / 2, py - ph, pw, ph);

        this.trackGraphics.lineStyle(2, colors.accent, 0.7);
        this.trackGraphics.strokeRect(px - pw / 2, py - ph, pw, ph);

        this.trackGraphics.fillStyle(0xFFFFFF, 0.3);
        this.trackGraphics.fillRect(px - pw / 2 + 4, py - ph + 2, pw - 8, 4);
      }
    }
  }

  private renderPlayer(): void {
    const px = this.player.x;
    const py = this.player.y;
    const scale = this.player.scale;
    const size = 15;

    if (this.gameState.isFeverMode) {
      const glowIntensity = 0.5 + Math.sin(this.time.now / 100) * 0.3;
      this.playerSprite.fillStyle(0xFFD700, glowIntensity * 0.3);
      this.playerSprite.fillCircle(px, py, size * 2 * scale);
    }

    this.playerSprite.fillStyle(0x00FFFF, 1);
    this.playerSprite.fillCircle(px, py, size * scale);

    this.playerSprite.fillGradientStyle(
      0xFF00FF, 0xFF00FF,
      0x00FFFF, 0x00FFFF,
      0.8, 0.8, 0.8, 0.8
    );
    this.playerSprite.fillCircle(px, py - size * scale * 0.3, size * scale * 0.7);

    this.playerSprite.lineStyle(2, 0xFFFFFF, 0.8);
    this.playerSprite.strokeCircle(px, py, size * scale);

    this.playerSprite.fillStyle(0xFFFFFF, 0.6);
    this.playerSprite.fillCircle(px - 4, py - 4, 4 * scale);

    if (this.inputManager.isJumpHeld() && this.player.isGrounded) {
      const holdDuration = this.inputManager.getHoldDuration();
      const chargeRatio = Phaser.Math.Clamp(
        (holdDuration - CHARGE_MIN_TIME) / (CHARGE_MAX_TIME - CHARGE_MIN_TIME),
        0, 1
      );

      this.playerSprite.lineStyle(4, 0x00FF00, 0.8);
      this.playerSprite.beginPath();
      this.playerSprite.arc(px, py, size * scale + 8, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2);
      this.playerSprite.strokePath();
    }
  }

  private renderParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * alpha;

      this.particleGraphics.fillStyle(p.color, alpha);
      this.particleGraphics.fillCircle(p.x, p.y, size);
    }
  }

  private renderPulseWaves(): void {
    for (const wave of this.pulseWaves) {
      const alpha = wave.life / wave.maxLife;
      const color = this.gameState.isFeverMode ? 0xFFD700 : 0x00FFFF;

      this.pulseGraphics.lineStyle(3, color, alpha * 0.6);
      this.pulseGraphics.strokeCircle(wave.x, wave.y, wave.radius);

      this.pulseGraphics.lineStyle(2, color, alpha * 0.3);
      this.pulseGraphics.strokeCircle(wave.x, wave.y, wave.radius * 0.7);
    }
  }

  private renderRedFlash(): void {
    if (this.redFlash > 0) {
      const { width, height } = this.scale;
      this.playerSprite.fillStyle(0xFF0000, this.redFlash * 0.3);
      this.playerSprite.fillRect(0, 0, width, height);
    }
  }

  private updateUI(): void {
    this.scoreText.setText(this.gameState.score.toString());

    if (this.gameState.combo > 0) {
      this.comboText.setText(`Combo: ${this.gameState.combo}`);
      this.comboText.setVisible(true);
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
