import * as THREE from 'three';

export interface IceCrystalConfig {
  baseOpacity: number;
}

export class IceCrystal {
  group: THREE.Group;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  baseHeight: number;
  currentHeight: number;
  targetHeight: number;
  rotationSpeed: number;
  opacity: number;
  isGrowing: boolean;
  growTime: number;
  growDuration: number;
  pulseTime: number;
  pulseDuration: number;
  isPulsing: boolean;
  spotLights: THREE.PointLight[];
  children: IceCrystal[];
  isChild: boolean;

  constructor(position: THREE.Vector3, height: number, config: IceCrystalConfig, isChild = false) {
    this.group = new THREE.Group();
    this.baseHeight = height;
    this.currentHeight = height;
    this.targetHeight = height;
    this.rotationSpeed = 0.3 * (Math.PI / 180);
    this.opacity = config.baseOpacity;
    this.isGrowing = false;
    this.growTime = 0;
    this.growDuration = 1.5;
    this.pulseTime = 0;
    this.pulseDuration = 0.2;
    this.isPulsing = false;
    this.spotLights = [];
    this.children = [];
    this.isChild = isChild;

    const geometry = this.createPrismGeometry(0.3, height, 6);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xB0E0FF,
      transparent: true,
      opacity: this.opacity,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.3,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = height / 2;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    const glowGeometry = new THREE.CylinderGeometry(0.35, 0.5, 0.2, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488FF,
      transparent: true,
      opacity: 0.15 + Math.random() * 0.15
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.y = 0.1;
    this.group.add(this.glowMesh);

    this.addRefractiveSpots();

    this.group.position.copy(position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  createPrismGeometry(radius: number, height: number, segments: number): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    return geometry;
  }

  addRefractiveSpots(): void {
    for (let i = 0; i < 3; i++) {
      const spotLight = new THREE.PointLight(0xFFFFFF, 0.3, 3);
      const angle = (i / 3) * Math.PI * 2;
      const r = 0.15;
      spotLight.position.set(
        Math.cos(angle) * r,
        Math.random() * this.baseHeight,
        Math.sin(angle) * r
      );
      this.mesh.add(spotLight);
      this.spotLights.push(spotLight);
    }
  }

  update(delta: number, time: number, auroraColor: THREE.Color): void {
    this.group.rotation.y += this.rotationSpeed * delta * 60;

    this.spotLights.forEach((spot, i) => {
      spot.position.y = ((time * 0.2 + i * 2) % this.currentHeight);
      spot.color.copy(auroraColor);
      spot.intensity = 0.2 + Math.sin(time * 2 + i) * 0.15;
    });

    const glowMat = this.glowMesh.material as THREE.MeshBasicMaterial;
    glowMat.opacity = 0.1 + Math.sin(time * 1.5 + this.group.position.x) * 0.1 + 0.1;
    glowMat.color.copy(auroraColor).multiplyScalar(0.5).add(new THREE.Color(0x2244AA));

    if (this.isGrowing) {
      this.growTime += delta;
      const progress = Math.min(this.growTime / this.growDuration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      this.currentHeight = this.baseHeight + (this.targetHeight - this.baseHeight) * easeProgress;
      this.updateMeshHeight();
      if (progress >= 1) {
        this.isGrowing = false;
        this.baseHeight = this.targetHeight;
      }
    }

    if (this.isPulsing) {
      this.pulseTime += delta;
      const progress = this.pulseTime / this.pulseDuration;
      if (progress < 0.5) {
        const scale = 1 + progress * 0.3;
        this.mesh.scale.setScalar(scale);
      } else {
        const scale = 1.15 - (progress - 0.5) * 0.3;
        this.mesh.scale.setScalar(scale);
      }
      if (progress >= 1) {
        this.isPulsing = false;
        this.mesh.scale.setScalar(1);
      }
    }

    this.children.forEach(child => child.update(delta, time, auroraColor));
  }

  updateMeshHeight(): void {
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.createPrismGeometry(0.3, this.currentHeight, 6);
    this.mesh.position.y = this.currentHeight / 2;
  }

  triggerGrowth(): void {
    if (this.isGrowing || this.isChild) return;
    this.isGrowing = true;
    this.isPulsing = true;
    this.growTime = 0;
    this.pulseTime = 0;
    this.targetHeight = this.baseHeight * 1.2;

    const childCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < childCount; i++) {
      const angle = (i / childCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 0.5 + Math.random() * 0.5;
      const childPos = new THREE.Vector3(
        this.group.position.x + Math.cos(angle) * distance,
        0,
        this.group.position.z + Math.sin(angle) * distance
      );
      const childHeight = 0.8 + Math.random() * 1.2;
      const child = new IceCrystal(childPos, childHeight, { baseOpacity: this.opacity }, true);
      this.children.push(child);
    }
  }

  getChildCrystals(): IceCrystal[] {
    const result: IceCrystal[] = [];
    this.children.forEach(child => {
      result.push(child);
      result.push(...child.getChildCrystals());
    });
    return result;
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    (this.mesh.material as THREE.MeshPhysicalMaterial).opacity = opacity;
    this.children.forEach(child => child.setOpacity(opacity));
  }

  getMeshes(): THREE.Mesh[] {
    const meshes = [this.mesh];
    this.children.forEach(child => meshes.push(...child.getMeshes()));
    return meshes;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.children.forEach(child => child.dispose());
  }
}

export class IceCrystalForest {
  scene: THREE.Scene;
  crystals: IceCrystal[];
  group: THREE.Group;
  ground: THREE.Mesh;
  crystalCount: number;

  constructor(scene: THREE.Scene, config: IceCrystalConfig) {
    this.scene = scene;
    this.crystals = [];
    this.group = new THREE.Group();
    this.crystalCount = 50;

    const groundGeometry = new THREE.CircleGeometry(15, 64);
    const groundMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1A3A5A,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.3
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    this.createForest(config);
    this.scene.add(this.group);
  }

  createForest(config: IceCrystalConfig): void {
    for (let i = 0; i < this.crystalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 9;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 2 + Math.random() * 2;
      const position = new THREE.Vector3(x, 0, z);
      const crystal = new IceCrystal(position, height, config);
      this.crystals.push(crystal);
      this.group.add(crystal.group);
    }
  }

  update(delta: number, time: number, auroraColor: THREE.Color): void {
    (this.ground.material as THREE.MeshPhysicalMaterial).color = auroraColor.clone().multiplyScalar(0.15).add(new THREE.Color(0x0A1A2A));
    this.crystals.forEach(crystal => crystal.update(delta, time, auroraColor));
  }

  getTotalCrystalCount(): number {
    let count = this.crystals.length;
    this.crystals.forEach(crystal => {
      count += crystal.getChildCrystals().length;
    });
    return count;
  }

  getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.crystals.forEach(crystal => meshes.push(...crystal.getMeshes()));
    return meshes;
  }

  setOpacity(opacity: number): void {
    this.crystals.forEach(crystal => crystal.setOpacity(opacity));
  }

  reset(config: IceCrystalConfig): void {
    this.crystals.forEach(crystal => {
      this.group.remove(crystal.group);
      crystal.dispose();
    });
    this.crystals = [];
    this.createForest(config);
  }

  findCrystalByMesh(mesh: THREE.Mesh): IceCrystal | null {
    for (const crystal of this.crystals) {
      if (crystal.mesh === mesh) return crystal;
      const childResult = this.findInChildren(crystal, mesh);
      if (childResult) return childResult;
    }
    return null;
  }

  private findInChildren(parent: IceCrystal, mesh: THREE.Mesh): IceCrystal | null {
    for (const child of parent.children) {
      if (child.mesh === mesh) return child;
      const result = this.findInChildren(child, mesh);
      if (result) return result;
    }
    return null;
  }
}
