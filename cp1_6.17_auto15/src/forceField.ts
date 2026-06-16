import * as THREE from 'three';
import { DataManager } from './dataManager';
import { ParticleSystem } from './particleSystem';

export interface ForceFieldConfig {
  correlationThreshold: number;
  baseOpacity: number;
  lineWidth: number;
}

interface ForceLine {
  stockIdxA: number;
  stockIdxB: number;
  correlation: number;
  dayIndex: number;
  line: THREE.Line;
  baseOpacity: number;
}

export class ForceField {
  private scene: THREE.Scene;
  private dataManager: DataManager;
  private particleSystem: ParticleSystem;
  private config: ForceFieldConfig;
  private group: THREE.Group;
  private forceLines: ForceLine[] = [];
  private baseOpacity: number = 0.3;
  private hoveredStockIndex: number = -1;
  private enabled: boolean = true;

  constructor(
    scene: THREE.Scene,
    dataManager: DataManager,
    particleSystem: ParticleSystem,
    config: ForceFieldConfig
  ) {
    this.scene = scene;
    this.dataManager = dataManager;
    this.particleSystem = particleSystem;
    this.config = config;
    this.group = new THREE.Group();
    this.baseOpacity = config.baseOpacity;
    this.scene.add(this.group);
    this.buildForceLines();
  }

  private buildForceLines(): void {
    this.clearLines();

    const stockCount = this.dataManager.getStockCount();
    const daysCount = this.dataManager.getDaysCount();
    const correlations: Map<string, number> = new Map();

    for (let i = 0; i < stockCount; i++) {
      for (let j = i + 1; j < stockCount; j++) {
        const corr = this.dataManager.computeCorrelation(i, j);
        if (Math.abs(corr) >= this.config.correlationThreshold) {
          correlations.set(`${i}-${j}`, corr);
        }
      }
    }

    const sampleDays = this.sampleDays(daysCount, 12);

    for (const [key, corr] of correlations) {
      const [idxA, idxB] = key.split('-').map(Number);
      const stockA = this.dataManager.getStock(idxA);
      const stockB = this.dataManager.getStock(idxB);
      if (!stockA || !stockB) continue;

      for (const day of sampleDays) {
        const pointA = stockA.data[day];
        const pointB = stockB.data[day];
        if (!pointA || !pointB) continue;

        const posA = this.particleSystem.getParticlePosition(pointA);
        const posB = this.particleSystem.getParticlePosition(pointB);

        const geometry = new THREE.BufferGeometry().setFromPoints([posA, posB]);
        const opacity = this.baseOpacity * (0.5 + Math.abs(corr) * 0.5);

        const material = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: opacity,
          linewidth: this.config.lineWidth
        });

        const line = new THREE.Line(geometry, material);
        this.group.add(line);

        this.forceLines.push({
          stockIdxA: idxA,
          stockIdxB: idxB,
          correlation: corr,
          dayIndex: day,
          line,
          baseOpacity: opacity
        });
      }
    }
  }

  private sampleDays(totalDays: number, count: number): number[] {
    const result: number[] = [];
    const step = Math.max(1, Math.floor(totalDays / count));
    for (let i = 0; i < totalDays; i += step) {
      result.push(i);
    }
    if (result[result.length - 1] !== totalDays - 1) {
      result.push(totalDays - 1);
    }
    return result;
  }

  updateCorrelationThreshold(threshold: number): void {
    this.config.correlationThreshold = threshold;
    this.buildForceLines();
  }

  animate(_delta: number, camera: THREE.Camera): void {
    if (!this.enabled) return;

    const camPos = camera.position.clone();
    const center = new THREE.Vector3(0, 0, 0);
    const viewAngle = camPos.angleTo(new THREE.Vector3(0, 1, 0));
    const waveFactor = 0.7 + Math.sin(Date.now() * 0.001 + viewAngle * 2) * 0.3;

    const camDistance = camPos.distanceTo(center);
    const distanceFactor = Math.max(0.3, 1 - (camDistance - 5) / 20);

    for (const forceLine of this.forceLines) {
      const material = forceLine.line.material as THREE.LineBasicMaterial;
      const corrFactor = 0.4 + Math.abs(forceLine.correlation) * 0.6;

      let targetOpacity = forceLine.baseOpacity * waveFactor * corrFactor * distanceFactor;

      if (this.hoveredStockIndex >= 0 &&
          (forceLine.stockIdxA === this.hoveredStockIndex ||
           forceLine.stockIdxB === this.hoveredStockIndex)) {
        targetOpacity = 0.9;
        material.color.setHex(0xffd700);
      } else {
        material.color.setHex(0xffffff);
      }

      material.opacity += (targetOpacity - material.opacity) * 0.1;
    }
  }

  setHoveredStock(stockIndex: number): void {
    this.hoveredStockIndex = stockIndex;
  }

  clearHover(): void {
    this.hoveredStockIndex = -1;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    this.group.visible = this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setLODLevel(cameraDistance: number): void {
    const farThreshold = 15;
    if (cameraDistance > farThreshold) {
      for (const forceLine of this.forceLines) {
        (forceLine.line.material as THREE.LineBasicMaterial).opacity =
          forceLine.baseOpacity * 0.1;
      }
    }
  }

  getLineCount(): number {
    return this.forceLines.length;
  }

  clearLines(): void {
    for (const forceLine of this.forceLines) {
      forceLine.line.geometry.dispose();
      (forceLine.line.material as THREE.Material).dispose();
      this.group.remove(forceLine.line);
    }
    this.forceLines = [];
  }

  dispose(): void {
    this.clearLines();
    this.scene.remove(this.group);
  }

  getGroup(): THREE.Group {
    return this.group;
  }
}
