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
  private particleIndex = 0;

  constructor(cube: InteractiveCube) {
    this.cube = cube;
    this.group = new THREE.Group();
    
    this.positions = new Float32Array(this.MAX_PARTICLES * 3);
    this.colors = new Float32Array(this.MAX_PARTICLES * 3);

    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.pointsGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );
    this.pointsGeometry.setDrawRange(0, 0);

    this.pointsMaterial = new THREE.PointsMaterial({
      size: this.PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
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
      });

      const idx = i * 3;
      this.positions[idx] = 0;
      this.positions[idx + 1] = -1000;
      this.positions[idx + 2] = 0;
      this.colors[idx] = 0;
      this.colors[idx + 1] = 0;
      this.colors[idx + 2] = 0;
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
    this.generateLightRays(deltaTime);
    this.updateGeometry();
  }

  private updateParticles(deltaTime: number): void {
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
    }
  }

  private generateLightRays(deltaTime: number): void {
    const particlesPerLight = Math.floor(
      this.PARTICLES_PER_FRAME / Math.max(this.lightSources.length, 1)
    );

    for (const source of this.lightSources) {
      if (source.intensity <= 0) continue;

      for (let rayIdx = 0; rayIdx < this.RAYS_PER_LIGHT; rayIdx++) {
        const raySegments = this.traceLightRay(source, rayIdx);
        
        const particlesThisRay = Math.max(
          1,
          Math.floor(particlesPerLight / this.RAYS_PER_LIGHT)
        );

        for (let p = 0; p < particlesThisRay; p++) {
          this.spawnParticlesAlongRay(raySegments, source, deltaTime);
        }
      }
    }
  }

  private traceLightRay(source: LightSourceConfig, rayIndex: number): RaySegment[] {
    const segments: RaySegment[] = [];
    
    const angle1 = (rayIndex / this.RAYS_PER_LIGHT) * Math.PI * 2;
    const angle2 = (rayIndex * 0.618) * Math.PI * 2;
    
    const direction = new THREE.Vector3(
      Math.cos(angle1) * Math.sin(angle2),
      Math.cos(angle2) * 0.5 + 0.3,
      Math.sin(angle1) * Math.sin(angle2)
    ).normalize();

    let currentPos = source.position.clone();
    let currentDir = direction.clone();
    const maxBounces = 3;
    let bounces = 0;

    while (bounces <= maxBounces) {
      const intersection = this.findNearestFaceIntersection(
        currentPos,
        currentDir
      );

      if (intersection && bounces < maxBounces) {
        segments.push({
          start: currentPos.clone(),
          end: intersection.point.clone(),
        });

        const normal = intersection.normal.clone().normalize();
        const reflected = currentDir
          .clone()
          .reflect(normal)
          .normalize();

        currentPos = intersection.point.clone().add(
          reflected.clone().multiplyScalar(0.01)
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

  private findNearestFaceIntersection(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): { point: THREE.Vector3; normal: THREE.Vector3; faceIndex: number } | null {
    let nearest: {
      point: THREE.Vector3;
      normal: THREE.Vector3;
      faceIndex: number;
      distance: number;
    } | null = null;

    const ray = new THREE.Ray(origin.clone(), direction.clone().normalize());

    for (let i = 0; i < 6; i++) {
      const plane = this.cube.getFacePlane(i);
      const intersectPoint = new THREE.Vector3();
      
      if (ray.intersectPlane(plane, intersectPoint)) {
        const center = this.cube.getWorldFaceCenter(i);
        const normal = this.cube.getWorldFaceNormal(i);
        
        const toPoint = intersectPoint.clone().sub(center);
        const tangent1 = new THREE.Vector3();
        const tangent2 = new THREE.Vector3();
        
        if (Math.abs(normal.x) > 0.5) {
          tangent1.set(0, 1, 0);
          tangent2.set(0, 0, 1);
        } else if (Math.abs(normal.y) > 0.5) {
          tangent1.set(1, 0, 0);
          tangent2.set(0, 0, 1);
        } else {
          tangent1.set(1, 0, 0);
          tangent2.set(0, 1, 0);
        }

        const u = toPoint.dot(tangent1);
        const v = toPoint.dot(tangent2);
        const halfSize = 1;

        if (Math.abs(u) <= halfSize && Math.abs(v) <= halfSize) {
          const distance = origin.distanceTo(intersectPoint);
          
          if (distance > 0.01 && (!nearest || distance < nearest.distance)) {
            nearest = {
              point: intersectPoint,
              normal: normal.clone(),
              faceIndex: i,
              distance,
            };
          }
        }
      }
    }

    return nearest;
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

    const t = (-b + Math.sqrt(discriminant)) / (2 * a);
    return origin.clone().add(dir.multiplyScalar(t));
  }

  private spawnParticlesAlongRay(
    segments: RaySegment[],
    source: LightSourceConfig,
    _deltaTime: number
  ): void {
    for (const segment of segments) {
      const t = Math.random();
      const position = new THREE.Vector3().lerpVectors(
        segment.start,
        segment.end,
        t
      );

      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      );
      position.add(jitter);

      const intensity = source.intensity * (1 - t * 0.5);
      const color = source.color.clone().multiplyScalar(intensity);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );

      this.spawnParticle(position, color, velocity);
    }
  }

  private spawnParticle(
    position: THREE.Vector3,
    color: THREE.Color,
    velocity: THREE.Vector3
  ): void {
    const particle = this.particles[this.particleIndex];
    
    particle.position.copy(position);
    particle.color.copy(color);
    particle.velocity.copy(velocity);
    particle.life = this.PARTICLE_LIFETIME;
    particle.maxLife = this.PARTICLE_LIFETIME;
    particle.active = true;

    this.particleIndex = (this.particleIndex + 1) % this.MAX_PARTICLES;
  }

  private updateGeometry(): void {
    let activeCount = 0;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const particle = this.particles[i];
      const idx = i * 3;

      if (particle.active) {
        this.positions[idx] = particle.position.x;
        this.positions[idx + 1] = particle.position.y;
        this.positions[idx + 2] = particle.position.z;

        const alpha = particle.life / particle.maxLife;
        this.colors[idx] = particle.color.r * alpha;
        this.colors[idx + 1] = particle.color.g * alpha;
        this.colors[idx + 2] = particle.color.b * alpha;

        activeCount++;
      } else {
        this.positions[idx] = 0;
        this.positions[idx + 1] = -1000;
        this.positions[idx + 2] = 0;
        this.colors[idx] = 0;
        this.colors[idx + 1] = 0;
        this.colors[idx + 2] = 0;
      }
    }

    this.pointsGeometry.attributes.position.needsUpdate = true;
    this.pointsGeometry.attributes.color.needsUpdate = true;
    this.pointsGeometry.setDrawRange(0, this.MAX_PARTICLES);
  }

  public setParticleSize(size: number): void {
    this.pointsMaterial.size = size;
  }

  public getParticleCount(): number {
    return this.particles.filter(p => p.active).length;
  }
}
