import * as THREE from 'three';
import { Sandglass, HOULGLASS_CONFIG } from './sandglass';
import * as TWEEN from '@tweenjs/tween.js';

const PARTICLE_COUNT = 800;
const TERRAIN_GRID = 60;
const TERRAIN_SIZE = HOULGLASS_CONFIG.radius * 2;
const CELL_SIZE = TERRAIN_SIZE / TERRAIN_GRID;
const TRAIL_LENGTH = 8;
const WIND_MIN = -0.3;
const WIND_MAX = 0.3;
const GRAVITY = 9.8;

export interface SandParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  hue: number;
  isSettled: boolean;
  settledIn: 'top' | 'bottom' | null;
  trail: THREE.Vector3[];
  age: number;
}

export class ParticleSystem {
  public particles: SandParticle[] = [];
  public particleMesh!: THREE.InstancedMesh;
  public trailMesh!: THREE.InstancedMesh;
  public terrainMesh!: THREE.Mesh;
  public terrainHeightMap: Float32Array;
  public terrainTargetHeight: Float32Array;
  public terrainHeightDelta: Float32Array;

  private dummy: THREE.Object3D = new THREE.Object3D();
  private sandglass: Sandglass;
  private scene: THREE.Scene;
  private topColor = new THREE.Color().setHSL(200 / 360, 0.85, 0.65);
  private bottomColor = new THREE.Color().setHSL(30 / 360, 0.85, 0.6);
  private terrainBottomColor = new THREE.Color().setHSL(280 / 360, 0.7, 0.2);
  private terrainTopColor = new THREE.Color().setHSL(45 / 360, 0.8, 0.75);
  private particleGeo!: THREE.SphereGeometry;
  private trailGeo!: THREE.CylinderGeometry;
  private particleMat!: THREE.MeshBasicMaterial;
  private trailMat!: THREE.MeshBasicMaterial;
  private maxTrailInstances: number;

  constructor(scene: THREE.Scene, sandglass: Sandglass) {
    this.scene = scene;
    this.sandglass = sandglass;
    this.terrainHeightMap = new Float32Array(TERRAIN_GRID * TERRAIN_GRID);
    this.terrainTargetHeight = new Float32Array(TERRAIN_GRID * TERRAIN_GRID);
    this.terrainHeightDelta = new Float32Array(TERRAIN_GRID * TERRAIN_GRID);

    this.maxTrailInstances = PARTICLE_COUNT * TRAIL_LENGTH;
    this.setupGeometries();
    this.setupMaterials();
    this.setupMeshes();
    this.setupTerrain();
    this.initParticles();
  }

  private setupGeometries() {
    this.particleGeo = new THREE.SphereGeometry(1, 8, 6);
    this.trailGeo = new THREE.CylinderGeometry(1, 0, 1, 4, 1, false);
    this.trailGeo.translate(0, 0.5, 0);
  }

  private setupMaterials() {
    this.particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private setupMeshes() {
    this.particleMesh = new THREE.InstancedMesh(
      this.particleGeo,
      this.particleMat,
      PARTICLE_COUNT
    );
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PARTICLE_COUNT * 3),
      3
    );
    this.particleMesh.frustumCulled = false;
    this.sandglass.container.add(this.particleMesh);

