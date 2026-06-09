import * as THREE from 'three';
import { GardenAssets } from './AssetManager';
import { ParticleSystem } from './ParticleSystem';

export interface SeasonState {
  canopyColor: THREE.Color;
  grassColor: THREE.Color;
  skyColor: THREE.Color;
  ambientIntensity: number;
  directionalColor: THREE.Color;
  directionalIntensity: number;
  directionalAngle: { x: number; y: number };
  particleCount: number;
  particleColor: THREE.Color;
  particleAlpha: number;
  seasonName: string;
  thumbColor: string;
}

const SEASON_KEYFRAMES = [
  {
    index: 0,
    name: '春',
    canopy: new THREE.Color(0x32cd32),
    grass: new THREE.Color(0x7cfc00),
    sky: new THREE.Color(0x87ceeb),
    ambient: 0.55,
    directionalColor: new THREE.Color(0xfffacd),
    directionalIntensity: 0.9,
    sunHeight: 60,
    sunAzimuth: 30,
    particleCount: 100,
    particleColor: new THREE.Color(0xffb6c1),
    particleAlpha: 0.9,
    thumbColor: '#32cd32',
  },
  {
    index: 1,
    name: '夏',
    canopy: new THREE.Color(0x006400),
    grass: new THREE.Color(0x228b22),
    sky: new THREE.Color(0x4682b4),
    ambient: 0.8,
    directionalColor: new THREE.Color(0xfffacd),
    directionalIntensity: 1.1,
    sunHeight: 75,
    sunAzimuth: 0,
    particleCount: 50,
    particleColor: new THREE.Color(0xffc0cb),
    particleAlpha: 0.8,
    thumbColor: '#006400',
  },
  {
    index: 2,
    name: '秋',
    canopy: new THREE.Color(0xffa500),
    grass: new THREE.Color(0xd2b48c),
    sky: new THREE.Color(0x708090),
    ambient: 0.5,
    directionalColor: new THREE.Color(0xf0e0c0),
    directionalIntensity: 0.85,
    sunHeight: 45,
    sunAzimuth: -30,
    particleCount: 200,
    particleColor: new THREE.Color(0xff8c00),
    particleAlpha: 0.95,
    thumbColor: '#ffa500',
  },
  {
    index: 3,
    name: '冬',
    canopy: new THREE.Color(0x8b4513),
    grass: new THREE.Color(0xf5f5f5),
    sky: new THREE.Color(0xb0c4de),
    ambient: 0.3,
    directionalColor: new THREE.Color(0xe0e0ff),
    directionalIntensity: 0.6,
    sunHeight: 30,
    sunAzimuth: -60,
    particleCount: 0,
    particleColor: new THREE.Color(0xffffff),
    particleAlpha: 0,
    thumbColor: '#ffffff',
  },
];

export class SeasonController {
  private assets: GardenAssets;
  private particleSystem: ParticleSystem;
  private currentValue: number = 0;
  private targetValue: number = 0;
  private transitionDuration: number = 300;
  private transitionStart: number = 0;
  private isTransitioning: boolean = false;
  private startValue: number = 0;
  private tempColorA: THREE.Color;
  private tempColorB: THREE.Color;
  private tempColorResult: THREE.Color;

  onUpdate?: (state: SeasonState) => void;

  constructor(assets: GardenAssets, particleSystem: ParticleSystem) {
    this.assets = assets;
    this.particleSystem = particleSystem;
    this.tempColorA = new THREE.Color();
    this.tempColorB = new THREE.Color();
    this.tempColorResult = new THREE.Color();
  }

  setTarget(value: number): void {
    const clamped = Math.max(0, Math.min(3, value));
    if (Math.abs(clamped - this.targetValue) < 0.0001) return;
    this.startValue = this.currentValue;
    this.targetValue = clamped;
    this.transitionStart = performance.now();
    this.isTransitioning = true;
  }

  update(): void {
    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStart;
      const t = Math.min(1, elapsed / this.transitionDuration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.currentValue =
        this.startValue + (this.targetValue - this.startValue) * eased;
      if (t >= 1) {
        this.isTransitioning = false;
        this.currentValue = this.targetValue;
      }
    }

    const state = this.computeState(this.currentValue);
    this.applyState(state);

    if (this.onUpdate) {
      this.onUpdate(state);
    }
  }

