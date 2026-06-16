import * as THREE from 'three';

export interface RampPath {
  id: number;
  name: string;
  color: string;
  controlPoints: THREE.Vector3[];
  level: number;
}

export const VEHICLE_COLORS: string[] = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
];

export const RAMP_COLORS: string[] = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
];

export const createBridgePaths = (): RampPath[] => {
  const ramp1Points: THREE.Vector3[] = [
    new THREE.Vector3(-60, 0, -40),
    new THREE.Vector3(-50, 1, -35),
    new THREE.Vector3(-40, 3, -28),
    new THREE.Vector3(-30, 5, -18),
    new THREE.Vector3(-20, 7, -8),
    new THREE.Vector3(-12, 8, 0),
    new THREE.Vector3(-6, 8, 6),
    new THREE.Vector3(0, 8, 10),
    new THREE.Vector3(8, 8, 8),
    new THREE.Vector3(16, 8, 0),
    new THREE.Vector3(25, 7, -10),
    new THREE.Vector3(35, 5, -20),
    new THREE.Vector3(45, 3, -30),
    new THREE.Vector3(55, 1, -38),
    new THREE.Vector3(65, 0, -45),
  ];

  const ramp2Points: THREE.Vector3[] = [
    new THREE.Vector3(60, 0, 40),
    new THREE.Vector3(50, 2, 32),
    new THREE.Vector3(38, 5, 20),
    new THREE.Vector3(26, 8, 8),
    new THREE.Vector3(14, 10, -2),
    new THREE.Vector3(4, 10, -6),
    new THREE.Vector3(-6, 10, -6),
    new THREE.Vector3(-16, 10, -2),
    new THREE.Vector3(-28, 8, 8),
    new THREE.Vector3(-40, 5, 20),
    new THREE.Vector3(-52, 2, 32),
    new THREE.Vector3(-65, 0, 42),
  ];

  const ramp3Points: THREE.Vector3[] = [
    new THREE.Vector3(-55, 0, 45),
    new THREE.Vector3(-45, 2, 38),
    new THREE.Vector3(-32, 5, 25),
    new THREE.Vector3(-20, 8, 12),
    new THREE.Vector3(-10, 10, 2),
    new THREE.Vector3(-4, 11, -4),
    new THREE.Vector3(0, 11, -10),
    new THREE.Vector3(6, 11, -16),
    new THREE.Vector3(14, 10, -24),
    new THREE.Vector3(24, 8, -34),
    new THREE.Vector3(36, 5, -42),
    new THREE.Vector3(48, 2, -48),
    new THREE.Vector3(60, 0, -52),
  ];

  const ramp4Points: THREE.Vector3[] = [
    new THREE.Vector3(45, 0, -55),
    new THREE.Vector3(38, 3, -48),
    new THREE.Vector3(25, 6, -36),
    new THREE.Vector3(12, 9, -22),
    new THREE.Vector3(2, 10, -12),
    new THREE.Vector3(-6, 10, -6),
    new THREE.Vector3(-12, 10, 0),
    new THREE.Vector3(-18, 9, 6),
    new THREE.Vector3(-26, 7, 14),
    new THREE.Vector3(-36, 4, 26),
    new THREE.Vector3(-46, 1, 38),
    new THREE.Vector3(-55, 0, 48),
  ];

  const ramp5Points: THREE.Vector3[] = [
    new THREE.Vector3(-45, 0, -55),
    new THREE.Vector3(-35, 2, -45),
    new THREE.Vector3(-22, 5, -30),
    new THREE.Vector3(-10, 8, -14),
    new THREE.Vector3(-2, 10, -5),
    new THREE.Vector3(4, 10, 0),
    new THREE.Vector3(10, 10, 4),
    new THREE.Vector3(18, 8, 10),
    new THREE.Vector3(28, 5, 20),
    new THREE.Vector3(38, 2, 32),
    new THREE.Vector3(48, 0, 44),
  ];

  return [
    { id: 0, name: 'Ramp 1', color: RAMP_COLORS[0], controlPoints: ramp1Points, level: 1 },
    { id: 1, name: 'Ramp 2', color: RAMP_COLORS[1], controlPoints: ramp2Points, level: 2 },
    { id: 2, name: 'Ramp 3', color: RAMP_COLORS[2], controlPoints: ramp3Points, level: 3 },
    { id: 3, name: 'Ramp 4', color: RAMP_COLORS[3], controlPoints: ramp4Points, level: 2 },
    { id: 4, name: 'Ramp 5', color: RAMP_COLORS[4], controlPoints: ramp5Points, level: 1 },
  ];
};

export const interpolateColor = (startColor: string, endColor: string, t: number): THREE.Color => {
  const start = new THREE.Color(startColor);
  const end = new THREE.Color(endColor);
  return start.lerp(end, Math.max(0, Math.min(1, t)));
};

export const calculateCongestionColor = (congestion: number): THREE.Color => {
  if (congestion > 0.7) {
    const t = (congestion - 0.7) / 0.3;
    return interpolateColor('#00ff88', '#ff0044', t);
  }
  return new THREE.Color('#00ff88');
};

export const getRippleOpacity = (time: number, baseOpacity: number = 0.3): number => {
  const cycle = 2;
  const phase = (time % cycle) / cycle;
  const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
  return baseOpacity - 0.1 + pulse * 0.2;
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const calculateCongestionCoefficient = (density: number, speedThreshold: number, currentSegmentSpeed: number): number => {
  const densityFactor = density / 100;
  const speedRatio = Math.min(1, currentSegmentSpeed / speedThreshold);
  const speedFactor = 1 - speedRatio;
  return Math.max(0, Math.min(1, densityFactor * 0.6 + speedFactor * 0.4));
};
