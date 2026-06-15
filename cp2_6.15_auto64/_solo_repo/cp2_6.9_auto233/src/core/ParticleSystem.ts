import * as THREE from 'three';
import { FieldCore, FieldLineData } from './FieldCore';

export interface Particle {
  mesh: THREE.Mesh;
  fieldLineIndex: number;
  progress: number;
  speed: number;
  baseSpeed: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  colorTransition: number;
  active: boolean;
}

export interface ParticleFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
}

export interface LightBurst {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private fieldCore: FieldCore;
  private group: THREE.Group;
  private particles: Particle[] = [];
  private fragments: ParticleFragment[] = [];
  private ripples: Ripple[] = [];
  private lightBursts: LightBurst[] = [];
  private baseParticleCount: number = 200;
  private particleColors: string[] = ['#FF4081', '#7C4DFF', '#18FFFF', '#FFD740'];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onClickCallback: ((particle: Particle) => void) | null = null;

  constructor(scene: THREE.Scene, fieldCore: FieldCore) {
    this.scene = scene;
    this.fieldCore = fieldCore;
    this.group = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.createParticles();
    this.scene.add(this.group);
  }

  getObject3D(): THREE.Group {
    return this.group;
  }

  getActiveParticleCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  getTotalParticleCount(): number {
    return this.particles.length;
  }

  setOnClickCallback(callback: (particle: Particle) => void): void {
    this.onClickCallback = callback;
  }

  rebuild(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.particles = [];
    this.fragments = [];
    this.ripples = [];
    this.lightBursts = [];
    this.createParticles();
  }

  private createParticles(): void {
    const densityMult = this.fieldCore.getParticleDensityMultiplier();
    const sizeMult = this.fieldCore.getParticleSizeMultiplier();
    const particleCount = Math.floor(this.baseParticleCount * densityMult);
    const fieldLines = this.fieldCore.getFieldLines();

    for (let i = 0; i < particleCount; i++) {
      if (fieldLines.length === 0) break;

      const fieldLineIndex = Math.floor(Math.random() * fieldLines.length);
      const progress = Math.random();
      const baseSpeed = 0.5 + Math.random() * 1.5;
      const colorHex = this.particleColors[Math.floor(Math.random() * this.particleColors.length)];
      const color = new THREE.Color(colorHex);
      const targetColor = color.clone();

      const size = (0.1 + Math.random() * 0.2) * sizeMult;
      const geometry = new THREE.SphereGeometry(size, 12, 12);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isParticle = true;
      mesh.userData.particleIndex = i;

      const fl = fieldLines[fieldLineIndex];
      const pos = fl.curve.getPointAt(progress);
      mesh.position.copy(pos);

      this.group.add(mesh);
      this.particles.push({
        mesh,
        fieldLineIndex,
        progress,
        speed: baseSpeed,
        baseSpeed,
        color,
        targetColor,
        colorTransition: 1,
        active: true
      });
    }
  }

