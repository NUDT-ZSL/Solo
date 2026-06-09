import * as THREE from 'three';
import type { EmotionData } from './emotionData';

const PARTICLE_COUNT = 3000;
const MIN_RADIUS = 15;
const MAX_RADIUS = 18;
const VERTICAL_COMPRESS = 0.6;

interface ParticleParams {
  lissajousA: number;
  lissajousB: number;
  lissajousC: number;
  lissajousAmp: number;
  lissajousPeriod: number;
  phaseOffset: number;
  sizeBase: number;
  sizeAmp: number;
  colorJitterSeed: number;
}

export interface ExplosionParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

export interface PulseEffect {
  centerIndex: number;
  centerPosition: THREE.Vector3;
  elapsed: number;
  duration: number;
  affectedIndices: number[];
  displacements: THREE.Vector3[];
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;

  private basePositions!: Float32Array;
  private currentPositions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private opacities!: Float32Array;

  private particleParams: ParticleParams[] = [];
  private emotionData!: EmotionData;

  private explosionParticles: ExplosionParticle[] = [];
  private explosionMesh!: THREE.Points;
  private explosionGeometry!: THREE.BufferGeometry;
  private maxExplosions = 200;

  private pulseEffects: PulseEffect[] = [];
  private particleSize = 6;

  private tempColor = new THREE.Color();
  private tempHSL = { h: 0, s: 0, l: 0 };

