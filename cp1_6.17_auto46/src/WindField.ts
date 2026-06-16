import * as THREE from 'three';
import { BuildingData } from './BuildingGrid';

interface WindParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  pathIndex: number;
  pathProgress: number;
  speed: number;
  size: number;
  alpha: number;
  eddyActive: boolean;
  eddyCenter: THREE.Vector3;
  eddyAngle: number;
  eddyRadius: number;
  eddySpeed: number;
  eddyRounds: number;
  baseColor: THREE.Color;
}

interface ContaminantParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  trail: THREE.Vector3[];
}

export class WindField {
  private scene: THREE.Scene;
  private buildings: BuildingData[];
  private windParticles: WindParticle[] = [];
  private contaminantParticles: ContaminantParticle[] = [];
  private windParticleSystem: THREE.Points | null = null;
  private contaminantSystem: THREE.Points | null = null;
  private trailSystem: THREE.Points | null = null;

  private paths: THREE.CatmullRomCurve3[] = [];
  private windSpeed: number = 5;
  private contaminantDensity: number = 0.4;
  private pollutionSourceIndex: number = 0;
  private isSimulating: boolean = false;
  private emissionTimer: number = 0;
  private emissionRate: number = 80;

  private readonly MAX_WIND_PARTICLES = 1500;
  private readonly MAX_CONTAMINANT_PARTICLES = 1500;
  private readonly TRAIL_LENGTH = 30;

  private pollutionSources: THREE.Vector3[] = [];

  private highlightedPathIndices: Set<number> = new Set();

  constructor(scene: THREE.Scene, buildings: BuildingData[]) {
    this.scene = scene;
    this.buildings = buildings;
    this.initPollutionSources();
    this.initPaths();
    this.initWindParticles();
    this.initParticleSystems();
  }

  private initPollutionSources(): void {
    const offset = 10;
    this.pollutionSources = [
      new THREE.Vector3(-offset, 2, 0),
      new THREE.Vector3(0, 2, -offset + 2),
      new THREE.Vector3(offset - 2, 2, offset - 2),
      new THREE.Vector3(-offset + 3, 2, offset - 3),
      new THREE.Vector3(offset - 3, 2, -offset + 3)
    ];
  }

  private initPaths(): void {
    const pathPoints: THREE.Vector3[][] = [
      [
        new THREE.Vector3(-15, 4, -6),
        new THREE.Vector3(-8, 4, -5),
        new THREE.Vector3(0, 4, -4),
        new THREE.Vector3(8, 4, -5),
        new THREE.Vector3(15, 4, -6)
      ],
      [
        new THREE.Vector3(-15, 5, 0),
        new THREE.Vector3(-8, 5, 1),
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(8, 5, -1),
        new THREE.Vector3(15, 5, 0)
      ],
      [
        new THREE.Vector3(-15, 4, 6),
        new THREE.Vector3(-8, 4, 5),
        new THREE.Vector3(0, 4, 4),
        new THREE.Vector3(8, 4, 5),
        new THREE.Vector3(15, 4, 6)
      ],
      [
        new THREE.Vector3(-15, 3, -8),
        new THREE.Vector3(-6, 3, -7),
        new THREE.Vector3(6, 3, -7),
        new THREE.Vector3(15, 3, -8)
      ],
      [
        new THREE.Vector3(-15, 6, 8),
        new THREE.Vector3(-6, 6, 7),
        new THREE.Vector3(6, 6, 7),
        new THREE.Vector3(15, 6, 8)
      ],
      [
        new THREE.Vector3(-15, 4.5, -3),
        new THREE.Vector3(-5, 4.5, -2),
        new THREE.Vector3(0, 4.5, 1),
        new THREE.Vector3(5, 4.5, 2),
        new THREE.Vector3(15, 4.5, 3)
      ],
      [
        new THREE.Vector3(-15, 5.5, 3),
        new THREE.Vector3(-5, 5.5, 2),
        new THREE.Vector3(0, 5.5, -1),
        new THREE.Vector3(5, 5.5, -2),
        new THREE.Vector3(15, 5.5, -3)
      ],
      [
        new THREE.Vector3(-15, 3.5, 2),
        new THREE.Vector3(-6, 3.5, 3),
        new THREE.Vector3(6, 3.5, 3.5),
        new THREE.Vector3(15, 3.5, 4)
      ],
      [
        new THREE.Vector3(-15, 6.5, -2),
        new THREE.Vector3(-6, 6.5, -3),
        new THREE.Vector3(6, 6.5, -3.5),
        new THREE.Vector3(15, 6.5, -4)
      ]
    ];

    this.paths = pathPoints.map(points => 
      new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    );
  }

