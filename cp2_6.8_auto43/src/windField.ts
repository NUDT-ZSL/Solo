import * as THREE from 'three';

export type WindFieldMode = 'vortex' | 'turbulence' | 'laminar';

export class WindField {
  public readonly gridSize: { x: number; y: number; z: number };
  public readonly bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private data: Float32Array;
  private mode: WindFieldMode;

  constructor(gridX = 20, gridY = 20, gridZ = 10) {
    this.gridSize = { x: gridX, y: gridY, z: gridZ };
    this.bounds = {
      min: new THREE.Vector3(-10, -10, -5),
      max: new THREE.Vector3(10, 10, 5)
    };
    this.data = new Float32Array(gridX * gridY * gridZ * 3);
    this.mode = 'vortex';
    this.generateField(this.mode);
  }

  private getIndex(ix: number, iy: number, iz: number): number {
    return (iz * this.gridSize.x * this.gridSize.y + iy * this.gridSize.x + ix) * 3;
  }

  public generateField(mode: WindFieldMode): void {
    this.mode = mode;
    const { x: gx, y: gy, z: gz } = this.gridSize;

    for (let iz = 0; iz < gz; iz++) {
      for (let iy = 0; iy < gy; iy++) {
        for (let ix = 0; ix < gx; ix++) {
          const pos = this.gridToWorld(ix, iy, iz);
          const vel = this.computeVelocity(mode, pos);
          const idx = this.getIndex(ix, iy, iz);
          this.data[idx] = vel.x;
          this.data[idx + 1] = vel.y;
          this.data[idx + 2] = vel.z;
        }
      }
    }
  }

  private gridToWorld(ix: number, iy: number, iz: number): THREE.Vector3 {
    const { min, max } = this.bounds;
    const { x: gx, y: gy, z: gz } = this.gridSize;
    return new THREE.Vector3(
      min.x + (ix / (gx - 1)) * (max.x - min.x),
      min.y + (iy / (gy - 1)) * (max.y - min.y),
      min.z + (iz / (gz - 1)) * (max.z - min.z)
    );
  }

  private computeVelocity(mode: WindFieldMode, pos: THREE.Vector3): THREE.Vector3 {
    switch (mode) {
      case 'vortex':
        return this.computeVortex(pos);
      case 'turbulence':
        return this.computeTurbulence(pos);
      case 'laminar':
        return this.computeLaminar(pos);
      default:
        return new THREE.Vector3();
    }
  }

  private computeVortex(pos: THREE.Vector3): THREE.Vector3 {
    const centerX = 0;
    const centerY = 0;
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 12;
    const strength = Math.max(0, 1 - dist / maxDist) * 2.5;

    const vx = dy * strength;
    const vy = -dx * strength;
    const vz = pos.z * 0.15;

    return new THREE.Vector3(vx, vy, vz);
  }

  private computeTurbulence(pos: THREE.Vector3): THREE.Vector3 {
    const freq = 0.35;
    const vx = this.noise3D(pos.x * freq, pos.y * freq, pos.z * freq) * 2.0;
    const vy = this.noise3D(pos.x * freq + 100, pos.y * freq + 100, pos.z * freq + 100) * 2.0;
    const vz = this.noise3D(pos.x * freq + 200, pos.y * freq + 200, pos.z * freq + 200) * 1.5;

    return new THREE.Vector3(vx, vy, vz);
  }

  private computeLaminar(pos: THREE.Vector3): THREE.Vector3 {
    const baseSpeed = 1.5;
    const layerVariation = Math.sin(pos.y * 0.4) * 0.3;
    const vx = baseSpeed + layerVariation;
    const vy = 0;
    const vz = Math.sin(pos.x * 0.25) * 0.3;

    return new THREE.Vector3(vx, vy, vz);
  }

  private noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  private perm: number[] = (() => {
    const p = new Array(512);
    const base = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
      8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
      35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
      134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
      55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
      18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
      250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
      189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
      172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
      228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
      107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    for (let i = 0; i < 256; i++) {
      p[i] = base[i];
      p[i + 256] = base[i];
    }
    return p;
  })();

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public getVelocity(point: THREE.Vector3): THREE.Vector3 {
    const { min, max } = this.bounds;
    const { x: gx, y: gy, z: gz } = this.gridSize;

    const nx = ((point.x - min.x) / (max.x - min.x)) * (gx - 1);
    const ny = ((point.y - min.y) / (max.y - min.y)) * (gy - 1);
    const nz = ((point.z - min.z) / (max.z - min.z)) * (gz - 1);

    if (nx < 0 || nx >= gx - 1 || ny < 0 || ny >= gy - 1 || nz < 0 || nz >= gz - 1) {
      return new THREE.Vector3();
    }

    const ix0 = Math.floor(nx);
    const iy0 = Math.floor(ny);
    const iz0 = Math.floor(nz);
    const ix1 = ix0 + 1;
    const iy1 = iy0 + 1;
    const iz1 = iz0 + 1;

    const tx = nx - ix0;
    const ty = ny - iy0;
    const tz = nz - iz0;

    const readVel = (ix: number, iy: number, iz: number, out: THREE.Vector3) => {
      const idx = this.getIndex(ix, iy, iz);
      out.x = this.data[idx];
      out.y = this.data[idx + 1];
      out.z = this.data[idx + 2];
    };

    const v000 = new THREE.Vector3();
    const v100 = new THREE.Vector3();
    const v010 = new THREE.Vector3();
    const v110 = new THREE.Vector3();
    const v001 = new THREE.Vector3();
    const v101 = new THREE.Vector3();
    const v011 = new THREE.Vector3();
    const v111 = new THREE.Vector3();

    readVel(ix0, iy0, iz0, v000);
    readVel(ix1, iy0, iz0, v100);
    readVel(ix0, iy1, iz0, v010);
    readVel(ix1, iy1, iz0, v110);
    readVel(ix0, iy0, iz1, v001);
    readVel(ix1, iy0, iz1, v101);
    readVel(ix0, iy1, iz1, v011);
    readVel(ix1, iy1, iz1, v111);

    const c00 = v000.clone().lerp(v100, tx);
    const c01 = v001.clone().lerp(v101, tx);
    const c10 = v010.clone().lerp(v110, tx);
    const c11 = v011.clone().lerp(v111, tx);

    const c0 = c00.lerp(c10, ty);
    const c1 = c01.lerp(c11, ty);

    return c0.lerp(c1, tz);
  }

  public getMode(): WindFieldMode {
    return this.mode;
  }
}
