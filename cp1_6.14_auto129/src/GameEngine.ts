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
  currentSpeed: number;
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
  triggerTime: number;
}

export interface ScorePopup {
  show: boolean;
  text: string;
  scale: number;
  opacity: number;
  timer: number;
  duration: number;
}

export interface ScreenFlash {
  active: boolean;
  opacity: number;
  timer: number;
  duration: number;
  maxOpacity: number;
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
  lastHitSide: PlayerSide | null;
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
const CHARGE_MAX_TIME = 2.0;
const GLOW_TRANSITION_TIME = 0.3;
const SPEED_INCREASE_RATE = 0.005;
const MAX_SPEED_MULTIPLIER = 3;

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
  private lastHitSide: PlayerSide | null = null;

  constructor() {
    this.ball = this.createBall();
    this.topPaddle = this.createPaddle('top');
    this.bottomPaddle = this.createPaddle('bottom');
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.scorePopup = {
      show: false,
      text: '',
      scale: 0.5,
      opacity: 0,
      timer: 0,
      duration: 1.0,
    };
    this.screenFlash = {
      active: false,
      opacity: 0,
      timer: 0,
      duration: 0.15,
      maxOpacity: 0.3,
    };
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private createBall(): Ball {
    const baseSpeed = this.getBaseSpeed();
    const angle = (Math.random() * Math.PI) / 3 + Math.PI / 3;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const vyDir = Math.random() > 0.5 ? 1 : -1;
    return {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: Math.cos(angle) * baseSpeed * direction,
      vy: Math.sin(angle) * baseSpeed * vyDir,
      radius: BALL_RADIUS,
      speedMultiplier: 1,
      initialSpeed: baseSpeed,
      currentSpeed: baseSpeed,
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
      triggerTime: CHARGE_TRIGGER_TIME,
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
    this.lastHitSide = null;
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.scorePopup.show = false;
    this.screenFlash.active = false;
  }

  resetGame(): void {
    this.state = 'menu';
    this.resetBall();
    this.topScore = 0;
    this.bottomScore = 0;
    this.winner = null;
    this.lastHitSide = null;
    this.topCharge = this.createChargeState();
    this.bottomCharge = this.createChargeState();
    this.scorePopup.show = false;
    this.screenFlash.active = false;
  }

  private resetBall(): void {
    this.ball = this.createBall();
    this.lastHitSide = null;
  }

  setPaddlePosition(side: PlayerSide, x: number): void {
    const paddle = side === 'top