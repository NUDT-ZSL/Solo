import * as THREE from 'three';
import { DataManager, StockDataPoint, Stock } from './dataManager';

export interface ParticleSystemConfig {
  particleSize: number;
  colorScheme: 'redGreen' | 'warmGradient';
  emissiveIntensity: number;
}

export interface ParticleInfo {
  stockIndex: number;
  dayIndex: number;
  mesh: THREE.Mesh;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private dataManager: DataManager;
  private config: ParticleSystemConfig;
  private particles: ParticleInfo[] = [];
  private group: THREE.Group;
  private raycaster: THREE.Raycaster;
  private meshes: THREE.Mesh[] = [];
  private hoveredStockIndex: number = -1;
  private fullParticleCount: number = 0;

  constructor(
    scene: THREE.Scene,
    dataManager: DataManager,
    config: ParticleSystemConfig
  ) {
    this.scene = scene;
    this.dataManager = dataManager;
    this.config = config;
    this.group = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.scene.add(this.group);
    this.createAllParticles();
  }

  private getDataRanges(): {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  } {
    const priceRange = this.dataManager.getPriceRange();
    const volumeRange = this.dataManager.getVolumeRange();
    const daysCount = this.dataManager.getDaysCount();

    return {
      xMin: 0, xMax: daysCount - 1,
      yMin: priceRange.min, yMax: priceRange.max,
      zMin: volumeRange.min, zMax: volumeRange.max
    };
  }

