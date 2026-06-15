import * as THREE from 'three';
import { eventBus } from './EventBus';
import type { EnvironmentState } from './EnvironmentController';

interface ParticleData {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseColor: THREE.Color;
  size: number;
  opacity: number;
  targetOpacity: number;
  fadeStartTime: number;
  active: boolean;
  petalIndex: number;
  curveT: number;
  bloomPhase: number;
}

const MAX_PARTICLES = 1000;
const BASE_PARTICLES = 200;
const BUD_RADIUS = 2;
const BUD_HEIGHT = 3;
const SPIRAL_TURNS = 4;
const PETAL_COUNT = 6;
const PARTICLES_PER_PETAL = 50;
const FADE_DURATION = 500;
const BLOOM_DURATION = 3000;

class ParticleEngine {
  public points: THREE.Points | null = null;
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;

  private particles: ParticleData[] = [];
  private positionAttribute: THREE.Float32BufferAttribute | null = null;
  private colorAttribute: THREE.Float32BufferAttribute | null = null;
  private sizeAttribute: THREE.Float32BufferAttribute | null = null;
  private opacityAttribute: THREE.Float32BufferAttribute | null = null;

  private environment: EnvironmentState = {
    lightAngle: 45,
    windSpeed: 2.5,
    particleDensity: 1,
  };

  private isBlooming: boolean = false;
  private bloomStartTime: number = 0;
  private elapsedTime: number = 0;
  private lastColorUpdate: number = -1;
  private lastWindUpdate: number = -1;
  private debugCount: number = 0;

  private unsubscribes: (() => void)[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
    this.bindEvents();
    console.log('[ParticleEngine] 初始化完成');
  }

  private init(): void {
    const total = Math.min(MAX_PARTICLES, Math.floor(BASE_PARTICLES * this.environment.particleDensity));

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const opacities = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.Float32BufferAttribute(colors, 3);
    this.sizeAttribute = new THREE.Float32BufferAttribute(sizes, 1);
    this.opacityAttribute = new THREE.Float32BufferAttribute(opacities, 1);

    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    this.opacityAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    this.geometry.setAttribute('opacity', this.opacityAttribute);

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.generateSpiralConeParticles(total);
    this.geometry.setDrawRange(0, this.particles.length);

    console.log(`[ParticleEngine] 生成螺旋锥体粒子: 目标数=${BASE_PARTICLES}, 实际=${this.particles.length}, 偏差=${Math.abs(this.particles.length - BASE_PARTICLES) / BASE_PARTICLES * 100}%`);
  }

  private bindEvents(): void {
    this.unsubscribes.push(
      eventBus.on('environment:update', (state: EnvironmentState) => {
        this.handleEnvironmentUpdate(state);
      })
    );
    this.unsubscribes.push(
      eventBus.on('particles:densityChange', (data: { oldDensity: number; newDensity: number; targetCount: number }) => {
        this.handleDensityChange(data.targetCount);
      })
    );
    this.unsubscribes.push(
      eventBus.on('bloom:start', () => {
        this.startBloom();
      })
    );
  }

  private handleEnvironmentUpdate(state: EnvironmentState): void {
    const oldEnv = { ...this.environment };
    this.environment = { ...state };

    if (oldEnv.lightAngle !== state.lightAngle) {
      const hueShift = (state.lightAngle / 360) * 180;
      console.log(
        `[ParticleEngine] 收到光照角度更新: ${oldEnv.lightAngle.toFixed(1)}° → ${state.lightAngle.toFixed(1)}°, ` +
        `应用HSV色相偏移: ${hueShift.toFixed(1)}° (S=0.7, V=0.9)`
      );
      this.lastColorUpdate = state.lightAngle;
      this.updateParticleColors();
    }

    if (oldEnv.windSpeed !== state.windSpeed) {
      const amplitude = state.windSpeed * 0.1;
      console.log(
        `[ParticleEngine] 收到风速更新: ${oldEnv.windSpeed.toFixed(1)} → ${state.windSpeed.toFixed(1)}, ` +
        `X/Z轴正弦偏移振幅: ${amplitude.toFixed(2)}`
      );
      this.lastWindUpdate = state.windSpeed;
    }
  }

