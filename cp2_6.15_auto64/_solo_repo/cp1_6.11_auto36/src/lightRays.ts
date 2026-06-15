import * as THREE from 'three';
import { InteractiveCube } from './cube';

export interface LightSourceConfig {
  id: string;
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
}

interface RaySegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

interface ParticleData {
  position: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  active: boolean;
  size: number;
}

export class LightRaySystem {
  public group: THREE.Group;
  private lightSources: LightSourceConfig[] = [];
  private cube: InteractiveCube;
  private particles: ParticleData[] = [];
  private pointsGeometry: THREE.BufferGeometry;
  private pointsMaterial: THREE.PointsMaterial;
  private points: THREE.Points;
  
  private readonly MAX_PARTICLES = 3000;
  private readonly PARTICLE_LIFETIME = 2.0;
  private readonly RAYS_PER_LIGHT = 12;
  private readonly PARTICLES_PER_FRAME = 50;
  private readonly SCENE_BOUNDS = 6;
  private readonly PARTICLE_SIZE = 0.02;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particleIndex = 0;
  private activeCount = 0;

  constructor(cube: InteractiveCube) {
    this.cube = cube;
    this.group = new THREE.Group();
    
    this.positions = new Float32Array(this.MAX_PARTICLES * 3);
    this.colors = new Float32Array(this.MAX_PARTICLES * 3);
    this.sizes = new Float32Array(this.MAX_PARTICLES);

    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.pointsGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );
    this.pointsGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.sizes, 1)
    );
    this.pointsGeometry.setDrawRange(0, 0);

    this.pointsMaterial = new THREE.PointsMaterial({
      size: this.PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -1000, 0),
        color: new THREE.Color(0, 0, 0),
        life: 0,
        maxLife: this.PARTICLE_LIFETIME,
        velocity: new THREE.Vector3(),
        active: false,
        size: this.PARTICLE_SIZE,
      });

      const idx = i * 3;
      this.positions[idx] = 0;
      this.positions[idx + 1] = -1000;
      this.positions[idx + 2] = 0;
      this.colors[idx] = 0;
      this.colors[idx + 1] = 0;
      this.colors[idx + 2] = 0;
      this.sizes[i] = 0;
    }
  }

  public addLightSource(config: LightSourceConfig): void {
    this.lightSources.push(config);
  }

  public updateLightSource(id: string, config: Partial<LightSourceConfig>): void {
    const source = this.lightSources.find(s => s.id === id);
    if (source) {
      if (config.position) source.position.copy(config.position);
      if (config.color) source.color.copy(config.color);
      if (config.intensity !== undefined) source.intensity = config.intensity;
    }
  }

  public removeLightSource(id: string): void {
    const idx = this.lightSources.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.lightSources.splice(idx, 1);
    }
  }

  public update(deltaTime: number): void {
    this.updateParticles(deltaTime);
    this.generateLightRays();
    this.updateGeometry();
  }

  private updateParticles(deltaTime: number): void {
    this.activeCount = 0;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }

      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );

      const dist = particle.position.length();
      if (dist > this.SCENE_BOUNDS + 1) {
        particle.active = false;
        continue;
      }

      this.activeCount++;
    }
  }

  private generateLightRays(): void {
    if (this.lightSources.length === 0) return;

    const particlesPerLight = Math.max(
      1,
      Math.floor(this.PARTICLES_PER_FRAME / this.lightSources.length)
    );

    for (const source of this.lightSources) {
      if (source.intensity <= 0) continue;
      if (source.position.length() > this.SCENE_BOUNDS) continue;

      for (let rayIdx = 0; rayIdx < this.RAYS_PER_LIGHT; rayIdx++) {
        const raySegments = this.traceLightRay(source, rayIdx);
        
        const particlesThisRay = Math.max(
          1,
          Math.floor(particlesPerLight / this.RAYS_PER_LIGHT)
        );

        for (let p = 0; p < particlesThisRay; p++) {
          this.spawnParticlesAlongRay(raySegments, source);
        }
      }
    }
  }

  private traceLightRay(source: LightSourceConfig, rayIndex: number): RaySegment[] {
    const segments: RaySegment[] = [];
    
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle1 = rayIndex * goldenAngle;
    const angle2 = Math.acos(1 - 2 * (rayIndex + 0.5) / this.RAYS_PER_LIGHT);
    
    const direction = new THREE.Vector3(
      Math.sin(angle2) * Math.cos(angle1),
      Math.sin(angle2) * Math.sin(angle1),
      Math.cos(angle2)
    ).normalize();

    let currentPos = source.position.clone();
    let currentDir = direction.clone();
    const maxBounces = 3;
    let bounces = 0;

    while (bounces <= maxBounces) {
      const intersection = this.cube.intersectRayTriangles(
        currentPos,
        currentDir
      );

      if (intersection && bounces < maxBounces) {
        const dist = intersection.point.length();
        if (dist > this.SCENE_BOUNDS) {
          const endPoint = this.findBoundaryExit(currentPos, currentDir);
          segments.push({
            start: currentPos.clone(),
            end: endPoint,
          });
          break;
        }

        segments.push({
          start: currentPos.clone(),
          end: intersection.point.clone(),
        });

        const normal = intersection.normal.clone().normalize();
        const incident = currentDir.clone().normalize();
        
        const dot = incident.dot(normal);
        const reflected = incident
          .clone()
          .sub(normal.clone().multiplyScalar(2 * dot))
          .normalize();

        currentPos = intersection.point.clone().add(
          reflected.clone().multiplyScalar(0.02)
        );
        currentDir = reflected;
        bounces++;
      } else {
        const endPoint = this.findBoundaryExit(currentPos, currentDir);
        segments.push({
          start: currentPos.clone(),
          end: endPoint,
        });
        break;
      }
    }

    return segments;
  }

  private findBoundaryExit(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): THREE.Vector3 {
    const dir = direction.clone().normalize();
    const radius = this.SCENE_BOUNDS;

    const a = dir.dot(dir);
    const b = 2 * origin.dot(dir);
    const c = origin.dot(origin) - radius * radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return origin.clone().add(dir.multiplyScalar(10));
    }

    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    const t = t1 > 0.01 ? t1 : t2;
    return origin.clone().add(dir.multiplyScalar(t));
  }

  private spawnParticlesAlongRay(
    segments: RaySegment[],
    source: LightSourceConfig
  ): void {
    for (const segment of segments) {
      const t = Math.random();
      const position = new THREE.Vector3().lerpVectors(
        segment.start,
        segment.end,
        t
      );

      if (position.length() > this.SCENE_BOUNDS) continue;

      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.03
      );
      position.add(jitter);

      const fadeFactor = 1 - t * 0.3;
      const intensity = source.intensity * fadeFactor;
      const color = source.color.clone().multiplyScalar(Math.min(intensity, 1.5));

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );

      const size = this.PARTICLE_SIZE * (0.8 + Math.random() * 0.4);

      this.spawnParticle(position, color, velocity, size);
    }
  }

  private spawnParticle(
    position: THREE.Vector3,
    color: THREE.Color,
    velocity: THREE.Vector3,
    size: number
  ): void {
    if (this.activeCount >= this.MAX_PARTICLES) return;
    if (position.length() > this.SCENE_BOUNDS) return;

    let found = false;
    let searchIdx = this.particleIndex;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const idx = (searchIdx + i) % this.MAX_PARTICLES;
      if (!this.particles[idx].active) {
        const particle = this.particles[idx];
        particle.position.copy(position);
        particle.color.copy(color);
        particle.velocity.copy(velocity);
        particle.life = this.PARTICLE_LIFETIME;
        particle.maxLife = this.PARTICLE_LIFETIME;
        particle.active = true;
        particle.size = size;
        this.particleIndex = (idx + 1) % this.MAX_PARTICLES;
        found = true;
        break;
      }
    }

    if (!found && this.activeCount < this.MAX_PARTICLES) {
      const particle = this.particles[this.particleIndex];
      particle.position.copy(position);
      particle.color.copy(color);
      particle.velocity.copy(velocity);
      particle.life = this.PARTICLE_LIFETIME;
      particle.maxLife = this.PARTICLE_LIFETIME;
      particle.active = true;
      particle.size = size;
      this.particleIndex = (this.particleIndex + 1) % this.MAX_PARTICLES;
    }
  }

  private updateGeometry(): void {
    let count = 0;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const particle = this.particles[i];
      const idx3 = i * 3;

      if (particle.active) {
        this.positions[idx3] = particle.position.x;
        this.positions[idx3 + 1] = particle.position.y;
        this.positions[idx3 + 2] = particle.position.z;

        const lifeRatio = particle.life / particle.maxLife;
        const fadeAlpha = lifeRatio < 0.2 ? lifeRatio * 5 : Math.min(lifeRatio, 1.0);
        const easedAlpha = fadeAlpha * fadeAlpha * (3 - 2 * fadeAlpha);

        this.colors[idx3] = particle.color.r * easedAlpha;
        this.colors[idx3 + 1] = particle.color.g * easedAlpha;
        this.colors[idx3 + 2] = particle.color.b * easedAlpha;

        this.sizes[i] = particle.size * (0.5 + lifeRatio * 0.5);

        count++;
      } else {
        this.positions[idx3] = 0;
        this.positions[idx3 + 1] = -1000;
        this.positions[idx3 + 2] = 0;
        this.colors[idx3] = 0;
        this.colors[idx3 + 1] = 0;
        this.colors[idx3 + 2] = 0;
        this.sizes[i] = 0;
      }
    }

    (this.pointsGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.pointsGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.pointsGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    this.pointsGeometry.setDrawRange(0, this.MAX_PARTICLES);
    this.pointsGeometry.computeBoundingSphere();
  }

  public setParticleSize(size: number): void {
    this.pointsMaterial.size = size;
  }

  public getParticleCount(): number {
    return this.activeCount;
  }

  public getMaxParticles(): number {
    return this.MAX_PARTICLES;
  }
}