  private mapPointToPosition(point: StockDataPoint, ranges: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  }): THREE.Vector3 {
    const xSpan = ranges.xMax - ranges.xMin || 1;
    const ySpan = ranges.yMax - ranges.yMin || 1;
    const zSpan = ranges.zMax - ranges.zMin || 1;

    const x = ((point.dayIndex - ranges.xMin) / xSpan) * 10 - 5;
    const y = ((point.price - ranges.yMin) / ySpan) * 10 - 5;
    const z = ((point.volume - ranges.zMin) / zSpan) * 10 - 5;

    return new THREE.Vector3(x, y, z);
  }

  private getParticleColor(stock: Stock, dayIndex: number): THREE.Color {
    const data = stock.data;
    if (dayIndex === 0) {
      return this.config.colorScheme === 'redGreen'
        ? new THREE.Color(0xbbbbbb)
        : new THREE.Color(0xffcc00);
    }

    const prevPrice = data[dayIndex - 1].price;
    const currPrice = data[dayIndex].price;
    const changePct = ((currPrice - prevPrice) / prevPrice) * 100;

    if (this.config.colorScheme === 'redGreen') {
      if (changePct >= 0) {
        const intensity = Math.min(1, Math.abs(changePct) / 3);
        return new THREE.Color().lerpColors(
          new THREE.Color(0xffaaaa),
          new THREE.Color(0xff4444),
          intensity
        );
      } else {
        const intensity = Math.min(1, Math.abs(changePct) / 3);
        return new THREE.Color().lerpColors(
          new THREE.Color(0xaaffaa),
          new THREE.Color(0x44ff44),
          intensity
        );
      }
    } else {
      const normalized = Math.max(-1, Math.min(1, changePct / 5));
      if (normalized >= 0) {
        return new THREE.Color().lerpColors(
          new THREE.Color(0xffcc66),
          new THREE.Color(0xff3300),
          normalized
        );
      } else {
        return new THREE.Color().lerpColors(
          new THREE.Color(0xffcc66),
          new THREE.Color(0x3366ff),
          -normalized
        );
      }
    }
  }

  private createAllParticles(): void {
    const ranges = this.getDataRanges();
    const stocks = this.dataManager.getStocks();
    const stockCount = this.dataManager.getStockCount();
    const daysCount = this.dataManager.getDaysCount();

    for (let si = 0; si < stockCount; si++) {
      const stock = stocks[si];
      if (!stock) continue;

      const sizeMultiplier = 1 + Math.min(1.5, Math.abs(stock.changePercent) / 8);

      for (let di = 0; di < daysCount; di++) {
        const point = stock.data[di];
        if (!point) continue;

        const position = this.mapPointToPosition(point, ranges);
        const color = this.getParticleColor(stock, di);

        const geometry = new THREE.SphereGeometry(
          this.config.particleSize * sizeMultiplier,
          12,
          12
        );

        const material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: this.config.emissiveIntensity,
          metalness: 0.25,
          roughness: 0.5,
          transparent: true,
          opacity: 0.92
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.userData = {
          stockIndex: si,
          dayIndex: di,
          originalColor: color.clone(),
          baseSize: this.config.particleSize * sizeMultiplier
        };

        this.group.add(mesh);
        this.meshes.push(mesh);
        this.particles.push({ stockIndex: si, dayIndex: di, mesh });
      }
    }

    this.fullParticleCount = this.meshes.length;
    console.log(`[ParticleSystem] Created ${this.fullParticleCount} particles (${stockCount} stocks × ${daysCount} days)`);
  }

  getParticlePosition(point: StockDataPoint): THREE.Vector3 {
    const ranges = this.getDataRanges();
    return this.mapPointToPosition(point, ranges);
  }

  getStockPositions(stockIndex: number): THREE.Vector3[] {
    const stock = this.dataManager.getStock(stockIndex);
    if (!stock) return [];
    const ranges = this.getDataRanges();
    return stock.data.map(p => this.mapPointToPosition(p, ranges));
  }

  updateColors(): void {
    const stocks = this.dataManager.getStocks();
    for (const particle of this.particles) {
      const stock = stocks[particle.stockIndex];
      if (!stock) continue;
      const color = this.getParticleColor(stock, particle.dayIndex);
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      material.color.copy(color);
      material.emissive.copy(color);
      particle.mesh.userData.originalColor = color.clone();
    }
  }

  updateParticleSize(newSize: number): void {
    this.config.particleSize = newSize;
    const stocks = this.dataManager.getStocks();
    for (const particle of this.particles) {
      const stock = stocks[particle.stockIndex];
      if (!stock) continue;
      const sizeMultiplier = 1 + Math.min(1.5, Math.abs(stock.changePercent) / 8);
      const targetSize = newSize * sizeMultiplier;
      const currentSize = particle.mesh.userData.baseSize;
      particle.mesh.scale.setScalar(targetSize / currentSize);
      particle.mesh.userData.baseSize = targetSize;
    }
  }

  updateEmissiveIntensity(intensity: number): void {
    this.config.emissiveIntensity = intensity;
    for (const particle of this.particles) {
      (particle.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
  }

  setColorScheme(scheme: 'redGreen' | 'warmGradient'): void {
    this.config.colorScheme = scheme;
    this.updateColors();
  }

  detectClick(
    mouse: THREE.Vector2,
    camera: THREE.Camera
  ): { stockIndex: number; dayIndex: number } | null {
    this.raycaster.setFromCamera(mouse, camera);
    const visibleMeshes = this.meshes.filter(m => m.visible);
    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);
    if (intersects.length > 0) {
      const { stockIndex, dayIndex } = intersects[0].object.userData;
      return { stockIndex, dayIndex };
    }
    return null;
  }

  detectHover(
    mouse: THREE.Vector2,
    camera: THREE.Camera
  ): number {
    this.raycaster.setFromCamera(mouse, camera);
    const visibleMeshes = this.meshes.filter(m => m.visible);
    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);
    if (intersects.length > 0) {
      return intersects[0].object.userData.stockIndex;
    }
    return -1;
  }

  highlightStock(stockIndex: number): void {
    for (const particle of this.particles) {
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      if (particle.stockIndex === stockIndex) {
        material.emissiveIntensity = this.config.emissiveIntensity * 2.5;
        particle.mesh.scale.setScalar(1.6);
        material.opacity = 1;
      } else {
        material.opacity = 0.25;
        particle.mesh.scale.setScalar(0.7);
      }
    }
  }

  hoverHighlightStock(stockIndex: number): void {
    this.hoveredStockIndex = stockIndex;
    for (const particle of this.particles) {
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      if (particle.stockIndex === stockIndex) {
        material.emissiveIntensity = this.config.emissiveIntensity * 1.8;
        particle.mesh.scale.setScalar(1.3);
        material.opacity = 1;
      }
    }
  }

  clearHighlight(): void {
    this.hoveredStockIndex = -1;
    for (const particle of this.particles) {
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = this.config.emissiveIntensity;
      material.opacity = 0.92;
      particle.mesh.scale.setScalar(1);
    }
  }

  getHoveredStockIndex(): number {
    return this.hoveredStockIndex;
  }

  getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  getParticles(): ParticleInfo[] {
    return this.particles;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  setLODLevel(cameraDistance: number): void {
    const farThreshold = 18;
    const midThreshold = 12;
    const nearThreshold = 6;

    if (cameraDistance > farThreshold) {
      const targetRatio = 0.8;
      const step = Math.round(1 / targetRatio);
      let idx = 0;
      for (const mesh of this.meshes) {
        mesh.visible = (idx % step === 0);
        idx++;
      }
    } else if (cameraDistance > midThreshold) {
      const targetRatio = 0.95;
      const step = Math.round(1 / targetRatio);
      let idx = 0;
      for (const mesh of this.meshes) {
        mesh.visible = (idx % step === 0);
        idx++;
      }
    } else if (cameraDistance < nearThreshold) {
      for (const mesh of this.meshes) {
        mesh.visible = true;
      }
    }
  }

  getVisibleCount(): number {
    let count = 0;
    for (const mesh of this.meshes) {
      if (mesh.visible) count++;
    }
    return count;
  }

  getTotalCount(): number {
    return this.fullParticleCount;
  }

  animate(delta: number, rotationSpeed: number): void {
    this.group.rotation.y += rotationSpeed * delta * Math.PI / 180;
  }

  getStockLatestColor(stockIndex: number): THREE.Color {
    const stock = this.dataManager.getStock(stockIndex);
    if (!stock) return new THREE.Color(0xffffff);
    if (stock.changePercent >= 0) {
      if (this.config.colorScheme === 'redGreen') {
        return new THREE.Color(0xff4444);
      } else {
        return new THREE.Color(0xff3300);
      }
    } else {
      if (this.config.colorScheme === 'redGreen') {
        return new THREE.Color(0x44ff44);
      } else {
        return new THREE.Color(0x3366ff);
      }
    }
  }
}