  handleClick(event: MouseEvent, camera: THREE.Camera): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = this.particles.filter(p => p.active).map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const idx = mesh.userData.particleIndex;
      if (idx !== undefined && this.particles[idx]) {
        this.shatterParticle(this.particles[idx]);
        if (this.onClickCallback) {
          this.onClickCallback(this.particles[idx]);
        }
      }
    }
  }

  private shatterParticle(particle: Particle): void {
    const origin = particle.mesh.position.clone();
    const originalColor = particle.color.clone();
    const complementaryColor = this.getComplementaryColor(originalColor);

    const fragmentCount = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < fragmentCount; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: originalColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(origin);

      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 1 + Math.random() * 2;

      this.group.add(mesh);
      this.fragments.push({
        mesh,
        velocity: direction.multiplyScalar(speed),
        life: 2,
        maxLife: 2
      });
    }

    const rippleGeometry = new THREE.RingGeometry(0.45, 0.55, 48);
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: complementaryColor,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial);
    rippleMesh.position.copy(origin);
    rippleMesh.lookAt(origin.clone().add(new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.5),
      (Math.random() - 0.5)
    )));
    this.group.add(rippleMesh);
    this.ripples.push({
      mesh: rippleMesh,
      life: 1,
      maxLife: 1,
      startRadius: 0.5,
      endRadius: 2
    });

    particle.active = false;
    particle.mesh.visible = false;

    setTimeout(() => {
      this.respawnParticle(particle);
    }, 2000 + Math.random() * 1000);
  }

  private respawnParticle(particle: Particle): void {
    const fieldLines = this.fieldCore.getFieldLines();
    if (fieldLines.length === 0) return;

    particle.fieldLineIndex = Math.floor(Math.random() * fieldLines.length);
    particle.progress = Math.random();
    particle.baseSpeed = 0.5 + Math.random() * 1.5;
    particle.speed = particle.baseSpeed;
    const colorHex = this.particleColors[Math.floor(Math.random() * this.particleColors.length)];
    particle.targetColor = new THREE.Color(colorHex);
    particle.colorTransition = 0;
    particle.active = true;
    particle.mesh.visible = true;
  }

  private getComplementaryColor(color: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + 0.5) % 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  private spawnLightBurst(position: THREE.Vector3, color: THREE.Color): void {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.group.add(mesh);
    this.lightBursts.push({
      mesh,
      life: 0.3,
      maxLife: 0.3
    });
  }

  update(deltaTime: number): void {
    const fieldLines = this.fieldCore.getFieldLines();
    const intensityFactor = this.fieldCore.getIntensityFactor();
    const hueOffset = this.fieldCore.getHueOffset();

    for (const particle of this.particles) {
      if (!particle.active) continue;

      if (particle.colorTransition < 1) {
        particle.colorTransition = Math.min(1, particle.colorTransition + deltaTime / 0.5);
        const c = particle.color.clone().lerp(particle.targetColor, particle.colorTransition);
        (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(c);
        if (particle.colorTransition >= 1) {
          particle.color.copy(particle.targetColor);
        }
      } else {
        const hsl = { h: 0, s: 0, l: 0 };
        const baseColor = new THREE.Color(this.particleColors.find(
          c => new THREE.Color(c).getHexString() === particle.color.getHexString()
        ) || this.particleColors[0]);
        baseColor.getHSL(hsl);
        hsl.h = (hsl.h + hueOffset) % 1;
        if (hsl.h < 0) hsl.h += 1;
        const shiftedColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
        (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(shiftedColor);
      }

      particle.speed = particle.baseSpeed * (0.5 + intensityFactor * 1.5);
      particle.progress += particle.speed * deltaTime * 0.1;
      if (particle.progress >= 1) {
        particle.progress -= 1;
      }
      if (particle.progress < 0) {
        particle.progress += 1;
      }

      if (particle.fieldLineIndex < fieldLines.length) {
        const fl = fieldLines[particle.fieldLineIndex];
        const pos = fl.curve.getPointAt(particle.progress);
        particle.mesh.position.copy(pos);

        if (Math.abs(particle.progress - Math.round(particle.progress * 10) / 10) < deltaTime * 0.5) {
          if (Math.random() < 0.08) {
            const burstColor = particle.color.clone();
            this.spawnLightBurst(pos, burstColor);
          }
        }
      }
    }

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      frag.life -= deltaTime;
      frag.mesh.position.add(frag.velocity.clone().multiplyScalar(deltaTime));
      const opacity = Math.max(0, frag.life / frag.maxLife);
      (frag.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      if (frag.life <= 0) {
        this.group.remove(frag.mesh);
        frag.mesh.geometry.dispose();
        (frag.mesh.material as THREE.Material).dispose();
        this.fragments.splice(i, 1);
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.life -= deltaTime;
      const t = 1 - ripple.life / ripple.maxLife;
      const radius = ripple.startRadius + (ripple.endRadius - ripple.startRadius) * t;
      const opacity = 0.6 * (1 - t);

      ripple.mesh.geometry.dispose();
      ripple.mesh.geometry = new THREE.RingGeometry(radius * 0.9, radius, 48);
      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);

      if (ripple.life <= 0) {
        this.group.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.lightBursts.length - 1; i >= 0; i--) {
      const burst = this.lightBursts[i];
      burst.life -= deltaTime;
      const t = 1 - burst.life / burst.maxLife;
      const scale = 1 + t * 0.5;
      const opacity = 0.8 * (1 - t);
      burst.mesh.scale.setScalar(scale);
      (burst.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);

      if (burst.life <= 0) {
        this.group.remove(burst.mesh);
        burst.mesh.geometry.dispose();
        (burst.mesh.material as THREE.Material).dispose();
        this.lightBursts.splice(i, 1);
      }
    }
  }
}
