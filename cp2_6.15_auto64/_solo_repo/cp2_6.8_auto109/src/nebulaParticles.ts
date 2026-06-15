import * as THREE from 'three';
import { perlinNoise3D } from './perlinNoise';

export type NebulaType = 'spiral' | 'ring' | 'chaos';

const COLOR_GRADIENT: [number, number, number][] = [
  [0x0a / 255, 0x0a / 255, 0x2e / 255],
  [0x9c / 255, 0x27 / 255, 0xb0 / 255],
  [0xff / 255, 0x6f / 255, 0x91 / 255]
];
const GRADIENT_STEPS = 256;
const gradientLUT = new Float32Array(GRADIENT_STEPS * 3);
(function buildGradientLUT() {
  for (let i = 0; i < GRADIENT_STEPS; i++) {
    const t = i / (GRADIENT_STEPS - 1);
    const seg = t * (COLOR_GRADIENT.length - 1);
    const idx = Math.floor(seg);
    const f = seg - idx;
    const c0 = COLOR_GRADIENT[Math.min(idx, COLOR_GRADIENT.length - 1)];
    const c1 = COLOR_GRADIENT[Math.min(idx + 1, COLOR_GRADIENT.length - 1)];
    gradientLUT[i * 3] = c0[0] + (c1[0] - c0[0]) * f;
    gradientLUT[i * 3 + 1] = c0[1] + (c1[1] - c0[1]) * f;
    gradientLUT[i * 3 + 2] = c0[2] + (c1[2] - c0[2]) * f;
  }
})();

function sampleGradient(distance: number, minDist: number, maxDist: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (distance - minDist) / (maxDist - minDist)));
  const idx = Math.floor(t * (GRADIENT_STEPS - 1));
  return [gradientLUT[idx * 3], gradientLUT[idx * 3 + 1], gradientLUT[idx * 3 + 2]];
}

const SPIRAL_COLORS = [
  new THREE.Color('#FF6B9C'),
  new THREE.Color('#1A237E')
];
const RING_COLORS = [
  new THREE.Color('#FFD54F'),
  new THREE.Color('#CE93D8')
];
const CHAOS_COLORS = [
  new THREE.Color('#00E676'),
  new THREE.Color('#FF4081')
];

export class NebulaParticles {
  public points: THREE.Points;
  public currentType: NebulaType = 'spiral';
  private particleCount = 8000;
  private positions: Float32Array;
  private targetPositions: Float32Array;
  private initialPositions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;
  private twinklePhases: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private scene: THREE.Scene;
  private time = 0;
  private isFading = false;
  private isBursting = false;
  private fadeProgress = 0;
  private burstProgress = 0;
  private opacity = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(this.particleCount * 3);
    this.targetPositions = new Float32Array(this.particleCount * 3);
    this.initialPositions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.baseSizes = new Float32Array(this.particleCount);
    this.twinklePhases = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.baseSizes[i] = 0.8 + Math.random() * 1.4;
      this.twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public generate(type: NebulaType): void {
    this.currentType = type;
    if (type === 'spiral') this.generateSpiral();
    else if (type === 'ring') this.generateRing();
    else this.generateChaos();

    this.targetPositions.set(this.initialPositions);
    this.positions.set(this.initialPositions);
    this.geometry.attributes.position.needsUpdate = true;
  }

