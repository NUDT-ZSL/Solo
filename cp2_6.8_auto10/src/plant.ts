import * as THREE from 'three';

export enum GrowthStage {
  SEED = 0,
  SPROUT = 1,
  BRANCHING = 2,
  LEAFY = 3,
  FLOWERING = 4
}

export interface EnvironmentParams {
  light: number;
  water: number;
  temperature: number;
}

export type GrowthSpeed = 'slow' | 'normal' | 'fast';

const SPEED_MAP: Record<GrowthSpeed, number> = {
  slow: 0.03,
  normal: 0.08,
  fast: 0.2
};

export class Plant {
  private group: THREE.Group;
  public growthProgress: number;
  public currentStage: GrowthStage;
  public environment: EnvironmentParams;
  private morphTargets: { mesh: THREE.Mesh; targetScale: THREE.Vector3; targetPosition: THREE.Vector3 }[];

  constructor() {
    this.group = new THREE.Group();
    this.growthProgress = 0;
    this.currentStage = GrowthStage.SEED;
    this.environment = { light: 60, water: 60, temperature: 50 };
    this.morphTargets = [];
    this.rebuild();
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  setEnvironment(params: EnvironmentParams): void {
    this.environment = { ...params };
    this.rebuild();
  }

  update(dt: number, speed: GrowthSpeed): void {
    const baseSpeed = SPEED_MAP[speed];
    const tempBoost = 1 + (this.environment.temperature - 50) / 100;
    const effectiveSpeed = baseSpeed * Math.max(0.5, tempBoost);
    this.growthProgress = Math.min(1, this.growthProgress + effectiveSpeed * dt);
    
    const stageThresholds = [0.2, 0.4, 0.6, 0.8, 1.0];
    let newStage = GrowthStage.SEED;
    for (let i = 0; i < stageThresholds.length; i++) {
      if (this.growthProgress <= stageThresholds[i]) {
        newStage = i as GrowthStage;
        break;
      }
    }
    
    const tempAdjustedStage = Math.min(
      GrowthStage.FLOWERING,
      newStage + Math.floor((this.environment.temperature - 50) / 25)
    );
    
    if (tempAdjustedStage !== this.currentStage && this.growthProgress >= (tempAdjustedStage + 1) * 0.2 - 0.01) {
      this.currentStage = tempAdjustedStage;
      this.rebuild();
    } else if (newStage !== this.currentStage) {
      this.currentStage = newStage;
      this.rebuild();
    }
    
    this.morphAnimation(dt);
  }

  reset(): void {
    this.growthProgress = 0;
    this.currentStage = GrowthStage.SEED;
    this.rebuild();
  }

  rebuild(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.morphTargets = [];
    
    this.createSoil();
    
    if (this.currentStage === GrowthStage.SEED) {
      this.createSeed();
    }
    
    if (this.currentStage >= GrowthStage.SPROUT) {
      this.createStem();
    }
    
    if (this.currentStage >= GrowthStage.BRANCHING) {
      this.createBranches();
    }
    
    if (this.currentStage >= GrowthStage.LEAFY) {
      this.createLeaves();
    }
    
    if (this.currentStage >= GrowthStage.FLOWERING) {
      this.createFlowers();
      this.createFruits();
    }
  }

  private createSoil(): void {
    const soilGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.3, 32);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.9,
      metalness: 0.05
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = -0.15;
    this.group.add(soil);
    this.morphTargets.push({
      mesh: soil,
      targetScale: new THREE.Vector3(1, 1, 1),
      targetPosition: soil.position.clone()
    });
  }