  private initWindParticles(): void {
    for (let i = 0; i < this.MAX_WIND_PARTICLES; i++) {
      const pathIndex = Math.floor(Math.random() * this.paths.length);
      this.windParticles.push(this.createWindParticle(pathIndex, Math.random()));
    }
  }

  private createWindParticle(pathIndex: number, startProgress: number = 0): WindParticle {
    const path = this.paths[pathIndex];
    const position = path.getPoint(startProgress);
    const colorT = Math.random();
    const baseColor = new THREE.Color().lerpColors(
      new THREE.Color(0xB0BEC5),
      new THREE.Color(0x90CAF9),
      colorT
    );
    
    return {
      position: position.clone(),
      velocity: new THREE.Vector3(),
      pathIndex,
      pathProgress: startProgress,
      speed: 0.0008 + Math.random() * 0.0004,
      size: 2 + Math.random() * 4,
      alpha: 0.6 + Math.random() * 0.4,
      eddyActive: false,
      eddyCenter: new THREE.Vector3(),
      eddyAngle: 0,
      eddyRadius: 0,
      eddySpeed: 0,
      eddyRounds: 0,
      baseColor
    };
  }

  private initParticleSystems(): void {
    const windGeometry = new THREE.BufferGeometry();
    const windPositions = new Float32Array(this.MAX_WIND_PARTICLES * 3);
    const windColors = new Float32Array(this.MAX_WIND_PARTICLES * 3);
    const windSizes = new Float32Array(this.MAX_WIND_PARTICLES);

    for (let i = 0; i < this.MAX_WIND_PARTICLES; i++) {
      const particle = this.windParticles[i];
      windPositions[i * 3] = particle.position.x;
      windPositions[i * 3 + 1] = particle.position.y;
      windPositions[i * 3 + 2] = particle.position.z;

      windColors[i * 3] = particle.baseColor.r;
      windColors[i * 3 + 1] = particle.baseColor.g;
      windColors[i * 3 + 2] = particle.baseColor.b;

      windSizes[i] = particle.size;
    }

    windGeometry.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
    windGeometry.setAttribute('color', new THREE.BufferAttribute(windColors, 3));
    windGeometry.setAttribute('size', new THREE.BufferAttribute(windSizes, 1));

    const windMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.windParticleSystem = new THREE.Points(windGeometry, windMaterial);
    this.scene.add(this.windParticleSystem);

    const contaminantGeometry = new THREE.BufferGeometry();
    const contaminantPositions = new Float32Array(this.MAX_CONTAMINANT_PARTICLES * 3);
    const contaminantAlphas = new Float32Array(this.MAX_CONTAMINANT_PARTICLES);

    contaminantGeometry.setAttribute('position', new THREE.BufferAttribute(contaminantPositions, 3));
    contaminantGeometry.setAttribute('alpha', new THREE.BufferAttribute(contaminantAlphas, 1));

    const contaminantMaterial = new THREE.PointsMaterial({
      color: 0xFF6F00,
      size: 0.25,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.contaminantSystem = new THREE.Points(contaminantGeometry, contaminantMaterial);
    this.scene.add(this.contaminantSystem);

    const maxTrailPoints = this.MAX_CONTAMINANT_PARTICLES * this.TRAIL_LENGTH;
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    const trailAlphas = new Float32Array(maxTrailPoints);

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));

    const trailMaterial = new THREE.PointsMaterial({
      color: 0xFF6F00,
      size: 0.1,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    this.trailSystem = new THREE.Points(trailGeometry, trailMaterial);
    this.scene.add(this.trailSystem);
  }

  public setWindSpeed(speed: number): void {
    this.windSpeed = speed;
  }

  public setContaminantDensity(density: number): void {
    this.contaminantDensity = density;
    if (this.windParticleSystem) {
      (this.windParticleSystem.material as THREE.PointsMaterial).opacity = 1 - density * 0.5;
    }
  }

  public setPollutionSource(index: number): void {
    this.pollutionSourceIndex = Math.max(0, Math.min(index, this.pollutionSources.length - 1));
  }

  public getPollutionSources(): THREE.Vector3[] {
    return this.pollutionSources;
  }

  public startSimulation(): void {
    this.isSimulating = true;
    this.emissionTimer = 0;
  }

  public stopSimulation(): void {
    this.isSimulating = false;
  }

  public toggleSimulation(): boolean {
    this.isSimulating = !this.isSimulating;
    if (!this.isSimulating) {
      this.clearContaminants();
    }
    return this.isSimulating;
  }

  public isSimulationRunning(): boolean {
    return this.isSimulating;
  }

  private clearContaminants(): void {
    this.contaminantParticles = [];
    if (this.contaminantSystem) {
      const positions = this.contaminantSystem.geometry.attributes.position.array as Float32Array;
      positions.fill(0);
      this.contaminantSystem.geometry.attributes.position.needsUpdate = true;
    }
    if (this.trailSystem) {
      const positions = this.trailSystem.geometry.attributes.position.array as Float32Array;
      positions.fill(0);
      this.trailSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  public highlightNearbyPaths(building: BuildingData): void {
    this.highlightedPathIndices.clear();
    const buildingPos = building.mesh.position;
    const range = 3 * 4;

    this.paths.forEach((path, index) => {
      const midPoint = path.getPoint(0.5);
      const dist = midPoint.distanceTo(buildingPos);
      if (dist < range) {
        this.highlightedPathIndices.add(index);
      }
    });
  }

  public clearPathHighlight(): void {
    this.highlightedPathIndices.clear();
  }

  public update(deltaTime: number): void {
    this.updateWindParticles(deltaTime);
    this.updateContaminantParticles(deltaTime);
    
    if (this.isSimulating) {
      this.emitContaminants(deltaTime);
    }

    this.updateParticleRenderers();
  }

  private updateWindParticles(deltaTime: number): void {
    const speedMultiplier = this.windSpeed / 5;

    for (let i = 0; i < this.windParticles.length; i++) {
      const particle = this.windParticles[i];

      if (particle.eddyActive) {
        this.updateEddyParticle(particle, deltaTime, speedMultiplier);
      } else {
        this.updatePathParticle(particle, deltaTime, speedMultiplier);
      }
    }
  }

  private updatePathParticle(particle: WindParticle, deltaTime: number, speedMultiplier: number): void {
    const path = this.paths[particle.pathIndex];
    const progressDelta = particle.speed * speedMultiplier * deltaTime * 60;
    particle.pathProgress += progressDelta;

    if (particle.pathProgress >= 1) {
      particle.pathProgress = 0;
    }

    const position = path.getPoint(particle.pathProgress);
    particle.position.copy(position);

    this.checkEddyTrigger(particle);
  }

  private checkEddyTrigger(particle: WindParticle): void {
    for (const building of this.buildings) {
      const bPos = building.mesh.position;
      const bHeight = building.height;
      
      if (particle.position.y > bHeight + 1) continue;
      
      const dx = particle.position.x - bPos.x;
      const dz = particle.position.z - bPos.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);

      if (distXZ < 3 && dx > 0) {
        particle.eddyActive = true;
        particle.eddyCenter.set(bPos.x + 2, particle.position.y, bPos.z + (Math.random() - 0.5) * 2);
        particle.eddyAngle = Math.random() * Math.PI * 2;
        particle.eddyRadius = 0.5 + Math.random() * 1.5;
        particle.eddySpeed = 2 + Math.random() * 2;
        particle.eddyRounds = 0;
        break;
      }
    }
  }

  private updateEddyParticle(particle: WindParticle, deltaTime: number, speedMultiplier: number): void {
    particle.eddyAngle += particle.eddySpeed * deltaTime * speedMultiplier;
    particle.eddyRounds += (particle.eddySpeed * deltaTime * speedMultiplier) / (Math.PI * 2);

    if (particle.eddyRounds >= 1.5) {
      particle.eddyActive = false;
      particle.pathProgress = 0.3 + Math.random() * 0.4;
      return;
    }

    const x = particle.eddyCenter.x + Math.cos(particle.eddyAngle) * particle.eddyRadius;
    const z = particle.eddyCenter.z + Math.sin(particle.eddyAngle) * particle.eddyRadius;
    
    particle.position.set(x, particle.eddyCenter.y + Math.sin(particle.eddyAngle * 0.5) * 0.3, z);
    particle.eddyRadius += 0.005 * deltaTime * 60;
  }

  private emitContaminants(deltaTime: number): void {
    this.emissionTimer += deltaTime;
    const emissionInterval = 1 / this.emissionRate;

    while (this.emissionTimer >= emissionInterval && this.contaminantParticles.length < this.MAX_CONTAMINANT_PARTICLES) {
      this.emissionTimer -= emissionInterval;
      this.spawnContaminantParticle();
    }
  }

  private spawnContaminantParticle(): void {
    const sourcePos = this.pollutionSources[this.pollutionSourceIndex];
    const spread = 0.5;

    const particle: ContaminantParticle = {
      position: new THREE.Vector3(
        sourcePos.x + (Math.random() - 0.5) * spread,
        sourcePos.y + Math.random() * 2,
        sourcePos.z + (Math.random() - 0.5) * spread
      ),
      velocity: new THREE.Vector3(
        0.5 + Math.random() * 0.5,
        0.2 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.3
      ),
      life: 1.2,
      maxLife: 1.2,
      size: 0.2 + Math.random() * 0.15,
      trail: []
    };

    this.contaminantParticles.push(particle);
  }

  private updateContaminantParticles(deltaTime: number): void {
    const windInfluence = this.windSpeed / 5 * 0.5;

    for (let i = this.contaminantParticles.length - 1; i >= 0; i--) {
      const particle = this.contaminantParticles[i];

      particle.trail.unshift(particle.position.clone());
      if (particle.trail.length > this.TRAIL_LENGTH) {
        particle.trail.pop();
      }

      const windVector = this.getWindVectorAt(particle.position);
      particle.velocity.add(windVector.multiplyScalar(windInfluence * deltaTime));
      particle.velocity.y += 0.1 * deltaTime;
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60 * 0.05));

      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.contaminantParticles.splice(i, 1);
      }
    }
  }

