export type GameState = 'menu' | 'playing' | 'gameover';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type PlayerSide = 'top' | 'bottom';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speedMultiplier: number;
  initialSpeed: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: string;
  side: PlayerSide;
}

export interface ChargeState {
  isCharging: boolean;
  chargeTime: number;
  chargePercent: number;
  chargeMultiplier: number;
  maxMultiplier: number;
  glowProgress: number;
  canCharge: boolean;
}

export interface ScorePopup {
  show: boolean;
  text: string;
  scale: number;
  opacity: number;
  timer: number;
}

export interface ScreenFlash {
  active: boolean;
  opacity: number;
  timer: number;
}

export interface GameStateData {
  state: GameState;
  difficulty: Difficulty;
  ball: Ball;
  topPaddle: Paddle;
  bottomPaddle: Paddle;
  topScore: number;
  bottomScore: number;
  topCharge: ChargeState;
  bottomCharge: ChargeState;
  scorePopup: ScorePopup;
  screenFlash: ScreenFlash;
  winner: PlayerSide | null;
  hitOccurred: boolean;
  hitX: number;
  hitY: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 16;
const PADDLE_RADIUS = 8;
const PADDLE_Y_TOP = 30;
const PADDLE_Y_BOTTOM = CANVAS_HEIGHT - 30 - PADDLE_HEIGHT;
const BALL_RADIUS = 6;
const WIN_SCORE = 11;
const CHARGE_TRIGGER_TIME = 0.5;
const CHARGE_MAX_TIME = 1.5;
const GLOW_TRANSITION_TIME = 0.3;
const SPEED_INCREASE_RATE = 0.005;
const MAX_SPEED_MULTIPLIER = 3;
const SCREEN_FLASH_DURATION = 0.15;
const SCREEN_FLASH_OPACITY = 0.3;
const SCORE_POPUP_DURATION = 1.0;

export class GameEngine {
  private state: GameState = 'menu';
  private difficulty: Difficulty = 'normal';
  private ball: Ball;
  private topPaddle: Paddle;
  private bottomPaddle: Paddle;
  private topScore = 0;
  private bottomScore = 0;
  private topCharge: ChargeState;
  private bottomCharge: ChargeState;
  private scorePopup: ScorePopup;
  private screenFlash: ScreenFlash;
  private winner: PlayerSide | null = null;
  private hitOccurred = false;
  private hitX = 0;
  private hitY = 0;
  private trailing = false;

  constructor() {
    this.ball = this.createBall();
    this.topPaddle = this.createPaddle('top');
    this.bottomPaddle = this.createPaddle('bottom');
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.scorePopup = { show: false, text: '', scale: 0.5, opacity: 0, timer: 0 };
    this.screenFlash = { active: false, opacity: 0, timer: 0 };
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private createBall(): Ball {
    const baseSpeed = this.getBaseSpeed();
    const angle = (Math.random() * Math.PI) / 3 + Math.PI / 3;
    const direction = Math.random() > 0.5 ? 1 : -1;
    return {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: Math.cos(angle) * baseSpeed * direction,
      vy: Math.sin(angle) * baseSpeed * (Math.random() > 0.5 ? 1 : -1),
      radius: BALL_RADIUS,
      speedMultiplier: 1,
      initialSpeed: baseSpeed,
    };
  }

  private getBaseSpeed(): number {
    switch (this.difficulty) {
      case 'easy':
        return 180;
      case 'normal':
        return 260;
      case 'hard':
        return 360;
    }
  }

  private createPaddle(side: PlayerSide): Paddle {
    return {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: side === 'top' ? PADDLE_Y_TOP : PADDLE_Y_BOTTOM,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      radius: PADDLE_RADIUS,
      color: '#00f5d4',
      side,
    };
  }

  private createChargeState(): ChargeState {
    let maxMultiplier = 2.5;
    let canCharge = true;
    switch (this.difficulty) {
      case 'easy':
        maxMultiplier = 1;
        canCharge = false;
        break;
      case 'normal':
        maxMultiplier = 1.5;
        break;
      case 'hard':
        maxMultiplier = 3;
        break;
    }
    return {
      isCharging: false,
      chargeTime: 0,
      chargePercent: 0,
      chargeMultiplier: 1,
      maxMultiplier,
      glowProgress: 0,
      canCharge,
    };
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.ball.initialSpeed = this.getBaseSpeed();
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getState(): GameState {
    return this.state;
  }

  startGame(): void {
    this.state = 'playing';
    this.resetBall();
    this.topScore = 0;
    this.bottomScore = 0;
    this.winner = null;
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.scorePopup = { show: false, text: '', scale: 0.5, opacity: 0, timer: 0 };
    this.screenFlash = { active: false, opacity: 0, timer: 0 };
  }

  resetGame(): void {
    this.state = 'menu';
    this.resetBall();
    this.topScore = 0;
    this.bottomScore = 0;
    this.winner = null;
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.scorePopup = { show: false, text: '', scale: 0.5, opacity: 0, timer: 0 };
    this.screenFlash = { active: false, opacity: 0, timer: 0 };
  }

  private resetBall(): void {
    this.ball = this.createBall();
    this.trailing = false;
  }

  setPaddlePosition(side: PlayerSide, x: number): void {
    const paddle = side === 'top' ? this.topPaddle : this.bottomPaddle;
    paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, x - paddle.width / 2));
  }

