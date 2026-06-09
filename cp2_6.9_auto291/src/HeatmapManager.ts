import * as THREE from 'three';
import { HeatDataPoint, BuildingMesh } from './types';
import { HeatBarFactory } from './HeatBarFactory';
import { ParticleSystem } from './ParticleSystem';

export class HeatmapManager {
  private scene: THREE.Scene;
  private buildingsGroup: THREE.Group;
  private buildings: BuildingMesh[] = [];
  private particleSystem: ParticleSystem;
  private hoveredBuilding: BuildingMesh | null = null;
  private selectedBuilding: BuildingMesh | null = null;
  private heatThreshold: number = 50;
  private readonly BLINK_DURATION = 0.6;
  private readonly BLINK_MIN_INTENSITY = 0.2;
  private readonly BLINK_MAX_INTENSITY = 0.8;
  private onBuildingSelectCallback: ((building: BuildingMesh | null) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingsGroup = new THREE.Group();
    this.scene.add(this.buildingsGroup);
    this.particleSystem = new ParticleSystem(scene);
  }

  public setOnBuildingSelectCallback(callback: (building: BuildingMesh | null) => void): void {
    this.onBuildingSelectCallback = callback;
  }

  public setHeatData(dataPoints: HeatDataPoint[]): void {
    this.clearBuildings();

    for (const data of dataPoints) {
      const building = HeatBarFactory.createHeatBar(data);
      this.buildings.push(building);
      this.buildingsGroup.add(building);
    }

    this.updateBlinkingState();
  }

  public updateHeatData(dataPoints: HeatDataPoint[]): void {
    const dataMap = new Map<number, HeatDataPoint>();
    for (const data of dataPoints) {
      dataMap.set(data.id, data);
    }

    for (const building of this.buildings) {
      const data = dataMap.get(building.userData.heatData.id);
      if (data) {
        HeatBarFactory.updateHeatBar(building, data.heatValue);
      }
    }

    this.updateBlinkingState();
  }

  public setThreshold(threshold: number): void {
    this.heatThreshold = threshold;
    this.updateBlinkingState();
  }

  private updateBlinkingState(): void {
    for (const building of this.buildings) {
      const shouldBlink = building.userData.heatData.heatValue > this.heatThreshold;
      
      if (building.userData.isHovered) {
        continue;
      }
      
      building.userData.isBlinking = shouldBlink;
      
      if (!shouldBlink && !building.userData.isHovered) {
        const material = building.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0;
        building.userData.originalEmissiveIntensity = 0;
      }
    }
  }

  public handleHover(building: BuildingMesh | null): void {
    if (this.hoveredBuilding === building) return;

    if (this.hoveredBuilding) {
      const prevBuilding = this.hoveredBuilding;
      prevBuilding.userData.isHovered = false;
      this.particleSystem.stopEmitter(prevBuilding.userData.heatData.id);
      
      const material = prevBuilding.material as THREE.MeshStandardMaterial;
      if (prevBuilding.userData.isBlinking) {
        prevBuilding.userData.originalEmissiveIntensity = 0;
      } else {
        material.emissiveIntensity = prevBuilding.userData.originalEmissiveIntensity;
      }
    }

    this.hoveredBuilding = building;

    if (building) {
      building.userData.isHovered = true;
      this.particleSystem.startEmitter(building);
      
      const material = building.material as THREE.MeshStandardMaterial;
      building.userData.originalEmissiveIntensity = material.emissiveIntensity;
      material.emissiveIntensity = 0.4;
    }
  }

  public handleClick(building: BuildingMesh | null): void {
    if (building !== null && this.selectedBuilding === building) {
      this.hideLabel(building);
      building.userData.isSelected = false;
      this.selectedBuilding = null;
      this.onBuildingSelectCallback?.(null);
      return;
    }

    if (this.selectedBuilding) {
      this.hideLabel(this.selectedBuilding);
      this.selectedBuilding.userData.isSelected = false;
    }

    this.selectedBuilding = building;

    if (building) {
      building.userData.isSelected = true;
      this.showLabel(building);
      this.onBuildingSelectCallback?.(building);
    } else {
      this.onBuildingSelectCallback?.(null);
    }
  }

  private showLabel(building: BuildingMesh): void {
    if (building.userData.labelElement) return;

    const label = document.createElement('div');
    label.className = 'building-label';
    label.textContent = `${building.userData.heatData.regionName}：${Math.round(building.userData.heatData.heatValue)}热力值`;
    document.body.appendChild(label);
    building.userData.labelElement = label;
  }

  private hideLabel(building: BuildingMesh): void {
    if (building.userData.labelElement) {
      building.userData.labelElement.remove();
      building.userData.labelElement = undefined;
    }
  }

  public updateLabels(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
    const widthHalf = renderer.domElement.clientWidth / 2;
    const heightHalf = renderer.domElement.clientHeight / 2;

    for (const building of this.buildings) {
      if (!building.userData.labelElement) continue;

      const topPos = new THREE.Vector3(
        building.position.x,
        building.position.y + building.scale.y / 2 + 0.5,
        building.position.z
      );

      const projected = topPos.clone().project(camera);
      
      building.userData.labelElement.style.left = `${(projected.x * widthHalf) + widthHalf}px`;
      building.userData.labelElement.style.top = `${-(projected.y * heightHalf) + heightHalf}px`;
    }
  }

  public getBuildings(): BuildingMesh[] {
    return this.buildings;
  }

  public getSelectedBuilding(): BuildingMesh | null {
    return this.selectedBuilding;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.particleSystem.update(deltaTime, elapsedTime);

    for (const building of this.buildings) {
      if (building.userData.isHovered) continue;
      
      if (building.userData.isBlinking) {
        building.userData.blinkPhase += deltaTime;
        const cyclePos = (building.userData.blinkPhase % this.BLINK_DURATION) / this.BLINK_DURATION;
        const pulse = Math.sin(cyclePos * Math.PI * 2) * 0.5 + 0.5;
        const intensity = this.BLINK_MIN_INTENSITY + pulse * (this.BLINK_MAX_INTENSITY - this.BLINK_MIN_INTENSITY);
        (building.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
      }
    }
  }

  private clearBuildings(): void {
    for (const building of this.buildings) {
      this.hideLabel(building);
      this.buildingsGroup.remove(building);
      (building.material as THREE.Material).dispose();
    }
    this.buildings = [];
    this.hoveredBuilding = null;
    this.selectedBuilding = null;
  }

  public dispose(): void {
    this.clearBuildings();
    this.particleSystem.dispose();
    this.scene.remove(this.buildingsGroup);
  }
}
