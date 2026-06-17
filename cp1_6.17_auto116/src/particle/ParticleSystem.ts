import * as THREE from 'three';
import {
  eventBus,
  globalState,
  updateGlobalState,
  type FreqBandData,
  type ParticleParams,
  type ColorTheme
} from '../shared/GlobalState';

interface ParticleGroup {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  velocities: Float32Array;
  alphas: Float32Array;
  targetAlphas: Float32Array;
  colors: Float32Array;
  targetColors: Float32Array;
  sizes: Float32Array;
  currentCount: number;
  targetCount: number;
  countTransitionStart: number;
  countTransitionDuration: number;
  isCountTransitioning: boolean;
  prevEnergy: number;
}

const THEME_COLORS: Record<ColorTheme, { low: [string, string]; mid: [string, string]; high: [string, string] }> = {
  neon: {
    low: ['#FF0055', '#FF3377'],
    mid: ['#00D4FF', '#33E0FF'],
    high: ['#FFEA00', '#FFF066']
  },
  sunny: {
    low: ['#FF6B35', '#FF8C5A'],
    mid: ['#9B59B6', '#B07CC9'],
    high: ['#F1C40F', '#F5D447']
  },
  aurora: {
    low: ['#2ECC71', '#58D68D'],
    mid: ['#1ABC9C', '#48C9B0'],
    high: ['#E91E8E', '#F055AA']
  }
};

const MAX_COUNT = 2000;

export class ParticleSystem {
  private scene: THREE.Scene;
  private groups: { low: ParticleGroup; mid: ParticleGroup; high: ParticleGroup };
  private currentThemeColors = THEME_COLORS.neon;
  private targetThemeColors = THEME_COLORS.neon;
  private themeTransitionStart = 0;
  private themeTransitionDuration = 1500;
  private isThemeTransitioning = false;
  private currentFreqData: FreqBandData = { low: 0, mid: 0, high: 0 };

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.groups = {
      low: this.createGroup('low'),
      mid: this.createGroup('mid'),
      high: this.createGroup('high')
    };

    eventBus.on('paramChange', (params: Partial<ParticleParams>) => {
      this.updateParams(params);
    });

    eventBus.on('freqDataUpdate', (data: FreqBandData) => {
      this.currentFreqData = data;
    });

