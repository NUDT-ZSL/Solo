import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, TRACK_SPEED, BEAT_INTERVAL, TRACK_Y_BASE, TRACK_AMPLITUDE,
  PLAYER_SIZE, PLAYER_JUMP_VELOCITY, PLAYER_GRAVITY, PLAYER_TRAIL_LENGTH,
  OBSTACLE_NOTE_SIZE, OBSTACLE_PILLAR_WIDTH, OBSTACLE_PILLAR_HEIGHT,
  BEAT_POINT_RADIUS, BEAT_HIT_WINDOW,
  SCORE_PERFECT, SCORE_GOOD, SCORE_MISS, COMBO_MAX, RESONANCE_DURATION,
  COLOR_BLUE_PURPLE, COLOR_CYAN_GREEN, COLOR_WARM_PINK, COLOR_GOLD,
  PARTICLE_COUNT_BURST, TUTORIAL_TEXT,
} from '../config';

interface BeatPoint {
  container: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Graphics;
  hit: boolean;
  missed: boolean;
  x: number;
}

interface Obstacle {
  container: Phaser.GameObjects.Container;
  type: 'note' | 'pillar';
  dodged: boolean;
  x: number;
  y: number;
}

interface TrailDot {
  gfx: Phaser.GameObjects.Graphics;
  life: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Graphics;
  private playerGlow!: Phaser.GameObjects.Graphics;
  private playerX = 150;
  private playerY = TRACK_Y_BASE;
  private playerVY = 0;
  private isJumping = false;
  private isDodging = false;
  private dodgeTimer = 0;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboBarValue = 0;
  private isResonance = false;
  private resonanceTimer = 0;

  private beatPoints: BeatPoint[] = [];
  private obstacles: Obstacle[] = [];
  private trailDots: TrailDot[] = [];
  private burstParticles: { gfx: Phaser.GameObjects.Graphics; vx: number; vy: number; life: number; color: number }[] = [];

  private trackGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private resonanceOverlay!: Phaser.GameObjects.Graphics;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private comboBarBg!: Phaser.GameObjects.Graphics;
  private comboBarFill!: Phaser.GameObjects.Graphics;
  private waveformGfx!: Phaser.GameObjects.Graphics;
  private pauseBtn!: Phaser.GameObjects.Text;

  private pausePanel!: Phaser.GameObjects.Container;
  private isPaused = false;

  private tutorialOverlay!: Phaser.GameObjects.Container;
  private tutorialStep = 0;

  private beatAccum = 0;
  private beatCount = 0;
  private trackOffset = 0;
  private gameTime = 0;
  private screenFlash!: Phaser.GameObjects.Graphics;

  private waveformData: number[] = [];

  private keys!: {
    space: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    escape: Phaser.Input.Keyboard.Key;
  };

  private isGameOver = false;
  private health = 3;
  private healthIcons: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.isGameOver = false;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboBarValue = 0;
    this.isResonance = false;
    this.resonanceTimer = 0;
    this.beatAccum = 0;
    this.beatCount = 0;
    this.trackOffset = 0;
    this.gameTime = 0;
    this.playerY = TRACK_Y_BASE;
    this.playerVY = 0;
    this.isJumping = false;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.health = 3;
    this.beatPoints = [];
    this.obstacles = [];
    this.trailDots = [];
    this.burstParticles = [];
    this.waveformData = new Array(64).fill(0);
    this.tutorialStep = 0;

    this.bgGraphics = this.add.graphics();
    this.drawBackground();

    this.trackGraphics = this.add.graphics();

    this.resonanceOverlay = this.add.graphics();
    this.resonanceOverlay.setVisible(false);

    this.screenFlash = this.add.graphics();
    this.screenFlash.setVisible(false);

    this.playerGlow = this.add.graphics();
    this.player = this.add.graphics();
    this.drawPlayer();

    this.createUI();

