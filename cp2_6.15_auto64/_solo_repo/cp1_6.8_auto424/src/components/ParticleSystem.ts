import * as THREE from 'three';
import {
  particleVertexShader,
  particleFragmentShader,
  lineVertexShader,
  lineFragmentShader,
} from '../utils/shaders';

export interface ParticleSystemConfig {
  particleCount: number;
  starWindStrength: number;
  connectionDistance: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private config: ParticleSystemConfig;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;

  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.ShaderMaterial;
  private particlePoints!: THREE.Points;

  private lineGeometry!: THREE.BufferGeometry;
  private lineMaterial!: THREE.ShaderMaterial;
  private lineSegments!: THREE.LineSegments;

  private mouseWorld: THREE.Vector3 = new THREE.Vector3();
  private mouseVelocity: THREE.Vector2 = new THREE.Vector2();
  private isDragging = false;
  private isExploding = false;
  private explodeOrigin: THREE.Vector3 = new THREE.Vector3();
  private explodeTime = 0;
  private explodeDuration = 1.2;

  private trailPositions: THREE.Vector3[] = [];
  private maxTrailLength = 12;

  constructor(scene: THREE.Scene, config: ParticleSystemConfig) {
    this.scene = scene;
    this.config = { ...config };
    this.positions = new Float32Array(0);
    this.velocities = new Float32Array(0);
    this.colors = new Float32Array(0);
    this.sizes = new Float32Array(0);
    this.alphas = new Float32Array(0);
    this.init();
  }

  private init() {
    this.createParticleBuffers();
    this.createParticleMesh();
    this.createLineMesh();
  }

  private createParticleBuffers() {
    const count = this.config.particleCount;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);

