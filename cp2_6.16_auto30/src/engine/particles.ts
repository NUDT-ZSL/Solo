import * as THREE from 'three';
import { ISceneManager } from './scene';

export interface Fireball {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  pulsePhase: number;
  curveOffset: number;
  active: boolean;
}

export interface Crystal {
  mesh: THREE.Mesh;
  glow: THREE.PointLight;
  rotationSpeed: number;
  breathPhase: number;
  collected: boolean;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface IParticleManager {
  update(delta: number, playerPos: THREE.Vector3): void;
  spawnFireball(position: THREE.Vector3, target: THREE.Vector3, speed: number): void;
  spawnCrystal(position: THREE.Vector3): void;
  spawnCollectEffect(position: THREE.Vector3): void;
  checkFireballCollision(playerPos: THREE.Vector3, radius: number): boolean;
  checkCrystalCollision(playerPos: THREE.Vector3, radius: number): number;
  clearAll(): void;
}

export class ParticleManager implements IParticleManager {
  private scene: ISceneManager;
  private fireballs: Fireball[] = [];
  private crystals: Crystal[] = [];
  private particles: Particle[] = [];
  private maxFireballs: number = 30;
  private maxCrystals: number = 50;
  private maxParticles: number = 200;

  constructor(sceneManager: ISceneManager) {
    this.scene = sceneManager;
    this.poolObjects();
  }

  private poolObjects(): void {
    for (let i = 0; i < this.maxFireballs; i++) {
      const mesh = this.createFireballMesh();
      mesh.visible = false;
      this.scene.addObject(mesh);
      this.fireballs.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        pulsePhase: 0,
        curveOffset: 0,
        active: false
      });
    }

    for (let i = 0; i < this.maxCrystals; i++) {
      const mesh = this.createCrystalMesh();
      const glow = new THREE.PointLight(0x00e5ff, 0.5, 10);
      mesh.visible = false;
      glow.visible = false;
      this.scene.addObject(mesh);
      this.scene.addObject(glow);
      this.crystals.push({
        mesh,
        glow,
        rotationSpeed: 0,
        breathPhase: 0,
        collected: false
      });
    }

    for (let i = 0; i < this.maxParticles; i++) {
      const geometry = new THREE.SphereGeometry(0.15, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.addObject(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false
      });
    }
  }

  private createFireballMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.SphereGeometry(1.3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    return mesh;
  }

  private createCrystalMesh(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 6);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
      metalness: 0.3,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  public spawnFireball(position: THREE.Vector3, target: THREE.Vector3, speed: number): void {
    const fireball = this.fireballs.find(f => !f.active);
    if (!fireball) return;

    fireball.mesh.position.copy(position);
    fireball.mesh.scale.set(1, 1, 1);
    fireball.mesh.visible = true;
    
    const direction = new THREE.Vector3().subVectors(target, position).normalize();
    fireball.velocity.copy(direction.multiplyScalar(speed));
    fireball.life = 8;
    fireball.pulsePhase = Math.random() * Math.PI * 2;
    fireball.curveOffset = (Math.random() - 0.5) * 2;
    fireball.active = true;
  }

  public spawnCrystal(position: THREE.Vector3): void {
    const crystal = this.crystals.find(c => !c.collected);
    if (!crystal) return;

    crystal.mesh.position.copy(position);
    crystal.mesh.rotation.set(0, 0, 0);
    crystal.mesh.scale.set(1, 1, 1);
    crystal.mesh.visible = true;
    crystal.glow.position.copy(position);
    crystal.glow.visible = true;
    crystal.rotationSpeed = 15 * THREE.MathUtils.DEG2RAD;
    crystal.breathPhase = Math.random() * Math.PI * 2;
    crystal.collected = false;
  }

  public spawnCollectEffect(position: THREE.Vector3): void {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.particles.find(p => !p.active);
      if (!particle) break;

      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 3 + Math.random() * 2;
      
      particle.mesh.position.copy(position);
      particle.mesh.visible = true;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      particle.velocity.set(
        Math.cos(angle) * speed,
        Math.sin(angle * 0.5) * speed,
        Math.sin(angle) * speed
      );
      particle.life = 1;
      particle.maxLife = 1;
      particle.active = true;
    }
  }

  public update(delta: number, playerPos: THREE.Vector3): void {
    for (const fireball of this.fireballs) {
      if (!fireball.active) continue;

      fireball.life -= delta;
      if (fireball.life <= 0) {
        this.deactivateFireball(fireball);
        continue;
      }

      fireball.pulsePhase += delta * (Math.PI * 2 / 0.8);
      const pulseScale = 1 + Math.sin(fireball.pulsePhase) * 0.1;
      fireball.mesh.scale.setScalar(pulseScale);

      fireball.curveOffset += delta * 2;
      const curveAmount = Math.sin(fireball.curveOffset) * 0.5;
      
      const velocityCopy = fireball.velocity.clone();
      velocityCopy.x += curveAmount * delta * 5;
      
      fireball.mesh.position.add(velocityCopy.clone().multiplyScalar(delta));
    }

    for (const crystal of this.crystals) {
      if (crystal.collected) continue;

      crystal.mesh.rotation.y += crystal.rotationSpeed * delta;
      
      crystal.breathPhase += delta * (Math.PI * 2 / 1);
      const breathIntensity = 0.5 + Math.sin(crystal.breathPhase) * 0.5;
      (crystal.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = breathIntensity;
      crystal.glow.intensity = breathIntensity * 0.5;
    }

    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.life -= delta;
      if (particle.life <= 0) {
        this.deactivateParticle(particle);
        continue;
      }

      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.velocity.multiplyScalar(0.98);
      
      const opacity = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      
      const scale = 0.5 + opacity * 0.5;
      particle.mesh.scale.setScalar(scale);
    }
  }

  private deactivateFireball(fireball: Fireball): void {
    fireball.active = false;
    fireball.mesh.visible = false;
  }

  private deactivateParticle(particle: Particle): void {
    particle.active = false;
    particle.mesh.visible = false;
  }

  public checkFireballCollision(playerPos: THREE.Vector3, radius: number): boolean {
    const collisionRadius = 1.2 + radius;
    
    for (const fireball of this.fireballs) {
      if (!fireball.active) continue;
      
      const distance = playerPos.distanceTo(fireball.mesh.position);
      if (distance < collisionRadius) {
        this.deactivateFireball(fireball);
        return true;
      }
    }
    
    return false;
  }

  public checkCrystalCollision(playerPos: THREE.Vector3, radius: number): number {
    const collisionRadius = 1 + radius;
    let collected = 0;
    
    for (const crystal of this.crystals) {
      if (crystal.collected) continue;
      
      const distance = playerPos.distanceTo(crystal.mesh.position);
      if (distance < collisionRadius) {
        crystal.collected = true;
        crystal.mesh.visible = false;
        crystal.glow.visible = false;
        this.spawnCollectEffect(crystal.mesh.position.clone());
        collected++;
      }
    }
    
    return collected;
  }

  public clearAll(): void {
    for (const fireball of this.fireballs) {
      this.deactivateFireball(fireball);
    }
    
    for (const crystal of this.crystals) {
      crystal.collected = true;
      crystal.mesh.visible = false;
      crystal.glow.visible = false;
    }
    
    for (const particle of this.particles) {
      this.deactivateParticle(particle);
    }
  }
}
