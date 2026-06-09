import * as THREE from 'three';

export interface CrystalData {
  id: number;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  color: THREE.Color;
  hue: number;
  targetSize: number;
  currentSize: number;
  growthDuration: number;
  growthTime: number;
  isFullyGrown: boolean;
  angularVelocity: THREE.Vector3;
  driftSpeed: number;
  driftOffset: THREE.Vector3;
  driftPhase: THREE.Vector3;
  trailPoints: TrailPoint[];
  trailGroup: THREE.Group;
  clickBoostTime: number;
}

interface TrailPoint {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

const HUES = [240, 280, 160];
const TRAIL_COUNT_MIN = 5;
const TRAIL_COUNT_MAX = 8;
const TRAIL_LIFETIME = 0.3;
const SPAWN_RANGE = 12;
const TRAIL_SPAWN_INTERVAL = 0.05;

export class CrystalSystem {
  private scene: THREE.Scene;
  private crystals: CrystalData[] = [];
  private materialCache: Map<string, THREE.MeshPhysicalMaterial> = new Map();
  private trailSpawnTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public init(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createCrystal(i);
    }
  }

  private createCrystal(id: number): void {
    const hue = HUES[Math.floor(Math.random() * HUES.length)];
    const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.4);

    const faceCount = Math.floor(Math.random() * 5) + 4;
    const geometry = this.createPolyhedronGeometry(faceCount);

    const material = this.getOrCreateMaterial(hue);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const position = new THREE.Vector3(
      (Math.random() - 0.5) * SPAWN_RANGE * 2,
      (Math.random() - 0.5) * SPAWN_RANGE * 2,
      (Math.random() - 0.5) * SPAWN_RANGE * 2
    );
    mesh.position.copy(position);
    mesh.scale.setScalar(0.1);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: color.clone().offsetHSL(0, 0, 0.2),
      transparent: true,
      opacity: 0.6
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    mesh.add(edges);

    this.scene.add(mesh);

    const trailGroup = new THREE.Group();
    this.scene.add(trailGroup);

    const crystal: CrystalData = {
      id,
      mesh,
      position: position.clone(),
      color: color.clone(),
      hue,
      targetSize: 0.5 + Math.random() * 1.0,
      currentSize: 0.1,
      growthDuration: 8 + Math.random() * 4,
      growthTime: 0,
      isFullyGrown: false,
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04
      ).normalize().multiplyScalar(0.01 + Math.random() * 0.02),
      driftSpeed: 0.05 + Math.random() * 0.1,
      driftOffset: new THREE.Vector3(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      driftPhase: new THREE.Vector3(
        0.3 + Math.random() * 0.5,
        0.3 + Math.random() * 0.5,
        0.3 + Math.random() * 0.5
      ),
      trailPoints: [],
      trailGroup,
      clickBoostTime: 0
    };

