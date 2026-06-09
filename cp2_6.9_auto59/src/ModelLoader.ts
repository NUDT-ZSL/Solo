import * as THREE from 'three';

export interface ModelLoadCallbacks {
  onProgress?: (stage: number, message: string) => void;
}

export class ModelLoader {
  private textureIntensity: number = 0.7;
  private vesselMaterial!: THREE.MeshStandardMaterial;

  constructor() {}

  public async load(_path: string, callbacks?: ModelLoadCallbacks): Promise<THREE.Group> {
    const group = new THREE.Group();
    group.name = 'BronzeVesselGroup';

    if (callbacks?.onProgress) callbacks.onProgress(1, '计算顶点数据...');
    await this.delay(400);

    const vesselMesh = this.createVesselMesh();
    group.add(vesselMesh);

    if (callbacks?.onProgress) callbacks.onProgress(2, '生成材质纹理...');
    await this.delay(500);

    const baseMesh = this.createBasePlatform();
    group.add(baseMesh);

    if (callbacks?.onProgress) callbacks.onProgress(3, '设置光照系统...');
    await this.delay(600);

    this.setupLighting(group);

    return group;
  }

  public setTextureIntensity(value: number): void {
    this.textureIntensity = value;
    if (this.vesselMaterial) {
      const normalMap = this.createNormalMap();
      this.vesselMaterial.normalMap = normalMap;
      this.vesselMaterial.normalScale.set(value * 2, value * 2);
      this.vesselMaterial.needsUpdate = true;
    }
  }

