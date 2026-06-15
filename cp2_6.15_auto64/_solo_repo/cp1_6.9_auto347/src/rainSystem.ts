import * as THREE from 'three';

export interface WindProvider {
  getWindForce(): number;
}

interface RainParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lengthPx: number;
  widthPx: number;
  baseSpeed: number;
  phase: number;
  colorMix: number;
  trailPositions: THREE.Vector3[];
}

const PARTICLE_COUNT = 1500;
const BOUNDS_X_MIN = -200;
const BOUNDS_X_MAX = 200;
const BOUNDS_Y_MIN = 100;
const BOUNDS_Y_MAX = 300;
const BOUNDS_Z_MIN = -200;
const BOUNDS_Z_MAX = 200;
const RESET_Y = -50;
const SPAWN_Y = 300;
const MIN_SPEED = 80;
const MAX_SPEED = 150;
const TRAIL_COUNT = 5;
const MIN_DIST_SQ = 25;

const _tmpLB = new THREE.Color(0xA8D8EA).multiplyScalar(1.1);
const _tmpW = new THREE.Color(0xE0F7FA).multiplyScalar(1.1);
const _tmpS = new THREE.Color(0x4FC3F7).multiplyScalar(1.15);
const COLOR_LIGHT_BLUE_BASE = { r: _tmpLB.r, g: _tmpLB.g, b: _tmpLB.b };
const COLOR_WHITE_BASE = { r: _tmpW.r, g: _tmpW.g, b: _tmpW.b };
const COLOR_SATURATED_BASE = { r: _tmpS.r, g: _tmpS.g, b: _tmpS.b };