    this.crystals.push(crystal);
  }

  private createPolyhedronGeometry(faceCount: number): THREE.BufferGeometry {
    const radius = 1;
    const vertices: number[] = [];
    const indices: number[] = [];

    const topVertex = new THREE.Vector3(0, radius, 0);
    const bottomVertex = new THREE.Vector3(0, -radius, 0);
    vertices.push(topVertex.x, topVertex.y, topVertex.z);

    const ringCount = Math.max(2, Math.floor(faceCount / 3));
    const ringVertices: number[][] = [];

    for (let ring = 0; ring < ringCount; ring++) {
      const phi = (Math.PI * (ring + 1)) / (ringCount + 1);
      const vertsInRing = faceCount + Math.floor(Math.random() * 3) - 1;
      const ringIds: number[] = [];

      for (let i = 0; i < vertsInRing; i++) {
        const theta = (i / vertsInRing) * Math.PI * 2 + (ring % 2) * (Math.PI / vertsInRing);
        const r = radius * Math.sin(phi) * (0.85 + Math.random() * 0.3);
        const y = radius * Math.cos(phi) * (0.9 + Math.random() * 0.2);
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        vertices.push(x, y, z);
        ringIds.push(vertices.length / 3 - 1);
      }
      ringVertices.push(ringIds);
    }

    const bottomId = vertices.length / 3;
    vertices.push(bottomVertex.x, bottomVertex.y, bottomVertex.z);

    if (ringVertices.length > 0) {
      const firstRing = ringVertices[0];
      for (let i = 0; i < firstRing.length; i++) {
        const next = (i + 1) % firstRing.length;
        indices.push(0, firstRing[i], firstRing[next]);
      }
    }

    for (let ring = 0; ring < ringVertices.length - 1; ring++) {
      const current = ringVertices[ring];
      const nextRing = ringVertices[ring + 1];

      for (let i = 0; i < current.length; i++) {
        const ci = current[i];
        const cNext = current[(i + 1) % current.length];
        const ni = nextRing[i % nextRing.length];
        const nNext = nextRing[(i + 1) % nextRing.length];

        indices.push(ci, ni, nNext);
        indices.push(ci, nNext, cNext);
      }
    }

    if (ringVertices.length > 0) {
      const lastRing = ringVertices[ringVertices.length - 1];
      for (let i = 0; i < lastRing.length; i++) {
        const next = (i + 1) % lastRing.length;
        indices.push(lastRing[i], bottomId, lastRing[next]);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.center();

    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= 0.9 + Math.random() * 0.2;
      positions[i + 1] *= 0.9 + Math.random() * 0.2;
      positions[i + 2] *= 0.9 + Math.random() * 0.2;
    }
    geometry.computeVertexNormals();

    return geometry;
  }

  private getOrCreateMaterial(hue: number): THREE.MeshPhysicalMaterial {
    const key = Math.round(hue / 10) * 10;
    if (this.materialCache.has(key.toString())) {
      return this.materialCache.get(key.toString())!;
    }

    const color = new THREE.Color().setHSL(key / 360, 0.7, 0.4);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.3,
      thickness: 0.5,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.materialCache.set(key.toString(), material);
    return material;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.trailSpawnTimer += deltaTime;

    for (const crystal of this.crystals) {
      if (!crystal.isFullyGrown) {
        crystal.growthTime += deltaTime;
        if (crystal.growthTime >= crystal.growthDuration) {
          crystal.growthTime = crystal.growthDuration;
          crystal.isFullyGrown = true;
        }
        const t = crystal.growthTime / crystal.growthDuration;
        const eased = this.easeOutCubic(t);
        crystal.currentSize = 0.1 + (crystal.targetSize - 0.1) * eased;
      }

      crystal.mesh.scale.setScalar(crystal.currentSize);

      crystal.mesh.rotation.x += crystal.angularVelocity.x;
      crystal.mesh.rotation.y += crystal.angularVelocity.y;
      crystal.mesh.rotation.z += crystal.angularVelocity.z;

      const noiseX = Math.sin(elapsedTime * crystal.driftPhase.x + crystal.driftOffset.x) * 0.5
        + Math.sin(elapsedTime * crystal.driftPhase.x * 2.3 + crystal.driftOffset.z) * 0.25;
      const noiseY = Math.sin(elapsedTime * crystal.driftPhase.y + crystal.driftOffset.y) * 0.5
        + Math.cos(elapsedTime * crystal.driftPhase.y * 1.7 + crystal.driftOffset.x) * 0.25;
      const noiseZ = Math.cos(elapsedTime * crystal.driftPhase.z + crystal.driftOffset.z) * 0.5
        + Math.sin(elapsedTime * crystal.driftPhase.z * 2.1 + crystal.driftOffset.y) * 0.25;

      crystal.position.x += noiseX * crystal.driftSpeed * deltaTime * 10;
      crystal.position.y += noiseY * crystal.driftSpeed * deltaTime * 10;
      crystal.position.z += noiseZ * crystal.driftSpeed * deltaTime * 10;

      const boundary = SPAWN_RANGE * 1.5;
      if (Math.abs(crystal.position.x) > boundary) {
        crystal.position.x = Math.sign(crystal.position.x) * -boundary * 0.9;
      }
      if (Math.abs(crystal.position.y) > boundary) {
        crystal.position.y = Math.sign(crystal.position.y) * -boundary * 0.9;
      }
      if (Math.abs(crystal.position.z) > boundary) {
        crystal.position.z = Math.sign(crystal.position.z) * -boundary * 0.9;
      }

      crystal.mesh.position.copy(crystal.position);

      if (crystal.clickBoostTime > 0) {
        crystal.clickBoostTime -= deltaTime;
        const mat = crystal.mesh.material as THREE.MeshPhysicalMaterial;
        const boost = Math.max(0, crystal.clickBoostTime / 2);
        mat.emissive = crystal.color.clone().multiplyScalar(boost * 0.8);
        mat.emissiveIntensity = boost;
        if (crystal.clickBoostTime <= 0) {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        }
      }

      this.updateTrail(crystal, deltaTime);
    }

    if (this.trailSpawnTimer >= TRAIL_SPAWN_INTERVAL) {
      this.trailSpawnTimer = 0;
      for (const crystal of this.crystals) {
        if (crystal.isFullyGrown) {
          this.spawnTrailPoint(crystal);
        }
      }
    }
  }

  private spawnTrailPoint(crystal: CrystalData): void {
    const targetCount = TRAIL_COUNT_MIN + Math.floor(Math.random() * (TRAIL_COUNT_MAX - TRAIL_COUNT_MIN + 1));
    if (crystal.trailPoints.length >= targetCount) {
      const oldest = crystal.trailPoints.shift()!;
      crystal.trailGroup.remove(oldest.mesh);
      oldest.mesh.geometry.dispose();
      (oldest.mesh.material as THREE.Material).dispose();
    }

    const compHue = (crystal.hue + 180) % 360;
    const trailColor = new THREE.Color().setHSL(compHue / 360, 0.6, 0.5);

    const geometry = new THREE.SphereGeometry(crystal.currentSize * 0.12, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: trailColor,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(crystal.position);
    crystal.trailGroup.add(mesh);

    crystal.trailPoints.push({
      mesh,
      life: TRAIL_LIFETIME,
      maxLife: TRAIL_LIFETIME
    });
  }

  private updateTrail(crystal: CrystalData, deltaTime: number): void {
    for (let i = crystal.trailPoints.length - 1; i >= 0; i--) {
      const point = crystal.trailPoints[i];
      point.life -= deltaTime;

      if (point.life <= 0) {
        crystal.trailGroup.remove(point.mesh);
        point.mesh.geometry.dispose();
        (point.mesh.material as THREE.Material).dispose();
        crystal.trailPoints.splice(i, 1);
      } else {
        const mat = point.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (point.life / point.maxLife) * 0.8;
        const scale = 0.6 + (point.life / point.maxLife) * 0.4;
        point.mesh.scale.setScalar(scale);
      }
    }
  }

  public getCrystals(): CrystalData[] {
    return this.crystals;
  }

  public boostCrystal(id: number): void {
    const crystal = this.crystals.find(c => c.id === id);
    if (crystal) {
      crystal.clickBoostTime = 2;
    }
  }

  public handleHover(id: number | null): void {
    for (const crystal of this.crystals) {
      const mat = crystal.mesh.material as THREE.MeshPhysicalMaterial;
      if (crystal.id === id) {
        mat.opacity = Math.min(0.85, mat.opacity + 0.05);
      } else if (crystal.clickBoostTime <= 0) {
        mat.opacity = 0.65;
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public resize(crystalCount: number): void {
    for (const crystal of this.crystals) {
      this.scene.remove(crystal.mesh);
      this.scene.remove(crystal.trailGroup);
      crystal.mesh.geometry.dispose();
      (crystal.mesh.material as THREE.Material).dispose();
      for (const tp of crystal.trailPoints) {
        tp.mesh.geometry.dispose();
        (tp.mesh.material as THREE.Material).dispose();
      }
    }
    this.crystals = [];
    this.materialCache.clear();
    this.init(crystalCount);
  }

  public dispose(): void {
    for (const crystal of this.crystals) {
      crystal.mesh.geometry.dispose();
      (crystal.mesh.material as THREE.Material).dispose();
      for (const tp of crystal.trailPoints) {
        tp.mesh.geometry.dispose();
        (tp.mesh.material as THREE.Material).dispose();
      }
    }
    this.materialCache.forEach(mat => mat.dispose());
    this.materialCache.clear();
  }
}
