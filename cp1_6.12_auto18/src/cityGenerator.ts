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

export class CityGenerator {
  private group: THREE.Group;
  private groundGroup: THREE.Group;
  private buildings: BuildingData[] = [];
  private oldGroup: THREE.Group | null = null;
  private newGroup: THREE.Group | null = null;
  private transitioning = false;
  private transitionStart = 0;
  private transitionDuration = 1.0;
  private currentParams: CityParams = { density: 25, heightMin: 5, heightMax: 50, seed: 42 };

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city';
    this.groundGroup = new THREE.Group();
    this.groundGroup.name = 'ground';
    this.createGround();
  }

  private createGround(): void {
    const gridHelper = new THREE.GridHelper(GROUND_SIZE, 40, 0x888888, 0x666666);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    this.groundGroup.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
      metalness: 0.1,
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

  private generateBuildings(params: CityParams): THREE.Group {
    const rng = new SeededRandom(params.seed);
    const buildingsGroup = new THREE.Group();
    buildingsGroup.name = 'buildings';
    this.buildings = [];

    const halfGround = GROUND_SIZE / 2 - 10;
    const spacing = (GROUND_SIZE - 20) / Math.ceil(Math.sqrt(params.density));

    for (let i = 0; i < params.density; i++) {
      const height = rng.range(params.heightMin, params.heightMax);
      const widthX = rng.range(2, spacing * 0.6);
      const widthZ = rng.range(2, spacing * 0.6);

      const col = i % Math.ceil(Math.sqrt(params.density));
      const row = Math.floor(i / Math.ceil(Math.sqrt(params.density)));

      const x = -halfGround + col * spacing + rng.range(0, spacing * 0.3);
      const z = -halfGround + row * spacing + rng.range(0, spacing * 0.3);

      const geo = new THREE.BoxGeometry(widthX, height, widthZ);
      const color = this.getBuildingColor(height);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.2,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, height / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { buildingId: i, buildingHeight: height };

      buildingsGroup.add(mesh);

      this.buildings.push({
        id: i,
        height: Math.round(height * 10) / 10,
        floors: Math.max(1, Math.floor(height / BUILDING_FLOOR_HEIGHT)),
        mesh,
      });

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.06,
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.copy(mesh.position);
      edges.name = `edges-${i}`;
      buildingsGroup.add(edges);
    }

    return buildingsGroup;
  }

  generate(params: CityParams): THREE.Group {
    this.currentParams = params;
    this.group.clear();

    const buildingsGroup = this.generateBuildings(params);
    this.group.add(buildingsGroup);
    this.group.add(this.groundGroup);

    return this.group;
  }

  update(params: CityParams, transitionDuration = 1.0): void {
    this.currentParams = params;

    if (this.transitioning) {
      if (this.oldGroup) {
        this.group.remove(this.oldGroup);
      }
      if (this.newGroup) {
        this.setGroupOpacity(this.newGroup, 1);
      }
      this.transitioning = false;
    }

    const currentBuildings = this.group.children.find(c => c.name === 'buildings') as THREE.Group | undefined;
    if (currentBuildings) {
      this.oldGroup = currentBuildings;
    }

    this.newGroup = this.generateBuildings(params);
    this.setGroupOpacity(this.newGroup, 0);
    this.group.add(this.newGroup);

    this.transitioning = true;
    this.transitionStart = performance.now();
    this.transitionDuration = transitionDuration;
  }

  updateTransition(now: number): boolean {
    if (!this.transitioning) return false;

    const elapsed = (now - this.transitionStart) / 1000;
    const t = Math.min(1, elapsed / this.transitionDuration);

    const halfT = 0.5;
    if (t < halfT) {
      const fadeOut = 1 - (t / halfT);
      if (this.oldGroup) this.setGroupOpacity(this.oldGroup, fadeOut);
    } else {
      if (this.oldGroup && this.oldGroup.parent) {
        this.group.remove(this.oldGroup);
        this.oldGroup = null;
      }
      const fadeIn = (t - halfT) / halfT;
      if (this.newGroup) this.setGroupOpacity(this.newGroup, fadeIn);
    }

    if (t >= 1) {
      if (this.oldGroup && this.oldGroup.parent) {
        this.group.remove(this.oldGroup);
      }
      if (this.newGroup) {
        this.setGroupOpacity(this.newGroup, 1);
      }
      this.transitioning = false;
      this.oldGroup = null;
      this.newGroup = null;
    }

    return this.transitioning;
  }

  private setGroupOpacity(group: THREE.Group, opacity: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        const mat = child.material as THREE.Material;
        mat.transparent = true;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }

  getBuildingById(id: number): BuildingData | null {
    return this.buildings.find(b => b.id === id) || null;
  }

  getAllBuildings(): BuildingData[] {
    return this.buildings;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }
}
