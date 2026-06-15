import * as THREE from 'three';
import { AudioData } from '../AudioAnalyzer';

export type ThemeKey = 'aurora' | 'flame' | 'ocean';

interface ThemeColors {
  primary: THREE.Color;
  secondary: THREE.Color;
  accent: THREE.Color;
  auroraA: THREE.Color;
  auroraB: THREE.Color;
}

export const THEMES: Record<ThemeKey, ThemeColors> = {
  aurora: {
    primary: new THREE.Color(0x00ff88),
    secondary: new THREE.Color(0x8844ff),
    accent: new THREE.Color(0x00ffcc),
    auroraA: new THREE.Color(0x00ff66),
    auroraB: new THREE.Color(0xaa55ff),
  },
  flame: {
    primary: new THREE.Color(0xff4400),
    secondary: new THREE.Color(0xffcc00),
    accent: new THREE.Color(0xff8800),
    auroraA: new THREE.Color(0xff2200),
    auroraB: new THREE.Color(0xffaa00),
  },
  ocean: {
    primary: new THREE.Color(0x0066ff),
    secondary: new THREE.Color(0x00ccff),
    accent: new THREE.Color(0x00ffcc),
    auroraA: new THREE.Color(0x0033cc),
    auroraB: new THREE.Color(0x00ccff),
  },
};

interface Particle {
  basePos: THREE.Vector3;
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  baseSize: number;
  phase: number;
  speed: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
}

interface Ripple {
  origin: THREE.Vector3;
  radius: number;
  maxRadius: number;
  strength: number;
  age: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private count: number;
  private theme: ThemeKey = 'aurora';
  private currentColors: ThemeColors = THEMES.aurora;
  private targetColors: ThemeColors = THEMES.aurora;
  private colorLerp = 1;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailSizes: Float32Array;
  private trailAlphas: Float32Array;
  private trailGeometry: THREE.BufferGeometry;
  private trailCount: number;

