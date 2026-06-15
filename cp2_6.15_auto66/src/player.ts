export interface PlayerState {
  x: number;
  y: number;
  baseY: number;
  velocityY: number;
  isJumping: boolean;
  jumpProgress: number;
  scale: number;
  lane: number;
  targetLane: number;
  width: number;
  height: number;
  radius: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Player {
  private state: PlayerState;
  private canvas: HTMLCanvasElement;
  private jumpHeight: number = 80;
  private jumpDuration: number = 500;
  private jumpStartTime: number = 0;
  private laneWidth: number = 200;
  private centerX: number = 0;
  private pulseStartTime: number = 0;
  private isPulsing: boolean = false;
  private pulseDuration: number = 300;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.centerX = canvas.width / 2;
    this.state = {
      x: this.centerX,
      y: canvas.height * 0.75,
      baseY: canvas.height * 0.75,
      velocityY: 0,
      isJumping: false,
      jumpProgress: 0,
      scale: 1,
      lane: 0,
      targetLane: 0,
      width: 40,
      height: 40,
      radius: 20,
    };
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
          e.preventDefault();
          this.jump();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.moveRight();
          break;
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < this.canvas.width / 3) {
        this.moveLeft();
      } else if (clickX > (this.canvas.width * 2) / 3) {
        this.moveRight();
      } else {
        this.jump();
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      if (touchX < this.canvas.width / 3) {
        this.moveLeft();
      } else if (touchX > (this.canvas.width * 2) / 3) {
        this.moveRight();
      } else {
        this.jump();
      }
    });
  }

  jump(): void {
    if (!this.state.isJumping) {
      this.state.isJumping = true;
      this.jumpStartTime = performance.now();
      this.state.jumpProgress = 0;
      this.startPulse();
    }
  }

  moveLeft(): void {
    if (this.state.targetLane > -1) {
      this.state.targetLane--;
    }
  }

  moveRight(): void {
    if (this.state.targetLane < 1) {
      this.state.targetLane++;
    }
  }

  private startPulse(): void {
    this.isPulsing = true;
    this.pulseStartTime = performance.now();
  }

  update(_deltaTime: number, currentTime: number): void {
    const targetX = this.centerX + this.state.targetLane * this.laneWidth;
    this.state.x += (targetX - this.state.x) * 0.15;
    this.state.lane = this.state.targetLane;

    if (this.state.isJumping) {
      const elapsed = currentTime - this.jumpStartTime;
      const progress = Math.min(elapsed / this.jumpDuration, 1);
      this.state.jumpProgress = progress;
      
      const jumpOffset = Math.sin(progress * Math.PI) * this.jumpHeight;
      this.state.y = this.state.baseY - jumpOffset;
      
      if (progress >= 1) {
        this.state.isJumping = false;
        this.state.y = this.state.baseY;
      }
    }

    if (this.isPulsing) {
      const elapsed = currentTime - this.pulseStartTime;
      const progress = Math.min(elapsed / this.pulseDuration, 1);
      
      if (progress < 0.5) {
        this.state.scale = 0.9 + progress * 0.6;
      } else {
        this.state.scale = 1.2 - (progress - 0.5) * 0.4;
      }
      
      if (progress >= 1) {
        this.isPulsing = false;
        this.state.scale = 1;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, radius, scale } = this.state;
    const scaledRadius = radius * scale;

    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, scaledRadius * 1.75);
    outerGlow.addColorStop(0, 'rgba(255, 107, 107, 0.3)');
    outerGlow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, scaledRadius * 1.75, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, scaledRadius * 1.25);
    innerGlow.addColorStop(0, 'rgba(255, 107, 107, 0.6)');
    innerGlow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(x, y, scaledRadius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    const ballGradient = ctx.createRadialGradient(
      x - scaledRadius * 0.3,
      y - scaledRadius * 0.3,
      0,
      x,
      y,
      scaledRadius
    );
    ballGradient.addColorStop(0, '#ff8a8a');
    ballGradient.addColorStop(1, '#ff6b6b');
    
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x - scaledRadius * 0.3, y - scaledRadius * 0.3, scaledRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  getCollisionBox(): Rect {
    const { x, y, width, height, scale } = this.state;
    return {
      x: x - (width * scale) / 2,
      y: y - (height * scale) / 2,
      width: width * scale,
      height: height * scale,
    };
  }

  getState(): Readonly<PlayerState> {
    return this.state;
  }

  getLane(): number {
    return this.state.lane;
  }

  isInAir(): boolean {
    return this.state.isJumping;
  }

  reset(): void {
    this.state.x = this.centerX;
    this.state.y = this.state.baseY;
    this.state.lane = 0;
    this.state.targetLane = 0;
    this.state.isJumping = false;
    this.state.jumpProgress = 0;
    this.state.scale = 1;
    this.isPulsing = false;
  }

  resize(width: number, height: number): void {
    this.centerX = width / 2;
    this.state.baseY = height * 0.75;
    if (!this.state.isJumping) {
      this.state.y = this.state.baseY;
    }
  }
}

export function checkCollision(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