    this.keys = {
      space: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      escape: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    this.input.keyboard!.on('keydown-SPACE', () => this.handleJump());
    this.input.keyboard!.on('keydown-UP', () => this.handleJump());
    this.input.keyboard!.on('keydown-DOWN', () => this.handleDodge());
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return;
      if (pointer.y < GAME_HEIGHT / 2) {
        this.handleJump();
      } else {
        this.handleDodge();
      }
    });

    this.showTutorial();

    this.cameras.main.fadeIn(400, 0, 0, 17);
  }

  private drawBackground() {
    this.bgGraphics.clear();
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      const t = y / GAME_HEIGHT;
      const r = Phaser.Math.Linear(0x00, 0x00, t);
      const g = Phaser.Math.Linear(0x00, 0x05, t);
      const b = Phaser.Math.Linear(0x22, 0x11, t);
      this.bgGraphics.fillStyle((r << 16) | (g << 8) | b);
      this.bgGraphics.fillRect(0, y, GAME_WIDTH, 4);
    }
  }

  private drawPlayer() {
    this.player.clear();
    const color = this.isResonance ? this.getHolographicColor() : COLOR_CYAN_GREEN;
    this.player.fillStyle(color, 1);
    this.player.fillCircle(0, 0, PLAYER_SIZE);

    this.player.fillStyle(0xffffff, 0.8);
    this.player.fillCircle(0, 0, PLAYER_SIZE * 0.5);

    this.playerGlow.clear();
    this.playerGlow.fillStyle(color, 0.2);
    this.playerGlow.fillCircle(0, 0, PLAYER_SIZE * 2);

    this.player.setPosition(this.playerX, this.playerY);
    this.playerGlow.setPosition(this.playerX, this.playerY);

    if (this.isDodging) {
      this.player.setScale(1, 0.5);
      this.playerGlow.setScale(1, 0.5);
    } else {
      this.player.setScale(1, 1);
      this.playerGlow.setScale(1, 1);
    }
  }

  private getHolographicColor(): number {
    const t = (this.gameTime * 0.003) % 1;
    const colors = [0xff006e, 0x00f5d4, 0x7b2ff7, 0xffbe0b, 0x00bbf9];
    const idx = Math.floor(t * colors.length) % colors.length;
    return colors[idx];
  }

  private createUI() {
    this.scoreText = this.add.text(GAME_WIDTH / 2, 30, '0', {
      fontSize: '36px',
      fontFamily: '"Courier New", monospace',
      color: '#00f5d4',
      stroke: '#7b2ff7',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.comboText = this.add.text(GAME_WIDTH / 2, 65, '', {
      fontSize: '20px',
      fontFamily: '"Courier New", monospace',
      color: '#ffbe0b',
    }).setOrigin(0.5).setDepth(10);

    this.comboBarBg = this.add.graphics().setDepth(10);
    this.comboBarFill = this.add.graphics().setDepth(10);

    this.waveformGfx = this.add.graphics().setDepth(10);

    this.pauseBtn = this.add.text(40, 20, '⏸', {
      fontSize: '24px',
      color: '#7b2ff7aa',
    }).setDepth(10).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this.togglePause());

    this.healthIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.graphics().setDepth(10);
      icon.fillStyle(COLOR_CYAN_GREEN, 0.8);
      icon.fillCircle(GAME_WIDTH - 30 - i * 30, 30, 8);
      this.healthIcons.push(icon);
    }

    this.pausePanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(20).setVisible(false);
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x111133, 0.85);
    panelBg.fillRoundedRect(-140, -100, 280, 200, 16);
    panelBg.lineStyle(2, COLOR_CYAN_GREEN, 0.4);
    panelBg.strokeRoundedRect(-140, -100, 280, 200, 16);
    this.pausePanel.add(panelBg);

    const resumeBtn = this.add.text(0, -50, '继续', {
      fontSize: '24px', fontFamily: '"Microsoft YaHei", sans-serif', color: '#00f5d4',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => this.togglePause());
    this.pausePanel.add(resumeBtn);

    const replayBtn = this.add.text(0, 0, '重玩', {
      fontSize: '24px', fontFamily: '"Microsoft YaHei", sans-serif', color: '#ffbe0b',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    replayBtn.on('pointerdown', () => {
      this.isPaused = false;
      this.scene.restart();
    });
    this.pausePanel.add(replayBtn);

    const menuBtn = this.add.text(0, 50, '返回主菜单', {
      fontSize: '24px', fontFamily: '"Microsoft YaHei", sans-serif', color: '#7b2ff7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.isPaused = false;
      this.scene.start('MenuScene');
    });
    this.pausePanel.add(menuBtn);
  }

  private showTutorial() {
    this.tutorialOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(30);

    const bg = this.add.graphics();
    bg.fillStyle(0x000022, 0.9);
    bg.fillRoundedRect(-200, -80, 400, 160, 16);
    this.tutorialOverlay.add(bg);

    const title = this.add.text(0, -50, '教程', {
      fontSize: '22px', fontFamily: '"Microsoft YaHei", sans-serif', color: '#00f5d4',
    }).setOrigin(0.5);
    this.tutorialOverlay.add(title);

    const hintText = this.add.text(0, 0, TUTORIAL_TEXT[0], {
      fontSize: '16px', fontFamily: '"Microsoft YaHei", sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    this.tutorialOverlay.add(hintText);

    const nextBtn = this.add.text(0, 50, '▶ 下一步', {
      fontSize: '18px', fontFamily: '"Microsoft YaHei", sans-serif', color: '#ffbe0b',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tutorialOverlay.add(nextBtn);

    nextBtn.on('pointerdown', () => {
      this.tutorialStep++;
      if (this.tutorialStep >= TUTORIAL_TEXT.length) {
        this.tutorialOverlay.destroy();
        return;
      }
      hintText.setText(TUTORIAL_TEXT[this.tutorialStep]);
      if (this.tutorialStep === TUTORIAL_TEXT.length - 1) {
        nextBtn.setText('▶ 开始!');
      }
    });
  }

  private handleJump() {
    if (this.isPaused || this.isGameOver) return;
    if (this.tutorialOverlay && this.tutorialOverlay.active) return;
    if (!this.isJumping) {
      this.isJumping = true;
      this.playerVY = PLAYER_JUMP_VELOCITY;
    }
  }

  private handleDodge() {
    if (this.isPaused || this.isGameOver) return;
    if (this.tutorialOverlay && this.tutorialOverlay.active) return;
    if (!this.isDodging && !this.isJumping) {
      this.isDodging = true;
      this.dodgeTimer = 500;
    }
  }

  private togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    this.pausePanel.setVisible(this.isPaused);
    if (this.isPaused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  update(time: number, delta: number) {
    if (this.isPaused || this.isGameOver) return;

    if (this.tutorialOverlay && this.tutorialOverlay.active) return;

    this.gameTime += delta;
    this.trackOffset += TRACK_SPEED * (delta / 1000);

    this.beatAccum += delta;
    if (this.beatAccum >= BEAT_INTERVAL) {
      this.beatAccum -= BEAT_INTERVAL;
      this.beatCount++;
      this.spawnBeatPoint();
      if (this.beatCount % 2 === 0) {
        this.spawnObstacle();
      }
      this.pulseWaveform();
    }

    this.updatePlayer(delta);
    this.updateTrack();
    this.updateBeatPoints(delta);
    this.updateObstacles(delta);
    this.updateTrail(delta);
    this.updateParticles(delta);
    this.updateUI(delta);
    this.updateResonance(delta);

    if (this.isResonance) {
      this.drawResonanceOverlay();
    }
  }

  private updatePlayer(delta: number) {
    if (this.isJumping) {
      this.playerVY += PLAYER_GRAVITY * (delta / 1000);
      this.playerY += this.playerVY * (delta / 1000);

      if (this.playerY >= TRACK_Y_BASE) {
        this.playerY = TRACK_Y_BASE;
        this.playerVY = 0;
        this.isJumping = false;
      }
    }

    if (this.isDodging) {
      this.dodgeTimer -= delta;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
      }
    }

    const trackY = this.getTrackY(this.playerX);
    if (!this.isJumping) {
      this.playerY = trackY;
    }

    this.drawPlayer();

    if (this.gameTime % 3 < 2) {
      this.spawnTrailDot();
    }
  }

  private getTrackY(x: number): number {
    const wave1 = Math.sin((x + this.trackOffset) * 0.008) * TRACK_AMPLITUDE * 0.6;
    const wave2 = Math.sin((x + this.trackOffset) * 0.003 + 1.5) * TRACK_AMPLITUDE * 0.4;
    return TRACK_Y_BASE + wave1 + wave2;
  }

  private getTrackColor(): number {
    const t = (Math.sin(this.gameTime * 0.001) + 1) / 2;
    const r = Phaser.Math.Linear((COLOR_BLUE_PURPLE >> 16) & 0xff, (COLOR_CYAN_GREEN >> 16) & 0xff, t);
    const g = Phaser.Math.Linear((COLOR_BLUE_PURPLE >> 8) & 0xff, (COLOR_CYAN_GREEN >> 8) & 0xff, t);
    const b = Phaser.Math.Linear(COLOR_BLUE_PURPLE & 0xff, COLOR_CYAN_GREEN & 0xff, t);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private updateTrack() {
    this.trackGraphics.clear();

    const color = this.isResonance ? this.getHolographicColor() : this.getTrackColor();

    this.trackGraphics.lineStyle(3, color, 0.8);
    this.trackGraphics.beginPath();
    for (let x = 0; x <= GAME_WIDTH; x += 4) {
      const y = this.getTrackY(x);
      if (x === 0) {
        this.trackGraphics.moveTo(x, y);
      } else {
        this.trackGraphics.lineTo(x, y);
      }
    }
    this.trackGraphics.strokePath();

    this.trackGraphics.lineStyle(1, color, 0.15);
    this.trackGraphics.beginPath();
    for (let x = 0; x <= GAME_WIDTH; x += 4) {
      const y = this.getTrackY(x);
      if (x === 0) {
        this.trackGraphics.moveTo(x, y + 30);
      } else {
        this.trackGraphics.lineTo(x, y + 30);
      }
    }
    this.trackGraphics.strokePath();
  }

  private spawnBeatPoint() {
    const x = GAME_WIDTH + BEAT_POINT_RADIUS;
    const y = this.getTrackY(x);

    const container = this.add.container(x, y);
    const ring = this.add.graphics();

    const color = this.isResonance ? this.getHolographicColor() : this.getTrackColor();
    ring.lineStyle(3, color, 0.9);
    ring.strokeCircle(0, 0, BEAT_POINT_RADIUS);
    ring.fillStyle(color, 0.25);
    ring.fillCircle(0, 0, BEAT_POINT_RADIUS * 0.6);

    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(0xffffff, 0.3);
    innerGlow.fillCircle(0, 0, BEAT_POINT_RADIUS * 0.3);

    container.add([ring, innerGlow]);
    container.setDepth(5);

    this.beatPoints.push({ container, ring, hit: false, missed: false, x });
  }

  private spawnObstacle() {
    const type = Math.random() > 0.5 ? 'note' : 'pillar';
    const x = GAME_WIDTH + 60;
    const y = this.getTrackY(x);

    const container = this.add.container(x, y).setDepth(5);

    if (type === 'note') {
      const gfx = this.add.graphics();
      gfx.fillStyle(COLOR_WARM_PINK, 0.9);
      gfx.fillEllipse(0, 0, OBSTACLE_NOTE_SIZE, OBSTACLE_NOTE_SIZE * 0.7);
      gfx.lineStyle(2, 0xffffff, 0.5);
      gfx.strokeEllipse(0, 0, OBSTACLE_NOTE_SIZE, OBSTACLE_NOTE_SIZE * 0.7);
      gfx.lineStyle(2, COLOR_WARM_PINK, 0.7);
      gfx.lineBetween(OBSTACLE_NOTE_SIZE * 0.35, 0, OBSTACLE_NOTE_SIZE * 0.35, -OBSTACLE_NOTE_SIZE);
      container.add(gfx);
    } else {
      const gfx = this.add.graphics();
      gfx.fillStyle(COLOR_GOLD, 0.7);
      gfx.fillRect(-OBSTACLE_PILLAR_WIDTH / 2, -OBSTACLE_PILLAR_HEIGHT, OBSTACLE_PILLAR_WIDTH, OBSTACLE_PILLAR_HEIGHT);
      gfx.lineStyle(1, 0xffffff, 0.3);
      gfx.strokeRect(-OBSTACLE_PILLAR_WIDTH / 2, -OBSTACLE_PILLAR_HEIGHT, OBSTACLE_PILLAR_WIDTH, OBSTACLE_PILLAR_HEIGHT);
      gfx.fillStyle(0xffffff, 0.15);
      gfx.fillRect(-OBSTACLE_PILLAR_WIDTH / 2 + 2, -OBSTACLE_PILLAR_HEIGHT + 2, OBSTACLE_PILLAR_WIDTH - 4, OBSTACLE_PILLAR_HEIGHT - 4);
      container.add(gfx);
    }

    this.obstacles.push({ container, type, dodged: false, x, y });
  }

  private updateBeatPoints(delta: number) {
    const speed = TRACK_SPEED * (delta / 1000);

    for (let i = this.beatPoints.length - 1; i >= 0; i--) {
      const bp = this.beatPoints[i];
      bp.x -= speed;
      const y = this.getTrackY(bp.x);
      bp.container.setPosition(bp.x, y);

      const pulse = 1 + Math.sin(this.gameTime * 0.008) * 0.15;
      bp.ring.setScale(pulse);

      if (!bp.hit && !bp.missed) {
        const dist = Math.abs(bp.x - this.playerX);
        if (dist < BEAT_HIT_WINDOW) {
          if (this.keys.space.isDown || this.keys.up.isDown) {
            this.hitBeatPoint(bp, dist);
          }
        } else if (bp.x < this.playerX - BEAT_HIT_WINDOW - 20) {
          bp.missed = true;
          this.onMiss();
          bp.ring.clear();
          bp.ring.fillStyle(0x444444, 0.3);
          bp.ring.fillCircle(0, 0, BEAT_POINT_RADIUS * 0.5);
        }
      }

      if (bp.x < -50) {
        bp.container.destroy();
        this.beatPoints.splice(i, 1);
      }
    }
  }

  private hitBeatPoint(bp: BeatPoint, dist: number) {
    bp.hit = true;

    let scoreAdd: number;
    let label: string;
    if (dist < BEAT_HIT_WINDOW * 0.3) {
      scoreAdd = SCORE_PERFECT;
      label = 'PERFECT!';
    } else {
      scoreAdd = SCORE_GOOD;
      label = 'GOOD';
    }

    this.score += scoreAdd * (1 + this.combo * 0.1);
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.comboBarValue = Math.min(this.comboBarValue + 1, COMBO_MAX);

    if (this.comboBarValue >= COMBO_MAX && !this.isResonance) {
      this.enterResonance();
    }

    const color = this.isResonance ? this.getHolographicColor() : this.getTrackColor();
    this.spawnBurstParticles(bp.container.x, bp.container.y, color, PARTICLE_COUNT_BURST);
    this.triggerScreenFlash(color);

    const labelObj = this.add.text(bp.container.x, bp.container.y - 40, label, {
      fontSize: label === 'PERFECT!' ? '22px' : '18px',
      fontFamily: '"Courier New", monospace',
      color: label === 'PERFECT!' ? '#ffbe0b' : '#00f5d4',
    }).setOrigin(0.5).setDepth(15);

    this.tweens.add({
      targets: labelObj,
      y: labelObj.y - 50,
      alpha: 0,
      duration: 600,
      onComplete: () => labelObj.destroy(),
    });

    bp.ring.clear();
    bp.ring.fillStyle(0xffffff, 0.6);
    bp.ring.fillCircle(0, 0, BEAT_POINT_RADIUS * 1.5);
  }

  private onMiss() {
    this.combo = 0;
    this.comboBarValue = Math.max(0, this.comboBarValue - 3);
  }

  private updateObstacles(delta: number) {
    const speed = TRACK_SPEED * (delta / 1000);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= speed;
      const y = this.getTrackY(obs.x);
      obs.y = y;
      obs.container.setPosition(obs.x, y);

      if (!obs.dodged && obs.x < this.playerX + PLAYER_SIZE) {
        const playerBottom = this.playerY + (this.isDodging ? PLAYER_SIZE * 0.25 : PLAYER_SIZE);
        const playerTop = this.playerY - (this.isDodging ? PLAYER_SIZE * 0.25 : PLAYER_SIZE);

        let hit = false;
        if (obs.type === 'note') {
          const obsTop = y - OBSTACLE_NOTE_SIZE / 2;
          const obsBottom = y + OBSTACLE_NOTE_SIZE / 2;
          hit = !(playerBottom < obsTop || playerTop > obsBottom);
        } else {
          const obsTop = y - OBSTACLE_PILLAR_HEIGHT;
          hit = !(playerBottom < obsTop);
        }

        if (hit && !this.isResonance) {
          this.onPlayerHit();
          obs.dodged = true;
        } else if (hit && this.isResonance) {
          obs.dodged = true;
          this.spawnBurstParticles(obs.x, obs.y, this.getHolographicColor(), 10);
          this.score += 50;
        } else if (obs.x < this.playerX - 30 && !obs.dodged) {
          obs.dodged = true;
          this.score += 10;
        }
      }

      if (obs.x < -60) {
        obs.container.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  private onPlayerHit() {
    this.health--;
    this.combo = 0;
    this.comboBarValue = 0;

    this.spawnBurstParticles(this.playerX, this.playerY, 0xff0000, 15);

    this.cameras.main.shake(200, 0.01);
    this.triggerScreenFlash(0xff0000);

    this.updateHealthIcons();

    if (this.health <= 0) {
      this.gameOver();
    }
  }

  private updateHealthIcons() {
    for (let i = 0; i < this.healthIcons.length; i++) {
      this.healthIcons[i].clear();
      if (i < this.health) {
        this.healthIcons[i].fillStyle(COLOR_CYAN_GREEN, 0.8);
        this.healthIcons[i].fillCircle(GAME_WIDTH - 30 - i * 30, 30, 8);
      } else {
        this.healthIcons[i].fillStyle(0x333333, 0.5);
        this.healthIcons[i].fillCircle(GAME_WIDTH - 30 - i * 30, 30, 8);
      }
    }
  }

  private enterResonance() {
    this.isResonance = true;
    this.resonanceTimer = RESONANCE_DURATION;
    this.resonanceOverlay.setVisible(true);

    this.triggerScreenFlash(0xffffff);

    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '✦ 共鸣模式 ✦', {
      fontSize: '36px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#00f5d4',
      stroke: '#7b2ff7',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);

    this.tweens.add({
      targets: label,
      alpha: 0,
      y: label.y - 80,
      duration: 1500,
      onComplete: () => label.destroy(),
    });
  }

  private updateResonance(delta: number) {
    if (!this.isResonance) return;
    this.resonanceTimer -= delta;
    if (this.resonanceTimer <= 0) {
      this.isResonance = false;
      this.resonanceOverlay.setVisible(false);
      this.comboBarValue = 0;
      this.combo = 0;
    }
  }

  private drawResonanceOverlay() {
    this.resonanceOverlay.clear();
    const alpha = 0.05 + Math.sin(this.gameTime * 0.01) * 0.03;
    const colors = [0xff006e, 0x00f5d4, 0x7b2ff7, 0xffbe0b, 0x00bbf9];
    const ci = Math.floor((this.gameTime * 0.005) % colors.length);
    this.resonanceOverlay.fillStyle(colors[ci], alpha);
    this.resonanceOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 8; i++) {
      const sx = Math.random() * GAME_WIDTH;
      const sy = Math.random() * GAME_HEIGHT;
      this.resonanceOverlay.fillStyle(colors[(ci + i) % colors.length], 0.1);
      this.resonanceOverlay.fillRect(sx - 2, sy - 2, 4, 4);
    }
  }

  private spawnTrailDot() {
    const gfx = this.add.graphics();
    const color = this.isResonance ? this.getHolographicColor() : COLOR_CYAN_GREEN;
    gfx.fillStyle(color, 0.5);
    gfx.fillCircle(0, 0, PLAYER_SIZE * 0.3);
    gfx.setPosition(this.playerX - 5 + Math.random() * 4, this.playerY + Math.random() * 6 - 3);
    gfx.setDepth(3);
    this.trailDots.push({ gfx, life: 300 });
  }

  private updateTrail(delta: number) {
    for (let i = this.trailDots.length - 1; i >= 0; i--) {
      const dot = this.trailDots[i];
      dot.life -= delta;
      const alpha = Math.max(0, dot.life / 300) * 0.5;
      dot.gfx.setAlpha(alpha);
      if (dot.life <= 0) {
        dot.gfx.destroy();
        this.trailDots.splice(i, 1);
      }
    }
  }

  private spawnBurstParticles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const gfx = this.add.graphics();
      gfx.fillStyle(color, 0.9);
      const size = Phaser.Math.FloatBetween(2, 5);
      gfx.fillCircle(0, 0, size);
      gfx.setPosition(x, y);
      gfx.setDepth(12);
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(80, 250);
      this.burstParticles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Phaser.Math.FloatBetween(300, 700),
        color,
      });
    }
  }

  private updateParticles(delta: number) {
    const dt = delta / 1000;
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life -= delta;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vy += 200 * dt;
      const alpha = Math.max(0, p.life / 700);
      p.gfx.setAlpha(alpha);
      if (p.life <= 0) {
        p.gfx.destroy();
        this.burstParticles.splice(i, 1);
      }
    }
  }

  private triggerScreenFlash(color: number) {
    this.screenFlash.clear();
    this.screenFlash.fillStyle(color, 0.2);
    this.screenFlash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.screenFlash.setDepth(11);
    this.screenFlash.setVisible(true);
    this.screenFlash.setAlpha(0.3);

    this.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.screenFlash.setVisible(false);
      },
    });
  }

  private pulseWaveform() {
    for (let i = this.waveformData.length - 1; i > 0; i--) {
      this.waveformData[i] = this.waveformData[i - 1] * 0.9;
    }
    this.waveformData[0] = 0.8 + Math.random() * 0.2;
  }

  private updateUI(delta: number) {
    this.scoreText.setText(Math.floor(this.score).toString());

    if (this.combo > 1) {
      this.comboText.setText(`${this.combo} COMBO`);
      this.comboText.setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }

    this.comboBarBg.clear();
    this.comboBarBg.fillStyle(0x222244, 0.8);
    this.comboBarBg.fillRoundedRect(GAME_WIDTH / 2 - 100, 85, 200, 10, 5);

    this.comboBarFill.clear();
    const fillWidth = (this.comboBarValue / COMBO_MAX) * 196;
    const barColor = this.isResonance ? this.getHolographicColor() : COLOR_CYAN_GREEN;
    this.comboBarFill.fillStyle(barColor, 0.9);
    this.comboBarFill.fillRoundedRect(GAME_WIDTH / 2 - 98, 87, fillWidth, 6, 3);

    this.waveformGfx.clear();
    const wfY = GAME_HEIGHT - 30;
    const wfWidth = GAME_WIDTH - 40;
    const segW = wfWidth / this.waveformData.length;
    for (let i = 0; i < this.waveformData.length; i++) {
      const h = this.waveformData[i] * 20;
      const color = this.isResonance ? this.getHolographicColor() : this.getTrackColor();
      this.waveformGfx.fillStyle(color, 0.5);
      this.waveformGfx.fillRect(20 + i * segW, wfY - h, segW - 1, h);
    }

    if (this.isResonance) {
      const remaining = (this.resonanceTimer / RESONANCE_DURATION) * 100;
      this.scoreText.setColor('#ff006e');
    } else {
      this.scoreText.setColor('#00f5d4');
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.cameras.main.shake(400, 0.02);

    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', {
        score: Math.floor(this.score),
        maxCombo: this.maxCombo,
      });
    });
  }
}