    eventBus.on('stateUpdate', () => {
      this.currentFreqData = { ...globalState.freqData };
    });
  }

  private createCombinedParticleTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.08, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.02)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createGroup(type: 'low' | 'mid' | 'high'): ParticleGroup {
    const count = globalState.particleParams.density;

    const positions = new Float32Array(MAX_COUNT * 3);
    const colors = new Float32Array(MAX_COUNT * 3);
    const sizes = new Float32Array(MAX_COUNT);
    const alphas = new Float32Array(MAX_COUNT);
    const targetAlphas = new Float32Array(MAX_COUNT);
    const velocities = new Float32Array(MAX_COUNT * 3);
    const targetColors = new Float32Array(MAX_COUNT * 3);

    const colorRange = this.currentThemeColors[type];
    const colorStart = new THREE.Color(colorRange[0]);
    const colorEnd = new THREE.Color(colorRange[1]);

    for (let i = 0; i < MAX_COUNT; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      targetColors[i3] = color.r;
      targetColors[i3 + 1] = color.g;
      targetColors[i3 + 2] = color.b;

      sizes[i] = 1.0;
      alphas[i] = i < count ? 1.0 : 0.0;
      targetAlphas[i] = i < count ? 1.0 : 0.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setDrawRange(0, MAX_COUNT);

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createCombinedParticleTexture(),
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);

    return {
      points,
      geometry,
      material,
      velocities,
      alphas,
      targetAlphas,
      colors,
      targetColors,
      sizes,
      currentCount: count,
      targetCount: count,
      countTransitionStart: 0,
      countTransitionDuration: 1000,
      isCountTransitioning: false,
      prevEnergy: 0
    };
  }

  public updateParams(params: Partial<ParticleParams>): void {
    if (params.density !== undefined && params.density !== globalState.particleParams.density) {
      updateGlobalState({
        particleParams: {
          ...globalState.particleParams,
          density: params.density
        }
      });
      this.setParticleCount('low', params.density);
      this.setParticleCount('mid', params.density);
      this.setParticleCount('high', params.density);
    }

    if (params.speed !== undefined) {
      updateGlobalState({
        particleParams: {
          ...globalState.particleParams,
          speed: params.speed
        }
      });
    }

    if (params.theme !== undefined && params.theme !== globalState.particleParams.theme) {
      updateGlobalState({
        particleParams: {
          ...globalState.particleParams,
          theme: params.theme
        }
      });
      this.targetThemeColors = THEME_COLORS[params.theme];
      this.themeTransitionStart = performance.now();
      this.isThemeTransitioning = true;
      this.updateTargetColors();
    }
  }

  private setParticleCount(type: 'low' | 'mid' | 'high', newCount: number): void {
    const group = this.groups[type];
    if (newCount === group.targetCount) return;

    const oldTarget = group.targetCount;
    group.targetCount = Math.max(500, Math.min(MAX_COUNT, newCount));
    group.countTransitionStart = performance.now();
    group.isCountTransitioning = true;

    for (let i = 0; i < MAX_COUNT; i++) {
      group.targetAlphas[i] = i < group.targetCount ? 1.0 : 0.0;
    }
  }

  private updateTargetColors(): void {
    (['low', 'mid', 'high'] as const).forEach((type) => {
      const group = this.groups[type];
      const colorRange = this.targetThemeColors[type];
      const colorStart = new THREE.Color(colorRange[0]);
      const colorEnd = new THREE.Color(colorRange[1]);

      for (let i = 0; i < MAX_COUNT; i++) {
        const i3 = i * 3;
        const t = (i * 17) % 100 / 100;
        const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
        group.targetColors[i3] = color.r;
        group.targetColors[i3 + 1] = color.g;
        group.targetColors[i3 + 2] = color.b;
      }
    });
  }

  public update(): void {
    const freqData = this.currentFreqData;
    const isPlaying = globalState.isPlaying;
    const now = performance.now();

    if (this.isThemeTransitioning) {
      const progress = Math.min((now - this.themeTransitionStart) / this.themeTransitionDuration, 1);
      if (progress >= 1) {
        this.isThemeTransitioning = false;
        this.currentThemeColors = this.targetThemeColors;
      }
    }

    this.updateGroup('low', freqData.low, isPlaying, now);
    this.updateGroup('mid', freqData.mid, isPlaying, now);
    this.updateGroup('high', freqData.high, isPlaying, now);
  }

  private updateGroup(
    type: 'low' | 'mid' | 'high',
    energy: number,
    isPlaying: boolean,
    now: number
  ): void {
    const group = this.groups[type];
    const positions = group.geometry.attributes.position.array as Float32Array;
    const colors = group.geometry.attributes.color.array as Float32Array;
    const sizes = group.geometry.attributes.size.array as Float32Array;

    const speedMult = globalState.particleParams.speed;
    const energyRatio = Math.min(1, energy / 255);

    let baseSize = 0.5 + energyRatio * 2.5;
    let glowBoost = 0;

    if (energy > 180) {
      glowBoost = 0.3;
      baseSize *= 1.25;
    }

    if (group.isCountTransitioning) {
      const t = Math.min((now - group.countTransitionStart) / group.countTransitionDuration, 1);
      const oldCount = group.currentCount;
      const target = group.targetCount;
      const newCurrent = oldCount + (target - oldCount) * t;
      group.currentCount = Math.round(newCurrent);

      for (let i = 0; i < MAX_COUNT; i++) {
        if (i < target && i >= oldCount) {
          const appearT = (i - oldCount) / Math.max(1, (target - oldCount));
          const transitionT = Math.max(0, (t - appearT) / (1 - appearT));
          group.alphas[i] = Math.min(1, group.alphas[i] + transitionT * 0.03);
        } else if (i >= target && i < oldCount) {
          const disappearT = (i - target) / Math.max(1, (oldCount - target));
          const transitionT = Math.max(0, (t - disappearT) / (1 - disappearT));
          group.alphas[i] = Math.max(0, group.alphas[i] - transitionT * 0.03);
        }
      }

      if (t >= 1) {
        group.currentCount = group.targetCount;
        group.isCountTransitioning = false;
      }
    }

    const activeMax = Math.max(group.currentCount, group.targetCount) + 20;

    for (let i = 0; i < MAX_COUNT; i++) {
      const i3 = i * 3;

      if (i < activeMax) {
        if (isPlaying) {
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];
          const dist = Math.sqrt(px * px + py * py + pz * pz);

          const randX = (Math.random() - 0.5) * 0.02 * speedMult;
          const randY = (Math.random() - 0.5) * 0.02 * speedMult;
          const randZ = (Math.random() - 0.5) * 0.02 * speedMult;

          group.velocities[i3] += randX;
          group.velocities[i3 + 1] += randY;
          group.velocities[i3 + 2] += randZ;

          if (type === 'low') {
            const len = dist || 1;
            const nx = -px / len;
            const ny = -py / len;
            const nz = -pz / len;
            const attractionStrength = 0.015 * Math.min(1, dist / 12) * speedMult;
            group.velocities[i3] += nx * attractionStrength;
            group.velocities[i3 + 1] += ny * attractionStrength;
            group.velocities[i3 + 2] += nz * attractionStrength;
          } else if (type === 'mid') {
            const len = dist || 1;
            const nx = px / len;
            const ny = py / len;
            const nz = pz / len;
            const repulsionStrength = 0.015 * Math.min(1, dist / 15) * speedMult;
            group.velocities[i3] += nx * repulsionStrength;
            group.velocities[i3 + 1] += ny * repulsionStrength;
            group.velocities[i3 + 2] += nz * repulsionStrength;
          } else {
            group.velocities[i3] += (Math.random() - 0.5) * 0.06 * energyRatio * speedMult;
            group.velocities[i3 + 1] += (Math.random() - 0.5) * 0.06 * energyRatio * speedMult;
            group.velocities[i3 + 2] += (Math.random() - 0.5) * 0.06 * energyRatio * speedMult;
          }

          group.velocities[i3] *= 0.94;
          group.velocities[i3 + 1] *= 0.94;
          group.velocities[i3 + 2] *= 0.94;

          positions[i3] += group.velocities[i3];
          positions[i3 + 1] += group.velocities[i3 + 1];
          positions[i3 + 2] += group.velocities[i3 + 2];

          if (type === 'low') {
            const shrinkRadius = 2 + energyRatio * 8;
            const px2 = positions[i3];
            const py2 = positions[i3 + 1];
            const pz2 = positions[i3 + 2];
            const len = Math.sqrt(px2 * px2 + py2 * py2 + pz2 * pz2);
            if (len > shrinkRadius * 2) {
              const scale = (shrinkRadius * 2) / (len || 1);
              positions[i3] *= scale;
              positions[i3 + 1] *= scale;
              positions[i3 + 2] *= scale;
            }
            if (len < 0.5) {
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(2 * Math.random() - 1);
              positions[i3] = shrinkRadius * Math.sin(phi) * Math.cos(theta);
              positions[i3 + 1] = shrinkRadius * Math.sin(phi) * Math.sin(theta);
              positions[i3 + 2] = shrinkRadius * Math.cos(phi);
            }
          } else if (type === 'mid') {
            const spreadRange = 3 + energyRatio * 12;
            const px2 = positions[i3];
            const py2 = positions[i3 + 1];
            const pz2 = positions[i3 + 2];
            const len = Math.sqrt(px2 * px2 + py2 * py2 + pz2 * pz2);
            if (len > spreadRange * 1.5) {
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(2 * Math.random() - 1);
              const r = 2 + Math.random() * 2;
              positions[i3] = r * Math.sin(phi) * Math.cos(theta);
              positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
              positions[i3 + 2] = r * Math.cos(phi);
            }
            if (len < 1) {
              const scale = 1 / (len || 1);
              positions[i3] *= scale;
              positions[i3 + 1] *= scale;
              positions[i3 + 2] *= scale;
            }
          } else {
            const px2 = positions[i3];
            const py2 = positions[i3 + 1];
            const pz2 = positions[i3 + 2];
            const len = Math.sqrt(px2 * px2 + py2 * py2 + pz2 * pz2);
            const maxR = 12;
            if (len > maxR) {
              const scale = maxR / (len || 1);
              positions[i3] *= scale;
              positions[i3 + 1] *= scale;
              positions[i3 + 2] *= scale;
            }
          }
        }

        if (!group.isCountTransitioning) {
          const alphaLerpSpeed = 0.025;
          group.alphas[i] += (group.targetAlphas[i] - group.alphas[i]) * alphaLerpSpeed;
        }

        const effectiveAlpha = Math.max(0, Math.min(1, group.alphas[i]));
        const energyBrightness = 1 + energyRatio * 0.3 + glowBoost;
        const colorLerpSpeed = 0.03;
        colors[i3] += (group.targetColors[i3] * energyBrightness - colors[i3]) * colorLerpSpeed;
        colors[i3 + 1] += (group.targetColors[i3 + 1] * energyBrightness - colors[i3 + 1]) * colorLerpSpeed;
        colors[i3 + 2] += (group.targetColors[i3 + 2] * energyBrightness - colors[i3 + 2]) * colorLerpSpeed;

        const sizeLerpSpeed = 0.1;
        const sizeVariation = 0.8 + (i % 12) / 24;
        const glowSizeBoost = 1 + glowBoost * 0.5;
        const targetSize = baseSize * sizeVariation * glowSizeBoost;
        sizes[i] += (targetSize - sizes[i]) * sizeLerpSpeed;

        if (effectiveAlpha < 0.002) {
          sizes[i] = 0;
        }
      } else {
        sizes[i] = 0;
      }
    }

    let maxVisibleAlpha = 0;
    const upperBound = activeMax;
    for (let i = 0; i < upperBound; i++) {
      if (group.alphas[i] > maxVisibleAlpha) {
        maxVisibleAlpha = group.alphas[i];
      }
    }
    const baseOpacity = 0.08 + energyRatio * 0.4;
    group.material.opacity = Math.min(1, (baseOpacity + glowBoost) * Math.min(1, maxVisibleAlpha));

    const drawCount = Math.ceil(upperBound);
    group.geometry.setDrawRange(0, Math.min(drawCount, MAX_COUNT));

    group.geometry.attributes.position.needsUpdate = true;
    group.geometry.attributes.color.needsUpdate = true;
    group.geometry.attributes.size.needsUpdate = true;

    group.geometry.computeBoundingSphere();
  }

  public dispose(): void {
    (['low', 'mid', 'high'] as const).forEach((type) => {
      const group = this.groups[type];

      group.geometry.dispose();
      group.material.dispose();
      if (group.material.map) group.material.map.dispose();
      this.scene.remove(group.points);
    });
  }
}
