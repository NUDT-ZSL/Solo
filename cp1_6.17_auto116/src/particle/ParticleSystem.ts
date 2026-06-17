import * as THREE from 'three';
import type { FreqBandData } from '../audio/AudioAnalyzer';

export type ColorTheme = 'neon' | 'sunny' | 'aurora';

export interface ParticleParams {
  density: number;
  speed: number;
  theme: ColorTheme;
}

interface ParticleGroup {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  targetPositions: Float32Array;
  targetColors: Float32Array;
  targetSizes: Float32Array;
  velocities: Float32Array;
  alphas: Float32Array;
  targetAlphas: Float32Array;
  glowSprite: THREE.Sprite;
  glowEndTime: number;
  count: number;
  targetCount: number;
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

const DEFAULT_COLORS = THEME_COLORS.neon;

export class ParticleSystem {
  private scene: THREE.Scene;
  private groups: { low: ParticleGroup; mid: ParticleGroup; high: ParticleGroup };
  private params: ParticleParams;
  private currentThemeColors = DEFAULT_COLORS;
  private targetThemeColors = DEFAULT_COLORS;
  private themeTransitionStart = 0;
  private themeTransitionDuration = 1500;
  private isThemeTransitioning = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.params = {
      density: 1500,
      speed: 1.5,
      theme: 'neon'
    };

    this.groups = {
      low: this.createGroup('low'),
      mid: this.createGroup('mid'),
      high: this.createGroup('high')
    };
  }

