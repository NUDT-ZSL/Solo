import * as THREE from 'three';
import { eventBus, AppEvents, FluidType, FluidParams } from '../events/EventBus';
import { SimulationEngine, ParticleState } from './SimulationEngine';
import { RendererModule } from '../renderer/Renderer';
import { clamp, lerp, hexToRgb, lerpColor, randomRange } from '../utils/MathUtils';

interface FluidVisualPreset {
  bottomColor: { r: number; g: number; b: number };
  topColor: { r: number; g: number; b: number };
  bottomAlpha: number;
  topAlpha: number;
  bottomSize: number;
  topSize: number;
}

const FLUID_VISUAL_PRESETS: Record<FluidType, FluidVisualPreset> = {
  water: {
    bottomColor: hexToRgb('#1a237e'),
    topColor: hexToRgb('#64b5f6'),
    bottomAlpha: 0.6,
    topAlpha: 0.9,
    bottomSize: 0.2,
    topSize: 0.6,
  },
  smoke: {
    bottomColor: hexToRgb('#424242'),
    topColor: hexToRgb('#eeeeee'),
    bottomAlpha: 0.5,
    topAlpha: 0.75,
    bottomSize: 0.3,
    topSize: 0.75,
  },
  fire: {
    bottomColor: hexToRgb('#ffeb3b'),
    topColor: hexToRgb('#f44336'),
    bottomAlpha: 0.7,
    topAlpha: 0.95,
    bottomSize: 0.25,
    topSize: 0.55,
  },
};

export class ParticleSystem {
  private rendererModule: RendererModule;
  private simulationEngine: SimulationEngine;
  private geometry: THREE.BufferGeometry;
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;

  private particleCount: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private randoms: Float32Array;

  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  private alphaAttribute: THREE.BufferAttribute;
  private randomAttribute: THREE.BufferAttribute;

  private currentFluidType: FluidType = 'water';
  private targetFluidType: FluidType = 'water';
  private transitionProgress: number = 1;
  private transitionDuration: number = 0.5;
  private transitionId: number = 0;

  private currentVisual: FluidVisualPreset;
  private targetVisual: FluidVisualPreset;
  private displayMaterialParams: {
    bottomColor: { r: number; g: number; b: number };
    topColor: { r: number; g: number; b: number };
    bottomAlpha: number;
    topAlpha: number;
    bottomSize: number;
    topSize: number;
  };

  private params: FluidParams = {
    particleCount: 3000,
    particleSize: 1.0,
    gravity: -9.8,
    windX: 0,
    windY: 0,
    windZ: 0,
    windStrength: 0,
    vortexRadius: 5,
    vortexStrength: 0,
  };

  constructor(rendererModule: RendererModule) {
    this.rendererModule = rendererModule;
    this.particleCount = this.params.particleCount;
    this.simulationEngine = new SimulationEngine(this.particleCount);

    this.currentVisual = { ...FLUID_VISUAL_PRESETS.water };
    this.targetVisual = { ...FLUID_VISUAL_PRESETS.water };
    this.displayMaterialParams = {
      bottomColor: { ...this.currentVisual.bottomColor },
      topColor: { ...this.currentVisual.topColor },
      bottomAlpha: this.currentVisual.bottomAlpha,
      topAlpha: this.currentVisual.topAlpha,
      bottomSize: this.currentVisual.bottomSize,
      topSize: this.currentVisual.topSize,
    };

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.alphas = new Float32Array(this.particleCount);
    this.randoms = new Float32Array(this.particleCount);

    this.geometry = new THREE.BufferGeometry();
    this.setupAttributes();

    this.material = this.rendererModule.createParticleMaterial(this.currentFluidType);
    this.updateMaterialUniformsForTransition(1);
    this.points = new THREE.Points(this.geometry, this.material);

    this.rendererModule.setParticlePoints(this.points);

    this.initializeParticleData();
    this.setupEventListeners();
    this.updateGeometryAttributes();
  }

