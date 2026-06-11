import * as THREE from 'three';

export interface CityParams {
  density: number;
  heightMin: number;
  heightMax: number;
  seed: number;
}

export interface BuildingData {
  id: number;
  height: number;
  floors: number;
  mesh: THREE.Mesh;
  instancedMesh: THREE.InstancedMesh;
  instanceId: number;
  position: THREE.Vector3;
  size: THREE.Vector3;
  color: THREE.Color;
}

class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

const COLOR_LOW = new THREE.Color(0x90ee90);
const COLOR_HIGH = new THREE.Color(0xc0c0c0);
const GROUND_SIZE = 200;
const BUILDING_FLOOR_HEIGHT = 4;

interface BuildingBatch {
  group: THREE.Group;
  buildings: BuildingData[];
  mesh: THREE.InstancedMesh;
  edges: THREE.LineSegments;
  opacity: number;
  disposed: boolean;
}

export class CityGenerator {
  private group: THREE.Group;
  private groundGroup: THREE.Group;
  private currentBatch: BuildingBatch | null = null;
  private oldBatch: BuildingBatch | null = null;
  private newBatch: BuildingBatch | null = null;
  private transitioning = false;
  private transitionStart = 0;
  private transitionDuration = 1.0;
  private _dummy = new THREE.Object3D();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city';
    this.groundGroup = new THREE.Group();
    this.groundGroup.name = 'ground';
    this.createGround();
    this.group.add(this.groundGroup);
  }

  private createGround(): void {
    const gridHelper = new THREE.GridHelper(GROUND_SIZE, 40, 0x555566, 0x444455);
    gridHelper.position.y = 0.01;
    this.groundGroup.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e2230,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'groundPlane';
    this.groundGroup.add(ground);
  }

  private getBuildingColor(height: number): THREE.Color {
    const t = Math.min(1, Math.max(0, height / 80));
    return new THREE.Color().lerpColors(COLOR_LOW, COLOR_HIGH, t);
  }

  private buildBatch(params: CityParams): BuildingBatch {
    const rng = new SeededRandom(params.seed);
    const batchGroup = new THREE.Group();
    batchGroup.name = 'buildingsBatch';

    const count = params.density;
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);
    const instancedMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.25,
      transparent: true,
      opacity: 1,
      vertexColors: false,
    });

    const instancedMesh = new THREE.InstancedMesh(baseGeo, instancedMat, count);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    if (instancedMesh.instanceColor == null) {
      instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    }

    const buildings: BuildingData[] = [];
    const halfGround = GROUND_SIZE / 2 - 10;
    const gridCols = Math.ceil(Math.sqrt(count));
    const spacing = (GROUND_SIZE - 20) / gridCols;

    for (let i = 0; i < count; i++) {
      const height = rng.range(params.heightMin, params.heightMax);
      const widthX = rng.range(2.5, spacing * 0.6);
      const widthZ = rng.range(2.5, spacing * 0.6);

      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const x = -halfGround + col * spacing + spacing * 0.2 + rng.range(0, spacing * 0.3);
      const z = -halfGround + row * spacing + spacing * 0.2 + rng.range(0, spacing * 0.3);

      this._dummy.position.set(x, height / 2, z);
      this._dummy.scale.set(widthX, height, widthZ);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, this._dummy.matrix);

      const color = this.getBuildingColor(height);
      instancedMesh.setColorAt(i, color);

      const proxyGeo = new THREE.BoxGeometry(widthX, height, widthZ);
      const proxyMat = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0,
      });
      const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
      proxyMesh.position.set(x, height / 2, z);
      proxyMesh.visible = true;
      proxyMesh.name = `buildingProxy-${i}`;

      const data: BuildingData = {
        id: i,
        height: Math.round(height * 10) / 10,
        floors: Math.max(1, Math.floor(height / BUILDING_FLOOR_HEIGHT)),
        mesh: proxyMesh,
        instancedMesh: instancedMesh,
        instanceId: i,
        position: new THREE.Vector3(x, height / 2, z),
        size: new THREE.Vector3(widthX, height, widthZ),
        color: color,
      };

      proxyMesh.userData = {
        buildingData: data,
        isBuildingProxy: true,
      };

      buildings.push(data);
      batchGroup.add(proxyMesh);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    batchGroup.add(instancedMesh);

    const edgesGeo = new THREE.EdgesGeometry(baseGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x8899bb,
      transparent: true,
      opacity: 0.1,
    });
    const edgesSegments = new THREE.LineSegments(edgesGeo, edgesMat);
    batchGroup.add(edgesSegments);

    return {
      group: batchGroup,
      buildings,
      mesh: instancedMesh,
      edges: edgesSegments,
      opacity: 1,
      disposed: false,
    };
  }

  private setBatchOpacity(batch: BuildingBatch, opacity: number): void {
    if (batch.disposed) return;
    batch.opacity = opacity;

    const m = batch.mesh.material as THREE.MeshStandardMaterial;
    m.opacity = opacity;
    m.transparent = opacity < 1;
    m.needsUpdate = true;

    (batch.edges.material as THREE.LineBasicMaterial).opacity = opacity * 0.1;

    for (const b of batch.buildings) {
      const pm = b.mesh.material as THREE.MeshStandardMaterial;
      pm.opacity = 0.0001;
    }
  }

  private disposeBatch(batch: BuildingBatch): void {
    if (batch.disposed) return;
    batch.disposed = true;
    if (batch.group.parent) batch.group.parent.remove(batch.group);

    for (const b of batch.buildings) {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
    batch.mesh.geometry.dispose();
    (batch.mesh.material as THREE.Material).dispose();
    batch.edges.geometry.dispose();
    (batch.edges.material as THREE.Material).dispose();
  }

  generate(params: CityParams): THREE.Group {
    if (this.currentBatch) {
      this.disposeBatch(this.currentBatch);
      this.currentBatch = null;
    }
    this.currentBatch = this.buildBatch(params);
    this.setBatchOpacity(this.currentBatch, 1);
    this.group.add(this.currentBatch.group);
    return this.group;
  }

  update(params: CityParams, transitionDuration = 1.0): void {
    if (this.oldBatch) {
      this.disposeBatch(this.oldBatch);
      this.oldBatch = null;
    }
    if (this.newBatch) {
      this.currentBatch = this.newBatch;
      this.setBatchOpacity(this.currentBatch, 1);
      this.newBatch = null;
    }
    this.transitioning = false;

    this.oldBatch = this.currentBatch || null;
    if (this.oldBatch) this.setBatchOpacity(this.oldBatch, 1);

    this.newBatch = this.buildBatch(params);
    this.setBatchOpacity(this.newBatch, 0);
    this.group.add(this.newBatch.group);

    this.transitionDuration = transitionDuration;
    this.transitionStart = performance.now();
    this.transitioning = true;
  }

  updateTransition(now: number): boolean {
    if (!this.transitioning) return false;

    const elapsed = (now - this.transitionStart) / 1000;
    const rawT = Math.min(1, elapsed / this.transitionDuration);
    const t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

    if (this.oldBatch) {
      this.setBatchOpacity(this.oldBatch, 1 - t);
    }
    if (this.newBatch) {
      this.setBatchOpacity(this.newBatch, t);
    }

    if (rawT >= 1) {
      if (this.oldBatch) {
        this.disposeBatch(this.oldBatch);
        this.oldBatch = null;
      }
      if (this.newBatch) {
        this.setBatchOpacity(this.newBatch, 1);
        this.currentBatch = this.newBatch;
        this.newBatch = null;
      }
      this.transitioning = false;
    }

    return this.transitioning;
  }

  getBuildingById(id: number): BuildingData | null {
    const buildings = this.getAllBuildings();
    return buildings.find(b => b.id === id) || null;
  }

  getAllBuildings(): BuildingData[] {
    if (this.transitioning && this.newBatch) {
      return this.newBatch.buildings;
    }
    return this.currentBatch ? this.currentBatch.buildings : [];
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }

  getInstancedMeshes(): THREE.InstancedMesh[] {
    const result: THREE.InstancedMesh[] = [];
    if (this.currentBatch) result.push(this.currentBatch.mesh);
    if (this.newBatch) result.push(this.newBatch.mesh);
    return result;
  }
}
