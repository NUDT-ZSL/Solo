import * as THREE from 'three';

export interface ChimeTriggerResult {
  chimeIndex: number;
  intensity: number;
}

const PARTICLE_COUNT = 3000;
const CANYON_HALF_WIDTH = 7;
const CANYON_DEPTH = 35;
const CANYON_HEIGHT_MIN = 0;
const CANYON_HEIGHT_MAX = 12;

const vertexShader = `
  attribute float aOpacity;
  attribute float aSize;
  varying float vOpacity;

  void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vOpacity;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, dist) * vOpacity;
    gl_FragColor = vec4(0.86, 0.89, 0.93, alpha);
  }
`;

function pseudoNoise(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.543) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);

  const n000 = pseudoNoise(ix, iy, iz);
  const n100 = pseudoNoise(ix + 1, iy, iz);
  const n010 = pseudoNoise(ix, iy + 1, iz);
  const n110 = pseudoNoise(ix + 1, iy + 1, iz);
  const n001 = pseudoNoise(ix, iy, iz + 1);
  const n101 = pseudoNoise(ix + 1, iy, iz + 1);
  const n011 = pseudoNoise(ix, iy + 1, iz + 1);
  const n111 = pseudoNoise(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * sx;
  const nx10 = n010 + (n110 - n010) * sx;
  const nx01 = n001 + (n101 - n001) * sx;
  const nx11 = n011 + (n111 - n011) * sx;

  const nxy0 = nx00 + (nx10 - nx00) * sy;
  const nxy1 = nx01 + (nx11 - nx01) * sy;

  return nxy0 + (nxy1 - nxy0) * sz;
}

export class CloudSystem {
  mesh: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;

  private positions: Float32Array;
  private velocities: Float32Array;
  private opacities: Float32Array;
  private sizes: Float32Array;
  private lives: Float32Array;
  private maxLives: Float32Array;
  private count: number;

  flowSpeed: number = 1.0;

  constructor(scene: THREE.Scene, count: number = PARTICLE_COUNT) {
    this.count = count;

    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.opacities = new Float32Array(count);
    this.sizes = new Float32Array(count);
    this.lives = new Float32Array(count);
    this.maxLives = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.initParticle(i);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    scene.add(this.mesh);
  }

  private initParticle(i: number): void {
    this.positions[i * 3] = (Math.random() - 0.5) * CANYON_HALF_WIDTH * 2;
    this.positions[i * 3 + 1] = CANYON_HEIGHT_MIN + Math.random() * (CANYON_HEIGHT_MAX - CANYON_HEIGHT_MIN);
    this.positions[i * 3 + 2] = (Math.random() - 0.5) * CANYON_DEPTH * 2;

    this.velocities[i * 3] = (Math.random() - 0.5) * 0.3;
    this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    this.opacities[i] = 0.05 + Math.random() * 0.25;
    this.sizes[i] = 3 + Math.random() * 5;
    this.maxLives[i] = 8 + Math.random() * 12;
    this.lives[i] = Math.random() * this.maxLives[i];
  }

  private respawnParticle(i: number): void {
    this.positions[i * 3] = (Math.random() - 0.5) * CANYON_HALF_WIDTH * 2;
    this.positions[i * 3 + 1] = CANYON_HEIGHT_MIN + Math.random() * (CANYON_HEIGHT_MAX - CANYON_HEIGHT_MIN);
    this.positions[i * 3 + 2] = (Math.random() - 0.5) * CANYON_DEPTH * 2;

    this.velocities[i * 3] = (Math.random() - 0.5) * 0.3;
    this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    this.opacities[i] = 0.05 + Math.random() * 0.25;
    this.sizes[i] = 3 + Math.random() * 5;
    this.maxLives[i] = 8 + Math.random() * 12;
    this.lives[i] = 0;
  }

