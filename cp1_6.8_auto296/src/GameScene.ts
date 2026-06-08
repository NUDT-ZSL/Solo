import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, GRAVITY, PLAYER_RADIUS, PLAYER_START_X, PLAYER_START_Y,
  SEGMENT_WIDTH, SEGMENT_HEIGHT, Polarity, COLORS,
  BASE_SCROLL_SPEED, JUMP_VELOCITY, REPEL_BOUNCE_VELOCITY, ATTRACT_STICK_DURATION,
  ATTRACT_BOOST_SPEED, OBSTACLE_WIDTH, OBSTACLE_HEIGHT,
  LIGHTNING_INTERVAL_MIN, LIGHTNING_INTERVAL_MAX,
  TRACK_Y_MIN, DIFFICULTY_INTERVAL,
  getScrollSpeed, getGapSize, getObstacleChance, getTrapChance, getBoostChance, getTrackYVariation,
} from './config';
import { Player } from './Player';
import { OrbitalSegment, SegmentType } from './OrbitalSegment';

interface ObstacleData {
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  active: boolean;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerVy: number = 0;
  private playerGrounded: boolean = false;
  private playerStuck: boolean = false;
  private stuckTimer: number = 0;
  private stuckSegment: OrbitalSegment | null = null;
  private stuckOffsetX: number = 0;

  private segments: OrbitalSegment[] = [];
  private obstacles: ObstacleData[] = [];
  private nextSegmentX: number = 0;
  private currentTrackY: number = PLAYER_START_Y + SEGMENT_HEIGHT / 2;
  private segmentPolarityToggle: boolean = false;

  private distance: number = 0;
  private highScore: number = 0;
  private scrollSpeed: number = BASE_SCROLL_SPEED;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private lightningGraphics!: Phaser.GameObjects.Graphics;
  private lightningTimer: number = 0;
  private lightningAlpha: number = 0;

  private distanceText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private polarityIcon!: Phaser.GameObjects.Container;
  private polarityLabel!: Phaser.GameObjects.Text;
  private polarityHint!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;

  private pauseOverlay!: Phaser.GameObjects.Container;
  private gameOverOverlay!: Phaser.GameObjects.Container;

  private keys!: { jump: Phaser.Input.Keyboard.Key; switch: Phaser.Input.Keyboard.Key };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.isGameOver = false;
    this.isPaused = false;
    this.distance = 0;
    this.playerVy = 0;
    this.playerGrounded = false;
    this.playerStuck = false;
    this.stuckTimer = 0;
    this.stuckSegment = null;
    this.segments = [];
    this.obstacles = [];
    this.nextSegmentX = 0;
    this.currentTrackY = PLAYER_START_Y + SEGMENT_HEIGHT / 2;
    this.segmentPolarityToggle = false;
    this.lightningAlpha = 0;
    this.lightningTimer = Phaser.Math.Between(LIGHTNING_INTERVAL_MIN, LIGHTNING_INTERVAL_MAX);

    this.highScore = parseInt(localStorage.getItem('magneticStormWalkerHighScore') || '0', 10);

    this.createBackground();
    this.createPlayer();
    this.generateInitialTrack();
    this.createUI();
    this.setupInput();

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.drawBackground();

