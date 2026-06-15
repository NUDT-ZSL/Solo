import * as THREE from 'three';

export type ColorTheme = 'rainbow' | 'fire' | 'ocean' | 'forest';

const THEMES: Record<ColorTheme, { h: [number, number]; s: [number, number]; l: [number, number] }> = {
  rainbow: { h: [0, 360], s: [80, 100], l: [55, 70] },
  fire:    { h: [0, 50],  s: [90, 100], l: [50, 65] },
  ocean:   { h: [170, 230], s: [70, 95], l: [50, 70] },
  forest:  { h: [80, 160], s: [55, 85], l: [40, 60] },
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  birth: number;
  lifespan: number;
  fadingOut: boolean;
  fadeStart: number;
  fadeDuration: number;
}

export interface ParticleSystemOptions {
  maxParticles?: number;
  particleSize?: number;
  damping?: number;
  noiseAmount?: number;
  cohesionStrength?: number;
  cohesionRadius?: number;
  freezeDelay?: number;
  emissionRate?: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles: number;
  private particleSize: number;
  private damping: number;
  private noiseAmount: number;
  private cohesionStrength: number;
  private cohesionRadius: number;
  private freezeDelay: number;
  private emissionRate: number;
  private emissionAccumulator = 0;
  private theme: ColorTheme = 'rainbow';
  private sculptureMode = false;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private clock: THREE.Clock;
  private clearFading = false;
  private clearFadeStart = 0;
  private clearFadeDuration = 0.5;

  constructor(scene: THREE.Scene, options: ParticleSystemOptions = {}) {
    this.scene = scene;
    this.maxParticles = options.maxParticles ?? 5000;
    this.particleSize = options.particleSize ?? 0.12;
    this.damping = options.damping ?? 0.95;
    this.noiseAmount = options.noiseAmount ?? 0.1;
    this.cohesionStrength = options.cohesionStrength ?? 0.015;
    this.cohesionRadius = options.cohesionRadius ?? 0.6;
    this.freezeDelay = options.freezeDelay ?? 5.0;
    this.emissionRate = options.emissionRate ?? 60;
    this.clock = new THREE.Clock();

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public setTheme(theme: ColorTheme): void {
    this.theme = theme;
  }

  public setSculptureMode(enabled: boolean): void {
    this.sculptureMode = enabled;
  }

  public clearAll(): void {
    if (this.particles.length === 0) return;
    this.clearFading = true;
    this.clearFadeStart = this.clock.getElapsedTime();
    for (const p of this.particles) {
      if (!p.fadingOut) {
        p.fadingOut = true;
        p.fadeStart = this.clock.getElapsedTime();
        p.fadeDuration = this.clearFadeDuration;
      }
    }
  }

  public emit(worldPos: THREE.Vector3, direction: THREE.Vector3, count: number = 1): void {
    const t = this.clock.getElapsedTime();
    const theme = THEMES[this.theme];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        const oldest = this.particles.shift()!;
        oldest.fadingOut = true;
        oldest.fadeStart = t;
        oldest.fadeDuration = 0.8;
        this.particles.push(oldest);
      }

      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      );

      const pos = worldPos.clone().add(offset);
      const vel = direction.clone()
        .multiplyScalar(0.8 + Math.random() * 0.6)
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ));

      const h = theme.h[0] + Math.random() * (theme.h[1] - theme.h[0]);
      const s = theme.s[0] + Math.random() * (theme.s[1] - theme.s[0]);
      const l = theme.l[0] + Math.random() * (theme.l[1] - theme.l[0]);
      const color = new THREE.Color().setHSL(h / 360, s / 100, l / 100);

      this.particles.push({
        position: pos,
        velocity: vel,
        color,
        birth: t,
        lifespan: this.freezeDelay,
        fadingOut: false,
        fadeStart: 0,
        fadeDuration: 0,
      });
    }
  }

  public emitContinuous(worldPos: THREE.Vector3, direction: THREE.Vector3, dt: number): void {
    this.emissionAccumulator += this.emissionRate * dt;
    const count = Math.floor(this.emissionAccumulator);
    if (count > 0) {
      this.emit(worldPos, direction, count);
      this.emissionAccumulator -= count;
    }
  }

  public update(): void {
    const t = this.clock.getElapsedTime();
    const count = this.particles.length;

    for (let i = count - 1; i >= 0; i--) {
      const p = this.particles[i];
      const age = t - p.birth;

      if (p.fadingOut) {
        if (t - p.fadeStart >= p.fadeDuration) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        if (age < p.lifespan) {
          const freezeFactor = Math.min(1, age / p.lifespan);
          const activeFactor = 1 - freezeFactor * freezeFactor;

          for (let j = Math.max(0, i - 30); j < Math.min(count, i + 30); j++) {
            if (j === i) continue;
            const other = this.particles[j];
            const dx = other.position.x - p.position.x;
            const dy = other.position.y - p.position.y;
            const dz = other.position.z - p.position.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < this.cohesionRadius * this.cohesionRadius && distSq > 0.001) {
              const dist = Math.sqrt(distSq);
              const strength = this.cohesionStrength * (1 - dist / this.cohesionRadius) * activeFactor;
              p.velocity.x += (dx / dist) * strength;
              p.velocity.y += (dy / dist) * strength;
              p.velocity.z += (dz / dist) * strength;
            }
          }

          p.velocity.x += (Math.random() - 0.5) * this.noiseAmount * activeFactor;
          p.velocity.y += (Math.random() - 0.5) * this.noiseAmount * activeFactor;
          p.velocity.z += (Math.random() - 0.5) * this.noiseAmount * activeFactor;

          const damp = Math.pow(this.damping, 1) * (1 - freezeFactor * 0.3);
          p.velocity.multiplyScalar(damp);

          p.position.add(p.velocity.clone().multiplyScalar(0.016));
        }
      }
    }

    this.updateBuffers(t);
  }

  private updateBuffers(t: number): void {
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      let alpha = 1;
      if (p.fadingOut) {
        const progress = (t - p.fadeStart) / p.fadeDuration;
        alpha = Math.max(0, 1 - progress);
      } else {
        const age = t - p.birth;
        if (age < 0.1) {
          alpha = age / 0.1;
        } else if (age >= p.lifespan) {
          alpha = 0.55;
        }
      }

      const emissiveBoost = p.fadingOut ? 0 : (t - p.birth >= p.lifespan ? 0.3 : 0);
      let r = p.color.r;
      let g = p.color.g;
      let b = p.color.b;

      if (this.sculptureMode) {
        alpha *= 0.45;
        r = Math.min(1, r + emissiveBoost * 0.5);
        g = Math.min(1, g + emissiveBoost * 0.5);
        b = Math.min(1, b + emissiveBoost * 0.5);
      } else {
        r = Math.min(1, r + emissiveBoost);
        g = Math.min(1, g + emissiveBoost);
        b = Math.min(1, b + emissiveBoost);
      }

      this.colors[i * 3] = r * alpha;
      this.colors[i * 3 + 1] = g * alpha;
      this.colors[i * 3 + 2] = b * alpha;

      const frozen = !p.fadingOut && (t - p.birth >= p.lifespan);
      this.sizes[i] = this.particleSize * (frozen ? 0.85 : 1.0) * (this.sculptureMode ? 1.3 : 1.0);
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, count);

    if (this.sculptureMode) {
      this.material.opacity = 0.6;
    } else {
      this.material.opacity = 0.9;
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
