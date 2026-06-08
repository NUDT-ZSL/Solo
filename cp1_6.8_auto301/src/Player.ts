import Phaser from 'phaser';
import { SoundWave } from './SoundWave';

const MOVE_SPEED = 280;
const JUMP_VELOCITY = -520;
const FIRE_COOLDOWN = 250;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private lastFireTime: number = 0;
  private fireCooldown: number = FIRE_COOLDOWN;
  private facingRight: boolean = true;
  private activeSpirits: number = 0;
  private maxSpirits: number = 3;
  private sceneRef: Phaser.Scene;
  private wallGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private crystalGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private spiritGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private onHitCrystal: ((wave: SoundWave, crystal: Phaser.Physics.Arcade.Sprite) => void) | null = null;
  private onHitSpirit: ((wave: SoundWave, spirit: Phaser.Physics.Arcade.Sprite) => void) | null = null;
  private glow: Phaser.GameObjects.Ellipse | null = null;
  private groundGroup: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.sceneRef = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 30);
    body.setOffset(6, 4);

    this.setDepth(10);
    this.createGlow();

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private createGlow(): void {
    this.glow = this.sceneRef.add.ellipse(this.x, this.y, 60, 60, 0x3355cc, 0.15);
    this.glow.setDepth(9);
  }

  setWallGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.wallGroup = group;
  }

  setGroundGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.groundGroup = group;
  }

  setCrystalGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.crystalGroup = group;
  }

  setSpiritGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.spiritGroup = group;
  }

  setOnHitCrystal(cb: (wave: SoundWave, crystal: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onHitCrystal = cb;
  }

  setOnHitSpirit(cb: (wave: SoundWave, spirit: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onHitSpirit = cb;
  }

  addSpirit(): void {
    if (this.activeSpirits < this.maxSpirits) {
      this.activeSpirits++;
    }
  }

  getSpiritCount(): number {
    return this.activeSpirits;
  }

  update(): void {
    if (!this.active || !this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    if (this.cursors.left.isDown) {
      body.setVelocityX(-MOVE_SPEED);
      this.facingRight = false;
      this.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(MOVE_SPEED);
      this.facingRight = true;
      this.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    if (this.cursors.up.isDown && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.fireSoundWave();
    }

    if (this.glow) {
      this.glow.setPosition(this.x, this.y);
      const glowSize = 60 + this.activeSpirits * 20;
      this.glow.setSize(glowSize, glowSize);
      this.glow.setAlpha(0.15 + this.activeSpirits * 0.05);
    }
  }

  private fireSoundWave(): void {
    const now = this.sceneRef.time.now;
    if (now - this.lastFireTime < this.fireCooldown) return;
    this.lastFireTime = now;

    let dirX = this.facingRight ? 1 : -1;
    let dirY = 0;

    if (this.cursors.up.isDown) {
      dirY = -1;
      if (this.cursors.left.isDown || this.cursors.right.isDown) {
        dirX = this.facingRight ? 1 : -1;
      } else {
        dirX = 0;
      }
    } else if (this.cursors.down.isDown && !(this.body as Phaser.Physics.Arcade.Body).blocked.down) {
      dirY = 1;
      dirX = 0;
    }

    const wave = new SoundWave(this.sceneRef, this.x, this.y - 4);
    wave.setWallGroup(this.wallGroup!);
    wave.setCrystalGroup(this.crystalGroup!);
    wave.setSpiritGroup(this.spiritGroup!);
    wave.setOnHitCrystal(this.onHitCrystal!);
    wave.setOnHitSpirit(this.onHitSpirit!);
    wave.fire(dirX, dirY, this.activeSpirits, this.activeSpirits);

    this.sceneRef.tweens.add({
      targets: this.glow,
      alpha: 0.4,
      duration: 80,
      yoyo: true,
    });
  }
}
