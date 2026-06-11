export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  fireLevel: number;
  powerUpTimer: number;
  isPowerUp: boolean;
  invincibleTimer: number;
}

export class Player {
  state: PlayerState;
  bullets: Bullet[] = [];
  keys: Set<string> = new Set();
  shootCooldown: number = 0;
  readonly shootInterval: number = 150;
  readonly bulletSpeed: number = 0.8;
  readonly maxLives: number = 3;
  readonly powerUpDuration: number = 5000;
  readonly invincibleDuration: number = 2000;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.state = {
      x: canvasWidth / 2 - 25,
      y: canvasHeight - 120,
      width: 50,
      height: 60,
      speed: 0.5,
      lives: this.maxLives,
      fireLevel: 1,
      powerUpTimer: 0,
      isPowerUp: false,
      invincibleTimer: 0
    };
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    const moveAmount = this.state.speed * deltaTime;

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

    if (this.state.isPowerUp) {
      this.state.powerUpTimer -= deltaTime;
      if (this.state.powerUpTimer <= 0) {
        this.state.isPowerUp = false;
        this.state.fireLevel = 1;
      }
    }

    if (this.state.invincibleTimer > 0) {
      this.state.invincibleTimer -= deltaTime;
    }

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

  shoot(): void {
    if (this.shootCooldown > 0) return;
    this.shootCooldown = this.shootInterval;

    const bulletWidth = 4;
    const bulletHeight = 15;

    if (this.state.fireLevel >= 2) {
      this.bullets.push({
        x: this.state.x + 8,
        y: this.state.y,
        width: bulletWidth,
        height: bulletHeight,
        speed: this.bulletSpeed,
        active: true
      });
      this.bullets.push({
        x: this.state.x + this.state.width - 12,
        y: this.state.y,
        width: bulletWidth,
        height: bulletHeight,
        speed: this.bulletSpeed,
        active: true
      });
    } else {
      this.bullets.push({
        x: this.state.x + this.state.width / 2 - bulletWidth / 2,
        y: this.state.y,
        width: bulletWidth,
        height: bulletHeight,
        speed: this.bulletSpeed,
        active: true
      });
    }
  }

  takeDamage(): boolean {
    if (this.state.invincibleTimer > 0) return false;
    this.state.lives--;
    this.state.invincibleTimer = this.invincibleDuration;
    this.state.isPowerUp = false;
    this.state.fireLevel = 1;
    this.state.powerUpTimer = 0;
    return this.state.lives <= 0;
  }

  activatePowerUp(): void {
    this.state.isPowerUp = true;
    this.state.fireLevel = 2;
    this.state.powerUpTimer = this.powerUpDuration;
  }

  getRect(): Rect {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    };
  }

  reset(canvasWidth: number, canvasHeight: number): void {
    this.state.x = canvasWidth / 2 - 25;
    this.state.y = canvasHeight - 120;
    this.state.lives = this.maxLives;
    this.state.fireLevel = 1;
    this.state.powerUpTimer = 0;
    this.state.isPowerUp = false;
    this.state.invincibleTimer = 0;
    this.bullets = [];
    this.shootCooldown = 0;
    this.keys.clear();
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
