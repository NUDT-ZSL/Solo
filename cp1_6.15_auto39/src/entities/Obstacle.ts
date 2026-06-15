import Phaser from 'phaser';
import {
  OBSTACLE_HIGH_HEIGHT,
  OBSTACLE_LOW_HEIGHT,
  OBSTACLE_WIDTH,
  GROUND_Y,
  GAME_WIDTH,
  OBSTACLE_HIGH_RATIO,
} from '../config/gameConfig';

export enum ObstacleType {
  HIGH = 'high',
  LOW = 'low',
}

export class Obstacle {
  scene: Phaser.Scene;
  type: ObstacleType;
  height: number;
  isActive: boolean = false;

  physicsRect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;

  private visualContainer: Phaser.GameObjects.Container;
  private bodyRect: Phaser.GameObjects.Rectangle;
  private stripe1: Phaser.GameObjects.Rectangle;
  private stripe2: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, type: ObstacleType) {
    this.scene = scene;
    this.type = type;
    this.height = type === ObstacleType.HIGH ? OBSTACLE_HIGH_HEIGHT : OBSTACLE_LOW_HEIGHT;
    const color = type === ObstacleType.HIGH ? 0xe74c3c : 0xe67e22;

    const y = GROUND_Y - this.height / 2;
    this.physicsRect = scene.add.rectangle(
      GAME_WIDTH + OBSTACLE_WIDTH,
      y,
      OBSTACLE_WIDTH,
      this.height,
      0x000000,
      0,
    );
    scene.physics.add.existing(this.physicsRect);
    this.body = this.physicsRect.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(OBSTACLE_WIDTH, this.height);

    this.bodyRect = scene.add.rectangle(0, 0, OBSTACLE_WIDTH, this.height, color);
    this.stripe1 = scene.add.rectangle(0, -this.height / 2 + 4, OBSTACLE_WIDTH, 4, 0xffffff, 0.4);
    this.stripe2 = scene.add.rectangle(0, this.height / 2 - 4, OBSTACLE_WIDTH, 4, 0x000000, 0.2);

    this.visualContainer = scene.add.container(GAME_WIDTH + OBSTACLE_WIDTH, y, [
      this.bodyRect,
      this.stripe1,
      this.stripe2,
    ]);
    this.visualContainer.setDepth(5);
    this.deactivate();
  }

  spawn(x: number) {
    const y = GROUND_Y - this.height / 2;
    this.body.reset(x, y);
    this.visualContainer.setPosition(x, y);
    this.visualContainer.setVisible(true);
    this.physicsRect.setVisible(false);
    this.physicsRect.setActive(true);
    this.body.enable = true;
    this.isActive = true;
  }

  update(speed: number, delta: number) {
    if (!this.isActive) return;
    const move = (speed * delta) / 1000;
    this.body.position.x -= move;
    this.visualContainer.x = this.body.position.x + this.body.width / 2;
    if (this.body.position.x < -OBSTACLE_WIDTH * 2) {
      this.deactivate();
    }
  }

  deactivate() {
    this.isActive = false;
    this.visualContainer.setVisible(false);
    this.body.enable = false;
    this.physicsRect.setActive(false);
  }
}

export class ObstaclePool {
  scene: Phaser.Scene;
  pool: Obstacle[] = [];
  activeObstacles: Obstacle[] = [];

  constructor(scene: Phaser.Scene, poolSize: number = 10) {
    this.scene = scene;
    for (let i = 0; i < poolSize / 2; i++) {
      this.pool.push(new Obstacle(scene, ObstacleType.HIGH));
      this.pool.push(new Obstacle(scene, ObstacleType.LOW));
    }
  }

  spawn(type: ObstacleType, x: number): Obstacle {
    let obstacle = this.pool.find((o) => !o.isActive && o.type === type);
    if (!obstacle) {
      obstacle = new Obstacle(this.scene, type);
      this.pool.push(obstacle);
    }
    obstacle.spawn(x);
    if (!this.activeObstacles.includes(obstacle)) {
      this.activeObstacles.push(obstacle);
    }
    return obstacle;
  }

  update(speed: number, delta: number) {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const o = this.activeObstacles[i];
      o.update(speed, delta);
      if (!o.isActive) {
        this.activeObstacles.splice(i, 1);
      }
    }
  }

  reset() {
    for (const o of this.pool) {
      o.deactivate();
    }
    this.activeObstacles = [];
  }

  getRandomType(): ObstacleType {
    return Math.random() < OBSTACLE_HIGH_RATIO ? ObstacleType.HIGH : ObstacleType.LOW;
  }

  getActivePhysicsObjects(): Phaser.GameObjects.GameObject[] {
    return this.activeObstacles.map((o) => o.physicsRect);
  }
}
