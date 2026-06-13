import * as THREE from 'three';
import { TimeConfig } from '@/types';
import { eventBus } from '@/core/EventBus';
import { BuildingGenerator } from '@/building/BuildingGenerator';

export class TimeCycle {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private buildingGroup: THREE.Group;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;

  private currentHour: number = 12;
  private buildingGenerator: BuildingGenerator | null = null;

  private skyColors: { [key: string]: THREE.Color } = {
    dawn: new THREE.Color(0xff9a3c),
    morning: new THREE.Color(0xffc87c),
    noon: new THREE.Color(0x87ceeb),
    afternoon: new THREE.Color(0x87ceeb),
    dusk: new THREE.Color(0x8b5cf6),
    night: new THREE.Color(0x0a0a1e),
    midnight: new THREE.Color(0x050510)
  };

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    buildingGroup: THREE.Group
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.buildingGroup = buildingGroup;

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2a2a3e, 0.4);
    this.scene.add(this.hemisphereLight);

    this.registerEvents();
    this.applyTime(this.currentHour);
  }

  public setBuildingGenerator(generator: BuildingGenerator): void {
    this.buildingGenerator = generator;
  }

  private registerEvents(): void {
    eventBus.on('config:time', (config: TimeConfig) => {
      this.currentHour = config.hour;
      this.applyTime(this.currentHour);
    });
  }

  private applyTime(hour: number): void {
    this.updateSunPosition(hour);
    this.updateSkyColor(hour);
    this.updateLightIntensity(hour);
    this.updateWindowLights(hour);
    this.updateGroundReflection(hour);
  }

  private updateSunPosition(hour: number): void {
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunElevation = Math.sin(sunAngle);
    const sunAzimuth = Math.cos(sunAngle);

    const distance = 120;
    this.sunLight.position.set(
      sunAzimuth * distance,
      Math.max(sunElevation * distance, 5),
      -distance * 0.3
    );
    this.sunLight.target.position.set(0, 0, 0);
  }

  private updateSkyColor(hour: number): void {
    let skyColor: THREE.Color;

    if (hour >= 5 && hour < 7) {
      const t = (hour - 5) / 2;
      skyColor = this.skyColors.dawn.clone().lerp(this.skyColors.morning, t);
    } else if (hour >= 7 && hour < 10) {
      const t = (hour - 7) / 3;
      skyColor = this.skyColors.morning.clone().lerp(this.skyColors.noon, t);
    } else if (hour >= 10 && hour < 14) {
      skyColor = this.skyColors.noon.clone();
    } else if (hour >= 14 && hour < 17) {
      const t = (hour - 14) / 3;
      skyColor = this.skyColors.noon.clone().lerp(this.skyColors.dusk, t);
    } else if (hour >= 17 && hour < 19) {
      const t = (hour - 17) / 2;
      skyColor = this.skyColors.dusk.clone().lerp(this.skyColors.night, t);
    } else if (hour >= 19 && hour < 21) {
      const t = (hour - 19) / 2;
      skyColor = this.skyColors.night.clone().lerp(this.skyColors.midnight, t);
    } else if (hour >= 21 || hour < 3) {
      skyColor = this.skyColors.midnight.clone();
    } else {
      const t = (hour - 3) / 2;
      skyColor = this.skyColors.midnight.clone().lerp(this.skyColors.dawn, Math.max(0, t));
    }

    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor, 0.003);

    if (hour >= 5 && hour < 19) {
      this.hemisphereLight.color.copy(skyColor);
      this.hemisphereLight.groundColor.set(0x2a2a3e);
    } else {
      this.hemisphereLight.color.set(0x0a0a2e);
      this.hemisphereLight.groundColor.set(0x050510);
    }
  }

  private updateLightIntensity(hour: number): void {
    let sunIntensity: number;
    let ambientIntensity: number;
    let sunColor: THREE.Color;

    if (hour >= 6 && hour < 8) {
      const t = (hour - 6) / 2;
      sunIntensity = 0.3 + t * 1.2;
      ambientIntensity = 0.2 + t * 0.3;
      sunColor = new THREE.Color(0xff9a3c).lerp(new THREE.Color(0xffffff), t);
    } else if (hour >= 8 && hour < 16) {
      sunIntensity = 1.5;
      ambientIntensity = 0.5;
      sunColor = new THREE.Color(0xffffff);
    } else if (hour >= 16 && hour < 18) {
      const t = (hour - 16) / 2;
      sunIntensity = 1.5 - t * 1.0;
      ambientIntensity = 0.5 - t * 0.3;
      sunColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0xff6b4a), t);
    } else if (hour >= 18 && hour < 20) {
      const t = (hour - 18) / 2;
      sunIntensity = 0.5 - t * 0.4;
      ambientIntensity = 0.2 - t * 0.1;
      sunColor = new THREE.Color(0xff6b4a).lerp(new THREE.Color(0x4a2a6a), t);
    } else {
      sunIntensity = 0.05;
      ambientIntensity = 0.08;
      sunColor = new THREE.Color(0x1a1a4e);
    }

    this.sunLight.intensity = sunIntensity;
    this.sunLight.color.copy(sunColor);
    this.ambientLight.intensity = ambientIntensity;
    this.ambientLight.color.copy(hour >= 6 && hour < 18 ? sunColor : new THREE.Color(0x1a1a3e));

    if (hour >= 19 || hour < 5) {
      this.renderer.toneMappingExposure = 0.6;
    } else if (hour >= 5 && hour < 7) {
      this.renderer.toneMappingExposure = 0.6 + ((hour - 5) / 2) * 0.4;
    } else {
      this.renderer.toneMappingExposure = 1.0;
    }
  }

  private updateWindowLights(hour: number): void {
    let lightIntensity = 0;

    if (hour >= 19 || hour < 5) {
      lightIntensity = 1.0;
    } else if (hour >= 18 && hour < 19) {
      lightIntensity = (hour - 18) / 1;
    } else if (hour >= 5 && hour < 6) {
      lightIntensity = 1.0 - (hour - 5) / 1;
    }

    if (this.buildingGenerator) {
      this.buildingGenerator.setWindowLights(lightIntensity);
    }
  }

  private updateGroundReflection(hour: number): void {
    const ground = this.scene.children.find(
      (child) => child instanceof THREE.Mesh && child.userData.isGround !== true
    );

    this.buildingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.position.y < 0.1 && child.geometry.type === 'PlaneGeometry') {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (hour >= 19 || hour < 5) {
          mat.metalness = 0.4;
          mat.roughness = 0.5;
        } else {
          mat.metalness = 0.1;
          mat.roughness = 0.9;
        }
      }
    });
  }

  public update(delta: number): void {
  }

  public getCurrentHour(): number {
    return this.currentHour;
  }
}
