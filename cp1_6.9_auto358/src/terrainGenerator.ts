import * as THREE from 'three';

export interface TerrainData {
  geometry: THREE.PlaneGeometry;
  material: THREE.MeshStandardMaterial;
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  oreVeins: OreVeinData[];
  faultPlanes: FaultPlaneData[];
  heightData: number[][];
}

export interface OreVeinData {
  mesh: THREE.Mesh;
  name: string;
  type: 'gold' | 'emerald';
  depth: number;
  width: number;
  length: number;
  color: THREE.Color;
  originalColor: THREE.Color;
  originalEmissive: THREE.Color;
  originalEmissiveIntensity: number;
  center: THREE.Vector3;
  haloParticles?: THREE.Points;
}

export interface FaultPlaneData {
  mesh: THREE.Mesh;
  name: string;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  area: number;
}

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
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

  noise2D(x: number, y: number): number {
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

  octaveNoise2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }
}

export class TerrainGenerator {
  private noise: PerlinNoise;
  private readonly GRID_SIZE = 100;
  private readonly SPACING = 3;
  private readonly HEIGHT_RANGE = 15;
  private readonly WORLD_SIZE = 300;

  private readonly COLOR_SURFACE = new THREE.Color(0xD4A574);
  private readonly COLOR_MID = new THREE.Color(0x6B5B4E);
  private readonly COLOR_DEEP = new THREE.Color(0x3A2E24);

  constructor() {
    this.noise = new PerlinNoise(42);
  }

  generate(): TerrainData {
    const geometry = this.createTerrainGeometry();
    const heightData = this.computeHeightData();
    this.applyVertexHeights(geometry, heightData);
    this.applyVertexColors(geometry, heightData);
    geometry.computeVertexNormals();

    const material = this.createTerrainMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData = { type: 'terrain', index: 0 };

    const wireframe = this.createWireframe(geometry);

    const oreVeins = this.generateOreVeins(heightData);
    const faultPlanes = this.generateFaultPlanes(heightData);

    mesh.add(wireframe);

    return {
      geometry,
      material,
      mesh,
      wireframe,
      oreVeins,
      faultPlanes,
      heightData
    };
  }

  private createTerrainGeometry(): THREE.PlaneGeometry {
    return new THREE.PlaneGeometry(
      this.WORLD_SIZE,
      this.WORLD_SIZE,
      this.GRID_SIZE - 1,
      this.GRID_SIZE - 1
    );
  }

