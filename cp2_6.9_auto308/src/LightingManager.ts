import * as THREE from 'three';

export class LightingManager {
  private scene: THREE.Scene;
  private light1: THREE.PointLight;
  private light2: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;

  private light1Helper?: THREE.PointLightHelper;
  private light2Helper?: THREE.PointLightHelper;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(0x222244, 0.4);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x444488, 0x111122, 0.3);
    this.scene.add(this.hemisphereLight);

    this.light1 = new THREE.PointLight(0xffffff, 2, 30, 2);
    this.light1.castShadow = true;
    this.light1.shadow.mapSize.width = 1024;
    this.light1.shadow.mapSize.height = 1024;
    this.scene.add(this.light1);

    this.light2 = new THREE.PointLight(0xCCE0FF, 1.5, 25, 2);
    this.light2.castShadow = false;
    this.scene.add(this.light2);

    const glow1 = this.createLightGlow(0xffffff, 0.5);
    this.light1.add(glow1);

    const glow2 = this.createLightGlow(0xCCE0FF, 0.4);
    this.light2.add(glow2);
  }

  private createLightGlow(color: number, opacity: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Mesh(geometry, material);
  }

  showHelpers(show: boolean = true): void {
    if (show) {
      if (!this.light1Helper) {
        this.light1Helper = new THREE.PointLightHelper(this.light1, 0.5);
        this.scene.add(this.light1Helper);
      }
      if (!this.light2Helper) {
        this.light2Helper = new THREE.PointLightHelper(this.light2, 0.5);
        this.scene.add(this.light2Helper);
      }
    } else {
      if (this.light1Helper) {
        this.scene.remove(this.light1Helper);
        this.light1Helper = undefined;
      }
      if (this.light2Helper) {
        this.scene.remove(this.light2Helper);
        this.light2Helper = undefined;
      }
    }
  }

  update(t: number): void {
    const angle1 = (t / 30) * Math.PI * 2;
    this.light1.position.x = Math.cos(angle1) * 8;
    this.light1.position.z = Math.sin(angle1) * 8;
    this.light1.position.y = 2 + Math.sin(angle1 * 2) * 1;

    const angle2 = -(t / 30) * Math.PI * 2;
    this.light2.position.x = Math.cos(angle2) * 5;
    this.light2.position.z = Math.sin(angle2) * 5;
    this.light2.position.y = -1.5 + Math.cos(angle2 * 1.5) * 0.8;

    const flicker1 = 0.9 + Math.sin(t * 3.7) * 0.1;
    const flicker2 = 0.85 + Math.sin(t * 4.3 + 1.5) * 0.15;
    this.light1.intensity = 2 * flicker1;
    this.light2.intensity = 1.5 * flicker2;
  }

  setLightIntensity(multiplier: number): void {
    this.light1.intensity = 2 * multiplier;
    this.light2.intensity = 1.5 * multiplier;
  }
}