  private setupAttributes(): void {
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);
    this.alphaAttribute = new THREE.BufferAttribute(this.alphas, 1);
    this.randomAttribute = new THREE.BufferAttribute(this.randoms, 1);

    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    this.alphaAttribute.setUsage(THREE.DynamicDrawUsage);
    this.randomAttribute.setUsage(THREE.StaticDrawUsage);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('aSize', this.sizeAttribute);
    this.geometry.setAttribute('aAlpha', this.alphaAttribute);
    this.geometry.setAttribute('aRandom', this.randomAttribute);
  }

  private initializeParticleData(): void {
    const simPositions = this.simulationEngine.getPositions();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = simPositions[i3];
      this.positions[i3 + 1] = simPositions[i3 + 1];
      this.positions[i3 + 2] = simPositions[i3 + 2];

      const y = this.positions[i3 + 1];
      const heightT = this.calcHeightT(y);

      const c = this.displayMaterialParams;
      const color = lerpColor(c.bottomColor, c.topColor, heightT);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.sizes[i] = lerp(c.bottomSize, c.topSize, heightT) * this.params.particleSize * 35;

      this.alphas[i] = lerp(c.bottomAlpha, c.topAlpha, heightT);
      this.randoms[i] = Math.random();
    }
  }

  private calcHeightT(y: number): number {
    return clamp((y + 1) / 2, 0, 1);
  }

  private setupEventListeners(): void {
    eventBus.on(AppEvents.FLUID_TYPE_CHANGED, this.handleFluidTypeChange.bind(this));
    eventBus.on(AppEvents.PARTICLE_PARAMS_CHANGED, this.handleParticleParamsChanged.bind(this));
    eventBus.on(AppEvents.SIMULATION_PARAMS_CHANGED, this.handleSimulationParamsChanged.bind(this));
    eventBus.on(AppEvents.PARTICLE_COUNT_CHANGED, this.handleParticleCountChanged.bind(this));
  }

  private handleFluidTypeChange(type: FluidType): void {
    if (type === this.targetFluidType && this.transitionProgress >= 1) return;

    this.currentVisual = {
      bottomColor: { ...this.displayMaterialParams.bottomColor },
      topColor: { ...this.displayMaterialParams.topColor },
      bottomAlpha: this.displayMaterialParams.bottomAlpha,
      topAlpha: this.displayMaterialParams.topAlpha,
      bottomSize: this.displayMaterialParams.bottomSize,
      topSize: this.displayMaterialParams.topSize,
    };

    this.targetFluidType = type;
    this.targetVisual = { ...FLUID_VISUAL_PRESETS[type] };
    this.transitionProgress = 0;
    this.transitionId++;

    const newMaterial = this.rendererModule.createParticleMaterial(type);
    if (newMaterial.uniforms && this.material.uniforms) {
      newMaterial.uniforms.uTime.value = this.material.uniforms.uTime.value;
      if (newMaterial.uniforms.uSizeMultiplier) {
        newMaterial.uniforms.uSizeMultiplier.value = 0.01;
      }
    }

    const oldMaterial = this.material;
    this.material = newMaterial;
    this.points.material = this.material;
    this.updateMaterialUniformsForTransition(0);

    setTimeout(() => {
      oldMaterial.dispose();
    }, 800);
  }

  private handleParticleParamsChanged(params: Partial<FluidParams>): void {
    if (params.particleSize !== undefined) {
      this.params.particleSize = params.particleSize;
    }
    if (params.particleCount !== undefined) {
      this.params.particleCount = params.particleCount;
    }
  }

  private handleSimulationParamsChanged(params: Partial<FluidParams>): void {
    Object.assign(this.params, params);
  }

  private handleParticleCountChanged(newCount: number): void {
    this.rebuildForParticleCount(newCount);
  }

  private rebuildForParticleCount(newCount: number): void {
    if (newCount === this.particleCount) return;

    this.particleCount = newCount;

    this.positions = new Float32Array(newCount * 3);
    this.colors = new Float32Array(newCount * 3);
    this.sizes = new Float32Array(newCount);
    this.alphas = new Float32Array(newCount);
    this.randoms = new Float32Array(newCount);

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.setupAttributes();

    this.initializeParticleData();
    this.points.geometry = this.geometry;
  }

  public update(deltaTime: number): void {
    const state: ParticleState = this.simulationEngine.step(deltaTime);
    this.updateTransitions(deltaTime);
    this.updateMaterialUniformsForTransition(this.transitionProgress);
    this.syncFromSimulation(state);
    this.updateVisualProperties();
    this.updateGeometryAttributes();
  }

  private updateTransitions(deltaTime: number): void {
    if (this.transitionProgress >= 1) return;

    this.transitionProgress = Math.min(
      1,
      this.transitionProgress + deltaTime / this.transitionDuration
    );
    const t = this.transitionProgress;
    const smoothT = t * t * (3 - 2 * t);

    this.displayMaterialParams.bottomColor = lerpColor(
      this.currentVisual.bottomColor,
      this.targetVisual.bottomColor,
      smoothT
    );
    this.displayMaterialParams.topColor = lerpColor(
      this.currentVisual.topColor,
      this.targetVisual.topColor,
      smoothT
    );
    this.displayMaterialParams.bottomAlpha = lerp(
      this.currentVisual.bottomAlpha,
      this.targetVisual.bottomAlpha,
      smoothT
    );
    this.displayMaterialParams.topAlpha = lerp(
      this.currentVisual.topAlpha,
      this.targetVisual.topAlpha,
      smoothT
    );
    this.displayMaterialParams.bottomSize = lerp(
      this.currentVisual.bottomSize,
      this.targetVisual.bottomSize,
      smoothT
    );
    this.displayMaterialParams.topSize = lerp(
      this.currentVisual.topSize,
      this.targetVisual.topSize,
      smoothT
    );

    if (this.material.uniforms && this.material.uniforms.uSizeMultiplier) {
      this.material.uniforms.uSizeMultiplier.value = lerp(0.01, 1.0, smoothT);
    }

    if (this.transitionProgress >= 1) {
      this.currentFluidType = this.targetFluidType;
      this.currentVisual = { ...this.targetVisual };
    }
  }

  private updateMaterialUniformsForTransition(t: number): void {
    if (!this.material.uniforms) return;

    const c = this.displayMaterialParams;
    const u = this.material.uniforms;

    if (u.uBottomColor) {
      u.uBottomColor.value.setRGB(c.bottomColor.r, c.bottomColor.g, c.bottomColor.b);
    }
    if (u.uTopColor) {
      u.uTopColor.value.setRGB(c.topColor.r, c.topColor.g, c.topColor.b);
    }
    if (u.uMiddleColor && this.targetFluidType === 'fire') {
      const middle = lerpColor(c.bottomColor, c.topColor, 0.5);
      u.uMiddleColor.value.setRGB(middle.r, middle.g, middle.b);
    }
    if (u.uBaseColor && (this.targetFluidType === 'smoke' || this.currentFluidType === 'smoke')) {
      const base = lerpColor(c.bottomColor, c.topColor, 0.6);
      u.uBaseColor.value.setRGB(base.r, base.g, base.b);
    }
    if (u.uSizeMultiplier) {
      u.uSizeMultiplier.value = lerp(u.uSizeMultiplier.value, 1.0, 0.08);
    }
  }

  private syncFromSimulation(state: ParticleState): void {
    const simPositions = state.positions;
    const n = Math.min(this.particleCount * 3, simPositions.length);
    for (let i = 0; i < n; i++) {
      this.positions[i] = simPositions[i];
    }
  }

  private updateVisualProperties(): void {
    const c = this.displayMaterialParams;
    const sizeMul = this.params.particleSize * 35;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const y = this.positions[i3 + 1];
      const heightT = this.calcHeightT(y);

      const baseColor = lerpColor(c.bottomColor, c.topColor, heightT);
      const randOffsetR = (Math.random() - 0.5) * 0.02;
      const randOffsetG = (Math.random() - 0.5) * 0.02;
      const randOffsetB = (Math.random() - 0.5) * 0.02;

      this.colors[i3] = clamp(baseColor.r + randOffsetR, 0, 1);
      this.colors[i3 + 1] = clamp(baseColor.g + randOffsetG, 0, 1);
      this.colors[i3 + 2] = clamp(baseColor.b + randOffsetB, 0, 1);

      this.sizes[i] = (0.2 + Math.random() * 0.6) * sizeMul;

      const baseAlpha = lerp(c.bottomAlpha, c.topAlpha, heightT);
      const randAlpha = (Math.random() - 0.5) * 0.02;

      let finalAlpha = baseAlpha + randAlpha;
      if (this.currentFluidType === 'smoke' || this.targetFluidType === 'smoke') {
        finalAlpha *= 0.55 + this.randoms[i] * 0.25;
      } else if (this.currentFluidType === 'fire' || this.targetFluidType === 'fire') {
        finalAlpha *= 0.75 + heightT * 0.35;
      }
      this.alphas[i] = clamp(finalAlpha, 0.05, 1.0);
    }
  }

  private updateGeometryAttributes(): void {
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;
  }

  public getSimulationEngine(): SimulationEngine {
    return this.simulationEngine;
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getCurrentFluidType(): FluidType {
    return this.currentFluidType;
  }

  public setParticleCount(count: number): void {
    this.simulationEngine.setParticleCount(count);
  }

  public reset(): void {
    this.simulationEngine.reset();
    const simPositions = this.simulationEngine.getPositions();
    const n = Math.min(this.particleCount * 3, simPositions.length);
    for (let i = 0; i < n; i++) {
      this.positions[i] = simPositions[i];
    }
    this.updateVisualProperties();
    this.updateGeometryAttributes();
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
