import * as THREE from 'three';
import { Building } from './city/Building';
import type { BuildingMetadata } from './types';

export class CityBuilder {
  private scene: THREE.Scene;
  private buildings: Building[] = [];
  private ground!: THREE.Mesh;
  private buildingCount: number = 35;
  private cityRadius: number = 80;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build(): {
    buildings: Building[];
    ground: THREE.Mesh;
    buildingMetadatas: BuildingMetadata[];
  } {
    this.createGround();
    this.generateBuildings();

    return {
      buildings: this.buildings,
      ground: this.ground,
      buildingMetadatas: this.buildings.map((b) => b.getMetadata()),
    };
  }

  private createGround(): void {
    const groundSize = 200;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 2;

    const gridSize = 32;
    for (let i = 0; i <= 512; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(groundSize / 10, groundSize / 10);

    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.userData = { isGround: true };

    this.scene.add(this.ground);
  }

  private generateBuildings(): void {
    const gridSize = 12;
    const halfRadius = this.cityRadius / 2;

    const positions: { x: number; z: number }[] = [];

    for (let x = -halfRadius; x <= halfRadius; x += gridSize) {
      for (let z = -halfRadius; z <= halfRadius; z += gridSize) {
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter < this.cityRadius * 0.8) {
          const jitterX = (Math.random() - 0.5) * 3;
          const jitterZ = (Math.random() - 0.5) * 3;
          positions.push({ x: x + jitterX, z: z + jitterZ });
        }
      }
    }

    const shuffled = positions.sort(() => Math.random() - 0.5);
    const selectedPositions = shuffled.slice(0, this.buildingCount);

    selectedPositions.forEach((pos, index) => {
      const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const heightFactor = 1 - distFromCenter / this.cityRadius;

      const minHeight = 10 + heightFactor * 20;
      const maxHeight = 40 + heightFactor * 40;
      const height = minHeight + Math.random() * (maxHeight - minHeight);

      const width = 4 + Math.random() * 8;
      const depth = 4 + Math.random() * 8;

      const building = new Building({
        id: index,
        width,
        depth,
        height,
        position: { x: pos.x, z: pos.z },
      });

      this.buildings.push(building);
      this.scene.add(building.getGroup());
    });
  }

  public getBuildings(): Building[] {
    return this.buildings;
  }

  public getGround(): THREE.Mesh {
    return this.ground;
  }

  public getBuildingMeshes(): THREE.Mesh[] {
    return this.buildings.map((b) => b.getMesh());
  }

  public updateBeaconLights(time: number): void {
    for (const building of this.buildings) {
      building.updateBeaconPulse(time);
    }
  }

  public dispose(): void {
    for (const building of this.buildings) {
      building.dispose();
      this.scene.remove(building.getGroup());
    }
    this.buildings = [];

    if (this.ground) {
      this.ground.geometry.dispose();
      if (this.ground.material instanceof THREE.Material) {
        this.ground.material.dispose();
      }
      this.scene.remove(this.ground);
    }
  }
}
