import * as THREE from 'three';

export interface OrbitParams {
  massRatio: number;
  inclination: number;
  eccentricity: number;
  period: number;
}

export interface OrbitState {
  positionA: THREE.Vector3;
  positionB: THREE.Vector3;
  eclipseFactor: number;
  trueAnomaly: number;
}

const RADIUS_A = 1.5;
const RADIUS_B = 1.0;
const SEMI_MAJOR_AXIS = 3.5;
const TRANSITION_DURATION = 0.5;

export class OrbitSystem {
  private params: OrbitParams;
  private targetParams: OrbitParams;
  private transitionParams: OrbitParams;
  private transitionProgress: number = 1;
  private meanAnomaly: number = 0;
  private time: number = 0;
  private scene: THREE.Scene;
  private orbitLineA: THREE.Line | null = null;
  private orbitLineB: THREE.Line | null = null;

  constructor(scene: THREE.Scene, initialParams: OrbitParams) {
    this.scene = scene;
    this.params = { ...initialParams };
    this.targetParams = { ...initialParams };
    this.transitionParams = { ...initialParams };
    this.createOrbitLines();
  }

  private createOrbitLines(): void {
    if (this.orbitLineA) {
      this.scene.remove(this.orbitLineA);
      this.orbitLineA.geometry.dispose();
    }
    if (this.orbitLineB) {
      this.scene.remove(this.orbitLineB);
      this.orbitLineB.geometry.dispose();
    }

    const { eccentricity, inclination, massRatio } = this.params;
    const a = SEMI_MAJOR_AXIS;
    const e = eccentricity;
    const a1 = a * massRatio / (1 + massRatio);
    const a2 = a * 1 / (1 + massRatio);

    const createOrbitGeometry = (semiMajor: number, offsetSign: number): THREE.BufferGeometry => {
      const segments = 256;
      const points: number[] = [];
      const b = semiMajor * Math.sqrt(1 - e * e);
      const inclRad = (inclination * Math.PI) / 180;

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = semiMajor * (Math.cos(theta) - e) * offsetSign;
        const y = b * Math.sin(theta);
        const z = 0;
        const v = new THREE.Vector3(x, y, z);
        v.y = y * Math.cos(inclRad);
        v.z = y * Math.sin(inclRad);
        points.push(v.x, v.y, v.z);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      return geometry;
    };

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.35,
    });

    const createOrbitGeometryB = (semiMajor: number): THREE.BufferGeometry => {
      const segments = 256;
      const points: number[] = [];
      const b = semiMajor * Math.sqrt(1 - e * e);
      const iRad = (inclination * Math.PI) / 180;

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = semiMajor * (Math.cos(theta) - e);
        const yOrig = b * Math.sin(theta);
        const v = new THREE.Vector3(
          x,
          -yOrig * Math.cos(iRad),
          -yOrig * Math.sin(iRad)
        );
        points.push(v.x, v.y, v.z);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      return geometry;
    };

    this.orbitLineA = new THREE.Line(createOrbitGeometry(a1, -1), lineMaterial);
    this.orbitLineB = new THREE.Line(createOrbitGeometryB(a2), lineMaterial.clone());
    this.scene.add(this.orbitLineA);
    this.scene.add(this.orbitLineB);
  }

  public updateParams(newParams: Partial<OrbitParams>): void {
    this.transitionParams = { ...this.params };
    this.targetParams = { ...this.targetParams, ...newParams };
    this.transitionProgress = 0;
  }

  private solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 8; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  private lerpParams(): void {
    if (this.transitionProgress >= 1) {
      this.params = { ...this.targetParams };
      return;
    }

    this.transitionProgress = Math.min(1, this.transitionProgress + 1 / 60 / TRANSITION_DURATION);
    const t = this.easeInOutCubic(this.transitionProgress);

    this.params = {
      massRatio: this.lerp(this.transitionParams.massRatio, this.targetParams.massRatio, t),
      inclination: this.lerp(this.transitionParams.inclination, this.targetParams.inclination, t),
      eccentricity: this.lerp(this.transitionParams.eccentricity, this.targetParams.eccentricity, t),
      period: this.lerp(this.transitionParams.period, this.targetParams.period, t),
    };

    if (this.transitionProgress > 0 && this.transitionProgress < 1) {
      this.createOrbitLines();
    } else if (this.transitionProgress >= 1) {
      this.createOrbitLines();
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update(deltaTime: number): OrbitState {
    this.lerpParams();
    this.time += deltaTime;

    const { eccentricity, inclination, period, massRatio } = this.params;
    const a = SEMI_MAJOR_AXIS;
    const e = eccentricity;
    const a1 = a * massRatio / (1 + massRatio);
    const a2 = a * 1 / (1 + massRatio);

    const n = (2 * Math.PI) / period;
    this.meanAnomaly = (this.meanAnomaly + n * deltaTime) % (2 * Math.PI);

    const E = this.solveKepler(this.meanAnomaly, e);
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    const r1 = a1 * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));
    const r2 = a2 * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

    const inclRad = (inclination * Math.PI) / 180;

    const sinTA = Math.sin(trueAnomaly) * Math.sqrt(1 - e * e);
    const cosTA = Math.cos(trueAnomaly);

    const positionA = new THREE.Vector3(
      -r1 * cosTA,
      r1 * sinTA * Math.cos(inclRad),
      r1 * sinTA * Math.sin(inclRad)
    );

    const positionB = new THREE.Vector3(
      r2 * cosTA,
      -r2 * sinTA * Math.cos(inclRad),
      -r2 * sinTA * Math.sin(inclRad)
    );

    const eclipseFactor = this.calculateEclipseFactor(positionA, positionB);

    return { positionA, positionB, eclipseFactor, trueAnomaly };
  }

  private calculateEclipseFactor(
    posA: THREE.Vector3,
    posB: THREE.Vector3
  ): number {
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    const isBInFront = posB.z < posA.z;

    if (!isBInFront) {
      return 1.0;
    }

    const minDistance = RADIUS_A + RADIUS_B;

    if (d >= minDistance) {
      return 1.0;
    }

    const rA = RADIUS_A;
    const rB = RADIUS_B;

    let overlapArea = 0;
    if (d + rB <= rA) {
      overlapArea = Math.PI * rB * rB;
    } else if (d >= rA + rB) {
      overlapArea = 0;
    } else {
      const part1 = rA * rA * Math.acos((d * d + rA * rA - rB * rB) / (2 * d * rA));
      const part2 = rB * rB * Math.acos((d * d + rB * rB - rA * rA) / (2 * d * rB));
      const part3 = 0.5 * Math.sqrt((-d + rA + rB) * (d + rA - rB) * (d - rA + rB) * (d + rA + rB));
      overlapArea = part1 + part2 - part3;
    }

    const areaA = Math.PI * RADIUS_A * RADIUS_A;
    const obscurationRatio = Math.min(1, overlapArea / areaA);

    const minBrightness = 0.3;
    const eclipseFactor = 1.0 - obscurationRatio * (1.0 - minBrightness);

    return eclipseFactor;
  }

  public getRadiusA(): number {
    return RADIUS_A;
  }

  public getRadiusB(): number {
    return RADIUS_B;
  }

  public getParams(): OrbitParams {
    return { ...this.params };
  }

  public getCycleCount(): number {
    return Math.floor(this.time / this.params.period);
  }

  public getTimeInDays(): number {
    return this.time;
  }
}
