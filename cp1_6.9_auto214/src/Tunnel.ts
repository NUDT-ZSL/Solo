import Phaser from 'phaser';
import { GameScene } from './main';

export class Tunnel {
  private scene: GameScene;
  public obstacleGroup!: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.2;
  private obstacleColors: number[] = [
    0x6644ff, 0x8855ee, 0xaa66dd, 0xcc77cc,
    0xee88bb, 0xff77aa, 0xdd66bb, 0x9955dd
  ];

  constructor(scene: GameScene) {
    this.scene = scene;
    this.obstacleGroup = this.scene.physics.add.group({
      immovable: true,
      allowGravity: false
    });
    this.init();
  }

  init(): void {
    this.spawnTimer = 0;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.obstacleGroup.clear(true, true);

    for (let i = 0; i < 8; i++) {
      this.spawnObstacle(width * (0.4 + i * 0.2));
    }
  }

  private spawnObstacle(x?: number): void {
    const scene = this.scene;
    const width = scene.scale.width;
    const height = scene.scale.height;

    const tunnelTop = 60;
    const tunnelBottom = height - 60;
    const tunnelHeight = tunnelBottom - tunnelTop;

    const obstacleType = Phaser.Math.Between(0, 2);
    const color = Phaser.Utils.Array.GetRandom(this.obstacleColors) as number;

    let y: number;
    let barHeight: number;
    const barWidth = Phaser.Math.FloatBetween(18, 45);

    if (obstacleType === 0) {
      barHeight = Phaser.Math.FloatBetween(tunnelHeight * 0.15, tunnelHeight * 0.35);
      y = tunnelTop + barHeight / 2;
    } else if (obstacleType === 1) {
      barHeight = Phaser.Math.FloatBetween(tunnelHeight * 0.15, tunnelHeight * 0.35);
      y = tunnelBottom - barHeight / 2;
    } else {
      barHeight = Phaser.Math.FloatBetween(tunnelHeight * 0.2, tunnelHeight * 0.5);
      y = Phaser.Math.FloatBetween(
        tunnelTop + barHeight / 2 + 30,
        tunnelBottom - barHeight / 2 - 30
      );
    }

    const posX = x ?? width + barWidth;

    const graphics = this.scene.add.graphics();
    graphics.setPosition(posX, y);

    const alpha = Phaser.Math.FloatBetween(0.35, 0.65);
    graphics.fillStyle(color, alpha);

    const radius = Math.min(barWidth, barHeight) * 0.3;
    graphics.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, radius);

    graphics.lineStyle(2, color, 0.8);
    graphics.strokeRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, radius);

    const glow = this.scene.add.graphics();
    glow.setPosition(posX, y);
    glow.lineStyle(4, color, 0.25);
    glow.strokeRoundedRect(
      -barWidth / 2 - 3,
      -barHeight / 2 - 3,
      barWidth + 6,
      barHeight + 6,
      radius + 2
    );

    const container = this.scene.add.container(posX, y);
    container.add([glow, graphics]);
    container.setSize(barWidth, barHeight);

    const body = this.obstacleGroup.create(posX, y) as Phaser.Physics.Arcade.Image;
    body.setDisplaySize(barWidth, barHeight);
    body.setAlpha(0);
    body.setImmovable(true);
    body.setData('tunnelContainer', container);
    body.setData('barWidth', barWidth);
    body.setData('barHeight', barHeight);
    body.setData('graphics', graphics);
    body.setData('glow', glow);

    body.body.setSize(barWidth * 0.85, barHeight * 0.85);
  }

  update(delta: number): void {
    const dt = delta / 1000;
    const speed = this.scene.scrollSpeed;

    const obstacles = this.obstacleGroup.getChildren() as Phaser.Physics.Arcade.Image[];
    obstacles.forEach((obstacle) => {
      if (!obstacle.active) return;

      obstacle.x -= speed * dt;

      const container = obstacle.getData('tunnelContainer') as Phaser.GameObjects.Container;
      if (container) {
        container.x = obstacle.x;
      }

      if (obstacle.x < -100) {
        const graphics = obstacle.getData('graphics') as Phaser.GameObjects.Graphics;
        const glow = obstacle.getData('glow') as Phaser.GameObjects.Graphics;
        if (graphics) graphics.destroy();
        if (glow) glow.destroy();
        if (container) container.destroy();
        this.obstacleGroup.killAndHide(obstacle);
        obstacle.destroy();
      }
    });

    this.spawnTimer += dt;
    const currentInterval = this.spawnInterval / Math.max(1, Math.sqrt(this.scene.gameTime / 30 + 1));
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }
  }
}
