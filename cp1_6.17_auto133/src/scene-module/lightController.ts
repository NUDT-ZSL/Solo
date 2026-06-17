import * as THREE from 'three';
import EventBus, { TimePeriod } from '../EventBus';

interface LightState {
  ambientColor: THREE.Color;
  ambientIntensity: number;
  directionalColor: THREE.Color;
  directionalIntensity: number;
  directionalPosition: THREE.Vector3;
  fillColor: THREE.Color;
  fillIntensity: number;
}

const PERIOD_CONFIGS: Record<TimePeriod, LightState> = {
  morning: {
    ambientColor: new THREE.Color(0xffa07a),
    ambientIntensity: 0.4,
    directionalColor: new THREE.Color(0xff8c00),
    directionalIntensity: 0.6,
    directionalPosition: new THREE.Vector3(3, 2, -3),
    fillColor: new THREE.Color(0xffd4b0),
    fillIntensity: 0.2,
  },
  noon: {
    ambientColor: new THREE.Color(0xfffacd),
    ambientIntensity: 0.6,
    directionalColor: new THREE.Color(0xffffff),
    directionalIntensity: 1.2,
    directionalPosition: new THREE.Vector3(0, 4, -2),
    fillColor: new THREE.Color(0xe0ffff),
    fillIntensity: 0.3,
  },
  dusk: {
    ambientColor: new THREE.Color(0xdda0dd),
    ambientIntensity: 0.3,
    directionalColor: new THREE.Color(0xff69b4),
    directionalIntensity: 0.5,
    directionalPosition: new THREE.Vector3(-3, 1.5, -3),
    fillColor: new THREE.Color(0xffb6c1),
    fillIntensity: 0.15,
  },
  night: {
    ambientColor: new THREE.Color(0x191970),
    ambientIntensity: 0.15,
    directionalColor: new THREE.Color(0x4169e1),
    directionalIntensity: 0.2,
    directionalPosition: new THREE.Vector3(2, 1, 2),
    fillColor: new THREE.Color(0x2a2a5a),
    fillIntensity: 0.08,
  },
};

export class LightController {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private fillLight: THREE.PointLight;
  private currentPeriod: TimePeriod = 'noon';
  private targetState: LightState;
  private currentState: LightState;
  private transitionActive: boolean = false;
  private transitionStart: number = 0;
  private transitionDuration: number = 1.5;
  private userIntensity: number = 1.0;
  private userTemperature: number = 5500;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.left = -4;
    this.directionalLight.shadow.camera.right = 4;
    this.directionalLight.shadow.camera.top = 5;
    this.directionalLight.shadow.camera.bottom = -1;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 20;
    this.directionalLight.shadow.bias = -0.001;
    this.directionalLight.shadow.normalBias = 0.02;
    this.directionalLight.shadow.radius = 4;
    this.scene.add(this.directionalLight);
    this.fillLight = new THREE.PointLight(0xffffff, 0.3, 15);
    this.fillLight.position.set(0, 3, 0);
    this.scene.add(this.fillLight);

    const initial = PERIOD_CONFIGS.noon;
    this.targetState = this.cloneState(initial);
    this.currentState = this.cloneState(initial);
    this.applyState(this.currentState);
    this.bindEvents();
  }

  private cloneState(state: LightState): LightState {
    return {
      ambientColor: state.ambientColor.clone(),
      ambientIntensity: state.ambientIntensity,
      directionalColor: state.directionalColor.clone(),
      directionalIntensity: state.directionalIntensity,
      directionalPosition: state.directionalPosition.clone(),
      fillColor: state.fillColor.clone(),
      fillIntensity: state.fillIntensity,
    };
  }

  private applyState(state: LightState): void {
    const intensityMul = this.userIntensity;
    this.ambientLight.color.copy(state.ambientColor);
    this.ambientLight.intensity = state.ambientIntensity * intensityMul;
    this.directionalLight.color.copy(this.applyColorTemperature(state.directionalColor));
    this.directionalLight.intensity = state.directionalIntensity * intensityMul;
    this.directionalLight.position.copy(state.directionalPosition);
    this.fillLight.color.copy(state.fillColor);
    this.fillLight.intensity = state.fillIntensity * intensityMul;
  }

  private applyColorTemperature(baseColor: THREE.Color): THREE.Color {
    const temp = this.userTemperature;
    const kelvin = temp / 100;
    let r: number, g: number, b: number;
    if (kelvin <= 66) {
      r = 255;
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(kelvin) - 161.1195681661));
    } else {
      r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(kelvin - 60, -0.1332047592)));
      g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(kelvin - 60, -0.0755148492)));
    }
    if (kelvin >= 66) {
      b = 255;
    } else if (kelvin <= 19) {
      b = 0;
    } else {
      b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(kelvin - 10) - 305.0447927307));
    }
    const tempColor = new THREE.Color(r / 255, g / 255, b / 255);
    return baseColor.clone().lerp(tempColor, 0.4);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private lerpState(from: LightState, to: LightState, t: number): LightState {
    const eased = this.easeInOutCubic(t);
    return {
      ambientColor: from.ambientColor.clone().lerp(to.ambientColor, eased),
      ambientIntensity: from.ambientIntensity + (to.ambientIntensity - from.ambientIntensity) * eased,
      directionalColor: from.directionalColor.clone().lerp(to.directionalColor, eased),
      directionalIntensity: from.directionalIntensity + (to.directionalIntensity - from.directionalIntensity) * eased,
      directionalPosition: from.directionalPosition.clone().lerp(to.directionalPosition, eased),
      fillColor: from.fillColor.clone().lerp(to.fillColor, eased),
      fillIntensity: from.fillIntensity + (to.fillIntensity - from.fillIntensity) * eased,
    };
  }

  private bindEvents(): void {
    this.eventBus.on('TIME_PERIOD_CHANGE', (data) => {
      this.setPeriod(data.period);
    });
    this.eventBus.on('COLOR_TEMP_CHANGE', (data) => {
      this.userTemperature = data.temperature;
      this.applyState(this.currentState);
    });
    this.eventBus.on('LIGHT_INTENSITY_CHANGE', (data) => {
      this.userIntensity = data.intensity;
      this.applyState(this.currentState);
    });
  }

  public setPeriod(period: TimePeriod): void {
    if (period === this.currentPeriod && !this.transitionActive) return;
    this.currentPeriod = period;
    this.targetState = this.cloneState(PERIOD_CONFIGS[period]);
    this.transitionActive = true;
    this.transitionStart = performance.now();
  }

  public update(): void {
    if (this.transitionActive) {
      const elapsed = (performance.now() - this.transitionStart) / 1000;
      const t = Math.min(elapsed / this.transitionDuration, 1);
      this.currentState = this.lerpState(this.currentState, this.targetState, 0.05);
      this.applyState(this.currentState);
      if (t >= 1) {
        this.transitionActive = false;
        this.currentState = this.cloneState(this.targetState);
        this.applyState(this.currentState);
      }
    }
  }
}

export default LightController;