  constructor(count: number) {
    this.count = count;
    this.trailCount = count * 3;

    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.alphas = new Float32Array(this.count);

    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailColors = new Float32Array(this.trailCount * 3);
    this.trailSizes = new Float32Array(this.trailCount);
    this.trailAlphas = new Float32Array(this.trailCount);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.trailSizes, 1));
    this.trailGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.trailAlphas, 1));
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 6;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const basePos = new THREE.Vector3(x, y, z);
      const orbitRadius = 0.3 + Math.random() * 0.8;

      this.particles.push({
        basePos: basePos.clone(),
        pos: basePos.clone(),
        velocity: new THREE.Vector3(),
        size: 0.08 + Math.random() * 0.12,
        baseSize: 0.08 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
        orbitRadius,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.2 + Math.random() * 0.5,
      });
    }
  }

  setTheme(theme: ThemeKey): void {
    if (theme === this.theme && this.colorLerp >= 1) return;
    this.theme = theme;
    this.targetColors = THEMES[theme];
    this.colorLerp = 0;
  }

  setDensity(count: number): void {
    if (count === this.count) return;
    this.count = count;
    this.trailCount = count * 3;

    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.alphas = new Float32Array(this.count);

    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailColors = new Float32Array(this.trailCount * 3);
    this.trailSizes = new Float32Array(this.trailCount);
    this.trailAlphas = new Float32Array(this.trailCount);

    this.initParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.trailSizes, 1));
    this.trailGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.trailAlphas, 1));
  }

  addRipple(origin: THREE.Vector3): void {
    this.ripples.push({
      origin: origin.clone(),
      radius: 0,
      maxRadius: 4 + Math.random() * 2,
      strength: 1.5,
      age: 0,
    });
  }

  update(time: number, delta: number, audioData: AudioData | null): void {
    if (this.colorLerp < 1) {
      this.colorLerp = Math.min(1, this.colorLerp + delta * 1.5);
      const t = this.easeInOutCubic(this.colorLerp);
      this.currentColors = {
        primary: this.currentColors.primary.clone().lerp(this.targetColors.primary, t),
        secondary: this.currentColors.secondary.clone().lerp(this.targetColors.secondary, t),
        accent: this.currentColors.accent.clone().lerp(this.targetColors.accent, t),
        auroraA: this.currentColors.auroraA.clone().lerp(this.targetColors.auroraA, t),
        auroraB: this.currentColors.auroraB.clone().lerp(this.targetColors.auroraB, t),
      };
    }

    const amp = audioData?.amplitude ?? 0;
    const bass = audioData?.bass ?? 0;
    const mid = audioData?.mid ?? 0;
    const treble = audioData?.treble ?? 0;

    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      r.age += delta;
      r.radius += delta * 6;
      r.strength = Math.max(0, 1 - r.age / 1.5);
    }
    this.ripples = this.ripples.filter((r) => r.strength > 0.01);

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];

      p.orbitAngle += p.orbitSpeed * delta * (1 + bass * 2);

      const orbitX = Math.cos(p.orbitAngle) * p.orbitRadius;
      const orbitY = Math.sin(p.orbitAngle * 0.7) * p.orbitRadius * 0.5;

      const floatOffset = Math.sin(time * p.speed + p.phase) * 0.3 * (1 + amp * 3);

      const targetX = p.basePos.x + orbitX + floatOffset * 0.5;
      const targetY = p.basePos.y + orbitY + floatOffset;
      const targetZ = p.basePos.z + Math.cos(time * p.speed * 0.8 + p.phase) * 0.2 * (1 + treble * 2);

      for (const ripple of this.ripples) {
        const dist = p.pos.distanceTo(ripple.origin);
        const rippleDist = Math.abs(dist - ripple.radius);
        if (rippleDist < 1.0) {
          const influence = (1 - rippleDist) * ripple.strength;
          const dir = p.pos.clone().sub(ripple.origin).normalize();
          targetX + dir.x * influence * 2;
          targetY + dir.y * influence * 2;
          targetZ + dir.z * influence * 2;
          p.velocity.add(dir.multiplyScalar(influence * delta * 8));
        }
      }

      p.pos.x += (targetX - p.pos.x) * delta * 2;
      p.pos.y += (targetY - p.pos.y) * delta * 2;
      p.pos.z += (targetZ - p.pos.z) * delta * 2;

      p.pos.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.95);

      const freqIndex = Math.floor((i / this.count) * (audioData?.frequency.length ?? 1));
      const freqValue = audioData?.frequency[freqIndex] ?? 0;

      const colorMix = (Math.sin(time * 0.5 + p.phase) * 0.5 + 0.5) * (0.5 + freqValue * 0.5);
      const color = this.currentColors.primary.clone().lerp(this.currentColors.secondary, colorMix);
      if (freqValue > 0.5) {
        color.lerp(this.currentColors.accent, (freqValue - 0.5) * 2);
      }

      p.size = p.baseSize * (1 + amp * 4 + bass * 2) * (0.8 + freqValue * 1.5);

      const i3 = i * 3;
      this.positions[i3] = p.pos.x;
      this.positions[i3 + 1] = p.pos.y;
      this.positions[i3 + 2] = p.pos.z;

      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.sizes[i] = p.size;
      this.alphas[i] = 0.6 + amp * 0.4 + freqValue * 0.3;

      for (let t = 0; t < 3; t++) {
        const ti = i * 3 + t;
        const trailFactor = (t + 1) * 0.15;
        const ti3 = ti * 3;
        this.trailPositions[ti3] = p.pos.x - p.velocity.x * trailFactor * (t + 1);
        this.trailPositions[ti3 + 1] = p.pos.y - p.velocity.y * trailFactor * (t + 1);
        this.trailPositions[ti3 + 2] = p.pos.z - p.velocity.z * trailFactor * (t + 1);

        this.trailColors[ti3] = color.r * (1 - trailFactor);
        this.trailColors[ti3 + 1] = color.g * (1 - trailFactor);
        this.trailColors[ti3 + 2] = color.b * (1 - trailFactor);

        this.trailSizes[ti] = p.size * (1 - trailFactor * 0.5);
        this.trailAlphas[ti] = (0.3 - trailFactor * 0.08) * (0.5 + amp * 0.5);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.aColor.needsUpdate = true;
    this.trailGeometry.attributes.aSize.needsUpdate = true;
    this.trailGeometry.attributes.aAlpha.needsUpdate = true;
  }

  getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }

  getTrailGeometry(): THREE.BufferGeometry {
    return this.trailGeometry;
  }

  getAuroraColors(): { a: THREE.Color; b: THREE.Color } {
    return { a: this.currentColors.auroraA, b: this.currentColors.auroraB };
  }

  getCount(): number {
    return this.count;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