  private generateSpiral(): void {
    const arms = 4;
    const particlesPerArm = Math.floor(this.particleCount / arms);
    const colorSpiral = SPIRAL_COLORS[0];
    const colorEdge = SPIRAL_COLORS[1];

    for (let arm = 0; arm < arms; arm++) {
      const armOffset = (arm / arms) * Math.PI * 2;
      for (let i = 0; i < particlesPerArm; i++) {
        const idx = arm * particlesPerArm + i;
        const t = i / particlesPerArm;
        const radius = t * 3.5;
        const angle = armOffset + t * Math.PI * 4 + (Math.random() - 0.5) * 0.3;
        const densityFalloff = 1 - t * 0.7;
        const scatter = (1 - densityFalloff) * 0.8 + 0.1;

        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * scatter;
        const y = (Math.random() - 0.5) * 0.4 * densityFalloff;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * scatter;

        this.initialPositions[idx * 3] = x;
        this.initialPositions[idx * 3 + 1] = y;
        this.initialPositions[idx * 3 + 2] = z;

        const colorT = t;
        this.colors[idx * 3] = colorSpiral.r + (colorEdge.r - colorSpiral.r) * colorT;
        this.colors[idx * 3 + 1] = colorSpiral.g + (colorEdge.g - colorSpiral.g) * colorT;
        this.colors[idx * 3 + 2] = colorSpiral.b + (colorEdge.b - colorSpiral.b) * colorT;
      }
    }

    const remaining = this.particleCount - arms * particlesPerArm;
    for (let i = 0; i < remaining; i++) {
      const idx = arms * particlesPerArm + i;
      const r = Math.random() * 0.5;
      const a = Math.random() * Math.PI * 2;
      this.initialPositions[idx * 3] = Math.cos(a) * r;
      this.initialPositions[idx * 3 + 1] = (Math.random() - 0.5) * 0.2;
      this.initialPositions[idx * 3 + 2] = Math.sin(a) * r;
      this.colors[idx * 3] = colorSpiral.r;
      this.colors[idx * 3 + 1] = colorSpiral.g;
      this.colors[idx * 3 + 2] = colorSpiral.b;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  private generateRing(): void {
    const innerColor = RING_COLORS[0];
    const outerColor = RING_COLORS[1];
    const innerRadius = 1.5;
    const outerRadius = 3.0;

    for (let i = 0; i < this.particleCount; i++) {
      const t = Math.pow(Math.random(), 0.5);
      const radius = innerRadius + (outerRadius - innerRadius) * t;
      const angle = Math.random() * Math.PI * 2;
      const wave = Math.sin(angle * 3 + Math.random() * Math.PI) * 0.3;

      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.15;
      const y = wave + (Math.random() - 0.5) * 0.15;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.15;

      this.initialPositions[i * 3] = x;
      this.initialPositions[i * 3 + 1] = y;
      this.initialPositions[i * 3 + 2] = z;

      this.colors[i * 3] = innerColor.r + (outerColor.r - innerColor.r) * t;
      this.colors[i * 3 + 1] = innerColor.g + (outerColor.g - innerColor.g) * t;
      this.colors[i * 3 + 2] = innerColor.b + (outerColor.b - innerColor.b) * t;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  private generateChaos(): void {
    const colorA = CHAOS_COLORS[0];
    const colorB = CHAOS_COLORS[1];

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1 / 3) * 3;

      this.initialPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.initialPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.initialPositions[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      this.colors[i * 3] = colorA.r + (colorB.r - colorA.r) * t;
      this.colors[i * 3 + 1] = colorA.g + (colorB.g - colorA.g) * t;
      this.colors[i * 3 + 2] = colorA.b + (colorB.b - colorA.b) * t;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  public update(delta: number, camera: THREE.Camera, speedMultiplier: number): void {
    this.time += delta * speedMultiplier;
    const rotPeriod = this.currentType === 'spiral' ? 12 : this.currentType === 'ring' ? 20 : 8;
    const omega = (Math.PI * 2) / rotPeriod * speedMultiplier;

    for (let i = 0; i < this.particleCount; i++) {
      let x = this.initialPositions[i * 3];
      let y = this.initialPositions[i * 3 + 1];
      let z = this.initialPositions[i * 3 + 2];

      if (this.currentType === 'chaos') {
        const nx = perlinNoise3D(x * 0.5 + this.time * 0.1, y * 0.5, z * 0.5) * 0.2;
        const ny = perlinNoise3D(x * 0.5, y * 0.5 + this.time * 0.1, z * 0.5) * 0.2;
        const nz = perlinNoise3D(x * 0.5, y * 0.5, z * 0.5 + this.time * 0.1) * 0.2;
        x += nx;
        y += ny;
        z += nz;
      }

      const cosA = Math.cos(omega * delta);
      const sinA = Math.sin(omega * delta);
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;

      const pulse = 1 + Math.sin(this.time * 1.5 + i * 0.01) * 0.03;

      this.targetPositions[i * 3] = rx * pulse;
      this.targetPositions[i * 3 + 1] = y * pulse;
      this.targetPositions[i * 3 + 2] = rz * pulse;

      this.positions[i * 3] += (this.targetPositions[i * 3] - this.positions[i * 3]) * 0.1;
      this.positions[i * 3 + 1] += (this.targetPositions[i * 3 + 1] - this.positions[i * 3 + 1]) * 0.1;
      this.positions[i * 3 + 2] += (this.targetPositions[i * 3 + 2] - this.positions[i * 3 + 2]) * 0.1;

      this.twinklePhases[i] += delta * 2;
      const twinkle = 1 + Math.sin(this.twinklePhases[i]) * 0.02;
      let size = this.baseSizes[i] * twinkle;

      const camPos = camera.position;
      const dx = this.positions[i * 3] - camPos.x;
      const dy = this.positions[i * 3 + 1] - camPos.y;
      const dz = this.positions[i * 3 + 2] - camPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      size *= Math.max(0.3, Math.min(3.0, 5.0 / Math.max(dist, 0.5)));

      this.sizes[i] = size;

      const [gr, gg, gb] = sampleGradient(dist, 1, 10);
      const baseR = this.colors[i * 3];
      const baseG = this.colors[i * 3 + 1];
      const baseB = this.colors[i * 3 + 2];
      this.geometry.attributes.color.array[i * 3] = baseR * 0.6 + gr * 0.4;
      this.geometry.attributes.color.array[i * 3 + 1] = baseG * 0.6 + gg * 0.4;
      this.geometry.attributes.color.array[i * 3 + 2] = baseB * 0.6 + gb * 0.4;
    }

    if (this.isBursting) {
      this.burstProgress += delta / 1.2;
      const t = Math.min(1, this.burstProgress);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const sizePulse = t < 0.5 ? 0.5 + t * 2 : 1.5 - (t - 0.5) * 1;
      for (let i = 0; i < this.particleCount * 3; i++) {
        this.positions[i] = this.targetPositions[i] * ease;
      }
      this.material.size = sizePulse;
      this.material.opacity = Math.min(1, t * 1.5);
      if (t >= 1) {
        this.isBursting = false;
        this.material.size = 1;
        this.material.opacity = 1;
      }
    } else if (this.isFading) {
      this.fadeProgress += delta / 1.5;
      this.material.opacity = Math.max(0, 1 - this.fadeProgress);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public async fadeOut(duration: number = 1.5): Promise<void> {
    return new Promise((resolve) => {
      this.isFading = true;
      this.fadeProgress = 0;
      const start = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        this.material.opacity = Math.max(0, 1 - elapsed / duration);
        if (elapsed < duration) {
          requestAnimationFrame(tick);
        } else {
          this.isFading = false;
          this.material.opacity = 0;
          resolve();
        }
      };
      tick();
    });
  }

  public async burstIn(duration: number = 1.2): Promise<void> {
    return new Promise((resolve) => {
      this.isBursting = true;
      this.burstProgress = 0;
      this.material.opacity = 0;
      this.material.size = 0.5;
      for (let i = 0; i < this.particleCount * 3; i++) {
        this.positions[i] = 0;
      }
      this.geometry.attributes.position.needsUpdate = true;
      const start = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        const t = Math.min(1, elapsed / duration);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const sizePulse = t < 0.5 ? 0.5 + t * 2 : 1.5 - (t - 0.5) * 1;
        for (let i = 0; i < this.particleCount * 3; i++) {
          this.positions[i] = this.targetPositions[i] * ease;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.material.size = sizePulse;
        this.material.opacity = Math.min(1, t * 1.5);
        if (t >= 1) {
          this.isBursting = false;
          this.material.size = 1;
          this.material.opacity = 1;
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };
      tick();
    });
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
