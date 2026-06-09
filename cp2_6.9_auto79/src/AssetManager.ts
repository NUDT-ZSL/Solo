import * as THREE from 'three';

export interface GardenAssets {
  canopyMaterials: THREE.MeshStandardMaterial[];
  grassMaterial: THREE.MeshStandardMaterial;
  skyMaterial: THREE.MeshBasicMaterial;
  trunkMaterials: THREE.MeshStandardMaterial[];
  treePositions: THREE.Vector3[];
  canopyHeights: number[];
  pavilionMaterials: THREE.MeshStandardMaterial[];
  pathMaterials: THREE.MeshStandardMaterial[];
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
}

export class AssetManager {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createGarden(): GardenAssets {
    const canopyMaterials: THREE.MeshStandardMaterial[] = [];
    const trunkMaterials: THREE.MeshStandardMaterial[] = [];
    const treePositions: THREE.Vector3[] = [];
    const canopyHeights: number[] = [];
    const pavilionMaterials: THREE.MeshStandardMaterial[] = [];
    const pathMaterials: THREE.MeshStandardMaterial[] = [];

    const grassMaterial = this.createGrass();

    this.createPath(pathMaterials);

    this.createPavilion(pavilionMaterials);

    const treeConfigs = [
      { pos: new THREE.Vector3(-8, 0, -5), scale: 1.0 },
      { pos: new THREE.Vector3(10, 0, -3), scale: 1.2 },
      { pos: new THREE.Vector3(2, 0, 12), scale: 0.9 },
    ];

    treeConfigs.forEach((config) => {
      const { canopyMat, trunkMat, canopyHeight } = this.createTree(
        config.pos,
        config.scale
      );
      canopyMaterials.push(canopyMat);
      trunkMaterials.push(trunkMat);
      treePositions.push(config.pos.clone());
      canopyHeights.push(canopyHeight);
    });

    const skyMaterial = this.createSky();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfffacd, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);

    return {
      canopyMaterials,
      grassMaterial,
      skyMaterial,
      trunkMaterials,
      treePositions,
      canopyHeights,
      pavilionMaterials,
      pathMaterials,
      ambientLight,
      directionalLight,
    };
  }

  private createGrass(): THREE.MeshStandardMaterial {
    const geometry = new THREE.PlaneGeometry(500, 500, 50, 50);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7cfc00,
      side: THREE.DoubleSide,
    });
    const grass = new THREE.Mesh(geometry, material);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.01;
    grass.receiveShadow = true;
    this.scene.add(grass);
    return material;
  }

  private createPath(materials: THREE.MeshStandardMaterial[]): void {
    const pathPoints: THREE.Vector3[] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = -15 + t * 30;
      const z = Math.sin(t * Math.PI * 1.2) * 6;
      pathPoints.push(new THREE.Vector3(x, 0.01, z));
    }

    for (let i = 0; i < segments; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const length = dir.length();
      const angle = Math.atan2(dir.z, dir.x);

      const geometry = new THREE.PlaneGeometry(length + 0.3, 1.8);
      const material = new THREE.MeshStandardMaterial({
        color: 0xa0a0a0,
        side: THREE.DoubleSide,
        roughness: 0.9,
      });
      materials.push(material);

      const slab = new THREE.Mesh(geometry, material);
      slab.rotation.x = -Math.PI / 2;
      slab.rotation.z = -angle;
      slab.position.copy(mid);
      slab.receiveShadow = true;
      this.scene.add(slab);
    }
  }

  private createPavilion(materials: THREE.MeshStandardMaterial[]): void {
    const group = new THREE.Group();
    const centerX = 0;
    const centerZ = 0;
    const baseY = 0;

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
    });
    materials.push(woodMaterial);

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.8,
    });
    materials.push(roofMaterial);

    const pillarCount = 6;
    const radius = 3;
    const pillarHeight = 3.5;
    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, pillarHeight, 12);

    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const px = centerX + Math.cos(angle) * radius;
      const pz = centerZ + Math.sin(angle) * radius;
      const pillar = new THREE.Mesh(pillarGeo, woodMaterial);
      pillar.position.set(px, baseY + pillarHeight / 2, pz);
      pillar.castShadow = true;
      group.add(pillar);
    }

    const roofHeight = 2.5;
    const roofGeo = new THREE.ConeGeometry(radius * 1.3, roofHeight, 6);
    const roof = new THREE.Mesh(roofGeo, roofMaterial);
    roof.position.set(centerX, baseY + pillarHeight + roofHeight / 2, centerZ);
    roof.castShadow = true;
    group.add(roof);

    const floorGeo = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, 0.2, 6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
    });
    materials.push(floorMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(centerX, baseY + 0.1, centerZ);
    floor.receiveShadow = true;
    group.add(floor);

    this.scene.add(group);
  }

  private createTree(
    position: THREE.Vector3,
    scale: number
  ): {
    canopyMat: THREE.MeshStandardMaterial;
    trunkMat: THREE.MeshStandardMaterial;
    canopyHeight: number;
  } {
    const group = new THREE.Group();

    const trunkHeight = 4 * scale;
    const trunkRadius = 0.3 * scale;
    const trunkGeo = new THREE.CylinderGeometry(
      trunkRadius * 0.8,
      trunkRadius,
      trunkHeight,
      12
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const canopyRadius = 2.5 * scale;
    const canopyGeo = new THREE.SphereGeometry(canopyRadius, 16, 12);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      roughness: 0.8,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = trunkHeight + canopyRadius * 0.7;
    canopy.castShadow = true;
    group.add(canopy);

    const canopyGeo2 = new THREE.SphereGeometry(canopyRadius * 0.7, 12, 10);
    const canopy2 = new THREE.Mesh(canopyGeo2, canopyMat);
    canopy2.position.set(
      canopyRadius * 0.5,
      trunkHeight + canopyRadius * 1.0,
      canopyRadius * 0.3
    );
    canopy2.castShadow = true;
    group.add(canopy2);

    const canopyGeo3 = new THREE.SphereGeometry(canopyRadius * 0.6, 12, 10);
    const canopy3 = new THREE.Mesh(canopyGeo3, canopyMat);
    canopy3.position.set(
      -canopyRadius * 0.4,
      trunkHeight + canopyRadius * 0.9,
      -canopyRadius * 0.2
    );
    canopy3.castShadow = true;
    group.add(canopy3);

    group.position.copy(position);
    this.scene.add(group);

    return {
      canopyMat,
      trunkMat,
      canopyHeight: position.y + trunkHeight + canopyRadius * 0.7,
    };
  }

  private createSky(): THREE.MeshBasicMaterial {
    const skyGeo = new THREE.SphereGeometry(300, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
    return skyMat;
  }
}
