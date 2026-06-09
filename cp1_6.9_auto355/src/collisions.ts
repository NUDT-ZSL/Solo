import * as THREE from 'three';
import { NebulaSystem, ParticleData } from './nebula';
import { StageSystem, BurstParticle } from './stage';

interface Connection {
  a: THREE.Vector3;
  b: THREE.Vector3;
  life: number;
  maxLife: number;
  alpha: number;
  color: THREE.Color;
}

export class CollisionSystem {
  scene: THREE.Scene;
  connections: Connection[] = [];
  maxConnections = 300;
  lineSegments: THREE.LineSegments | null = null;
  lineGeometry: THREE.BufferGeometry | null = null;
  lineMaterial: THREE.LineBasicMaterial | null = null;
  linePositions: Float32Array;
  lineColors: Float32Array;

  private cellSize = 20;
  private gridMap = new Map<string, ParticleData[]>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.linePositions = new Float32Array(this.maxConnections * 6);
    this.lineColors = new Float32Array(this.maxConnections * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.lineGeometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.lineSegments);
  }

  private cellKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private buildGrid(particles: ParticleData[]) {
    this.gridMap.clear();
    const cs = this.cellSize;
    for (const p of particles) {
      const cx = Math.floor(p.position.x / cs);
      const cy = Math.floor(p.position.y / cs);
      const cz = Math.floor(p.position.z / cs);
      const key = this.cellKey(cx, cy, cz);
      let bucket = this.gridMap.get(key);
      if (!bucket) {
        bucket = [];
        this.gridMap.set(key, bucket);
      }
      bucket.push(p);
    }
  }

  private getNearby(p: ParticleData): ParticleData[] {
    const cs = this.cellSize;
    const cx = Math.floor(p.position.x / cs);
    const cy = Math.floor(p.position.y / cs);
    const cz = Math.floor(p.position.z / cs);
    const nearby: ParticleData[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = this.cellKey(cx + dx, cy + dy, cz + dz);
          const bucket = this.gridMap.get(key);
          if (bucket) nearby.push(...bucket);
        }
      }
    }
    return nearby;
  }

  private mixColors(a: THREE.Color, b: THREE.Color): THREE.Color {
    return new THREE.Color(
      Math.min(1, (a.r + b.r) * 0.5 * 1.1),
      Math.min(1, (a.g + b.g) * 0.5 * 1.1),
      Math.min(1, (a.b + b.b) * 0.5 * 1.1)
    );
  }

  private applyColorMix(p: ParticleData, mixed: THREE.Color) {
    p.mixedColor = mixed.clone();
    p.color.copy(mixed);
    p.colorMixTimer = 0.08;
  }

  detectAndResolve(nebula: NebulaSystem, stage: StageSystem, _time: number, dt: number) {
    const nebulaParticles = nebula.particles;
    const coreParticles = stage.coreParticles;
    const burstParticles = stage.burstParticles;

    const allDetectable: ParticleData[] = [...nebulaParticles, ...coreParticles];
    this.buildGrid(allDetectable);

    const thresholdSq = 8 * 8;
    const checked = new Set<string>();

    for (const p of allDetectable) {
      const neighbors = this.getNearby(p);
      for (const q of neighbors) {
        if (p.id >= q.id) continue;
        const pairKey = `${p.id}-${q.id}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const dx = p.position.x - q.position.x;
        const dy = p.position.y - q.position.y;
        const dz = p.position.z - q.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < thresholdSq && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const alpha = 0.3 + 0.2 * (1 - dist / 8);

          const mixed = this.mixColors(p.color, q.color);
          this.addConnection(p.position, q.position, mixed, alpha);

          this.applyColorMix(p, mixed);
          this.applyColorMix(q, mixed);
        }
      }
    }

    for (const bp of burstParticles) {
      const cx = Math.floor(bp.position.x / this.cellSize);
      const cy = Math.floor(bp.position.y / this.cellSize);
      const cz = Math.floor(bp.position.z / this.cellSize);
      const nearby: ParticleData[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = this.cellKey(cx + dx, cy + dy, cz + dz);
            const bucket = this.gridMap.get(key);
            if (bucket) nearby.push(...bucket);
          }
        }
      }
      for (const np of nearby) {
        const d = bp.position.distanceToSquared(np.position);
        if (d < thresholdSq) {
          const mixed = this.mixColors(bp.color, np.color);
          this.addConnection(bp.position, np.position, mixed, 0.4);
          this.applyColorMix(np, mixed);
          np.brightBoost = 1.8;
          np.brightTimer = 0.2;
        }
      }
    }

    if (stage.onShockwaveCallback === null) {
      stage.onShockwaveCallback = (center, radius, width) => {
        nebula.applyShockwave(center, radius, width);
        for (const cp of stage.coreParticles) {
          const d = cp.position.distanceTo(center);
          if (Math.abs(d - radius) < width) {
            cp.brightBoost = 2;
            cp.brightTimer = 0.3;
          }
        }
      };
    }

    for (let i = this.connections.length - 1; i >= 0; i--) {
      this.connections[i].life -= dt;
      if (this.connections[i].life <= 0) {
        this.connections.splice(i, 1);
      }
    }

    this.syncLineBuffers();
  }

  private addConnection(a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color, alpha: number) {
    if (this.connections.length >= this.maxConnections) {
      this.connections.shift();
    }
    this.connections.push({
      a: a.clone(),
      b: b.clone(),
      life: 0.2,
      maxLife: 0.2,
      alpha,
      color: color.clone()
    });
  }

  private syncLineBuffers() {
    const count = Math.min(this.connections.length, this.maxConnections);
    for (let i = 0; i < count; i++) {
      const c = this.connections[i];
      const t = c.life / c.maxLife;
      const a = c.alpha * t;
      const flicker = 0.7 + 0.3 * Math.sin(t * 25 + i);

      this.linePositions[i * 6] = c.a.x;
      this.linePositions[i * 6 + 1] = c.a.y;
      this.linePositions[i * 6 + 2] = c.a.z;
      this.linePositions[i * 6 + 3] = c.b.x;
      this.linePositions[i * 6 + 4] = c.b.y;
      this.linePositions[i * 6 + 5] = c.b.z;

      const cr = c.color.r * flicker;
      const cg = c.color.g * flicker;
      const cb = c.color.b * flicker;
      this.lineColors[i * 6] = cr;
      this.lineColors[i * 6 + 1] = cg;
      this.lineColors[i * 6 + 2] = cb;
      this.lineColors[i * 6 + 3] = cr;
      this.lineColors[i * 6 + 4] = cg;
      this.lineColors[i * 6 + 5] = cb;
    }

    if (this.lineGeometry) {
      this.lineGeometry.setDrawRange(0, count * 2);
      (this.lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
    if (this.lineMaterial) {
      this.lineMaterial.opacity = 1;
    }
  }
}
