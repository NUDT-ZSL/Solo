import * as THREE from 'three';

export interface VineNode {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  radius: number;
  color: THREE.Color;
  baseHue: number;
  createdAt: number;
  vineId: string;
}

export interface Vine {
  id: string;
  seedId: string;
  nodes: VineNode[];
  direction: THREE.Vector3;
  startPosition: THREE.Vector3;
  baseHue: number;
  length: number;
  maxNodes: number;
  active: boolean;
  growthStarted: boolean;
  startDelay: number;
  startTime: number;
  radius: number;
}

export interface Seed {
  id: string;
  position: THREE.Vector3;
  color: THREE.Color;
  baseHue: number;
  plantedAt: number;
  vineStarted: boolean;
}

export interface CollisionEvent {
  id: string;
  nodeAId: string;
  nodeBId: string;
  positionA: THREE.Vector3;
  positionB: THREE.Vector3;
  startTime: number;
  duration: number;
}

export interface SplitParticle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  radius: number;
  startTime: number;
  duration: number;
}

export interface TrailParticle {
  id: string;
  position: THREE.Vector3;
  color: THREE.Color;
  radius: number;
  startTime: number;
  duration: number;
}

export interface GridFlash {
  startTime: number;
  duration: number;
}

export const GROWTH_SPEED = 0.5;
export const BRANCH_LENGTH = 10;
export const MAX_VINES = 100;
export const MAX_NODES_PER_VINE = 50;
export const COLLISION_DISTANCE = 20;
export const COLLISION_OFFSET = 5;
export const COLLISION_DURATION = 0.3;
export const HALO_DURATION = 0.2;
export const SEED_RADIUS = 2;
export const INITIAL_VINE_RADIUS = 1;
export const SUN_ROTATION_PERIOD = 30;
export const SUN_DISTANCE = 100;
export const MAX_LIGHT_BIAS = 30;
export const GRID_SIZE = 30;

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getSeedColor(x: number, z: number): { color: THREE.Color; hue: number } {
  const t = ((x + GRID_SIZE / 2) / GRID_SIZE + (z + GRID_SIZE / 2) / GRID_SIZE) / 2;
  const clampedT = Math.max(0, Math.min(1, t));
  
  const startColor = new THREE.Color('#FF6B6B');
  const endColor = new THREE.Color('#4ECDC4');
  
  const color = new THREE.Color().lerpColors(startColor, endColor, clampedT);
  const hue = color.getHSL({ h: 0, s: 0, l: 0 }).h;
  
  return { color, hue };
}

export function calculateBranchDirection(
  parentDirection: THREE.Vector3,
  angleDeg: number
): THREE.Vector3 {
  const angleRad = (angleDeg * Math.PI) / 180;
  const direction = parentDirection.clone().normalize();
  
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(direction, up).normalize();
  
  if (right.lengthSq() < 0.001) {
    right.set(1, 0, 0);
  }
  
  const upAxis = new THREE.Vector3().crossVectors(right, direction).normalize();
  
  const randomAxis = new THREE.Vector3()
    .addScaledVector(right, Math.random() * 2 - 1)
    .addScaledVector(upAxis, Math.random() * 2 - 1)
    .normalize();
  
  const q = new THREE.Quaternion().setFromAxisAngle(randomAxis, angleRad);
  const newDir = direction.clone().applyQuaternion(q).normalize();
  
  return newDir;
}

export function randomBranchAngle(): number {
  return 15 + Math.random() * 30;
}

export function checkCollision(
  nodeA: VineNode,
  nodeB: VineNode,
  distance: number = COLLISION_DISTANCE
): boolean {
  return nodeA.position.distanceTo(nodeB.position) < distance;
}

export function calculateRepulsionDirection(
  posA: THREE.Vector3,
  posB: THREE.Vector3
): THREE.Vector3 {
  const dir = new THREE.Vector3().subVectors(posA, posB);
  if (dir.lengthSq() < 0.001) {
    dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  }
  return dir.normalize();
}

export function getSunPosition(time: number): THREE.Vector3 {
  const angle = (time / SUN_ROTATION_PERIOD) * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(angle) * SUN_DISTANCE,
    SUN_DISTANCE * 0.5,
    Math.sin(angle) * SUN_DISTANCE
  );
}

export function calculateLightIntensity(
  nodePosition: THREE.Vector3,
  nodeDirection: THREE.Vector3,
  sunPosition: THREE.Vector3
): number {
  const toSun = new THREE.Vector3().subVectors(sunPosition, nodePosition).normalize();
  const dot = nodeDirection.dot(toSun);
  return Math.max(0, Math.min(1, (dot + 1) / 2));
}

export function calculateLightBiasDirection(
  currentDirection: THREE.Vector3,
  sunPosition: THREE.Vector3,
  nodePosition: THREE.Vector3
): THREE.Vector3 {
  const toSun = new THREE.Vector3().subVectors(sunPosition, nodePosition).normalize();
  const dir = currentDirection.clone().normalize();
  
  const maxBiasRad = (MAX_LIGHT_BIAS * Math.PI) / 180;
  const currentAngle = dir.angleTo(toSun);
  
  if (currentAngle < 0.01) return dir;
  
  const biasAmount = Math.min(1, currentAngle / maxBiasRad) * 0.05;
  
  return dir.lerp(toSun, biasAmount).normalize();
}

export function applyLightToColor(
  baseHue: number,
  lightIntensity: number
): THREE.Color {
  const saturation = 0.5 + lightIntensity * 0.3 + (1 - lightIntensity) * (-0.2);
  const clampedSat = Math.max(0.3, Math.min(1, saturation));
  const lightness = 0.4 + lightIntensity * 0.2;
  
  const color = new THREE.Color();
  color.setHSL(baseHue, clampedSat, lightness);
  return color;
}

export function calculateVineThickness(lightIntensity: number, baseRadius: number): number {
  const minThickness = 0.5;
  const maxThickness = 1.5;
  const thicknessFactor = minThickness + lightIntensity * (maxThickness - minThickness);
  return baseRadius * thicknessFactor;
}

export function offsetHue(baseHue: number, offsetDeg: number): number {
  return (baseHue + offsetDeg / 360 + 1) % 1;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function getAnimationProgress(startTime: number, duration: number, now: number): number {
  const elapsed = now - startTime;
  return Math.max(0, Math.min(1, elapsed / duration));
}

export function clampToBounds(position: THREE.Vector3, bounds: number = GRID_SIZE): THREE.Vector3 {
  const half = bounds / 2;
  return new THREE.Vector3(
    Math.max(-half, Math.min(half, position.x)),
    Math.max(0, position.y),
    Math.max(-half, Math.min(half, position.z))
  );
}
