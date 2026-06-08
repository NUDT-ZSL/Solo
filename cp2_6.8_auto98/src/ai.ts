import { Paddle, Ball } from './game';

export type AISpeed = 'slow' | 'medium' | 'fast';

const AI_SPEED_MAP: Record<AISpeed, number> = {
  slow: 2,
  medium: 4,
  fast: 6
};

export class AIController {
  private speed: number;

  constructor(speed: AISpeed = 'medium') {
    this.speed = AI_SPEED_MAP[speed];
  }

  setSpeed(speed: AISpeed): void {
    this.speed = AI_SPEED_MAP[speed];
  }

  setSpeedByValue(value: number): void {
    if (value === 2) this.speed = 2;
    else if (value === 4) this.speed = 4;
    else if (value === 6) this.speed = 6;
  }

  getSpeedValue(): number {
    return this.speed;
  }

  update(paddle: Paddle, ball: Ball, canvasHeight: number): void {
    const paddleCenter = paddle.y + paddle.height / 2;
    const ballCenter = ball.y;
    const diff = ballCenter - paddleCenter;

    if (Math.abs(diff) < this.speed) {
      paddle.y += diff;
    } else if (diff > 0) {
      paddle.y += this.speed;
    } else {
      paddle.y -= this.speed;
    }

    paddle.y = Math.max(0, Math.min(canvasHeight - paddle.height, paddle.y));
  }
}
