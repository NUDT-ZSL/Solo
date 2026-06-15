import * as THREE from 'three';

export interface LightPreset {
  name: string;
  ambient: THREE.Color;
  point: THREE.Color;
  bottle: THREE.Color;
}

export const LIGHT_PRESETS: LightPreset[] = [
  {
    name: '暖橙',
    ambient: new THREE.Color(0xff7733),
    point: new THREE.Color(0xffaa44),
    bottle: new THREE.Color(0x442200)
  },
  {
    name: '熔岩红',
    ambient: new THREE.Color(0xff3322),
    point: new THREE.Color(0xff5533),
    bottle: new THREE.Color(0x330000)
  },
  {
    name: '金黄',
    ambient: new THREE.Color(0xffcc33),
    point: new THREE.Color(0xffee66),
    bottle: new THREE.Color(0x332200)
  },
  {
    name: '粉红',
    ambient: new THREE.Color(0xff66aa),
    point: new THREE.Color(0xff99cc),
    bottle: new THREE.Color(0x330022)
  },
  {
    name: '青蓝',
    ambient: new THREE.Color(0x3399ff),
    point: new THREE.Color(0x66ccff),
    bottle: new THREE.Color(0x001133)
  }
];

export class LightsController {
  public ambientLight: THREE.AmbientLight;
  public pointLight: THREE.PointLight;
  public rimLight: THREE.DirectionalLight;
  
  private currentPreset = 0;
  private targetAmbient = new THREE.Color();
  private targetPoint = new THREE.Color();
  private currentAmbient = new THREE.Color();
  private currentPoint = new THREE.Color();
  private transitionProgress = 1;
  private transitionDuration = 1.0;
  private transitioning = false;
  
  constructor(scene: THREE.Scene) {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(this.ambientLight);
    
    this.pointLight = new THREE.PointLight(0xffaa44, 2.0, 20, 1.5);
    this.pointLight.position.set(0, -2.5, 0);
    scene.add(this.pointLight);
    
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    this.rimLight.position.set(3, 2, 3);
    scene.add(this.rimLight);
    
    this.setPreset(0);
    this.currentAmbient.copy(this.targetAmbient);
    this.currentPoint.copy(this.targetPoint);
    this.ambientLight.color.copy(this.currentAmbient);
    this.pointLight.color.copy(this.currentPoint);
  }
  
  public get currentPresetIndex(): number {
    return this.currentPreset;
  }
  
  public get presets(): LightPreset[] {
    return LIGHT_PRESETS;
  }
  
  public setPreset(index: number): void {
    if (index < 0 || index >= LIGHT_PRESETS.length) return;
    
    this.currentPreset = index;
    const preset = LIGHT_PRESETS[index];
    this.targetAmbient.copy(preset.ambient);
    this.targetPoint.copy(preset.point);
    this.currentAmbient.copy(this.ambientLight.color);
    this.currentPoint.copy(this.pointLight.color);
    this.transitionProgress = 0;
    this.transitioning = true;
  }
  
  public setTemperature(temperature: number): void {
    const t = Math.max(0, Math.min(100, temperature));
    this.pointLight.intensity = 1.0 + (t / 100) * 2.5;
  }
  
  public update(deltaTime: number): void {
    if (this.transitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.transitioning = false;
      }
      
      const t = this.easeInOutCubic(this.transitionProgress);
      
      this.ambientLight.color.lerpColors(this.currentAmbient, this.targetAmbient, t);
      this.pointLight.color.lerpColors(this.currentPoint, this.targetPoint, t);
      
      const ambientIntensity = 0.25 + t * 0.1;
      this.ambientLight.intensity = ambientIntensity;
    }
  }
  
  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  
  public getBottleColor(): THREE.Color {
    return LIGHT_PRESETS[this.currentPreset].bottle;
  }
}
