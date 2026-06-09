import * as THREE from 'three';

export class ShadowManager {
  private renderer: THREE.WebGLRenderer | null = null;
  shadowMapSize: number = 2048;

  setupRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  configureLightShadow(light: THREE.Light, mapSize?: number): void {
    const size = mapSize ?? this.shadowMapSize;

    if (light instanceof THREE.DirectionalLight) {
      light.castShadow = true;
      light.shadow.mapSize.width = size;
      light.shadow.mapSize.height = size;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 30;
      light.shadow.camera.left = -5;
      light.shadow.camera.right = 5;
      light.shadow.camera.top = 5;
      light.shadow.camera.bottom = -5;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
      light.shadow.needsUpdate = true;
    } else if (light instanceof THREE.SpotLight) {
      light.castShadow = true;
      light.shadow.mapSize.width = size;
      light.shadow.mapSize.height = size;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 30;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
      light.shadow.needsUpdate = true;
    } else if (light instanceof THREE.PointLight) {
      light.castShadow = true;
      light.shadow.mapSize.width = size;
      light.shadow.mapSize.height = size;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 30;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
      light.shadow.needsUpdate = true;
    }
  }

  setShadowMapSize(size: number): void {
    this.shadowMapSize = size;
  }

  updateAllShadows(lights: Map<string, THREE.Light>): void {
    lights.forEach((light) => {
      this.configureLightShadow(light, this.shadowMapSize);
    });
  }
}
