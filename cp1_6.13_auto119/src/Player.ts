import type { Platform, Spike, Coin, Portal } from './LevelGenerator';

const PLAYER_SIZE = 30;
const PLAYER_SPEED = 250;
const JUMP_VELOCITY = 400;
const GRAVITY = 800;
const SQUASH_DURATION = 0.1;
const SQUASH_SCALE = 0.85;

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facingRight: boolean;
  scaleX: number;
  scaleY: number;
}

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facingRight: boolean;
  scaleX: number;
  scaleY: number;

  private squashTimer: number = 0;
  private wasInAir: boolean = false;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.width = PLAYER_SIZE;
    this.height = PLAYER_SIZE;
    this.onGround = false;
    this.facingRight = true;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  reset(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facingRight = true;
    this.scaleX = 1;
    this.scaleY = 1;
    this.squashTimer = 0;
    this.wasInAir = false;
  }

  update(dt: number, input: { left: boolean; right: boolean; jump: boolean }, platforms: Platform[], levelWidth: number, levelHeight: number): void {
    if (input.left) {
      this.vx = -PLAYER_SPEED;
      this.facingRight = false;
    } else if (input.right) {
      this.vx = PLAYER_SPEED;
      this.facingRight = true;
    } else {
      this.vx = 0;
    }

    if (input.jump && this.onGround) {
      this.vy = -JUMP_VELOCITY;
      this.onGround = false;
      this.wasInAir = true;
    }

    this.vy += GRAVITY * dt;
    if (this.vy > 1200) this.vy = 1200;

    this.x += this.vx * dt;

    if (this.x < 0) this.x = 0;
    if (this.x + this.width > levelWidth) this.x = levelWidth - this.width;

    this.onGround = false;

    for (const platform of platforms) {
      if (this.checkPlatformCollision(platform)) {
        if (this.vx > 0 && this.x + this.width - this.vx * dt <= platform.x + 1) {
          this.x = platform.x - this.width;
        } else if (this.vx < 0 && this.x - this.vx * dt >= platform.x + platform.width - 1) {
          this.x = platform.x + platform.width;
        }
      }
    }

    this.y += this.vy * dt;

    for (const platform of platforms) {
      if (this.checkPlatformCollision(platform)) {
        if (this.vy > 0 && this.y + this.height - this.vy * dt <= platform.y + 1) {
          this.y = platform.y - this.height;
          this.vy = 0;
          if (!this.onGround && this.wasInAir) {
            this.squashTimer = SQUASH_DURATION;
          }
          this.onGround = true;
          this.wasInAir = false;
        } else if (this.vy < 0 && this.y - this.vy * dt >= platform.y + platform.height - 1) {
          this.y = platform.y + platform.height;
          this.vy = 0;
        }
      }
    }

    if (!this.onGround) {
      this.wasInAir = true;
    }

    if (this.y + this.height > levelHeight) {
      this.y = levelHeight - this.height;
      this.vy = 0;
      if (this.wasInAir) {
        this.squashTimer = SQUASH_DURATION;
      }
      this.onGround = true;
      this.wasInAir = false;
    }

    this.updateSquash(dt);
  }

  private updateSquash(dt: number): void {
    if (this.squashTimer > 0) {
      this.squashTimer -= dt;
      if (this.squashTimer < 0) this.squashTimer = 0;

      const t = 1 - this.squashTimer / SQUASH_DURATION;
      const ease = this.easeInOutQuad(t);

      if (ease <= 0.5) {
        const s = ease * 2;
        this.scaleX = 1 + (1 - SQUASH_SCALE) * s;
        this.scaleY = SQUASH_SCALE + (1 - SQUASH_SCALE) * s;
      } else {
        const s = (ease - 0.5) * 2;
        this.scaleX = 1 - (1 - SQUASH_SCALE) * s;
        this.scaleY = SQUASH_SCALE + (1 - SQUASH_SCALE) * (1 - s);
      }
    } else {
      this.scaleX = 1;
      this.scaleY = 1;
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private checkPlatformCollision(platform: Platform): boolean {
    return (
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x &&
      this.y < platform.y + platform.height &&
      this.y + this.height > platform.y
    );
  }

  checkSpikeCollision(spikes: Spike[]): boolean {
    for (const spike of spikes) {
      const sx = spike.x + spike.size / 2;
      const sy = spike.y + spike.size;
      const px = this.x + this.width / 2;
      const py = this.y + this.height / 2;
      const dx = Math.abs(px - sx);
      const dy = Math.abs(py - sy);
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const spikeHalf = spike.size / 2;

      if (dx < halfW + spikeHalf * 0.5 && dy < halfH + spikeHalf * 0.6) {
        return true;
      }
    }
    return false;
  }

  checkCoinCollision(coins: Coin[]): number {
    let collected = 0;
    for (const coin of coins) {
      if (coin.collected) continue;
      const dx = (this.x + this.width / 2) - coin.x;
      const dy = (this.y + this.height / 2) - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.width / 2 + 12) {
        coin.collected = true;
        collected++;
      }
    }
    return collected;
  }

  checkPortalCollision(portal: Portal): boolean {
    const dx = (this.x + this.width / 2) - portal.x;
    const dy = (this.y + this.height / 2) - portal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < portal.radius + this.width / 4;
  }
}
