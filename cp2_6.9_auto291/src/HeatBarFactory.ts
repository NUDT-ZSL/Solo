import * as THREE from 'three';
import { HeatDataPoint, BuildingMesh } from './types';

export class HeatBarFactory {
  private static sharedGeometry: THREE.BoxGeometry | null = null;
  private static readonly BAR_WIDTH = 0.6;
  private static readonly BAR_DEPTH = 0.6;
  private static readonly MIN_HEIGHT = 0.5;
  private static readonly MAX_HEIGHT = 8;
  private static readonly COLOR_COLD = new THREE.Color(0x00BCD4);
  private static readonly COLOR_MID = new THREE.Color(0xFFC107);
  private static readonly COLOR_WARM = new THREE.Color(0xFF5722);

  public static getSharedGeometry(): THREE.BoxGeometry {
    if (!HeatBarFactory.sharedGeometry) {
      HeatBarFactory.sharedGeometry = new THREE.BoxGeometry(
        HeatBarFactory.BAR_WIDTH,
        1,
        HeatBarFactory.BAR_DEPTH
      );
    }
    return HeatBarFactory.sharedGeometry;
  }

  public static mapHeatToHeight(heatValue: number): number {
    const t = Math.max(0, Math.min(1, heatValue / 100));
    return HeatBarFactory.MIN_HEIGHT + t * (HeatBarFactory.MAX_HEIGHT - HeatBarFactory.MIN_HEIGHT);
  }

  public static mapHeatToColor(heatValue: number): THREE.Color {
    const t = Math.max(0, Math.min(1, heatValue / 100));
    const color = new THREE.Color();
    
    if (t < 0.5) {
      const localT = t * 2;
      const coldHSL = { h: 0, s: 0, l: 0 };
      const midHSL = { h: 0, s: 0, l: 0 };
      HeatBarFactory.COLOR_COLD.getHSL(coldHSL);
      HeatBarFactory.COLOR_MID.getHSL(midHSL);
      color.setHSL(
        coldHSL.h + (midHSL.h - coldHSL.h) * localT,
        coldHSL.s + (midHSL.s - coldHSL.s) * localT,
        coldHSL.l + (midHSL.l - coldHSL.l) * localT
      );
    } else {
      const localT = (t - 0.5) * 2;
      const midHSL = { h: 0, s: 0, l: 0 };
      const warmHSL = { h: 0, s: 0, l: 0 };
      HeatBarFactory.COLOR_MID.getHSL(midHSL);
      HeatBarFactory.COLOR_WARM.getHSL(warmHSL);
      color.setHSL(
        midHSL.h + (warmHSL.h - midHSL.h) * localT,
        midHSL.s + (warmHSL.s - midHSL.s) * localT,
        midHSL.l + (warmHSL.l - midHSL.l) * localT
      );
    }
    
    return color;
  }

  public static createHeatBar(data: HeatDataPoint): BuildingMesh {
    const geometry = HeatBarFactory.getSharedGeometry();
    const color = HeatBarFactory.mapHeatToColor(data.heatValue);
    const height = HeatBarFactory.mapHeatToHeight(data.heatValue);

    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.6,
      emissive: color,
      emissiveIntensity: 0.0
    });

    const mesh = new THREE.Mesh(geometry, material) as unknown as BuildingMesh;
    mesh.position.copy(data.position);
    mesh.scale.y = height;
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      heatData: data,
      originalEmissiveIntensity: 0.0,
      isHovered: false,
      isSelected: false,
      isBlinking: false,
      blinkPhase: 0
    };

    return mesh;
  }

  public static updateHeatBar(mesh: BuildingMesh, heatValue: number): void {
    const height = HeatBarFactory.mapHeatToHeight(heatValue);
    const color = HeatBarFactory.mapHeatToColor(heatValue);

    mesh.scale.y = height;
    mesh.position.y = height / 2;

    const material = mesh.material as THREE.MeshStandardMaterial;
    material.color.copy(color);
    material.emissive.copy(color);

    mesh.userData.heatData.heatValue = heatValue;
  }
}