  private createSeed(): void {
    const seedGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const seedMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c0a,
      roughness: 0.7,
      metalness: 0.05
    });
    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.y = 0.08;
    seed.scale.setScalar(0.01);
    this.group.add(seed);
    this.morphTargets.push({
      mesh: seed,
      targetScale: new THREE.Vector3(1, 1, 1),
      targetPosition: seed.position.clone()
    });
  }

  private createStem(): void {
    const maxHeight = 3.5 * (this.environment.water / 100);
    const stageProgress = (this.growthProgress - 0.2) / 0.8;
    const height = maxHeight * Math.max(0.01, stageProgress);
    
    const lightFactor = this.environment.light / 100;
    const stemColor = new THREE.Color().setHSL(0.28, 0.6, 0.25 + lightFactor * 0.15);
    
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, height, 16);
    const stemMat = new THREE.MeshStandardMaterial({
      color: stemColor,
      roughness: 0.7,
      metalness: 0.05
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = height / 2;
    stem.scale.set(0.01, 0.01, 0.01);
    this.group.add(stem);
    this.morphTargets.push({
      mesh: stem,
      targetScale: new THREE.Vector3(1, 1, 1),
      targetPosition: stem.position.clone()
    });
  }

  private createBranches(): void {
    const maxHeight = 3.5 * (this.environment.water / 100);
    const stageProgress = (this.growthProgress - 0.4) / 0.6;
    const numBranches = 2 + Math.floor(stageProgress * 2);
    const lightFactor = this.environment.light / 100;
    const branchColor = new THREE.Color().setHSL(0.28, 0.55, 0.28 + lightFactor * 0.12);
    
    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + Math.random() * 0.3;
      const heightRatio = 0.3 + (i / numBranches) * 0.5;
      const branchLength = 0.6 + Math.random() * 0.6;
      
      const branchGeo = new THREE.CylinderGeometry(0.03, 0.05, branchLength, 8);
      const branchMat = new THREE.MeshStandardMaterial({
        color: branchColor,
        roughness: 0.7,
        metalness: 0.05
      });
      const branch = new THREE.Mesh(branchGeo, branchMat);
      
      const startY = maxHeight * heightRatio;
      const endX = Math.cos(angle) * branchLength * 0.8;
      const endZ = Math.sin(angle) * branchLength * 0.8;
      
      branch.position.set(endX / 2, startY + branchLength * 0.3, endZ / 2);
      branch.rotation.z = -Math.PI / 4 * Math.cos(angle);
      branch.rotation.x = Math.PI / 4 * Math.sin(angle);
      branch.scale.set(0.01, 0.01, 0.01);
      
      this.group.add(branch);
      this.morphTargets.push({
        mesh: branch,
        targetScale: new THREE.Vector3(1, 1, 1),
        targetPosition: branch.position.clone()
      });
    }
  }

  private createLeaves(): void {
    const maxHeight = 3.5 * (this.environment.water / 100);
    const stageProgress = (this.growthProgress - 0.6) / 0.4;
    const waterFactor = this.environment.water / 100;
    const lightFactor = this.environment.light / 100;
    const maxLeaves = Math.floor(4 + waterFactor * 8);
    const numLeaves = Math.floor(2 + stageProgress * maxLeaves);
    
    const darkGreen = new THREE.Color(0x2e7d32);
    const lightGreen = new THREE.Color(0xaed581);
    const leafColor = darkGreen.clone().lerp(lightGreen, lightFactor);
    
    for (let i = 0; i < numLeaves; i++) {
      const angle = (i / numLeaves) * Math.PI * 2 + i * 0.5;
      const heightRatio = 0.2 + (i / numLeaves) * 0.7;
      const leafSize = 0.15 + Math.random() * 0.1;
      
      const leafGeo = new THREE.SphereGeometry(leafSize, 12, 8);
      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.7,
        metalness: 0.05
      });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(1.5, 0.3, 1);
      
      const radius = 0.4 + Math.random() * 0.4;
      leaf.position.set(
        Math.cos(angle) * radius,
        maxHeight * heightRatio,
        Math.sin(angle) * radius
      );
      leaf.rotation.set(
        Math.random() * 0.5 - 0.25,
        angle,
        Math.random() * 0.5 - 0.25
      );
      leaf.scale.multiplyScalar(0.01);
      
      this.group.add(leaf);
      this.morphTargets.push({
        mesh: leaf,
        targetScale: new THREE.Vector3(1.5, 0.3, 1),
        targetPosition: leaf.position.clone()
      });
    }
  }

  private createFlowers(): void {
    const maxHeight = 3.5 * (this.environment.water / 100);
    const stageProgress = (this.growthProgress - 0.8) / 0.2;
    const tempFactor = this.environment.temperature / 100;
    const numFlowers = Math.floor(1 + stageProgress * (2 + tempFactor * 3));
    
    const pinkColors = [
      new THREE.Color(0xff9999),
      new THREE.Color(0xff6b9d),
      new THREE.Color(0xff4081),
      new THREE.Color(0xf06292)
    ];
    
    for (let i = 0; i < numFlowers; i++) {
      const flowerGroup = new THREE.Group();
      const angle = (i / numFlowers) * Math.PI * 2 + i * 0.7;
      const heightRatio = 0.7 + (i / numFlowers) * 0.3;
      
      const petalColor = pinkColors[i % pinkColors.length];
      const petalGeo = new THREE.SphereGeometry(0.12, 12, 8);
      const petalMat = new THREE.MeshStandardMaterial({
        color: petalColor,
        roughness: 0.7,
        metalness: 0.05
      });
      
      const numPetals = 5 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numPetals; j++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        const petalAngle = (j / numPetals) * Math.PI * 2;
        petal.position.set(
          Math.cos(petalAngle) * 0.1,
          0,
          Math.sin(petalAngle) * 0.1
        );
        petal.scale.set(0.8, 0.4, 0.8);
        flowerGroup.add(petal);
      }
      
      const centerGeo = new THREE.ConeGeometry(0.06, 0.15, 8);
      const centerMat = new THREE.MeshStandardMaterial({
        color: 0xffd54f,
        roughness: 0.7,
        metalness: 0.05
      });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = 0.05;
      flowerGroup.add(center);
      
      const radius = 0.5 + Math.random() * 0.3;
      flowerGroup.position.set(
        Math.cos(angle) * radius,
        maxHeight * heightRatio,
        Math.sin(angle) * radius
      );
      flowerGroup.scale.setScalar(0.01);
      
      this.group.add(flowerGroup);
      
      flowerGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          this.morphTargets.push({
            mesh: child,
            targetScale: child.scale.clone(),
            targetPosition: child.position.clone()
          });
        }
      });
      
      const targetScale = new THREE.Vector3(1, 1, 1);
      const targetPosition = flowerGroup.position.clone();
      flowerGroup.scale.setScalar(0.01);
      this.morphTargets.push({
        mesh: flowerGroup as unknown as THREE.Mesh,
        targetScale,
        targetPosition
      });
    }
  }

  private createFruits(): void {
    const maxHeight = 3.5 * (this.environment.water / 100);
    const stageProgress = (this.growthProgress - 0.9) / 0.1;
    const numFruits = Math.floor(stageProgress * (3 + Math.random() * 3));
    
    const fruitGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const fruitMat = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      roughness: 0.7,
      metalness: 0.05
    });
    
    for (let i = 0; i < numFruits; i++) {
      const fruit = new THREE.Mesh(fruitGeo, fruitMat);
      const angle = (i / Math.max(1, numFruits)) * Math.PI * 2 + Math.random() * 0.5;
      const heightRatio = 0.5 + (i / Math.max(1, numFruits)) * 0.4;
      const radius = 0.4 + Math.random() * 0.3;
      
      fruit.position.set(
        Math.cos(angle) * radius,
        maxHeight * heightRatio,
        Math.sin(angle) * radius
      );
      fruit.scale.setScalar(0.01);
      
      this.group.add(fruit);
      this.morphTargets.push({
        mesh: fruit,
        targetScale: new THREE.Vector3(1, 1, 1),
        targetPosition: fruit.position.clone()
      });
    }
  }

  morphAnimation(dt: number): void {
    const morphSpeed = 2.5;
    for (const target of this.morphTargets) {
      const mesh = target.mesh;
      
      mesh.scale.lerp(target.targetScale, Math.min(1, dt * morphSpeed));
      
      mesh.position.lerp(target.targetPosition, Math.min(1, dt * morphSpeed));
    }
  }
}