  startCharge(side: PlayerSide): void {
    const charge = side === 'top' ? this.topCharge : this.bottomCharge;
    if (!charge.canCharge) return;
    charge.isCharging = true;
    charge.chargeTime = 0;
    charge.chargePercent = 0;
    charge.chargeMultiplier = 1;
    charge.glowProgress = 0;
  }

  endCharge(side: PlayerSide): number {
    const charge = side === 'top' ? this.topCharge : this.bottomCharge;
    const multiplier = charge.chargeMultiplier;
    charge.isCharging = false;
    charge.chargeTime = 0;
    charge.chargePercent = 0;
    charge.chargeMultiplier = 1;
    charge.glowProgress = 0;
    return multiplier;
  }

  private updateCharge(charge: ChargeState, dt: number): void {
    if (!charge.isCharging || !charge.canCharge) {
      if (charge.glowProgress > 0) {
        charge.glowProgress = Math.max(0, charge.glowProgress - dt / GLOW_TRANSITION_TIME);
      }
      return;
    }

    charge.chargeTime += dt;

    if (charge.chargeTime >= CHARGE_TRIGGER_TIME) {
      const effectiveChargeTime = charge.chargeTime - CHARGE_TRIGGER_TIME;
      charge.glowProgress = Math.min(1, effectiveChargeTime / GLOW_TRANSITION_TIME);
      charge.chargePercent = Math.min(1, effectiveChargeTime / (CHARGE_MAX_TIME - CHARGE_TRIGGER_TIME));
      charge.chargeMultiplier = 1 + (charge.maxMultiplier - 1) * charge.chargePercent;
    }
  }

  private updateScorePopup(dt: number): void {
    if (!this.scorePopup.show) return;
    this.scorePopup.timer += dt;

    const t = Math.min(1, this.scorePopup.timer / SCORE_POPUP_DURATION);
    if (t < 0.3) {
      this.scorePopup.scale = 0.5 + this.easeOutElastic(t / 0.3) * 0.5;
      this.scorePopup.opacity = t / 0.3;
    } else if (t > 0.7) {
      this.scorePopup.opacity = 1 - (t - 0.7) / 0.3;
    } else {
      this.scorePopup.scale = 1;
      this.scorePopup.opacity = 1;
    }

    if (t >= 1) {
      this.scorePopup.show = false;
    }
  }

  private updateScreenFlash(dt: number): void {
    if (!this.screenFlash.active) return;
    this.screenFlash.timer += dt;

    const t = this.screenFlash.timer / SCREEN_FLASH_DURATION;
    if (t >= 1) {
      this.screenFlash.active = false;
      this.screenFlash.opacity = 0;
    } else {
      this.screenFlash.opacity = SCREEN_FLASH_OPACITY * (1 - t);
    }
  }

  private triggerScorePopup(text: string): void {
    this.scorePopup = {
      show: true,
      text,
      scale: 0.5,
      opacity: 0,
      timer: 0,
    };
  }

  private triggerScreenFlash(): void {
    this.screenFlash = {
      active: true,
      opacity: SCREEN_FLASH_OPACITY,
      timer: 0,
    };
  }

