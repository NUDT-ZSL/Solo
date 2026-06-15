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

export class Player extends Phaser.GameObjects.Container {
  body!: Phaser.Physics.Arcade.Body;
  state: PlayerState = PlayerState.RUNNING;
  isSliding: boolean = false;
  isGrounded: boolean = true;
  isHit: boolean = false;

  private sprite: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private eye: Phaser.GameObjects.Rectangle;
  private leg1: Phaser.GameObjects.Rectangle;
  private leg2: Phaser.GameObjects.Rectangle;
  private arm: Phaser.GameObjects.Rectangle;
  private runTimer: number = 0;
  private slideTimerEvent: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, PLAYER_X, GROUND_Y - PLAYER_HEIGHT / 2);

    this.sprite = scene.add.rectangle(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT, 0x4a90d9);
    this.head = scene.add.rectangle(0, -PLAYER_HEIGHT / 2 + 8, 20, 16, 0x5ba0e0);
    this.eye = scene.add.rectangle(6, -PLAYER_HEIGHT / 2 + 7, 4, 4, 0xffffff);
    this.leg1 = scene.add.rectangle(-6, PLAYER_HEIGHT / 2 - 4, 8, 10, 0x3a7bc0);
    this.leg2 = scene.add.rectangle(6, PLAYER_HEIGHT / 2 - 4, 8, 10, 0x3a7bc0);
    this.arm = scene.add.rectangle(12, -4, 6, 14, 0x3a7bc0);

    this.add([this.sprite, this.head, this.eye, this.leg1, this.leg2, this.arm]);
    this.setDepth(10);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body = this.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(true);
    this.body.setGravityY(GRAVITY);
    this.body.setImmovable(false);
    this.body.setCollideWorldBounds(false);
    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    this.body.setOffset(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2);
  }

  jump() {
    if (!this.isGrounded || this.isSliding || this.isHit) return;
    this.state = PlayerState.JUMPING;
    this.isGrounded = false;
    this.body.setVelocityY(JUMP_VELOCITY);
    this.scene.tweens.add({
      targets: this,
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

    this.body.setSize(PLAYER_WIDTH, PLAYER_SLIDE_HEIGHT);
    this.body.setOffset(
      -PLAYER_WIDTH / 2,
      PLAYER_HEIGHT / 2 - PLAYER_SLIDE_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    );
    this.y = GROUND_Y - PLAYER_SLIDE_HEIGHT / 2;
    this.setScaleY(0.5);

    if (this.slideTimerEvent) {
      this.slideTimerEvent.remove(false);
    }
    this.slideTimerEvent = this.scene.time.delayedCall(SLIDE_DURATION, () => {
      this.endSlide();
    });
  }

  private endSlide() {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.state = PlayerState.RUNNING;

    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    this.body.setOffset(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2);
    this.y = GROUND_Y - PLAYER_HEIGHT / 2;
    this.setScaleY(1);
    this.body.setVelocityY(0);
    this.slideTimerEvent = null;
  }

  update(delta: number) {
    if (this.isHit) return;

    const bodyBottom = this.body.y + this.body.height;

    if (bodyBottom >= GROUND_Y - 2) {
      if (!this.isGrounded) {
        this.isGrounded = true;
        if (this.state !== PlayerState.SLIDING) {
          this.state = PlayerState.RUNNING;
        }
      }
      const targetY = this.isSliding
        ? GROUND_Y - PLAYER_SLIDE_HEIGHT / 2
        : GROUND_Y - PLAYER_HEIGHT / 2;
      this.body.reset(this.body.x + this.body.width / 2, targetY);
      this.body.setVelocityY(0);
    } else {
      this.isGrounded = false;
      if (this.body.velocity.y > 0 && this.state !== PlayerState.SLIDING) {
        this.state = PlayerState.FALLING;
      }
    }

    this.runTimer += delta;
    const visualScaleY = this.scaleY;
    const scaledHalfH = (PLAYER_HEIGHT / 2) * visualScaleY;

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
      this.leg1.setY(scaledHalfH - 2);
      this.leg2.setY(scaledHalfH - 2);
      this.arm.setRotation(Math.sin(this.runTimer * 0.012) * 0.2);
      this.arm.setY(0);
    }
  }

  flashRed() {
    this.isHit = true;
    this.sprite.setFillStyle(0xff0000);
    this.head.setFillStyle(0xff3333);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.setAlpha(1);
      },
    });
    this.scene.time.delayedCall(200, () => {
      this.sprite.setFillStyle(0x4a90d9);
      this.head.setFillStyle(0x5ba0e0);
    });
  }
}
