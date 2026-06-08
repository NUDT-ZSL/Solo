export interface RocketState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  thrust: number;
  fuel: number;
}

export const GRAVITY = 0.4;
export const FUEL_CONSUMPTION_RATE = 0.5;
export const THRUST_CONSUMPTION_MULTIPLIER = 1.5 / 60;

export function updatePhysics(
  rocket: RocketState,
  canvasWidth: number,
  _canvasHeight: number,
  deltaTime: number = 1
): RocketState {
  const newRocket = { ...rocket };

  if (newRocket.fuel <= 0) {
    newRocket.thrust = 0;
    newRocket.fuel = 0;
  }

  const angleRad = (newRocket.angle * Math.PI) / 180;
  const thrustForce = newRocket.thrust * 0.15;
  newRocket.vx -= Math.sin(angleRad) * thrustForce * deltaTime;
  newRocket.vy -= Math.cos(angleRad) * thrustForce * deltaTime;

  newRocket.vy += GRAVITY * deltaTime;

  newRocket.vx *= 0.995;
  newRocket.vy *= 0.998;

  newRocket.x += newRocket.vx * deltaTime;
  newRocket.y += newRocket.vy * deltaTime;

  if (newRocket.thrust > 0 && newRocket.fuel > 0) {
    newRocket.fuel -= newRocket.thrust * THRUST_CONSUMPTION_MULTIPLIER * deltaTime;
    if (newRocket.fuel < 0) newRocket.fuel = 0;
  }

  if (newRocket.x < 30) {
    newRocket.x = 30;
    newRocket.vx = Math.abs(newRocket.vx) * 0.3;
  }
  if (newRocket.x > canvasWidth - 30) {
    newRocket.x = canvasWidth - 30;
    newRocket.vx = -Math.abs(newRocket.vx) * 0.3;
  }

  return newRocket;
}
