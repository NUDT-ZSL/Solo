import * as THREE from 'three';

export enum BuildingType {
  LOW_RISE = 'low_rise',
  MID_RISE = 'mid_rise',
  HIGH_RISE = 'high_rise',
}

export interface BuildingConfig {
  type: BuildingType;
  width: number;
  depth: number;
  heightRange: [number, number];
  color: string;
  label: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.LOW_RISE]: {
    type: BuildingType.LOW_RISE,
    width: 1.5,
    depth: 1.5,
    heightRange: [0.8, 1.2],
    color: '#F5E6CC',
    label: '低层住宅',
  },
  [BuildingType.MID_RISE]: {
    type: BuildingType.MID_RISE,
    width: 1.2,
    depth: 1.2,
    heightRange: [2.0, 2.8],
    color: '#B3D4FC',
    label: '中层办公楼',
  },
  [BuildingType.HIGH_RISE]: {
    type: BuildingType.HIGH_RISE,
    width: 1.0,
    depth: 1.0,
    heightRange: [3.5, 5.0],
    color: '#2C3E50',
    label: '高层塔楼',
  },
};

export interface Building {
  id: string;
  type: BuildingType;
  mesh: THREE.Mesh;
  group: THREE.Group;
  gridX: number;
  gridZ: number;
  height: number;
  windows: THREE.Mesh[];
  windowLights: THREE.PointLight[];
  animationProgress: number;
  targetHeight: number;
  isAnimating: boolean;
}

const GRID_MIN = -10;
const GRID_MAX = 9;
const ANIMATION_DURATION = 0.3;

export class BuildingManager {
  private scene: THREE.Scene;
  private buildings: Building[] = [];
  private occupiedCells: Set<string> = new Set();
  private windowGeometry: THREE.PlaneGeometry;
  private onBuildingCountChange?: (count: number) => void;

  public static readonly MAX_BUILDINGS = 200;
  public static readonly GRID_SIZE = 20;

  constructor(scene: THREE.Scene, onBuildingCountChange?: (count: number) => void) {
    this.scene = scene;
    this.onBuildingCountChange = onBuildingCountChange;
    this.windowGeometry = new THREE.PlaneGeometry(0.15, 0.15);
  }

  public getBuildingCount(): number {
    return this.buildings.length;
  }

  public getBuildings(): Building[] {
    return this.buildings;
  }

