export const MAJOR_RADIUS = 30;
export const MINOR_RADIUS = 6;

export interface CorridorState {
  rotationAngle: number;
  rotationSpeed: number;
  distortionAmount: number;
  baseRotationSpeed: number;
}

export function createCorridorState(): CorridorState {
  return {
    rotationAngle: 0,
    rotationSpeed: 0.08,
    distortionAmount: 0,
    baseRotationSpeed: 0.08,
  };
}

export function getPathPoint(theta: number): [number, number, number] {
  return [
    MAJOR_RADIUS * Math.cos(theta),
    0,
    MAJOR_RADIUS * Math.sin(theta),
  ];
}

export function getPathTangent(theta: number): [number, number, number] {
  return [-Math.sin(theta), 0, Math.cos(theta)];
}

export function getTorusPoint(
  theta: number,
  phi: number,
  rho: number = MINOR_RADIUS
): [number, number, number] {
  return [
    (MAJOR_RADIUS + rho * Math.cos(phi)) * Math.cos(theta),
    rho * Math.sin(phi),
    (MAJOR_RADIUS + rho * Math.cos(phi)) * Math.sin(theta),
  ];
}

export function updateCorridor(
  state: CorridorState,
  deltaTime: number,
  idleTime: number
): void {
  const idleAcceleration = Math.min(idleTime * 0.015, 1.5);
  state.rotationSpeed = state.baseRotationSpeed + idleAcceleration;
  state.distortionAmount = Math.min(idleTime * 0.008, 0.8);
  state.rotationAngle += state.rotationSpeed * deltaTime;
}
