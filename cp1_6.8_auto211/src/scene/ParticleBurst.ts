import * as THREE from 'three';

interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angle: number;
  radius: number;
  angularSpeed: number;
  radialSpeed: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

const PARTICLES_PER_BURST = 80;
const MAX_TOTAL_PARTICLES = 5000;

export class ParticleBurst {
  private scene: THREE.Scene;
  private bursts: { particles: BurstParticle[]; points: THREE.Points }[] = [];
  private spreadSpeed = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setSpreadSpeed(speed: number): void {
    this.spreadSpeed = speed;
  }

  emit(origin: THREE.Vector3, colorStart: THREE.Color, colorEnd: THREE.Color): void {
    const totalParticleCount = this.bursts.reduce((sum, b) => sum + b.particles.length, 0);
    if (totalParticleCount >= MAX_TOTAL_PARTICLES) {
      const oldest = this.bursts.shift();
      if (oldest) {
        this.scene.remove(oldest.points);
        oldest.points.geometry.dispose();
        (oldest.points.material as THREE.Material).dispose();
      }
    }

    const particles: BurstParticle[] = [];
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLES_PER_BURST * 3);
    const colors = new Float32Array(PARTICLES_PER_BURST * 3);
    const sizes = new Float32Array(PARTICLES_PER_BURST);

    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      const angle = (i / PARTICLES_PER_BURST) * Math.PI * 2 + Math.random() * 0.5;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const t = Math.random();
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);

      const particle: BurstParticle = {
        position: origin.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation),
          Math.sin(elevation),
          Math.sin(angle) * Math.cos(elevation)
        ),
        angle: angle,
        radius: 0,
        angularSpeed: 0.02 + Math.random() * 0.04,
        radialSpeed: (0.05 + Math.random() * 0.1) * this.spreadSpeed,
        life: 1.0,
        maxLife: 1.5 + Math.random() * 1.5,
        color: color,
      };

      particles.push(particle);

      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.bursts.push({ particles, points });
  }

  update(delta: number): void {
    const toRemove: number[] = [];

    for (let b = 0; b < this.bursts.length; b++) {
      const burst = this.bursts[b];
      let allDead = true;
      const positions = burst.points.geometry.attributes.position.array as Float32Array;
      const colors = burst.points.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < burst.particles.length; i++) {
        const p = burst.particles[i];
        p.life -= delta / p.maxLife;

        if (p.life <= 0) {
          p.life = 0;
        } else {
          allDead = false;
        }

        p.radius += p.radialSpeed * this.spreadSpeed;
        p.angle += p.angularSpeed;

        const spiralX = Math.cos(p.angle) * p.radius;
        const spiralZ = Math.sin(p.angle) * p.radius;

        p.position.x += (p.velocity.x * 0.3 + spiralX * 0.02) * this.spreadSpeed;
        p.position.y += (p.velocity.y * 0.3 + p.radius * 0.01) * this.spreadSpeed;
        p.position.z += (p.velocity.z * 0.3 + spiralZ * 0.02) * this.spreadSpeed;

        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        const fade = Math.max(0, p.life);
        colors[i * 3] = p.color.r * fade;
        colors[i * 3 + 1] = p.color.g * fade;
        colors[i * 3 + 2] = p.color.b * fade;
      }

      burst.points.geometry.attributes.position.needsUpdate = true;
      burst.points.geometry.attributes.color.needsUpdate = true;
      (burst.points.material as THREE.PointsMaterial).opacity = 1.0;

      if (allDead) {
        toRemove.push(b);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const burst = this.bursts[idx];
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      (burst.points.material as THREE.Material).dispose();
      this.bursts.splice(idx, 1);
    }
  }

  clearAll(): void {
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      (burst.points.material as THREE.Material).dispose();
    }
    this.bursts = [];
  }
}