  private getWindVectorAt(position: THREE.Vector3): THREE.Vector3 {
    let nearestDist = Infinity;
    let nearestPathIndex = 0;
    let nearestProgress = 0;

    for (let i = 0; i < this.paths.length; i++) {
      const path = this.paths[i];
      for (let t = 0; t <= 1; t += 0.05) {
        const point = path.getPoint(t);
        const dist = point.distanceTo(position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPathIndex = i;
          nearestProgress = t;
        }
      }
    }

    const path = this.paths[nearestPathIndex];
    const tangent = path.getTangent(nearestProgress);
    return tangent.multiplyScalar(this.windSpeed / 5);
  }

  private getPathCurvature(path: THREE.CatmullRomCurve3, progress: number): number {
    const eps = 0.01;
    const t1 = Math.max(0, progress - eps);
    const t2 = Math.min(1, progress + eps);
    
    const tangent1 = path.getTangent(t1).normalize();
    const tangent2 = path.getTangent(t2).normalize();
    
    const dot = Math.max(-1, Math.min(1, tangent1.dot(tangent2)));
    const angle = Math.acos(dot);
    
    return angle / (t2 - t1);
  }

  private getDynamicColor(particle: WindParticle): THREE.Color {
    const warmColor = new THREE.Color(0xFF8A65);
    let warmMix = 0;

    if (particle.eddyActive) {
      warmMix = 0.5 + Math.min(0.5, particle.eddyRounds / 1.5 * 0.5);
    } else {
      const path = this.paths[particle.pathIndex];
      const curvature = this.getPathCurvature(path, particle.pathProgress);
      warmMix = Math.min(0.6, curvature * 0.8);
    }

    return particle.baseColor.clone().lerp(warmColor, warmMix);
  }

