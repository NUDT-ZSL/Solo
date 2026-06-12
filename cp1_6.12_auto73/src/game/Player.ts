import type { AudioEngine } from '../audio/AudioEngine';

export interface PlayerPhysics {
  gravity: number;
  jumpVelocity: number;
  horizontalSpeed: number;
  maxFallSpeed: number;
  maxJumpHeight: number;
  maxJumpDuration: number;
}

export const DEFAULT_PLAYER_PHYSICS: PlayerPhysics = {
  gravity: 1800,
  jumpVelocity: -550,
  horizontalSpeed: 280,
  maxFallSpeed: 900,
  maxJumpHeight: 180,
  maxJumpDuration: 300
};

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
  isSliding: boolean;
  isGrounded: boolean;
  animFrame: number;
  facingRight: boolean;
}

type ActionCallback = (action: 'jump' | 'slide' | 'land') => void;

export class Player {
  state: PlayerState;
  private physics: PlayerPhysics;
  private jumpHoldTime: number = 0;
  private isJumpKeyHeld: boolean = false;
  private slideTimer: number = 0;
  private readonly slideDuration: number = 500;
  private audioEngine: AudioEngine | null = null;
  private onAction: ActionCallback | null = null;

  constructor(x: number, y: number, physics: PlayerPhysics = DEFAULT_PLAYER_PHYSICS) {
    this.physics = physics;
    this.state = {
      x,
      y,
      width: 16,
      height: 16,
      velocityY: 0,
      isJumping: false,
      isSliding: false,
      isGrounded: true,
      animFrame: 0,
      facingRight: true
    };
  }

  setAudioEngine(engine: AudioEngine): void {
    this.audioEngine = engine;
  }

  setActionCallback(cb: ActionCallback): void {
    this.onAction = cb;
  }

  getPhysics(): PlayerPhysics {
    return { ...this.physics };
  }

  getReachableHeight(): number {
    return this.physics.maxJumpHeight;
  }

  getHorizontalSpeed(): number {
    return this.physics.horizontalSpeed;
  }

  jumpPress(): void {
    if (this.state.isGrounded && !this.state.isSliding) {
      this.state.velocityY = this.physics.jumpVelocity;
      this.state.isJumping = true;
      this.state.isGrounded = false;
      this.jumpHoldTime = 0;
      this.isJumpKeyHeld = true;
      this.audioEngine?.playAction('jump');
      this.onAction?.('jump');
    }
  }

  jumpRelease(): void {
    this.isJumpKeyHeld = false;
    if (this.state.isJumping && this.state.velocityY < -120) {
      this.state.velocityY = -120;
    }
  }

  slidePress(): void {
    if (this.state.isGrounded && !this.state.isSliding) {
      this.state.isSliding = true;
      this.slideTimer = this.slideDuration;
      this.state.height = 10;
      this.audioEngine?.playAction('slide');
      this.onAction?.('slide');
    }
  }

  slideRelease(): void {
    if (this.state.isSliding && this.slideTimer < this.slideDuration * 0.4) {
      this.endSlide();
    }
  }

  private endSlide(): void {
    this.state.isSliding = false;
    this.slideTimer = 0;
    this.state.height = 16;
  }

  land(): void {
    if (!this.state.isGrounded) {
      this.state.isGrounded = true;
      this.state.isJumping = false;
      this.state.velocityY = 0;
      this.jumpHoldTime = 0;
      this.audioEngine?.playAction('land');
      this.onAction?.('land');
    }
  }

  update(dt: number, platforms: Array<{ x: number; y: number; width: number; height: number }>, scrollOffset: number): void {
    if (this.state.isSliding) {
      this.slideTimer -= dt * 1000;
      if (this.slideTimer <= 0) {
        this.endSlide();
      }
    }

    if (this.state.isJumping && this.isJumpKeyHeld) {
      this.jumpHoldTime += dt * 1000;
      if (this.jumpHoldTime >= this.physics.maxJumpDuration) {
        this.isJumpKeyHeld = false;
        if (this.state.velocityY < 0) {
          this.state.velocityY = Math.min(this.state.velocityY, -120);
        }
      }
    }

    if (!this.state.isGrounded) {
      this.state.velocityY += this.physics.gravity * dt;
      if (this.state.velocityY > this.physics.maxFallSpeed) {
        this.state.velocityY = this.physics.maxFallSpeed;
      }
    }

    this.state.y += this.state.velocityY * dt;

    let landed = false;
    for (const p of platforms) {
      const px = p.x - scrollOffset;
      if (
        this.state.x + this.state.width > px &&
        this.state.x < px + p.width
      ) {
        if (
          this.state.velocityY >= 0 &&
          this.state.y + this.state.height >= p.y &&
          this.state.y + this.state.height <= p.y + p.height + this.state.velocityY * dt + 2
        ) {
          this.state.y = p.y - this.state.height;
          landed = true;
        }
      }
    }

    if (landed) {
      this.land();
    } else if (!this.state.isJumping && this.state.velocityY > 0) {
      this.state.isGrounded = false;
    }

    this.state.animFrame = (this.state.animFrame + dt * 12) % 4;
  }

  getBoundingBox(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    };
  }

  reset(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
    this.state.velocityY = 0;
    this.state.isJumping = false;
    this.state.isSliding = false;
    this.state.isGrounded = true;
    this.state.height = 16;
    this.jumpHoldTime = 0;
    this.slideTimer = 0;
    this.isJumpKeyHeld = false;
  }

  render(ctx: CanvasRenderingContext2D, scale: number, offsetX: number): void {
    const s = scale;
    const x = Math.floor((this.state.x + offsetX) * s);
    const y = Math.floor(this.state.y * s);

    if (this.state.isSliding) {
      ctx.fillStyle = '#e94560';
      ctx.fillRect(x, y, s * 16, s * 10);
      ctx.fillStyle = '#0f3460';
      ctx.fillRect(x + s * 2, y + s * 2, s * 3, s * 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + s * 10, y + s * 3, s * 2, s * 2);
    } else {
      ctx.fillStyle = '#e94560';
      ctx.fillRect(x + s * 4, y, s * 8, s * 6);
      ctx.fillRect(x + s * 2, y + s * 6, s * 12, s * 6);

      const frame = Math.floor(this.state.animFrame);
      if (this.state.isGrounded) {
        const legOffset = frame % 2 === 0 ? 0 : s;
        ctx.fillRect(x + s * 3, y + s * 12, s * 4, s * 4 + legOffset);
        ctx.fillRect(x + s * 9, y + s * 12, s * 4, s * 4 + (s - legOffset));
      } else {
        ctx.fillRect(x + s * 3, y + s * 12, s * 4, s * 3);
        ctx.fillRect(x + s * 9, y + s * 12, s * 4, s * 3);
      }

      ctx.fillStyle = '#0f3460';
      ctx.fillRect(x + s * 6, y + s * 2, s * 2, s * 2);
      ctx.fillRect(x + s * 10, y + s * 2, s * 2, s * 2);

      ctx.fillStyle = '#fff';
      ctx.fillRect(x + s * 6, y + s * 2, s, s);
      ctx.fillRect(x + s * 10, y + s * 2, s, s);
    }
  }
}
