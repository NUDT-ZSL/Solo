import { EventEmitter } from 'events';

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
}

export interface PhysicsState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  speedX: number;
  speedY: number;
  driftAngle: number;
  lateralSpeed: number;
  isDrifting: boolean;
  lap: number;
  totalLaps: number;
  lapStartTime: number;
  bestLapTime: number | null;
  lastLapTime: number | null;
  totalTime: number;
  checkpointPassed: boolean;
}

export const TRACK_CONFIG = {
  centerX: 400,
  centerY: 300,
  outerRadiusX: 300,
  outerRadiusY: 220,
  innerRadiusX: 200,
  innerRadiusY: 120,
  trackWidth: 100,
};

export class PhysicsEngine extends EventEmitter {
  x: number = TRACK_CONFIG.centerX;
  y: number = TRACK_CONFIG.centerY - (TRACK_CONFIG.outerRadiusY + TRACK_CONFIG.innerRadiusY) / 2;
  angle: number = 0;
  speed: number = 0;
  speedX: number = 0;
  speedY: number = 0;
  driftAngle: number = 0;
  lateralSpeed: number = 0;
  isDrifting: boolean = false;

  private readonly ACCELERATION = 3;
  private readonly BRAKE_DECELERATION = 6;
  private readonly FRICTION_DECELERATION = 0.5;
  private readonly MAX_SPEED = 80;
  private readonly DRIFT_THRESHOLD = 0.5;
  private readonly DRIFT_RETURN_RATE = 0.98;
  private readonly STEER_LOW_SPEED = 0.15;
  private readonly STEER_MID_SPEED = 0.10;
  private readonly STEER_HIGH_SPEED = 0.05;
  private readonly STEER_DRIFT_BOOST = 0.02;

  lap: number = 1;
  totalLaps: number = 5;
  lapStartTime: number = 0;
  bestLapTime: number | null = null;
  lastLapTime: number | null = null;
  totalTime: number = 0;
  checkpointPassed: boolean = false;

  private startX: number;
  private startY: number;
  private startAngle: number;
  private id: string;

  constructor(id: string = 'player') {
    super();
    this.id = id;
    this.startX = this.x;
    this.startY = this.y;
    this.startAngle = this.angle;
    this.lapStartTime = performance.now();
  }

  getId(): string {
    return this.id;
  }

  reset(): void {
    this.x = this.startX;
    this.y = this.startY;
    this.angle = this.startAngle;
    this.speed = 0;
    this.speedX = 0;
    this.speedY = 0;
    this.driftAngle = 0;
    this.lateralSpeed = 0;
    this.isDrifting = false;
    this.lap = 1;
    this.lapStartTime = performance.now();
    this.bestLapTime = null;
    this.lastLapTime = null;
    this.totalTime = 0;
    this.checkpointPassed = false;
  }

