export interface Vector2D {
  x: number;
  y: number;
}

export interface AircraftState {
  position: Vector2D;
  velocity: Vector2D;
  angle: number;
  thrust: number;
}

export interface WindNode {
  id: string;
  position: Vector2D;
  radius: number;
  direction: number;
  strength: number;
}

const FRICTION = 0.98;
const MAX_SPEED = 8;
const THRUST_POWER = 0.15;

export function updateFlight(
  state: AircraftState,
  windForce: Vector2D,
  deltaTime: number
): AircraftState {
  const dt = deltaTime / 16.67;

  const thrustX = Math.cos(state.angle) * state.thrust * THRUST_POWER;
  const thrustY = Math.sin(state.angle) * state.thrust * THRUST_POWER;

  const ax = (thrustX + windForce.x) * dt;
  const ay = (thrustY + windForce.y) * dt;

  let vx = state.velocity.x + ax;
  let vy = state.velocity.y + ay;

  vx *= Math.pow(FRICTION, dt);
  vy *= Math.pow(FRICTION, dt);

  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > MAX_SPEED) {
    vx = (vx / speed) * MAX_SPEED;
    vy = (vy / speed) * MAX_SPEED;
  }

  const x = state.position.x + vx * dt;
  const y = state.position.y + vy * dt;

  return {
    position: { x, y },
    velocity: { x: vx, y: vy },
    angle: state.angle,
    thrust: state.thrust,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