    this.trailMesh = new THREE.InstancedMesh(
      this.trailGeo,
      this.trailMat,
      this.maxTrailInstances
    );
    this.trailMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.maxTrailInstances * 3),
      3
    );
    this.trailMesh.frustumCulled = false;
    this.sandglass.container.add(this.trailMesh);
  }

  private setupTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_GRID - 1, TERRAIN_GRID - 1);
    terrainGeo.rotateX(-Math.PI / 2);
    const positions = terrainGeo.attributes.position;

    const terrainColors = new Float32Array(positions.count * 3);
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));

    const terrainMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.position.y = -HOULGLASS_CONFIG.height / 2 + 0.12;
    this.sandglass.container.add(this.terrainMesh);
    this.updateTerrainColors();
  }

  private hueForY(y: number): number {
    const topY = 15;
    const bottomY = -5;
    const t = THREE.MathUtils.clamp((topY - y) / (topY - bottomY), 0, 1);
    return THREE.MathUtils.lerp(200, 30, t);
  }

  private getParticleColor(hue: number): THREE.Color {
    const color = new THREE.Color();
    const sat = THREE.MathUtils.lerp(0.75, 0.85, 0.5);
    const light = THREE.MathUtils.lerp(0.55, 0.7, 0.5);
    color.setHSL(hue / 360, sat, light);
    const intensity = 1.6;
    color.multiplyScalar(intensity);
    return color;
  }

  private initParticles() {
    const bounds = this.sandglass.getTopChamberBounds();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p: SandParticle = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        radius: THREE.MathUtils.randFloat(0.08, 0.15),
        hue: 200,
        isSettled: true,
        settledIn: 'top',
        trail: [],
        age: Math.random() * 100,
      };

      const yRatio = THREE.MathUtils.randFloat(0.1, 0.9);
      const y = THREE.MathUtils.lerp(bounds.minY + 1, bounds.maxY - 0.5, yRatio);
      const rAtY = THREE.MathUtils.lerp(bounds.neckRadius, bounds.topRadius, (bounds.maxY - y) / (bounds.maxY - bounds.minY));
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (rAtY - p.radius * 2);
      p.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);

      this.particles.push(p);
    }
    this.updateInitialSettled();
  }

  private updateInitialSettled() {
    const bounds = this.sandglass.getTopChamberBounds();
    const height = bounds.maxY - bounds.minY;
    const count = PARTICLE_COUNT;
    const totalVolume = count * (4/3) * Math.PI * Math.pow(0.115, 3);
    const avgHeight = totalVolume / (Math.PI * Math.pow(bounds.topRadius, 2) / 3) * 1.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      const yRatio = THREE.MathUtils.randFloat(0.05, 0.85);
      const y = THREE.MathUtils.lerp(bounds.minY + 0.5, bounds.minY + avgHeight, yRatio);
      const rAtY = THREE.MathUtils.lerp(bounds.neckRadius, bounds.topRadius, Math.max(0, (bounds.maxY - y) / (bounds.maxY - bounds.minY)));
      const angle = Math.random() * Math.PI * 2;
      const maxR = rAtY - p.radius;
      const r = Math.sqrt(Math.random()) * Math.max(0.05, maxR);
      p.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      p.hue = this.hueForY(y);
    }
  }

  public resetAllToTop() {
    const bounds = this.sandglass.getTopChamberBounds();
    this.terrainHeightMap.fill(0);
    this.terrainTargetHeight.fill(0);
    this.terrainHeightDelta.fill(0);
    this.updateTerrainMesh();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      p.velocity.set(0, 0, 0);
      p.trail.length = 0;
      p.isSettled = true;
      p.settledIn = 'top';
    }
    this.updateInitialSettled();
  }

  public onFlip() {
    const gravDir = this.sandglass.gravityDirection;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (p.isSettled) {
        p.isSettled = false;
        p.settledIn = null;
        p.velocity.set(
          THREE.MathUtils.randFloatSpread(0.4),
          THREE.MathUtils.randFloat(-0.5, 0.5),
          THREE.MathUtils.randFloatSpread(0.4)
        );
      }
      p.trail.length = 0;
    }
    this.terrainHeightMap.fill(0);
    this.terrainTargetHeight.fill(0);
    this.terrainHeightDelta.fill(0);
    this.updateTerrainMesh();
  }

  public getTerrainWorldPos(gridX: number, gridZ: number): THREE.Vector3 {
    const localPos = new THREE.Vector3(
      (gridX / (TERRAIN_GRID - 1) - 0.5) * TERRAIN_SIZE,
      this.terrainHeightMap[gridZ * TERRAIN_GRID + gridX] + this.terrainMesh.position.y,
      (gridZ / (TERRAIN_GRID - 1) - 0.5) * TERRAIN_SIZE
    );
    return localPos.applyMatrix4(this.terrainMesh.matrixWorld);
  }

  private gridToLocal(x: number, z: number): { x: number; z: number } {
    return {
      x: (x - TERRAIN_GRID / 2 + 0.5) * CELL_SIZE,
      z: (z - TERRAIN_GRID / 2 + 0.5) * CELL_SIZE,
    };
  }

  public getTerrainHeightAt(localX: number, localZ: number): number {
    const gx = (localX / TERRAIN_SIZE + 0.5) * TERRAIN_GRID;
    const gz = (localZ / TERRAIN_SIZE + 0.5) * TERRAIN_GRID;
    const gx0 = Math.floor(gx), gz0 = Math.floor(gz);
    const fx = gx - gx0, fz = gz - gz0;

    const h00 = this.terrainHeightMap[Math.max(0, Math.min(TERRAIN_GRID - 1, gz0)) * TERRAIN_GRID + Math.max(0, Math.min(TERRAIN_GRID - 1, gx0))];
    const h10 = this.terrainHeightMap[Math.max(0, Math.min(TERRAIN_GRID - 1, gz0)) * TERRAIN_GRID + Math.max(0, Math.min(TERRAIN_GRID - 1, gx0 + 1))];
    const h01 = this.terrainHeightMap[Math.max(0, Math.min(TERRAIN_GRID - 1, gz0 + 1)) * TERRAIN_GRID + Math.max(0, Math.min(TERRAIN_GRID - 1, gx0))];
    const h11 = this.terrainHeightMap[Math.max(0, Math.min(TERRAIN_GRID - 1, gz0 + 1)) * TERRAIN_GRID + Math.max(0, Math.min(TERRAIN_GRID - 1, gx0 + 1))];

    const h0 = THREE.MathUtils.lerp(h00, h10, fx);
    const h1 = THREE.MathUtils.lerp(h01, h11, fx);
    return THREE.MathUtils.lerp(h0, h1, fz);
  }

  public raiseTerrain(localX: number, localZ: number, radius: number = 2, amount: number = 0.2, duration: number = 500) {
    const gx0 = Math.max(0, Math.floor((localX - radius) / TERRAIN_SIZE * TERRAIN_GRID + TERRAIN_GRID / 2));
    const gx1 = Math.min(TERRAIN_GRID - 1, Math.ceil((localX + radius) / TERRAIN_SIZE * TERRAIN_GRID + TERRAIN_GRID / 2));
    const gz0 = Math.max(0, Math.floor((localZ - radius) / TERRAIN_SIZE * TERRAIN_GRID + TERRAIN_GRID / 2));
    const gz1 = Math.min(TERRAIN_GRID - 1, Math.ceil((localZ + radius) / TERRAIN_SIZE * TERRAIN_GRID + TERRAIN_GRID / 2));

    for (let gz = gz0; gz <= gz1; gz++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const pos = this.gridToLocal(gx, gz);
        const dx = pos.x - localX;
        const dz = pos.z - localZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= radius) {
          const falloff = 1 - dist / radius;
          const idx = gz * TERRAIN_GRID + gx;
          const targetAdd = amount * falloff * falloff;

          const start = { t: 0 };
          const end = { t: 1 };
          const startH = this.terrainHeightMap[idx];
          new TWEEN.Tween(start)
            .to(end, duration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
              this.terrainHeightMap[idx] = startH + targetAdd * start.t;
            })
            .start();

          setTimeout(() => {
            const decayStart = { t: 0 };
            const decayEnd = { t: 1 };
            const hBefore = this.terrainHeightMap[idx];
            new TWEEN.Tween(decayStart)
              .to(decayEnd, 3000)
              .easing(TWEEN.Easing.Cubic.InOut)
              .onUpdate(() => {
                this.terrainHeightMap[idx] = hBefore - targetAdd * decayStart.t;
              })
              .start();
          }, duration);
        }
      }
    }
  }

  public erupt(localX: number, localZ: number, terrainY: number, count: number = 12) {
    const freeParticles: SandParticle[] = [];
    for (let i = 0; i < this.particles.length && freeParticles.length < count; i++) {
      const p = this.particles[i];
      if (p.isSettled && p.settledIn === 'bottom') {
        const dx = p.position.x - localX;
        const dz = p.position.z - localZ;
        const d2 = dx * dx + dz * dz;
        if (d2 < 2.5 * 2.5) {
          freeParticles.push(p);
        }
      }
    }

    for (let i = 0; i < this.particles.length && freeParticles.length < count; i++) {
      const p = this.particles[i];
      if (p.isSettled && p.settledIn === 'bottom' && freeParticles.indexOf(p) < 0) {
        freeParticles.push(p);
      }
    }

    const eruptCount = Math.min(count, freeParticles.length);
    for (let i = 0; i < eruptCount; i++) {
      const p = freeParticles[i];
      p.isSettled = false;
      p.settledIn = null;
      const angle = Math.random() * Math.PI * 2;
      const horizSpeed = THREE.MathUtils.randFloat(1.5, 3.5);
      const upSpeed = THREE.MathUtils.randFloat(4, 7);
      p.position.set(
        localX + THREE.MathUtils.randFloatSpread(0.3),
        terrainY + 0.1,
        localZ + THREE.MathUtils.randFloatSpread(0.3)
      );
      p.velocity.set(
        Math.cos(angle) * horizSpeed,
        upSpeed,
        Math.sin(angle) * horizSpeed
      );
      p.trail.length = 0;
    }
  }

  private updateSingleParticle(p: SandParticle, dt: number, gravDir: number) {
    p.age += dt;

    if (p.isSettled) {
      if (p.trail.length > 0) p.trail.length = 0;
      return;
    }

    const windX = THREE.MathUtils.randFloat(WIND_MIN, WIND_MAX);
    const windZ = THREE.MathUtils.randFloat(WIND_MIN, WIND_MAX);
    p.velocity.x += windX * dt * 60;
    p.velocity.z += windZ * dt * 60;

    p.velocity.y -= GRAVITY * gravDir * dt;

    const drag = 0.998;
    p.velocity.multiplyScalar(Math.pow(drag, dt * 60));

    const oldPos = p.position.clone();
    p.position.addScaledVector(p.velocity, dt);

    const trailPoint = oldPos.clone();
    p.trail.unshift(trailPoint);
    if (p.trail.length > TRAIL_LENGTH) p.trail.length = TRAIL_LENGTH;

    const boundsTop = this.sandglass.getTopChamberBounds();
    const boundsBot = this.sandglass.getBottomChamberBounds();
    const { radius } = HOULGLASS_CONFIG;
    const halfHeight = HOULGLASS_CONFIG.height / 2;

    if (gravDir < 0) {
      this.resolvePhysicsForGravityDown(p, boundsTop, boundsBot, radius, halfHeight, dt);
    } else {
      this.resolvePhysicsForGravityUp(p, boundsTop, boundsBot, radius, halfHeight, dt);
    }

    const horR2 = p.position.x * p.position.x + p.position.z * p.position.z;
    if (horR2 > radius * radius) {
      const rr = Math.sqrt(horR2);
      const nx = p.position.x / rr;
      const nz = p.position.z / rr;
      p.position.x = nx * (radius - p.radius);
      p.position.z = nz * (radius - p.radius);
      const dot = p.velocity.x * nx + p.velocity.z * nz;
      if (dot > 0) {
        p.velocity.x -= 1.6 * dot * nx;
        p.velocity.z -= 1.6 * dot * nz;
      }
    }

    p.hue = this.hueForY(p.position.y);
  }

  private resolvePhysicsForGravityDown(
    p: SandParticle,
    boundsTop: any,
    boundsBot: any,
    radius: number,
    halfHeight: number,
    dt: number
  ) {
    if (p.position.y > boundsTop.minY && p.position.y < boundsTop.maxY) {
      const rAtY = THREE.MathUtils.lerp(
        boundsTop.neckRadius,
        boundsTop.topRadius,
        (boundsTop.maxY - p.position.y) / (boundsTop.maxY - boundsTop.minY)
      );
      const hr = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
      if (hr > rAtY - p.radius) {
        const norm = (rAtY - p.radius) / Math.max(0.001, hr);
        p.position.x *= norm;
        p.position.z *= norm;
        const dotH = (p.velocity.x * p.position.x + p.velocity.z * p.position.z) / Math.max(0.001, hr);
        if (dotH > 0) {
          p.velocity.x -= 1.4 * dotH * p.position.x / Math.max(0.001, hr);
          p.velocity.z -= 1.4 * dotH * p.position.z / Math.max(0.001, hr);
        }
      }
    }

    if (p.position.y < boundsTop.minY && p.position.y > boundsBot.maxY) {
      const neckR = HOULGLASS_CONFIG.neckRadius;
      const hr = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
      if (hr > neckR - p.radius) {
        const norm = (neckR - p.radius) / Math.max(0.001, hr);
        p.position.x *= norm;
        p.position.z *= norm;
      }
    }

    if (p.position.y < boundsBot.maxY && p.position.y > boundsBot.minY) {
      const t = (p.position.y - boundsBot.minY) / (boundsBot.maxY - boundsBot.minY);
      const rAtY = THREE.MathUtils.lerp(boundsBot.bottomRadius, boundsBot.neckRadius, 1 - t);
      const hr = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
      if (hr > rAtY - p.radius) {
        const norm = (rAtY - p.radius) / Math.max(0.001, hr);
        p.position.x *= norm;
        p.position.z *= norm;
        const dotH = (p.velocity.x * p.position.x + p.velocity.z * p.position.z) / Math.max(0.001, hr);
        if (dotH > 0) {
          p.velocity.x -= 1.4 * dotH * p.position.x / Math.max(0.001, hr);
          p.velocity.z -= 1.4 * dotH * p.position.z / Math.max(0.001, hr);
        }
      }

      const terrainLocalY = boundsBot.minY - this.terrainMesh.position.y;
      const terrainH = this.getTerrainHeightAt(p.position.x, p.position.z);
      const groundY = terrainLocalY + terrainH + p.radius;
      if (p.position.y <= groundY) {
        p.position.y = groundY;
        if (p.velocity.y < -2.5) {
          this.depositOnTerrain(p.position.x, p.position.z, p.radius);
        }
        p.velocity.y *= -0.25;
        p.velocity.x *= 0.6;
        p.velocity.z *= 0.6;
        const horizSpeed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
        if (horizSpeed < 0.4 && Math.abs(p.velocity.y) < 0.5) {
          this.settleParticle(p, 'bottom');
        }
      }
    }

    if (p.position.y < -halfHeight + 0.1) {
      p.position.y = -halfHeight + 0.1 + p.radius;
      p.velocity.y = Math.abs(p.velocity.y) * 0.2;
      if (Math.abs(p.velocity.y) < 0.3) {
        this.settleParticle(p, 'bottom');
      }
    }
  }

  private resolvePhysicsForGravityUp(
    p: SandParticle,
    boundsTop: any,
    boundsBot: any,
    radius: number,
    halfHeight: number,
    dt: number
  ) {
    if (p.position.y < boundsTop.maxY && p.position.y > boundsTop.minY) {
      const rAtY = THREE.MathUtils.lerp(
        boundsTop.neckRadius,
        boundsTop.topRadius,
        (boundsTop.maxY - p.position.y) / (boundsTop.maxY - boundsTop.minY)
      );
      const hr = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
      if (hr > rAtY - p.radius) {
        const norm = (rAtY - p.radius) / Math.max(0.001, hr);
        p.position.x *= norm;
        p.position.z *= norm;
        const dotH = (p.velocity.x * p.position.x + p.velocity.z * p.position.z) / Math.max(0.001, hr);
        if (dotH > 0) {
          p.velocity.x -= 1.4 * dotH * p.position.x / Math.max(0.001, hr);
          p.velocity.z -= 1.4 * dotH * p.position.z / Math.max(0.001, hr);
        }
      }

      const ceilingY = boundsTop.maxY - p.radius;
      if (p.position.y >= ceilingY) {
        p.position.y = ceilingY;
        p.velocity.y = -Math.abs(p.velocity.y) * 0.2;
        this.depositOnTopTerrain(p.position.x, p.position.z, p.radius);
        const horizSpeed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
        if (horizSpeed < 0.4 && Math.abs(p.velocity.y) < 0.5) {
          this.settleParticle(p, 'top');
        }
      }
    }
  }

  private depositOnTerrain(localX: number, localZ: number, particleRadius: number) {
    const gx = Math.floor((localX / TERRAIN_SIZE + 0.5) * TERRAIN_GRID);
    const gz = Math.floor((localZ / TERRAIN_SIZE + 0.5) * TERRAIN_GRID);
    const radiusCells = 1;
    let totalAdded = 0;
    const addAmount = particleRadius * particleRadius * 0.35;

    for (let dz = -radiusCells; dz <= radiusCells; dz++) {
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const ix = gx + dx;
        const iz = gz + dz;
        if (ix < 0 || ix >= TERRAIN_GRID || iz < 0 || iz >= TERRAIN_GRID) continue;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= radiusCells) {
          const falloff = 1 - dist / (radiusCells + 0.01);
          const idx = iz * TERRAIN_GRID + ix;
          const add = addAmount * falloff * falloff;
          this.terrainHeightMap[idx] += add;
          totalAdded += add;
        }
      }
    }
  }

  private depositOnTopTerrain(localX: number, localZ: number, particleRadius: number) {
  }

  private settleParticle(p: SandParticle, where: 'top' | 'bottom') {
    p.isSettled = true;
    p.settledIn = where;
    p.velocity.set(0, 0, 0);
  }

  private updateNeckLeak(dt: number, gravDir: number) {
    const leakRatePerSec = 40;
    const prob = leakRatePerSec * dt / PARTICLE_COUNT;
    const boundsTop = this.sandglass.getTopChamberBounds();
    const boundsBot = this.sandglass.getBottomChamberBounds();
    const neckY = gravDir < 0 ? boundsTop.minY : boundsBot.maxY;
    const sourceChamber = gravDir < 0 ? 'top' : 'bottom';
    const neckR = HOULGLASS_CONFIG.neckRadius;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (!p.isSettled || p.settledIn !== sourceChamber) continue;

      const dy = gravDir < 0 ? (neckY - p.position.y) : (p.position.y - neckY);
      if (dy < 0) continue;

      const nearNeck = dy < 1.2;
      const hr = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
      const inNeckColumn = hr < neckR * 2.5;
      const chance = prob * (nearNeck ? (inNeckColumn ? 18 : 3) : 0.15);

      if (Math.random() < chance) {
        p.isSettled = false;
        p.settledIn = null;
        p.velocity.set(
          THREE.MathUtils.randFloatSpread(0.25),
          THREE.MathUtils.randFloatSpread(0.25),
          THREE.MathUtils.randFloatSpread(0.25)
        );
      }
    }
  }

  public update(dt: number) {
    const gravDir = this.sandglass.gravityDirection;

    this.updateNeckLeak(dt, gravDir);

    const subSteps = 2;
    const subDt = dt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        this.updateSingleParticle(this.particles[i], subDt, gravDir);
      }
    }

    this.updateTerrainMesh();
    this.renderParticles();
  }

  private updateTerrainMesh() {
    const positions = this.terrainMesh.geometry.attributes.position;
    const colors = this.terrainMesh.geometry.attributes.color as THREE.BufferAttribute;
    let maxH = 0;
    for (let i = 0; i < this.terrainHeightMap.length; i++) {
      if (this.terrainHeightMap[i] > maxH) maxH = this.terrainHeightMap[i];
    }
    const noiseScale = 1.8;
    for (let z = 0; z < TERRAIN_GRID; z++) {
      for (let x = 0; x < TERRAIN_GRID; x++) {
        const idx = z * TERRAIN_GRID + x;
        let h = this.terrainHeightMap[idx];
        if (h > 0) {
          const nx = x / TERRAIN_GRID;
          const nz = z / TERRAIN_GRID;
          const noise = (Math.sin(nx * 13.7 + nz * 7.3) * 0.5 + 0.5 +
                         Math.sin(nx * 27.1 - nz * 19.3) * 0.3 + 0.3) * 0.5;
          h = h * (1 + (noise - 0.5) * 0.35 * Math.min(1, h * 3));
          if (h < 0.01) h = 0;
        }
        positions.setY(idx, h);
        const t = maxH > 0.001 ? THREE.MathUtils.clamp(h / (maxH + 0.3), 0, 1) : 0;
        const color = new THREE.Color().lerpColors(this.terrainBottomColor, this.terrainTopColor, t);
        color.multiplyScalar(1.2 + t * 0.6);
        colors.setXYZ(idx, color.r, color.g, color.b);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.terrainMesh.geometry.computeVertexNormals();
  }

  private updateTerrainColors() {
    const colors = this.terrainMesh.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < colors.count; i++) {
      colors.setXYZ(i, this.terrainBottomColor.r, this.terrainBottomColor.g, this.terrainBottomColor.b);
    }
    colors.needsUpdate = true;
  }

  private renderParticles() {
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      this.dummy.position.copy(p.position);
      const scale = p.radius;
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);

      const hue = this.hueForY(p.position.y);
      const col = this.getParticleColor(hue);
      this.particleMesh.setColorAt(i, col);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;

    let trailIdx = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (p.isSettled || p.trail.length < 2) {
        for (let t = 0; t < TRAIL_LENGTH && trailIdx < this.maxTrailInstances; t++) {
          this.dummy.position.set(0, -9999, 0);
          this.dummy.scale.set(0, 0, 0);
          this.dummy.updateMatrix();
          this.trailMesh.setMatrixAt(trailIdx, this.dummy.matrix);
          this.trailMesh.setColorAt(trailIdx, white);
          trailIdx++;
        }
        continue;
      }

      for (let t = 0; t < p.trail.length - 1 && trailIdx < this.maxTrailInstances; t++) {
        const from = p.trail[t];
        const to = p.trail[t + 1];
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(from, to);
        const length = dir.length();
        if (length < 0.001) {
          this.dummy.position.set(0, -9999, 0);
          this.dummy.scale.set(0, 0, 0);
        } else {
          this.dummy.position.copy(mid);
          const quat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
          );
          this.dummy.quaternion.copy(quat);
          const ratio = 1 - t / TRAIL_LENGTH;
          const thickness = p.radius * 0.55 * ratio;
          this.dummy.scale.set(thickness, length, thickness);
        }
        this.dummy.updateMatrix();
        this.trailMesh.setMatrixAt(trailIdx, this.dummy.matrix);

        const avgY = (from.y + to.y) * 0.5;
        const hue = this.hueForY(avgY);
        const trailCol = this.getParticleColor(hue);
        const alpha = 1 - t / TRAIL_LENGTH;
        trailCol.multiplyScalar(0.55 * alpha);
        this.trailMesh.setColorAt(trailIdx, trailCol);
        trailIdx++;
      }

      while (trailIdx < (i + 1) * TRAIL_LENGTH && trailIdx < this.maxTrailInstances) {
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.trailMesh.setMatrixAt(trailIdx, this.dummy.matrix);
        this.trailMesh.setColorAt(trailIdx, white);
        trailIdx++;
      }
    }

    while (trailIdx < this.maxTrailInstances) {
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.trailMesh.setMatrixAt(trailIdx, this.dummy.matrix);
      this.trailMesh.setColorAt(trailIdx, white);
      trailIdx++;
    }

    this.trailMesh.instanceMatrix.needsUpdate = true;
    if (this.trailMesh.instanceColor) this.trailMesh.instanceColor.needsUpdate = true;
  }
}
