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
  container: Phaser.GameObjects.Container;
  isActive: boolean = false;
  private body: Phaser.GameObjects.Rectangle;
  private stripe1: Phaser.GameObjects.Rectangle;
  private stripe2: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, type: ObstacleType) {
    this.scene = scene;
    this.type = type;

    const height = type === ObstacleType.HIGH ? OBSTACLE_HIGH_HEIGHT : OBSTACLE_LOW_HEIGHT;
    const color = type === ObstacleType.HIGH ? 0xe74c3c : 0xe67e22;

    this.body = scene.add.rectangle(0, 0, OBSTACLE_WIDTH, height, color);
    this.stripe1 = scene.add.rectangle(0, -height / 2 + 4, OBSTACLE_WIDTH, 4, 0xffffff, 0.4);
    this.stripe2 = scene.add.rectangle(0, height / 2 - 4, OBSTACLE_WIDTH, 4, 0x000000, 0.2);

    const y = type === ObstacleType.HIGH
      ? GROUND_Y - height / 2
      : GROUND_Y - height / 2;

    this.container = scene.add.container(GAME_WIDTH + OBSTACLE_WIDTH, y, [
      this.body,
      this.stripe1,
      this.stripe2,
    ]);
    this.container.setDepth(5);
    this.container.setVisible(false);
  }

  spawn(x: number) {
    const height = this.type === ObstacleType.HIGH ? OBSTACLE_HIGH_HEIGHT : OBSTACLE_LOW_HEIGHT;
    const y = this.type === ObstacleType.HIGH
      ? GROUND_Y - height / 2
      : GROUND_Y - height / 2;
    this.container.setPosition(x, y);
    this.container.setVisible(true);
    this.isActive = true;
  }

  update(speed: number, delta: number) {
    if (!this.isActive) return;
    this.container.x -= (speed * delta) / 1000;
    if (this.container.x < -OBSTACLE_WIDTH * 2) {
      this.deactivate();
    }
  }

  deactivate() {
    this.isActive = false;
    this.container.setVisible(false);
  }

  getBounds(): Phaser.Geom.Rectangle {
    const height = this.type === ObstacleType.HIGH ? OBSTACLE_HIGH_HEIGHT : OBSTACLE_LOW_HEIGHT;
    return new Phaser.Geom.Rectangle(
      this.container.x - OBSTACLE_WIDTH / 2,
      this.container.y - height / 2,
      OBSTACLE_WIDTH,
      height,
    );
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
    let obstacle = this.pool.find(
      (o) => !o.isActive && o.type === type,
    );
    if (!obstacle) {
      obstacle = new Obstacle(this.scene, type);
      this.pool.push(obstacle);
    }
    obstacle.spawn(x);
    this.activeObstacles.push(obstacle);
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
