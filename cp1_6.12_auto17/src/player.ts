import type { Rect, Bullet, PlayerState } from './types';
import { PowerUpType, POWER_UP_CONFIGS } from './powerup';

export { Rect, Bullet };

export class Player {
  state: PlayerState;
  bullets: Bullet[] = [];
  keys: Set<string> = new Set();
  shootCooldown: number = 0;
  readonly shootInterval: number = 150;
  readonly bulletSpeed: number = 0.8;
  readonly maxLives: number = 3;
  readonly powerUpDuration: number = 5000;
  readonly invincibleDuration: number = 1000;
  readonly collisionShrink: number = 0.8;
  readonly baseSpeed: number = 0.5;
  readonly speedBoostMultiplier: number = 1.5;
  readonly glowPulseSpeed: number = 0.005;

  private powerUpTimers: Map<PowerUpType, number> = new Map();
  private glowPhase: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.state = {
      x: canvasWidth / 2 - 25,
      y: canvasHeight - 120,
      width: 50,
      height: 60,
      speed: this.baseSpeed,
      lives: this.maxLives,
      fireLevel: 1,
      powerUpTimer: 0,
      isPowerUp: false,
      invincibleTimer: 0,
      isInvincible: false,
      glowIntensity: 0,
      shieldActive: false,
      speedBoostActive: false
    };
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    const currentSpeed = this.state.speedBoostActive
      ? this.baseSpeed * this.speedBoostMultiplier
      : this.baseSpeed;
    const moveAmount = currentSpeed * deltaTime;

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this.state.y -= moveAmount;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this.state.y += moveAmount;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.state.x -= moveAmount;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.state.x += moveAmount;
    }

    const statusBarHeight = 60;
    this.state.x = Math.max(0, Math.min(canvasWidth - this.state.width, this.state.x));
    this.state.y = Math.max(0, Math.min(canvasHeight - this.state.height - statusBarHeight, this.state.y));

    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }

    this.updatePowerUps(deltaTime);

    if (this.state.invincibleTimer > 0) {
      this.state.invincibleTimer -= deltaTime;
      this.state.isInvincible = this.state.invincibleTimer > 0;
    } else {
      this.state.isInvincible = false;
    }

    this.glowPhase += this.glowPulseSpeed * deltaTime;
    this.updateGlowIntensity();

    this.bullets.forEach(bullet => {
      if (bullet.active) {
        bullet.y -= bullet.speed * deltaTime;
        if (bullet.y + bullet.height < 0) {
          bullet.active = false;
        }
      }
    });

    this.bullets = this.bullets.filter(b => b.active);
  }

  private updatePowerUps(deltaTime: number): void {
    let hasActivePowerUp = false;

    this.powerUpTimers.forEach((timer, type) => {
      if (timer > 0) {
        timer -= deltaTime;
        this.powerUpTimers.set(type, timer);
        hasActivePowerUp = true;

        if (timer <= 0) {
          this.deactivatePowerUp(type);
        }
      }
    });

    this.state.isPowerUp = hasActivePowerUp;

    const doubleFireTimer = this.powerUpTimers.get(PowerUpType.DOUBLE_FIRE) || 0;
    this.state.fireLevel = doubleFireTimer > 0 ? 2 : 1;
    this.state.powerUpTimer = doubleFireTimer;
  }

  private updateGlowIntensity(): void {
    const baseGlow = this.state.isPowerUp ? 0.6 : 0;
    const pulseGlow = Math.sin(this.glowPhase) * 0.2;
    this.state.glowIntensity = Math.max(0, Math.min(1, baseGlow + pulseGlow));
  }

  shoot(): void {
    if (this.shootCooldown > 0) return;
    this.shootCooldown = this.shootInterval;

    const bulletWidth = 4;

    if (this.state.fireLevel >= 2) {
      this.bullets.push(this.createBullet(this.state.x + 8, this.state.y));
      this.bullets.push(this.createBullet(this.state.x + this.state.width - 12, this.state.y));
    } else {
      this.bullets.push(this.createBullet(
        this.state.x + this.state.width / 2 - bulletWidth / 2,
        this.state.y
      ));
    }
  }

  private createBullet(x: number, y: number): Bullet {
    const inactive = this.bullets.find(b => !b.active);
    if (inactive) {
      inactive.x = x;
      inactive.y = y;
      inactive.active = true;
      return inactive;
    }
    return {
      x: x,
      y: y,
      width: 4,
      height: 15,
      speed: this.bulletSpeed,
      active: true
    };
  }

  takeDamage(): boolean {
    if (this.state.isInvincible) return false;
    if (this.state.shieldActive) {
      this.deactivatePowerUp(PowerUpType.SHIELD);
      this.state.invincibleTimer = this.invincibleDuration;
      this.state.isInvincible = true;
      return false;
    }

    this.state.lives--;
    this.state.invincibleTimer = this.invincibleDuration;
    this.state.isInvincible = true;

    this.clearAllPowerUps();

    return this.state.lives <= 0;
  }

  activatePowerUp(type: PowerUpType): void {
    const config = POWER_UP_CONFIGS[type];
    this.powerUpTimers.set(type, config.duration);

    switch (type) {
      case PowerUpType.DOUBLE_FIRE:
        this.state.fireLevel = 2;
        break;
      case PowerUpType.SHIELD:
        this.state.shieldActive = true;
        break;
      case PowerUpType.SPEED_BOOST:
        this.state.speedBoostActive = true;
        break;
    }
  }

  private deactivatePowerUp(type: PowerUpType): void {
    this.powerUpTimers.set(type, 0);

    switch (type) {
      case PowerUpType.DOUBLE_FIRE:
        this.state.fireLevel = 1;
        break;
      case PowerUpType.SHIELD:
        this.state.shieldActive = false;
        break;
      case PowerUpType.SPEED_BOOST:
        this.state.speedBoostActive = false;
        break;
    }
  }

  private clearAllPowerUps(): void {
    this.powerUpTimers.clear();
    this.state.fireLevel = 1;
    this.state.isPowerUp = false;
    this.state.powerUpTimer = 0;
    this.state.shieldActive = false;
    this.state.speedBoostActive = false;
  }

  checkCollision(enemyRect: Rect): boolean {
    if (this.state.isInvincible) return false;

    const playerRect = this.getCollisionRect();

    return playerRect.x < enemyRect.x + enemyRect.width &&
           playerRect.x + playerRect.width > enemyRect.x &&
           playerRect.y < enemyRect.y + enemyRect.height &&
           playerRect.y + playerRect.height > enemyRect.y;
  }

  getCollisionRect(): Rect {
    const w = this.state.width * this.collisionShrink;
    const h = this.state.height * this.collisionShrink;
    return {
      x: this.state.x + (this.state.width - w) / 2,
      y: this.state.y + (this.state.height - h) / 2,
      width: w,
      height: h
    };
  }

  getRect(): Rect {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    };
  }

  isFlickerVisible(): boolean {
    if (!this.state.isInvincible) return true;
    const flickerRate = 100;
    return Math.floor(this.state.invincibleTimer / flickerRate) % 2 === 0;
  }

  reset(canvasWidth: number, canvasHeight: number): void {
    this.state.x = canvasWidth / 2 - 25;
    this.state.y = canvasHeight - 120;
    this.state.speed = this.baseSpeed;
    this.state.lives = this.maxLives;
    this.state.fireLevel = 1;
    this.state.powerUpTimer = 0;
    this.state.isPowerUp = false;
    this.state.invincibleTimer = 0;
    this.state.isInvincible = false;
    this.state.glowIntensity = 0;
    this.state.shieldActive = false;
    this.state.speedBoostActive = false;
    this.bullets = [];
    this.shootCooldown = 0;
    this.keys.clear();
    this.powerUpTimers.clear();
    this.glowPhase = 0;
  }

  setKey(key: string, pressed: boolean): void {
    const lowerKey = key.toLowerCase();
    if (pressed) {
      this.keys.add(lowerKey);
    } else {
      this.keys.delete(lowerKey);
    }
  }

  isShootKey(key: string): boolean {
    return key === ' ' || key === 'Space';
  }
}