const WORLD_LENGTH_SCALE = 0.55;
const WORLD_RADIUS_SCALE = 0.12;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class RainSystem {
  private scene: THREE.Scene;
  private windProvider: WindProvider;
  private particles: RainParticle[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private baseGeometry: THREE.ConeGeometry;
  private material: THREE.MeshBasicMaterial;
  private dummyObject: THREE.Object3D;
  private tempColor: THREE.Color;
  private tempDir: THREE.Vector3;
  private targetDir: THREE.Vector3;

  constructor(scene: THREE.Scene, windProvider: WindProvider) {
    this.scene = scene;
    this.windProvider = windProvider;
    this.dummyObject = new THREE.Object3D();
    this.tempColor = new THREE.Color();
    this.tempDir = new THREE.Vector3();
    this.targetDir = new THREE.Vector3();

    this.baseGeometry = new THREE.ConeGeometry(1, 1, 6, 1, false);
    this.baseGeometry.translate(0, 0.5, 0);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: false,
      color: 0xffffff,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1.0
    });

    const totalInstances = PARTICLE_COUNT * (1 + TRAIL_COUNT);
    this.instancedMesh = new THREE.InstancedMesh(
      this.baseGeometry,
      this.material,
      totalInstances
    );
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.renderOrder = 10;

    const colorBuffer = new Float32Array(totalInstances * 3);
    const colorAttr = new THREE.InstancedBufferAttribute(colorBuffer, 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.instanceColor = colorAttr;

    for (let i = 0; i < totalInstances; i++) {
      this.instancedMesh.setColorAt(i, new THREE.Color(0, 0, 0));
    }

    this.createParticlePool();
    this.scene.add(this.instancedMesh);
  }

  private createParticlePool(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle: RainParticle = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lengthPx: rand(12, 18),
        widthPx: rand(2, 3),
        baseSpeed: rand(MIN_SPEED, MAX_SPEED),
        phase: Math.random() * Math.PI * 2,
        colorMix: Math.random(),
        trailPositions: []
      };
      for (let t = 0; t < TRAIL_COUNT; t++) {
        particle.trailPositions.push(new THREE.Vector3());
      }
      this.resetParticle(particle, true);
      this.particles.push(particle);
    }
    this.ensureSpacing();
  }

  private resetParticle(p: RainParticle, initial: boolean = false): void {
    let attempts = 0;
    const maxAttempts = 12;
    do {
      p.position.set(
        rand(BOUNDS_X_MIN, BOUNDS_X_MAX),
        initial ? rand(BOUNDS_Y_MIN, BOUNDS_Y_MAX) : SPAWN_Y,
        rand(BOUNDS_Z_MIN, BOUNDS_Z_MAX)
      );
      attempts++;
    } while (attempts < maxAttempts && !this.isFarEnough(p.position));

    p.baseSpeed = rand(MIN_SPEED, MAX_SPEED);
    p.lengthPx = rand(12, 18);
    p.widthPx = rand(2, 3);
    p.colorMix = Math.random();
    p.phase = Math.random() * Math.PI * 2;

    for (let t = 0; t < TRAIL_COUNT; t++) {
      p.trailPositions[t].copy(p.position);
    }
  }

  private isFarEnough(pos: THREE.Vector3): boolean {
    for (const other of this.particles) {
      if (other.position === pos) continue;
      const dx = other.position.x - pos.x;
      const dy = other.position.y - pos.y;
      const dz = other.position.z - pos.z;
      if (dx * dx + dy * dy + dz * dz < MIN_DIST_SQ) {
        return false;
      }
    }
    return true;
  }

  private ensureSpacing(): void {
    for (let iter = 0; iter < 3; iter++) {
      let changed = false;
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a = this.particles[i].position;
          const b = this.particles[j].position;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < MIN_DIST_SQ && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const push = (5 - d) * 0.5;
            const nx = dx / d;
            const ny = dy / d;
            const nz = dz / d;
            a.x += nx * push; a.y += ny * push; a.z += nz * push;
            b.x -= nx * push; b.y -= ny * push; b.z -= nz * push;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
  }

  update(deltaTime: number): void {
    const windForce = this.windProvider.getWindForce();
    const windAngle = windForce * (Math.PI / 6);
    const absWind = Math.abs(windForce);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];

      for (let t = TRAIL_COUNT - 1; t > 0; t--) {
        p.trailPositions[t].copy(p.trailPositions[t - 1]);
      }
      p.trailPositions[0].copy(p.position);

      const speed = p.baseSpeed * (1 + absWind * 0.15);
      this.tempDir.set(
        Math.sin(windAngle) * speed * 0.6,
        -speed,
        Math.sin(p.phase) * 1.5
      );

      p.position.x += this.tempDir.x * deltaTime;
      p.position.y += this.tempDir.y * deltaTime;
      p.position.z += this.tempDir.z * deltaTime;

      if (p.position.y < RESET_Y) {
        this.resetParticle(p, false);
      }

      if (p.position.x < BOUNDS_X_MIN - 80) p.position.x = BOUNDS_X_MAX + 60;
      if (p.position.x > BOUNDS_X_MAX + 80) p.position.x = BOUNDS_X_MIN - 60;
      if (p.position.z < BOUNDS_Z_MIN - 80) p.position.z = BOUNDS_Z_MAX + 60;
      if (p.position.z > BOUNDS_Z_MAX + 80) p.position.z = BOUNDS_Z_MIN - 60;

      this.applyInstance(i, windAngle, absWind);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private applyInstance(idx: number, windAngle: number, absWind: number): void {
    const p = this.particles[idx];
    const instancesPerParticle = 1 + TRAIL_COUNT;
    const baseIdx = idx * instancesPerParticle;

    this.targetDir.set(
      Math.sin(windAngle) * 0.55,
      -1.0,
      Math.sin(p.phase) * 0.04
    ).normalize();

    const worldLen = p.lengthPx * WORLD_LENGTH_SCALE;
    const worldRad = p.widthPx * WORLD_RADIUS_SCALE;

    this.placeCone(baseIdx, p.position, this.targetDir, worldLen, worldRad);

    const lerpedR = COLOR_LIGHT_BLUE_BASE.r * (1 - p.colorMix) + COLOR_WHITE_BASE.r * p.colorMix;
    const lerpedG = COLOR_LIGHT_BLUE_BASE.g * (1 - p.colorMix) + COLOR_WHITE_BASE.g * p.colorMix;
    const lerpedB = COLOR_LIGHT_BLUE_BASE.b * (1 - p.colorMix) + COLOR_WHITE_BASE.b * p.colorMix;

    const windR = lerpedR * (1 - absWind * 0.75) + COLOR_SATURATED_BASE.r * absWind * 0.75;
    const windG = lerpedG * (1 - absWind * 0.75) + COLOR_SATURATED_BASE.g * absWind * 0.75;
    const windB = lerpedB * (1 - absWind * 0.75) + COLOR_SATURATED_BASE.b * absWind * 0.75;

    this.tempColor.setRGB(windR, windG, windB);
    this.instancedMesh.setColorAt(baseIdx, this.tempColor);

    for (let t = 0; t < TRAIL_COUNT; t++) {
      const tIdx = baseIdx + 1 + t;
      const trailFade = 1 - (t + 1) / (TRAIL_COUNT + 1);
      const trailLen = worldLen * trailFade;
      const trailRad = worldRad * (0.85 * trailFade + 0.15);

      this.placeCone(tIdx, p.trailPositions[t], this.targetDir, trailLen, trailRad);

      const colFade = 0.35 + trailFade * 0.65;
      const tColor = new THREE.Color(
        Math.min(1, this.tempColor.r * colFade),
        Math.min(1, this.tempColor.g * colFade),
        Math.min(1, this.tempColor.b * colFade)
      );
      this.instancedMesh.setColorAt(tIdx, tColor);
    }
  }

  private placeCone(
    instanceIdx: number,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    radius: number
  ): void {
    this.dummyObject.position.copy(position);

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = direction.clone().normalize();
    const dot = up.dot(dirNorm);

    if (Math.abs(dot - (-1)) < 0.0001) {
      this.dummyObject.quaternion.set(1, 0, 0, 0);
    } else if (Math.abs(dot - 1) < 0.0001) {
      this.dummyObject.quaternion.set(0, 0, 1, 0);
    } else {
      const axis = new THREE.Vector3().crossVectors(up, dirNorm).normalize();
      const angle = Math.acos(dot);
      this.dummyObject.quaternion.setFromAxisAngle(axis, angle);
    }

    this.dummyObject.scale.set(radius, length, radius);
    this.dummyObject.updateMatrix();
    this.instancedMesh.setMatrixAt(instanceIdx, this.dummyObject.matrix);
  }

  dispose(): void {
    this.scene.remove(this.instancedMesh);
    this.baseGeometry.dispose();
    this.material.dispose();
  }
}
