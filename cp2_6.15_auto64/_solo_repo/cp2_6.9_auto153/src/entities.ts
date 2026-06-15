import type { Platform, PlatformManager } from './platform';

export interface TrailPoint {
  x: number;
  y: number;
}

export class Sprite {
  x: number;
  y: number;
  width = 20;
  height = 28;
  vx = 0;
  vy = 0;
  onGround = false;
  facing: 1 | -1 = 1;
  lives = 3;
  score = 0;

  jumping = false;
  jumpTime = 0;
  jumpDuration = 0.4;
  jumpHeight = 80;

  dashing = false;
  dashTime = 0;
  dashDuration = 0.2;
  dashCooldown = 0;
  dashCooldownDuration = 1.5;
  dashSpeed = 6;
  moveSpeed = 3;

  cloakTrail: TrailPoint[] = [];
  ribbonTrail: TrailPoint[] = [];
  trailLength = 15;

  invincible = false;
  invincibleTime = 0;
  invincibleDuration = 1.0;

  shakeAmplitude = 0;

  private startX: number;
  private startY: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    for (let i = 0; i < this.trailLength; i++) {
      this.cloakTrail.push({ x, y });
      this.ribbonTrail.push({ x, y });
    }
  }

  reset(): void {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumping = false;
    this.jumpTime = 0;
    this.dashing = false;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.lives = 3;
    this.score = 0;
    this.invincible = false;
    this.invincibleTime = 0;
    this.shakeAmplitude = 0;
    for (let i = 0; i < this.trailLength; i++) {
      this.cloakTrail[i].x = this.startX;
      this.cloakTrail[i].y = this.startY;
      this.ribbonTrail[i].x = this.startX;
      this.ribbonTrail[i].y = this.startY;
    }
  }

  triggerShake(amount: number): void {
    this.shakeAmplitude = Math.max(this.shakeAmplitude, amount);
  }

  update(
    dt: number,
    keys: Set<string>,
    platforms: PlatformManager,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const prevY = this.y;

    let moveX = 0;
    if (keys.has('ArrowLeft')) {
      moveX -= 1;
      this.facing = -1;
    }
    if (keys.has('ArrowRight')) {
      moveX += 1;
      this.facing = 1;
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if ((keys.has('ShiftLeft') || keys.has('ShiftRight')) && this.dashCooldown <= 0 && moveX !== 0) {
      this.dashing = true;
      this.dashTime = this.dashDuration;
      this.dashCooldown = this.dashCooldownDuration;
    }

    if (this.dashing) {
      this.dashTime -= dt;
      this.vx = this.facing * this.dashSpeed;
      if (this.dashTime <= 0) {
        this.dashing = false;
      }
    } else {
      this.vx = moveX * this.moveSpeed;
    }

    if (keys.has('Space') && this.onGround && !this.jumping) {
      this.jumping = true;
      this.jumpTime = 0;
      this.onGround = false;
    }

    if (this.jumping) {
      this.jumpTime += dt;
      const t = this.jumpTime / this.jumpDuration;
      if (t >= 1) {
        this.jumping = false;
        this.vy = 0;
      } else {
        this.vy = -4 * this.jumpHeight * (1 - t) / this.jumpDuration;
      }
    } else if (!this.onGround) {
      this.vy += 1200 * dt;
    }

    this.x += this.vx;
    this.y += this.vy;

    const platform = platforms.checkCollision(this.x, this.y, this.width, this.height, prevY);
    if (platform && !this.jumping && this.vy >= 0) {
      this.y = platform.y - this.height / 2;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    const halfW = this.width / 2;
    if (this.x - halfW < 0) this.x = halfW;
    if (this.x + halfW > canvasWidth) this.x = canvasWidth - halfW;

    if (this.y > canvasHeight + 100) {
      this.loseLife();
      this.respawn();
    }

    this.cloakTrail.unshift({ x: this.x - this.facing * 4, y: this.y + 4 });
    this.cloakTrail.pop();
    this.ribbonTrail.unshift({ x: this.x + this.facing * 6, y: this.y - 6 });
    this.ribbonTrail.pop();

    if (this.invincible) {
      this.invincibleTime -= dt;
      if (this.invincibleTime <= 0) {
        this.invincible = false;
      }
    }

    if (this.shakeAmplitude > 0) {
      this.shakeAmplitude *= 0.85;
      if (this.shakeAmplitude < 0.1) this.shakeAmplitude = 0;
    }
  }

  collectNote(): void {
    this.score++;
    this.triggerShake(2);
  }

  loseLife(): void {
    if (this.invincible) return;
    this.lives--;
    this.invincible = true;
    this.invincibleTime = this.invincibleDuration;
    this.triggerShake(6);
  }

  respawn(): void {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
  }

  getRenderOffset(): { ox: number; oy: number } {
    if (this.shakeAmplitude <= 0) return { ox: 0, oy: 0 };
    return {
      ox: (Math.random() - 0.5) * this.shakeAmplitude * 2,
      oy: (Math.random() - 0.5) * this.shakeAmplitude * 2,
    };
  }
}

export class Note {
  x: number;
  y: number;
  radius = 8;
  rotation = 0;
  pulseTime = Math.random() * 2;
  pulseDuration = 2;
  collected = false;
  platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
    this.x = platform.x + Math.random() * (platform.width - 20) + 10;
    this.y = platform.y - 18;
  }

  update(dt: number): void {
    this.rotation += 1 * (Math.PI / 180);
    this.pulseTime += dt;
    if (this.pulseTime >= this.pulseDuration) {
      this.pulseTime = 0;
    }
  }

  getPulseColor(): string {
    const t = (Math.sin((this.pulseTime / this.pulseDuration) * Math.PI * 2) + 1) / 2;
    const a = { r: 0xff, g: 0xd7, b: 0x00 };
    const b = { r: 0xff, g: 0xa5, b: 0x00 };
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const b2 = Math.round(a.b + (b.b - a.b) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
  }

  checkCollision(sprite: Sprite): boolean {
    const dx = this.x - sprite.x;
    const dy = this.y - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + Math.max(sprite.width, sprite.height) / 2;
  }
}

export class Bat {
  x: number;
  y: number;
  width = 30;
  height = 20;
  speed = 1.2;
  vx = 0;
  vy = 0;
  flashing = false;
  flashTime = 0;
  flashDuration = 0.25;
  dead = false;
  hitCooldown = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        this.x = Math.random() * canvasWidth;
        this.y = -30;
        break;
      case 1:
        this.x = canvasWidth + 30;
        this.y = Math.random() * canvasHeight;
        break;
      case 2:
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + 30;
        break;
      default:
        this.x = -30;
        this.y = Math.random() * canvasHeight;
        break;
    }
  }

  update(dt: number, sprite: Sprite, canvasWidth: number, canvasHeight: number): void {
    if (this.flashing) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) {
        this.dead = true;
      }
      return;
    }

    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    const dx = sprite.x - this.x;
    const dy = sprite.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -200 || this.x > canvasWidth + 200 || this.y < -200 || this.y > canvasHeight + 200) {
      this.dead = true;
    }
  }

  checkCollision(sprite: Sprite): 'hit' | 'touched' | null {
    if (this.flashing || this.hitCooldown > 0) return null;
    const dx = this.x - sprite.x;
    const dy = this.y - sprite.y;
    const halfW = (this.width + sprite.width) / 2;
    const halfH = (this.height + sprite.height) / 2;
    if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
      if (sprite.dashing || sprite.vy > 100) {
        this.flashing = true;
        this.flashTime = this.flashDuration;
        return 'touched';
      } else {
        this.hitCooldown = 0.5;
        return 'hit';
      }
    }
    return null;
  }
}
