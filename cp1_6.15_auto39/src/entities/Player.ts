import Phaser from 'phaser';
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SLIDE_HEIGHT,
  PLAYER_X,
  GROUND_Y,
  JUMP_VELOCITY,
  GRAVITY,
  SLIDE_DURATION,
} from '../config/gameConfig';

export enum PlayerState {
  RUNNING = 'running',
  JUMPING = 'jumping',
  SLIDING = 'sliding',
  FALLING = 'falling',
}

export class Player {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  state: PlayerState = PlayerState.RUNNING;
  isSliding: boolean = false;
  isGrounded: boolean = true;
  isHit: boolean = false;
  vy: number = 0;
  private sprite: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private eye: Phaser.GameObjects.Rectangle;
  private leg1: Phaser.GameObjects.Rectangle;
  private leg2: Phaser.GameObjects.Rectangle;
  private arm: Phaser.GameObjects.Rectangle;
  private runTimer: number = 0;
  private slideTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.sprite = scene.add.rectangle(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT, 0x4a90d9);
    this.head = scene.add.rectangle(0, -PLAYER_HEIGHT / 2 + 8, 20, 16, 0x5ba0e0);
    this.eye = scene.add.rectangle(6, -PLAYER_HEIGHT / 2 + 7, 4, 4, 0xffffff);
    this.leg1 = scene.add.rectangle(-6, PLAYER_HEIGHT / 2 - 4, 8, 10, 0x3a7bc0);
    this.leg2 = scene.add.rectangle(6, PLAYER_HEIGHT / 2 - 4, 8, 10, 0x3a7bc0);
    this.arm = scene.add.rectangle(12, -4, 6, 14, 0x3a7bc0);

    this.container = scene.add.container(PLAYER_X, GROUND_Y - PLAYER_HEIGHT / 2, [
      this.sprite,
      this.head,
      this.eye,
      this.leg1,
      this.leg2,
      this.arm,
    ]);
    this.container.setDepth(10);
  }

  jump() {
    if (!this.isGrounded || this.isSliding || this.isHit) return;
    this.state = PlayerState.JUMPING;
    this.isGrounded = false;
    this.vy = JUMP_VELOCITY;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0.9,
      scaleY: 1.15,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  slide() {
    if (!this.isGrounded || this.isSliding || this.isHit) return;
    this.isSliding = true;
    this.state = PlayerState.SLIDING;
    this.slideTimer = SLIDE_DURATION;
    this.container.setScaleY(0.5);
    this.container.setY(GROUND_Y - PLAYER_SLIDE_HEIGHT / 2);
  }

  private endSlide() {
    this.isSliding = false;
    this.state = PlayerState.RUNNING;
    this.container.setScaleY(1);
    this.container.setY(GROUND_Y - PLAYER_HEIGHT / 2);
  }

  update(delta: number) {
    if (this.isHit) return;

    const dt = delta / 1000;

    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.endSlide();
      }
    }

    if (!this.isGrounded) {
      this.vy += GRAVITY * dt;
      this.container.y += this.vy * dt;

      const groundY = this.isSliding
        ? GROUND_Y - PLAYER_SLIDE_HEIGHT / 2
        : GROUND_Y - PLAYER_HEIGHT / 2;

      if (this.container.y >= groundY) {
        this.container.y = groundY;
        this.vy = 0;
        this.isGrounded = true;
        this.state = this.isSliding ? PlayerState.SLIDING : PlayerState.RUNNING;
      } else {
        if (this.vy > 0) {
          this.state = PlayerState.FALLING;
        }
      }
    }

    this.runTimer += delta;
    if (this.state === PlayerState.RUNNING) {
      const legSwing = Math.sin(this.runTimer * 0.012) * 6;
      this.leg1.setX(-6 + legSwing);
      this.leg2.setX(6 - legSwing);
      this.leg1.setY(PLAYER_HEIGHT / 2 - 4);
      this.leg2.setY(PLAYER_HEIGHT / 2 - 4);
      this.arm.setRotation(Math.sin(this.runTimer * 0.012) * 0.3);
      this.arm.setY(-4);
    } else if (this.state === PlayerState.JUMPING || this.state === PlayerState.FALLING) {
      this.leg1.setX(-4);
      this.leg2.setX(4);
      this.leg1.setY(PLAYER_HEIGHT / 2 - 8);
      this.leg2.setY(PLAYER_HEIGHT / 2 - 8);
      this.arm.setRotation(-0.5);
      this.arm.setY(-4);
    } else if (this.state === PlayerState.SLIDING) {
      const legSwing = Math.sin(this.runTimer * 0.012) * 3;
      this.leg1.setX(-6 + legSwing);
      this.leg2.setX(6 - legSwing);
      this.leg1.setY(PLAYER_SLIDE_HEIGHT / 2 - 2);
      this.leg2.setY(PLAYER_SLIDE_HEIGHT / 2 - 2);
      this.arm.setRotation(Math.sin(this.runTimer * 0.012) * 0.2);
      this.arm.setY(0);
    }
  }

  flashRed() {
    this.isHit = true;
    this.sprite.setFillStyle(0xff0000);
    this.head.setFillStyle(0xff3333);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.container.setAlpha(1);
      },
    });
    this.scene.time.delayedCall(200, () => {
      this.sprite.setFillStyle(0x4a90d9);
      this.head.setFillStyle(0x5ba0e0);
    });
  }

  getPlayerBounds(): Phaser.Geom.Rectangle {
    const h = this.isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
    return new Phaser.Geom.Rectangle(
      this.container.x - PLAYER_WIDTH / 2 + 4,
      this.container.y - h / 2 + 4,
      PLAYER_WIDTH - 8,
      h - 8,
    );
  }

  destroy() {
    this.container.destroy();
  }
}
