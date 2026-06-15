import * as THREE from 'three';
import { WindField } from './windField';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  age: number;
}

export interface ParticleSystemParams {
  particleCount: number;
  bounds: number;
  particleSize: number;
  defaultLifetime: number;
}

export class ParticleSystem {
  private particles: Particle[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private windField: WindField;
  private bounds: number;
  private particleCount: number;
  private particleSize: number;
  private lifetime: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private targetPositions: Float32Array;

  constructor(windField: WindField, params: ParticleSystemParams) {
    this.windField = windField;
    this.particleCount = params.particleCount;
    this.bounds = params.bounds;
    this.particleSize = params.particleSize;
    this.lifetime = params.defaultLifetime;
    this.particles = [];

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);
    this.targetPositions = new Float32Array(this.particleCount * 3);

    this.geometry = new THREE.BufferGeometry();
    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = ParticleSystem.createShaderMaterial(this.particleSize);

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private static createShaderMaterial(pointSize: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: ParticleSystem.createCircleTexture() },
        size: { value: pointSize }
      },
      vertexShader: `
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float size;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.01) discard;
          gl_FragColor = vec4(vColor, vAlpha) * texColor;
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private static createCircleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createParticle(): Particle {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 2 * this.bounds,
      (Math.random() - 0.5) * 2 * this.bounds,
      (Math.random() - 0.5) * 2 * this.bounds
    );

    const velocity = this.windField.getWindVelocity(position);
    const maxLifetime = this.lifetime * (0.6 + Math.random() * 0.8);

    return {
      position,
      velocity,
      lifetime: maxLifetime,
      maxLifetime,
      age: Math.random() * maxLifetime
    };
  }

  private resetParticle(particle: Particle): void {
    particle.position.set(
      (Math.random() - 0.5) * 2 * this.bounds,
      (Math.random() - 0.5) * 2 * this.bounds,
      (Math.random() - 0.5) * 2 * this.bounds
    );
    particle.velocity.copy(this.windField.getWindVelocity(particle.position));
    particle.age = 0;
    particle.maxLifetime = this.lifetime * (0.6 + Math.random() * 0.8);
    particle.lifetime = particle.maxLifetime;
  }

  private resetParticleAtBoundary(particle: Particle): void {
    const axis = Math.floor(Math.random() * 3);
    const sign = Math.random() > 0.5 ? 1 : -1;

    particle.position.set(
      (Math.random() - 0.5) * 2 * this.bounds,
      (Math.random() - 0.5) * 2 * this.bounds,
      (Math.random() - 0.5) * 2 * this.bounds
    );

    if (axis === 0) {
      particle.position.x = sign * this.bounds;
    } else if (axis === 1) {
      particle.position.y = sign * this.bounds;
    } else {
      particle.position.z = sign * this.bounds;
    }

    particle.velocity.copy(this.windField.getWindVelocity(particle.position));
    particle.age = 0;
    particle.maxLifetime = this.lifetime * (0.6 + Math.random() * 0.8);
    particle.lifetime = particle.maxLifetime;
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.createParticle();
      this.particles.push(particle);
      this.updateParticleBuffers(i, particle, 1);
    }
  }

  private updateParticleBuffers(index: number, particle: Particle, viewAlpha: number): void {
    const i3 = index * 3;
    this.positions[i3] = particle.position.x;
    this.positions[i3 + 1] = particle.position.y;
    this.positions[i3 + 2] = particle.position.z;

    const speed = particle.velocity.length();
    const color = this.windField.getSpeedColor(speed);
    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;

    const lifeRatio = particle.age / particle.maxLifetime;
    let alpha = viewAlpha;
    if (lifeRatio < 0.1) {
      alpha *= lifeRatio / 0.1;
    } else if (lifeRatio > 0.85) {
      alpha *= Math.max(0, (1 - lifeRatio) / 0.15);
    }
    this.alphas[index] = Math.max(0, Math.min(1, alpha));
  }

  update(deltaTime: number, cameraDirection: THREE.Vector3): void {
    const camDir = cameraDirection.clone().normalize();

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      
      particle.age += deltaTime;

      const windVelocity = this.windField.getWindVelocity(particle.position);
      particle.velocity.lerp(windVelocity, deltaTime * 3);

      particle.position.addScaledVector(particle.velocity, deltaTime * 0.5);

      let outOfBounds = false;
      if (Math.abs(particle.position.x) > this.bounds) outOfBounds = true;
      if (Math.abs(particle.position.y) > this.bounds) outOfBounds = true;
      if (Math.abs(particle.position.z) > this.bounds) outOfBounds = true;

      if (outOfBounds || particle.age >= particle.maxLifetime) {
        if (outOfBounds) {
          this.resetParticleAtBoundary(particle);
        } else {
          this.resetParticle(particle);
        }
      }

      const toParticle = particle.position.clone().normalize();
      const viewDot = Math.abs(toParticle.dot(camDir));
      const viewAlpha = 0.3 + viewDot * 0.5;

      this.updateParticleBuffers(i, particle, viewAlpha);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
  }

  updateLifetime(lifetime: number): void {
    const oldLifetime = this.lifetime;
    this.lifetime = lifetime;
    const ratio = lifetime / oldLifetime;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const newMaxLifetime = particle.maxLifetime * ratio;
      particle.age = particle.age * ratio;
      particle.maxLifetime = newMaxLifetime;
      particle.lifetime = newMaxLifetime;
    }
  }

  reset(): void {
    this.particles = [];
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);
    this.initializeParticles();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }

  getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }

  getParticleByIndex(index: number): Particle | null {
    if (index >= 0 && index < this.particles.length) {
      return this.particles[index];
    }
    return null;
  }
}
