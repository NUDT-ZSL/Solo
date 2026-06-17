import * as THREE from 'three';
import { PlantData, apiService } from './apiService';

export class PlantModelManager {
  private plantDataList: PlantData[] = [];
  private modelCache: Map<string, THREE.Group> = new Map();

  async loadPlantData(): Promise<PlantData[]> {
    this.plantDataList = await apiService.getPlants();
    return this.plantDataList;
  }

  getPlantDataList(): PlantData[] {
    return this.plantDataList;
  }

  getPlantDataById(id: string): PlantData | undefined {
    return this.plantDataList.find(p => p.id === id);
  }

  createPlantModel(plantId: string, potColor: string, height: number): THREE.Group | null {
    const plantData = this.getPlantDataById(plantId);
    if (!plantData) return null;

    const cacheKey = `${plantId}_${potColor}`;
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!.clone();
    }

    const group = new THREE.Group();
    const scale = height / 100;

    const pot = this.createPot(potColor);
    pot.position.y = 0;
    group.add(pot);

    const plant = this.createPlantByType(plantData.modelType, plantData.color, scale);
    plant.position.y = 0.5;
    group.add(plant);

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.modelCache.set(cacheKey, group.clone());

    return group;
  }

  private createPot(color: string): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.4, 0.5, 0.8, 16);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.8,
      metalness: 0.2
    });
    const pot = new THREE.Mesh(geometry, material);
    pot.position.y = 0.4;
    return pot;
  }

  private createPlantByType(type: string, color: string, scale: number): THREE.Group {
    const plantGroup = new THREE.Group();

    switch (type) {
      case 'succulent':
        plantGroup.add(this.createSucculent(color));
        break;
      case 'fern':
        plantGroup.add(this.createFern(color));
        break;
      case 'monstera':
        plantGroup.add(this.createMonstera(color));
        break;
      case 'cactus':
        plantGroup.add(this.createCactus(color));
        break;
      case 'rose':
        plantGroup.add(this.createRose(color));
        break;
      case 'lavender':
        plantGroup.add(this.createLavender(color));
        break;
      default:
        plantGroup.add(this.createGenericPlant(color));
    }

    plantGroup.scale.setScalar(scale);
    return plantGroup;
  }

  private createSucculent(color: string): THREE.Group {
    const group = new THREE.Group();
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.9,
      metalness: 0.1
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const leafGeo = new THREE.SphereGeometry(0.25, 8, 6);
      leafGeo.scale(1, 0.6, 1.5);
      const leaf = new THREE.Mesh(leafGeo, leafMaterial);
      leaf.position.set(
        Math.cos(angle) * 0.3,
        0.3 + Math.sin(i * 0.5) * 0.1,
        Math.sin(angle) * 0.3
      );
      leaf.rotation.y = angle;
      leaf.rotation.z = -0.3;
      group.add(leaf);
    }

    const centerGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const center = new THREE.Mesh(centerGeo, leafMaterial);
    center.position.y = 0.5;
    group.add(center);

    return group;
  }

  private createFern(color: string): THREE.Group {
    const group = new THREE.Group();
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const height = 1.5 + Math.random() * 0.5;
      const leafGeo = new THREE.ConeGeometry(0.15, height, 4);
      const leaf = new THREE.Mesh(leafGeo, leafMaterial);
      leaf.position.set(
        Math.cos(angle) * 0.2,
        height / 2,
        Math.sin(angle) * 0.2
      );
      leaf.rotation.x = 0.3;
      leaf.rotation.z = Math.cos(angle) * 0.2;
      group.add(leaf);
    }

    return group;
  }

  private createMonstera(color: string): THREE.Group {
    const group = new THREE.Group();
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.9
    });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.7,
      side: THREE.DoubleSide
    });

    const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 2, 8);
    const stem = new THREE.Mesh(stemGeo, stemMaterial);
    stem.position.y = 1;
    group.add(stem);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const leafGeo = new THREE.CircleGeometry(0.6, 8);
      const positions = leafGeo.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j);
        const y = positions.getY(j);
        if (Math.abs(x) > 0.2 && Math.abs(y) > 0.2) {
          positions.setZ(j, Math.sin(x * 3) * 0.05);
        }
      }
      leafGeo.computeVertexNormals();

      const leaf = new THREE.Mesh(leafGeo, leafMaterial);
      leaf.position.set(
        Math.cos(angle) * 0.4,
        1.5 + i * 0.2,
        Math.sin(angle) * 0.4
      );
      leaf.rotation.y = angle;
      leaf.rotation.z = Math.sin(i) * 0.2;
      leaf.rotation.x = -0.5;
      group.add(leaf);
    }

    return group;
  }

  private createCactus(color: string): THREE.Group {
    const group = new THREE.Group();
    const cactusMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.9
    });

    const mainGeo = new THREE.CylinderGeometry(0.3, 0.35, 2, 12);
    const main = new THREE.Mesh(mainGeo, cactusMaterial);
    main.position.y = 1;
    group.add(main);

    const arm1Geo = new THREE.CylinderGeometry(0.15, 0.18, 0.8, 8);
    const arm1 = new THREE.Mesh(arm1Geo, cactusMaterial);
    arm1.position.set(0.4, 1.2, 0);
    arm1.rotation.z = -0.5;
    group.add(arm1);

    const arm2Geo = new THREE.CylinderGeometry(0.15, 0.18, 0.6, 8);
    const arm2 = new THREE.Mesh(arm2Geo, cactusMaterial);
    arm2.position.set(-0.35, 0.8, 0.2);
    arm2.rotation.z = 0.6;
    arm2.rotation.y = 0.5;
    group.add(arm2);

    const flowerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff69b4,
      roughness: 0.5
    });
    const flowerGeo = new THREE.SphereGeometry(0.12, 8, 6);
    const flower = new THREE.Mesh(flowerGeo, flowerMaterial);
    flower.position.y = 2.1;
    group.add(flower);

    return group;
  }

  private createRose(color: string): THREE.Group {
    const group = new THREE.Group();
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.9
    });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x388e3c,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    const petalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.5
    });

    const stemGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.5, 8);
    const stem = new THREE.Mesh(stemGeo, stemMaterial);
    stem.position.y = 1.25;
    group.add(stem);

    for (let i = 0; i < 3; i++) {
      const leafGeo = new THREE.CircleGeometry(0.25, 6);
      const leaf = new THREE.Mesh(leafGeo, leafMaterial);
      leaf.position.set(
        (i % 2 === 0 ? 1 : -1) * 0.15,
        0.6 + i * 0.5,
        0
      );
      leaf.rotation.y = i * 0.5;
      leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.3;
      group.add(leaf);
    }

    for (let i = 0; i < 5; i++) {
      const petalGeo = new THREE.SphereGeometry(0.25 - i * 0.04, 8, 6);
      petalGeo.scale(1.2, 0.5, 1.2);
      const petal = new THREE.Mesh(petalGeo, petalMaterial);
      petal.position.y = 2.5 + i * 0.08;
      petal.rotation.y = i * 0.6;
      group.add(petal);
    }

    return group;
  }

  private createLavender(color: string): THREE.Group {
    const group = new THREE.Group();
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x558b2f,
      roughness: 0.9
    });
    const flowerMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.7
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 2, 6);
      const stem = new THREE.Mesh(stemGeo, stemMaterial);
      stem.position.set(
        Math.cos(angle) * 0.2,
        1,
        Math.sin(angle) * 0.2
      );
      stem.rotation.x = Math.cos(angle) * 0.1;
      stem.rotation.z = -Math.sin(angle) * 0.1;
      group.add(stem);

      for (let j = 0; j < 5; j++) {
        const flowerGeo = new THREE.SphereGeometry(0.08, 6, 4);
        const flower = new THREE.Mesh(flowerGeo, flowerMaterial);
        flower.position.set(
          Math.cos(angle) * 0.2,
          1.6 + j * 0.15,
          Math.sin(angle) * 0.2
        );
        group.add(flower);
      }
    }

    return group;
  }

  private createGenericPlant(color: string): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.8
    });

    const coneGeo = new THREE.ConeGeometry(0.4, 1.5, 8);
    const cone = new THREE.Mesh(coneGeo, material);
    cone.position.y = 0.75;
    group.add(cone);

    return group;
  }

  createPreviewModel(plantId: string): THREE.Group | null {
    const plantData = this.getPlantDataById(plantId);
    if (!plantData) return null;

    const model = this.createPlantModel(plantId, '#8d6e63', plantData.defaultHeight);
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
    }
    return model;
  }

  dispose(): void {
    this.modelCache.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.modelCache.clear();
  }
}
