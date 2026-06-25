import * as THREE from 'three';

export type WeatherMode = 'sunny' | 'cloudy' | 'dusk';

interface WeatherConfig {
  shadowRadius: number;
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
  toneMappingExposure: number;
  backgroundColor: number;
  fogColor: number;
  fogDensity: number;
}

const WEATHER_CONFIGS: Record<WeatherMode, WeatherConfig> = {
  sunny: {
    shadowRadius: 1,
    ambientColor: 0xffecb3,
    ambientIntensity: 0.8,
    directionalColor: 0xfff8e1,
    directionalIntensity: 2.2,
    toneMappingExposure: 1.0,
    backgroundColor: 0x263238,
    fogColor: 0x263238,
    fogDensity: 0.0015,
  },
  cloudy: {
    shadowRadius: 8,
    ambientColor: 0xcfd8dc,
    ambientIntensity: 1.4,
    directionalColor: 0xeceff1,
    directionalIntensity: 0.7,
    toneMappingExposure: 0.85,
    backgroundColor: 0x37474f,
    fogColor: 0x37474f,
    fogDensity: 0.003,
  },
  dusk: {
    shadowRadius: 2,
    ambientColor: 0xffe0b2,
    ambientIntensity: 0.5,
    directionalColor: 0xffab40,
    directionalIntensity: 1.8,
    toneMappingExposure: 0.9,
    backgroundColor: 0x2a1f1a,
    fogColor: 0x2a1f1a,
    fogDensity: 0.002,
  },
};

const TRANSITION_DURATION = 1500;

export class LightController {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private azimuth: number = 45;
  private elevation: number = 45;
  private weather: WeatherMode = 'sunny';
  private onUpdateCallback: (() => void) | null = null;
  private currentConfig: WeatherConfig;
  private targetConfig: WeatherConfig | null = null;
  private transitionStart: number = 0;
  private transitionFrom: WeatherConfig = WEATHER_CONFIGS.sunny;
  private sunDistance: number = 300;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.currentConfig = { ...WEATHER_CONFIGS.sunny };

    this.directionalLight = new THREE.DirectionalLight(0xfff8e1, 2.2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.left = -200;
    this.directionalLight.shadow.camera.right = 200;
    this.directionalLight.shadow.camera.top = 200;
    this.directionalLight.shadow.camera.bottom = -200;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 800;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.directionalLight.shadow.radius = 1;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    this.ambientLight = new THREE.AmbientLight(0xffecb3, 0.8);
    this.scene.add(this.ambientLight);

    this.applySunAngles();
  }

  setOnUpdate(callback: () => void): void {
    this.onUpdateCallback = callback;
  }

  getSunAngles(): { azimuth: number; elevation: number } {
    return { azimuth: this.azimuth, elevation: this.elevation };
  }

  getSunPosition(): THREE.Vector3 {
    const azRad = THREE.MathUtils.degToRad(this.azimuth);
    const elRad = THREE.MathUtils.degToRad(this.elevation);
    const x = this.sunDistance * Math.cos(elRad) * Math.sin(azRad);
    const y = this.sunDistance * Math.sin(elRad);
    const z = this.sunDistance * Math.cos(elRad) * Math.cos(azRad);
    return new THREE.Vector3(x, y, z);
  }

  setAzimuth(value: number): void {
    this.azimuth = value;
    this.applySunAngles();
    this.onUpdateCallback?.();
  }

  setElevation(value: number): void {
    this.elevation = value;
    this.applySunAngles();
    this.onUpdateCallback?.();
  }

  setWeather(mode: WeatherMode): void {
    if (mode === this.weather && !this.targetConfig) return;
    this.weather = mode;
    this.transitionFrom = { ...this.currentConfig };
    this.targetConfig = WEATHER_CONFIGS[mode];
    this.transitionStart = performance.now();
  }

  getWeather(): WeatherMode {
    return this.weather;
  }

  private applySunAngles(): void {
    const pos = this.getSunPosition();
    this.directionalLight.position.copy(pos);
    this.directionalLight.target.position.set(0, 0, 0);
  }

  update(): void {
    if (this.targetConfig) {
      const elapsed = performance.now() - this.transitionStart;
      const t = Math.min(elapsed / TRANSITION_DURATION, 1.0);
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      this.currentConfig.shadowRadius = this.lerp(
        this.transitionFrom.shadowRadius,
        this.targetConfig.shadowRadius,
        eased
      );
      this.currentConfig.ambientIntensity = this.lerp(
        this.transitionFrom.ambientIntensity,
        this.targetConfig.ambientIntensity,
        eased
      );
      this.currentConfig.directionalIntensity = this.lerp(
        this.transitionFrom.directionalIntensity,
        this.targetConfig.directionalIntensity,
        eased
      );
      this.currentConfig.toneMappingExposure = this.lerp(
        this.transitionFrom.toneMappingExposure,
        this.targetConfig.toneMappingExposure,
        eased
      );
      this.currentConfig.fogDensity = this.lerp(
        this.transitionFrom.fogDensity,
        this.targetConfig.fogDensity,
        eased
      );

      this.currentConfig.ambientColor = this.lerpColor(
        this.transitionFrom.ambientColor,
        this.targetConfig.ambientColor,
        eased
      );
      this.currentConfig.backgroundColor = this.lerpColor(
        this.transitionFrom.backgroundColor,
        this.targetConfig.backgroundColor,
        eased
      );
      this.currentConfig.directionalColor = this.lerpColor(
        this.transitionFrom.directionalColor,
        this.targetConfig.directionalColor,
        eased
      );
      this.currentConfig.fogColor = this.lerpColor(
        this.transitionFrom.fogColor,
        this.targetConfig.fogColor,
        eased
      );

      if (t >= 1.0) {
        this.currentConfig = { ...this.targetConfig };
        this.targetConfig = null;
      }

      this.applyConfig();
    }
  }

  private applyConfig(): void {
    this.renderer.toneMappingExposure = this.currentConfig.toneMappingExposure;

    this.ambientLight.color.setHex(this.currentConfig.ambientColor);
    this.ambientLight.intensity = this.currentConfig.ambientIntensity;
    this.directionalLight.color.setHex(this.currentConfig.directionalColor);
    this.directionalLight.intensity = this.currentConfig.directionalIntensity;
    this.directionalLight.shadow.radius = this.currentConfig.shadowRadius;

    (this.scene.background as THREE.Color).setHex(this.currentConfig.backgroundColor);

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(this.currentConfig.fogColor);
      this.scene.fog.density = this.currentConfig.fogDensity;
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return (rr << 16) | (rg << 8) | rb;
  }
}
