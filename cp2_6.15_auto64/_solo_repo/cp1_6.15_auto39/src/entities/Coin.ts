import Phaser from 'phaser';
import {
  COIN_SIZE,
  COIN_Y_MIN,
  COIN_Y_MAX,
  GAME_WIDTH,
} from '../config/gameConfig';

export class Coin extends Phaser.GameObjects.Container {
  body!: Phaser.Physics.Arcade.Body;
  isActive: boolean = false;

  private coinCircle: Phaser.GameObjects.Ellipse;
  private coinInner: Phaser.GameObjects.Ellipse;
  private glow: Phaser.GameObjects.Ellipse;
  private floatOffset: number = 0;
  private baseY: number = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH + COIN_SIZE, COIN_Y_MIN);

    this.glow = scene.add.ellipse(0, 0, COIN_SIZE + 8, COIN_SIZE + 8, 0xffd700, 0.3);
    this.coinCircle = scene.add.ellipse(0, 0, COIN_SIZE, COIN_SIZE, 0xffd700);
    this.coinInner = scene.add.ellipse(0, 0, COIN_SIZE * 0.5, COIN_SIZE * 0.5, 0xffec8b);

    this.add([this.glow, this.coinCircle, this.coinInner]);
    this.setDepth(8);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body = this.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(COIN_SIZE, COIN_SIZE);
    this.body.setOffset(-COIN_SIZE / 2, -COIN_SIZE / 2);

    this.deactivate();
  }

  spawn(x: number, y: number) {
    this.baseY = y;
    this.body.reset(x, y);
    this.setPosition(x, y);
    this.setVisible(true);
    this.setActive(true);
    this.setScale(1, 1);
    this.setAlpha(1);
    this.body.enable = true;
    this.isActive = true;
    this.floatOffset = 0;
  }

  update(speed: number, delta: number) {
    if (!this.isActive) return;
    const move = (speed * delta) / 1000;
    this.body.position.x -= move;
    this.floatOffset += delta * 0.005;
    const fy = this.baseY + Math.sin(this.floatOffset) * 5;
    this.body.position.y = fy;
    this.setPosition(
      this.body.position.x + this.body.width / 2,
      this.body.position.y + this.body.height / 2,
    );
    const scaleX = Math.abs(Math.cos(this.floatOffset * 2));
    this.setScale(Math.max(0.3, scaleX), 1);
    this.glow.setAlpha(0.2 + Math.sin(this.floatOffset * 3) * 0.15);

    if (this.body.position.x < -COIN_SIZE * 2) {
      this.deactivate();
    }
  }

  collect(onComplete?: () => void) {
    this.isActive = false;
    this.body.enable = false;
    this.setActive(false);
    this.scene.tweens.add({
      targets: this,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.setVisible(false);
        this.setScale(1, 1);
        this.setAlpha(1);
        if (onComplete) onComplete();
      },
    });
  }

  deactivate() {
    this.isActive = false;
    this.setVisible(false);
    this.setActive(false);
    this.setScale(1, 1);
    this.setAlpha(1);
    if (this.body) {
      this.body.enable = false;
    }
  }
}

export class CoinPool {
  scene: Phaser.Scene;
  pool: Coin[] = [];
  activeCoins: Coin[] = [];

  constructor(scene: Phaser.Scene, poolSize: number = 15) {
    this.scene = scene;
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Coin(scene));
    }
  }

  spawn(x: number): Coin {
    let coin = this.pool.find((c) => !c.isActive);
    if (!coin) {
      coin = new Coin(this.scene);
      this.pool.push(coin);
    }
    const y = COIN_Y_MIN + Math.random() * (COIN_Y_MAX - COIN_Y_MIN);
    coin.spawn(x, y);
    if (!this.activeCoins.includes(coin)) {
      this.activeCoins.push(coin);
    }
    return coin;
  }

  update(speed: number, delta: number) {
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const c = this.activeCoins[i];
      c.update(speed, delta);
      if (!c.isActive) {
        this.activeCoins.splice(i, 1);
      }
    }
  }

  reset() {
    for (const c of this.pool) {
      c.deactivate();
    }
    this.activeCoins = [];
  }
}
