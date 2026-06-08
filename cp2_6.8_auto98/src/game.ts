export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  glowTime: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  speed: number;
}

export type GameMode = 'single' | 'double';

export interface GameState {
  leftScore: number;
  rightScore: number;
  winner: 'left' | 'right' | null;
  mode: GameMode;
}

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const PADDLE_COLOR = '#4A5568';
const PADDLE_GLOW_COLOR = '#FFFFFF';
const PADDLE_GLOW_DURATION = 0.2;

const BALL_RADIUS = 8;
const BALL_COLOR = '#FFFFFF';
const BALL_INITIAL_SPEED = 4;
const BALL_SPEED_INCREMENT = 0.5;
const BALL_MAX_SPEED = 10;

const WIN_SCORE = 7;

export function createPaddle(x: number, canvasHeight: number): Paddle {
  return {
    x,
    y: (canvasHeight - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    glowTime: 0
  };
}

export function createBall(canvasWidth: number, canvasHeight: number): Ball {
  const direction = Math.random() < 0.5 ? -1 : 1;
  return {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    radius: BALL_RADIUS,
    vx: BALL_INITIAL_SPEED * direction,
    vy: 0,
    speed: BALL_INITIAL_SPEED
  };
}

export function createInitialState(): GameState {
  return {
    leftScore: 0,
    rightScore: 0,
    winner: null,
    mode: 'single'
  };
}

export function updatePaddlePosition(
  paddle: Paddle,
  direction: number,
  speed: number,
  canvasHeight: number
): void {
  paddle.y += direction * speed;
  paddle.y = Math.max(0, Math.min(canvasHeight - paddle.height, paddle.y));
}

export function updatePaddleGlow(paddle: Paddle, deltaTime: number): void {
  if (paddle.glowTime > 0) {
    paddle.glowTime = Math.max(0, paddle.glowTime - deltaTime);
  }
}

export function checkPaddleCollision(
  ball: Ball,
  paddle: Paddle,
  isLeft: boolean
): boolean {
  const ballLeft = ball.x - ball.radius;
  const ballRight = ball.x + ball.radius;
  const ballTop = ball.y - ball.radius;
  const ballBottom = ball.y + ball.radius;

  const paddleLeft = paddle.x;
  const paddleRight = paddle.x + paddle.width;
  const paddleTop = paddle.y;
  const paddleBottom = paddle.y + paddle.height;

  if (isLeft) {
    if (ball.vx >= 0) return false;
    if (ballLeft > paddleRight) return false;
    if (ballRight < paddleLeft) return false;
  } else {
    if (ball.vx <= 0) return false;
    if (ballRight < paddleLeft) return false;
    if (ballLeft > paddleRight) return false;
  }

  if (ballBottom < paddleTop) return false;
  if (ballTop > paddleBottom) return false;

  return true;
}

export function handlePaddleCollision(
  ball: Ball,
  paddle: Paddle,
  isLeft: boolean
): { collisionX: number; collisionY: number } {
  const relativeIntersectY = paddle.y + paddle.height / 2 - ball.y;
  const normalizedIntersectY = relativeIntersectY / (paddle.height / 2);

  let bounceAngle: number;
  if (normalizedIntersectY > 1 / 3) {
    bounceAngle = -Math.PI / 6;
  } else if (normalizedIntersectY < -1 / 3) {
    bounceAngle = Math.PI / 6;
  } else {
    bounceAngle = 0;
  }

  ball.speed = Math.min(ball.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);

  if (isLeft) {
    ball.vx = Math.abs(ball.speed * Math.cos(bounceAngle));
    ball.x = paddle.x + paddle.width + ball.radius;
  } else {
    ball.vx = -Math.abs(ball.speed * Math.cos(bounceAngle));
    ball.x = paddle.x - ball.radius;
  }
  ball.vy = ball.speed * Math.sin(bounceAngle);

  paddle.glowTime = PADDLE_GLOW_DURATION;

  return { collisionX: ball.x, collisionY: ball.y };
}

export function updateBall(
  ball: Ball,
  canvasWidth: number,
  canvasHeight: number
): 'left' | 'right' | null {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y + ball.radius >= canvasHeight) {
    ball.y = canvasHeight - ball.radius;
    ball.vy = -Math.abs(ball.vy);
  }

  if (ball.x - ball.radius <= 0) {
    return 'left';
  } else if (ball.x + ball.radius >= canvasWidth) {
    return 'right';
  }

  return null;
}

export function handleScore(
  state: GameState,
  scorer: 'left' | 'right'
): 'left' | 'right' | null {
  if (scorer === 'right') {
    state.rightScore++;
  } else {
    state.leftScore++;
  }

  if (state.leftScore >= WIN_SCORE) {
    state.winner = 'left';
    return 'left';
  }
  if (state.rightScore >= WIN_SCORE) {
    state.winner = 'right';
    return 'right';
  }

  return null;
}

export function renderPaddle(
  ctx: CanvasRenderingContext2D,
  paddle: Paddle
): void {
  if (paddle.glowTime > 0) {
    const glowAlpha = paddle.glowTime / PADDLE_GLOW_DURATION;
    ctx.save();
    ctx.shadowColor = PADDLE_GLOW_COLOR;
    ctx.shadowBlur = 20 * glowAlpha;
    ctx.fillStyle = PADDLE_GLOW_COLOR;
    ctx.globalAlpha = glowAlpha * 0.5;
    ctx.fillRect(paddle.x - 2, paddle.y - 2, paddle.width + 4, paddle.height + 4);
    ctx.restore();
  }

  ctx.fillStyle = PADDLE_COLOR;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(paddle.x, paddle.y, 2, paddle.height);
}

export function renderBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball
): void {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = BALL_COLOR;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ball.x - 2, ball.y - 2, ball.radius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1A202C');
  gradient.addColorStop(1, '#2D3748');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#4A5568';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function renderScores(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number
): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.fillText(state.leftScore.toString(), width / 2 - 60, 20);
  ctx.fillText(state.rightScore.toString(), width / 2 + 60, 20);
}

export function getBallSpeed(ball: Ball): number {
  return ball.speed;
}

export function resetBall(
  ball: Ball,
  canvasWidth: number,
  canvasHeight: number,
  direction: -1 | 1
): void {
  ball.x = canvasWidth / 2;
  ball.y = canvasHeight / 2;
  ball.speed = BALL_INITIAL_SPEED;
  ball.vx = BALL_INITIAL_SPEED * direction;
  ball.vy = 0;
}

export function resetPaddles(
  leftPaddle: Paddle,
  rightPaddle: Paddle,
  canvasHeight: number
): void {
  leftPaddle.y = (canvasHeight - PADDLE_HEIGHT) / 2;
  rightPaddle.y = (canvasHeight - PADDLE_HEIGHT) / 2;
  leftPaddle.glowTime = 0;
  rightPaddle.glowTime = 0;
}
