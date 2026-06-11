import * as THREE from 'three';

export interface WindParams {
  strength: number;
  turbulence: number;
}

class SimplexNoise {
  private perm: number[];
  private grad3: number[][];

  constructor(seed: number = Math.random()) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    let s = seed * 10000;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private dot(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  noise3D(xin: number, yin: number, zin: number): number {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

    let n0: number, n1: number, n2: number, n3: number;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0.0;
    else {
      t3 *= t3;
      n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
    }

    return 32.0 * (n0 + n1 + n2 + n3);
  }
}

export class WindField {
  private noiseX: SimplexNoise;
  private noiseY: SimplexNoise;
  private noiseZ: SimplexNoise;
  public params: WindParams;
  private time: number = 0;
  private perturbationCenter: THREE.Vector3 | null = null;
  private perturbationStrength: number = 0;
  private perturbationDecay: number = 0;

  constructor(params: WindParams) {
    this.params = { ...params };
    this.noiseX = new SimplexNoise(0.1);
    this.noiseY = new SimplexNoise(0.3);
    this.noiseZ = new SimplexNoise(0.7);
  }

  updateParams(newParams: Partial<WindParams>): void {
    Object.assign(this.params, newParams);
  }

  addPerturbation(center: THREE.Vector3, strength: number, duration: number): void {
    this.perturbationCenter = center.clone();
    this.perturbationStrength = strength;
    this.perturbationDecay = 1 / duration;
  }

  updateTime(deltaTime: number): void {
    this.time += deltaTime * 0.1;
    if (this.perturbationStrength > 0) {
      this.perturbationStrength = Math.max(0, this.perturbationStrength - this.perturbationDecay * deltaTime);
    }
  }

  getWindVelocity(position: THREE.Vector3): THREE.Vector3 {
    const { strength, turbulence } = this.params;
    const scale = 0.08;
    const tScale = 0.15;

    const nx = this.noiseX.noise3D(
      position.x * scale + this.time * tScale,
      position.y * scale,
      position.z * scale - this.time * tScale * 0.5
    );

    const ny = this.noiseY.noise3D(
      position.x * scale - this.time * tScale * 0.3,
      position.y * scale + this.time * tScale * 0.4,
      position.z * scale
    );

    const nz = this.noiseZ.noise3D(
      position.x * scale,
      position.y * scale - this.time * tScale * 0.6,
      position.z * scale + this.time * tScale * 0.7
    );

    const baseStrength = strength * 0.3;
    const turbStrength = turbulence * 0.5;

    const velocity = new THREE.Vector3(
      nx * baseStrength + nx * turbStrength * 0.6 + 0.3 * baseStrength,
      ny * baseStrength * 0.6 + ny * turbStrength * 0.4,
      nz * baseStrength + nz * turbStrength * 0.5 + 0.2 * baseStrength
    );

    if (this.perturbationCenter && this.perturbationStrength > 0) {
      const toCenter = new THREE.Vector3().subVectors(this.perturbationCenter, position);
      const dist = toCenter.length();
      const maxDist = 8;
      if (dist < maxDist) {
        const falloff = 1 - dist / maxDist;
        const effect = this.perturbationStrength * falloff * falloff;
        velocity.multiplyScalar(1 + effect * 0.5);
        toCenter.normalize().multiplyScalar(effect * 0.3);
        velocity.add(toCenter);
      }
    }

    return velocity;
  }

  getSpeed(velocity: THREE.Vector3): number {
    return velocity.length();
  }

  getSpeedColor(speed: number): THREE.Color {
    const normalizedSpeed = Math.min(speed / 12, 1);
    const color = new THREE.Color();

    if (normalizedSpeed < 0.5) {
      const t = normalizedSpeed / 0.5;
      color.setRGB(
        0.039 + (0.047 - 0.039) * t,
        0.239 + (0.482 - 0.239) * t,
        0.384 + (0.576 - 0.384) * t
      );
    } else {
      const t = (normalizedSpeed - 0.5) / 0.5;
      color.setRGB(
        0.047 + (0.902 - 0.047) * t,
        0.482 + (0.494 - 0.482) * t,
        0.576 + (0.133 - 0.576) * t
      );
    }

    return color;
  }
}
