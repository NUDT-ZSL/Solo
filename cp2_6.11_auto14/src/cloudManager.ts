import * as THREE from 'three';
import { PerlinNoise } from './perlinNoise';

const PARTICLE_COUNT = 1000;
const CLOUD_SPREAD = 80;
const CLOUD_HEIGHT = 20;

interface HaloPulse {
  sprite: THREE.Sprite;
  startTime: number;
  duration: number;
}

export class CloudManager {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private basePositions: Float32Array;
  private sizes: Float32Array;
  private colors: Float32Array;
  private opacities: Float32Array;
  private perlin: PerlinNoise;
  private halos: HaloPulse[] = [];

  private windSpeed: number = 0;
  private humidity: number = 50;
  private temperature: number = 15;

  private transitionFrom: Float32Array | null = null;
  private transitionTo: Float32Array | null = null;
  private transitionProgress: number = 1;
  private transitionDuration: number = 3;

  private camera: THREE.Camera;
  private scene: THREE.Scene;

  private static readonly vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float customOpacity;
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vColor = customColor;
      vOpacity = customOpacity;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (280.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private static readonly fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      float core = smoothstep(0.5, 0.15, r);
      float glow = smoothstep(0.5, 0.3, r) * 0.4;
      float alpha = (core + glow) * vOpacity;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.perlin = new PerlinNoise(42);

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.opacities = new Float32Array(PARTICLE_COUNT);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('customOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: CloudManager.vertexShader,
      fragmentShader: CloudManager.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.applyParameters();
  }

  private initParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const cx = this.gaussianRandom() * CLOUD_SPREAD * 0.6;
      const cy = this.gaussianRandom() * CLOUD_HEIGHT * 0.3 + 5;
      const cz = this.gaussianRandom() * CLOUD_SPREAD * 0.6;

      this.basePositions[i3] = cx;
      this.basePositions[i3 + 1] = cy;
      this.basePositions[i3 + 2] = cz;

      this.positions[i3] = cx;
      this.positions[i3 + 1] = cy;
      this.positions[i3 + 2] = cz;

      this.sizes[i] = 10 + Math.random() * 20;
      this.opacities[i] = 0.4 + Math.random() * 0.3;
    }
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  setParameters(windSpeed: number, humidity: number, temperature: number): void {
    this.windSpeed = windSpeed;
    this.humidity = humidity;
    this.temperature = temperature;
    this.applyParameters();
  }

  private applyParameters(): void {
    const humidityFactor = this.humidity / 100;
    const tempNorm = (this.temperature + 10) / 50;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      this.sizes[i] = (10 + Math.random() * 20) * (0.5 + humidityFactor * 1.2);
      this.opacities[i] = 0.25 + humidityFactor * 0.45;

      const warmR = 1.0;
      const warmG = 0.85 + (1 - tempNorm) * 0.15;
      const warmB = 0.7 + (1 - tempNorm) * 0.3;
      const coolR = 0.7 + tempNorm * 0.1;
      const coolG = 0.82 + tempNorm * 0.08;
      const coolB = 1.0;

      const t = tempNorm;
      this.colors[i3] = this.lerp(coolR, warmR, t) * (0.85 + Math.random() * 0.15);
      this.colors[i3 + 1] = this.lerp(coolG, warmG, t) * (0.85 + Math.random() * 0.15);
      this.colors[i3 + 2] = this.lerp(coolB, warmB, t) * (0.85 + Math.random() * 0.15);
    }

    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.customColor.needsUpdate = true;
    this.geometry.attributes.customOpacity.needsUpdate = true;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  update(deltaTime: number, elapsedTime: number): void {
    const time = elapsedTime * 0.15;

    if (this.transitionProgress < 1 && this.transitionFrom && this.transitionTo) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      this.transitionProgress = Math.min(this.transitionProgress, 1);

      const easeT = this.easeInOut(this.transitionProgress);

      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        this.positions[i] = this.transitionFrom[i] + (this.transitionTo[i] - this.transitionFrom[i]) * easeT;
      }

