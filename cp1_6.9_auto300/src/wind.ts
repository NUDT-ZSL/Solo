import * as THREE from 'three';
import type { Bamboo } from './bamboo';

export class Wind {
  public mouseWorld: THREE.Vector3;
  private raycaster: THREE.Raycaster;
  private plane: THREE.Plane;
  private ambientWind: THREE.Vector2;
  private ambientPhase: number;

  constructor() {
    this.mouseWorld = new THREE.Vector3(0, 0, 0);
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.ambientWind = new THREE.Vector2(0, 0);
    this.ambientPhase = 0;
  }

  public updateMouse(
    ndcX: number,
    ndcY: number,
    camera: THREE.Camera
  ): void {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, intersection);
    if (intersection) {
      this.mouseWorld.copy(intersection);
    }
  }

  public update(deltaTime: number, bamboos: Bamboo[]): void {
    this.ambientPhase += deltaTime * 0.5;
    this.ambientWind.set(
      Math.sin(this.ambientPhase * 0.7) * 0.03 + Math.sin(this.ambientPhase * 1.3) * 0.02,
      Math.cos(this.ambientPhase * 0.5) * 0.03 + Math.cos(this.ambientPhase * 1.1) * 0.02
    );

    let closestDist = Infinity;
    let closestBamboo: Bamboo | null = null;

    for (const bamboo of bamboos) {
      const bambooWorld = new THREE.Vector2(
        bamboo.basePosition.x,
        bamboo.basePosition.z
      );
      const mouse2D = new THREE.Vector2(this.mouseWorld.x, this.mouseWorld.z);
      const dist = bambooWorld.distanceTo(mouse2D);

      if (dist < closestDist) {
        closestDist = dist;
        closestBamboo = bamboo;
      }

      const ambientBend = new THREE.Vector2(
        this.ambientWind.x + Math.sin(this.ambientPhase + bamboo.basePosition.x * 0.1) * 0.015,
        this.ambientWind.y + Math.cos(this.ambientPhase + bamboo.basePosition.z * 0.1) * 0.015
      );
      bamboo.targetBending.copy(ambientBend);
    }

    if (closestBamboo) {
      const influenceRadius = 120;
      const falloff = THREE.MathUtils.clamp(1 - closestDist / influenceRadius, 0, 1);
      const maxBend = THREE.MathUtils.lerp(0, 1, falloff);

      const bendDir = new THREE.Vector2(
        this.mouseWorld.x - closestBamboo.basePosition.x,
        this.mouseWorld.z - closestBamboo.basePosition.z
      );
      if (bendDir.lengthSq() > 0.001) {
        bendDir.normalize();
      }

      const mouseBend = bendDir.multiplyScalar(maxBend);
      closestBamboo.targetBending.add(mouseBend);
    }

    for (const bamboo of bamboos) {
      if (bamboo === closestBamboo) continue;
      const bambooWorld = new THREE.Vector2(
        bamboo.basePosition.x,
        bamboo.basePosition.z
      );
      const mouse2D = new THREE.Vector2(this.mouseWorld.x, this.mouseWorld.z);
      const dist = bambooWorld.distanceTo(mouse2D);
      const influenceRadius = 80;
      if (dist < influenceRadius) {
        const falloff = THREE.MathUtils.clamp(1 - dist / influenceRadius, 0, 1) * 0.4;
        const bendDir = new THREE.Vector2(
          this.mouseWorld.x - bamboo.basePosition.x,
          this.mouseWorld.z - bamboo.basePosition.z
        );
        if (bendDir.lengthSq() > 0.001) {
          bendDir.normalize();
        }
        bamboo.targetBending.add(bendDir.multiplyScalar(falloff));
      }
    }
  }
}
