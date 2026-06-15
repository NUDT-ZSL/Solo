import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ObstaclePool, ObstacleType } from '../entities/Obstacle';
import { CoinPool } from '../entities/Coin';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  INITIAL_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT,
  SPEED_INTERVAL,
  OBSTACLE_SPAWN_MIN,
  OBSTACLE_SPAWN_MAX,
  COIN_SPAWN_MIN,
  COIN_SPAWN_MAX,
  SCORE_DISTANCE_WEIGHT,
  SCORE_COIN_WEIGHT,
} from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  player!: Player;
  obstaclePool!: ObstaclePool;
  coinPool!: CoinPool;
  currentSpeed: number = INITIAL_SPEED;
  distance: number = 0;
  coinCount: number = 0;
  isGameOver: boolean = false;
  isPaused: boolean = false;
  elapsedTime: number = 0;
  lastSpeedUp: number = 0;
  nextObstacleSpawn: number = 0;
  nextCoinSpawn: number = 0;
  speed: number = INITIAL_SPEED;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  spaceKey!: Phaser.Input.Keyboard.Key;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private groundTiles: Phaser.GameObjects.Rectangle[] = [];
  private grassTiles: Phaser.GameObjects.Rectangle[] = [];
  private cloudContainers: Phaser.GameObjects.Container[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Ellipse;
  private groundOffset: number = 0;
  private TILE_W: number = 64;
  private NUM_TILES: number = 0;
  private NUM_CLOUDS: number = 5;
  private mountainGraphics!: Phaser.GameObjects.Graphics;
  private mountainOffset: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.currentSpeed = INITIAL_SPEED;
    this.speed = INITIAL_SPEED;
    this.distance = 0;
    this.coinCount = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.elapsedTime = 0;
    this.lastSpeedUp = 0;
    this.nextObstacleSpawn = 2000;
    this.nextCoinSpawn = 1000;
    this.groundOffset = 0;
    this.mountainOffset = 0;
    this.NUM_TILES = Math.ceil(GAME_WIDTH / this.TILE_W) + 2;

    this.createBackground();
    this.createMountains();
    this.createClouds();
    this.createGround();
    this.player = new Player(this);
    this.obstaclePool = new ObstaclePool(this);
    this.coinPool = new CoinPool(this);
    this.createHUD();
    this.setupInput();

    this.nextObstacleSpawn = this.time.now + Phaser.Math.Between(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX);
    this.nextCoinSpawn = this.time.now + Phaser.Math.Between(COIN_SPAWN_MIN, COIN_SPAWN_MAX);
  }

  private setupInput() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private createBackground() {
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);
    this.drawSky();
  }

  private drawSky() {
    const topColor = Phaser.Display.Color.HexToColor('#87CEEB');
    const bottomColor = Phaser.Display.Color.HexToColor('#E0F6FF');
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        topColor,
        bottomColor,
        steps,
        i,
      );
      this.bgGraphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      this.bgGraphics.fillRect(0, (GROUND_Y / steps) * i, GAME_WIDTH, GROUND_Y / steps + 1);
    }
  }

  private createMountains() {
    this.mountainGraphics = this.add.graphics();
    this.mountainGraphics.setDepth(1);
    this.drawMountains(0);
  }

  private drawMountains(offset: number) {
    this.mountainGraphics.clear();
    this.mountainGraphics.fillStyle(0x8ebf7e, 0.5);
    const peaks = [
      { x: 0, h: 80 },
      { x: 120, h: 120 },
      { x: 250, h: 90 },
      { x: 380, h: 140 },
      { x: 500, h: 100 },
      { x: 630, h: 130 },
      { x: 750, h: 85 },
      { x: 880, h: 110 },
    ];
    this.mountainGraphics.beginPath();
    this.mountainGraphics.moveTo(-offset, GROUND_Y);
    for (const p of peaks) {
      const px = p.x - offset;
      this.mountainGraphics.lineTo(px, GROUND_Y - p.h);
    }
    this.mountainGraphics.lineTo(GAME_WIDTH + 100, GROUND_Y);
    this.mountainGraphics.closePath();
    this.mountainGraphics.fillPath();

    this.mountainGraphics.fillStyle(0x6dab5e, 0.4);
    const peaks2 = [
      { x: 50, h: 60 },
      { x: 180, h: 95 },
      { x: 300, h: 70 },
      { x: 450, h: 110 },
      { x: 570, h: 80 },
      { x: 700, h: 100 },
      { x: 830, h: 75 },
      { x: 960, h: 90 },
    ];
    this.mountainGraphics.beginPath();
    this.mountainGraphics.moveTo(-offset * 0.5, GROUND_Y);
    for (const p of peaks2) {
      const px = p.x - offset * 0.5;
      this.mountainGraphics.lineTo(px, GROUND_Y - p.h);
    }
    this.mountainGraphics.lineTo(GAME_WIDTH + 100, GROUND_Y);
    this.mountainGraphics.closePath();
    this.mountainGraphics.fillPath();
  }

  private createClouds() {
    this.cloudContainers = [];
    for (let i = 0; i < this.NUM_CLOUDS; i++) {
      const cx = Math.random() * GAME_WIDTH;
      const cy = 30 + Math.random() * 120;
      const container = this.add.container(cx, cy);
      container.setDepth(2);
      container.setAlpha(0.6 + Math.random() * 0.3);

      const s = 0.6 + Math.random() * 0.8;
      const c1 = this.add.ellipse(0, 0, 60 * s, 30 * s, 0xffffff);
      const c2 = this.add.ellipse(-20 * s, 5 * s, 40 * s, 20 * s, 0xffffff);
      const c3 = this.add.ellipse(20 * s, 5 * s, 45 * s, 22 * s, 0xffffff);
      container.add([c1, c2, c3]);

      this.cloudContainers.push(container);
    }
  }

  private createGround() {
    this.groundTiles = [];
    this.grassTiles = [];
    for (let i = 0; i < this.NUM_TILES; i++) {
      const x = i * this.TILE_W;
      const tile = this.add.rectangle(
        x + this.TILE_W / 2,
        GROUND_Y + GROUND_HEIGHT / 2,
        this.TILE_W,
        GROUND_HEIGHT,
        0x5d8a3c,
      );
      tile.setDepth(3);
      this.groundTiles.push(tile);

      const grass = this.add.rectangle(
        x + this.TILE_W / 2,
        GROUND_Y + 4,
        this.TILE_W,
        8,
        0x7ec850,
      );
      grass.setDepth(4);
      this.grassTiles.push(grass);
    }
  }

  private createHUD() {
    this.scoreText = this.add.text(16, 16, '距离: 0', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#333333',
      backgroundColor: '#ffffffaa',
      padding: { x: 8, y: 4 },
    });
    this.scoreText.setDepth(100);

    this.coinIcon = this.add.ellipse(16 + 8, 52, 18, 18, 0xffd700);
    this.coinIcon.setDepth(100);
    this.coinIcon.setStrokeStyle(2, 0xdaa520);

    this.coinText = this.add.text(32, 42, '0', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#333333',
      backgroundColor: '#ffffffaa',
      padding: { x: 8, y: 4 },
    });
    this.coinText.setDepth(100);
  }

  private showFloatingText(x: number, y: number, text: string) {
    const floating = this.add.text(x, y, text, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#333',
      strokeThickness: 2,
    });
    floating.setDepth(100);
    this.tweens.add({
      targets: floating,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => floating.destroy(),
    });
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || this.isPaused) return;

    this.handleInput();
    this.elapsedTime += delta / 1000;
    this.updateSpeed();
    this.updateMountains(delta);
    this.updateClouds(delta);
    this.updateGround(delta);
    this.player.update(delta);
    this.updateSpawning();
    this.obstaclePool.update(this.speed, delta);
    this.coinPool.update(this.speed, delta);
    this.checkCollisions();
    this.updateDistance(delta);
    this.updateHUD();
  }

  private handleInput() {
    if (!this.cursors || !this.spaceKey) return;

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.player.jump();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.player.slide();
    }
  }

  private updateSpeed() {
    const secondsSinceLastSpeedUp = this.elapsedTime - this.lastSpeedUp;
    if (secondsSinceLastSpeedUp >= SPEED_INTERVAL && this.currentSpeed < MAX_SPEED) {
      this.currentSpeed = Math.min(this.currentSpeed + SPEED_INCREMENT, MAX_SPEED);
      this.lastSpeedUp = this.elapsedTime;
    }
    this.speed = Phaser.Math.Linear(this.speed, this.currentSpeed, 0.05);
  }

  private updateMountains(delta: number) {
    this.mountainOffset += (this.speed * 0.05 * delta) / 1000;
    if (this.mountainOffset > 400) this.mountainOffset -= 400;
    this.drawMountains(this.mountainOffset);
  }

  private updateClouds(delta: number) {
    for (const cloud of this.cloudContainers) {
      cloud.x -= (this.speed * 0.15 * delta) / 1000;
      if (cloud.x < -100) {
        cloud.x = GAME_WIDTH + 100;
        cloud.y = 30 + Math.random() * 120;
      }
    }
  }

  private updateGround(delta: number) {
    this.groundOffset += (this.speed * delta) / 1000;
    const tileW = this.TILE_W;
    const wrap = this.groundOffset % tileW;
    for (let i = 0; i < this.NUM_TILES; i++) {
      const x = i * tileW - wrap;
      this.groundTiles[i].setX(x + tileW / 2);
      this.grassTiles[i].setX(x + tileW / 2);
    }
  }

  private updateSpawning() {
    const now = this.time.now;
    if (now >= this.nextObstacleSpawn) {
      const type = this.obstaclePool.getRandomType();
      this.obstaclePool.spawn(type, GAME_WIDTH + 50);
      this.nextObstacleSpawn = now + Phaser.Math.Between(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX);
    }
    if (now >= this.nextCoinSpawn) {
      this.coinPool.spawn(GAME_WIDTH + 50);
      this.nextCoinSpawn = now + Phaser.Math.Between(COIN_SPAWN_MIN, COIN_SPAWN_MAX);
    }
  }

  private checkCollisions() {
    const playerBounds = this.player.getPlayerBounds();

    for (const obstacle of this.obstaclePool.activeObstacles) {
      const obBounds = obstacle.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, obBounds)) {
        this.gameOver();
        return;
      }
    }

    for (const coin of this.coinPool.activeCoins) {
      const coinBounds = coin.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, coinBounds)) {
        this.coinCount++;
        this.showFloatingText(coin.container.x, coin.container.y - 20, '+1');
        coin.collect();
      }
    }
  }

  private updateDistance(delta: number) {
    this.distance += (this.speed * delta) / 1000;
  }

  private updateHUD() {
    this.scoreText.setText(`距离: ${Math.floor(this.distance)}`);
    this.coinText.setText(`${this.coinCount}`);
  }

  private gameOver() {
    this.isGameOver = true;
    this.player.flashRed();

    this.time.delayedCall(600, () => {
      this.scene.start('ResultScene', {
        distance: Math.floor(this.distance),
        coins: this.coinCount,
        score: Math.floor(this.distance * SCORE_DISTANCE_WEIGHT + this.coinCount * SCORE_COIN_WEIGHT),
      });
    });
  }
}