  private updateParticleRenderers(): void {
    if (!this.windParticleSystem) return;

    const windPositions = this.windParticleSystem.geometry.attributes.position.array as Float32Array;
    const windColors = this.windParticleSystem.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < this.windParticles.length; i++) {
      const p = this.windParticles[i];
      windPositions[i * 3] = p.position.x;
      windPositions[i * 3 + 1] = p.position.y;
      windPositions[i * 3 + 2] = p.position.z;

      const dynamicColor = this.getDynamicColor(p);
      windColors[i * 3] = dynamicColor.r;
      windColors[i * 3 + 1] = dynamicColor.g;
      windColors[i * 3 + 2] = dynamicColor.b;
    }
    this.windParticleSystem.geometry.attributes.position.needsUpdate = true;
    this.windParticleSystem.geometry.attributes.color.needsUpdate = true;

    if (this.contaminantSystem) {
      const positions = this.contaminantSystem.geometry.attributes.position.array as Float32Array;
      const maxParticles = this.MAX_CONTAMINANT_PARTICLES;
      
      for (let i = 0; i < maxParticles; i++) {
        if (i < this.contaminantParticles.length) {
          const p = this.contaminantParticles[i];
          positions[i * 3] = p.position.x;
          positions[i * 3 + 1] = p.position.y;
          positions[i * 3 + 2] = p.position.z;
        } else {
          positions[i * 3] = 0;
          positions[i * 3 + 1] = -1000;
          positions[i * 3 + 2] = 0;
        }
      }
      this.contaminantSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (this.trailSystem) {
      const trailPositions = this.trailSystem.geometry.attributes.position.array as Float32Array;
      const maxTrailPoints = this.MAX_CONTAMINANT_PARTICLES * this.TRAIL_LENGTH;
      let trailIndex = 0;

      for (const particle of this.contaminantParticles) {
        for (let j = 0; j < particle.trail.length; j++) {
          if (trailIndex < maxTrailPoints) {
            const t = particle.trail[j];
            trailPositions[trailIndex * 3] = t.x;
            trailPositions[trailIndex * 3 + 1] = t.y;
            trailPositions[trailIndex * 3 + 2] = t.z;
            trailIndex++;
          }
        }
      }

      for (let i = trailIndex; i < maxTrailPoints; i++) {
        trailPositions[i * 3] = 0;
        trailPositions[i * 3 + 1] = -1000;
        trailPositions[i * 3 + 2] = 0;
      }

      this.trailSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  public getPaths(): THREE.CatmullRomCurve3[] {
    return this.paths;
  }

  public getTotalParticleCount(): number {
    return this.windParticles.length + this.contaminantParticles.length;
  }

  public dispose(): void {
    if (this.windParticleSystem) {
      this.scene.remove(this.windParticleSystem);
      this.windParticleSystem.geometry.dispose();
      (this.windParticleSystem.material as THREE.Material).dispose();
    }
    if (this.contaminantSystem) {
      this.scene.remove(this.contaminantSystem);
      this.contaminantSystem.geometry.dispose();
      (this.contaminantSystem.material as THREE.Material).dispose();
    }
    if (this.trailSystem) {
      this.scene.remove(this.trailSystem);
      this.trailSystem.geometry.dispose();
      (this.trailSystem.material as THREE.Material).dispose();
    }
  }
}
