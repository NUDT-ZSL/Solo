import * as THREE from 'three';

export interface StarFieldParams {
  count: number;
  minRadius: number;
  maxRadius: number;
  particleSize: number;
  rotationSpeed: number;
  colorOffset: number;
}

export interface ParticleInfo {
  index: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

type EventCallback = (info: ParticleInfo | null) => void;

const COLOR_BLUE = new THREE.Color('#4a90d9');
const COLOR_PINK = new THREE.Color('#ff6b9d');
const COLOR_WHITE = new THREE.Color('#ffffff');

export class StarField {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private highlightMesh: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private velocities: THREE.Vector3[] = [];
  private params: StarFieldParams;
  private selectedIndex: number | null = null;
  private eventCallbacks: Set<EventCallback> = new Set();
  private material: THREE.PointsMaterial | null = null;
  private rotationY: number = 0;
  private group: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.params = {
      count: 800,
      minRadius: 5,
      maxRadius: 12,
      particleSize: 4,
      rotationSpeed: 0.02,
      colorOffset: 0.5
    };
  }

  initScene(): void {
    this.scene.add(this.group);
    this.createParticles();
    this.createHighlightMesh();
  }

  private createParticles(): void {
    if (this.particles) {
      this.group.remove(this.particles);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    const { count, minRadius, maxRadius } = this.params;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.velocities = [];

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = minRadius + Math.random() * (maxRadius - minRadius);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      const t = Math.random();
      tempColor.copy(COLOR_BLUE).lerp(COLOR_PINK, t);
      this.colors[i3] = tempColor.r;
      this.colors[i3 + 1] = tempColor.g;
      this.colors[i3 + 2] = tempColor.b;

      this.sizes[i] = 2 + Math.random() * 4;

      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ));
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.group.add(this.particles);
  }

  private createHighlightMesh(): void {
    const highlightGeometry = new THREE.BufferGeometry();
    const highlightPositions = new Float32Array(3);
    const highlightColors = new Float32Array([1, 1, 1]);
    const highlightSizes = new Float32Array([12]);

    highlightGeometry.setAttribute('position', new THREE.BufferAttribute(highlightPositions, 3));
    highlightGeometry.setAttribute('color', new THREE.BufferAttribute(highlightColors, 3));
    highlightGeometry.setAttribute('size', new THREE.BufferAttribute(highlightSizes, 1));

    const highlightMaterial = new THREE.PointsMaterial({
      size: 12,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.highlightMesh = new THREE.Points(highlightGeometry, highlightMaterial);
    this.group.add(this.highlightMesh);
  }

  updateParticles(delta: number): void {
    if (!this.particles || !this.positions) return;

    this.rotationY += this.params.rotationSpeed * delta;
    this.group.rotation.y = this.rotationY;

    const positionAttr = this.geometry?.getAttribute('position') as THREE.BufferAttribute;
    if (positionAttr) {
      positionAttr.needsUpdate = true;
    }

    if (this.selectedIndex !== null && this.highlightMesh) {
      const i3 = this.selectedIndex * 3;
      const highlightPos = this.highlightMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      highlightPos.setXYZ(0, this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
      highlightPos.needsUpdate = true;
    }
  }

  getParticleSystem(): THREE.Points | null {
    return this.particles;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getPositions(): Float32Array | null {
    return this.positions;
  }

  getParticleCount(): number {
    return this.params.count;
  }

  getParticleInfo(index: number): ParticleInfo | null {
    if (!this.positions || index < 0 || index >= this.params.count) return null;
    const i3 = index * 3;
    return {
      index,
      position: new THREE.Vector3(
        this.positions[i3],
        this.positions[i3 + 1],
        this.positions[i3 + 2]
      ),
      velocity: this.velocities[index]?.clone() || new THREE.Vector3()
    };
  }

  selectParticle(index: number | null): void {
    this.selectedIndex = index;

    if (this.highlightMesh) {
      const material = this.highlightMesh.material as THREE.PointsMaterial;
      if (index !== null && this.positions) {
        const i3 = index * 3;
        const highlightPos = this.highlightMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        highlightPos.setXYZ(0, this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
        highlightPos.needsUpdate = true;
        material.opacity = 1;
      } else {
        material.opacity = 0;
      }
    }

    const info = index !== null ? this.getParticleInfo(index) : null;
    this.eventCallbacks.forEach(cb => cb(info));
  }

  getSelectedIndex(): number | null {
    return this.selectedIndex;
  }

  getNeighbors(centerIndex: number, threshold: number = 3): number[] {
    if (!this.positions) return [];
    const neighbors: number[] = [];
    const ci3 = centerIndex * 3;
    const cx = this.positions[ci3];
    const cy = this.positions[ci3 + 1];
    const cz = this.positions[ci3 + 2];

    for (let i = 0; i < this.params.count; i++) {
      if (i === centerIndex) continue;
      const i3 = i * 3;
      const dx = this.positions[i3] - cx;
      const dy = this.positions[i3 + 1] - cy;
      const dz = this.positions[i3 + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < threshold) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  onParticleSelect(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  updateParams(partial: Partial<StarFieldParams>): void {
    const needsRebuild = partial.count !== undefined && partial.count !== this.params.count;
    this.params = { ...this.params, ...partial };

    if (needsRebuild) {
      this.createParticles();
    }

    if (this.material) {
      this.material.size = this.params.particleSize;
    }

    if (partial.colorOffset !== undefined && this.colors && this.positions) {
      const tempColor = new THREE.Color();
      for (let i = 0; i < this.params.count; i++) {
        const i3 = i * 3;
        const baseT = (i / this.params.count + partial.colorOffset) % 1;
        tempColor.copy(COLOR_BLUE).lerp(COLOR_PINK, baseT);
        this.colors[i3] = tempColor.r;
        this.colors[i3 + 1] = tempColor.g;
        this.colors[i3 + 2] = tempColor.b;
      }
      const colorAttr = this.geometry?.getAttribute('color') as THREE.BufferAttribute;
      if (colorAttr) colorAttr.needsUpdate = true;
    }
  }

  getParams(): StarFieldParams {
    return { ...this.params };
  }
}