  public snapToGrid(worldX: number, worldZ: number): { gridX: number; gridZ: number } {
    const gridX = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(worldX)));
    const gridZ = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(worldZ)));
    return { gridX, gridZ };
  }

  public isCellOccupied(gridX: number, gridZ: number): boolean {
    return this.occupiedCells.has(`${gridX},${gridZ}`);
  }

  public canPlaceBuilding(): boolean {
    return this.buildings.length < BuildingManager.MAX_BUILDINGS;
  }

  public placeBuilding(
    type: BuildingType,
    gridX: number,
    gridZ: number
  ): Building | null {
    if (!this.canPlaceBuilding()) return null;
    if (this.isCellOccupied(gridX, gridZ)) return null;

    const config = BUILDING_CONFIGS[type];
    const height = this.randomRange(config.heightRange[0], config.heightRange[1]);

    const geometry = new THREE.BoxGeometry(config.width, height, config.depth);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: 0.7,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(mesh);

    mesh.position.y = height / 2;
    mesh.scale.y = 0.001;

    group.position.set(gridX, 0, gridZ);

    this.scene.add(group);

    const windows = this.createWindows(type, height, mesh);
    const windowLights: THREE.PointLight[] = [];

    windows.forEach((win) => {
      group.add(win);
      const light = new THREE.PointLight(0xffd700, 0, 0.6, 2);
      light.position.copy(win.position);
      light.position.y += 0.05;
      group.add(light);
      windowLights.push(light);
    });

    const building: Building = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      mesh,
      group,
      gridX,
      gridZ,
      height,
      windows,
      windowLights,
      animationProgress: 0,
      targetHeight: height,
      isAnimating: true,
    };

    this.buildings.push(building);
    this.occupiedCells.add(`${gridX},${gridZ}`);

    if (this.onBuildingCountChange) {
      this.onBuildingCountChange(this.buildings.length);
    }

    return building;
  }

  private createWindows(
    type: BuildingType,
    buildingHeight: number,
    buildingMesh: THREE.Mesh
  ): THREE.Mesh[] {
    const windows: THREE.Mesh[] = [];
    const config = BUILDING_CONFIGS[type];
    const baseCount = Math.floor(buildingHeight);
    const extra = Math.random() < 0.5 ? 0 : 1;
    const windowCount = Math.min(3, Math.max(0, baseCount + extra - 1));

    if (windowCount === 0) return windows;

    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });

    const halfWidth = config.width / 2;
    const halfDepth = config.depth / 2;
    const spacing = buildingHeight / (windowCount + 1);

    const faces: Array<{
      normal: THREE.Vector3;
      offset: (i: number) => THREE.Vector3;
      rotY: number;
    }> = [
      {
        normal: new THREE.Vector3(0, 0, 1),
        offset: (i) => new THREE.Vector3(0, spacing * (i + 1) - buildingHeight / 2, halfDepth + 0.001),
        rotY: 0,
      },
      {
        normal: new THREE.Vector3(0, 0, -1),
        offset: (i) => new THREE.Vector3(0, spacing * (i + 1) - buildingHeight / 2, -halfDepth - 0.001),
        rotY: Math.PI,
      },
      {
        normal: new THREE.Vector3(1, 0, 0),
        offset: (i) => new THREE.Vector3(halfWidth + 0.001, spacing * (i + 1) - buildingHeight / 2, 0),
        rotY: Math.PI / 2,
      },
      {
        normal: new THREE.Vector3(-1, 0, 0),
        offset: (i) => new THREE.Vector3(-halfWidth - 0.001, spacing * (i + 1) - buildingHeight / 2, 0),
        rotY: -Math.PI / 2,
      },
    ];

    for (let i = 0; i < windowCount; i++) {
      const face = faces[Math.floor(Math.random() * faces.length)];
      const windowMesh = new THREE.Mesh(this.windowGeometry, windowMaterial.clone());
      windowMesh.position.copy(face.offset(i));
      windowMesh.rotation.y = face.rotY;
      (windowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      windows.push(windowMesh);
    }

    return windows;
  }

  public updateAnimations(deltaTime: number): void {
    this.buildings.forEach((building) => {
      if (!building.isAnimating) return;

      building.animationProgress += deltaTime;
      const t = Math.min(1, building.animationProgress / ANIMATION_DURATION);
      const scale = this.easeOutBounce(t);
      building.mesh.scale.y = Math.max(0.001, scale);
      building.mesh.position.y = (building.targetHeight * scale) / 2;

      building.windows.forEach((win) => {
        const mat = win.material as THREE.MeshBasicMaterial;
        mat.opacity = 0;
      });

      if (t >= 1) {
        building.isAnimating = false;
      }
    });
  }

  public updateWindowVisibility(isNight: boolean, transitionProgress: number): void {
    this.buildings.forEach((building) => {
      if (building.isAnimating) return;

      building.windows.forEach((win) => {
        const mat = win.material as THREE.MeshBasicMaterial;
        mat.opacity = isNight ? transitionProgress : 0;
      });

      building.windowLights.forEach((light) => {
        light.intensity = isNight ? 0.5 * transitionProgress : 0;
      });
    });
  }

  private easeOutBounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  public createPreviewMesh(type: BuildingType): THREE.Mesh {
    const config = BUILDING_CONFIGS[type];
    const height = (config.heightRange[0] + config.heightRange[1]) / 2;
    const geometry = new THREE.BoxGeometry(config.width, height, config.depth);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: 0.5,
      roughness: 0.7,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2;
    return mesh;
  }
}
