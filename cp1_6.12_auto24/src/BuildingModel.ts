import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export interface BuildingBlock {
  id: string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
}

export interface BuildingConfig {
  blocks: BuildingBlock[];
}

const DEFAULT_BUILDING_CONFIG: BuildingConfig = {
  blocks: [
    { id: uuidv4(), width: 20, height: 15, depth: 20, x: -10, y: 7.5, z: -10 },
    { id: uuidv4(), width: 20, height: 25, depth: 15, x: -10, y: 12.5, z: 7.5 },
    { id: uuidv4(), width: 15, height: 20, depth: 20, x: 12.5, y: 10, z: -7.5 },
    { id: uuidv4(), width: 10, height: 30, depth: 10, x: -5, y: 15, z: 0 },
    { id: uuidv4(), width: 8, height: 18, depth: 8, x: 8, y: 9, z: 8 },
    { id: uuidv4(), width: 12, height: 12, depth: 12, x: 5, y: 6, z: -12 },
  ],
};

export class BuildingModel {
  public group: THREE.Group;
  private blocks: BuildingBlock[];
  private meshes: THREE.Mesh[] = [];
  private targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private currentRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  constructor(config: BuildingConfig = DEFAULT_BUILDING_CONFIG) {
    this.blocks = config.blocks;
    this.group = new THREE.Group();
    this.createBuilding();
    this.centerPivot();
  }

  private createBuilding(): void {
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.blocks.forEach((block) => {
      const geometry = new THREE.BoxGeometry(block.width, block.height, block.depth);
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.set(block.x, block.y, block.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.meshes.push(mesh);
      this.group.add(mesh);
    });
  }

  private centerPivot(): void {
    const box = new THREE.Box3().setFromObject(this.group);
    const center = box.getCenter(new THREE.Vector3());

    this.group.position.sub(center);
    this.group.position.y = box.min.y * -1;
  }

  public setRotation(x: number, y: number, z: number): void {
    this.targetRotation.set(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z)
    );
  }

  public update(deltaTime: number): void {
    const lerpFactor = 1 - Math.exp(-deltaTime * 10);

    this.currentRotation.x = THREE.MathUtils.lerp(
      this.currentRotation.x,
      this.targetRotation.x,
      lerpFactor
    );
    this.currentRotation.y = THREE.MathUtils.lerp(
      this.currentRotation.y,
      this.targetRotation.y,
      lerpFactor
    );
    this.currentRotation.z = THREE.MathUtils.lerp(
      this.currentRotation.z,
      this.targetRotation.z,
      lerpFactor
    );

    this.group.rotation.copy(this.currentRotation);
  }

  public getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  public getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.group);
  }

  public dispose(): void {
    this.meshes.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
          mesh.material.dispose();
      }
    });
    this.meshes = [];
  }
}
