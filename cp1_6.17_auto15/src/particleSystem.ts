import * as THREE from 'three';
import { DataManager, StockDataPoint } from './dataManager';

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
    this.createParticles();
  }

  private normalizeData(): {
    xRange: number[];
    yRange: [number, number];
    zRange: [number, number];
  } {
    const priceRange = this.dataManager.getPriceRange();
    const volumeRange = this.dataManager.getVolumeRange();
    const daysCount = this.dataManager.getDaysCount();

    return {
      xRange: [0, daysCount - 1],
      yRange: [priceRange.min, priceRange.max],
      zRange: [volumeRange.min, volumeRange.max]
    };
  }

  private mapToPosition(
    point: StockDataPoint,
    ranges: { xRange: number[]; yRange: [number, number]; zRange: [number, number] }
  ): THREE.Vector3 {
    const xScale = 10 / (ranges.xRange[1] - ranges.xRange[0]);
    const yScale = 10 / (ranges.yRange[1] - ranges.yRange[0]);
    const zScale = 10 / (ranges.zRange[1] - ranges.zRange[0]);

    const x = (point.dayIndex - ranges.xRange[0]) * xScale - 5;
    const y = (point.price - ranges.yRange[0]) * yScale - 5;
    const z = (point.volume - ranges.zRange[0]) * zScale - 5;

    return new THREE.Vector3(x, y, z);
  }

  private getParticleColor(stockIndex: number, dayIndex: number): THREE.Color {
    const stock = this.dataManager.getStock(stockIndex);
    if (!stock) return new THREE.Color(0xffffff);

    const data = stock.data;
    if (dayIndex === 0) {
      return this.config.colorScheme === 'redGreen'
        ? new THREE.Color(0xffffff)
        : this.getWarmColor(0);
    }

    const prevPrice = data[dayIndex - 1].price;
    const currPrice = data[dayIndex].price;
    const changePct = ((currPrice - prevPrice) / prevPrice) * 100;

    if (this.config.colorScheme === 'redGreen') {
      if (changePct >= 0) {
        const intensity = Math.min(1, Math.abs(changePct) / 5);
        return new THREE.Color().lerpColors(
          new THREE.Color(0xffaa44),
          new THREE.Color(0xff4444),
          intensity
        );
      } else {
        const intensity = Math.min(1, Math.abs(changePct) / 5);
        return new THREE.Color().lerpColors(
          new THREE.Color(0x44ff88),
          new THREE.Color(0x44ff44),
          intensity
        );
      }
    } else {
      return this.getWarmColor(changePct);
    }
  }

  private getWarmColor(changePct: number): THREE.Color {
    const normalized = Math.max(-1, Math.min(1, changePct / 5));
    if (normalized >= 0) {
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffaa00),
        new THREE.Color(0xff0000),
        normalized
      );
    } else {
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffaa00),
        new THREE.Color(0x0066ff),
        -normalized
      );
    }
  }

  getParticlePosition(point: StockDataPoint): THREE.Vector3 {
    const ranges = this.normalizeData();
    return this.mapToPosition(point, ranges);
  }

  getStockPositions(stockIndex: number): THREE.Vector3[] {
    const stock = this.dataManager.getStock(stockIndex);
    if (!stock) return [];
    const ranges = this.normalizeData();
    return stock.data.map(p => this.mapToPosition(p, ranges));
  }

  private createParticles(): void {
    const ranges = this.normalizeData();
    const allPoints = this.dataManager.getAllDataPoints();
    const stocks = this.dataManager.getStocks();

    const displayCount = Math.min(allPoints.length, 2000);
    const step = Math.ceil(allPoints.length / Math.min(displayCount, 2000));

    for (let i = 0; i < allPoints.length; i += step) {
      const point = allPoints[i];
      const position = this.mapToPosition(point, ranges);
      const color = this.getParticleColor(point.stockIndex, point.dayIndex);
      const stock = stocks[point.stockIndex];
      const sizeMultiplier = 1 + Math.min(2, Math.abs(stock?.changePercent || 0) / 10);

      const geometry = new THREE.SphereGeometry(
        this.config.particleSize * sizeMultiplier,
        16,
        16
      );
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: this.config.emissiveIntensity,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData = {
        stockIndex: point.stockIndex,
        dayIndex: point.dayIndex,
        originalColor: color.clone(),
        originalScale: this.config.particleSize * sizeMultiplier
      };

      this.group.add(mesh);
      this.meshes.push(mesh);
      this.particles.push({
        stockIndex: point.stockIndex,
        dayIndex: point.dayIndex,
        mesh
      });
    }
  }

  updateColors(): void {
    for (const particle of this.particles) {
      const color = this.getParticleColor(particle.stockIndex, particle.dayIndex);
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
      const sizeMultiplier = 1 + Math.min(2, Math.abs(stock?.changePercent || 0) / 10);
      particle.mesh.scale.setScalar((newSize * sizeMultiplier) / particle.mesh.userData.originalScale);
      particle.mesh.userData.originalScale = newSize * sizeMultiplier;
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
    const intersects = this.raycaster.intersectObjects(this.meshes, false);
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
    const intersects = this.raycaster.intersectObjects(this.meshes, false);
    if (intersects.length > 0) {
      return intersects[0].object.userData.stockIndex;
    }
    return -1;
  }

  highlightStock(stockIndex: number): void {
    for (const particle of this.particles) {
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      if (particle.stockIndex === stockIndex) {
        material.emissiveIntensity = this.config.emissiveIntensity * 2;
        particle.mesh.scale.setScalar(1.5);
      } else {
        material.opacity = 0.3;
        particle.mesh.scale.setScalar(0.8);
      }
    }
  }

  hoverHighlightStock(stockIndex: number): void {
    this.hoveredStockIndex = stockIndex;
    for (const particle of this.particles) {
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      if (particle.stockIndex === stockIndex) {
        material.emissiveIntensity = this.config.emissiveIntensity * 1.5;
        particle.mesh.scale.setScalar(1.2);
      }
    }
  }

  clearHighlight(): void {
    this.hoveredStockIndex = -1;
    for (const particle of this.particles) {
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = this.config.emissiveIntensity;
      material.opacity = 0.9;
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
    const farThreshold = 15;
    const nearThreshold = 8;
    
    if (cameraDistance > farThreshold) {
      let visibleCount = 0;
      const targetCount = Math.floor(this.meshes.length * 0.8);
      for (let i = 0; i < this.meshes.length; i++) {
        const shouldShow = i % Math.ceil(this.meshes.length / targetCount) === 0;
        this.meshes[i].visible = shouldShow;
        if (shouldShow) visibleCount++;
      }
    } else if (cameraDistance < nearThreshold) {
      for (const mesh of this.meshes) {
        mesh.visible = true;
      }
    }
  }

  getVisibleCount(): number {
    return this.meshes.filter(m => m.visible).length;
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
        return this.getWarmColor(stock.changePercent);
      }
    } else {
      if (this.config.colorScheme === 'redGreen') {
        return new THREE.Color(0x44ff44);
      } else {
        return this.getWarmColor(stock.changePercent);
      }
    }
  }
}