  private getFlowField(x: number, y: number, z: number, time: number): [number, number, number] {
    const scale = 0.08;
    const n1 = smoothNoise(x * scale, y * scale, time * 0.15);
    const n2 = smoothNoise(y * scale + 31.7, z * scale + 47.3, time * 0.12);
    const n3 = smoothNoise(z * scale + 73.1, x * scale + 59.9, time * 0.1);

    let vx = (n1 - 0.5) * 2.0 + Math.sin(y * 0.15 + time * 0.2) * 0.5;
    let vy = (n2 - 0.5) * 0.6 + Math.cos(x * 0.1 + time * 0.15) * 0.2;
    let vz = (n3 - 0.5) * 2.0 + Math.sin(x * 0.12 + time * 0.18) * 0.5;

    const distFromCenter = Math.abs(x);
    if (distFromCenter > CANYON_HALF_WIDTH * 0.6) {
      const pushBack = (distFromCenter - CANYON_HALF_WIDTH * 0.6) / (CANYON_HALF_WIDTH * 0.4);
      vx -= Math.sign(x) * pushBack * 1.5;
    }

    if (y > CANYON_HEIGHT_MAX * 0.8) {
      vy -= (y - CANYON_HEIGHT_MAX * 0.8) * 0.3;
    }
    if (y < CANYON_HEIGHT_MIN + 0.5) {
      vy += 0.3;
    }

    return [vx, vy, vz];
  }

  update(delta: number, chimePositions: THREE.Vector3[], sensitivity: number): ChimeTriggerResult[] {
    const time = performance.now() * 0.001;
    const speed = this.flowSpeed;
    const triggers: ChimeTriggerResult[] = [];
    const chimeThreshold = 3.5 * sensitivity;
    const chimeHitCounts: number[] = new Array(chimePositions.length).fill(0);

    for (let i = 0; i < this.count; i++) {
      this.lives[i] += delta;
      if (this.lives[i] >= this.maxLives[i]) {
        this.respawnParticle(i);
        continue;
      }

      const px = this.positions[i * 3];
      const py = this.positions[i * 3 + 1];
      const pz = this.positions[i * 3 + 2];

      const [fx, fy, fz] = this.getFlowField(px, py, pz, time);

      this.velocities[i * 3] += fx * delta * speed * 0.8;
      this.velocities[i * 3 + 1] += fy * delta * speed * 0.8;
      this.velocities[i * 3 + 2] += fz * delta * speed * 0.8;

      this.velocities[i * 3] *= 0.97;
      this.velocities[i * 3 + 1] *= 0.97;
      this.velocities[i * 3 + 2] *= 0.97;

      this.positions[i * 3] += this.velocities[i * 3] * delta * speed;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * delta * speed;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * delta * speed;

      const lifeRatio = this.lives[i] / this.maxLives[i];
      let fadeAlpha = 1.0;
      if (lifeRatio < 0.1) fadeAlpha = lifeRatio / 0.1;
      else if (lifeRatio > 0.8) fadeAlpha = (1.0 - lifeRatio) / 0.2;
      this.opacities[i] = (0.05 + Math.random() * 0.02) * fadeAlpha * (0.5 + smoothNoise(px * 0.1, py * 0.1, time * 0.3) * 0.5);

      for (let c = 0; c < chimePositions.length; c++) {
        const dx = px - chimePositions[c].x;
        const dy = py - chimePositions[c].y;
        const dz = pz - chimePositions[c].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < chimeThreshold) {
          chimeHitCounts[c]++;
        }
      }
    }

    for (let c = 0; c < chimePositions.length; c++) {
      if (chimeHitCounts[c] > 5) {
        triggers.push({
          chimeIndex: c,
          intensity: Math.min(chimeHitCounts[c] / 30, 1.0),
        });
      }
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const opAttr = this.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
    opAttr.needsUpdate = true;

    return triggers;
  }

  applyResonance(position: THREE.Vector3, strength: number): void {
    const radius = 12 * strength;
    const force = 8 * strength;

    for (let i = 0; i < this.count; i++) {
      const dx = this.positions[i * 3] - position.x;
      const dy = this.positions[i * 3 + 1] - position.y;
      const dz = this.positions[i * 3 + 2] - position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < radius && dist > 0.01) {
        const factor = (1 - dist / radius) * force;
        this.velocities[i * 3] += (dx / dist) * factor;
        this.velocities[i * 3 + 1] += (dy / dist) * factor * 0.5;
        this.velocities[i * 3 + 2] += (dz / dist) * factor;
      }
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
