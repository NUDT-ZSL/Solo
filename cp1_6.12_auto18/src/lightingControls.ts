import * as THREE from 'three';

export interface LightingParams {
  azimuth: number;
  elevation: number;
  ambientIntensity: number;
}

const COLOR_WARM = new THREE.Color(0xffd700);
const COLOR_COOL = new THREE.Color(0x87ceeb);
const LIGHT_DISTANCE = 100;

export class LightingControls {
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private lightGroup: THREE.Group;
  private currentParams: LightingParams = { azimuth: 45, elevation: 45, ambientIntensity: 0.6 };

  constructor() {
    this.lightGroup = new THREE.Group();
    this.lightGroup.name = 'lighting';

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.ambientLight.name = 'ambientLight';
    this.lightGroup.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.name = 'directionalLight';
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 300;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    this.directionalLight.shadow.bias = -0.001;

    this.lightGroup.add(this.directionalLight);

    this.update(this.currentParams);
  }

  update(params: LightingParams): void {
    this.currentParams = params;

    const azimuthRad = THREE.MathUtils.degToRad(params.azimuth);
    const elevationRad = THREE.MathUtils.degToRad(params.elevation);

    const x = LIGHT_DISTANCE * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = LIGHT_DISTANCE * Math.sin(elevationRad);
    const z = LIGHT_DISTANCE * Math.cos(elevationRad) * Math.cos(azimuthRad);

    this.directionalLight.position.set(x, Math.max(5, y), z);
    this.directionalLight.target.position.set(0, 0, 0);

    const colorT = (Math.sin(THREE.MathUtils.degToRad(params.azimuth)) + 1) / 2;
    const lightColor = new THREE.Color().lerpColors(COLOR_WARM, COLOR_COOL, colorT);
    this.directionalLight.color.copy(lightColor);

    this.ambientLight.intensity = params.ambientIntensity;

    const ambientTint = new THREE.Color().lerpColors(COLOR_WARM, COLOR_COOL, colorT);
    this.ambientLight.color.copy(ambientTint);
    this.ambientLight.color.lerp(new THREE.Color(0xffffff), 0.5);
  }

  getLights(): { ambient: THREE.AmbientLight; directional: THREE.DirectionalLight } {
    return { ambient: this.ambientLight, directional: this.directionalLight };
  }

  getGroup(): THREE.Group {
    return this.lightGroup;
  }

  getCurrentParams(): LightingParams {
    return { ...this.currentParams };
  }
}
