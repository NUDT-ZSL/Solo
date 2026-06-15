import * as THREE from 'three';

export type ColorMode = 'single' | 'rainbow' | 'velocity';

export interface ParticleSystemConfig {
  maxParticles: number;
  sphereRadius: number;
  baseSize: number;
  colorMode: ColorMode;
  singleColor: string;
}

interface Particle {
  alive: boolean;
  radius: number;
}

export class ParticleSystem {
  public points!: THREE.Points;
  public trailLines!: THREE.LineSegments;
  public burstParticles!: THREE.Points;

  private config: ParticleSystemConfig;
  private scene: THREE.Scene;

  private positions!: Float32Array;
  private velocities!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private particles!: Particle[];

  private trailPositions!: Float32Array;
  private trailColors!: Float32Array;
  private trailLength = 80;
  private trailHistory: number[][][] = [];

  private burstPositions!: Float32Array;
  private burstColors!: Float32Array;
  private burstSizes!: Float32Array;
  private burstData: { life: number; maxLife: number; vx: number; vy: number; vz: number }[] = [];
  private maxBurst = 500;

  private particleMaterial!: THREE.PointsMaterial;
  private trailMaterial!: THREE.LineBasicMaterial;
  private burstMaterial!: THREE.PointsMaterial;

  private onEventCallback: (msg: string) => void;

  constructor(scene: THREE.Scene, config: Partial<ParticleSystemConfig> = {}, onEvent: (msg: string) => void) {
    this.scene = scene;
    this.onEventCallback = onEvent;
    this.config = {
      maxParticles: 9000,
      sphereRadius: 500,
      baseSize: 4,
      colorMode: 'rainbow',
      singleColor: '#FF6B35',
      ...config
    };
    this.init();
  }

  private init(): void {
    this.createBuffers();
    this.createMaterials();
    this.generateParticles();
    this.createObjects();
    this.addToScene();
  }

  private createBuffers(): void {
    const max = this.config.maxParticles;
    this.positions = new Float32Array(max * 3);
    this.velocities = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.particles = new Array(max);

    for (let i = 0; i < max; i++) {
      this.particles[i] = { alive: false, radius: 1 };
    }

    const trailMax = max * this.trailLength * 2 * 3;
    this.trailPositions = new Float32Array(trailMax);
    this.trailColors = new Float32Array(trailMax);

    this.burstPositions = new Float32Array(this.maxBurst * 3);
    this.burstColors = new Float32Array(this.maxBurst * 3);
    this.burstSizes = new Float32Array(this.maxBurst);
    this.burstData = new Array(this.maxBurst);
    for (let i = 0; i < this.maxBurst; i++) {
      this.burstData[i] = { life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 };
    }
  }

