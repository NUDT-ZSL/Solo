import * as THREE from 'three';

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles: number;
  private activeCount: number = 0;

  constructor(scene: THREE.Scene, maxParticles: number = 1000, size: number = 3) {
    this.scene = scene;
    this.maxParticles = maxParticles;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: size,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  emit(
    position: THREE.Vector3,
    count: number,
    options: {
      velocityRange?: THREE.Vector3;
      color?: THREE.Color;
      colorHueRange?: [number, number];
      life?: number;
      size?: number;
    } = {}
  ): void {
    const {
      velocityRange = new THREE.Vector3(0.5, 0.5, 0.5),
      color,
      colorHueRange,
      life = 0.5,
      size = 3
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const particleColor = new THREE.Color();
      if (color) {
        particleColor.copy(color);
      } else if (colorHueRange) {
        const hue = colorHueRange[0] + Math.random() * (colorHueRange[1] - colorHueRange[0]);
        particleColor.setHSL(hue / 360, 0.8, 0.6);
      } else {
        particleColor.setHSL(Math.random(), 0.8, 0.6);
      }

      const particle: ParticleData = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * velocityRange.x,
          (Math.random() - 0.5) * velocityRange.y,
          (Math.random() - 0.5) * velocityRange.z
        ),
        color: particleColor,
        life: life,
        maxLife: life,
        size: size * (0.5 + Math.random() * 0.5)
      };

      this.particles.push(particle);
    }
  }

  update(deltaTime: number): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    this.activeCount = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.velocity.multiplyScalar(0.98);

      const alpha = p.life / p.maxLife;
      const idx = this.activeCount;

      positions.setXYZ(
        idx,
        p.position.x,
        p.position.y,
        p.position.z
      );

      colors.setXYZ(
        idx,
        p.color.r * alpha,
        p.color.g * alpha,
        p.color.b * alpha
      );

      sizes.setX(idx, p.size * alpha);
      this.activeCount++;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    (positions as any).count = this.activeCount;
    (colors as any).count = this.activeCount;
    (sizes as any).count = this.activeCount;
    this.geometry.setDrawRange(0, this.activeCount);
  }

  setGlobalSize(size: number): void {
    this.material.size = size;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
    this.particles = [];
  }
}

export class TrailParticles {
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxTrail: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private trailIndex: number = 0;
  private color: THREE.Color;

  constructor(scene: THREE.Scene, maxTrail: number = 20, color: THREE.Color = new THREE.Color(0xffffff), size: number = 3) {
    this.scene = scene;
    this.maxTrail = maxTrail;
    this.color = color.clone();

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxTrail * 3);
    this.colors = new Float32Array(maxTrail * 3);
    const sizes = new Float32Array(maxTrail);

    for (let i = 0; i < maxTrail; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -9999;
      this.positions[i * 3 + 2] = 0;
      sizes[i] = size;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: size,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  addPoint(position: THREE.Vector3): void {
    const idx = this.trailIndex % this.maxTrail;
    this.positions[idx * 3] = position.x;
    this.positions[idx * 3 + 1] = position.y;
    this.positions[idx * 3 + 2] = position.z;
    this.trailIndex++;

    this.updateColors();
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateColors(): void {
    for (let i = 0; i < this.maxTrail; i++) {
      let relIdx: number;
      const currentHead = (this.trailIndex - 1) % this.maxTrail;
      if (i <= currentHead) {
        relIdx = (currentHead - i) / this.maxTrail;
      } else {
        relIdx = (currentHead + this.maxTrail - i) / this.maxTrail;
      }

      const alpha = Math.max(0, 1 - relIdx);
      this.colors[i * 3] = this.color.r * alpha;
      this.colors[i * 3 + 1] = this.color.g * alpha;
      this.colors[i * 3 + 2] = this.color.b * alpha;
    }
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  fadeOut(deltaTime: number, fadeSpeed: number = 2): void {
    this.material.opacity = Math.max(0, this.material.opacity - deltaTime * fadeSpeed);
  }

  isFaded(): boolean {
    return this.material.opacity <= 0.01;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