  public opacity: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createGeometry();
    this.createMaterial();
    this.createMesh();
    this.createExplosionMesh();
  }

  private createGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.currentPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.opacities = new Float32Array(PARTICLE_COUNT);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
  }

  private createMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vOpacity;
          float glow = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor * (0.6 + glow * 0.8), alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createMesh(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private createExplosionMesh(): void {
    this.explosionGeometry = new THREE.BufferGeometry();
    const expPositions = new Float32Array(this.maxExplosions * 3);
    const expColors = new Float32Array(this.maxExplosions * 3);
    const expSizes = new Float32Array(this.maxExplosions);
    const expOpacities = new Float32Array(this.maxExplosions);

    this.explosionGeometry.setAttribute('position', new THREE.BufferAttribute(expPositions, 3));
    this.explosionGeometry.setAttribute('color', new THREE.BufferAttribute(expColors, 3));
    this.explosionGeometry.setAttribute('size', new THREE.BufferAttribute(expSizes, 1));
    this.explosionGeometry.setAttribute('opacity', new THREE.BufferAttribute(expOpacities, 1));

    const explosionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vOpacity;
          gl_FragColor = vec4(vColor * 1.5, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.explosionMesh = new THREE.Points(this.explosionGeometry, explosionMaterial);
    this.explosionMesh.frustumCulled = false;
    this.scene.add(this.explosionMesh);
  }

  public generateFromEmotion(emotionData: EmotionData): void {
    this.emotionData = emotionData;
    this.particleParams = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = this.generateHumanoidPosition(i);
      this.basePositions[i * 3] = pos.x;
      this.basePositions[i * 3 + 1] = pos.y;
      this.basePositions[i * 3 + 2] = pos.z;
      this.currentPositions[i * 3] = pos.x;
      this.currentPositions[i * 3 + 1] = pos.y;
      this.currentPositions[i * 3 + 2] = pos.z;

      const intensity = emotionData.intensities[i];
      this.tempColor.copy(emotionData.gradientStart).lerp(emotionData.gradientEnd, intensity);
      this.colors[i * 3] = this.tempColor.r;
      this.colors[i * 3 + 1] = this.tempColor.g;
      this.colors[i * 3 + 2] = this.tempColor.b;

      this.sizes[i] = 2 + intensity * 4;
      this.opacities[i] = 0.6 + intensity * 0.4;

      this.particleParams.push({
        lissajousA: 2 + Math.random() * 4,
        lissajousB: 3 + Math.random() * 5,
        lissajousC: 4 + Math.random() * 6,
        lissajousAmp: 1.5 + Math.random() * 1.5,
        lissajousPeriod: 2 + Math.random() * 3,
        phaseOffset: Math.random() * Math.PI * 2,
        sizeBase: 2 + intensity * 2,
        sizeAmp: intensity * 2,
        colorJitterSeed: Math.random() * 1000
      });
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
  }

  private generateHumanoidPosition(index: number): THREE.Vector3 {
    const t = index / PARTICLE_COUNT;
    const rand = this.seededRandom(index * 1234.5678);

    let bodyRegion: 'head' | 'torso' | 'arms' | 'legs';
    if (t < 0.12) bodyRegion = 'head';
    else if (t < 0.45) bodyRegion = 'torso';
    else if (t < 0.7) bodyRegion = 'arms';
    else bodyRegion = 'legs';

    let x = 0, y = 0, z = 0;
    const edgeBias = Math.pow(rand, 0.7);
    const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * edgeBias;

    switch (bodyRegion) {
      case 'head': {
        const headRadius = radius * 0.35;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = headRadius * Math.sin(phi) * Math.cos(theta);
        y = radius * 0.7 + headRadius * Math.cos(phi) * 0.8;
        z = headRadius * Math.sin(phi) * Math.sin(theta);
        break;
      }
      case 'torso': {
        const torsoHeight = rand * 0.5;
        y = radius * 0.2 - torsoHeight * radius * 0.4;
        const torsoWidth = radius * (0.25 + torsoHeight * 0.15);
        const theta = Math.random() * Math.PI * 2;
        const r = torsoWidth * Math.sqrt(Math.random() * edgeBias);
        x = r * Math.cos(theta);
        z = r * Math.sin(theta) * 0.7;
        break;
      }
      case 'arms': {
        const armSide = Math.random() < 0.5 ? -1 : 1;
        const armHeight = Math.random();
        y = radius * 0.5 - armHeight * radius * 0.8;
        const armExtent = radius * (0.3 + armHeight * 0.2);
        const theta = Math.random() * Math.PI * 2;
        const armOffset = armSide * armExtent * (0.5 + Math.random() * 0.5);
        x = armOffset + Math.cos(theta) * radius * 0.1;
        z = Math.sin(theta) * radius * 0.15;
        break;
      }
      case 'legs': {
        const legSide = Math.random() < 0.5 ? -1 : 1;
        const legHeight = Math.random();
        y = -radius * 0.3 - legHeight * radius * 0.5;
        const legWidth = radius * 0.15;
        const theta = Math.random() * Math.PI * 2;
        const r = legWidth * Math.sqrt(Math.random() * edgeBias);
        x = legSide * radius * 0.12 + r * Math.cos(theta);
        z = r * Math.sin(theta) * 0.6;
        break;
      }
    }

    y *= VERTICAL_COMPRESS;
    return new THREE.Vector3(x, y, z);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  }

  public update(time: number, deltaTime: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const params = this.particleParams[i];
      const t = time / params.lissajousPeriod + params.phaseOffset;

      let offsetX = Math.sin(params.lissajousA * t) * params.lissajousAmp;
      let offsetY = Math.sin(params.lissajousB * t + Math.PI / 3) * params.lissajousAmp;
      let offsetZ = Math.sin(params.lissajousC * t + Math.PI / 2) * params.lissajousAmp;

      for (const pulse of this.pulseEffects) {
        if (pulse.affectedIndices.includes(i)) {
          const idx = pulse.affectedIndices.indexOf(i);
          const pulseProgress = pulse.elapsed / pulse.duration;
          const pulseEase = this.easeOutCubic(Math.sin(pulseProgress * Math.PI));
          offsetX += pulse.displacements[idx].x * pulseEase;
          offsetY += pulse.displacements[idx].y * pulseEase;
          offsetZ += pulse.displacements[idx].z * pulseEase;
        }
      }

      this.currentPositions[i * 3] = this.basePositions[i * 3] + offsetX;
      this.currentPositions[i * 3 + 1] = this.basePositions[i * 3 + 1] + offsetY;
      this.currentPositions[i * 3 + 2] = this.basePositions[i * 3 + 2] + offsetZ;

      const sizeWave = Math.sin(time * 2 + params.phaseOffset) * 0.5 + 0.5;
      this.sizes[i] = params.sizeBase + params.sizeAmp * sizeWave;

      const intensity = this.emotionData.intensities[i];
      this.tempColor.copy(this.emotionData.gradientStart).lerp(this.emotionData.gradientEnd, intensity);
      this.tempColor.getHSL(this.tempHSL);
      const jitter = (this.seededRandom(params.colorJitterSeed + time * 10) - 0.5) * 30 / 360;
      this.tempHSL.h = (this.tempHSL.h + jitter + 1) % 1;
      this.tempColor.setHSL(this.tempHSL.h, this.tempHSL.s, this.tempHSL.l);
      this.colors[i * 3] = this.tempColor.r;
      this.colors[i * 3 + 1] = this.tempColor.g;
      this.colors[i * 3 + 2] = this.tempColor.b;

      this.opacities[i] = (0.6 + intensity * 0.4) * this.opacity;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;

    this.updatePulseEffects(deltaTime);
    this.updateExplosions(deltaTime);
  }

  private updatePulseEffects(deltaTime: number): void {
    for (let i = this.pulseEffects.length - 1; i >= 0; i--) {
      this.pulseEffects[i].elapsed += deltaTime;
      if (this.pulseEffects[i].elapsed >= this.pulseEffects[i].duration) {
        this.pulseEffects.splice(i, 1);
      }
    }
  }

  private updateExplosions(deltaTime: number): void {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life -= deltaTime;
      p.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.multiplyScalar(0.98);

      if (p.life <= 0) {
        this.explosionParticles.splice(i, 1);
      }
    }

    const expPositions = this.explosionGeometry.attributes.position.array as Float32Array;
    const expColors = this.explosionGeometry.attributes.color.array as Float32Array;
    const expSizes = this.explosionGeometry.attributes.size.array as Float32Array;
    const expOpacities = this.explosionGeometry.attributes.opacity.array as Float32Array;

    for (let i = 0; i < this.maxExplosions; i++) {
      if (i < this.explosionParticles.length) {
        const p = this.explosionParticles[i];
        const lifeRatio = p.life / p.maxLife;
        expPositions[i * 3] = p.position.x;
        expPositions[i * 3 + 1] = p.position.y;
        expPositions[i * 3 + 2] = p.position.z;
        expColors[i * 3] = p.color.r;
        expColors[i * 3 + 1] = p.color.g;
        expColors[i * 3 + 2] = p.color.b;
        expSizes[i] = 1 * lifeRatio;
        expOpacities[i] = lifeRatio;
      } else {
        expPositions[i * 3] = 0;
        expPositions[i * 3 + 1] = -9999;
        expPositions[i * 3 + 2] = 0;
        expSizes[i] = 0;
        expOpacities[i] = 0;
      }
    }

    (this.explosionGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.explosionGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.explosionGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.explosionGeometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
  }

  public triggerExplosion(particleIndex: number): void {
    if (particleIndex < 0 || particleIndex >= PARTICLE_COUNT) return;

    const px = this.currentPositions[particleIndex * 3];
    const py = this.currentPositions[particleIndex * 3 + 1];
    const pz = this.currentPositions[particleIndex * 3 + 2];
    const centerPos = new THREE.Vector3(px, py, pz);
    const centerBasePos = new THREE.Vector3(
      this.basePositions[particleIndex * 3],
      this.basePositions[particleIndex * 3 + 1],
      this.basePositions[particleIndex * 3 + 2]
    );

    const normal = centerBasePos.clone().normalize();
    const color = new THREE.Color(
      this.colors[particleIndex * 3],
      this.colors[particleIndex * 3 + 1],
      this.colors[particleIndex * 3 + 2]
    );

    for (let i = 0; i < 6; i++) {
      if (this.explosionParticles.length >= this.maxExplosions) break;
      const angle1 = (i / 6) * Math.PI * 2;
      const angle2 = Math.random() * Math.PI;
      const tangent1 = new THREE.Vector3(-normal.y, normal.x, 0).normalize();
      const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();
      const velocity = new THREE.Vector3()
        .addScaledVector(normal, 0.6)
        .addScaledVector(tangent1, Math.cos(angle1) * Math.sin(angle2) * 0.8)
        .addScaledVector(tangent2, Math.sin(angle1) * Math.sin(angle2) * 0.8)
        .normalize()
        .multiplyScalar(30);

      this.explosionParticles.push({
        position: centerPos.clone(),
        velocity,
        color: color.clone(),
        life: 0.6,
        maxLife: 0.6
      });
    }

    this.triggerPulse(particleIndex, centerPos);
  }

  private triggerPulse(centerIndex: number, centerPos: THREE.Vector3): void {
    const affected: number[] = [];
    const displacements: THREE.Vector3[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (i === centerIndex) continue;
      const dx = this.currentPositions[i * 3] - centerPos.x;
      const dy = this.currentPositions[i * 3 + 1] - centerPos.y;
      const dz = this.currentPositions[i * 3 + 2] - centerPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= 3 && dist > 0) {
        affected.push(i);
        const dir = new THREE.Vector3(dx / dist, dy / dist, dz / dist);
        const falloff = 1 - dist / 3;
        displacements.push(dir.multiplyScalar(3 * falloff));
      }
    }

    if (affected.length > 0) {
      this.pulseEffects.push({
        centerIndex,
        centerPosition: centerPos.clone(),
        elapsed: 0,
        duration: 0.3,
        affectedIndices: affected,
        displacements
      });
    }
  }

  public getParticleIndexFromRay(ray: THREE.Ray): number {
    let closestIndex = -1;
    let closestDist = 0.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = this.currentPositions[i * 3];
      const py = this.currentPositions[i * 3 + 1];
      const pz = this.currentPositions[i * 3 + 2];
      const point = new THREE.Vector3(px, py, pz);
      const dist = ray.distanceToPoint(point);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.explosionGeometry.dispose();
    (this.explosionMesh.material as THREE.Material).dispose();
    this.scene.remove(this.points);
    this.scene.remove(this.explosionMesh);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public getEmotionData(): EmotionData {
    return this.emotionData;
  }
}
