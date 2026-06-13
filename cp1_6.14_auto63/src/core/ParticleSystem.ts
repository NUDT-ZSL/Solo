import * as THREE from 'three';
import { eventBus, AppEvents, FluidType, FluidParams } from '../events/EventBus';
import { SimulationEngine, ParticleState } from './SimulationEngine';
import { RendererModule } from '../renderer/Renderer';
import { clamp, lerp, hexToRgb, lerpColor, randomRange } from '../utils/MathUtils';

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

  private baseColors: { bottom: { r: number; g: number; b: number }; top: { r: number; g: number; b: number } } = {
    bottom: hexToRgb('#1a237e'),
    top: hexToRgb('#64b5f6'),
  };

  private targetColors: { bottom: { r: number; g: number; b: number }; top: { r: number; g: number; b: number } } = {
    bottom: hexToRgb('#1a237e'),
    top: hexToRgb('#64b5f6'),
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

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.alphas = new Float32Array(this.particleCount);
    this.randoms = new Float32Array(this.particleCount);

    this.geometry = new THREE.BufferGeometry();
    this.setupAttributes();

    this.material = this.rendererModule.createParticleMaterial(this.currentFluidType);
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

      const height = this.positions[i3 + 1];
      const t = clamp((height + 2) / 4, 0, 1);

      const color = lerpColor(this.baseColors.bottom, this.baseColors.top, t);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.sizes[i] = lerp(0.2, 0.6, t) * this.params.particleSize * 30;
      this.alphas[i] = lerp(0.6, 0.9, t);
      this.randoms[i] = Math.random();
    }
  }

  private setupEventListeners(): void {
    eventBus.on(AppEvents.FLUID_TYPE_CHANGED, this.handleFluidTypeChange.bind(this));
    eventBus.on(AppEvents.PARTICLE_PARAMS_CHANGED, this.handleParticleParamsChanged.bind(this));
    eventBus.on(AppEvents.SIMULATION_PARAMS_CHANGED, this.handleSimulationParamsChanged.bind(this));
    eventBus.on(AppEvents.PARTICLE_COUNT_CHANGED, this.handleParticleCountChanged.bind(this));
  }

  private handleFluidTypeChange(type: FluidType): void {
    this.targetFluidType = type;
    this.transitionProgress = 0;
    this.targetColors = this.getColorsForType(type);

    const newMaterial = this.rendererModule.createParticleMaterial(type);
    if (newMaterial.uniforms && this.material.uniforms) {
      newMaterial.uniforms.uTime.value = this.material.uniforms.uTime.value;
    }

    const oldMaterial = this.material;
    this.material = newMaterial;
    this.points.material = this.material;

    setTimeout(() => {
      oldMaterial.dispose();
    }, 1000);
  }

  private getColorsForType(type: FluidType) {
    switch (type) {
      case 'water':
        return {
          bottom: hexToRgb('#1a237e'),
          top: hexToRgb('#64b5f6'),
        };
      case 'smoke':
        return {
          bottom: hexToRgb('#424242'),
          top: hexToRgb('#e0e0e0'),
        };
      case 'fire':
        return {
          bottom: hexToRgb('#ffeb3b'),
          top: hexToRgb('#f44336'),
        };
    }
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

    eventBus.emit(AppEvents.PARTICLE_COUNT_CHANGED, newCount);
  }

  public update(deltaTime: number): void {
    const state: ParticleState = this.simulationEngine.step(deltaTime);
    this.updateTransitions(deltaTime);
    this.syncFromSimulation(state);
    this.updateVisualProperties();
    this.updateGeometryAttributes();
  }

  private updateTransitions(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
      if (this.transitionProgress >= 1) {
        this.currentFluidType = this.targetFluidType;
        this.baseColors = { ...this.targetColors };
      }
    }
  }

  private syncFromSimulation(state: ParticleState): void {
    const simPositions = state.positions;
    const count = Math.min(this.particleCount * 3, simPositions.length);
    for (let i = 0; i < count; i++) {
      this.positions[i] = simPositions[i];
    }
  }

  private updateVisualProperties(): void {
    const time = performance.now() * 0.001;

    let bottomColor = this.baseColors.bottom;
    let topColor = this.baseColors.top;

    if (this.transitionProgress < 1) {
      const t = this.transitionProgress;
      bottomColor = lerpColor(this.baseColors.bottom, this.targetColors.bottom, t);
      topColor = lerpColor(this.baseColors.top, this.targetColors.top, t);
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const y = this.positions[i3 + 1];
      const heightT = clamp((y + 2) / 4, 0, 1);
      const rand = this.randoms[i];

      const colorOffsetR = (Math.sin(time * 1.3 + rand * 20) * 0.02);
      const colorOffsetG = (Math.sin(time * 1.7 + rand * 25) * 0.02);
      const colorOffsetB = (Math.sin(time * 1.1 + rand * 18) * 0.02);

      const color = lerpColor(bottomColor, topColor, heightT);
      this.colors[i3] = clamp(color.r + colorOffsetR, 0, 1);
      this.colors[i3 + 1] = clamp(color.g + colorOffsetG, 0, 1);
      this.colors[i3 + 2] = clamp(color.b + colorOffsetB, 0, 1);

      const baseSize = lerp(0.2, 0.6, heightT) * this.params.particleSize * 30;
      const sizePulse = 0.3 + Math.sin(time * 2.5 + rand * 30) * 0.3;
      this.sizes[i] = clamp(baseSize * (0.7 + sizePulse), 0.2 * 30, 0.8 * 30);

      const baseAlpha = lerp(0.6, 0.9, heightT);
      const alphaPulse = (Math.sin(time * 2.0 + rand * 22) * 0.02);

      if (this.currentFluidType === 'smoke' || this.targetFluidType === 'smoke') {
        this.alphas[i] = clamp(baseAlpha * 0.6 + alphaPulse, 0.2, 0.7);
      } else if (this.currentFluidType === 'fire' || this.targetFluidType === 'fire') {
        this.alphas[i] = clamp(baseAlpha * (0.7 + heightT * 0.3) + alphaPulse, 0.4, 1.0);
      } else {
        this.alphas[i] = clamp(baseAlpha + alphaPulse, 0.5, 0.95);
      }
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
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
