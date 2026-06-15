import * as THREE from 'three';
import { ISceneManager } from './scene';

export interface Fireball {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  pulsePhase: number;
  curveOffset: number;
  curveSpeed: number;
  active: boolean;
  spawnSource: 'front' | 'left' | 'right';
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
  spawnFireball(position: THREE.Vector3, target: THREE.Vector3, speed: number, source: 'front' | 'left' | 'right'): void;
  spawnCrystal(position: THREE.Vector3): void;
  spawnCollectEffect(position: THREE.Vector3): void;
  checkFireballCollision(playerPos: THREE.Vector3, playerRadius: number): boolean;
  checkCrystalCollision(playerPos: THREE.Vector3, playerRadius: number): number;
  clearAll(): void;
  logDebugInfo(): void;
}

export class ParticleManager implements IParticleManager {
  private scene: ISceneManager;
  private fireballs: Fireball[] = [];
  private crystals: Crystal[] = [];
  private particles: Particle[] = [];
  private maxFireballs: number = 30;
  private maxCrystals: number = 50;
  private maxParticles: number = 200;
  
  public readonly FIREBALL_RADIUS: number = 1.0;
  public readonly FIREBALL_PULSE_PERIOD: number = 0.8;
  public readonly CRYSTAL_ROTATION_SPEED: number = 15 * THREE.MathUtils.DEG2RAD;
  public readonly CRYSTAL_BREATH_PERIOD: number = 1.0;
  public readonly COLLECT_PARTICLE_COUNT: number = 8;
  public readonly CRYSTAL_RADIUS: number = 0.75;
  
  private debugMode: boolean = true;
  private debugTimer: number = 0;
  private activeFireballCount: number = 0;
  private activeCrystalCount: number = 0;
  private totalFireballsSpawned: number = 0;
  private totalCrystalsSpawned: number = 0;