  private createMaterials(): void {
    this.particleMaterial = new THREE.PointsMaterial({
      size: this.config.baseSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.burstMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }

  private generateParticles(): void {
    const count = this.config.maxParticles;
    const r = this.config.sphereRadius;

    for (let i = 0; i < count; i++) {
      this.spawnParticle(i, r);
    }
  }

  private spawnParticle(i: number, radius: number, px?: number, py?: number, pz?: number, vx?: number, vy?: number, vz?: number): void {
    let x: number, y: number, z: number;
    if (px !== undefined) {
      x = px; y = py!; z = pz!;
    } else {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rr = Math.cbrt(Math.random()) * radius;
      x = rr * Math.sin(phi) * Math.cos(theta);
      y = rr * Math.sin(phi) * Math.sin(theta);
      z = rr * Math.cos(phi);
    }

    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;

    if (vx !== undefined) {
      this.velocities[i * 3] = vx;
      this.velocities[i * 3 + 1] = vy!;
      this.velocities[i * 3 + 2] = vz!;
    } else {
      const speed = Math.random() * 2;
      const dir = new THREE.Vector3(
        Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
      ).normalize().multiplyScalar(speed);
      this.velocities[i * 3] = dir.x;
      this.velocities[i * 3 + 1] = dir.y;
      this.velocities[i * 3 + 2] = dir.z;
    }

    this.applyColorMode(i);
    this.sizes[i] = 3 + Math.random() * 3;
    this.particles[i].alive = true;
    this.particles[i].radius = 1;

    this.trailHistory[i] = [];
  }

  private applyColorMode(i: number): void {
    const idx = i * 3;
    if (this.config.colorMode === 'single') {
      const c = new THREE.Color(this.config.singleColor);
      this.colors[idx] = c.r;
      this.colors[idx + 1] = c.g;
      this.colors[idx + 2] = c.b;
    } else if (this.config.colorMode === 'rainbow') {
      const hue = Math.random();
      const c = new THREE.Color().setHSL(hue, 0.8, 0.6);
      this.colors[idx] = c.r;
      this.colors[idx + 1] = c.g;
      this.colors[idx + 2] = c.b;
    } else {
      this.colors[idx] = 0.3;
      this.colors[idx + 1] = 0.6;
      this.colors[idx + 2] = 1;
    }
  }

  private createObjects(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.points = new THREE.Points(geometry, this.particleMaterial);
    this.points.frustumCulled = false;

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailLines = new THREE.LineSegments(trailGeometry, this.trailMaterial);
    this.trailLines.frustumCulled = false;

    const burstGeometry = new THREE.BufferGeometry();
    burstGeometry.setAttribute('position', new THREE.BufferAttribute(this.burstPositions, 3));
    burstGeometry.setAttribute('color', new THREE.BufferAttribute(this.burstColors, 3));
    this.burstParticles = new THREE.Points(burstGeometry, this.burstMaterial);
    this.burstParticles.frustumCulled = false;
  }

  private addToScene(): void {
    this.scene.add(this.points);
    this.scene.add(this.trailLines);
    this.scene.add(this.burstParticles);
  }

  public setColorMode(mode: ColorMode): void {
    this.config.colorMode = mode;
    for (let i = 0; i < this.config.maxParticles; i++) {
      if (this.particles[i].alive) {
        this.applyColorMode(i);
      }
    }
  }

  public setSingleColor(color: string): void {
    this.config.singleColor = color;
    if (this.config.colorMode === 'single') {
      this.setColorMode('single');
    }
  }

  public setBaseSize(size: number): void {
    this.particleMaterial.size = size;
  }

  public getActiveCount(): number {
    let c = 0;
    for (let i = 0; i < this.config.maxParticles; i++) {
      if (this.particles[i].alive) c++;
    }
    return c;
  }

  public reset(): void {
    for (let i = 0; i < this.config.maxParticles; i++) {
      this.spawnParticle(i, this.config.sphereRadius);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  public getPositions(): Float32Array { return this.positions; }
  public getVelocities(): Float32Array { return this.velocities; }
  public getColors(): Float32Array { return this.colors; }
  public getParticles(): Particle[] { return this.particles; }
  public getParticleCount(): number { return this.config.maxParticles; }

  public spawnBurst(x: number, y: number, z: number, r: number, g: number, b: number): void {
    for (let b = 0; b < 10; b++) {
      let slot = -1;
      for (let i = 0; i < this.maxBurst; i++) {
        if (this.burstData[i].life <= 0) { slot = i; break; }
      }
      if (slot === -1) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      const dirX = Math.sin(phi) * Math.cos(theta) * speed;
      const dirY = Math.sin(phi) * Math.sin(theta) * speed;
      const dirZ = Math.cos(phi) * speed;

      this.burstPositions[slot * 3] = x;
      this.burstPositions[slot * 3 + 1] = y;
      this.burstPositions[slot * 3 + 2] = z;
      this.burstColors[slot * 3] = r;
      this.burstColors[slot * 3 + 1] = g;
      this.burstColors[slot * 3 + 2] = b;
      this.burstSizes[slot] = 2 + Math.random() * 3;
      this.burstData[slot] = {
        life: 800,
        maxLife: 800,
        vx: dirX,
        vy: dirY,
        vz: dirZ
      };
    }
  }

  public update(dt: number, gravitySources: { position: THREE.Vector3; strength: number; isRepel?: boolean; repelRadius?: number }[]): void {
    const count = this.config.maxParticles;
    const dtSec = dt / 1000;

    for (let i = 0; i < count; i++) {
      if (!this.particles[i].alive) continue;

      const idx = i * 3;
      let vx = this.velocities[idx];
      let vy = this.velocities[idx + 1];
      let vz = this.velocities[idx + 2];

      for (let s = 0; s < gravitySources.length; s++) {
        const src = gravitySources[s];
        const dx = src.position.x - this.positions[idx];
        const dy = src.position.y - this.positions[idx + 1];
        const dz = src.position.z - this.positions[idx + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) + 0.001;

        if (src.isRepel) {
          if (dist < (src.repelRadius || 100)) {
            const force = -src.strength * 5000 / Math.max(distSq, 100);
            vx += (dx / dist) * force * dtSec;
            vy += (dy / dist) * force * dtSec;
            vz += (dz / dist) * force * dtSec;
          }
        } else {
          const force = src.strength * 5000 / Math.max(distSq, 100);
          vx += (dx / dist) * force * dtSec;
          vy += (dy / dist) * force * dtSec;
          vz += (dz / dist) * force * dtSec;
        }
      }

      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (speed > 50) {
        const scale = 50 / speed;
        vx *= scale; vy *= scale; vz *= scale;
      }

      this.velocities[idx] = vx;
      this.velocities[idx + 1] = vy;
      this.velocities[idx + 2] = vz;

      this.positions[idx] += vx * dtSec * 60;
      this.positions[idx + 1] += vy * dtSec * 60;
      this.positions[idx + 2] += vz * dtSec * 60;

      this.trailHistory[i].push([
        this.positions[idx], this.positions[idx + 1], this.positions[idx + 2]
      ]);
      if (this.trailHistory[i].length > this.trailLength) {
        this.trailHistory[i].shift();
      }

      if (this.config.colorMode === 'velocity') {
        const spd = Math.min(speed / 30, 1);
        const hue = (1 - spd) * 0.66;
        const c = new THREE.Color().setHSL(hue, 0.9, 0.6);
        this.colors[idx] = c.r;
        this.colors[idx + 1] = c.g;
        this.colors[idx + 2] = c.b;
      }

      if (this.particles[i].radius > 15 && Math.random() < 0.001) {
        this.splitParticle(i);
      }
    }

    this.checkMerges();
    this.updateTrails();
    this.updateBurst(dt);

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  private splitParticle(i: number): void {
    const idx = i * 3;
    const newRadius = this.particles[i].radius * 0.5;
    this.particles[i].radius = newRadius;

    let j = -1;
    for (let k = 0; k < this.config.maxParticles; k++) {
      if (!this.particles[k].alive) { j = k; break; }
    }
    if (j === -1) return;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 3;
    const dir1x = Math.sin(phi) * Math.cos(theta) * speed;
    const dir1y = Math.sin(phi) * Math.sin(theta) * speed;
    const dir1z = Math.cos(phi) * speed;

    this.spawnParticle(
      j, 0,
      this.positions[idx], this.positions[idx + 1], this.positions[idx + 2],
      this.velocities[idx] + dir1x, this.velocities[idx + 1] + dir1y, this.velocities[idx + 2] + dir1z
    );
    this.particles[j].radius = newRadius;
    this.particles[j].alive = true;
    this.colors[j * 3] = this.colors[idx];
    this.colors[j * 3 + 1] = this.colors[idx + 1];
    this.colors[j * 3 + 2] = this.colors[idx + 2];

    this.velocities[idx] -= dir1x;
    this.velocities[idx + 1] -= dir1y;
    this.velocities[idx + 2] -= dir1z;

    this.onEventCallback('Particle split!');
  }

  private checkMerges(): void {
    const count = this.config.maxParticles;
    const merged = new Set<number>();

    for (let i = 0; i < count; i++) {
      if (!this.particles[i].alive) continue;
      if (merged.has(i)) continue;

      const i3 = i * 3;
      for (let j = i + 1; j < Math.min(i + 50, count); j++) {
        if (!this.particles[j].alive) continue;
        if (merged.has(j)) continue;

        const j3 = j * 3;
        const dx = this.positions[i3] - this.positions[j3];
        const dy = this.positions[i3 + 1] - this.positions[j3 + 1];
        const dz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 25) {
          const dvx = this.velocities[i3] - this.velocities[j3];
          const dvy = this.velocities[i3 + 1] - this.velocities[j3 + 1];
          const dvz = this.velocities[i3 + 2] - this.velocities[j3 + 2];
          const speedDiff = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);

          if (speedDiff < 0.5) {
            this.mergeParticles(i, j);
            merged.add(j);
            this.onEventCallback('2 particles merged!');
            break;
          }
        }
      }
    }
  }

  private mergeParticles(i: number, j: number): void {
    const i3 = i * 3;
    const j3 = j * 3;

    const r1 = this.particles[i].radius;
    const r2 = this.particles[j].radius;
    const totalMass = r1 + r2;
    this.particles[i].radius = (r1 + r2) * 1.4;

    this.positions[i3] = (this.positions[i3] * r1 + this.positions[j3] * r2) / totalMass;
    this.positions[i3 + 1] = (this.positions[i3 + 1] * r1 + this.positions[j3 + 1] * r2) / totalMass;
    this.positions[i3 + 2] = (this.positions[i3 + 2] * r1 + this.positions[j3 + 2] * r2) / totalMass;

    this.velocities[i3] = (this.velocities[i3] * r1 + this.velocities[j3] * r2) / totalMass;
    this.velocities[i3 + 1] = (this.velocities[i3 + 1] * r1 + this.velocities[j3 + 1] * r2) / totalMass;
    this.velocities[i3 + 2] = (this.velocities[i3 + 2] * r1 + this.velocities[j3 + 2] * r2) / totalMass;

    this.colors[i3] = (this.colors[i3] + this.colors[j3]) * 0.5;
    this.colors[i3 + 1] = (this.colors[i3 + 1] + this.colors[j3 + 1]) * 0.5;
    this.colors[i3 + 2] = (this.colors[i3 + 2] + this.colors[j3 + 2]) * 0.5;

    this.spawnBurst(
      this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2],
      this.colors[i3], this.colors[i3 + 1], this.colors[i3 + 2]
    );

    this.particles[j].alive = false;
  }

  private updateTrails(): void {
    const count = this.config.maxParticles;
    let trailIdx = 0;

    for (let i = 0; i < count; i++) {
      if (!this.particles[i].alive) continue;

      const history = this.trailHistory[i];
      const len = history.length;
      if (len < 2) continue;

      const i3 = i * 3;
      const r = this.colors[i3];
      const g = this.colors[i3 + 1];
      const b = this.colors[i3 + 2];

      for (let h = 0; h < len - 1; h++) {
        const alpha = h / len;
        const a1 = 0.8 * alpha;
        const a2 = 0.8 * ((h + 1) / len);

        const p1 = history[h];
        const p2 = history[h + 1];

        const t1 = trailIdx * 6;
        this.trailPositions[t1] = p1[0];
        this.trailPositions[t1 + 1] = p1[1];
        this.trailPositions[t1 + 2] = p1[2];
        this.trailColors[t1] = r * a1;
        this.trailColors[t1 + 1] = g * a1;
        this.trailColors[t1 + 2] = b * a1;

        this.trailPositions[t1 + 3] = p2[0];
        this.trailPositions[t1 + 4] = p2[1];
        this.trailPositions[t1 + 5] = p2[2];
        this.trailColors[t1 + 3] = r * a2;
        this.trailColors[t1 + 4] = g * a2;
        this.trailColors[t1 + 5] = b * a2;

        trailIdx++;
      }
    }

    const maxTrailSegs = count * this.trailLength;
    for (let k = trailIdx * 6; k < maxTrailSegs * 6; k++) {
      this.trailPositions[k] = 0;
      this.trailColors[k] = 0;
    }

    this.trailLines.geometry.attributes.position.needsUpdate = true;
    this.trailLines.geometry.attributes.color.needsUpdate = true;
    this.trailLines.geometry.setDrawRange(0, trailIdx * 2);
  }

  private updateBurst(dt: number): void {
    for (let i = 0; i < this.maxBurst; i++) {
      if (this.burstData[i].life <= 0) continue;

      this.burstData[i].life -= dt;
      const idx = i * 3;

      if (this.burstData[i].life <= 0) {
        this.burstPositions[idx] = 99999;
        this.burstPositions[idx + 1] = 99999;
        this.burstPositions[idx + 2] = 99999;
        continue;
      } else {
        this.burstPositions[idx] += this.burstData[i].vx * dt / 16;
        this.burstPositions[idx + 1] += this.burstData[i].vy * dt / 16;
        this.burstPositions[idx + 2] += this.burstData[i].vz * dt / 16;

        const t = this.burstData[i].life / this.burstData[i].maxLife;
        this.burstColors[idx] = this.burstColors[idx] * 0.3 + 0.7 * t;
        this.burstColors[idx + 1] = this.burstColors[idx + 1] * 0.3 + 0.7 * t;
        this.burstColors[idx + 2] = this.burstColors[idx + 2] * 0.3 + 0.7 * t;
      }
    }

    this.burstParticles.geometry.attributes.position.needsUpdate = true;
    this.burstParticles.geometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.trailLines);
    this.scene.remove(this.burstParticles);
    this.points.geometry.dispose();
    this.trailLines.geometry.dispose();
    this.burstParticles.geometry.dispose();
    this.particleMaterial.dispose();
    this.trailMaterial.dispose();
    this.burstMaterial.dispose();
  }
}
