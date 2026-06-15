import * as THREE from 'three';

export interface LightingParams {
  azimuth: number;
  elevation: number;
  ambientIntensity: number;
}

const COLOR_WARM = new THREE.Color(0xffd700);
const COLOR_COOL = new THREE.Color(0x87ceeb);
const LIGHT_DISTANCE = 120;

export class LightingControls {
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private lightGroup: THREE.Group;
  private targetObj: THREE.Object3D;
  private hemisphereLight: THREE.HemisphereLight;
  private currentParams: LightingParams = { azimuth: 45, elevation: 45, ambientIntensity: 0.6 };

  constructor() {
    this.lightGroup = new THREE.Group();
    this.lightGroup.name = 'lighting';

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.ambientLight.name = 'ambientLight';
    this.lightGroup.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2e3440, 0.4);
    this.hemisphereLight.name = 'hemisphereLight';
    this.lightGroup.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffd700, 1.4);
    this.directionalLight.name = 'directionalLight';
    this.directionalLight.castShadow = true;

    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 350;
    this.directionalLight.shadow.camera.left = -120;
    this.directionalLight.shadow.camera.right = 120;
    this.directionalLight.shadow.camera.top = 120;
    this.directionalLight.shadow.camera.bottom = -120;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.directionalLight.shadow.radius = 4;

    this.targetObj = new THREE.Object3D();
    this.targetObj.position.set(0, 0, 0);
    this.directionalLight.target = this.targetObj;

    this.lightGroup.add(this.targetObj);
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

    this.directionalLight.position.set(x, Math.max(8, y), z);
    this.targetObj.position.set(0, 0, 0);

    const angleProgress = (params.azimuth % 360) / 360;
    const wave = (Math.sin(angleProgress * Math.PI * 2) + 1) / 2;

    const dirColor = new THREE.Color().lerpColors(COLOR_WARM, COLOR_COOL, wave);
    this.directionalLight.color.copy(dirColor);

    const elevationFactor = Math.sin(elevationRad);
    const skyColor = new THREE.Color().lerpColors(COLOR_WARM, COLOR_COOL, wave);
    this.hemisphereLight.color.copy(skyColor);
    this.hemisphereLight.intensity = 0.3 + elevationFactor * 0.4;

    this.ambientLight.intensity = params.ambientIntensity;
    const ambTint = new THREE.Color().lerpColors(
      new THREE.Color(0xfff2cc),
      new THREE.Color(0xcde3ef),
      wave
    );
    this.ambientLight.color.copy(ambTint);
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