  private checkPaddleCollision(side: PlayerSide): boolean {
    const paddle = side === 'top' ? this.topPaddle : this.bottomPaddle;
    const ball = this.ball;

    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;

    const ballTop = ball.y - ball.radius;
    const ballBottom = ball.y + ball.radius;
    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;

    return ballRight > paddleLeft && ballLeft < paddleRight && ballBottom > paddleTop && ballTop < paddleBottom;
  }

  private handlePaddleBounce(side: PlayerSide): void {
    const paddle = side === 'top' ? this.topPaddle : this.bottomPaddle;
    const ball = this.ball;
    const charge = side === 'top' ? this.topCharge : this.bottomCharge;

    const relativeX = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const maxAngle = Math.PI / 3;
    const angle = relativeX * maxAngle;

    const chargeMultiplier = charge.chargeMultiplier;
    let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * chargeMultiplier;
    const maxSpeed = ball.initialSpeed * MAX_SPEED_MULTIPLIER;
    speed = Math.min(speed, maxSpeed);

    const direction = side === 'top' ? 1 : -1;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = Math.cos(angle) * speed * direction;

    if (side === 'top') {
      ball.y = paddle.y + paddle.height + ball.radius + 1;
    } else {
      ball.y = paddle.y - ball.radius - 1;
    }

    this.hitOccurred = true;
    this.hitX = ball.x;
    this.hitY = ball.y;

    if (chargeMultiplier > 1.2) {
      this.trailing = true;
    }

    if (charge.isCharging) {
      this.endCharge(side);
    }
  }

  private score(side: PlayerSide): void {
    if (side === 'top') {
      this.topScore++;
      this.triggerScorePopup('+1');
    } else {
      this.bottomScore++;
      this.triggerScorePopup('+1');
    }
    this.triggerScreenFlash();
    this.trailing = false;

    if (this.topScore >= WIN_SCORE) {
      this.winner = 'top';
      this.state = 'gameover';
    } else if (this.bottomScore >= WIN_SCORE) {
      this.winner = 'bottom';
      this.state = 'gameover';
    } else {
      this.resetBall();
    }
  }

  update(dt: number): void {
    this.hitOccurred = false;

    if (this.state !== 'playing') {
      this.updateScorePopup(dt);
      this.updateScreenFlash(dt);
      this.updateCharge(this.topCharge, dt);
      this.updateCharge(this.bottomCharge, dt);
      return;
    }

    const ball = this.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const maxSpeed = ball.initialSpeed * MAX_SPEED_MULTIPLIER;
    if (currentSpeed < maxSpeed) {
      const newSpeed = currentSpeed * (1 + SPEED_INCREASE_RATE);
      const ratio = Math.min(newSpeed, maxSpeed) / currentSpeed;
      ball.vx *= ratio;
      ball.vy *= ratio;
      ball.speedMultiplier = Math.min(currentSpeed / ball.initialSpeed, MAX_SPEED_MULTIPLIER);
    }

    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.radius >= CANVAS_WIDTH) {
      ball.x = CANVAS_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    }

    if (ball.vy < 0 && this.checkPaddleCollision('top')) {
      this.handlePaddleBounce('top');
    }
    if (ball.vy > 0 && this.checkPaddleCollision('bottom')) {
      this.handlePaddleBounce('bottom');
    }

    if (ball.y - ball.radius <= 0) {
      this.score('bottom');
    } else if (ball.y + ball.radius >= CANVAS_HEIGHT) {
      this.score('top');
    }

    this.updateCharge(this.topCharge, dt);
    this.updateCharge(this.bottomCharge, dt);
    this.updateScorePopup(dt);
    this.updateScreenFlash(dt);
  }

  getStateData(): GameStateData {
    return {
      state: this.state,
      difficulty: this.difficulty,
      ball: { ...this.ball },
      topPaddle: { ...this.topPaddle },
      bottomPaddle: { ...this.bottomPaddle },
      topScore: this.topScore,
      bottomScore: this.bottomScore,
      topCharge: { ...this.topCharge },
      bottomCharge: { ...this.bottomCharge },
      scorePopup: { ...this.scorePopup },
      screenFlash: { ...this.screenFlash },
      winner: this.winner,
      hitOccurred: this.hitOccurred,
      hitX: this.hitX,
      hitY: this.hitY,
    };
  }

  isTrailing(): boolean {
    return this.trailing;
  }
}

export { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS };
