import * as THREE from 'three';

export interface TerrainConfig {
  size: number;
  segments: number;
  amplitude: number;
  seed: number;
}

export class TerrainGenerator {
  private config: TerrainConfig;
  private permutation: number[];

  constructor(config: Partial<TerrainConfig> = {}) {
    this.config = {
      size: 16,
      segments: 64,
      amplitude: 3,
      seed: Math.random() * 10000,
      ...config
    };
    this.permutation = this.generatePermutation(this.config.seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    const perm: number[] = [];
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
    return perm;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  public fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }

  public generateGeometry(): THREE.PlaneGeometry {
    const { size, segments, amplitude } = this.config;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors: number[] = [];
    const colorBottom = new THREE.Color('#4A90D9');
    const colorTop = new THREE.Color('#90EE90');

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const nx = (x + size / 2) / size * 4;
      const nz = (z + size / 2) / size * 4;
      const height = (this.fbm(nx, nz, 5, 0.5, 2.0) + 1) / 2 * amplitude;
      positions.setY(i, height);

      const t = height / amplitude;
      const color = colorBottom.clone().lerp(colorTop, t);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  public createMesh(): THREE.Group {
    const group = new THREE.Group();

    const terrainGeometry = this.generateGeometry();
    const terrainMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      shininess: 10
    });
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.receiveShadow = true;
    terrainMesh.userData.type = 'terrain';
    group.add(terrainMesh);

    const wireframeGeometry = this.generateGeometry();
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x808080,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    wireframeMesh.position.y = 0.01;
    group.add(wireframeMesh);

    return group;
  }

  public getHeightAt(x: number, z: number): number {
    const { size, amplitude } = this.config;
    const nx = (x + size / 2) / size * 4;
    const nz = (z + size / 2) / size * 4;
    return (this.fbm(nx, nz, 5, 0.5, 2.0) + 1) / 2 * amplitude;
  }

  public updateConfig(newConfig: Partial<TerrainConfig>): void {
    const oldSeed = this.config.seed;
    this.config = { ...this.config, ...newConfig };
    if (newConfig.seed !== undefined && newConfig.seed !== oldSeed) {
      this.permutation = this.generatePermutation(this.config.seed);
    }
  }

  public regenerateMesh(): THREE.Group {
    return this.createMesh();
  }
}
