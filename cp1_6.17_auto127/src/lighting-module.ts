import * as THREE from 'three';

export type TimeOfDay = 'morning' | 'noon' | 'dusk';

export interface LightState {
  timeOfDay: TimeOfDay;
  colorTemp: number;
  intensity: number;
}

export interface LightParams {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  shadowMapSize: number;
  shadowCameraNear: number;
  shadowCameraFar: number;
}

const TIME_PRESETS: Record<TimeOfDay, { sunAngle: number; baseTemp: number; baseIntensity: number }> = {
  morning: { sunAngle: 15, baseTemp: 3500, baseIntensity: 0.9 },
  noon: { sunAngle: 85, baseTemp: 5500, baseIntensity: 1.5 },
  dusk: { sunAngle: 15, baseTemp: 3000, baseIntensity: 0.7 }
};

export class LightingModule {
  private scene: THREE.Scene;
  private state: LightState;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.state = {
      timeOfDay: 'noon',
      colorTemp: 4500,
      intensity: 1.0
    };

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.directionalLight.shadow.bias = -0.0005;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);
    this.scene.add(this.ambientLight);

    this.updateLights();
  }

  getState(): LightState {
    return { ...this.state };
  }

  setTimeOfDay(time: TimeOfDay): void {
    this.state.timeOfDay = time;
    this.updateLights();
    this.dispatchEvent();
  }

  setColorTemp(temp: number): void {
    this.state.colorTemp = Math.max(2700, Math.min(6500, temp));
    this.updateLights();
    this.dispatchEvent();
  }

  setIntensity(intensity: number): void {
    this.state.intensity = Math.max(0.5, Math.min(2.0, intensity));
    this.updateLights();
    this.dispatchEvent();
  }

  getLightParams(): LightParams {
    const preset = TIME_PRESETS[this.state.timeOfDay];
    const angleRad = (preset.sunAngle * Math.PI) / 180;

    let x = 0;
    let y = Math.sin(angleRad);
    let z = -Math.cos(angleRad);

    if (this.state.timeOfDay === 'morning') {
      x = Math.cos(angleRad) * 0.5;
      z = -Math.sin(angleRad) * 0.3;
      y = Math.sin(angleRad);
    } else if (this.state.timeOfDay === 'dusk') {
      x = -Math.cos(angleRad) * 0.5;
      z = -Math.sin(angleRad) * 0.3;
      y = Math.sin(angleRad);
    } else {
      x = 0;
      z = -0.1;
      y = 1;
    }

    const sunColor = this.tempToColor(this.state.colorTemp);
    const ambientColor = this.tempToColor(this.state.colorTemp + 500);
    const intensityMultiplier = this.state.intensity;
    const baseIntensity = preset.baseIntensity;

    return {
      sunDirection: new THREE.Vector3(x, y, z).normalize(),
      sunColor,
      sunIntensity: baseIntensity * intensityMultiplier,
      ambientColor,
      ambientIntensity: 0.8 * intensityMultiplier,
      shadowMapSize: 2048,
      shadowCameraNear: 0.5,
      shadowCameraFar: 50
    };
  }

  private tempToColor(temp: number): THREE.Color {
    const color = new THREE.Color();
    const t = (temp - 2700) / (6500 - 2700);
    const r = 1.0;
    const g = 0.6 + 0.4 * t;
    const b = 0.3 + 0.7 * t;
    color.setRGB(r, g, b);
    return color;
  }

  private updateLights(): void {
    const params = this.getLightParams();

    const distance = 20;
    this.directionalLight.position.copy(params.sunDirection).multiplyScalar(distance);
    this.directionalLight.target.position.set(0, 1, 0);
    this.directionalLight.color.copy(params.sunColor);
    this.directionalLight.intensity = params.sunIntensity;

    this.ambientLight.color.copy(params.ambientColor);
    this.ambientLight.intensity = params.ambientIntensity;

    this.directionalLight.target.updateMatrixWorld();
  }

  private dispatchEvent(): void {
    const event = new CustomEvent('lightChanged', {
      detail: { state: { ...this.state }, params: this.getLightParams() }
    });
    document.dispatchEvent(event);
  }
}
