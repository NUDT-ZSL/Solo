import * as THREE from 'three';

export interface BuildingData {
  id: number;
  name: string;
  width: number;
  height: number;
  depth: number;
  position: THREE.Vector3;
  rotationY: number;
  color: number;
}

export interface BuildingObject {
  data: BuildingData;
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  materials: THREE.MeshStandardMaterial[];
  faces: { normal: THREE.Vector3; material: THREE.MeshStandardMaterial }[];
}

export type DisplayMode = 'shadow' | 'radiation';

export class BuildingSystem {
  private scene: THREE.Scene;
  private buildings: BuildingObject[] = [];
  private selectedBuilding: BuildingObject | null = null;
  private displayMode: DisplayMode = 'radiation';
  private sunDirection: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  private readonly coldColor = new THREE.Color(0x0000ff);
  private readonly midColor = new THREE.Color(0x00ffff);
  private readonly warmColor = new THREE.Color(0xff4500);
  private readonly baseColor = new THREE.Color(0xcccccc);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createBuildings(): void {
    const buildingConfigs: BuildingData[] = [
      {
        id: 1, name: '中央主楼',
        width: 3, height: 12, depth: 3,
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        color: 0xA0AEC0
      },
      {
        id: 2, name: '北侧楼',
        width: 2.5, height: 6, depth: 2.5,
        position: new THREE.Vector3(0, 0, -8),
        rotationY: 0,
        color: 0xCBD5E0
      },
      {
        id: 3, name: '南侧楼',
        width: 2.5, height: 6, depth: 2.5,
        position: new THREE.Vector3(0, 0, 8),
        rotationY: 0,
        color: 0xCBD5E0
      },
      {
        id: 4, name: '东侧楼',
        width: 2.5, height: 6, depth: 2.5,
        position: new THREE.Vector3(8, 0, 0),
        rotationY: 0,
        color: 0xCBD5E0
      },
      {
        id: 5, name: '西侧楼',
        width: 2.5, height: 6, depth: 2.5,
        position: new THREE.Vector3(-8, 0, 0),
        rotationY: 0,
        color: 0xCBD5E0
      }
    ];

    buildingConfigs.forEach((config) => this.createBuilding(config));
  }

  private createBuilding(data: BuildingData): void {
    const group = new THREE.Group();
    group.position.copy(data.position);
    group.position.y = data.height / 2;
    group.rotation.y = data.rotationY;
    group.userData.buildingId = data.id;

    const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);

    const materials: THREE.MeshStandardMaterial[] = [];
    const faces: { normal: THREE.Vector3; material: THREE.MeshStandardMaterial }[] = [];

    const faceNormals = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1)
    ];

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(data.color),
        roughness: 0.7,
        metalness: 0.1
      });
      materials.push(mat);
      faces.push({ normal: faceNormals[i], material: mat });
    }

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.buildingId = data.id;
    group.add(mesh);

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 1
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    group.add(edges);

    this.scene.add(group);

    this.buildings.push({ data, group, mesh, edges, materials, faces });
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction).normalize();
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.updateAllMaterials();
  }

  public getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  public updateRadiationColors(): void {
    if (this.displayMode !== 'radiation') return;

    this.buildings.forEach((building) => {
      building.faces.forEach((face) => {
        const worldNormal = face.normal.clone();
        worldNormal.applyAxisAngle(new THREE.Vector3(0, 1, 0), building.data.rotationY);
        worldNormal.normalize();

        let intensity = worldNormal.dot(this.sunDirection);
        intensity = Math.max(0, intensity);

        const color = this.getRadiationColor(intensity);
        face.material.color.copy(color);
      });
    });
  }

  public updateForShadowMode(): void {
    if (this.displayMode !== 'shadow') return;

    this.buildings.forEach((building) => {
      const color = new THREE.Color(building.data.color);
      building.materials.forEach((mat) => {
        mat.color.copy(color);
      });
    });
  }

  private updateAllMaterials(): void {
    if (this.displayMode === 'radiation') {
      this.updateRadiationColors();
    } else {
      this.updateForShadowMode();
    }
  }

  private getRadiationColor(intensity: number): THREE.Color {
    if (intensity <= 0.5) {
      const t = intensity / 0.5;
      return this.coldColor.clone().lerp(this.midColor, t);
    } else {
      const t = (intensity - 0.5) / 0.5;
      return this.midColor.clone().lerp(this.warmColor, t);
    }
  }

  public getBuildings(): BuildingObject[] {
    return this.buildings;
  }

  public getBuildingMeshes(): THREE.Mesh[] {
    return this.buildings.map((b) => b.mesh);
  }

  public selectBuilding(mesh: THREE.Mesh | null): void {
    if (this.selectedBuilding) {
      (this.selectedBuilding.edges.material as THREE.LineBasicMaterial).opacity = 0;
    }

    if (mesh) {
      const buildingId = mesh.userData.buildingId;
      const building = this.buildings.find((b) => b.data.id === buildingId);
      if (building) {
        this.selectedBuilding = building;
        (building.edges.material as THREE.LineBasicMaterial).opacity = 1;
      } else {
        this.selectedBuilding = null;
      }
    } else {
      this.selectedBuilding = null;
    }
  }

  public getSelectedBuilding(): BuildingObject | null {
    return this.selectedBuilding;
  }

  public getSelectedBuildingInfo(): { dimensions: string; orientation: string } | null {
    if (!this.selectedBuilding) return null;
    const d = this.selectedBuilding.data;
    const orientationDeg = ((d.rotationY * 180) / Math.PI).toFixed(0);
    return {
      dimensions: `${d.width} × ${d.height} × ${d.depth}`,
      orientation: `${orientationDeg}°`
    };
  }
}