      if (this.transitionProgress >= 1) {
        this.transitionFrom = null;
        this.transitionTo = null;
      }
    } else {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const bx = this.basePositions[i3];
        const by = this.basePositions[i3 + 1];
        const bz = this.basePositions[i3 + 2];

        const noiseScale = 0.015;
        const nx = this.perlin.fbm(bx * noiseScale + time * 0.3, by * noiseScale, bz * noiseScale, 3);
        const ny = this.perlin.fbm(bx * noiseScale, by * noiseScale + time * 0.2, bz * noiseScale + 100, 3);
        const nz = this.perlin.fbm(bx * noiseScale + 200, by * noiseScale, bz * noiseScale + time * 0.3, 3);

        const displacement = 8;
        this.positions[i3] = bx + nx * displacement + this.windSpeed * elapsedTime * 0.5;
        this.positions[i3 + 1] = by + ny * displacement * 0.5;
        this.positions[i3 + 2] = bz + nz * displacement;

        this.basePositions[i3] += this.windSpeed * deltaTime * 0.5;
      }
    }

    const camPos = this.camera.position;
    const cloudCenter = new THREE.Vector3(0, 5, 0);
    const camDist = camPos.distanceTo(cloudCenter);
    const closeFactor = Math.max(0, 1 - camDist / 60);

    if (closeFactor > 0.3) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const currentOpacity = 0.25 + (this.humidity / 100) * 0.45;
        const transparentFactor = (closeFactor - 0.3) / 0.7;
        this.opacities[i] = currentOpacity * (1 - transparentFactor * 0.5);
      }
      this.geometry.attributes.customOpacity.needsUpdate = true;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.updateHalos(deltaTime, elapsedTime);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private updateHalos(deltaTime: number, elapsedTime: number): void {
    for (let i = this.halos.length - 1; i >= 0; i--) {
      const halo = this.halos[i];
      const age = elapsedTime - halo.startTime;
      const progress = age / halo.duration;

      if (progress >= 1) {
        this.scene.remove(halo.sprite);
        halo.sprite.material.dispose();
        this.halos.splice(i, 1);
        continue;
      }

      const scale = 1 + progress * 15;
      halo.sprite.scale.set(scale, scale, 1);
      (halo.sprite.material as THREE.SpriteMaterial).opacity = (1 - progress) * 0.8;
    }
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  getParticlePosition(index: number): THREE.Vector3 {
    const i3 = index * 3;
    return new THREE.Vector3(
      this.positions[i3],
      this.positions[i3 + 1],
      this.positions[i3 + 2]
    );
  }

  getParticleDensity(index: number): number {
    const pos = this.getParticlePosition(index);
    let count = 0;
    const radius = 15;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (i === index) continue;
      const i3 = i * 3;
      const dx = this.positions[i3] - pos.x;
      const dy = this.positions[i3 + 1] - pos.y;
      const dz = this.positions[i3 + 2] - pos.z;
      if (dx * dx + dy * dy + dz * dz < radius * radius) {
        count++;
      }
    }

    return count;
  }

  createHaloPulse(particleIndex: number, elapsedTime: number): void {
    const pos = this.getParticlePosition(particleIndex);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(64, 64, 40, 64, 64, 55);
    grad.addColorStop(0, 'rgba(100, 180, 255, 0)');
    grad.addColorStop(0.6, 'rgba(100, 180, 255, 0.05)');
    grad.addColorStop(1, 'rgba(100, 180, 255, 0.15)');
    ctx.fillStyle = grad;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.set(1, 1, 1);
    this.scene.add(sprite);

    this.halos.push({
      sprite,
      startTime: elapsedTime,
      duration: 2,
    });
  }

  getPositions(): Float32Array {
    return new Float32Array(this.positions);
  }

  getBasePositions(): Float32Array {
    return new Float32Array(this.basePositions);
  }

  startTransition(targetPositions: Float32Array): void {
    this.transitionFrom = new Float32Array(this.positions);
    this.transitionTo = new Float32Array(targetPositions);
    this.transitionProgress = 0;
  }

  isTransitioning(): boolean {
    return this.transitionProgress < 1;
  }

  getCurrentParams(): { windSpeed: number; humidity: number; temperature: number } {
    return {
      windSpeed: this.windSpeed,
      humidity: this.humidity,
      temperature: this.temperature,
    };
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const halo of this.halos) {
      this.scene.remove(halo.sprite);
      halo.sprite.material.dispose();
    }
    this.halos = [];
  }
}