  getState(): PhysicsState {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      speed: this.speed,
      speedX: this.speedX,
      speedY: this.speedY,
      driftAngle: this.driftAngle,
      lateralSpeed: this.lateralSpeed,
      isDrifting: this.isDrifting,
      lap: this.lap,
      totalLaps: this.totalLaps,
      lapStartTime: this.lapStartTime,
      bestLapTime: this.bestLapTime,
      lastLapTime: this.lastLapTime,
      totalTime: this.totalTime,
      checkpointPassed: this.checkpointPassed,
    };
  }

  setState(state: Partial<PhysicsState>): void {
    Object.assign(this, state);
  }

  update(deltaTime: number, input: InputState): PhysicsState {
    const dt = deltaTime / 1000;

    let accel = 0;
    if (input.accelerate) {
      accel += this.ACCELERATION;
    }
    if (input.brake) {
      accel -= this.BRAKE_DECELERATION;
    }

    const frictionSign = this.speed > 0 ? -1 : this.speed < 0 ? 1 : 0;
    accel += frictionSign * this.FRICTION_DECELERATION;

    this.speed += accel * dt;
    this.speed = Math.max(-20, Math.min(this.MAX_SPEED, this.speed));

    const absSpeed = Math.abs(this.speed);
    let steerSpeed: number;
    if (absSpeed < 15) {
      steerSpeed = this.STEER_LOW_SPEED;
    } else if (absSpeed < 40) {
      steerSpeed = this.STEER_MID_SPEED;
    } else {
      steerSpeed = this.STEER_HIGH_SPEED;
    }

    if (this.isDrifting) {
      steerSpeed += this.STEER_DRIFT_BOOST;
    }

    const effectiveAngle = this.angle + this.driftAngle * 0.5;
    const forwardX = Math.cos(effectiveAngle);
    const forwardY = Math.sin(effectiveAngle);
    const rightX = -Math.sin(effectiveAngle);
    const rightY = Math.cos(effectiveAngle);

    this.speedX = forwardX * this.speed + rightX * this.lateralSpeed;
    this.speedY = forwardY * this.speed + rightY * this.lateralSpeed;

    this.x += this.speedX * dt * 10;
    this.y += this.speedY * dt * 10;

    let steerInput = 0;
    if (input.steerLeft) steerInput -= 1;
    if (input.steerRight) steerInput += 1;

    if (absSpeed > 0.5) {
      const steerDir = this.speed >= 0 ? 1 : -1;
      this.angle += steerInput * steerSpeed * steerDir * Math.min(absSpeed / 10, 1);
    }

    if (steerInput !== 0 && absSpeed > 10) {
      const newLateral = steerInput * (absSpeed / 50) * 3;
      this.lateralSpeed += (newLateral - this.lateralSpeed) * 0.1;
    } else {
      this.lateralSpeed *= 0.9;
    }

    if (Math.abs(this.lateralSpeed) > this.DRIFT_THRESHOLD) {
      this.isDrifting = true;
      this.driftAngle = this.lateralSpeed * 0.08;
    } else {
      this.isDrifting = false;
    }

    if (!input.accelerate || !this.isDrifting) {
      this.driftAngle *= this.DRIFT_RETURN_RATE;
      if (Math.abs(this.driftAngle) < 0.001) {
        this.driftAngle = 0;
      }
    }

    this.totalTime += deltaTime;
    this.checkLap();
    this.constrainToTrack();

    const state = this.getState();
    this.emit('EmitState', state);
    return state;
  }

  private checkLap(): void {
    const dx = this.x - TRACK_CONFIG.centerX;
    const dy = this.y - TRACK_CONFIG.centerY;

    const isAtStartLine = Math.abs(dx) < 20 && dy < 0;

    if (dy > -50 && dy < 0 && Math.abs(dx) < 30) {
      this.checkpointPassed = true;
    }

    if (isAtStartLine && this.checkpointPassed && this.speed > 0) {
      const now = performance.now();
      const lapTime = now - this.lapStartTime;

      if (this.lap > 1 || lapTime > 3000) {
        this.lastLapTime = lapTime;
        if (this.bestLapTime === null || lapTime < this.bestLapTime) {
          this.bestLapTime = lapTime;
        }
        this.lap++;
        this.lapStartTime = now;
        this.checkpointPassed = false;
      }
    }
  }

  private constrainToTrack(): void {
    const dx = this.x - TRACK_CONFIG.centerX;
    const dy = this.y - TRACK_CONFIG.centerY;

    const angle = Math.atan2(dy, dx);
    const outerEdgeX = TRACK_CONFIG.centerX + TRACK_CONFIG.outerRadiusX * Math.cos(angle);
    const outerEdgeY = TRACK_CONFIG.centerY + TRACK_CONFIG.outerRadiusY * Math.sin(angle);
    const innerEdgeX = TRACK_CONFIG.centerX + TRACK_CONFIG.innerRadiusX * Math.cos(angle);
    const innerEdgeY = TRACK_CONFIG.centerY + TRACK_CONFIG.innerRadiusY * Math.sin(angle);

    const distToCenter = Math.sqrt(
      (dx * dx) / (TRACK_CONFIG.outerRadiusX * TRACK_CONFIG.outerRadiusX) +
      (dy * dy) / (TRACK_CONFIG.outerRadiusY * TRACK_CONFIG.outerRadiusY)
    );
    const innerDist = Math.sqrt(
      (dx * dx) / (TRACK_CONFIG.innerRadiusX * TRACK_CONFIG.innerRadiusX) +
      (dy * dy) / (TRACK_CONFIG.innerRadiusY * TRACK_CONFIG.innerRadiusY)
    );

    if (distToCenter > 1.02) {
      const t = 1.02;
      this.x = TRACK_CONFIG.centerX + TRACK_CONFIG.outerRadiusX * Math.cos(angle) * t * 0.98;
      this.y = TRACK_CONFIG.centerY + TRACK_CONFIG.outerRadiusY * Math.sin(angle) * t * 0.98;
      this.speed *= 0.7;
      this.lateralSpeed *= 0.5;
    } else if (innerDist < 0.98) {
      const t = 0.98;
      this.x = TRACK_CONFIG.centerX + TRACK_CONFIG.innerRadiusX * Math.cos(angle) / t * 1.02;
      this.y = TRACK_CONFIG.centerY + TRACK_CONFIG.innerRadiusY * Math.sin(angle) / t * 1.02;
      this.speed *= 0.7;
      this.lateralSpeed *= 0.5;
    }
  }

  resolveCollision(otherX: number, otherY: number): void {
    const dx = this.x - otherX;
    const dy = this.y - otherY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1 && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;

      this.x += nx * 2;
      this.y += ny * 2;

      this.speedX += nx * 20;
      this.speedY += ny * 20;
      this.speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
      this.speed = Math.min(this.speed, this.MAX_SPEED);
    }
  }
}
