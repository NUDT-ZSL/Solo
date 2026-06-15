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

export class Obstacle extends Phaser.GameObjects.Container {
  body!: Phaser.Physics.Arcade.Body;
  type: ObstacleType;
  height: number;
  isActive: boolean = false;

  private bodyRect: Phaser.GameObjects.Rectangle;
  private stripe1: Phaser.GameObjects.Rectangle;
  private stripe2: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, type: ObstacleType) {
    const height = type === ObstacleType.HIGH ? OBSTACLE_HIGH_HEIGHT : OBSTACLE_LOW_HEIGHT;
    const color = type === ObstacleType.HIGH ? 0xe74c3c : 0xe67e22;
    const y = GROUND_Y - height / 2;

    super(scene, GAME_WIDTH + OBSTACLE_WIDTH, y);
    this.type = type;
    this.height = height;

    this.bodyRect = scene.add.rectangle(0, 0, OBSTACLE_WIDTH, height, color);
    this.stripe1 = scene.add.rectangle(0, -height / 2 + 4, OBSTACLE_WIDTH, 4, 0xffffff, 0.4);
    this.stripe2 = scene.add.rectangle(0, height / 2 - 4, OBSTACLE_WIDTH, 4, 0x000000, 0.2);

    this.add([this.bodyRect, this.stripe1, this.stripe2]);
    this.setDepth(5);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body = this.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(OBSTACLE_WIDTH, height);
    this.body.setOffset(-OBSTACLE_WIDTH / 2, -height / 2);

    this.deactivate();
  }

  spawn(x: number) {
    const y = GROUND_Y - this.height / 2;
    this.body.reset(x, y);
    this.setPosition(x, y);
    this.setVisible(true);
    this.setActive(true);
    this.body.enable = true;
    this.isActive = true;
  }

  update(speed: number, delta: number) {
    if (!this.isActive) return;
    const move = (speed * delta) / 1000;
    this.body.position.x -= move;
    this.x = this.body.position.x + this.body.width / 2;
    if (this.body.position.x < -OBSTACLE_WIDTH * 2) {
      this.deactivate();
    }
  }

  deactivate() {
    this.isActive = false;
    this.setVisible(false);
    this.setActive(false);
    if (this.body) {
      this.body.enable = false;
    }
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
}
