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
  corePoints: THREE.Points;
  coreGeometry: THREE.BufferGeometry;
  coreMaterial: THREE.PointsMaterial;
  glowPoints: THREE.Points;
  glowGeometry: THREE.BufferGeometry;
  glowMaterial: THREE.PointsMaterial;
  velocities: Float32Array;
  alphas: Float32Array;
  targetAlphas: Float32Array;
  targetColors: Float32Array;
  targetSizes: Float32Array;
  currentCount: number;
  targetCount: number;
  countTransitionStart: number;
  countTransitionDuration: number;
  isCountTransitioning: boolean;
  initialCount: number;
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
  }

  private createGlowParticleTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.15)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.04)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createCoreParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.15)');
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
    const coreColors = new Float32Array(MAX_COUNT * 3);
    const glowColors = new Float32Array(MAX_COUNT * 3);
    const coreSizes = new Float32Array(MAX_COUNT);
    const glowSizes = new Float32Array(MAX_COUNT);
    const alphas = new Float32Array(MAX_COUNT);
    const targetAlphas = new Float32Array(MAX_COUNT);
    const velocities = new Float32Array(MAX_COUNT * 3);
    const targetColors = new Float32Array(MAX_COUNT * 3);
    const targetSizes = new Float32Array(MAX_COUNT);

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

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
      coreColors[i3] = color.r;
      coreColors[i3 + 1] = color.g;
      coreColors[i3 + 2] = color.b;
      glowColors[i3] = color.r;
      glowColors[i3 + 1] = color.g;
      glowColors[i3 + 2] = color.b;
      targetColors[i3] = color.r;
      targetColors[i3 + 1] = color.g;
      targetColors[i3 + 2] = color.b;

      coreSizes[i] = 1.0;
      glowSizes[i] = 3.0;
      targetSizes[i] = 1.0;

      alphas[i] = i < count ? 1.0 : 0.0;
      targetAlphas[i] = i < count ? 1.0 : 0.0;
    }

    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    coreGeometry.setAttribute('color', new THREE.BufferAttribute(coreColors, 3));
    coreGeometry.setAttribute('size', new THREE.BufferAttribute(coreSizes, 1));
    coreGeometry.setDrawRange(0, MAX_COUNT);

    const coreMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createCoreParticleTexture(),
      sizeAttenuation: true
    });

    const corePoints = new THREE.Points(coreGeometry, coreMaterial);
    corePoints.frustumCulled = false;
    this.scene.add(corePoints);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));
    glowGeometry.setDrawRange(0, MAX_COUNT);

    const glowMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createGlowParticleTexture(),
      sizeAttenuation: true
    });

    const glowPoints = new THREE.Points(glowGeometry, glowMaterial);
    glowPoints.frustumCulled = false;
    this.scene.add(glowPoints);

    return {
      corePoints,
      coreGeometry,
      coreMaterial,
      glowPoints,
      glowGeometry,
      glowMaterial,
      velocities,
      alphas,
      targetAlphas,
      targetColors,
      targetSizes,
      currentCount: count,
      targetCount: count,
      countTransitionStart: 0,
      countTransitionDuration: 1000,
      isCountTransitioning: false,
      initialCount: count
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
    const freqData = globalState.freqData;
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
    const corePositions = group.coreGeometry.attributes.position.array as Float32Array;
    const coreColors = group.coreGeometry.attributes.color.array as Float32Array;
    const coreSizes = group.coreGeometry.attributes.size.array as Float32Array;
    const glowPositions = group.glowGeometry.attributes.position.array as Float32Array;
    const glowColors = group.glowGeometry.attributes.color.array as Float32Array;
    const glowSizes = group.glowGeometry.attributes.size.array as Float32Array;

    const speedMult = globalState.particleParams.speed;
    const energyRatio = energy / 255;

    let baseSize = 0.5 + energyRatio * 2.5;
    let glowOpacity = 0.08 + energyRatio * 0.35;

    if (energy > 180) {
      glowOpacity += 0.25;
      baseSize *= 1.2;
    }

    if (group.isCountTransitioning) {
      const t = Math.min((now - group.countTransitionStart) / group.countTransitionDuration, 1);
      if (t >= 1) {
        group.currentCount = group.targetCount;
        group.isCountTransitioning = false;
      }
    }

    for (let i = 0; i < MAX_COUNT; i++) {
      const i3 = i * 3;

      if (isPlaying && i < Math.max(group.currentCount, group.targetCount) + 10) {
        const randX = (Math.random() - 0.5) * 0.015 * speedMult;
        const randY = (Math.random() - 0.5) * 0.015 * speedMult;
        const randZ = (Math.random() - 0.5) * 0.015 * speedMult;

        group.velocities[i3] += randX;
        group.velocities[i3 + 1] += randY;
        group.velocities[i3 + 2] += randZ;

        if (type === 'low') {
          const px = corePositions[i3];
          const py = corePositions[i3 + 1];
          const pz = corePositions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
          const nx = -px / len;
          const ny = -py / len;
          const nz = -pz / len;
          group.velocities[i3] += nx * 0.02 * speedMult;
          group.velocities[i3 + 1] += ny * 0.02 * speedMult;
          group.velocities[i3 + 2] += nz * 0.02 * speedMult;
        } else if (type === 'mid') {
          const px = corePositions[i3];
          const py = corePositions[i3 + 1];
          const pz = corePositions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
          const nx = px / len;
          const ny = py / len;
          const nz = pz / len;
          group.velocities[i3] += nx * 0.02 * speedMult;
          group.velocities[i3 + 1] += ny * 0.02 * speedMult;
          group.velocities[i3 + 2] += nz * 0.02 * speedMult;
        } else {
          group.velocities[i3] += (Math.random() - 0.5) * 0.05 * energyRatio * speedMult;
          group.velocities[i3 + 1] += (Math.random() - 0.5) * 0.05 * energyRatio * speedMult;
          group.velocities[i3 + 2] += (Math.random() - 0.5) * 0.05 * energyRatio * speedMult;
        }

        group.velocities[i3] *= 0.95;
        group.velocities[i3 + 1] *= 0.95;
        group.velocities[i3 + 2] *= 0.95;

        corePositions[i3] += group.velocities[i3];
        corePositions[i3 + 1] += group.velocities[i3 + 1];
        corePositions[i3 + 2] += group.velocities[i3 + 2];

        glowPositions[i3] = corePositions[i3];
        glowPositions[i3 + 1] = corePositions[i3 + 1];
        glowPositions[i3 + 2] = corePositions[i3 + 2];

        if (type === 'low') {
          const shrinkRadius = 2 + energyRatio * 8;
          const px = corePositions[i3];
          const py = corePositions[i3 + 1];
          const pz = corePositions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz);
          if (len > shrinkRadius * 2) {
            const scale = (shrinkRadius * 2) / (len || 1);
            corePositions[i3] *= scale;
            corePositions[i3 + 1] *= scale;
            corePositions[i3 + 2] *= scale;
            glowPositions[i3] = corePositions[i3];
            glowPositions[i3 + 1] = corePositions[i3 + 1];
            glowPositions[i3 + 2] = corePositions[i3 + 2];
          }
          if (len < 0.5) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            corePositions[i3] = shrinkRadius * Math.sin(phi) * Math.cos(theta);
            corePositions[i3 + 1] = shrinkRadius * Math.sin(phi) * Math.sin(theta);
            corePositions[i3 + 2] = shrinkRadius * Math.cos(phi);
            glowPositions[i3] = corePositions[i3];
            glowPositions[i3 + 1] = corePositions[i3 + 1];
            glowPositions[i3 + 2] = corePositions[i3 + 2];
          }
        } else if (type === 'mid') {
          const spreadRange = 3 + energyRatio * 12;
          const px = corePositions[i3];
          const py = corePositions[i3 + 1];
          const pz = corePositions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz);
          if (len > spreadRange * 1.5) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2 + Math.random() * 2;
            corePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
            corePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            corePositions[i3 + 2] = r * Math.cos(phi);
            glowPositions[i3] = corePositions[i3];
            glowPositions[i3 + 1] = corePositions[i3 + 1];
            glowPositions[i3 + 2] = corePositions[i3 + 2];
          }
          if (len < 1) {
            const scale = 1 / (len || 1);
            corePositions[i3] *= scale;
            corePositions[i3 + 1] *= scale;
            corePositions[i3 + 2] *= scale;
            glowPositions[i3] = corePositions[i3];
            glowPositions[i3 + 1] = corePositions[i3 + 1];
            glowPositions[i3 + 2] = corePositions[i3 + 2];
          }
        } else {
          const px = corePositions[i3];
          const py = corePositions[i3 + 1];
          const pz = corePositions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz);
          const maxR = 12;
          if (len > maxR) {
            const scale = maxR / (len || 1);
            corePositions[i3] *= scale;
            corePositions[i3 + 1] *= scale;
            corePositions[i3 + 2] *= scale;
            glowPositions[i3] = corePositions[i3];
            glowPositions[i3 + 1] = corePositions[i3 + 1];
            glowPositions[i3 + 2] = corePositions[i3 + 2];
          }
        }
      }

      const alphaLerpSpeed = 0.018;
      group.alphas[i] += (group.targetAlphas[i] - group.alphas[i]) * alphaLerpSpeed;

      const colorLerpSpeed = 0.025;
      const effectiveAlpha = Math.max(0, Math.min(1, group.alphas[i]));
      coreColors[i3] += (group.targetColors[i3] - coreColors[i3]) * colorLerpSpeed;
      coreColors[i3 + 1] += (group.targetColors[i3 + 1] - coreColors[i3 + 1]) * colorLerpSpeed;
      coreColors[i3 + 2] += (group.targetColors[i3 + 2] - coreColors[i3 + 2]) * colorLerpSpeed;
      glowColors[i3] = coreColors[i3];
      glowColors[i3 + 1] = coreColors[i3 + 1];
      glowColors[i3 + 2] = coreColors[i3 + 2];

      const sizeLerpSpeed = 0.08;
      const sizeVariation = 0.8 + (i % 12) / 24;
      const targetCoreSize = baseSize * sizeVariation;
      const targetGlowSize = baseSize * sizeVariation * 3.5;
      coreSizes[i] += (targetCoreSize - coreSizes[i]) * sizeLerpSpeed;
      glowSizes[i] += (targetGlowSize - glowSizes[i]) * sizeLerpSpeed;

      if (effectiveAlpha < 0.001) {
        coreSizes[i] = 0;
        glowSizes[i] = 0;
      }
    }

    let maxVisibleAlpha = 0;
    const upperBound = Math.max(group.currentCount, group.targetCount) + 20;
    for (let i = 0; i < upperBound; i++) {
      if (group.alphas[i] > maxVisibleAlpha) {
        maxVisibleAlpha = group.alphas[i];
      }
    }
    group.coreMaterial.opacity = 0.95 * Math.min(1, maxVisibleAlpha);
    group.glowMaterial.opacity = glowOpacity * Math.min(1, maxVisibleAlpha);

    const drawCount = Math.ceil(Math.max(group.currentCount, group.targetCount) + 20);
    group.coreGeometry.setDrawRange(0, Math.min(drawCount, MAX_COUNT));
    group.glowGeometry.setDrawRange(0, Math.min(drawCount, MAX_COUNT));

    group.coreGeometry.attributes.position.needsUpdate = true;
    group.coreGeometry.attributes.color.needsUpdate = true;
    group.coreGeometry.attributes.size.needsUpdate = true;
    group.glowGeometry.attributes.position.needsUpdate = true;
    group.glowGeometry.attributes.color.needsUpdate = true;
    group.glowGeometry.attributes.size.needsUpdate = true;

    group.coreGeometry.computeBoundingSphere();
    group.glowGeometry.computeBoundingSphere();
  }

  public dispose(): void {
    (['low', 'mid', 'high'] as const).forEach((type) => {
      const group = this.groups[type];

      group.coreGeometry.dispose();
      group.coreMaterial.dispose();
      if (group.coreMaterial.map) group.coreMaterial.map.dispose();
      this.scene.remove(group.corePoints);

      group.glowGeometry.dispose();
      group.glowMaterial.dispose();
      if (group.glowMaterial.map) group.glowMaterial.map.dispose();
      this.scene.remove(group.glowPoints);
    });
  }
}
