import Phaser from 'phaser';

const MOVE_SPEED = 250;
const JUMP_VELOCITY = -520;

export class Player extends Phaser.GameObjects.Container {
  private bodyGraphic: Phaser.GameObjects.Graphics;
  private eyeLeft: Phaser.GameObjects.Graphics;
  private eyeRight: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  public isInvincible: boolean = false;
  private invincibleTimer: number = 0;
  private isJumping: boolean = false;
  private wasOnGround: boolean = false;
  private squashTween: Phaser.Tweens.Tween | null = null;

  public bodyRef: Phaser.Physics.Arcade.Body | null = null;
  public lives: number = 3;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private mobileLeft: boolean = false;
  private mobileRight: boolean = false;
  private mobileJump: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bodyGraphic = new Phaser.GameObjects.Graphics(scene);
    this.eyeLeft = new Phaser.GameObjects.Graphics(scene);
    this.eyeRight = new Phaser.GameObjects.Graphics(scene);
    this.mouth = new Phaser.GameObjects.Graphics(scene);

    this.add([this.bodyGraphic, this.eyeLeft, this.eyeRight, this.mouth]);
    this.drawPlayer();

    scene.add.existing(this);
    this.setupPhysics(scene);
    this.setupInput(scene);
  }

  private drawPlayer(): void {
    this.bodyGraphic.clear();
    this.bodyGraphic.fillStyle(0xFF6B9D, 1);
    this.bodyGraphic.fillRoundedRect(-16, -16, 32, 32, 8);

    this.bodyGraphic.fillStyle(0xFF8FB8, 1);
    this.bodyGraphic.fillRoundedRect(-12, -12, 24, 14, 5);

    this.eyeLeft.clear();
    this.eyeLeft.fillStyle(0xffffff, 1);
    this.eyeLeft.fillCircle(-5, -4, 5);
    this.eyeLeft.fillStyle(0x333333, 1);
    this.eyeLeft.fillCircle(-4, -4, 2.5);

    this.eyeRight.clear();
    this.eyeRight.fillStyle(0xffffff, 1);
    this.eyeRight.fillCircle(5, -4, 5);
    this.eyeRight.fillStyle(0x333333, 1);
    this.eyeRight.fillCircle(6, -4, 2.5);

    this.mouth.clear();
    this.mouth.fillStyle(0xCC4477, 1);
    this.mouth.fillRoundedRect(-4, 4, 8, 4, 2);
  }

  private setupPhysics(scene: Phaser.Scene): void {
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 28);
    body.setOffset(-14, -14);
    body.setBounce(0.1);
    body.setCollideWorldBounds(false);
    this.bodyRef = body;
  }

  private setupInput(scene: Phaser.Scene): void {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.jumpKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  setMobileInput(left: boolean, right: boolean, jump: boolean): void {
    this.mobileLeft = left;
    this.mobileRight = right;
    this.mobileJump = jump;
  }

  update(): void {
    if (!this.bodyRef) return;

    const body = this.bodyRef;
    const onGround = body.blocked.down || body.touching.down;
    let moveX = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) moveX = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) moveX = 1;

      const wantJump = this.cursors.up.isDown || this.wasd.W.isDown || this.jumpKey.isDown;
      if (wantJump && onGround) {
        body.setVelocityY(JUMP_VELOCITY);
        this.playJumpAnimation();
      }
    }

    if (this.mobileLeft) moveX = -1;
    else if (this.mobileRight) moveX = 1;
    if (this.mobileJump && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
      this.playJumpAnimation();
      this.mobileJump = false;
    }

    body.setVelocityX(moveX * MOVE_SPEED);

    if (onGround && this.isJumping) {
      this.playLandAnimation();
      this.isJumping = false;
    }
    if (!onGround && !this.isJumping) {
      this.isJumping = true;
    }

    this.wasOnGround = onGround;

    if (this.isInvincible) {
      this.invincibleTimer -= this.scene.game.loop.delta;
      this.setAlpha(Math.sin(this.scene.time.now * 0.02) > 0 ? 0.3 : 1);
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.setAlpha(1);
      }
    }
  }

  private playJumpAnimation(): void {
    if (this.squashTween) this.squashTween.stop();
    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: 0.8,
      scaleY: 1.3,
      duration: 80,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private playLandAnimation(): void {
    if (this.squashTween) this.squashTween.stop();
    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 0.7,
      duration: 60,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  takeDamage(): boolean {
    if (this.isInvincible) return false;
    this.isInvincible = true;
    this.invincibleTimer = 1500;
    this.lives--;

    this.bodyGraphic.clear();
    this.bodyGraphic.fillStyle(0xff0000, 1);
    this.bodyGraphic.fillRoundedRect(-16, -16, 32, 32, 8);

    this.scene.time.delayedCall(200, () => {
      this.drawPlayer();
    });

    return true;
  }

  reset(x: number, y: number): void {
    this.setPosition(x, y);
    if (this.bodyRef) {
      this.bodyRef.setVelocity(0, 0);
      this.bodyRef.setAcceleration(0, 0);
    }
    this.setAlpha(1);
    this.setScale(1);
    this.isInvincible = true;
    this.invincibleTimer = 1500;
    this.drawPlayer();
  }
}
