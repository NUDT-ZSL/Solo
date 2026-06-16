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
  isHovered: boolean;
}

export class ForceField {
  private scene: THREE.Scene;
  private dataManager: DataManager;
  private particleSystem: ParticleSystem;
  private config: ForceFieldConfig;
  private group: THREE.Group;
  private forceLines: ForceLine[] = [];
  private baseOpacity: number = 0.35;
  private hoveredStockIndex: number = -1;
  private enabled: boolean = true;
  private time: number = 0;

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
    this.buildForceFieldLines();
  }

  private buildForceFieldLines(): void {
    this.clearAllLines();

    const stockCount = this.dataManager.getStockCount();
    const daysCount = this.dataManager.getDaysCount();

    const correlationMap: Map<string, number> = new Map();

    for (let i = 0; i < stockCount; i++) {
      for (let j = i + 1; j < stockCount; j++) {
        const corr = this.dataManager.computeCorrelation(i, j);
        if (Math.abs(corr) >= this.config.correlationThreshold) {
          correlationMap.set(`${i}-${j}`, corr);
        }
      }
    }

    console.log(`[ForceField] Found ${correlationMap.size} stock pairs with correlation >= ${this.config.correlationThreshold}`);

    const sampleStep = Math.max(1, Math.floor(daysCount / 15));
    const sampledDays: number[] = [];
    for (let d = 0; d < daysCount; d += sampleStep) {
      sampledDays.push(d);
    }
    if (sampledDays[sampledDays.length - 1] !== daysCount - 1) {
      sampledDays.push(daysCount - 1);
    }

    for (const [key, corr] of correlationMap) {
      const [idxA, idxB] = key.split('-').map(Number);
      const stockA = this.dataManager.getStock(idxA);
      const stockB = this.dataManager.getStock(idxB);
      if (!stockA || !stockB) continue;

      for (const day of sampledDays) {
        const pointA = stockA.data[day];
        const pointB = stockB.data[day];
        if (!pointA || !pointB) continue;

        const posA = this.particleSystem.getParticlePosition(pointA);
        const posB = this.particleSystem.getParticlePosition(pointB);

        const geometry = new THREE.BufferGeometry().setFromPoints([posA, posB]);

        const corrStrength = Math.abs(corr);
        const opacity = this.baseOpacity * (0.5 + corrStrength * 0.5);

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
          baseOpacity: opacity,
          isHovered: false
        });
      }
    }

    console.log(`[ForceField] Total force lines: ${this.forceLines.length}`);
  }

  updateCorrelationThreshold(threshold: number): void {
    this.config.correlationThreshold = threshold;
    this.buildForceFieldLines();
  }

  animate(delta: number, camera: THREE.Camera): void {
    if (!this.enabled) return;

    this.time += delta;

    const camPos = camera.position.clone();
    const camDistance = camPos.distanceTo(new THREE.Vector3(0, 0, 0));
    const distanceFactor = Math.max(0.3, 1 - Math.max(0, (camDistance - 8) / 15));

    const wavePhase = this.time * 1.5;
    const minOpacity = 0.2;
    const maxOpacity = 0.5;

    for (const forceLine of this.forceLines) {
      const material = forceLine.line.material as THREE.LineBasicMaterial;

      if (forceLine.stockIdxA === this.hoveredStockIndex ||
          forceLine.stockIdxB === this.hoveredStockIndex) {
        if (!forceLine.isHovered) {
          forceLine.isHovered = true;
          material.color.setHex(0xffd700);
        }
        const hoverTarget = 0.9;
        material.opacity += (hoverTarget - material.opacity) * 0.15;
      } else {
        if (forceLine.isHovered) {
          forceLine.isHovered = false;
          material.color.setHex(0xffffff);
        }

        const corrFactor = 0.4 + Math.abs(forceLine.correlation) * 0.6;
        const waveOffset = forceLine.dayIndex * 0.15 + forceLine.stockIdxA * 0.1;
        const waveValue = 0.7 + Math.sin(wavePhase + waveOffset) * 0.3;

        const dynamicOpacity = forceLine.baseOpacity * waveValue * corrFactor * distanceFactor;
        const clampedOpacity = Math.max(minOpacity, Math.min(maxOpacity, dynamicOpacity));

        material.opacity += (clampedOpacity - material.opacity) * 0.08;
      }
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
    const farThreshold = 18;
    const targetOpacity = 0.1;

    if (cameraDistance > farThreshold) {
      for (const forceLine of this.forceLines) {
        const material = forceLine.line.material as THREE.LineBasicMaterial;
        if (forceLine.stockIdxA !== this.hoveredStockIndex &&
            forceLine.stockIdxB !== this.hoveredStockIndex) {
          material.opacity = Math.min(material.opacity, targetOpacity);
        }
      }
    }
  }

  getLineCount(): number {
    return this.forceLines.length;
  }

  getConnectionStats(): {
    activeConnections: number;
    avgCorrelation: number;
    fieldStrength: number;
  } {
    if (this.forceLines.length === 0 || !this.enabled) {
      return { activeConnections: 0, avgCorrelation: 0, fieldStrength: 0 };
    }

    let totalCorr = 0;
    let activeCount = 0;
    let totalOpacity = 0;

    for (const fl of this.forceLines) {
      if (fl.line.visible) {
        activeCount++;
        totalCorr += Math.abs(fl.correlation);
        totalOpacity += (fl.line.material as THREE.LineBasicMaterial).opacity;
      }
    }

    const avgCorr = activeCount > 0 ? totalCorr / activeCount : 0;
    const avgOpacity = activeCount > 0 ? totalOpacity / activeCount : 0;
    const fieldStrength = Math.min(100, avgCorr * 100 * (0.6 + avgOpacity * 0.8));

    return {
      activeConnections: activeCount,
      avgCorrelation: parseFloat(avgCorr.toFixed(3)),
      fieldStrength: parseFloat(fieldStrength.toFixed(1))
    };
  }

  private clearAllLines(): void {
    for (const forceLine of this.forceLines) {
      forceLine.line.geometry.dispose();
      (forceLine.line.material as THREE.Material).dispose();
      this.group.remove(forceLine.line);
    }
    this.forceLines = [];
  }

  dispose(): void {
    this.clearAllLines();
    this.scene.remove(this.group);
  }

  getGroup(): THREE.Group {
    return this.group;
  }
}
