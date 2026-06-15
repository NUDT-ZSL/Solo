import * as THREE from 'three';

export interface PoleConfig {
  name: string;
  poleA: THREE.Vector3;
  poleB: THREE.Vector3;
}

export const POLE_PRESETS: PoleConfig[] = [
  {
    name: '双极平行',
    poleA: new THREE.Vector3(-80, 0, 0),
    poleB: new THREE.Vector3(80, 0, 0),
  },
  {
    name: '双极相对',
    poleA: new THREE.Vector3(0, 60, 0),
    poleB: new THREE.Vector3(0, -60, 0),
  },
  {
    name: '单极散射',
    poleA: new THREE.Vector3(0, 0, 0),
    poleB: new THREE.Vector3(200, 0, 0),
  },
];

export class MagneticField {
  poleA: THREE.Vector3;
  poleB: THREE.Vector3;
  k: number;
  attenuation: number;
  strengthMultiplier: number;
  q1: number = 1;
  q2: number = -1;

  constructor(
    poleA: THREE.Vector3 = new THREE.Vector3(-80, 0, 0),
    poleB: THREE.Vector3 = new THREE.Vector3(80, 0, 0)
  ) {
    this.poleA = poleA.clone();
    this.poleB = poleB.clone();
    this.k = 500;
    this.attenuation = 0.8;
    this.strengthMultiplier = 1.0;
  }

  setPoleA(pos: THREE.Vector3): void {
    this.poleA.copy(pos);
  }

  setPoleB(pos: THREE.Vector3): void {
    this.poleB.copy(pos);
  }

  setStrengthMultiplier(m: number): void {
    this.strengthMultiplier = m;
  }

  getPoleDistance(): number {
    return this.poleA.distanceTo(this.poleB);
  }

  getFieldStrength(position: THREE.Vector3): number {
    const forceA = this.calculateForceFromPole(position, this.poleA, this.q1);
    const forceB = this.calculateForceFromPole(position, this.poleB, this.q2);
    const totalForce = forceA.clone().add(forceB);
    return totalForce.length();
  }

  getFieldForce(position: THREE.Vector3): THREE.Vector3 {
    const forceA = this.calculateForceFromPole(position, this.poleA, this.q1);
    const forceB = this.calculateForceFromPole(position, this.poleB, this.q2);
    return forceA.add(forceB);
  }

  private calculateForceFromPole(
    position: THREE.Vector3,
    pole: THREE.Vector3,
    charge: number
  ): THREE.Vector3 {
    const diff = position.clone().sub(pole);
    const distSq = diff.lengthSq();
    const minDist = 5;
    const adjustedDistSq = Math.max(distSq, minDist * minDist);
    const dist = Math.sqrt(adjustedDistSq);
    const magnitude =
      (this.k * this.strengthMultiplier * charge * this.attenuation) /
      adjustedDistSq;
    return diff.normalize().multiplyScalar(magnitude);
  }

  getFieldLines(lineCount: number = 12, pointsPerLine: number = 20): THREE.Vector3[][] {
    const lines: THREE.Vector3[][] = [];
    const poleDistance = this.poleA.distanceTo(this.poleB);
    if (poleDistance < 1) return lines;

    const direction = this.poleB.clone().sub(this.poleA).normalize();
    const perpendicular1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(direction.dot(perpendicular1)) > 0.9) {
      perpendicular1.set(0, 1, 0);
    }
    perpendicular1.sub(direction.clone().multiplyScalar(direction.dot(perpendicular1))).normalize();
    const perpendicular2 = new THREE.Vector3().crossVectors(direction, perpendicular1).normalize();

    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const offsetRadius = 10;
      const offset = perpendicular1
        .clone()
        .multiplyScalar(Math.cos(angle) * offsetRadius)
        .add(perpendicular2.clone().multiplyScalar(Math.sin(angle) * offsetRadius));

      const startPoint = this.poleA.clone().add(offset);
      const endPoint = this.poleB.clone().add(
        offset.clone().multiplyScalar(-1)
      );

      const linePoints: THREE.Vector3[] = [];
      for (let j = 0; j < pointsPerLine; j++) {
        const t = j / (pointsPerLine - 1);
        const curveT = t;
        const curveFactor = Math.sin(t * Math.PI) * 0.3;
        const midOffset = offset.clone().multiplyScalar(curveFactor * 2);

        const lerped = startPoint.clone().lerp(endPoint, curveT);
        lerped.add(midOffset);
        linePoints.push(lerped);
      }
      lines.push(linePoints);
    }
    return lines;
  }

  getFieldLineOpacity(distanceRatio: number): number {
    return Math.max(0.1, 0.6 * (1 - distanceRatio * 0.7));
  }
}