  private createGlowTexture(color: string): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + 'AA');
    gradient.addColorStop(0.6, color + '44');
    gradient.addColorStop(1, color + '00');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createGroup(type: 'low' | 'mid' | 'high'): ParticleGroup {
    const count = this.params.density;
    const maxCount = 2000;

    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    const alphas = new Float32Array(maxCount);
    const velocities = new Float32Array(maxCount * 3);
    const targetPositions = new Float32Array(maxCount * 3);
    const targetColors = new Float32Array(maxCount * 3);
    const targetSizes = new Float32Array(maxCount);
    const targetAlphas = new Float32Array(maxCount);

    const colorRange = this.currentThemeColors[type];
    const colorStart = new THREE.Color(colorRange[0]);
    const colorEnd = new THREE.Color(colorRange[1]);

    for (let i = 0; i < maxCount; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      targetPositions[i3] = positions[i3];
      targetPositions[i3 + 1] = positions[i3 + 1];
      targetPositions[i3 + 2] = positions[i3 + 2];

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      targetColors[i3] = color.r;
      targetColors[i3 + 1] = color.g;
      targetColors[i3 + 2] = color.b;

      sizes[i] = 1.0;
      targetSizes[i] = 1.0;

      alphas[i] = i < count ? 1.0 : 0.0;
      targetAlphas[i] = i < count ? 1.0 : 0.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createParticleTexture(),
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);

    const glowColor = new THREE.Color(colorRange[0]);
    const glowMaterial = new THREE.SpriteMaterial({
      map: this.createGlowTexture('#FFFFFF'),
      color: glowColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(20, 20, 20);
    this.scene.add(glowSprite);

    return {
      points,
      geometry,
      material,
      targetPositions,
      targetColors,
      targetSizes,
      velocities,
      alphas,
      targetAlphas,
      glowSprite,
      glowEndTime: 0,
      count,
      targetCount: count
    };
  }

  public updateParams(params: Partial<ParticleParams>): void {
    const oldDensity = this.params.density;

    if (params.density !== undefined && params.density !== oldDensity) {
      this.params.density = params.density;
      this.updateParticleCount('low', params.density);
      this.updateParticleCount('mid', params.density);
      this.updateParticleCount('high', params.density);
    }

    if (params.speed !== undefined) {
      this.params.speed = params.speed;
    }

    if (params.theme !== undefined && params.theme !== this.params.theme) {
      this.params.theme = params.theme;
      this.targetThemeColors = THEME_COLORS[params.theme];
      this.themeTransitionStart = performance.now();
      this.isThemeTransitioning = true;
      this.updateTargetColors();
    }
  }

  private updateParticleCount(type: 'low' | 'mid' | 'high', newCount: number): void {
    const group = this.groups[type];
    group.targetCount = newCount;

    for (let i = 0; i < 2000; i++) {
      group.targetAlphas[i] = i < newCount ? 1.0 : 0.0;
    }
  }

  private updateTargetColors(): void {
    (['low', 'mid', 'high'] as const).forEach((type) => {
      const group = this.groups[type];
      const colorRange = this.targetThemeColors[type];
      const colorStart = new THREE.Color(colorRange[0]);
      const colorEnd = new THREE.Color(colorRange[1]);

      for (let i = 0; i < 2000; i++) {
        const i3 = i * 3;
        const t = (i % 100) / 100;
        const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
        group.targetColors[i3] = color.r;
        group.targetColors[i3 + 1] = color.g;
        group.targetColors[i3 + 2] = color.b;
      }

      const glowColor = new THREE.Color(colorRange[0]);
      (group.glowSprite.material as THREE.SpriteMaterial).color = glowColor;
    });
  }

  public update(freqData: FreqBandData, isPlaying: boolean, deltaTime: number): void {
    const now = performance.now();

    if (this.isThemeTransitioning) {
      const progress = Math.min((now - this.themeTransitionStart) / this.themeTransitionDuration, 1);
      if (progress >= 1) {
        this.isThemeTransitioning = false;
        this.currentThemeColors = this.targetThemeColors;
      }
    }

    this.updateGroup('low', freqData.low, isPlaying, deltaTime, now);
    this.updateGroup('mid', freqData.mid, isPlaying, deltaTime, now);
    this.updateGroup('high', freqData.high, isPlaying, deltaTime, now);
  }

  private updateGroup(
    type: 'low' | 'mid' | 'high',
    energy: number,
    isPlaying: boolean,
    deltaTime: number,
    now: number
  ): void {
    const group = this.groups[type];
    const positions = group.geometry.attributes.position.array as Float32Array;
    const colors = group.geometry.attributes.color.array as Float32Array;
    const sizes = group.geometry.attributes.size.array as Float32Array;

    const maxCount = 2000;
    const speedMult = this.params.speed * deltaTime * 60;

    let shrinkRadius = 6;
    let spreadRange = 9;
    let jitterAmount = 1.75;
    let baseSize = 0.5;

    if (type === 'low') {
      shrinkRadius = 2 + (energy / 255) * 8;
    } else if (type === 'mid') {
      spreadRange = 3 + (energy / 255) * 12;
    } else {
      jitterAmount = 0.5 + (energy / 255) * 2.5;
    }

    baseSize = 0.5 + (energy / 255) * 2.5;

    if (energy > 180 && now > group.glowEndTime) {
      group.glowEndTime = now + 200;
    }

    const glowProgress = Math.max(0, (group.glowEndTime - now) / 200);
    const baseGlowOpacity = 0.15;
    (group.glowSprite.material as THREE.SpriteMaterial).opacity = baseGlowOpacity + glowProgress * 0.5;
    const glowScale = 20 + glowProgress * 10;
    group.glowSprite.scale.set(glowScale, glowScale, glowScale);

    const colorBoost = 1 + glowProgress * 0.5;

    for (let i = 0; i < maxCount; i++) {
      const i3 = i * 3;

      if (isPlaying) {
        if (type === 'low') {
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
          const nx = -px / len;
          const ny = -py / len;
          const nz = -pz / len;
          group.velocities[i3] += nx * 0.02 * speedMult;
          group.velocities[i3 + 1] += ny * 0.02 * speedMult;
          group.velocities[i3 + 2] += nz * 0.02 * speedMult;

          group.velocities[i3] += (Math.random() - 0.5) * 0.005 * speedMult;
          group.velocities[i3 + 1] += (Math.random() - 0.5) * 0.005 * speedMult;
          group.velocities[i3 + 2] += (Math.random() - 0.5) * 0.005 * speedMult;
        } else if (type === 'mid') {
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
          const nx = px / len;
          const ny = py / len;
          const nz = pz / len;
          group.velocities[i3] += nx * 0.02 * speedMult;
          group.velocities[i3 + 1] += ny * 0.02 * speedMult;
          group.velocities[i3 + 2] += nz * 0.02 * speedMult;

          group.velocities[i3] += (Math.random() - 0.5) * 0.005 * speedMult;
          group.velocities[i3 + 1] += (Math.random() - 0.5) * 0.005 * speedMult;
          group.velocities[i3 + 2] += (Math.random() - 0.5) * 0.005 * speedMult;
        } else {
          group.velocities[i3] += (Math.random() - 0.5) * 0.04 * jitterAmount * speedMult;
          group.velocities[i3 + 1] += (Math.random() - 0.5) * 0.04 * jitterAmount * speedMult;
          group.velocities[i3 + 2] += (Math.random() - 0.5) * 0.04 * jitterAmount * speedMult;
        }

        group.velocities[i3] *= 0.96;
        group.velocities[i3 + 1] *= 0.96;
        group.velocities[i3 + 2] *= 0.96;

        positions[i3] += group.velocities[i3];
        positions[i3 + 1] += group.velocities[i3 + 1];
        positions[i3 + 2] += group.velocities[i3 + 2];

        if (type === 'low') {
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz);
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
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz);
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
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];
          const len = Math.sqrt(px * px + py * py + pz * pz);
          const maxR = 12;
          if (len > maxR) {
            const scale = maxR / (len || 1);
            positions[i3] *= scale;
            positions[i3 + 1] *= scale;
            positions[i3 + 2] *= scale;
          }
        }
      }

      const alphaLerp = 0.02 * speedMult;
      group.alphas[i] += (group.targetAlphas[i] - group.alphas[i]) * alphaLerp;

      const colorLerp = 0.03 * speedMult;
      colors[i3] += (group.targetColors[i3] * colorBoost - colors[i3]) * colorLerp;
      colors[i3 + 1] += (group.targetColors[i3 + 1] * colorBoost - colors[i3 + 1]) * colorLerp;
      colors[i3 + 2] += (group.targetColors[i3 + 2] * colorBoost - colors[i3 + 2]) * colorLerp;

      const sizeLerp = 0.1 * speedMult;
      const targetSize = baseSize * (0.8 + (i % 10) / 20);
      sizes[i] += (targetSize - sizes[i]) * sizeLerp;
    }

    const maxVisibleAlpha = Math.max(...group.alphas.slice(0, Math.max(group.count, group.targetCount) + 10));
    group.material.opacity = 0.9 * Math.min(1, maxVisibleAlpha);

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

      const glowMat = group.glowSprite.material as THREE.SpriteMaterial;
      if (glowMat.map) glowMat.map.dispose();
      glowMat.dispose();
      this.scene.remove(group.glowSprite);
    });
  }
}
