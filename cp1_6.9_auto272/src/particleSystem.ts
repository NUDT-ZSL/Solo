import * as THREE from 'three';
import {
  CONFIG,
  COLORS,
  lerp,
  lerpColor,
  random,
  createGradientTexture
} from './utils';

export interface ParticleData {
  basePosition: THREE.Vector3;
  floatOffset: number;
  floatPeriod: number;
  baseSize: number;
  colorT: number;
  trailLength: number;
  trailPositions: THREE.Vector3[];
}

export class ParticleBand {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  public particleData: ParticleData[] = [];
  public group: THREE.Group;
  public startPoint: THREE.Vector3;
  public endPoint: THREE.Vector3;
  public creationTime: number = 0;
  public averageColor: THREE.Color;
  public isAlive: boolean = true;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particleCount: number;

  constructor(
    start: THREE.Vector3,
    end: THREE.Vector3,
    dragSpeed: number,
    texture: THREE.Texture
  ) {
    this.startPoint = start.clone();
    this.endPoint = end.clone();
    this.group = new THREE.Group();
    this.particleCount = CONFIG.PARTICLES_PER_BAND;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    const isFast = dragSpeed > CONFIG.SPEED_THRESHOLD;
    const spacing = isFast ? CONFIG.PARTICLE_SPACING_FAST : CONFIG.PARTICLE_SPACING_SLOW;
    const trailLen = isFast ? CONFIG.TRAIL_LENGTH_FAST : CONFIG.TRAIL_LENGTH_SLOW;

    const avgColorT = 0.5;
    this.averageColor = lerpColor(COLORS.START_WARM, COLORS.END_COOL, avgColorT);

    this.initializeParticles(spacing, trailLen);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      map: texture,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  private initializeParticles(spacing: number, trailLen: number): void {
    const direction = new THREE.Vector3()
      .subVectors(this.endPoint, this.startPoint);
    const totalLength = direction.length();
    direction.normalize();

    const actualCount = Math.min(
      this.particleCount,
      Math.max(20, Math.floor(totalLength / spacing))
    );

    for (let i = 0; i < this.particleCount; i++) {
      const t = actualCount > 1 ? i / (actualCount - 1) : 0;
      const clampedT = Math.min(t, 1);

      const distance = clampedT * totalLength;
      const basePos = new THREE.Vector3()
        .copy(this.startPoint)
        .add(direction.clone().multiplyScalar(distance));

      const perpX = (Math.random() - 0.5) * 1.5;
      const perpY = (Math.random() - 0.5) * 1.5;
      basePos.x += perpX;
      basePos.y += perpY;
      basePos.z += (Math.random() - 0.5) * 1.0;

      const floatOffset = random(0, Math.PI * 2);
      const floatPeriod = random(CONFIG.FLOAT_PERIOD_MIN, CONFIG.FLOAT_PERIOD_MAX);
      const baseSize = random(CONFIG.PARTICLE_MIN_SIZE, CONFIG.PARTICLE_MAX_SIZE);

      this.particleData.push({
        basePosition: basePos,
        floatOffset,
        floatPeriod,
        baseSize,
        colorT: clampedT,
        trailLength: trailLen,
        trailPositions: []
      });

      this.positions[i * 3] = basePos.x;
      this.positions[i * 3 + 1] = basePos.y;
      this.positions[i * 3 + 2] = basePos.z;

      const color = lerpColor(COLORS.START_WARM, COLORS.END_COOL, clampedT);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = baseSize;
    }

    this.particleCount = this.particleData.length;
  }

  public update(elapsedTime: number, deltaTime: number): void {
    this.group.rotation.y += CONFIG.ROTATION_SPEED * deltaTime;

    const age = elapsedTime - this.creationTime;
    const breathCycle = CONFIG.BREATH_CYCLE;
    const shrinkDuration = CONFIG.BREATH_SHRINK_DURATION;

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];

      const floatY = Math.sin(
        (elapsedTime / data.floatPeriod) * Math.PI * 2 + data.floatOffset
      ) * CONFIG.FLOAT_AMPLITUDE;

      const idx = i * 3;
      this.positions[idx] = data.basePosition.x;
      this.positions[idx + 1] = data.basePosition.y + floatY;
      this.positions[idx + 2] = data.basePosition.z;

      let sizeMultiplier: number;
      const tInCycle = age % breathCycle;

      if (tInCycle < shrinkDuration) {
        const shrinkT = tInCycle / shrinkDuration;
        sizeMultiplier = lerp(1, CONFIG.BREATH_SCALE, shrinkT);
      } else {
        const recoverT = (tInCycle - shrinkDuration) / (breathCycle - shrinkDuration);
        const easedT = 1 - Math.pow(1 - recoverT, 2);
        sizeMultiplier = lerp(CONFIG.BREATH_SCALE, 1, easedT);
      }

      this.sizes[i] = data.baseSize * sizeMultiplier;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public getPathPoints(): THREE.Vector3[] {
    return this.particleData.map((d) => {
      const worldPos = d.basePosition.clone();
      this.group.localToWorld(worldPos);
      return worldPos;
    });
  }

  public getAverageWorldColor(): THREE.Color {
    return this.averageColor.clone();
  }

  public dispose(): void {
    this.isAlive = false;
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class RippleEffect {
  public mesh: THREE.Mesh;
  public material: THREE.MeshBasicMaterial;
  public position: THREE.Vector3;
  public startTime: number;
  public duration: number;
  public isAlive: boolean = true;

  constructor(position: THREE.Vector3, color: THREE.Color, startTime: number) {
    this.position = position.clone();
    this.startTime = startTime;
    this.duration = CONFIG.RIPPLE_DURATION;

    const geometry = new THREE.RingGeometry(
      CONFIG.RIPPLE_START_RADIUS - 2,
      CONFIG.RIPPLE_START_RADIUS,
      64
    );

    this.material = new THREE.MeshBasicMaterial({
      color: color.clone().multiplyScalar(CONFIG.NODE_BRIGHTNESS_BOOST),
      transparent: true,
      opacity: CONFIG.RIPPLE_START_OPACITY,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(this.position);
  }

  public update(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);

    const easedT = 1 - Math.pow(1 - t, 3);
    const radius = lerp(CONFIG.RIPPLE_START_RADIUS, CONFIG.RIPPLE_END_RADIUS, easedT);
    const opacity = lerp(CONFIG.RIPPLE_START_OPACITY, 0, t);

    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.RingGeometry(
      radius - 3,
      radius,
      64
    );

    this.material.opacity = opacity;

    if (t >= 1) {
      this.isAlive = false;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class NetworkNode {
  public mesh: THREE.Mesh;
  public material: THREE.MeshBasicMaterial;
  public position: THREE.Vector3;
  public color: THREE.Color;
  public birthTime: number;
  public pulsePhase: number;
  public links: Set<string> = new Set();

  constructor(
    position: THREE.Vector3,
    color1: THREE.Color,
    color2: THREE.Color,
    time: number,
    texture: THREE.Texture
  ) {
    this.position = position.clone();
    this.birthTime = time;
    this.pulsePhase = Math.random() * Math.PI * 2;

    this.color = new THREE.Color()
      .copy(color1)
      .lerp(color2, 0.5)
      .multiplyScalar(CONFIG.NODE_BRIGHTNESS_BOOST);

    const geometry = new THREE.PlaneGeometry(
      CONFIG.NODE_SIZE,
      CONFIG.NODE_SIZE
    );

    this.material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(this.position);
  }

  public update(currentTime: number, camera: THREE.Camera): void {
    const pulse = 1 + Math.sin(currentTime * 2 + this.pulsePhase) * 0.15;
    this.mesh.scale.set(pulse, pulse, pulse);
    this.mesh.lookAt(camera.position);
  }

  public getLinkId(other: NetworkNode): string {
    const id1 = this.mesh.uuid;
    const id2 = other.mesh.uuid;
    return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class NetworkLink {
  public line: THREE.Line;
  public geometry: THREE.BufferGeometry;
  public material: THREE.LineBasicMaterial;
  public nodeA: NetworkNode;
  public nodeB: NetworkNode;
  public isAlive: boolean = true;

  constructor(nodeA: NetworkNode, nodeB: NetworkNode) {
    this.nodeA = nodeA;
    this.nodeB = nodeB;

    const positions = new Float32Array(2 * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const avgColor = new THREE.Color()
      .copy(nodeA.color)
      .lerp(nodeB.color, 0.5);

    this.material = new THREE.LineBasicMaterial({
      color: avgColor,
      transparent: true,
      opacity: CONFIG.LINE_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: CONFIG.LINE_WIDTH
    });

    this.line = new THREE.Line(this.geometry, this.material);
    this.updatePositions();
  }

  public updatePositions(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    positions[0] = this.nodeA.position.x;
    positions[1] = this.nodeA.position.y;
    positions[2] = this.nodeA.position.z;
    positions[3] = this.nodeB.position.x;
    positions[4] = this.nodeB.position.y;
    positions[5] = this.nodeB.position.z;
    this.geometry.attributes.position.needsUpdate = true;
  }

  public getDistance(): number {
    return this.nodeA.position.distanceTo(this.nodeB.position);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export const sharedTexture = createGradientTexture();
