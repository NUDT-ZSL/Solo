import Phaser from 'phaser';
import { MovableBox } from './Platform';

const MOVE_SPEED = 260;
const JUMP_VELOCITY = -430;
const MAX_JUMPS = 2;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyE: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;

  private jumpsRemaining: number = MAX_JUMPS;
  private wasOnGround: boolean = false;
  private facing: number = 1;
  private trailGroup: Phaser.GameObjects.Group;
  private jumpParticles: Phaser.GameObjects.Particles.ParticleEmitter;
  private textureKey: string;
  private eKeyJustDown: boolean = false;
  private interactRequested: boolean = false;
  private pushTargetBox: MovableBox | null = null;
  private touchingBoxLeft: MovableBox | null = null;
  private touchingBoxRight: MovableBox | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, false);

    const w = 14;
    const h = 34;
    this.body?.setSize(w, h);
    this.displayWidth = w;
    this.displayHeight = h;
    this.setCollideWorldBounds(true);
    this.setDrag(400, 0);
    this.setMaxVelocity(MOVE_SPEED, 700);
    this.setFriction(0.8, 0);
    this.textureKey = `player_${Phaser.Math.Between(0, 9999)}`;

    this.createPlayerTexture(w, h);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyW = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keySpace = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.trailGroup = scene.add.group({ classType: Phaser.GameObjects.Image, maxSize: 14 });
    this.jumpParticles = this.createJumpParticles();
    this.jumpParticles.stop();
  }

  private createPlayerTexture(w: number, h: number): void {
    const gfx = this.scene.add.graphics();
    gfx.fillGradientStyle(0xffffff, 0xd8e8ff, 0xb8d0ff, 0x8ab0ff, 1, 1, 1, 1);
    const r = 5;
    gfx.fillRoundedRect(0, 0, w, h, r);
    gfx.generateTexture(this.textureKey, w, h);
    gfx.destroy();
    this.setTexture(this.textureKey);
    this.preFX?.addGlow(0xaac8ff, 0.6, 14);
  }

  private createJumpParticles(): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.scene.add.particles(0, 0, this.textureKey, {
      lifespan: 500,
      speed: { min: 10, max: 40 },
      scale: { start: 0.18, end: 0 },
      alpha: { start: 0.85, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      tint: [0xffffff, 0xc8d8ff, 0xa0c0ff],
      gravityY: 40
    });
  }

  public consumeInteractRequest(): boolean {
    if (this.interactRequested) {
      this.interactRequested = false;
      return true;
    }
    return false;
  }

  public setTouchingBox(box: MovableBox | null, side: 'left' | 'right'): void {
    if (side === 'left') this.touchingBoxLeft = box;
    else this.touchingBoxRight = box;
  }

  update(_time: number, _delta: number): void {
    const onGround = this.body?.blocked.down ?? this.body?.touching.down ?? false;

    if (onGround && !this.wasOnGround) {
      this.jumpsRemaining = MAX_JUMPS;
    }
    this.wasOnGround = onGround;

    let moveDir = 0;
    if (this.keyA.isDown || this.cursors.left.isDown) moveDir -= 1;
    if (this.keyD.isDown || this.cursors.right.isDown) moveDir += 1;

    if (moveDir !== 0) this.facing = moveDir;

    let effectiveSpeed = MOVE_SPEED;
    this.pushTargetBox = null;
    if (moveDir > 0 && this.touchingBoxRight) this.pushTargetBox = this.touchingBoxRight;
    if (moveDir < 0 && this.touchingBoxLeft) this.pushTargetBox = this.touchingBoxLeft;

    if (this.pushTargetBox) {
      effectiveSpeed = MOVE_SPEED * 0.6;
      this.pushTargetBox.applyPush(moveDir, MOVE_SPEED);
    }

    this.setVelocityX(moveDir * effectiveSpeed);

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keyW) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up);

    if (jumpPressed && this.jumpsRemaining > 0) {
      this.setVelocityY(JUMP_VELOCITY);
      this.jumpsRemaining--;
      this.emitJumpParticles();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.eKeyJustDown = true;
      this.interactRequested = true;
    } else {
      this.eKeyJustDown = false;
    }

    if (Math.abs(this.body?.velocity.x ?? 0) > 40) {
      this.spawnTrail();
    }
    this.updateTrail();
  }

  private emitJumpParticles(): void {
    this.jumpParticles.setPosition(this.x, this.y + this.displayHeight / 2 - 2);
    for (let i = 0; i < 6; i++) {
      this.jumpParticles.emitParticleAt(
        this.x + Phaser.Math.FloatBetween(-5, 5),
        this.y + this.displayHeight / 2 - 2,
        {
          angle: Phaser.Math.FloatBetween(60, 120),
          speed: Phaser.Math.FloatBetween(15, 55)
        } as any
      );
    }
  }

  private spawnTrail(): void {
    const img = this.scene.add.image(this.x, this.y, this.textureKey);
    img.setAlpha(0.45);
    img.setTint(0xaac8ff);
    img.setBlendMode(Phaser.BlendModes.ADD);
    img.setDisplaySize(this.displayWidth * 0.9, this.displayHeight * 0.9);
    img.setData('life', 500);
    this.trailGroup.add(img);
    if (this.trailGroup.getLength() > 12) {
      const first = this.trailGroup.getFirstAlive();
      if (first) {
        (first as Phaser.GameObjects.Image).destroy();
        this.trailGroup.remove(first);
      }
    }
  }

  private updateTrail(): void {
    const items = this.trailGroup.getChildren() as Phaser.GameObjects.Image[];
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const life = (item.getData('life') as number) - 16.67;
      if (life <= 0) {
        item.destroy();
        this.trailGroup.remove(item);
      } else {
        item.setData('life', life);
        item.setAlpha(Phaser.Math.Clamp(life / 500 * 0.45, 0, 0.45));
        item.setScale(item.scale * 0.96);
      }
    }
  }

  public getFacing(): number {
    return this.facing;
  }
}
