export interface InkTrail {
  x: number;
  y: number;
  opacity: number;
  size: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  normalHeight: number;
  slideHeight: number;
  velocityY: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  slideDuration: number;
  inkTrails: InkTrail[];
  animFrame: number;
  animTimer: number;
  invincible: boolean;
  invincibleTimer: number;
}

const GRAVITY = 2800;
const JUMP_VELOCITY = -900;
const SLIDE_DURATION = 0.6;
const MAX_TRAILS = 20;
const INVINCIBLE_DURATION = 1.5;

export class Player {
  state: PlayerState;
  private groundY: number;
  private playerX: number;

  constructor(canvasWidth: number, groundY: number) {
    this.groundY = groundY;
    this.playerX = canvasWidth * 0.15;
    const normalHeight = 60;
    const slideHeight = 25;
    this.state = {
      x: this.playerX,
      y: groundY - normalHeight,
      width: 30,
      height: normalHeight,
      normalHeight,
      slideHeight,
      velocityY: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      slideDuration: SLIDE_DURATION,
      inkTrails: [],
      animFrame: 0,
      animTimer: 0,
      invincible: false,
      invincibleTimer: 0,
    };
  }

  jump() {
    if (!this.state.isJumping && !this.state.isSliding) {
      this.state.velocityY = JUMP_VELOCITY;
      this.state.isJumping = true;
    }
  }

  slide() {
    if (!this.state.isJumping && !this.state.isSliding) {
      this.state.isSliding = true;
      this.state.slideTimer = this.state.slideDuration;
      this.state.height = this.state.slideHeight;
      this.state.y = this.groundY - this.state.slideHeight;
    }
  }

  hit() {
    if (this.state.invincible) return false;
    this.state.invincible = true;
    this.state.invincibleTimer = INVINCIBLE_DURATION;
    return true;
  }

  update(dt: number) {
    if (this.state.isJumping) {
      this.state.velocityY += GRAVITY * dt;
      this.state.y += this.state.velocityY * dt;

      if (this.state.y >= this.groundY - this.state.normalHeight) {
        this.state.y = this.groundY - this.state.normalHeight;
        this.state.velocityY = 0;
        this.state.isJumping = false;
      }
    }

    if (this.state.isSliding) {
      this.state.slideTimer -= dt;
      if (this.state.slideTimer <= 0) {
        this.state.isSliding = false;
        this.state.height = this.state.normalHeight;
        this.state.y = this.groundY - this.state.normalHeight;
      }
    }

    if (this.state.invincible) {
      this.state.invincibleTimer -= dt;
      if (this.state.invincibleTimer <= 0) {
        this.state.invincible = false;
      }
    }

    this.state.animTimer += dt;
    if (this.state.animTimer > 0.1) {
      this.state.animTimer = 0;
      this.state.animFrame = (this.state.animFrame + 1) % 4;
    }

    if (!this.state.isJumping) {
      this.state.inkTrails.push({
        x: this.state.x - 5,
        y: this.state.y + this.state.height - 5,
        opacity: 0.5,
        size: 3 + Math.random() * 4,
      });
    }

    for (let i = this.state.inkTrails.length - 1; i >= 0; i--) {
      this.state.inkTrails[i].opacity -= dt * 1.5;
      this.state.inkTrails[i].size -= dt * 3;
      if (this.state.inkTrails[i].opacity <= 0 || this.state.inkTrails[i].size <= 0) {
        this.state.inkTrails.splice(i, 1);
      }
    }

    while (this.state.inkTrails.length > MAX_TRAILS) {
      this.state.inkTrails.shift();
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.renderInkTrails(ctx);

    if (this.state.invincible && Math.floor(this.state.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (this.state.isSliding) {
      this.renderSliding(ctx);
    } else if (this.state.isJumping) {
      this.renderJumping(ctx);
    } else {
      this.renderRunning(ctx);
    }

    ctx.globalAlpha = 1;
  }

  private renderInkTrails(ctx: CanvasRenderingContext2D) {
    for (const trail of this.state.inkTrails) {
      ctx.fillStyle = `rgba(44, 44, 44, ${trail.opacity})`;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderRunning(ctx: CanvasRenderingContext2D) {
    const { x, y, height, animFrame } = this.state;
    const ink = '#1a1a1a';

    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.15);
    ctx.lineTo(x, y + height * 0.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y + height * 0.08, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.3);
    ctx.lineTo(x - 10, y + height * 0.45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.3);
    ctx.lineTo(x + 10, y + height * 0.4);
    ctx.stroke();

    const legOffset = [0, 8, 0, -8][animFrame];
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.55);
    ctx.lineTo(x + legOffset - 5, y + height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.55);
    ctx.lineTo(x - legOffset + 5, y + height);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.2);
    ctx.quadraticCurveTo(x + 15, y + height * 0.15, x + 20, y + height * 0.25);
    ctx.stroke();
  }

  private renderJumping(ctx: CanvasRenderingContext2D) {
    const { x, y, height } = this.state;
    const ink = '#1a1a1a';

    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.15);
    ctx.lineTo(x, y + height * 0.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y + height * 0.08, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.3);
    ctx.lineTo(x - 12, y + height * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.3);
    ctx.lineTo(x + 12, y + height * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.55);
    ctx.lineTo(x - 8, y + height * 0.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.55);
    ctx.lineTo(x + 8, y + height * 0.85);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.2);
    ctx.quadraticCurveTo(x + 18, y + height * 0.1, x + 22, y + height * 0.2);
    ctx.stroke();
  }

  private renderSliding(ctx: CanvasRenderingContext2D) {
    const { x, y, height } = this.state;
    const ink = '#1a1a1a';

    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 5, y + height * 0.2);
    ctx.lineTo(x + 5, y + height * 0.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + 5, y + height * 0.1, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 5, y + height * 0.7);
    ctx.lineTo(x - 15, y + height * 0.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 5, y + height * 0.7);
    ctx.lineTo(x + 20, y + height * 0.9);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + height * 0.3);
    ctx.quadraticCurveTo(x - 10, y + height * 0.2, x - 15, y + height * 0.35);
    ctx.stroke();
  }

  getHitbox() {
    return {
      x: this.state.x - this.state.width / 2,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height,
    };
  }

  resize(canvasWidth: number, groundY: number) {
    this.groundY = groundY;
    this.playerX = canvasWidth * 0.15;
    this.state.x = this.playerX;
    if (!this.state.isJumping) {
      this.state.y = groundY - this.state.height;
    }
  }
}