  private computeHeightData(): number[][] {
    const data: number[][] = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      data[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const nx = i / this.GRID_SIZE;
        const ny = j / this.GRID_SIZE;
        let height = this.noise.octaveNoise2D(nx * 3, ny * 3, 5, 0.55);
        height = this.smoothHeight(height, i, j);
        data[i][j] = height * this.HEIGHT_RANGE;
      }
    }
    return data;
  }

  private smoothHeight(height: number, i: number, j: number): number {
    const centerDist = Math.sqrt(
      Math.pow((i - this.GRID_SIZE / 2) / (this.GRID_SIZE / 2), 2) +
      Math.pow((j - this.GRID_SIZE / 2) / (this.GRID_SIZE / 2), 2)
    );
    const falloff = Math.max(0, 1 - centerDist * 0.3);
    return height * falloff;
  }

  private applyVertexHeights(geometry: THREE.PlaneGeometry, heightData: number[][]): void {
    const positions = geometry.attributes.position;
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = i * this.GRID_SIZE + j;
        positions.setZ(index, heightData[i][j]);
      }
    }
    positions.needsUpdate = true;
  }

  private applyVertexColors(geometry: THREE.PlaneGeometry, heightData: number[][]): void {
    const colors = new Float32Array(this.GRID_SIZE * this.GRID_SIZE * 3);
    const positions = geometry.attributes.position;
    const minH = -this.HEIGHT_RANGE;
    const maxH = this.HEIGHT_RANGE;

    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = i * this.GRID_SIZE + j;
        const h = positions.getZ(index);
        const normalized = (h - minH) / (maxH - minH);
        const color = this.getTerrainColor(normalized);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  private getTerrainColor(normalizedHeight: number): THREE.Color {
    const color = new THREE.Color();
    if (normalizedHeight > 0.6) {
      const t = (normalizedHeight - 0.6) / 0.4;
      color.lerpColors(this.COLOR_MID, this.COLOR_SURFACE, t);
    } else if (normalizedHeight > 0.3) {
      const t = (normalizedHeight - 0.3) / 0.3;
      color.lerpColors(this.COLOR_DEEP, this.COLOR_MID, t);
    } else {
      const t = normalizedHeight / 0.3;
      color.lerpColors(new THREE.Color(0x1a1410), this.COLOR_DEEP, t);
    }
    return color;
  }

  private createTerrainMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.15,
      side: THREE.DoubleSide,
      flatShading: false
    });
  }

  private createWireframe(geometry: THREE.PlaneGeometry): THREE.LineSegments {
    const wireGeo = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
      linewidth: 1
    });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    wireframe.name = 'terrain-wireframe';
    return wireframe;
  }

  private generateOreVeins(heightData: number[][]): OreVeinData[] {
    const veins: OreVeinData[] = [];
    const count = 2 + Math.floor(Math.random() * 2);
    const types: ('gold' | 'emerald')[] = ['gold', 'emerald'];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const width = 3 + Math.random() * 5;
      const length = 30 + Math.random() * 30;
      const centerX = (Math.random() - 0.5) * this.WORLD_SIZE * 0.7;
      const centerZ = (Math.random() - 0.5) * this.WORLD_SIZE * 0.7;
      const baseDepth = 5 + Math.random() * 8;
      const rotationY = Math.random() * Math.PI;

      const geometry = new THREE.BoxGeometry(length, 2 + Math.random() * 2, width);
      const positions = geometry.attributes.position;

      for (let j = 0; j < positions.count; j++) {
        const py = positions.getY(j);
        const distortion = (Math.random() - 0.5) * 0.8;
        positions.setY(j, py + distortion);
      }
      geometry.computeVertexNormals();

      const color = type === 'gold' ? new THREE.Color(0xFFD700) : new THREE.Color(0x00CED1);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.75,
        roughness: 0.3,
        metalness: 0.9,
        emissive: color.clone(),
        emissiveIntensity: 0.4,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(centerX, -baseDepth, centerZ);
      mesh.rotation.y = rotationY;
      mesh.castShadow = true;

      const center = new THREE.Vector3(centerX, -baseDepth, centerZ);
      mesh.userData = { type: 'oreVein', index: i };

      const haloParticles = this.createHaloParticles(center, color, length, width);
      if (haloParticles) {
        haloParticles.visible = false;
      }

      veins.push({
        mesh,
        name: type === 'gold' ? `金矿脉 #${i + 1}` : `翡翠矿脉 #${i + 1}`,
        type,
        depth: baseDepth,
        width,
        length,
        color: color.clone(),
        originalColor: color.clone(),
        originalEmissive: color.clone(),
        originalEmissiveIntensity: 0.4,
        center,
        haloParticles
      });
    }

    return veins;
  }

  private createHaloParticles(center: THREE.Vector3, color: THREE.Color, length: number, width: number): THREE.Points {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = (length / 2) * (0.8 + Math.random() * 0.4);
      const radiusX = Math.cos(angle) * radius;
      const radiusZ = Math.sin(angle) * (width / 2 + 2);
      positions[i * 3] = center.x + radiusX;
      positions[i * 3 + 1] = center.y + (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = center.z + radiusZ;
      sizes[i] = 3 + Math.random() * 4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 5,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'halo-particles';
    return points;
  }

  private generateFaultPlanes(heightData: number[][]): FaultPlaneData[] {
    const planes: FaultPlaneData[] = [];
    const count = 1 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i++) {
      const shape = new THREE.Shape();
      const segments = 5 + Math.floor(Math.random() * 3);
      const centerX = (Math.random() - 0.5) * this.WORLD_SIZE * 0.5;
      const centerZ = (Math.random() - 0.5) * this.WORLD_SIZE * 0.5;
      const planeSize = 40 + Math.random() * 40;
      const depth = 3 + Math.random() * 5;

      const points: THREE.Vector2[] = [];
      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const r = planeSize * (0.6 + Math.random() * 0.4);
        points.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r * 0.6));
      }

      shape.moveTo(points[0].x, points[0].y);
      for (let j = 1; j < points.length; j++) {
        shape.lineTo(points[j].x, points[j].y);
      }
      shape.closePath();

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(centerX, -depth, centerZ);
      mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      mesh.rotation.z = (Math.random() - 0.5) * 0.5;

      const normal = new THREE.Vector3(0, 1, 0);
      normal.applyEuler(mesh.rotation);

      const edgesGeo = new THREE.EdgesGeometry(geometry);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      const area = Math.abs(geometry.attributes.position.count);
      mesh.userData = { type: 'faultPlane', index: i };

      planes.push({
        mesh,
        name: `断层面 #${i + 1}`,
        normal,
        center: new THREE.Vector3(centerX, -depth, centerZ),
        area
      });
    }

    return planes;
  }

  getGridSize(): number {
    return this.GRID_SIZE;
  }

  getSpacing(): number {
    return this.SPACING;
  }

  getWorldSize(): number {
    return this.WORLD_SIZE;
  }
}
