import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Obstacle, ObstacleType } from '../entities/Obstacle';
import { Photon } from '../entities/Photon';

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const TRACK_Y = 560;
const TRACK_HEIGHT = 12;
const SCROLL_SPEED = 320;
const SPAWN_INTERVAL_MIN = 900;
const SPAWN_INTERVAL_MAX = 1800;
const PHOTON_SPAWN_CHANCE = 0.6;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private obstacles: Obstacle[] = [];
  private photons: Photon[] = [];
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private trackPulseTime: number = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBarFill!: Phaser.GameObjects.Graphics;

  private minimapBg!: Phaser.GameObjects.Graphics;
  private minimapContainer!: Phaser.GameObjects.Container;

  private redFlash!: Phaser.GameObjects.Graphics;

  private score: number = 0;
  private combo: number = 0;
  private bestCombo: number = 0;
  private isGameOver: boolean = false;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;

  private nextSpawnTimer: number = 0;
  private spawnDistance: number = 0;
  private scrollSpeed: number = SCROLL_SPEED;
  private difficulty: number = 1;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;

  private starField: { x: number; y: number; brightness: number; speed: number }[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.isGameOver = false;
    this.scrollSpeed = SCROLL_SPEED;
    this.difficulty = 1;
    this.obstacles = [];
    this.photons = [];
    this.nextSpawnTimer = 1000;
    this.spawnDistance = 0;

    this.createBackground();
    this.createStarField();
    this.createTrack();
    this.createPlayer();
    this.createUI();
    this.createRedFlashOverlay();
    this.setupInput();

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(0x2a * (1 - t));
      const g = 0;
      const b = Math.floor(0x4a * (1 - t));
      const color = (r << 16) | (g << 8) | b;
      const y1 = (GAME_HEIGHT / steps) * i;
      const y2 = (GAME_HEIGHT / steps) * (i + 1);
      this.bgGraphics.fillStyle(color, 1);
      this.bgGraphics.fillRect(0, y1, GAME_WIDTH, y2 - y1 + 1);
    }
  }

  private createStarField(): void {
    this.starField = [];
    for (let i = 0; i < 60; i++) {
      this.starField.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * (TRACK_Y - 80),
        brightness: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 30 + 10,
      });
    }
  }

  private drawStarField(delta: number): void {
    for (const star of this.starField) {
      star.x -= star.speed * (delta / 1000);
      if (star.x < 0) {
        star.x = GAME_WIDTH;
        star.y = Math.random() * (TRACK_Y - 80);
        star.brightness = Math.random() * 0.5 + 0.2;
      }
      const alpha = star.brightness + Math.sin(this.time.now * 0.003 + star.x) * 0.15;
      this.bgGraphics.fillStyle(0xffffff, Math.max(0, alpha));
      this.bgGraphics.fillCircle(star.x, star.y, 1.5);
    }
  }

  private createTrack(): void {
    this.trackGraphics = this.add.graphics();
  }

  private drawTrack(): void {
    this.trackGraphics.clear();

    this.trackPulseTime += 0.03;
    const pulseAlpha = 0.4 + Math.sin(this.trackPulseTime) * 0.15;

    this.trackGraphics.fillStyle(0x0088ff, 0.08);
    this.trackGraphics.fillRect(0, TRACK_Y - 20, GAME_WIDTH, TRACK_HEIGHT + 40);

    this.trackGraphics.fillStyle(0x0088ff, pulseAlpha);
    this.trackGraphics.fillRect(0, TRACK_Y, GAME_WIDTH, TRACK_HEIGHT);

    this.trackGraphics.lineStyle(2, 0x44aaff, 0.8);
    this.trackGraphics.lineBetween(0, TRACK_Y, GAME_WIDTH, TRACK_Y);
    this.trackGraphics.lineBetween(0, TRACK_Y + TRACK_HEIGHT, GAME_WIDTH, TRACK_Y + TRACK_HEIGHT);

    for (let x = 0; x < GAME_WIDTH; x += 60) {
      const offset = (this.time.now * 0.15 + x) % 60;
      const pulseX = (x + offset) % GAME_WIDTH;
      const segAlpha = 0.15 + Math.sin(this.trackPulseTime + pulseX * 0.01) * 0.1;
      this.trackGraphics.fillStyle(0x66ccff, segAlpha);
      this.trackGraphics.fillRect(pulseX, TRACK_Y + 2, 20, TRACK_HEIGHT - 4);
    }

    this.trackGraphics.fillStyle(0x0088ff, 0.06);
    this.trackGraphics.fillRect(0, TRACK_Y + TRACK_HEIGHT, GAME_WIDTH, 30);
  }

  private createPlayer(): void {
    this.player = new Player(this, 200, TRACK_Y - 18);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(32, 36);
    body.setOffset(-16, -36 + 18);
  }

  private createUI(): void {
    this.scoreText = this.add.text(24, 20, '分数: 0', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    });

    this.comboText = this.add.text(24, 50, '连击: 0', {
      fontSize: '18px',
      color: '#ffdd44',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.energyBarBg = this.add.graphics();
    this.energyBarFill = this.add.graphics();
    this.drawEnergyBar();

    this.minimapContainer = this.add.container(GAME_WIDTH - 200, GAME_HEIGHT - 90);
    this.minimapBg = this.add.graphics();

    const mmGlass = this.add.graphics();
    mmGlass.fillStyle(0x001133, 0.5);
    mmGlass.fillRoundedRect(0, 0, 180, 70, 8);
    mmGlass.lineStyle(1, 0x4488ff, 0.4);
    mmGlass.strokeRoundedRect(0, 0, 180, 70, 8);
    this.minimapContainer.add(mmGlass);

    const mmLabel = this.add.text(90, 6, '前方', {
      fontSize: '11px',
      color: '#4488ff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.minimapContainer.add(mmLabel);

    this.minimapBg = this.add.graphics();
    this.minimapContainer.add(this.minimapBg);

    this.minimapContainer.setDepth(100);
  }

  private drawEnergyBar(): void {
    this.energyBarBg.clear();
    this.energyBarFill.clear();

    const x = 24;
    const y = 78;
    const w = 140;
    const h = 10;

    this.energyBarBg.fillStyle(0x222222, 0.8);
    this.energyBarBg.fillRoundedRect(x, y, w, h, 3);
    this.energyBarBg.lineStyle(1, 0x446688, 0.6);
    this.energyBarBg.strokeRoundedRect(x, y, w, h, 3);

    const fillW = (this.player.lightEnergy / this.player.maxLightEnergy) * (w - 4);
    const energyColor = this.player.lightEnergy > 30 ? 0x44ccff : 0xff4444;
    this.energyBarFill.fillStyle(energyColor, 0.9);
    this.energyBarFill.fillRoundedRect(x + 2, y + 2, fillW, h - 4, 2);

    if (this.player.lightEnergy > 30) {
      this.energyBarFill.fillStyle(0x88eeff, 0.3);
      this.energyBarFill.fillRoundedRect(x + 2, y + 2, fillW, (h - 4) / 2, 1);
    }
  }

  private drawMinimap(): void {
    this.minimapBg.clear();

    const mmX = 8;
    const mmY = 22;
    const mmW = 164;
    const mmH = 40;

    this.minimapBg.fillStyle(0x4488ff, 0.3);
    this.minimapBg.fillCircle(mmX + 4, mmY + mmH / 2, 3);

    this.minimapBg.lineStyle(1, 0x4488ff, 0.2);
    this.minimapBg.lineBetween(mmX + 10, mmY + mmH / 2, mmX + mmW, mmY + mmH / 2);

    const visibleRange = 1200;
    for (const obs of this.obstacles) {
      const relX = obs.x - this.player.x;
      if (relX > 0 && relX < visibleRange) {
        const mapX = mmX + 10 + (relX / visibleRange) * (mmW - 10);
        const color = obs.getColor();
        this.minimapBg.fillStyle(color, 0.8);
        this.minimapBg.fillRect(mapX - 2, mmY + 4, 4, mmH - 8);

        this.minimapBg.fillStyle(color, 1);
        const hint = obs.getHint();
        this.minimapBg.fillRect(mapX - 1, mmY + mmH + 2, 2, 4);
      }
    }
  }

  private createRedFlashOverlay(): void {
    this.redFlash = this.add.graphics();
    this.redFlash.fillStyle(0xff0000, 0);
    this.redFlash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.redFlash.setDepth(200);
    this.redFlash.setScrollFactor(0);
  }

  private flashRed(): void {
    this.tweens.add({
      targets: this.redFlash,
      alpha: { from: 0.4, to: 0 },
      duration: 300,
      ease: 'Cubic.easeOut',
    });
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
  }

  private spawnObstacleAndPhoton(): void {
    const x = GAME_WIDTH + 100;
    const types = [ObstacleType.JUMP, ObstacleType.SLIDE, ObstacleType.WAVE];
    const weights = [0.4, 0.3, 0.3];
    let rand = Math.random();
    let type = ObstacleType.JUMP;
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) {
        type = types[i];
        break;
      }
    }

    const yOffsets: Record<ObstacleType, number> = {
      [ObstacleType.JUMP]: TRACK_Y - 25,
      [ObstacleType.SLIDE]: TRACK_Y - 12,
      [ObstacleType.WAVE]: TRACK_Y - 30,
    };

    const obs = new Obstacle(this, x, yOffsets[type], type);
    this.obstacles.push(obs);

    if (Math.random() < PHOTON_SPAWN_CHANCE) {
      const photonY = TRACK_Y - 60 - Math.random() * 120;
      const photon = new Photon(this, x + Phaser.Math.Between(-30, 60), photonY);
      this.photons.push(photon);
    }
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.upKey)) {
        this.scene.restart();
      }
      return;
    }

    this.bgGraphics.clear();
    this.drawBackground();
    this.drawStarField(delta);
    this.drawTrack();

    this.handleInput();

    this.scrollSpeed = SCROLL_SPEED + this.difficulty * 15;

    for (const obs of this.obstacles) {
      obs.x -= this.scrollSpeed * (delta / 1000);
      const body = obs.body as Phaser.Physics.Arcade.Body;
      body.reset(obs.x, obs.y);
      body.setAllowGravity(false);
      body.setImmovable(true);
    }

    for (const photon of this.photons) {
      photon.x -= this.scrollSpeed * (delta / 1000);
      const body = photon.body as Phaser.Physics.Arcade.Body;
      body.reset(photon.x, photon.y);
      body.setAllowGravity(false);
      body.setImmovable(true);
    }

    this.player.update(time, delta);

    this.checkCollisions();

    this.cleanupEntities();

    this.nextSpawnTimer -= delta;
    this.spawnDistance += this.scrollSpeed * (delta / 1000);
    if (this.nextSpawnTimer <= 0) {
      this.spawnObstacleAndPhoton();
      const interval = Phaser.Math.Between(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
      this.nextSpawnTimer = Math.max(500, interval - this.difficulty * 50);
    }

    this.difficulty = 1 + Math.floor(this.score / 500) * 0.5;
    this.score += delta * 0.02 * this.difficulty;

    this.updateUI();

    this.drawEnergyBar();
    this.drawMinimap();
  }

  private handleInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.upKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.player.jump();
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.handleSlide();
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.handleWave();
    }
  }

  private handleSlide(): void {
    const nearbyObstacles = this.obstacles.filter(
      (o) => o.obstacleType === ObstacleType.SLIDE && o.x > this.player.x - 10 && o.x < this.player.x + 80
    );
    for (const obs of nearbyObstacles) {
      this.score += 50;
      this.combo++;
      obs.destroyByJump();
      this.spawnComboPopup(obs.x, obs.y - 30, '+50');
    }
  }

  private handleWave(): void {
    if (this.player.releaseLightWave()) {
      const waveRange = 350;
      const nearbyObstacles = this.obstacles.filter(
        (o) => o.obstacleType === ObstacleType.WAVE && o.x > this.player.x && o.x < this.player.x + waveRange
      );
      for (const obs of nearbyObstacles) {
        this.score += 100;
        this.combo++;
        obs.destroyByWave();
        this.spawnComboPopup(obs.x, obs.y - 30, '+100 光波!');
      }
    }
  }

  private checkCollisions(): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (!obs || !obs.active) continue;

      const dx = Math.abs(obs.x - this.player.x);
      const dy = Math.abs(obs.y - this.player.y);
      const hitDistX = 35;
      const hitDistY = 40;

      if (dx < hitDistX && dy < hitDistY) {
        if (obs.obstacleType === ObstacleType.JUMP && !this.player.isGrounded && this.player.y < obs.y - 10) {
          this.score += 30;
          this.combo++;
          obs.destroyByJump();
          this.spawnComboPopup(obs.x, obs.y - 30, '+30');
          continue;
        }

        if (obs.obstacleType === ObstacleType.WAVE) {
          continue;
        }

        if (obs.obstacleType === ObstacleType.SLIDE) {
          continue;
        }

        if (obs.obstacleType === ObstacleType.JUMP && this.player.isGrounded) {
          this.onHit(obs);
          return;
        }
      }
    }

    for (let i = this.photons.length - 1; i >= 0; i--) {
      const photon = this.photons[i];
      if (!photon || !photon.active) continue;

      const dx = Math.abs(photon.x - this.player.x);
      const dy = Math.abs(photon.y - this.player.y);

      if (dx < 35 && dy < 35) {
        this.score += 20;
        this.combo++;
        this.player.rechargeEnergy(5);
        photon.collect();
        this.photons.splice(i, 1);
        this.spawnComboPopup(photon.x, photon.y - 20, '+20');
      }
    }
  }

  private onHit(obs: Obstacle): void {
    this.combo = 0;
    this.cameras.main.shake(200, 0.015);
    this.flashRed();
    obs.destroyByWave();
  }

  private spawnComboPopup(x: number, y: number, text: string): void {
    const popup = this.add.text(x, y, text, {
      fontSize: '16px',
      color: '#ffee44',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private cleanupEntities(): void {
    this.obstacles = this.obstacles.filter((o) => {
      if (o.isOffScreen() || !o.active) {
        if (o.active) o.destroy();
        return false;
      }
      return true;
    });

    this.photons = this.photons.filter((p) => {
      if (p.isOffScreen() || !p.active) {
        if (p.active) p.destroy();
        return false;
      }
      return true;
    });
  }

  private updateUI(): void {
    this.scoreText.setText(`分数: ${Math.floor(this.score)}`);
    const comboStr = this.combo > 0 ? `连击: ${this.combo} x` : '连击: 0';
    this.comboText.setText(comboStr);
    if (this.combo >= 5) {
      this.comboText.setColor('#ff6644');
    } else if (this.combo >= 3) {
      this.comboText.setColor('#ffaa22');
    } else {
      this.comboText.setColor('#ffdd44');
    }
  }

  private showGameOver(): void {
    this.isGameOver = true;

    this.gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '游戏结束', {
      fontSize: '48px',
      color: '#ff4444',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(300);

    const finalScore = `最终分数: ${Math.floor(this.score)}  最佳连击: ${this.bestCombo}`;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, finalScore, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(300);

    this.restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, '按 空格 或 ↑ 重新开始', {
      fontSize: '18px',
      color: '#aaaaff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(300);

    this.tweens.add({
      targets: this.restartText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }
}
