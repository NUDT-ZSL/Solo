import * as THREE from 'three';

export class LightingController {
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.directionalLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this.directionalLight.position.set(50, 80, 30);
    this.directionalLight.castShadow = false;
    scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(this.ambientLight);

    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-30, 20, -50);
    scene.add(fillLight);
  }

  update(elapsedTime: number): void {
    const cycleSpeed = 0.02;
    const timeOfDay = (Math.sin(elapsedTime * cycleSpeed) + 1) / 2;

    const sunAngle = timeOfDay * Math.PI;
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.sin(sunAngle) * 80 + 10;
    const sunZ = 30;

    this.directionalLight.position.set(sunX, Math.max(sunY, -20), sunZ);

    const dawnColor = new THREE.Color(0xff8844);
    const noonColor = new THREE.Color(0xffffff);
    const duskColor = new THREE.Color(0xff6633);
    const nightColor = new THREE.Color(0x223355);

    let sunColor: THREE.Color;
    let intensity: number;
    let ambientIntensity: number;

    if (timeOfDay < 0.2) {
      const t = timeOfDay / 0.2;
      sunColor = nightColor.clone().lerp(dawnColor, t);
      intensity = 0.3 + t * 0.7;
      ambientIntensity = 0.2 + t * 0.3;
    } else if (timeOfDay < 0.5) {
      const t = (timeOfDay - 0.2) / 0.3;
      sunColor = dawnColor.clone().lerp(noonColor, t);
      intensity = 1.0 + t * 0.5;
      ambientIntensity = 0.5 + t * 0.3;
    } else if (timeOfDay < 0.8) {
      const t = (timeOfDay - 0.5) / 0.3;
      sunColor = noonColor.clone().lerp(duskColor, t);
      intensity = 1.5 - t * 0.7;
      ambientIntensity = 0.8 - t * 0.4;
    } else {
      const t = (timeOfDay - 0.8) / 0.2;
      sunColor = duskColor.clone().lerp(nightColor, t);
      intensity = 0.8 - t * 0.5;
      ambientIntensity = 0.4 - t * 0.2;
    }

    this.directionalLight.color.copy(sunColor);
    this.directionalLight.intensity = intensity;
    this.ambientLight.intensity = ambientIntensity;
  }

  getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  dispose(): void {
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.ambientLight);
  }
}