  constructor(sceneManager: ISceneManager) {
    this.scene = sceneManager;
    this.poolObjects();
    
    if (this.debugMode) {
      console.log('[ParticleManager] 初始化完成');
      console.log(`  火球参数: 半径=${this.FIREBALL_RADIUS}, 脉动周期=${this.FIREBALL_PULSE_PERIOD}s`);
      console.log(`  水晶参数: 半径=${this.CRYSTAL_RADIUS}, 转速=${this.CRYSTAL_ROTATION_SPEED.toFixed(2)}rad/s, 呼吸周期=${this.CRYSTAL_BREATH_PERIOD}s`);
      console.log(`  收集特效: 粒子数=${this.COLLECT_PARTICLE_COUNT}`);
      console.log(`  对象池: 火球=${this.maxFireballs}, 水晶=${this.maxCrystals}, 粒子=${this.maxParticles}`);
    }
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
        curveSpeed: 0,
        active: false,
        spawnSource: 'front'
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
        rotationSpeed: this.CRYSTAL_ROTATION_SPEED,
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
    const geometry = new THREE.SphereGeometry(this.FIREBALL_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.SphereGeometry(this.FIREBALL_RADIUS * 1.3, 16, 16);
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

  public spawnFireball(position: THREE.Vector3, target: THREE.Vector3, speed: number, source: 'front' | 'left' | 'right'): void {
    const fireball = this.fireballs.find(f => !f.active);
    if (!fireball) {
      if (this.debugMode) {
        console.log('[ParticleManager] 火球对象池已满，无法生成新火球');
      }
      return;
    }

    fireball.mesh.position.copy(position);
    fireball.mesh.scale.set(1, 1, 1);
    fireball.mesh.visible = true;
    
    const direction = new THREE.Vector3().subVectors(target, position).normalize();
    fireball.velocity.copy(direction.multiplyScalar(speed));
    fireball.life = 8;
    fireball.pulsePhase = Math.random() * Math.PI * 2;
    fireball.curveOffset = (Math.random() - 0.5) * 2;
    fireball.curveSpeed = 1.5 + Math.random() * 1.5;
    fireball.spawnSource = source;
    fireball.active = true;
    
    this.activeFireballCount++;
    this.totalFireballsSpawned++;
    
    if (this.debugMode) {
      console.log(`[ParticleManager] 生成火球 #${this.totalFireballsSpawned}`);
      console.log(`  来源: ${source}, 位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
      console.log(`  目标: (${target.x.toFixed(1)}, ${target.y.toFixed(1)}, ${target.z.toFixed(1)})`);
      console.log(`  速度: ${speed.toFixed(1)}单位/秒`);
    }
  }

  public spawnCrystal(position: THREE.Vector3): void {
    const crystal = this.crystals.find(c => !c.mesh.visible);
    if (!crystal) {
      if (this.debugMode) {
        console.log('[ParticleManager] 水晶对象池已满，无法生成新水晶');
      }
      return;
    }

    crystal.mesh.position.copy(position);
    crystal.mesh.rotation.set(0, 0, 0);
    crystal.mesh.scale.set(1, 1, 1);
    crystal.mesh.visible = true;
    crystal.glow.position.copy(position);
    crystal.glow.visible = true;
    crystal.rotationSpeed = this.CRYSTAL_ROTATION_SPEED;
    crystal.breathPhase = Math.random() * Math.PI * 2;
    crystal.collected = false;
    
    this.activeCrystalCount++;
    this.totalCrystalsSpawned++;
    
    if (this.debugMode) {
      console.log(`[ParticleManager] 生成水晶 #${this.totalCrystalsSpawned}`);
      console.log(`  位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }
  }

  public spawnCollectEffect(position: THREE.Vector3): void {
    if (this.debugMode) {
      console.log(`[ParticleManager] 触发收集特效，粒子数: ${this.COLLECT_PARTICLE_COUNT}`);
      console.log(`  位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }
    
    for (let i = 0; i < this.COLLECT_PARTICLE_COUNT; i++) {
      const particle = this.particles.find(p => !p.active);
      if (!particle) {
        if (this.debugMode) {
          console.log('[ParticleManager] 粒子对象池已满，跳过部分特效粒子');
        }
        break;
      }

      const angle = (i / this.COLLECT_PARTICLE_COUNT) * Math.PI * 2;
      const speed = 3 + Math.random() * 2;
      
      particle.mesh.position.copy(position);
      particle.mesh.visible = true;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      particle.mesh.scale.setScalar(1);
      particle.velocity.set(
        Math.cos(angle) * speed,
        Math.sin(angle * 0.5) * speed * 0.5,
        Math.sin(angle) * speed
      );
      particle.life = 1;
      particle.maxLife = 1;
      particle.active = true;
    }
  }

  public update(delta: number, playerPos: THREE.Vector3): void {
    this.activeFireballCount = 0;
    for (const fireball of this.fireballs) {
      if (!fireball.active) continue;
      this.activeFireballCount++;

      fireball.life -= delta;
      if (fireball.life <= 0) {
        this.deactivateFireball(fireball);
        continue;
      }

      fireball.pulsePhase += delta * (Math.PI * 2 / this.FIREBALL_PULSE_PERIOD);
      const pulseScale = 1.0 + Math.sin(fireball.pulsePhase) * 0.1;
      fireball.mesh.scale.setScalar(pulseScale);

      fireball.curveOffset += delta * fireball.curveSpeed;
      const curveAmount = Math.sin(fireball.curveOffset) * 0.8;
      
      const velocityCopy = fireball.velocity.clone();
      velocityCopy.x += curveAmount * delta * 5;
      velocityCopy.y += Math.sin(fireball.curveOffset * 0.7) * delta * 3;
      
      fireball.mesh.position.add(velocityCopy.clone().multiplyScalar(delta));
    }

    this.activeCrystalCount = 0;
    for (const crystal of this.crystals) {
      if (crystal.collected) continue;
      this.activeCrystalCount++;

      crystal.mesh.rotation.y += crystal.rotationSpeed * delta;
      
      crystal.breathPhase += delta * (Math.PI * 2 / this.CRYSTAL_BREATH_PERIOD);
      const breathIntensity = 0.5 + Math.sin(crystal.breathPhase) * 0.5;
      (crystal.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = breathIntensity;
      crystal.glow.intensity = breathIntensity * 0.8;
    }

    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.life -= delta;
      if (particle.life <= 0) {
        this.deactivateParticle(particle);
        continue;
      }

      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.velocity.multiplyScalar(0.97);
      
      const opacity = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      
      const scale = 0.5 + opacity * 0.5;
      particle.mesh.scale.setScalar(scale);
    }
    
    if (this.debugMode) {
      this.debugTimer += delta;
      if (this.debugTimer > 5) {
        this.debugTimer = 0;
        this.logDebugInfo();
      }
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

  public checkFireballCollision(playerPos: THREE.Vector3, playerRadius: number): boolean {
    const collisionRadius = this.FIREBALL_RADIUS + playerRadius;
    
    for (const fireball of this.fireballs) {
      if (!fireball.active) continue;
      
      const distance = playerPos.distanceTo(fireball.mesh.position);
      if (distance < collisionRadius) {
        if (this.debugMode) {
          console.log(`[ParticleManager] 火球碰撞检测: 距离=${distance.toFixed(2)}, 碰撞半径=${collisionRadius.toFixed(2)}`);
        }
        this.deactivateFireball(fireball);
        return true;
      }
    }
    
    return false;
  }

  public checkCrystalCollision(playerPos: THREE.Vector3, playerRadius: number): number {
    const collisionRadius = this.CRYSTAL_RADIUS + playerRadius;
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
        
        if (this.debugMode) {
          console.log(`[ParticleManager] 水晶收集: 距离=${distance.toFixed(2)}, 碰撞半径=${collisionRadius.toFixed(2)}`);
        }
      }
    }
    
    return collected;
  }

  public clearAll(): void {
    if (this.debugMode) {
      console.log('[ParticleManager] 清除所有活动对象');
      console.log(`  清除火球: ${this.activeFireballCount}个`);
      console.log(`  清除水晶: ${this.activeCrystalCount}个`);
    }
    
    for (const fireball of this.fireballs) {
      this.deactivateFireball(fireball);
    }
    
    for (const crystal of this.crystals) {
      crystal.collected = false;
      crystal.mesh.visible = false;
      crystal.glow.visible = false;
    }
    
    for (const particle of this.particles) {
      this.deactivateParticle(particle);
    }
    
    this.activeFireballCount = 0;
    this.activeCrystalCount = 0;
  }

  public logDebugInfo(): void {
    console.log('[ParticleManager] 调试信息:');
    console.log(`  活动火球: ${this.activeFireballCount}/${this.maxFireballs}`);
    console.log(`  活动水晶: ${this.activeCrystalCount}/${this.maxCrystals}`);
    console.log(`  累计生成 - 火球: ${this.totalFireballsSpawned}, 水晶: ${this.totalCrystalsSpawned}`);
    
    const activeParticles = this.particles.filter(p => p.active).length;
    console.log(`  活动粒子: ${activeParticles}/${this.maxParticles}`);
  }
}
