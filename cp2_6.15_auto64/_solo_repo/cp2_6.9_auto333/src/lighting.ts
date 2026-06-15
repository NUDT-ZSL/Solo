import * as THREE from 'three';

export type LightType = 'point' | 'directional' | 'spot';

export interface LightConfig {
  id: string;
  name: string;
  type: LightType;
  position: THREE.Vector3;
  color: string;
  intensity: number;
  angle?: number;
  decay?: number;
  penumbra?: number;
  targetPosition?: THREE.Vector3;
}

export class LightingManager {
  lights: Map<string, THREE.Light> = new Map();
  markers: Map<string, THREE.Mesh> = new Map();
  configs: Map<string, LightConfig> = new Map();
  private scene: THREE.Scene;
  private markerGeometry: THREE.SphereGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.markerGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  }

  addLight(config: LightConfig): void {
    this.configs.set(config.id, { ...config, position: config.position.clone() });
    this.createLight(config);
    this.createMarker(config);
  }

  private createLight(config: LightConfig): void {
    this.removeLightObject(config.id);

    let light: THREE.Light;
    const color = new THREE.Color(config.color);

    switch (config.type) {
      case 'point':
        light = new THREE.PointLight(color, config.intensity, 50, config.decay ?? 1);
        light.position.copy(config.position);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(color, config.intensity);
        light.position.copy(config.position);
        if (light instanceof THREE.DirectionalLight) {
          light.target.position.set(0, 0, 0);
          this.scene.add(light.target);
        }
        break;
      case 'spot':
        light = new THREE.SpotLight(color, config.intensity, 50,
          (config.angle ?? 30) * Math.PI / 180,
          config.penumbra ?? 0.3,
          config.decay ?? 2);
        light.position.copy(config.position);
        if (light instanceof THREE.SpotLight) {
          light.target.position.set(0, 0, 0);
          this.scene.add(light.target);
        }
        break;
    }

    light.castShadow = true;
    this.configureShadow(light, config.type);

    this.lights.set(config.id, light);
    this.scene.add(light);
  }

  private configureShadow(light: THREE.Light, type: LightType): void {
    const mapSize = 2048;

    if (light instanceof THREE.DirectionalLight) {
      light.shadow.mapSize.width = mapSize;
      light.shadow.mapSize.height = mapSize;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 30;
      light.shadow.camera.left = -5;
      light.shadow.camera.right = 5;
      light.shadow.camera.top = 5;
      light.shadow.camera.bottom = -5;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
    } else if (light instanceof THREE.SpotLight) {
      light.shadow.mapSize.width = mapSize;
      light.shadow.mapSize.height = mapSize;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 30;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
    } else if (light instanceof THREE.PointLight) {
      light.shadow.mapSize.width = mapSize;
      light.shadow.mapSize.height = mapSize;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 30;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
    }
  }

  private createMarker(config: LightConfig): void {
    const existing = this.markers.get(config.id);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      (existing.material as THREE.Material).dispose();
    }

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: 0.85
    });

    const marker = new THREE.Mesh(this.markerGeometry, material);
    marker.position.copy(config.position);

    this.markers.set(config.id, marker);
    this.scene.add(marker);
  }

  private removeLightObject(id: string): void {
    const existing = this.lights.get(id);
    if (existing) {
      this.scene.remove(existing);
      if (existing instanceof THREE.DirectionalLight || existing instanceof THREE.SpotLight) {
        this.scene.remove(existing.target);
      }
      existing.dispose?.();
      this.lights.delete(id);
    }
  }

  updateLightPosition(id: string, x: number, y: number, z: number): void {
    const config = this.configs.get(id);
    const light = this.lights.get(id);
    const marker = this.markers.get(id);

    if (config) {
      config.position.set(x, y, z);
    }
    if (light) {
      light.position.set(x, y, z);
    }
    if (marker) {
      marker.position.set(x, y, z);
    }
  }

  updateLightColor(id: string, color: string): void {
    const config = this.configs.get(id);
    const light = this.lights.get(id);
    const marker = this.markers.get(id);
    const threeColor = new THREE.Color(color);

    if (config) {
      config.color = color;
    }
    if (light) {
      light.color.copy(threeColor);
    }
    if (marker) {
      (marker.material as THREE.MeshBasicMaterial).color.copy(threeColor);
    }
  }

  updateLightIntensity(id: string, intensity: number): void {
    const config = this.configs.get(id);
    const light = this.lights.get(id);

    if (config) {
      config.intensity = intensity;
    }
    if (light) {
      light.intensity = intensity;
    }
  }

  changeLightType(id: string, type: LightType): void {
    const config = this.configs.get(id);
    if (!config) return;

    config.type = type;
    this.createLight(config);
    this.createMarker(config);
  }

  getLightConfigs(): LightConfig[] {
    return Array.from(this.configs.values());
  }

  getLight(id: string): THREE.Light | undefined {
    return this.lights.get(id);
  }

  updateLightAngle(id: string, angle: number): void {
    const config = this.configs.get(id);
    const light = this.lights.get(id);

    if (config) {
      config.angle = angle;
    }
    if (light instanceof THREE.SpotLight) {
      light.angle = angle * Math.PI / 180;
    }
  }

  updateLightDecay(id: string, decay: number): void {
    const config = this.configs.get(id);
    const light = this.lights.get(id);

    if (config) {
      config.decay = decay;
    }
    if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
      light.decay = decay;
    }
  }
}