  getCurrentValue(): number {
    return this.currentValue;
  }

  private computeState(value: number): SeasonState {
    const normalized = value;

    if (normalized <= 0) {
      return this.kframeToState(SEASON_KEYFRAMES[0], 0);
    }
    if (normalized >= 3) {
      return this.kframeToState(SEASON_KEYFRAMES[3], 3);
    }

    const lowerIdx = Math.floor(normalized);
    const upperIdx = Math.min(3, lowerIdx + 1);
    const localT = normalized - lowerIdx;

    const a = SEASON_KEYFRAMES[lowerIdx];
    const b = SEASON_KEYFRAMES[upperIdx];

    const lerp = (va: number, vb: number) => va + (vb - va) * localT;
    const lerpColor = (ca: THREE.Color, cb: THREE.Color) => {
      this.tempColorResult.copy(ca).lerp(cb, localT);
      return this.tempColorResult.clone();
    };

    return {
      canopyColor: lerpColor(a.canopy, b.canopy),
      grassColor: lerpColor(a.grass, b.grass),
      skyColor: lerpColor(a.sky, b.sky),
      ambientIntensity: lerp(a.ambient, b.ambient),
      directionalColor: lerpColor(a.directionalColor, b.directionalColor),
      directionalIntensity: lerp(a.directionalIntensity, b.directionalIntensity),
      directionalAngle: {
        x: lerp(a.sunHeight, b.sunHeight),
        y: lerp(a.sunAzimuth, b.sunAzimuth),
      },
      particleCount: Math.round(lerp(a.particleCount, b.particleCount)),
      particleColor: lerpColor(a.particleColor, b.particleColor),
      particleAlpha: lerp(a.particleAlpha, b.particleAlpha),
      seasonName: localT < 0.5 ? a.name : b.name,
      thumbColor: localT < 0.5 ? a.thumbColor : b.thumbColor,
    };
  }

  private kframeToState(k: typeof SEASON_KEYFRAMES[0], idx: number): SeasonState {
    return {
      canopyColor: k.canopy.clone(),
      grassColor: k.grass.clone(),
      skyColor: k.sky.clone(),
      ambientIntensity: k.ambient,
      directionalColor: k.directionalColor.clone(),
      directionalIntensity: k.directionalIntensity,
      directionalAngle: { x: k.sunHeight, y: k.sunAzimuth },
      particleCount: k.particleCount,
      particleColor: k.particleColor.clone(),
      particleAlpha: k.particleAlpha,
      seasonName: k.name,
      thumbColor: k.thumbColor,
    };
  }

  private applyState(state: SeasonState): void {
    this.assets.canopyMaterials.forEach((mat) => {
      mat.color.copy(state.canopyColor);
      mat.opacity = 1.0;
      mat.transparent = false;
      if (this.currentValue >= 2.7) {
        const winterT = (this.currentValue - 2.7) / 0.3;
        mat.opacity = 1 - winterT * 0.85;
        mat.transparent = true;
      }
      mat.needsUpdate = true;
    });

    this.assets.grassMaterial.color.copy(state.grassColor);
    this.assets.grassMaterial.needsUpdate = true;

    this.assets.skyMaterial.color.copy(state.skyColor);
    this.assets.skyMaterial.needsUpdate = true;

    this.assets.ambientLight.intensity = state.ambientIntensity;

    this.assets.directionalLight.color.copy(state.directionalColor);
    this.assets.directionalLight.intensity = state.directionalIntensity;

    const heightRad = (state.directionalAngle.x * Math.PI) / 180;
    const azimuthRad = (state.directionalAngle.y * Math.PI) / 180;
    const dist = 15;
    this.assets.directionalLight.position.set(
      Math.cos(heightRad) * Math.sin(azimuthRad) * dist,
      Math.sin(heightRad) * dist,
      Math.cos(heightRad) * Math.cos(azimuthRad) * dist
    );

    this.particleSystem.updateSeason(
      state.particleCount,
      state.particleColor,
      state.particleAlpha
    );
  }
}