  private generateSpiralConeParticles(count: number): void {
    this.particles = [];
    const actualCount = Math.min(count, MAX_PARTICLES);

    for (let i = 0; i < actualCount; i++) {
      const t = i / actualCount;
      const r = (1 - t) * BUD_RADIUS;
      const theta = SPIRAL_TURNS * 2 * Math.PI * t;
      const y = t * BUD_HEIGHT - BUD_HEIGHT * 0.1;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const colorT = t;
      const baseColor = new THREE.Color();
      baseColor.setHSL(
        this.lerp(this.normalizedHue('#4a00e0'), this.normalizedHue('#8e2de2'), colorT),
        0.7,
        0.9
      );

      this.particles.push({
        basePosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        life: 1,
        maxLife: 1,
        baseColor: baseColor.clone(),
        size: 0.15,
        opacity: 1,
        targetOpacity: 1,
        fadeStartTime: 0,
        active: true,
        petalIndex: -1,
        curveT: t,
        bloomPhase: 0,
      });

      if (this.positionAttribute && this.colorAttribute && this.sizeAttribute && this.opacityAttribute) {
        this.positionAttribute.setXYZ(i, x, y, z);
        this.colorAttribute.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
        this.sizeAttribute.setX(i, 0.15);
        this.opacityAttribute.setX(i, 1);
      }
    }

    if (this.positionAttribute) this.positionAttribute.needsUpdate = true;
    if (this.colorAttribute) this.colorAttribute.needsUpdate = true;
    if (this.sizeAttribute) this.sizeAttribute.needsUpdate = true;
    if (this.opacityAttribute) this.opacityAttribute.needsUpdate = true;
  }

  private normalizedHue(hex: string): number {
    const c = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    return hsl.h;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private updateParticleColors(): void {
    if (!this.colorAttribute) return;
    const hueShift = (this.environment.lightAngle / 360) * 180;
    const hueShiftNormalized = hueShift / 360;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const baseHsl = { h: 0, s: 0, l: 0 };
      p.baseColor.getHSL(baseHsl);

      let newHue = baseHsl.h + hueShiftNormalized;
      while (newHue > 1) newHue -= 1;
      while (newHue < 0) newHue += 1;

      const newColor = new THREE.Color();
      newColor.setHSL(newHue, 0.7, 0.9);

      this.colorAttribute.setXYZ(i, newColor.r, newColor.g, newColor.b);
    }

    this.colorAttribute.needsUpdate = true;
  }

  private handleDensityChange(targetCount: number): void {
    console.log(`[ParticleEngine] 粒子密度变化，目标粒子数: ${targetCount}, 当前: ${this.particles.length}`);
    const now = performance.now();

    if (targetCount > this.particles.length) {
      this.addParticles(targetCount - this.particles.length, now);
    } else if (targetCount < this.particles.length) {
      this.removeParticles(this.particles.length - targetCount, now);
    }
  }

  private addParticles(count: number, now: number): void {
    console.log(`[ParticleEngine] 新增 ${count} 个粒子，带0.5秒淡入动画`);
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const t = Math.random();
      const r = (1 - t) * BUD_RADIUS;
      const theta = SPIRAL_TURNS * 2 * Math.PI * t + Math.random() * 0.5;
      const y = t * BUD_HEIGHT - BUD_HEIGHT * 0.1;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const baseColor = new THREE.Color();
      baseColor.setHSL(
        this.lerp(this.normalizedHue('#4a00e0'), this.normalizedHue('#8e2de2'), t),
        0.7,
        0.9
      );

      const index = this.particles.length;
      this.particles.push({
        basePosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        life: 1,
        maxLife: 1,
        baseColor: baseColor.clone(),
        size: 0.15,
        opacity: 0,
        targetOpacity: 1,
        fadeStartTime: now,
        active: true,
        petalIndex: -1,
        curveT: t,
        bloomPhase: 0,
      });

      if (this.positionAttribute && this.colorAttribute && this.sizeAttribute && this.opacityAttribute) {
        this.positionAttribute.setXYZ(index, x, y, z);
        this.colorAttribute.setXYZ(index, baseColor.r, baseColor.g, baseColor.b);
        this.sizeAttribute.setX(index, 0.15);
        this.opacityAttribute.setX(index, 0);
      }
    }

