export interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export class Ball {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public readonly baseSpeed: number;
  public speed: number;
  public attached: boolean = true;
  public isSpeedBoosted: boolean = false;

  private speedBoostTimer: number = 0;
  private trail: TrailParticle[] = [];
  public maxTrailLength: number = 5;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly minHorizontalSpeed: number;

  constructor(canvasWidth: number, canvasHeight: number, paddleY: number, _paddleHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.radius = Math.max(7, canvasWidth * 0.012);
    this.baseSpeed = canvasWidth * 0.009;
    this.speed = this.baseSpeed;
    this.minHorizontalSpeed = this.baseSpeed * 0.2;
    this.x = canvasWidth / 2;
    this.y = paddleY - this.radius - 2;
    this.vx = 0;
    this.vy = 0;
  }

  public attachToPaddle(paddleX: number, paddleWidth: number, paddleY: number): void {
    this.attached = true;
    this.x = paddleX + paddleWidth / 2;
    this.y = paddleY - this.radius - 2;
    this.vx = 0;
    this.vy = 0;
  }

  public launch(): void {
    if (!this.attached) return;
    this.attached = false;
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.8;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    if (Math.abs(this.vx) < this.minHorizontalSpeed) {
      this.vx = this.vx >= 0 ? this.minHorizontalSpeed : -this.minHorizontalSpeed;
    }
  }

  public activateSpeedBoost(duration: number = 5): void {
    this.isSpeedBoosted = true;
    this.speedBoostTimer = duration;
    const boostFactor = 1.5;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      const ratio = (this.baseSpeed * boostFactor) / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
    this.speed = this.baseSpeed * boostFactor;
  }

  public update(deltaTime: number, paddleX: number, paddleWidth: number, paddleY: number): boolean {
    if (this.attached) {
      this.x = paddleX + paddleWidth / 2;
      this.y = paddleY - this.radius - 2;
      return true;
    }

    const prevX = this.x;
    const prevY = this.y;

    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;

    this.trail.unshift({ x: prevX, y: prevY, alpha: 0.6, radius: this.radius });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    this.trail.forEach((p, i) => {
      p.alpha = 0.5 - (i / this.maxTrailLength) * 0.45;
      p.radius = this.radius * (1 - i / this.maxTrailLength * 0.4);
    });

    if (this.isSpeedBoosted) {
      this.speedBoostTimer -= deltaTime;
      if (this.speedBoostTimer <= 0) {
        this.resetSpeed();
      }
    }

    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    }
    if (this.x + this.radius >= this.canvasWidth) {
      this.x = this.canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    }

    if (Math.abs(this.vx) < this.minHorizontalSpeed && !this.attached) {
      this.vx = this.vx >= 0 ? this.minHorizontalSpeed : -this.minHorizontalSpeed;
    }

    return this.y - this.radius <= this.canvasHeight;
  }

  private resetSpeed(): void {
    this.isSpeedBoosted = false;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      const ratio = this.baseSpeed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
    this.speed = this.baseSpeed;
  }

  public checkPaddleCollision(paddle: { x: number; y: number; width: number; height: number }): boolean {
    if (this.attached) return false;

    const ballBottom = this.y + this.radius;
    const ballTop = this.y - this.radius;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;

    if (ballBottom >= paddleTop && ballTop <= paddleBottom &&
        this.x >= paddle.x && this.x <= paddle.x + paddle.width && this.vy > 0) {
      this.y = paddleTop - this.radius;

      const relativeHit = (this.x - paddle.x) / paddle.width;
      let angle: number;

      if (relativeHit < 0.33) {
        angle = Math.PI + (relativeHit / 0.33) * 0.4;
      } else if (relativeHit < 0.66) {
        const mid = (relativeHit - 0.33) / 0.33;
        angle = Math.PI + 0.4 + mid * 0.2;
      } else {
        const right = (relativeHit - 0.66) / 0.34;
        angle = Math.PI + 0.6 + right * 0.4;
      }

      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;

      if (Math.abs(this.vx) < this.minHorizontalSpeed) {
        this.vx = this.vx >= 0 ? this.minHorizontalSpeed : -this.minHorizontalSpeed;
      }

      return true;
    }
    return false;
  }

  public getSpeedBoostTimer(): number {
    return this.speedBoostTimer;
  }

  public clone(): Ball {
    const newBall = new Ball(this.canvasWidth, this.canvasHeight, 0, 0);
    newBall.x = this.x;
    newBall.y = this.y;
    newBall.radius = this.radius;
    newBall.speed = this.speed;
    newBall.baseSpeed;
    newBall.attached = false;
    newBall.isSpeedBoosted = this.isSpeedBoosted;
    newBall.speedBoostTimer = this.speedBoostTimer;
    newBall.maxTrailLength = this.maxTrailLength;
    return newBall;
  }

  public split(): Ball[] {
    const balls: Ball[] = [];
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const currentAngle = Math.atan2(this.vy, this.vx);

    const angles = [currentAngle - Math.PI / 4, currentAngle + Math.PI / 4];
    angles.forEach((angle) => {
      const newBall = this.clone();
      newBall.vx = Math.cos(angle) * currentSpeed;
      newBall.vy = Math.sin(angle) * currentSpeed;
      if (Math.abs(newBall.vx) < this.minHorizontalSpeed) {
        newBall.vx = newBall.vx >= 0 ? this.minHorizontalSpeed : -this.minHorizontalSpeed;
      }
      balls.push(newBall);
    });

    return balls;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.trail.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.isSpeedBoosted
        ? `rgba(255, 100, 100, ${p.alpha})`
        : `rgba(0, 255, 204, ${p.alpha})`;
      ctx.fill();
    });

    ctx.shadowColor = this.isSpeedBoosted ? '#ff3366' : '#00ffcc';
    ctx.shadowBlur = 15;

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius
    );
    if (this.isSpeedBoosted) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#ff99aa');
      gradient.addColorStop(1, '#ff3366');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#aaffee');
      gradient.addColorStop(1, '#00ffcc');
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    if (this.attached) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.shadowBlur = 0;
  }
}
