import * as THREE from 'three';
import { ParticleUnit, ParticleColorGroup, PARTICLE_COLORS } from './ParticleUnit';
import { SoundSynthesizer } from './SoundSynthesizer';

interface ParticleGroup {
  color: ParticleColorGroup;
  center: THREE.Vector3;
  rotationSpeed: number;
  particles: ParticleUnit[];
  light: THREE.PointLight;
}

interface HaloEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

const GROUP_CONFIGS: { color: ParticleColorGroup; centerOffset: [number, number, number]; baseRotationSpeed: number }[] = [
  { color: 'blue', centerOffset: [-18, 3, -10], baseRotationSpeed: 0.3 },
  { color: 'purple', centerOffset: [15, -5, -8], baseRotationSpeed: 0.25 },
  { color: 'pink', centerOffset: [-5, 8, 12], baseRotationSpeed: 0.35 },
  { color: 'cyan', centerOffset: [10, -8, 15], baseRotationSpeed: 0.2 },
  { color: 'orange', centerOffset: [0, 12, -15], baseRotationSpeed: 0.28 },
];

const COLLAPSE_PROBABILITY = 0.0005;
const COLLAPSE_RADIUS = 8;
const MAX_CONCURRENT_COLLAPSES = 3;

export class StardustEngine {
  private scene: THREE.Scene;
  private groups: ParticleGroup[] = [];
  private haloEffects: HaloEffect[] = [];
  private speedMultiplier = 1;
  private targetDensity = 800;
  private synthesizer: SoundSynthesizer;
  private allParticles: ParticleUnit[] = [];
  private activeCollapseCount = 0;

  constructor(scene: THREE.Scene, synthesizer: SoundSynthesizer) {
    this.scene = scene;
    this.synthesizer = synthesizer;
    this.buildGroups(this.targetDensity);
  }

  private buildGroups(totalDensity: number): void {
    for (const g of this.groups) {
      for (const p of g.particles) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      }
      this.scene.remove(g.light);
    }
    this.groups = [];
    this.allParticles = [];

    const perGroup = Math.floor(totalDensity / GROUP_CONFIGS.length);

    for (const cfg of GROUP_CONFIGS) {
      const center = new THREE.Vector3(...cfg.centerOffset);
      const light = new THREE.PointLight(PARTICLE_COLORS[cfg.color].hex, 2, 40);
      light.position.copy(center);
      this.scene.add(light);

      const group: ParticleGroup = {
        color: cfg.color,
        center,
        rotationSpeed: cfg.baseRotationSpeed,
        particles: [],
        light,
      };

      for (let i = 0; i < perGroup; i++) {
        const orbitRadius = 3 + Math.random() * 12;
        const orbitSpeed = cfg.baseRotationSpeed * (0.7 + Math.random() * 0.6);
        const size = 0.15 + Math.random() * 0.35;
        const particle = new ParticleUnit(cfg.color, center, orbitRadius, orbitSpeed, size);
        group.particles.push(particle);
        this.allParticles.push(particle);
        this.scene.add(particle.mesh);
      }

      this.groups.push(group);
    }
  }

  setSpeedMultiplier(val: number): void {
    this.speedMultiplier = val;
  }

  setDensity(density: number): void {
    if (density === this.targetDensity) return;
    this.targetDensity = density;
    this.buildGroups(density);
  }

  update(deltaTime: number): void {
    this.updateParticles(deltaTime);
    this.tryRandomCollapse();
    this.updateHaloEffects();
    this.simpleCollisionCheck();
  }

  private updateParticles(deltaTime: number): void {
    for (const p of this.allParticles) {
      p.update(deltaTime, this.speedMultiplier);
    }
  }

  private tryRandomCollapse(): void {
    if (this.activeCollapseCount >= MAX_CONCURRENT_COLLAPSES) return;
    if (Math.random() > COLLAPSE_PROBABILITY) return;

    const groupIdx = Math.floor(Math.random() * this.groups.length);
    const group = this.groups[groupIdx];
    const candidates = group.particles.filter(p => {
      const state = (p as any).collapseState;
      return state === 'normal' || state === undefined;
    });
    if (candidates.length === 0) return;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    target.triggerCollapse();
    this.activeCollapseCount++;

    const nearby = group.particles.filter(p => {
      if (p === target) return false;
      const state = (p as any).collapseState;
      if (state !== 'normal' && state !== undefined) return false;
      return p.getPosition().distanceTo(target.getPosition()) < COLLAPSE_RADIUS;
    });

    for (const p of nearby) {
      if (this.activeCollapseCount >= MAX_CONCURRENT_COLLAPSES * 5) break;
      p.triggerCollapse();
      this.activeCollapseCount++;
    }

    setTimeout(() => {
      this.activeCollapseCount = Math.max(0, this.activeCollapseCount - 1 - nearby.length);
    }, 3000);
  }

  private simpleCollisionCheck(): void {
    for (const group of this.groups) {
      const particles = group.particles;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if ((a as any).collapseState !== 'normal' && (a as any).collapseState !== undefined) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if ((b as any).collapseState !== 'normal' && (b as any).collapseState !== undefined) continue;
          const dist = a.getPosition().distanceTo(b.getPosition());
          const minDist = a.size + b.size + 0.3;
          if (dist < minDist && dist > 0.001) {
            const dir = a.getPosition().sub(b.getPosition()).normalize();
            const push = (minDist - dist) * 0.5;
            a.mesh.position.add(dir.clone().multiplyScalar(push));
            b.mesh.position.add(dir.clone().multiplyScalar(-push));
          }
        }
      }
    }
  }

  triggerPulse(particle: ParticleUnit): void {
    const pos = particle.getPosition();
    const normalizedX = (pos.x + 30) / 60;
    this.synthesizer.playPulse(particle.colorGroup, Math.max(0, Math.min(1, normalizedX)));
    this.createHalo(pos, PARTICLE_COLORS[particle.colorGroup].hex);
  }

  private createHalo(position: THREE.Vector3, color: number): void {
    const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(new THREE.Vector3(0, 0, 1)));
    this.scene.add(mesh);

    this.haloEffects.push({
      mesh,
      startTime: performance.now(),
      duration: 1200,
    });
  }

  private updateHaloEffects(): void {
    const now = performance.now();
    for (let i = this.haloEffects.length - 1; i >= 0; i--) {
      const halo = this.haloEffects[i];
      const elapsed = now - halo.startTime;
      const t = elapsed / halo.duration;

      if (t >= 1) {
        this.scene.remove(halo.mesh);
        halo.mesh.geometry.dispose();
        (halo.mesh.material as THREE.Material).dispose();
        this.haloEffects.splice(i, 1);
        continue;
      }

      const scale = 1 + t * 12;
      halo.mesh.scale.set(scale, scale, scale);
      (halo.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t * t);
    }
  }

  getAllParticles(): ParticleUnit[] {
    return this.allParticles;
  }

  findParticleByMesh(mesh: THREE.Mesh): ParticleUnit | null {
    for (const p of this.allParticles) {
      if (p.mesh === mesh) return p;
    }
    return null;
  }
}
