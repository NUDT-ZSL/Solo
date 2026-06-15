import * as THREE from 'three';

export class CubicBezierCurve3D {
  private p0: THREE.Vector3;
  private p1: THREE.Vector3;
  private p2: THREE.Vector3;
  private p3: THREE.Vector3;

  constructor(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
    this.p0 = p0.clone();
    this.p1 = p1.clone();
    this.p2 = p2.clone();
    this.p3 = p3.clone();
  }

  getPoint(t: number): THREE.Vector3 {
    t = Math.max(0, Math.min(1, t));
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3(
      mt3 * this.p0.x + 3 * mt2 * t * this.p1.x + 3 * mt * t2 * this.p2.x + t3 * this.p3.x,
      mt3 * this.p0.y + 3 * mt2 * t * this.p1.y + 3 * mt * t2 * this.p2.y + t3 * this.p3.y,
      mt3 * this.p0.z + 3 * mt2 * t * this.p1.z + 3 * mt * t2 * this.p2.z + t3 * this.p3.z
    );
  }

  static createArcPath(start: THREE.Vector3, end: THREE.Vector3, height: number = 3): CubicBezierCurve3D {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const dist = dir.length();
    
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(dir, up).normalize();
    if (normal.lengthSq() < 0.001) {
      normal.set(1, 0, 0);
    }
    
    const perpendicular = new THREE.Vector3().crossVectors(normal, dir).normalize();
    
    const controlHeight = Math.max(height, dist * 0.3);
    const p1 = new THREE.Vector3().copy(start).add(perpendicular.clone().multiplyScalar(dist * 0.25)).add(new THREE.Vector3(0, controlHeight, 0));
    const p2 = new THREE.Vector3().copy(end).add(perpendicular.clone().multiplyScalar(-dist * 0.25)).add(new THREE.Vector3(0, controlHeight * 1.2, 0));

    return new CubicBezierCurve3D(start, p1, p2, end);
  }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInCubic(t: number): number {
  return t * t * t;
}
