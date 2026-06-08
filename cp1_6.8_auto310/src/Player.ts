import Phaser from 'phaser';
import { WallSegment } from './LightBeam';

const MOVE_SPEED = 180;
const ROTATE_SPEED = 2.2;
const PLAYER_RADIUS = 14;

export class Player {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private prismImage: Phaser.GameObjects.Image;
  private glowImage: Phaser.GameObjects.Image;
  private innerGlow: Phaser.GameObjects.Image;
  private directionIndicator: Phaser.GameObjects.Graphics;
  private facingAngle: number = -Math.PI / 2;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  private qKey: Phaser.Input.Keyboard.Key;
  private eKey: Phaser.Input.Keyboard.Key;
  private isDragging: boolean = false;
  private bodyTint: number = 0x5566cc;
  private bodyTintTarget: number = 0x5566cc;
  private shimmerPhase: number = 0;
  private chromaticOverlay: Phaser.GameObjects.Image | null = null;
  private rotationVelocity: number = 0;
  private walls: WallSegment[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.container = scene.add.container(x, y);
    this.container.setDepth(10);

    this.glowImage = scene.add.image(0, 0, 'glow_white');
    this.glowImage.setBlendMode(Phaser.BlendModes.ADD);
    this.glowImage.setAlpha(0.35);
    this.glowImage.setScale(1.2);

    this.prismImage = scene.add.image(0, 0, 'player');
    this.prismImage.setScale(1);

    this.innerGlow = scene.add.image(0, 0, 'glow_blue');
    this.innerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.innerGlow.setAlpha(0.2);
    this.innerGlow.setScale(0.5);

    this.directionIndicator = scene.add.graphics();
    this.drawDirectionIndicator();

    this.container.add([this.glowImage, this.prismImage, this.innerGlow, this.directionIndicator]);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      w: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.qKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.container.x, this.container.y);
      if (dist < 60) {
        this.isDragging = true;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const angle = Math.atan2(pointer.y - this.container.y, pointer.x - this.container.x);
        this.facingAngle = angle;
        this.rotationVelocity = 0.5;
      }
    });

    scene.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  setWalls(walls: WallSegment[]): void {
    this.walls = walls;
  }

  setChromaticOverlay(overlay: Phaser.GameObjects.Image): void {
    this.chromaticOverlay = overlay;
  }

  setBodyTint(color: number): void {
    this.bodyTintTarget = color;
  }

  getFacingAngle(): number {
    return this.facingAngle;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  getRadius(): number {
    return PLAYER_RADIUS;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    let dx = 0;
    let dy = 0;

    if (this.wasd.w.isDown || this.cursors.up.isDown) dy -= 1;
    if (this.wasd.s.isDown || this.cursors.down.isDown) dy += 1;
    if (this.wasd.a.isDown) dx -= 1;
    if (this.wasd.d.isDown) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    let newX = this.container.x + dx * MOVE_SPEED * dt;
    let newY = this.container.y + dy * MOVE_SPEED * dt;

    if (dx !== 0) newX = this.resolveCollisionX(newX, this.container.y);
    if (dy !== 0) newY = this.resolveCollisionY(this.container.x, newY);
    if (dx !== 0 && dy !== 0) {
      newX = this.resolveCollisionX(newX, newY);
      newY = this.resolveCollisionY(newX, newY);
    }

    this.container.setPosition(newX, newY);

    let rotating = false;
    if (this.cursors.left.isDown || this.qKey.isDown) {
      this.facingAngle -= ROTATE_SPEED * dt;
      rotating = true;
      this.rotationVelocity = 1;
    }
    if (this.cursors.right.isDown || this.eKey.isDown) {
      this.facingAngle += ROTATE_SPEED * dt;
      rotating = true;
      this.rotationVelocity = 1;
    }

    this.rotationVelocity *= 0.9;
    if (this.rotationVelocity < 0.01) this.rotationVelocity = 0;

    this.shimmerPhase += dt * (2 + this.rotationVelocity * 5);

    this.prismImage.setAngle((this.facingAngle + Math.PI / 2) * (180 / Math.PI));
    this.innerGlow.setAngle((this.facingAngle + Math.PI / 2) * (180 / Math.PI));

    const shimmerScale = 0.5 + Math.sin(this.shimmerPhase) * 0.08;
    this.innerGlow.setScale(shimmerScale);
    this.innerGlow.setAlpha(0.15 + Math.sin(this.shimmerPhase * 1.3) * 0.1);

    this.bodyTint = Phaser.Display.Color.IntegerToColor(this.bodyTint).lerp(
      Phaser.Display.Color.IntegerToColor(this.bodyTintTarget),
      0.08
    ).color;
    this.prismImage.setTint(this.bodyTint);

    this.drawDirectionIndicator();

    this.glowImage.setAlpha(0.25 + Math.sin(this.shimmerPhase * 0.7) * 0.1);

    if (this.chromaticOverlay) {
      const chromAlpha = this.rotationVelocity * 0.12;
      this.chromaticOverlay.setAlpha(Math.min(chromAlpha, 0.15));
    }
  }

  private drawDirectionIndicator(): void {
    this.directionIndicator.clear();
    const tipDist = 28;
    const tipX = Math.cos(this.facingAngle) * tipDist;
    const tipY = Math.sin(this.facingAngle) * tipDist;
    const baseAngle1 = this.facingAngle + 0.3;
    const baseAngle2 = this.facingAngle - 0.3;
    const baseDist = 18;

    this.directionIndicator.fillStyle(0xffeedd, 0.5);
    this.directionIndicator.beginPath();
    this.directionIndicator.moveTo(tipX, tipY);
    this.directionIndicator.lineTo(Math.cos(baseAngle1) * baseDist, Math.sin(baseAngle1) * baseDist);
    this.directionIndicator.lineTo(Math.cos(baseAngle2) * baseDist, Math.sin(baseAngle2) * baseDist);
    this.directionIndicator.closePath();
    this.directionIndicator.fillPath();
  }

  private resolveCollisionX(newX: number, y: number): number {
    for (const wall of this.walls) {
      if (this.circleAabbCollision(newX, y, PLAYER_RADIUS, wall)) {
        const wallCenterX = (wall.x1 + wall.x2) / 2;
        return newX < wallCenterX
          ? Math.min(wall.x1, wall.x2) - PLAYER_RADIUS
          : Math.max(wall.x1, wall.x2) + PLAYER_RADIUS;
      }
    }
    return newX;
  }

  private resolveCollisionY(x: number, newY: number): number {
    for (const wall of this.walls) {
      if (this.circleAabbCollision(x, newY, PLAYER_RADIUS, wall)) {
        const wallCenterY = (wall.y1 + wall.y2) / 2;
        return newY < wallCenterY
          ? Math.min(wall.y1, wall.y2) - PLAYER_RADIUS
          : Math.max(wall.y1, wall.y2) + PLAYER_RADIUS;
      }
    }
    return newY;
  }

  private circleAabbCollision(cx: number, cy: number, r: number, wall: WallSegment): boolean {
    const minX = Math.min(wall.x1, wall.x2);
    const maxX = Math.max(wall.x1, wall.x2);
    const minY = Math.min(wall.y1, wall.y2);
    const maxY = Math.max(wall.y1, wall.y2);

    const nearestX = Phaser.Math.Clamp(cx, minX, maxX);
    const nearestY = Phaser.Math.Clamp(cy, minY, maxY);
    const dist = Phaser.Math.Distance.Between(cx, cy, nearestX, nearestY);
    return dist < r;
  }

  destroy(): void {
    this.container.destroy();
  }
}
