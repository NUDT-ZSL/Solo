import Phaser from 'phaser';
import {
  COIN_SIZE,
  COIN_Y_MIN,
  COIN_Y_MAX,
  GAME_WIDTH,
} from '../config/gameConfig';

export class Coin {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  isActive: boolean = false;
  private coinCircle: Phaser.GameObjects.Ellipse;
  private coinInner: Phaser.GameObjects.Ellipse;
  private glow: Phaser.GameObjects.Ellipse;
  private floatOffset: number = 0;
  private baseY: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.glow = scene.add.ellipse(0, 0, COIN_SIZE + 8, COIN_SIZE + 8, 0xffd700, 0.3);
    this.coinCircle = scene.add.ellipse(0, 0, COIN_SIZE, COIN_SIZE, 0xffd700);
    this.coinInner = scene.add.ellipse(0, 0, COIN_SIZE * 0.5, COIN_SIZE * 0.5, 0xffec8b);

    this.container = scene.add.container(GAME_WIDTH + COIN_SIZE, 0, [
      this.glow,
      this.coinCircle,
      this.coinInner,
    ]);
    this.container.setDepth(8);
    this.container.setVisible(false);
  }

  spawn(x: number, y: number) {
    this.baseY = y;
    this.container.setPosition(x, y);
    this.container.setVisible(true);
    this.container.setScale(1);
    this.container.setAlpha(1);
    this.isActive = true;
    this.floatOffset = 0;
  }

  update(speed: number, delta: number) {
    if (!this.isActive) return;
    this.container.x -= (speed * delta) / 1000;
    this.floatOffset += delta * 0.005;
    this.container.y = this.baseY + Math.sin(this.floatOffset) * 5;
    const scaleX = Math.abs(Math.cos(this.floatOffset * 2));
    this.container.setScale(Math.max(0.3, scaleX), 1);
    this.glow.setAlpha(0.2 + Math.sin(this.floatOffset * 3) * 0.15);

    if (this.container.x < -COIN_SIZE * 2) {
      this.deactivate();
    }
  }

  collect(onComplete?: () => void) {
    this.isActive = false;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.container.setVisible(false);
        this.container.setScale(1);
        this.container.setAlpha(1);
        if (onComplete) onComplete();
      },
    });
  }

  deactivate() {
    this.isActive = false;
    this.container.setVisible(false);
    this.container.setScale(1);
    this.container.setAlpha(1);
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.container.x - COIN_SIZE / 2,
      this.container.y - COIN_SIZE / 2,
      COIN_SIZE,
      COIN_SIZE,
    );
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
    this.activeCoins.push(coin);
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