    this.lightningGraphics = this.add.graphics();
    this.lightningGraphics.setDepth(1);
  }

  private drawBackground(): void {
    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(COLORS.BG_TOP, COLORS.BG_TOP, COLORS.BG_BOTTOM, COLORS.BG_BOTTOM, 1);
    this.bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 30; i++) {
      const sx = Phaser.Math.Between(0, GAME_WIDTH);
      const sy = Phaser.Math.Between(0, GAME_HEIGHT);
      const alpha = Math.random() * 0.3;
      this.bgGraphics.fillStyle(0xffffff, alpha);
      this.bgGraphics.fillCircle(sx, sy, Phaser.Math.Between(1, 2));
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, PLAYER_START_X, PLAYER_START_Y, (p) => {
      this.onPolarityChanged(p);
    });
    this.player.setDepth(10);
  }

  private onPolarityChanged(newPolarity: Polarity): void {
    this.updatePolarityUI(newPolarity);
  }

  private generateInitialTrack(): void {
    let x = 0;
    while (x < GAME_WIDTH + 400) {
      this.spawnSegment(x);
      x += SEGMENT_WIDTH;
    }
    this.nextSegmentX = x;
  }

  private spawnSegment(x: number): void {
    const dist = this.distance;
    const yVariation = getTrackYVariation(dist);

    if (this.segments.length > 0) {
      const lastSeg = this.segments[this.segments.length - 1];
      const deltaY = Phaser.Math.Between(-Math.floor(yVariation), Math.floor(yVariation));
      this.currentTrackY = Phaser.Math.Clamp(
        lastSeg.y + deltaY,
        TRACK_Y_MIN,
        GAME_HEIGHT - 100
      );
    }

    this.segmentPolarityToggle = !this.segmentPolarityToggle;
    const polarity = this.segmentPolarityToggle ? Polarity.Positive : Polarity.Negative;

    const gapSize = getGapSize(dist);
    const isGap = this.segments.length > 3 && Math.random() < 0.2 + (dist / DIFFICULTY_INTERVAL) * 0.01;

    if (isGap) {
      this.nextSegmentX += gapSize;
      x = this.nextSegmentX;
    }

    let segType = SegmentType.Normal;
    if (this.segments.length > 5) {
      const trapChance = getTrapChance(dist);
      const boostChance = getBoostChance(dist);
      const roll = Math.random();
      if (roll < trapChance) {
        segType = SegmentType.Trap;
      } else if (roll < trapChance + boostChance) {
        segType = SegmentType.Boost;
      }
    }

    const segment = new OrbitalSegment(this, x, this.currentTrackY, polarity, segType);
    segment.setDepth(5);
    this.segments.push(segment);

    if (segType === SegmentType.Normal && this.segments.length > 4) {
      const obsChance = getObstacleChance(dist);
      if (Math.random() < obsChance) {
        this.spawnObstacle(x, this.currentTrackY);
      }
    }

    this.nextSegmentX = x + SEGMENT_WIDTH;
  }

  private spawnObstacle(x: number, segmentY: number): void {
    const obsY = segmentY - SEGMENT_HEIGHT / 2 - OBSTACLE_HEIGHT / 2;
    const glow = this.add.rectangle(x, obsY, OBSTACLE_WIDTH + 6, OBSTACLE_HEIGHT + 6, COLORS.OBSTACLE_GLOW, 0.3);
    const rect = this.add.rectangle(x, obsY, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, COLORS.OBSTACLE, 1);
    glow.setDepth(6);
    rect.setDepth(7);

    this.tweens.add({
      targets: glow,
      alpha: 0.6,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.obstacles.push({ rect, glow, active: true });
  }

  private createUI(): void {
    const uiDepth = 100;

    this.distanceText = this.add.text(GAME_WIDTH / 2, 30, '0 m', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
      stroke: '#2d3436',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(uiDepth);

    this.highScoreText = this.add.text(GAME_WIDTH / 2, 62, `最高: ${this.highScore} m`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5).setDepth(uiDepth);

    this.polarityIcon = this.add.container(60, GAME_HEIGHT - 60).setDepth(uiDepth);
    const polarityBg = this.add.circle(0, 0, 24, COLORS.PLAYER_POSITIVE, 0.6);
    const polaritySymbol = this.add.text(0, 0, '+', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.polarityIcon.add([polarityBg, polaritySymbol]);
    this.polarityIcon.setData('bg', polarityBg);
    this.polarityIcon.setData('symbol', polaritySymbol);

    this.polarityHint = this.add.text(60, GAME_HEIGHT - 28, '[空格] 切换磁极', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5).setDepth(uiDepth);

    this.pauseBtn = this.add.container(GAME_WIDTH - 50, 40).setDepth(uiDepth);
    const pauseBg = this.add.rectangle(0, 0, 44, 44, 0x2d3436, 0.6);
    pauseBg.setStrokeStyle(2, 0x636e72);
    const pauseIcon1 = this.add.rectangle(-6, 0, 6, 20, 0xecf0f1, 0.9);
    const pauseIcon2 = this.add.rectangle(6, 0, 6, 20, 0xecf0f1, 0.9);
    this.pauseBtn.add([pauseBg, pauseIcon1, pauseIcon2]);
    this.pauseBtn.setSize(44, 44);
    this.pauseBtn.setInteractive();
    this.pauseBtn.on('pointerdown', () => this.togglePause());

    this.createPauseOverlay();
    this.createGameOverOverlay();
  }

  private updatePolarityUI(polarity: Polarity): void {
    const bg = this.polarityIcon.getData('bg') as Phaser.GameObjects.Arc;
    const symbol = this.polarityIcon.getData('symbol') as Phaser.GameObjects.Text;

    if (polarity === Polarity.Positive) {
      bg.setFillStyle(COLORS.PLAYER_POSITIVE, 0.6);
      symbol.setText('+');
    } else {
      bg.setFillStyle(COLORS.PLAYER_NEGATIVE, 0.6);
      symbol.setText('−');
    }

    this.tweens.add({
      targets: this.polarityIcon,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private createPauseOverlay(): void {
    this.pauseOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200).setVisible(false);

    const overlayBg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);
    this.pauseOverlay.add(overlayBg);

    const panel = this.add.rectangle(0, 0, 300, 220, 0x2d3436, 0.85);
    panel.setStrokeStyle(2, 0x636e72);
    this.pauseOverlay.add(panel);

    const blurFx = panel.postFX?.addBlur?.(0, 2, 2, 2, 0x1a1a2e);

    const title = this.add.text(0, -70, '暂停', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.pauseOverlay.add(title);

    const resumeBtn = this.add.rectangle(0, -10, 200, 44, 0x6c5ce7, 0.9);
    resumeBtn.setInteractive();
    const resumeText = this.add.text(0, -10, '继续', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    resumeBtn.on('pointerdown', () => this.togglePause());
    this.pauseOverlay.add([resumeBtn, resumeText]);

    const restartBtn = this.add.rectangle(0, 50, 200, 44, 0xe17055, 0.9);
    restartBtn.setInteractive();
    const restartText = this.add.text(0, 50, '重新开始', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    restartBtn.on('pointerdown', () => this.restartGame());
    this.pauseOverlay.add([restartBtn, restartText]);
  }

  private createGameOverOverlay(): void {
    this.gameOverOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200).setVisible(false);

    const overlayBg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    this.gameOverOverlay.add(overlayBg);

    const panel = this.add.rectangle(0, 0, 340, 280, 0x2d3436, 0.9);
    panel.setStrokeStyle(2, 0xe17055);
    this.gameOverOverlay.add(panel);

    const title = this.add.text(0, -100, '磁暴消散', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff7675',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverOverlay.add(title);

    const distLabel = this.add.text(0, -45, '距离', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5);
    this.gameOverOverlay.add(distLabel);

    const distValue = this.add.text(0, -15, '0 m', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverOverlay.setData('distValue', distValue);
    this.gameOverOverlay.add(distValue);

    const highLabel = this.add.text(0, 30, '最高纪录', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5);
    this.gameOverOverlay.add(highLabel);

    const highValue = this.add.text(0, 58, `${this.highScore} m`, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffeaa7',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverOverlay.setData('highValue', highValue);
    this.gameOverOverlay.add(highValue);

    const retryBtn = this.add.rectangle(0, 105, 200, 44, 0x6c5ce7, 0.9);
    retryBtn.setInteractive();
    const retryText = this.add.text(0, 105, '再来一次', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    retryBtn.on('pointerdown', () => this.restartGame());
    this.gameOverOverlay.add([retryBtn, retryText]);
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.keys = {
        jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        switch: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };

      this.input.keyboard.on('keydown-UP', () => this.handleJump());
      this.input.keyboard.on('keydown-W', () => this.handleJump());
      this.input.keyboard.on('keydown-SPACE', () => this.handleSwitch());
      this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }
  }

  private handleJump(): void {
    if (this.isPaused || this.isGameOver) return;
    if (this.playerGrounded || this.playerStuck) {
      this.playerVy = JUMP_VELOCITY;
      this.playerGrounded = false;
      this.playerStuck = false;
      this.stuckSegment = null;
      this.player.setGrounded(false);

      this.tweens.add({
        targets: this.player,
        scaleX: 0.85,
        scaleY: 1.15,
        duration: 80,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }
  }

  private handleSwitch(): void {
    if (this.isPaused || this.isGameOver) return;
    this.player.switchPolarity(this.time.now);
  }

  private togglePause(): void {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    this.pauseOverlay.setVisible(this.isPaused);
    if (this.isPaused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  private restartGame(): void {
    this.scene.restart();
  }

  update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver) return;

    this.scrollSpeed = getScrollSpeed(this.distance);
    const dt = delta / 1000;

    this.updateLightning(delta);
    this.updateSegments(delta, dt);
    this.updatePlayerPhysics(delta, dt);
    this.checkCollisions();
    this.updateDistance(dt);
    this.cleanupOffscreen();
    this.generateNewSegments();
    this.updateUI();
  }

  private updateLightning(delta: number): void {
    this.lightningTimer -= delta;
    if (this.lightningTimer <= 0) {
      this.lightningAlpha = 0.7 + Math.random() * 0.3;
      this.drawLightningBolt();
      this.lightningTimer = Phaser.Math.Between(LIGHTNING_INTERVAL_MIN, LIGHTNING_INTERVAL_MAX);
    }

    if (this.lightningAlpha > 0) {
      this.lightningAlpha -= delta * 0.004;
      if (this.lightningAlpha < 0) this.lightningAlpha = 0;
    }

    this.lightningGraphics.setAlpha(this.lightningAlpha);
  }

  private drawLightningBolt(): void {
    this.lightningGraphics.clear();
    this.lightningGraphics.lineStyle(2, COLORS.LIGHTNING, 0.8);

    let x = Phaser.Math.Between(GAME_WIDTH * 0.2, GAME_WIDTH * 0.8);
    let y = 0;

    while (y < GAME_HEIGHT * 0.7) {
      const newX = x + Phaser.Math.Between(-30, 30);
      const newY = y + Phaser.Math.Between(20, 60);
      this.lightningGraphics.lineBetween(x, y, newX, newY);
      x = newX;
      y = newY;

      if (Math.random() < 0.3) {
        const bx = x + Phaser.Math.Between(-40, 40);
        const by = y + Phaser.Math.Between(10, 30);
        this.lightningGraphics.lineBetween(x, y, bx, by);
      }
    }
  }

  private updateSegments(delta: number, dt: number): void {
    for (const seg of this.segments) {
      seg.x -= this.scrollSpeed * dt;
      seg.updateFieldAnimation(delta);
    }

    for (const obs of this.obstacles) {
      if (obs.active) {
        obs.rect.x -= this.scrollSpeed * dt;
        obs.glow.x -= this.scrollSpeed * dt;
      }
    }
  }

  private updatePlayerPhysics(delta: number, dt: number): void {
    if (this.playerStuck && this.stuckSegment) {
      this.player.x = this.stuckSegment.x + this.stuckOffsetX;
      this.player.y = this.stuckSegment.y - SEGMENT_HEIGHT / 2 - PLAYER_RADIUS;
      this.stuckTimer -= delta;
      if (this.stuckTimer <= 0) {
        this.playerStuck = false;
        this.stuckSegment = null;
        this.playerVy = -100;
        this.player.setGrounded(false);
      }
      return;
    }

    this.playerVy += GRAVITY * dt;
    this.player.y += this.playerVy * dt;

    if (this.playerGrounded) {
      this.playerVy = 0;
    }

    this.player.updatePlayer(delta, this.scrollSpeed);
  }

  private checkCollisions(): void {
    if (this.playerStuck) return;

    const px = this.player.x;
    const py = this.player.y;
    const pr = PLAYER_RADIUS;
    const playerPolarity = this.player.getPolarity();

    this.playerGrounded = false;

    for (const seg of this.segments) {
      const sx = seg.x;
      const sy = seg.y;
      const hw = SEGMENT_WIDTH / 2;
      const hh = SEGMENT_HEIGHT / 2;

      const closestX = Phaser.Math.Clamp(px, sx - hw, sx + hw);
      const closestY = Phaser.Math.Clamp(py, sy - hh, sy + hh);
      const distX = px - closestX;
      const distY = py - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < pr * pr) {
        const segPolarity = seg.getPolarity();

        if (seg.getType() === SegmentType.Trap) {
          if (segPolarity !== playerPolarity) {
            this.triggerGameOver();
            return;
          }
        }

        if (seg.getType() === SegmentType.Boost) {
          this.scrollSpeed += ATTRACT_BOOST_SPEED;
          this.playerStuck = true;
          this.stuckTimer = ATTRACT_STICK_DURATION * 0.6;
          this.stuckSegment = seg;
          this.stuckOffsetX = px - seg.x;
          this.playerVy = 0;
          this.player.stickToSegment(ATTRACT_STICK_DURATION * 0.6);
          return;
        }

        if (segPolarity === playerPolarity) {
          if (this.playerVy >= 0) {
            this.playerStuck = true;
            this.stuckTimer = ATTRACT_STICK_DURATION;
            this.stuckSegment = seg;
            this.stuckOffsetX = px - seg.x;
            this.playerVy = 0;
            this.player.stickToSegment();
            this.player.setGrounded(true);
            return;
          }
        } else {
          if (this.playerVy >= 0 && py < sy) {
            this.playerGrounded = true;
            this.playerVy = 0;
            this.player.y = sy - hh - pr;
            this.player.setGrounded(true);
            return;
          } else if (py > sy - hh && this.playerVy < 0) {
            // No action on bottom hit for simplicity
          } else {
            this.playerVy = REPEL_BOUNCE_VELOCITY;
            this.player.setGrounded(false);
            return;
          }
        }
      }
    }

    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      const ox = obs.rect.x;
      const oy = obs.rect.y;
      const ohw = OBSTACLE_WIDTH / 2;
      const ohh = OBSTACLE_HEIGHT / 2;

      const closestX = Phaser.Math.Clamp(px, ox - ohw, ox + ohw);
      const closestY = Phaser.Math.Clamp(py, oy - ohh, oy + ohh);
      const distX = px - closestX;
      const distY = py - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < pr * pr) {
        this.triggerGameOver();
        return;
      }
    }

    if (py > GAME_HEIGHT + 100) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    this.isGameOver = true;

    const distM = Math.floor(this.distance);
    if (distM > this.highScore) {
      this.highScore = distM;
      localStorage.setItem('magneticStormWalkerHighScore', String(this.highScore));
    }

    const dv = this.gameOverOverlay.getData('distValue') as Phaser.GameObjects.Text;
    const hv = this.gameOverOverlay.getData('highValue') as Phaser.GameObjects.Text;
    dv.setText(`${distM} m`);
    hv.setText(`${this.highScore} m`);

    this.gameOverOverlay.setVisible(true);

    this.cameras.main.shake(300, 0.015);

    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 400,
      ease: 'Power2',
    });
  }

  private updateDistance(dt: number): void {
    this.distance += this.scrollSpeed * dt / 50;
  }

  private cleanupOffscreen(): void {
    this.segments = this.segments.filter((seg) => {
      if (seg.x < -SEGMENT_WIDTH) {
        seg.destroy();
        return false;
      }
      return true;
    });

    this.obstacles = this.obstacles.filter((obs) => {
      if (obs.rect.x < -OBSTACLE_WIDTH) {
        obs.rect.destroy();
        obs.glow.destroy();
        return false;
      }
      return true;
    });
  }

  private generateNewSegments(): void {
    while (this.nextSegmentX > PLAYER_START_X + GAME_WIDTH * 0.5) {
      // Already have enough
      break;
    }
    while (this.nextSegmentX < PLAYER_START_X + GAME_WIDTH + 400) {
      this.spawnSegment(this.nextSegmentX);
    }
  }

  private updateUI(): void {
    const distM = Math.floor(this.distance);
    this.distanceText.setText(`${distM} m`);

    if (distM > this.highScore) {
      this.highScoreText.setText(`最高: ${distM} m ★`);
      this.highScoreText.setColor('#ffeaa7');
    }
  }
}