  private createVesselMesh(): THREE.Mesh {
    const geometry = this.buildVesselGeometry();
    geometry.computeVertexNormals();

    const bronzeColor = new THREE.Color(0x6b7b3a);
    this.vesselMaterial = new THREE.MeshStandardMaterial({
      color: bronzeColor,
      roughness: 0.7,
      metalness: 0.3,
      normalMap: this.createNormalMap(),
      normalScale: new THREE.Vector2(this.textureIntensity * 2, this.textureIntensity * 2),
      flatShading: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, this.vesselMaterial);
    mesh.name = 'BronzeVessel';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private buildVesselGeometry(): THREE.BufferGeometry {
    const bottomSegments = 24;
    const topSegments = 48;
    const heightSegments = 80;
    const totalHeight = 2.0;
    const bottomRadius = 0.8;
    const topRadius = 1.2;
    const bellyBump = 0.25;
    const bellyPosition = 0.45;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const colorBase = new THREE.Color(0x6b7b3a);
    const colorPatina1 = new THREE.Color(0x4a8a5a);
    const colorPatina2 = new THREE.Color(0x3a6a7a);
    const colorDark = new THREE.Color(0x3a3a2a);

    for (let y = 0; y <= heightSegments; y++) {
      const t = y / heightSegments;
      const height = t * totalHeight - totalHeight * 0.1;
      
      const bellCurve = Math.exp(-Math.pow((t - bellyPosition) / 0.2, 2));
      const radius = bottomRadius + (topRadius - bottomRadius) * t + bellyBump * bellCurve;
      
      const segments = Math.round(bottomSegments + (topSegments - bottomSegments) * t);
      
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;

        x = this.addNoise(x, t, angle, 0.008);
        z = this.addNoise(z, t, angle + 1.3, 0.008);

        const reliefHeight = this.calculateRelief(t, angle);
        const nx = Math.cos(angle);
        const nz = Math.sin(angle);
        x += nx * reliefHeight;
        z += nz * reliefHeight;

        positions.push(x, height, z);

        const u = i / segments;
        const v = t;
        uvs.push(u, v);

        const noiseVal = this.noise2D(x * 3, z * 3);
        const color = colorBase.clone();
        if (noiseVal > 0.6) {
          color.lerp(colorPatina1, (noiseVal - 0.6) * 1.5 * this.textureIntensity);
        } else if (noiseVal < 0.3) {
          color.lerp(colorDark, (0.3 - noiseVal) * 1.5 * this.textureIntensity);
        }
        const noiseVal2 = this.noise2D(x * 5 + 100, z * 5 + 100);
        if (noiseVal2 > 0.7) {
          color.lerp(colorPatina2, (noiseVal2 - 0.7) * 2 * this.textureIntensity);
        }
        colors.push(color.r, color.g, color.b);
      }
    }

    let indexOffset = 0;
    for (let y = 0; y < heightSegments; y++) {
      const t = y / heightSegments;
      const tNext = (y + 1) / heightSegments;
      const seg1 = Math.round(bottomSegments + (topSegments - bottomSegments) * t);
      const seg2 = Math.round(bottomSegments + (topSegments - bottomSegments) * tNext);

      for (let i = 0; i < Math.max(seg1, seg2); i++) {
        const i1 = i % seg1;
        const i2 = i % seg2;
        const i1Next = (i + 1) % seg1;
        const i2Next = (i + 1) % seg2;

        const a = indexOffset + i1;
        const b = indexOffset + i1Next;
        const c = indexOffset + seg1 + i2;
        const d = indexOffset + seg1 + i2Next;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
      indexOffset += seg1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    if (geometry.attributes.position.count < 2000) {
      console.warn('顶点数不足2000，当前:', geometry.attributes.position.count);
    }

    return geometry;
  }

  private calculateRelief(t: number, angle: number): number {
    let relief = 0;

    const band1Y = 0.35;
    const band2Y = 0.55;
    const bandWidth = 0.015;

    if (Math.abs(t - band1Y) < bandWidth) {
      relief += 0.025 * (1 - Math.abs(t - band1Y) / bandWidth);
    }
    if (Math.abs(t - band2Y) < bandWidth) {
      relief += 0.025 * (1 - Math.abs(t - band2Y) / bandWidth);
    }

    if (t > 0.38 && t < 0.52) {
      const normalizedT = (t - 0.38) / 0.14;
      for (let face = 0; face < 4; face++) {
        const faceAngle = (face / 4) * Math.PI * 2;
        const angleDiff = this.angularDifference(angle, faceAngle);
        if (angleDiff < Math.PI * 0.18) {
          const faceStrength = Math.cos(angleDiff / 0.18 * Math.PI * 0.5);
          const bellyCurve = Math.sin(normalizedT * Math.PI);
          relief += 0.05 * faceStrength * bellyCurve;

          const eyeAngle1 = faceAngle - 0.06;
          const eyeAngle2 = faceAngle + 0.06;
          if (Math.abs(this.angularDifference(angle, eyeAngle1)) < 0.025 && normalizedT > 0.3 && normalizedT < 0.7) {
            relief += 0.02;
          }
          if (Math.abs(this.angularDifference(angle, eyeAngle2)) < 0.025 && normalizedT > 0.3 && normalizedT < 0.7) {
            relief += 0.02;
          }

          if (angleDiff < 0.03 && normalizedT > 0.4 && normalizedT < 0.6) {
            relief += 0.015;
          }
        }
      }
    }

    return relief;
  }

  private angularDifference(a: number, b: number): number {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
  }

  private createNormalMap(): THREE.DataTexture {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const nx = this.noise2D(x * 0.05, y * 0.05) * 2 - 1;
        const ny = this.noise2D(x * 0.05 + 100, y * 0.05 + 100) * 2 - 1;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
        data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
        data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
        data[idx + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createBasePlatform(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(1.8, 1.8, 0.05, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a3a5a,
      transparent: true,
      opacity: 0.3,
      roughness: 0.8,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -1.05;
    mesh.receiveShadow = true;
    return mesh;
  }

  private setupLighting(group: THREE.Group): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    ambientLight.name = 'AmbientLight';
    group.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    mainLight.position.set(2, 3, 2);
    mainLight.name = 'MainLight';
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    group.add(mainLight);

    const backLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    backLight.position.set(-2, -1, -2);
    backLight.name = 'BackLight';
    group.add(backLight);

    const fillLight = new THREE.DirectionalLight(0x88ffcc, 0.2);
    fillLight.position.set(-1, 2, -1);
    fillLight.name = 'FillLight';
    group.add(fillLight);
  }

  private addNoise(value: number, t: number, seed: number, amount: number): number {
    const n = this.noise2D(t * 10 + seed * 2, seed * 3);
    return value + (n - 0.5) * 2 * amount;
  }

  private noise2D(x: number, y: number): number {
    const perm = this.getPermutation();
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = perm[X] + Y;
    const AA = perm[A & 255];
    const AB = perm[(A + 1) & 255];
    const B = perm[(X + 1) & 255] + Y;
    const BA = perm[B & 255];
    const BB = perm[(B + 1) & 255];
    return this.lerp(v,
      this.lerp(u, this.grad(perm[AA], x, y), this.grad(perm[BA], x - 1, y)),
      this.lerp(u, this.grad(perm[AB], x, y - 1), this.grad(perm[BB], x - 1, y - 1))
    );
  }

  private fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
  private lerp(t: number, a: number, b: number): number { return a + t * (b - a); }
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private permutation: number[] | null = null;
  private getPermutation(): number[] {
    if (this.permutation) return this.permutation;
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((Math.sin(i * 12.9898) * 43758.5453) % 1 * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.permutation = p.concat(p);
    return this.permutation;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