    if (this.positionAttribute) this.positionAttribute.needsUpdate = true;
    if (this.colorAttribute) this.colorAttribute.needsUpdate = true;
    if (this.sizeAttribute) this.sizeAttribute.needsUpdate = true;
    if (this.opacityAttribute) this.opacityAttribute.needsUpdate = true;
    if (this.geometry) this.geometry.setDrawRange(0, this.particles.length);
  }

  private removeParticles(count: number, now: number): void {
    console.log(`[ParticleEngine] 移除 ${count} 个粒子，带0.5秒淡出动画`);
    const toRemove = Math.min(count, this.particles.length);
    for (let i = 0; i < toRemove; i++) {
      const idx = this.particles.length - 1 - i;
      if (this.particles[idx]) {
        this.particles[idx].targetOpacity = 0;
        this.particles[idx].fadeStartTime = now;
      }
    }
  }

  private pruneFadedParticles(): void {
    const now = performance.now();
    let pruned = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active || (p.targetOpacity === 0 && p.opacity <= 0.001 && now - p.fadeStartTime >= FADE_DURATION)) {
        this.particles.splice(i, 1);
        pruned++;
      }
    }
    if (pruned > 0) {
      console.log(`[ParticleEngine] 清理 ${pruned} 个已淡出粒子，剩余: ${this.particles.length}`);
      this.rebuildAttributes();
    }
  }

  private rebuildAttributes(): void {
    if (!this.positionAttribute || !this.colorAttribute || !this.sizeAttribute || !this.opacityAttribute) return;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.positionAttribute.setXYZ(i, p.basePosition.x, p.basePosition.y, p.basePosition.z);
      this.colorAttribute.setXYZ(i, p.baseColor.r, p.baseColor.g, p.baseColor.b);
      this.sizeAttribute.setX(i, p.size);
      this.opacityAttribute.setX(i, p.opacity);
    }

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
    if (this.geometry) this.geometry.setDrawRange(0, this.particles.length);
  }

  private startBloom(): void {
    if (this.isBlooming) return;
    this.isBlooming = true;
    this.bloomStartTime = performance.now();

    console.log(`[ParticleEngine] 开始绽放动画，持续${BLOOM_DURATION}ms`);

    const targetTotal = PETAL_COUNT * PARTICLES_PER_PETAL;
    const currentCount = this.particles.length;

    if (targetTotal > currentCount) {
      const toAdd = targetTotal - currentCount;
      for (let i = 0; i < toAdd && this.particles.length < MAX_PARTICLES; i++) {
        const petalIdx = Math.floor(i / PARTICLES_PER_PETAL);
        const t = (i % PARTICLES_PER_PETAL) / PARTICLES_PER_PETAL;

        this.particles.push({
          basePosition: new THREE.Vector3(0, BUD_HEIGHT * 0.5, 0),
          velocity: new THREE.Vector3(0, 0, 0),
          life: 1,
          maxLife: 1,
          baseColor: new THREE.Color(),
          size: 0.15,
          opacity: 0,
          targetOpacity: 1,
          fadeStartTime: performance.now(),
          active: true,
          petalIndex: petalIdx,
          curveT: t,
          bloomPhase: 0,
        });
      }
      this.rebuildAttributes();
    }

    for (let i = 0; i < Math.min(this.particles.length, targetTotal); i++) {
      const petalIdx = Math.floor(i / PARTICLES_PER_PETAL);
      const t = (i % PARTICLES_PER_PETAL) / PARTICLES_PER_PETAL;
      this.particles[i].petalIndex = petalIdx;
      this.particles[i].curveT = t;
      this.particles[i].bloomPhase = 0;
    }
  }

  private bezierPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
    const mt = 1 - t;
    return new THREE.Vector3(
      mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
    );
  }

  private getPetalControlPoints(petalIndex: number, bloomProgress: number): { p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3 } {
    const angle = (petalIndex / PETAL_COUNT) * Math.PI * 2;
    const maxSpread = 6 * bloomProgress;
    const maxHeight = BUD_HEIGHT * 0.3 + 2 * bloomProgress;
    const curveBend = 3 * bloomProgress;

    const p0 = new THREE.Vector3(0, BUD_HEIGHT * 0.4, 0);
    const p1 = new THREE.Vector3(
      Math.cos(angle) * maxSpread * 0.3,
      BUD_HEIGHT * 0.6 + curveBend,
      Math.sin(angle) * maxSpread * 0.3
    );
    const p2 = new THREE.Vector3(
      Math.cos(angle) * maxSpread,
      maxHeight,
      Math.sin(angle) * maxSpread
    );

    return { p0, p1, p2 };
  }

  private getBloomParticleSize(t: number, bloomProgress: number): number {
    if (bloomProgress < 1) {
      return this.lerp(0.15, 0.3, bloomProgress);
    } else {
      return this.lerp(0.3, 0.1, Math.min(1, t));
    }
  }

  public update(deltaTime: number): void {
    if (!this.positionAttribute || !this.colorAttribute || !this.sizeAttribute || !this.opacityAttribute) return;

    this.elapsedTime += deltaTime;
    const now = performance.now();
    this.debugCount++;

    const bloomProgress = this.isBlooming ? Math.min(1, (now - this.bloomStartTime) / BLOOM_DURATION) : 0;
    const postBloomPhase = this.isBlooming ? Math.max(0, (now - this.bloomStartTime - BLOOM_DURATION) / 2000) : 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.opacity !== p.targetOpacity) {
        const fadeProgress = Math.min(1, (now - p.fadeStartTime) / FADE_DURATION);
        if (p.targetOpacity === 1) {
          p.opacity = fadeProgress;
        } else {
          p.opacity = 1 - fadeProgress;
        }
        this.opacityAttribute.setX(i, p.opacity);
      }

      if (!p.active || p.opacity <= 0) continue;

      let px: number, py: number, pz: number;

      if (this.isBlooming && p.petalIndex >= 0 && p.petalIndex < PETAL_COUNT) {
        const { p0, p1, p2 } = this.getPetalControlPoints(p.petalIndex, bloomProgress);
        const curvePoint = this.bezierPoint(p0, p1, p2, p.curveT);

        p.basePosition.lerp(curvePoint, 0.08);

        const sizeT = p.curveT;
        if (bloomProgress < 1) {
          p.size = this.lerp(0.15, 0.3, bloomProgress);
        } else {
          p.size = this.lerp(0.3, 0.1, Math.min(1, bloomProgress + sizeT * 0.5 - 0.5));
        }

        const postRotation = postBloomPhase * 0.05 * deltaTime;
        const cos = Math.cos(postRotation);
        const sin = Math.sin(postRotation);
        const rx = p.basePosition.x * cos - p.basePosition.z * sin;
        const rz = p.basePosition.x * sin + p.basePosition.z * cos;
        px = rx;
        py = p.basePosition.y;
        pz = rz;

        const driftAmount = Math.min(0.5, postBloomPhase * 0.5);
        px += Math.sin(this.elapsedTime * 2 + p.petalIndex + p.curveT * 10) * driftAmount * 0.1;
        py += Math.cos(this.elapsedTime * 1.5 + p.petalIndex) * driftAmount * 0.1;
        pz += Math.sin(this.elapsedTime * 1.8 + p.curveT * 8) * driftAmount * 0.1;

        const petalColor = new THREE.Color();
        const colorHue = this.lerp(this.normalizedHue('#ff007f'), this.normalizedHue('#ffb3d9'), p.curveT);
        const hueShift = (this.environment.lightAngle / 360) * 180 / 360;
        let finalHue = colorHue + hueShift;
        while (finalHue > 1) finalHue -= 1;
        petalColor.setHSL(finalHue, 0.7, 0.9);
        this.colorAttribute.setXYZ(i, petalColor.r, petalColor.g, petalColor.b);

      } else {
        const rotationSpeed = 0.1;
        const floatAmplitude = 0.2;
        const floatFrequency = 1;

        const angle = this.elapsedTime * rotationSpeed + p.curveT * SPIRAL_TURNS * Math.PI * 2;
        const baseR = (1 - p.curveT) * BUD_RADIUS;
        const baseY = p.curveT * BUD_HEIGHT - BUD_HEIGHT * 0.1;

        const floatY = Math.sin(this.elapsedTime * floatFrequency * Math.PI * 2 + p.curveT * 10) * floatAmplitude;

        px = baseR * Math.cos(angle);
        py = baseY + floatY;
        pz = baseR * Math.sin(angle);

        p.size = 0.15;
      }

      const windAmplitude = this.environment.windSpeed * 0.1;
      const windFrequency = 2;
      px += Math.sin(this.elapsedTime * windFrequency * Math.PI * 2 + p.curveT * 5) * windAmplitude;
      pz += Math.cos(this.elapsedTime * windFrequency * Math.PI * 2 + p.curveT * 7) * windAmplitude;

      this.positionAttribute.setXYZ(i, px, py, pz);
      this.sizeAttribute.setX(i, p.size);
    }

    this.positionAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
    if (this.lastColorUpdate !== -1) {
      this.colorAttribute.needsUpdate = true;
    }

    if (this.debugCount % 300 === 0) {
      console.log(
        `[ParticleEngine] 运行中 - 粒子数: ${this.particles.length}, ` +
        `光照角度: ${this.environment.lightAngle.toFixed(1)}° (色相偏移: ${((this.environment.lightAngle / 360) * 180).toFixed(1)}°), ` +
        `风速: ${this.environment.windSpeed.toFixed(1)} (振幅: ${(this.environment.windSpeed * 0.1).toFixed(2)}), ` +
        `绽放进度: ${(bloomProgress * 100).toFixed(0)}%`
      );
    }

    this.pruneFadedParticles();
  }

  public getParticleCount(): number {
    return this.particles.filter(p => p.active && p.opacity > 0.01).length;
  }

  public isBloomingState(): boolean {
    return this.isBlooming;
  }

  public getBloomProgress(): number {
    if (!this.isBlooming) return 0;
    return Math.min(1, (performance.now() - this.bloomStartTime) / BLOOM_DURATION);
  }

  public getBoundingSphere(): THREE.Sphere {
    const center = new THREE.Vector3(0, BUD_HEIGHT * 0.5, 0);
    return new THREE.Sphere(center, BUD_RADIUS * 1.5);
  }

  public isBloomTextFadeComplete(): boolean {
    if (!this.isBlooming) return false;
    return performance.now() - this.bloomStartTime > BLOOM_DURATION + 1000;
  }

  public destroy(): void {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];

    if (this.points && this.scene) {
      this.scene.remove(this.points);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    this.particles = [];
    this.points = null;
    this.geometry = null;
    this.material = null;
    this.positionAttribute = null;
    this.colorAttribute = null;
    this.sizeAttribute = null;
    this.opacityAttribute = null;
    console.log('[ParticleEngine] 资源已释放');
  }
}

export default ParticleEngine;