    const spread = 30;
    const center = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.6) * spread;

      this.positions[i3] = center.x + r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = center.y + r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = center.z + r * Math.cos(phi);

      this.velocities[i3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      const t = Math.random();
      this.colors[i3] = 0.29 + t * 0.71;
      this.colors[i3 + 1] = 0.47 + t * 0.49;
      this.colors[i3 + 2] = 0.82 + t * 0.18;

      this.sizes[i] = 1.5 + Math.random() * 3.0;
      this.alphas[i] = 0.4 + Math.random() * 0.6;
    }
  }

  private createParticleMesh() {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.particleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particlePoints);
  }

  private createLineMesh() {
    const maxLines = this.config.particleCount * 6;
    const linePositions = new Float32Array(maxLines * 3);
    const lineAlphas = new Float32Array(maxLines);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.lineGeometry.setAttribute('aLineAlpha', new THREE.BufferAttribute(lineAlphas, 1));
    this.lineGeometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.ShaderMaterial({
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      uniforms: {
        uLineColor: { value: new THREE.Color(0.29, 0.62, 1.0) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.lineSegments);
  }

  update(time: number, delta: number) {
    this.updateParticles(time, delta);
    this.updateConnections();
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.aAlpha.needsUpdate = true;
    this.particleMaterial.uniforms.uTime.value = time;

    if (this.isExploding) {
      this.explodeTime += delta;
      if (this.explodeTime > this.explodeDuration) {
        this.isExploding = false;
        this.explodeTime = 0;
      }
    }
  }

  private updateParticles(time: number, delta: number) {
    const count = this.config.particleCount;
    const wind = this.config.starWindStrength;
    const dt = Math.min(delta, 0.05) * 60;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let px = this.positions[i3];
      let py = this.positions[i3 + 1];
      let pz = this.positions[i3 + 2];

      let vx = this.velocities[i3];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];

      const windAngle = time * 0.1 * wind;
      vx += Math.cos(windAngle + pz * 0.05) * 0.001 * wind;
      vy += Math.sin(windAngle + px * 0.05) * 0.001 * wind;
      vz += Math.cos(windAngle * 0.7 + py * 0.05) * 0.0005 * wind;

      if (this.isDragging) {
        const dx = this.mouseWorld.x - px;
        const dy = this.mouseWorld.y - py;
        const dz = this.mouseWorld.z - pz;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq + 0.01);
        const influence = Math.max(0, 1.0 - dist / 15.0);
        const force = influence * influence * 0.08;
        vx += dx / dist * force + this.mouseVelocity.x * influence * 0.03;
        vy += dy / dist * force + this.mouseVelocity.y * influence * 0.03;
        vz += dz / dist * force * 0.3;

        this.alphas[i] = Math.min(1.0, this.alphas[i] + influence * 0.05);
      }

      if (this.isExploding) {
        const dx = px - this.explodeOrigin.x;
        const dy = py - this.explodeOrigin.y;
        const dz = pz - this.explodeOrigin.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.01);
        const progress = this.explodeTime / this.explodeDuration;

        if (progress < 0.3) {
          const explodeForce = Math.max(0, 1.0 - dist / 20.0) * (1.0 - progress / 0.3);
          vx += dx / dist * explodeForce * 0.5;
          vy += dy / dist * explodeForce * 0.5;
          vz += dz / dist * explodeForce * 0.5;
          this.alphas[i] = Math.min(1.0, this.alphas[i] + explodeForce * 0.1);
        } else {
          const rejoin = (progress - 0.3) / 0.7;
          vx *= 1.0 - rejoin * 0.02;
          vy *= 1.0 - rejoin * 0.02;
          vz *= 1.0 - rejoin * 0.02;
        }
      }

      const distToCenter = Math.sqrt(px * px + py * py + pz * pz);
      if (distToCenter > 25) {
        const pullback = 0.002 * (distToCenter - 25);
        vx -= px / distToCenter * pullback;
        vy -= py / distToCenter * pullback;
        vz -= pz / distToCenter * pullback;
      }

      vx *= 0.98;
      vy *= 0.98;
      vz *= 0.98;

      px += vx * dt;
      py += vy * dt;
      pz += vz * dt;

      this.positions[i3] = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;
      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;

      if (!this.isDragging && !this.isExploding) {
        this.alphas[i] += (0.4 + Math.random() * 0.2 - this.alphas[i]) * 0.01;
      }
    }

    this.particleGeometry.attributes.aAlpha.needsUpdate = true;
  }

  private updateConnections() {
    const count = this.config.particleCount;
    const maxDist = this.config.connectionDistance;
    const maxDistSq = maxDist * maxDist;
    const maxLines = count * 6;

    const linePosAttr = this.lineGeometry.attributes.position as THREE.BufferAttribute;
    const lineAlphaAttr = this.lineGeometry.attributes.aLineAlpha as THREE.BufferAttribute;
    const linePos = linePosAttr.array as Float32Array;
    const lineAlpha = lineAlphaAttr.array as Float32Array;

    let lineIdx = 0;

    const step = count > 2000 ? 3 : count > 1000 ? 2 : 1;

    for (let i = 0; i < count && lineIdx < maxLines; i += step) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      for (let j = i + 1; j < count && lineIdx < maxLines; j += step) {
        const j3 = j * 3;
        const dx = px - this.positions[j3];
        const dy = py - this.positions[j3 + 1];
        const dz = pz - this.positions[j3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < maxDistSq) {
          const li = lineIdx * 3;
          linePos[li] = px;
          linePos[li + 1] = py;
          linePos[li + 2] = pz;
          linePos[li + 3] = this.positions[j3];
          linePos[li + 4] = this.positions[j3 + 1];
          linePos[li + 5] = this.positions[j3 + 2];

          const alpha = (1.0 - Math.sqrt(distSq) / maxDist) * 0.15;
          lineAlpha[lineIdx] = alpha;
          lineAlpha[lineIdx + 1] = alpha;

          lineIdx += 2;
        }
      }
    }

    this.lineGeometry.setDrawRange(0, lineIdx);
    linePosAttr.needsUpdate = true;
    lineAlphaAttr.needsUpdate = true;
  }

  setMouseWorld(pos: THREE.Vector3) {
    this.mouseWorld.copy(pos);

    this.trailPositions.unshift(pos.clone());
    if (this.trailPositions.length > this.maxTrailLength) {
      this.trailPositions.pop();
    }
  }

  setMouseVelocity(vel: THREE.Vector2) {
    this.mouseVelocity.copy(vel);
  }

  setDragging(value: boolean) {
    this.isDragging = value;
    if (!value) {
      this.mouseVelocity.set(0, 0);
    }
  }

  triggerExplosion(origin: THREE.Vector3) {
    this.isExploding = true;
    this.explodeOrigin.copy(origin);
    this.explodeTime = 0;
  }

  updateConfig(config: Partial<ParticleSystemConfig>) {
    const needRebuild = config.particleCount !== undefined && config.particleCount !== this.config.particleCount;
    Object.assign(this.config, config);

    if (needRebuild) {
      this.dispose();
      this.init();
    }
  }

  reset() {
    this.dispose();
    this.config.particleCount = this.config.particleCount;
    this.init();
  }

  dispose() {
    this.scene.remove(this.particlePoints);
    this.scene.remove(this.lineSegments);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
  }

  getConfig(): ParticleSystemConfig {
    return { ...this.config };
  }
}
