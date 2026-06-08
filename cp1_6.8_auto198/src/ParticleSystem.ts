import * as THREE from 'three';

const FLOW_COUNT = 800;
const BURST_CAPACITY = 400;
const TOTAL_CAPACITY = FLOW_COUNT + BURST_CAPACITY;
const TRAIL_LENGTH = 3;

const particleVertexShader = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (250.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const particleFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.8);
  gl_FragColor = vec4(vColor, vAlpha * glow);
}
`;

function hashNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3.0 - 2.0 * fx);
  const sy = fy * fy * (3.0 - 2.0 * fy);
  const n00 = hashNoise(ix, iy);
  const n10 = hashNoise(ix + 1, iy);
  const n01 = hashNoise(ix, iy + 1);
  const n11 = hashNoise(ix + 1, iy + 1);
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function fbmNoise(x: number, y: number): number {
  let val = 0;
  let amp = 1;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

interface BurstParticle {
  index: number;
  lifetime: number;
  age: number;
  spiralPhase: number;
}

export class ParticleSystem {
  points: THREE.Points;
  trailPoints: THREE.Points;
  private material: THREE.ShaderMaterial;
  private trailMaterial: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private trailGeometry: THREE.BufferGeometry;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;

  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailSizes: Float32Array;
  private trailAlphas: Float32Array;

  private positionBuffer: THREE.BufferAttribute;
  private colorBuffer: THREE.BufferAttribute;
  private sizeBuffer: THREE.BufferAttribute;
  private alphaBuffer: THREE.BufferAttribute;

  private trailPositionBuffer: THREE.BufferAttribute;
  private trailColorBuffer: THREE.BufferAttribute;
  private trailSizeBuffer: THREE.BufferAttribute;
  private trailAlphaBuffer: THREE.BufferAttribute;

  private activeBursts: BurstParticle[] = [];
  private nextBurstSlot: number = FLOW_COUNT;
  private tideSpeed: number = 1.0;
  private density: number = 1.0;
  private currentFlowCount: number = FLOW_COUNT;

  private trailRingBuffer: Float32Array[] = [];
  private trailRingColors: Float32Array[] = [];
  private trailRingIndex: number = 0;
  private frameCount: number = 0;

  constructor() {
    this.positions = new Float32Array(TOTAL_CAPACITY * 3);
    this.velocities = new Float32Array(TOTAL_CAPACITY * 3);
    this.colors = new Float32Array(TOTAL_CAPACITY * 3);
    this.sizes = new Float32Array(TOTAL_CAPACITY);
    this.alphas = new Float32Array(TOTAL_CAPACITY);

    const trailTotal = TOTAL_CAPACITY * TRAIL_LENGTH;
    this.trailPositions = new Float32Array(trailTotal * 3);
    this.trailColors = new Float32Array(trailTotal * 3);
    this.trailSizes = new Float32Array(trailTotal);
    this.trailAlphas = new Float32Array(trailTotal);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailRingBuffer.push(new Float32Array(TOTAL_CAPACITY * 3));
      this.trailRingColors.push(new Float32Array(TOTAL_CAPACITY * 3));
    }

    this.initFlowParticles();

    this.geometry = new THREE.BufferGeometry();
    this.positionBuffer = new THREE.BufferAttribute(this.positions, 3);
    this.positionBuffer.setUsage(THREE.DynamicDrawUsage);
    this.colorBuffer = new THREE.BufferAttribute(this.colors, 3);
    this.colorBuffer.setUsage(THREE.DynamicDrawUsage);
    this.sizeBuffer = new THREE.BufferAttribute(this.sizes, 1);
    this.sizeBuffer.setUsage(THREE.DynamicDrawUsage);
    this.alphaBuffer = new THREE.BufferAttribute(this.alphas, 1);
    this.alphaBuffer.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.positionBuffer);
    this.geometry.setAttribute('aColor', this.colorBuffer);
    this.geometry.setAttribute('aSize', this.sizeBuffer);
    this.geometry.setAttribute('aAlpha', this.alphaBuffer);
    this.geometry.setDrawRange(0, this.currentFlowCount);

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositionBuffer = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailPositionBuffer.setUsage(THREE.DynamicDrawUsage);
    this.trailColorBuffer = new THREE.BufferAttribute(this.trailColors, 3);
    this.trailColorBuffer.setUsage(THREE.DynamicDrawUsage);
    this.trailSizeBuffer = new THREE.BufferAttribute(this.trailSizes, 1);
    this.trailSizeBuffer.setUsage(THREE.DynamicDrawUsage);
    this.trailAlphaBuffer = new THREE.BufferAttribute(this.trailAlphas, 1);
    this.trailAlphaBuffer.setUsage(THREE.DynamicDrawUsage);

    this.trailGeometry.setAttribute('position', this.trailPositionBuffer);
    this.trailGeometry.setAttribute('aColor', this.trailColorBuffer);
    this.trailGeometry.setAttribute('aSize', this.trailSizeBuffer);
    this.trailGeometry.setAttribute('aAlpha', this.trailAlphaBuffer);
    this.trailGeometry.setDrawRange(0, this.currentFlowCount * TRAIL_LENGTH);

    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trailPoints.frustumCulled = false;
  }

  private initFlowParticles(): void {
    for (let i = 0; i < TOTAL_CAPACITY; i++) {
      const i3 = i * 3;
      if (i < FLOW_COUNT) {
        this.positions[i3] = (Math.random() - 0.5) * 180;
        this.positions[i3 + 1] = Math.random() * 6 + 1;
        this.positions[i3 + 2] = (Math.random() - 0.5) * 180;

        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;

        const colorChoice = Math.random();
        if (colorChoice < 0.4) {
          this.colors[i3] = 0.3 + Math.random() * 0.2;
          this.colors[i3 + 1] = 0.4 + Math.random() * 0.2;
          this.colors[i3 + 2] = 0.8 + Math.random() * 0.2;
        } else if (colorChoice < 0.7) {
          this.colors[i3] = 0.5 + Math.random() * 0.3;
          this.colors[i3 + 1] = 0.3 + Math.random() * 0.2;
          this.colors[i3 + 2] = 0.9 + Math.random() * 0.1;
        } else {
          this.colors[i3] = 0.7 + Math.random() * 0.3;
          this.colors[i3 + 1] = 0.7 + Math.random() * 0.3;
          this.colors[i3 + 2] = 1.0;
        }

        this.sizes[i] = 1.5 + Math.random() * 2.5;
        this.alphas[i] = 0.4 + Math.random() * 0.4;
      } else {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
      }
    }
  }

  triggerBurst(position: THREE.Vector3): void {
    const count = 30 + Math.floor(Math.random() * 20);
    for (let n = 0; n < count; n++) {
      const idx = this.nextBurstSlot;
      this.nextBurstSlot = (this.nextBurstSlot - FLOW_COUNT + 1) % BURST_CAPACITY + FLOW_COUNT;

      const i3 = idx * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;

      this.positions[i3] = position.x + Math.cos(angle) * radius;
      this.positions[i3 + 1] = position.y + Math.random() * 1.5;
      this.positions[i3 + 2] = position.z + Math.sin(angle) * radius;

      const spiralPhase = Math.random() * Math.PI * 2;
      const outSpeed = 3 + Math.random() * 5;
      const tanSpeed = 2 + Math.random() * 3;
      this.velocities[i3] = Math.cos(spiralPhase) * outSpeed;
      this.velocities[i3 + 1] = 1 + Math.random() * 2;
      this.velocities[i3 + 2] = Math.sin(spiralPhase) * outSpeed;

      const burstColorChoice = Math.random();
      if (burstColorChoice < 0.3) {
        this.colors[i3] = 0.8;
        this.colors[i3 + 1] = 0.85;
        this.colors[i3 + 2] = 1.0;
      } else if (burstColorChoice < 0.6) {
        this.colors[i3] = 0.6;
        this.colors[i3 + 1] = 0.4;
        this.colors[i3 + 2] = 1.0;
      } else {
        this.colors[i3] = 1.0;
        this.colors[i3 + 1] = 0.8;
        this.colors[i3 + 2] = 0.9;
      }

      this.sizes[idx] = 2 + Math.random() * 3;
      this.alphas[idx] = 0.8 + Math.random() * 0.2;

      this.activeBursts.push({
        index: idx,
        lifetime: 2.0 + Math.random() * 1.5,
        age: 0,
        spiralPhase,
      });
    }
  }

  setTideSpeed(speed: number): void {
    this.tideSpeed = speed;
  }

  setDensity(density: number): void {
    this.density = density;
    this.currentFlowCount = Math.floor(FLOW_COUNT * density);
    this.geometry.setDrawRange(0, this.currentFlowCount + this.activeBursts.length);
    this.trailGeometry.setDrawRange(0, (this.currentFlowCount + this.activeBursts.length) * TRAIL_LENGTH);

    for (let i = 0; i < FLOW_COUNT; i++) {
      this.alphas[i] = i < this.currentFlowCount ? (0.4 + Math.random() * 0.4) : 0;
    }
  }

  update(time: number, delta: number): void {
    const clampedDelta = Math.min(delta, 0.05);
    const flowSpeed = this.tideSpeed * 2.0;

    for (let i = 0; i < this.currentFlowCount; i++) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const pz = this.positions[i3 + 2];

      const nx = fbmNoise(px * 0.02 + time * 0.1, pz * 0.02) * 2.0 - 1.0;
      const nz = fbmNoise(px * 0.02, pz * 0.02 + time * 0.1) * 2.0 - 1.0;

      this.velocities[i3] += nx * flowSpeed * clampedDelta;
      this.velocities[i3 + 2] += nz * flowSpeed * clampedDelta;
      this.velocities[i3 + 1] += (Math.sin(time * 0.5 + i) * 0.3) * clampedDelta;

      this.velocities[i3] *= 0.98;
      this.velocities[i3 + 1] *= 0.95;
      this.velocities[i3 + 2] *= 0.98;

      this.positions[i3] += this.velocities[i3] * clampedDelta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * clampedDelta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * clampedDelta;

      if (this.positions[i3 + 1] < 0.5) {
        this.positions[i3 + 1] = 0.5;
        this.velocities[i3 + 1] = Math.abs(this.velocities[i3 + 1]) * 0.5;
      }
      if (this.positions[i3 + 1] > 12) {
        this.positions[i3 + 1] = 12;
        this.velocities[i3 + 1] *= -0.3;
      }

      const bound = 95;
      if (this.positions[i3] > bound) this.positions[i3] = -bound;
      if (this.positions[i3] < -bound) this.positions[i3] = bound;
      if (this.positions[i3 + 2] > bound) this.positions[i3 + 2] = -bound;
      if (this.positions[i3 + 2] < -bound) this.positions[i3 + 2] = bound;
    }

    const deadBursts: number[] = [];
    for (let b = 0; b < this.activeBursts.length; b++) {
      const burst = this.activeBursts[b];
      burst.age += clampedDelta;
      const i3 = burst.index * 3;
      const progress = burst.age / burst.lifetime;

      if (progress >= 1.0) {
        this.alphas[burst.index] = 0;
        this.sizes[burst.index] = 0;
        deadBursts.push(b);
        continue;
      }

      const spiralAngle = burst.spiralPhase + burst.age * 3.0;
      const outSpeed = (1.0 - progress) * 4.0;
      this.velocities[i3] += Math.cos(spiralAngle) * outSpeed * clampedDelta;
      this.velocities[i3 + 1] -= 2.0 * clampedDelta;
      this.velocities[i3 + 2] += Math.sin(spiralAngle) * outSpeed * clampedDelta;

      this.velocities[i3] *= 0.97;
      this.velocities[i3 + 1] *= 0.96;
      this.velocities[i3 + 2] *= 0.97;

      this.positions[i3] += this.velocities[i3] * clampedDelta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * clampedDelta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * clampedDelta;

      this.alphas[burst.index] = (1.0 - progress) * 0.9;
      this.sizes[burst.index] = (1.0 + progress * 2.0) * 3.0;

      const colorShift = progress;
      this.colors[i3] = this.colors[i3] * (1.0 - colorShift * 0.5) + 0.3 * colorShift;
      this.colors[i3 + 1] = this.colors[i3 + 1] * (1.0 - colorShift * 0.3) + 0.1 * colorShift;
      this.colors[i3 + 2] = this.colors[i3 + 2] * (1.0 - colorShift * 0.2);
    }

    for (let i = deadBursts.length - 1; i >= 0; i--) {
      this.activeBursts.splice(deadBursts[i], 1);
    }

    this.frameCount++;
    if (this.frameCount % 2 === 0) {
      this.updateTrailBuffer();
    }

    this.positionBuffer.needsUpdate = true;
    this.colorBuffer.needsUpdate = true;
    this.sizeBuffer.needsUpdate = true;
    this.alphaBuffer.needsUpdate = true;

    this.geometry.setDrawRange(0, this.currentFlowCount + this.activeBursts.length);
    this.trailGeometry.setDrawRange(0, (this.currentFlowCount + this.activeBursts.length) * TRAIL_LENGTH);
  }

  private updateTrailBuffer(): void {
    const currentRing = this.trailRingIndex;
    const nextRing = (this.trailRingIndex + 1) % TRAIL_LENGTH;

    const currentData = this.trailRingBuffer[nextRing];
    const activeCount = this.currentFlowCount + this.activeBursts.length;
    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      currentData[i3] = this.positions[i3];
      currentData[i3 + 1] = this.positions[i3 + 1];
      currentData[i3 + 2] = this.positions[i3 + 2];
    }

    this.trailRingIndex = nextRing;

    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const ringIdx = (currentRing - t + TRAIL_LENGTH) % TRAIL_LENGTH;
      const ringData = this.trailRingBuffer[ringIdx];
      const alphaFade = 0.35 / (t + 1);
      const sizeFade = 0.7 / (t + 1);

      for (let i = 0; i < activeCount; i++) {
        const srcI3 = i * 3;
        const dstI3 = (i * TRAIL_LENGTH + t) * 3;

        this.trailPositions[dstI3] = ringData[srcI3];
        this.trailPositions[dstI3 + 1] = ringData[srcI3 + 1];
        this.trailPositions[dstI3 + 2] = ringData[srcI3 + 2];

        this.trailColors[dstI3] = this.colors[srcI3];
        this.trailColors[dstI3 + 1] = this.colors[srcI3 + 1];
        this.trailColors[dstI3 + 2] = this.colors[srcI3 + 2];

        this.trailSizes[i * TRAIL_LENGTH + t] = this.sizes[i] * sizeFade;
        this.trailAlphas[i * TRAIL_LENGTH + t] = this.alphas[i] * alphaFade;
      }
    }

    this.trailPositionBuffer.needsUpdate = true;
    this.trailColorBuffer.needsUpdate = true;
    this.trailSizeBuffer.needsUpdate = true;
    this.trailAlphaBuffer.needsUpdate = true;
  }
}
