import * as THREE from 'three';

export interface Shockwave {
  center: THREE.Vector3;
  radius: number;
  maxRadius: number;
  strength: number;
  progress: number;
  duration: number;
  elapsed: number;
}

export interface ParticleData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  size: number;
  heightRatio: number;
  bambooIndex: number;
  nodeIndex: number;
  isNode: boolean;
}

export class Bamboo {
  public mesh: THREE.Points;
  public particles: ParticleData[];
  public basePosition: THREE.Vector3;
  public height: number;
  public particleCount: number;
  public bending: THREE.Vector2;
  public targetBending: THREE.Vector2;
  public shockwaveOffset: THREE.Vector2;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private material: THREE.PointsMaterial;

  constructor(position: THREE.Vector3, height: number, bambooIndex: number) {
    this.basePosition = position.clone();
    this.height = height;
    this.particleCount = Math.floor(200 + Math.random() * 101);
    this.particles = [];
    this.bending = new THREE.Vector2(0, 0);
    this.targetBending = new THREE.Vector2(0, 0);
    this.shockwaveOffset = new THREE.Vector2(0, 0);

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    this.generateParticles(bambooIndex);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.position.copy(this.basePosition);
    this.mesh.userData = { bamboo: this };
  }

  private generateParticles(bambooIndex: number): void {
    const nodes = 8 + Math.floor(Math.random() * 5);
    const nodesHeight: number[] = [];
    for (let i = 0; i < nodes; i++) {
      nodesHeight.push((i + 1) / (nodes + 1));
    }

    const spiralTurns = 3 + Math.random() * 2;
    const baseRadius = 1.2 + Math.random() * 0.5;

    for (let i = 0; i < this.particleCount; i++) {
      const ratio = i / (this.particleCount - 1);
      const y = ratio * this.height;
      const radius = baseRadius * (1 - ratio * 0.7);
      const angle = ratio * Math.PI * 2 * spiralTurns + Math.random() * 0.1;

      let nodeIndex = -1;
      let isNode = false;
      for (let n = 0; n < nodesHeight.length; n++) {
        const nodeDist = Math.abs(ratio - nodesHeight[n]);
        if (nodeDist < 0.015) {
          nodeIndex = n;
          isNode = true;
          break;
        }
      }

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const hue = THREE.MathUtils.lerp(120, 140, ratio);
      const lightness = THREE.MathUtils.lerp(40, 80, ratio);
      const saturation = 60;

      const color = new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100);

      const size = THREE.MathUtils.lerp(6, 2, ratio);

      const basePos = new THREE.Vector3(x, y, z);

      this.particles.push({
        basePosition: basePos,
        currentPosition: basePos.clone(),
        color: color.clone(),
        baseColor: color.clone(),
        size: size,
        heightRatio: ratio,
        bambooIndex: bambooIndex,
        nodeIndex: nodeIndex,
        isNode: isNode
      });

      this.positions[i * 3] = basePos.x;
      this.positions[i * 3 + 1] = basePos.y;
      this.positions[i * 3 + 2] = basePos.z;

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = size;
    }
  }

  public update(deltaTime: number, lightDir: THREE.Vector3, shockwaves: Shockwave[]): void {
    this.bending.lerp(this.targetBending, Math.min(deltaTime * 3, 1));

    let shockEffect = new THREE.Vector2(0, 0);
    for (const sw of shockwaves) {
      const bambooWorldPos = new THREE.Vector3(
        this.basePosition.x,
        this.height / 2,
        this.basePosition.z
      );
      const dist = bambooWorldPos.distanceTo(sw.center);
      if (dist < sw.maxRadius && sw.progress > 0) {
        const dir = new THREE.Vector2(
          this.basePosition.x - sw.center.x,
          this.basePosition.z - sw.center.z
        );
        if (dir.lengthSq() > 0.001) {
          dir.normalize();
        }
        const falloff = Math.max(0, 1 - dist / sw.maxRadius);
        const wave = Math.sin(sw.progress * Math.PI * 2) * falloff * sw.strength;
        shockEffect.add(dir.multiplyScalar(wave));
      }
    }
    this.shockwaveOffset.lerp(shockEffect, Math.min(deltaTime * 8, 1));

    const totalBending = new THREE.Vector2(
      this.bending.x + this.shockwaveOffset.x,
      this.bending.y + this.shockwaveOffset.y
    );

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const r = p.heightRatio;
      const curveAmount = r * r;

      const flowOffset = new THREE.Vector3(0, 0, 0);
      if (totalBending.lengthSq() > 0.001 && p.isNode) {
        const flowSpeed = 0.3;
        const phase = Date.now() * 0.002 * flowSpeed + p.nodeIndex * 0.5;
        flowOffset.x = Math.sin(phase) * totalBending.x * 0.15;
        flowOffset.z = Math.cos(phase) * totalBending.y * 0.15;
      }

      p.currentPosition.set(
        p.basePosition.x + totalBending.x * curveAmount * 30 + flowOffset.x,
        p.basePosition.y + flowOffset.y,
        p.basePosition.z + totalBending.y * curveAmount * 30 + flowOffset.z
      );

      this.positions[i * 3] = p.currentPosition.x;
      this.positions[i * 3 + 1] = p.currentPosition.y;
      this.positions[i * 3 + 2] = p.currentPosition.z;

      const lightFactor = THREE.MathUtils.clamp(
        0.6 + 0.4 * lightDir.dot(new THREE.Vector3(
          (p.basePosition.x + totalBending.x * curveAmount * 30) / this.height,
          0.5,
          (p.basePosition.z + totalBending.y * curveAmount * 30) / this.height
        ).normalize()),
        0.3,
        1.3
      );

      let opacityBoost = 1;
      const bendingMag = totalBending.length();
      if (bendingMag > 0.01 && p.isNode) {
        opacityBoost = 1.3;
      }

      const tempColor = p.baseColor.clone();
      tempColor.multiplyScalar(lightFactor);
      const metalness = 0.3;
      const specularHighlight = Math.pow(Math.max(0, lightFactor), 2) * metalness * 0.3;
      tempColor.r = Math.min(1, tempColor.r + specularHighlight);
      tempColor.g = Math.min(1, tempColor.g + specularHighlight);
      tempColor.b = Math.min(1, tempColor.b + specularHighlight);

      if (opacityBoost > 1) {
        tempColor.multiplyScalar(1.15);
      }

      this.colors[i * 3] = tempColor.r;
      this.colors[i * 3 + 1] = tempColor.g;
      this.colors[i * 3 + 2] = tempColor.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
