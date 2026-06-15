import * as THREE from 'three';
import { Part, usePartsStore } from '../store/partsStore';

const GRID_SIZE = 0.5;
const SNAP_THRESHOLD = 0.3;
const CONNECTION_DISTANCE = 1.2;
const CONNECTION_ANGLE_THRESHOLD = 0.5;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function snapPositionToGrid(position: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    snapToGrid(position.x),
    Math.max(0, position.y),
    snapToGrid(position.z)
  );
}

export function getWorldInterfacePoint(part: Part): THREE.Vector3 {
  const point = part.interfacePoint.clone();
  point.applyEuler(part.rotation);
  point.add(part.position);
  return point;
}

export function getWorldInterfaceNormal(part: Part): THREE.Vector3 {
  const normal = part.interfaceNormal.clone();
  normal.applyEuler(part.rotation);
  normal.normalize();
  return normal;
}

export function checkConnectionCandidates(
  draggingPart: Part,
  allParts: Part[]
): { partA: Part; partB: Part } | null {
  const draggingIface = getWorldInterfacePoint(draggingPart);
  const draggingNormal = getWorldInterfaceNormal(draggingPart);

  let bestCandidate: { partA: Part; partB: Part; score: number } | null = null;

  for (const other of allParts) {
    if (other.id === draggingPart.id) continue;

    const isCompatible =
      (draggingPart.type.includes('tenon') && other.type.includes('mortise')) ||
      (draggingPart.type.includes('mortise') && other.type.includes('tenon'));

    if (!isCompatible) continue;

    const baseTypeMatch =
      (draggingPart.type.startsWith('dovetail') && other.type.startsWith('dovetail')) ||
      (draggingPart.type.startsWith('l_') && other.type.startsWith('l_')) ||
      (!draggingPart.type.startsWith('dovetail') && !draggingPart.type.startsWith('l_') &&
       !other.type.startsWith('dovetail') && !other.type.startsWith('l_'));

    if (!baseTypeMatch) continue;

    const otherIface = getWorldInterfacePoint(other);
    const otherNormal = getWorldInterfaceNormal(other);

    const distance = draggingIface.distanceTo(otherIface);
    if (distance > CONNECTION_DISTANCE) continue;

    const normalDot = draggingNormal.dot(otherNormal);
    if (normalDot > -1 + CONNECTION_ANGLE_THRESHOLD) continue;

    const angleScore = Math.abs(normalDot + 1);
    const distanceScore = 1 - (distance / CONNECTION_DISTANCE);
    const score = distanceScore * 0.7 + angleScore * 0.3;

    if (!bestCandidate || score > bestCandidate.score) {
      const tenonPart = draggingPart.type.includes('tenon') ? draggingPart : other;
      const mortisePart = draggingPart.type.includes('mortise') ? draggingPart : other;
      bestCandidate = { partA: tenonPart, partB: mortisePart, score };
    }
  }

  if (!bestCandidate) return null;
  return { partA: bestCandidate.partA, partB: bestCandidate.partB };
}

export function calculateAlignedPosition(
  tenonPart: Part,
  mortisePart: Part
): { tenonPos: THREE.Vector3; tenonRot: THREE.Euler; mortisePos: THREE.Vector3; mortiseRot: THREE.Euler } {
  const mortiseIface = getWorldInterfacePoint(mortisePart);
  const mortiseNormal = getWorldInterfaceNormal(mortisePart);

  const offset = tenonPart.interfacePoint.clone();
  const desiredTenonNormal = mortiseNormal.clone().negate();

  const currentTenonNormal = getWorldInterfaceNormal(tenonPart);
  const rotationAxis = new THREE.Vector3().crossVectors(currentTenonNormal, desiredTenonNormal);
  const rotationAngle = currentTenonNormal.angleTo(desiredTenonNormal);

  let newTenonRot = tenonPart.rotation.clone();
  if (rotationAxis.length() > 0.001) {
    rotationAxis.normalize();
    const quat = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAngle);
    const currentQuat = new THREE.Quaternion().setFromEuler(tenonPart.rotation);
    currentQuat.multiplyQuaternions(quat, currentQuat);
    newTenonRot = new THREE.Euler().setFromQuaternion(currentQuat);
  }

  const rotatedOffset = offset.clone().applyEuler(newTenonRot);
  const newTenonPos = mortiseIface.clone().sub(rotatedOffset);
  newTenonPos.y = Math.max(newTenonPos.y, tenonPart.dimensions.height / 2);

  return {
    tenonPos: newTenonPos,
    tenonRot: newTenonRot,
    mortisePos: mortisePart.position.clone(),
    mortiseRot: mortisePart.rotation.clone(),
  };
}

export interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

let particleIdCounter = 0;
export function createConnectionParticles(position: THREE.Vector3, count: number = 20): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.03 + Math.random() * 0.05;
    const vertical = (Math.random() - 0.5) * 0.04;
    particles.push({
      id: particleIdCounter++,
      position: position.clone(),
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        vertical,
        Math.sin(angle) * speed
      ),
      life: 0.5,
      maxLife: 0.5,
      size: 0.04 + Math.random() * 0.04,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], delta: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      position: p.position.clone().add(p.velocity.clone().multiplyScalar(delta * 60)),
      velocity: new THREE.Vector3(
        p.velocity.x * 0.96,
        p.velocity.y - 0.001,
        p.velocity.z * 0.96
      ),
      life: p.life - delta,
    }))
    .filter(p => p.life > 0);
}

export interface PulseRing {
  id: number;
  position: THREE.Vector3;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

let pulseIdCounter = 0;
export function createSnapPulse(position: THREE.Vector3, color: string = '#4ade80'): PulseRing {
  return {
    id: pulseIdCounter++,
    position: position.clone(),
    radius: 0.1,
    life: 0.4,
    maxLife: 0.4,
    color,
  };
}

export function updatePulseRings(rings: PulseRing[], delta: number): PulseRing[] {
  return rings
    .map(r => ({
      ...r,
      radius: r.radius + delta * 3,
      life: r.life - delta,
    }))
    .filter(r => r.life > 0);
}

export class AudioController {
  private audioContext: AudioContext | null = null;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playWoodClack(volume: number = 0.2) {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.15);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(420, now);
      osc2.frequency.exponentialRampToValueAtTime(200, now + 0.1);

      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      filter.Q.value = 1;

      gain1.gain.setValueAtTime(volume * 0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      gain2.gain.setValueAtTime(volume * 0.4, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(filter);
      osc2.connect(gain2);
      gain2.connect(filter);
      filter.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  playDisassembleSound(index: number = 0, volume: number = 0.15) {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime + index * 0.05;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + index * 40, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }
}

export const audioController = new AudioController();

export function computeSceneCenter(parts: Part[]): THREE.Vector3 {
  if (parts.length === 0) return new THREE.Vector3(0, 0, 0);
  const sum = new THREE.Vector3();
  parts.forEach(p => sum.add(p.position));
  return sum.divideScalar(parts.length);
}
