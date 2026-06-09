import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public readonly maxSpeed: number = 250;
  public readonly jumpForce: number = -450;
  public readonly acceleration: number = 900;
  public readonly drag: number = 1500;

  public canDoubleJump: boolean = false;
  public jumpCount: number = 0;
  public isGrounded: boolean = false;

  private baseScaleX: number = 1;
  private baseScaleY: number = 1;
  private currentScaleX: number = 1;
  private currentScaleY: number = 1;
  private targetScaleX: number = 1;
  private targetScaleY: number = 1;

  private radius: number = 20;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keyW: Phaser.Input.Keyboard.Key | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private keySpace: Phaser.Input.Keyboard.Key | null = null;

  private graphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;

  public slowdownUntil: number = 0;

  private jumpPressedLastFrame: boolean = false;
  private wasGrounded: boolean = false;

  private spawnX: number;
  private spawnY: number;

  private onJumpCallback: (() => void) | null = null;

  private currentTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');

    this.spawnX = x;
    this.spawnY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(this.radius - 2);
    this.setCollideWorldBounds(false);
    this.setBounce(0.05);
    this.setFriction(1, 0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize((this.radius - 2) * 2, (this.radius - 2) * 2);
    body.setOffset(2, 2);

    this.glowGraphics = scene.add.graphics();
    this.graphics = scene.add.graphics();
    this.drawPlayer();

    this.setupInput();
  }

  public setOnJumpCallback(callback: () => void): void {
    this.onJumpCallback = callback;
  }

  private setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.keyW = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private drawPlayer(): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    const r = this.radius;

    this.glowGraphics.setAlpha(0.4);
    for (let i = 3; i >= 0; i--) {
      const glowR = r + 3 + i * 3;
      const alpha = 0.12 + (3 - i) * 0.08;
      this.glowGraphics.fillStyle(0x66ccff, alpha);
      this.glowGraphics.fillCircle(0, 0, glowR);
    }

    this.graphics.save();
    this.graphics.translateCanvas(0, 0);
    this.graphics.scaleCanvas(this.currentScaleX, this.currentScaleY);

    this.graphics.fillGradientStyle(
      0xaaddee, 0x66aadd,
      0x4488bb, 0x2266aa,
      0.85, 0.85, 0.85, 0.85
    );
    this.graphics.fillCircle(0, 0, r);

    this.graphics.fillStyle(0xccffff, 0.55);
    const points: [number, number][] = [];
    const steps = 10;
    const cx0 = -r * 0.6, cy0 = -r * 0.2;
    const cx1 = -r * 0.2, cy1 = -r * 0.7;
    const cx2 = r * 0.1, cy2 = -r * 0.5;
    const cx3 = r * 0.3, cy3 = -r * 0.4;
    const cx4 = r * 0.05, cy4 = -r * 0.1;
    const cx5 = -r * 0.3, cy5 = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x1 = (1-t)*(1-t)*cx0 + 2*(1-t)*t*cx1 + t*t*cx2;
      const y1 = (1-t)*(1-t)*cy0 + 2*(1-t)*t*cy1 + t*t*cy2;
      points.push([x1, y1]);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x2 = (1-t)*(1-t)*cx2 + 2*(1-t)*t*cx3 + t*t*cx4;
      const y2 = (1-t)*(1-t)*cy2 + 2*(1-t)*t*cy3 + t*t*cy4;
      if (i > 0) points.push([x2, y2]);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x3 = (1-t)*(1-t)*cx4 + 2*(1-t)*t*cx5 + t*t*cx0;
      const y3 = (1-t)*(1-t)*cy4 + 2*(1-t)*t*cy5 + t*t*cy0;
      if (i > 0) points.push([x3, y3]);
    }
    if (points.length > 0) {
      this.graphics.beginPath();
      this.graphics.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        this.graphics.lineTo(points[i][0], points[i][1]);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
    }

    this.graphics.fillStyle(0xffffff, 0.3);
    this.graphics.fillCircle(-r * 0.35, -r * 0.35, r * 0.15);
    this.graphics.fillStyle(0xffffff, 0.15);
    this.graphics.fillCircle(r * 0.25, r * 0.2, r * 0.12);

    this.graphics.lineStyle(1.5, 0xaaddff, 0.7);
    this.graphics.strokeCircle(0, 0, r);

    this.graphics.restore();
  }

  update(time: number, delta: number): void {
    this.currentTime = time;
    this.handleMovement(delta);
    this.handleJump();
    this.updateSquashStretch(delta);
    this.checkLanding();

    this.graphics.setPosition(this.x, this.y);
    this.glowGraphics.setPosition(this.x, this.y);

    this.jumpPressedLastFrame = this.isJumpKeyDown();
    this.wasGrounded = this.isGrounded;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.isGrounded = body.blocked.down || body.touching.down;
  }

  private handleMovement(delta: number): void {
    const dt = delta / 1000;
    let moving = false;
    let dir = 0;

    const leftDown = this.cursors?.left?.isDown || this.keyA?.isDown;
    const rightDown = this.cursors?.right?.isDown || this.keyD?.isDown;

    if (leftDown && !rightDown) {
      dir = -1;
      moving = true;
    } else if (rightDown && !leftDown) {
      dir = 1;
      moving = true;
    }

    let speedMultiplier = 1;
    if (this.currentTime < this.slowdownUntil) {
      speedMultiplier = 0.5;
    }

    const effMaxSpeed = this.maxSpeed * speedMultiplier;
    const effAcceleration = this.acceleration * speedMultiplier;

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (moving) {
      const targetVx = dir * effMaxSpeed;
      const currentVx = body.velocity.x;

      if (Math.abs(targetVx - currentVx) < effAcceleration * dt) {
        this.setVelocityX(targetVx);
      } else if (targetVx > currentVx) {
        this.setVelocityX(currentVx + effAcceleration * dt);
      } else {
        this.setVelocityX(currentVx - effAcceleration * dt);
      }
    } else {
      const currentVx = body.velocity.x;
      if (Math.abs(currentVx) < this.drag * dt) {
        this.setVelocityX(0);
      } else {
        this.setVelocityX(currentVx - Math.sign(currentVx) * this.drag * dt);
      }
    }
  }

  private isJumpKeyDown(): boolean {
    return (
      this.cursors?.up?.isDown === true ||
      this.keyW?.isDown === true ||
      this.keySpace?.isDown === true
    );
  }

  private handleJump(): void {
    const jumpPressedNow = this.isJumpKeyDown();
    const jumpJustPressed = jumpPressedNow && !this.jumpPressedLastFrame;

    if (!jumpJustPressed) return;

    if (this.isGrounded) {
      this.setVelocityY(this.jumpForce);
      this.jumpCount = 1;
      this.canDoubleJump = true;
      this.targetScaleX = 1.35;
      this.targetScaleY = 0.7;

      if (this.onJumpCallback) {
        this.onJumpCallback();
      }
    } else if (this.canDoubleJump && this.jumpCount < 2) {
      this.setVelocityY(this.jumpForce * 0.92);
      this.jumpCount = 2;
      this.canDoubleJump = false;
      this.targetScaleX = 1.25;
      this.targetScaleY = 0.75;
      this.createDoubleJumpParticles();

      if (this.onJumpCallback) {
        this.onJumpCallback();
      }
    }
  }

  private checkLanding(): void {
    if (!this.wasGrounded && this.isGrounded) {
      this.targetScaleX = 1.25;
      this.targetScaleY = 0.8;
      this.createLandingParticles();
      this.jumpCount = 0;
      this.canDoubleJump = false;
    }
  }

  private updateSquashStretch(delta: number): void {
    const dt = delta / 1000;
    const lerpSpeed = 8;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y < -50) {
      this.targetScaleX = 0.85;
      this.targetScaleY = 1.2;
    } else if (body.velocity.y > 100) {
      this.targetScaleX = 0.9;
      this.targetScaleY = 1.15;
    }

    this.currentScaleX += (this.targetScaleX - this.currentScaleX) * Math.min(lerpSpeed * dt, 1);
    this.currentScaleY += (this.targetScaleY - this.currentScaleY) * Math.min(lerpSpeed * dt, 1);

    if (this.isGrounded) {
      const diffX = Math.abs(this.currentScaleX - 1);
      const diffY = Math.abs(this.currentScaleY - 1);
      if (diffX < 0.02 && diffY < 0.02) {
        this.targetScaleX = 1;
        this.targetScaleY = 1;
        this.currentScaleX = 1;
        this.currentScaleY = 1;
      }
    }

    this.drawPlayer();
  }

  private createLandingParticles(): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const side = i < count / 2 ? -1 : 1;
      const offset = (i % (count / 2)) / (count / 2);
      const startX = this.x;
      const startY = this.y + this.radius - 4;
      const size = 2 + Math.random() * 2;
      const speedX = side * (80 + Math.random() * 40 + offset * 30);
      const speedY = -(10 + Math.random() * 20);
      const life = 300;

      this.spawnParticle(startX, startY, size, speedX, speedY, life);
    }
  }

  private createDoubleJumpParticles(): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * i) / (count - 1) + Math.PI;
      const startX = this.x;
      const startY = this.y;
      const size = 2 + Math.random() * 2;
      const speed = 60 + Math.random() * 40;
      const speedX = Math.cos(angle) * speed;
      const speedY = Math.sin(angle) * speed;
      const life = 250;

      this.spawnParticle(startX, startY, size, speedX, speedY, life);
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    size: number,
    vx: number,
    vy: number,
    life: number
  ): void {
    const particle = this.scene.add.graphics();
    particle.setPosition(x, y);
    particle.fillStyle(0x99ddff, 1);
    particle.fillCircle(0, 0, size);

    const startTime = this.scene.time.now;
    const gravity = 300;
    let px = x;
    let py = y;
    let cvx = vx;
    let cvy = vy;

    const updateParticle = () => {
      const elapsed = this.scene.time.now - startTime;
      const progress = elapsed / life;

      if (progress >= 1) {
        particle.destroy();
        return;
      }

      const dt = 1 / 60;
      cvy += gravity * dt;
      px += cvx * dt;
      py += cvy * dt;

      particle.setPosition(px, py);
      particle.clear();
      particle.fillStyle(0x99ddff, 1 - progress);
      particle.fillCircle(0, 0, size * (1 - progress * 0.5));

      requestAnimationFrame(updateParticle);
    };

    updateParticle();
  }

  public respawn(): void {
    this.setPosition(this.spawnX, this.spawnY);
    this.setVelocity(0, 0);
    this.setAcceleration(0, 0);
    this.currentScaleX = 1;
    this.currentScaleY = 1;
    this.targetScaleX = 1;
    this.targetScaleY = 1;
    this.jumpCount = 0;
    this.canDoubleJump = false;
    this.slowdownUntil = 0;
    this.drawPlayer();
  }

  public applySlowdown(durationMs: number): void {
    this.slowdownUntil = this.scene.time.now + durationMs;
  }

  destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    super.destroy();
  }
}
