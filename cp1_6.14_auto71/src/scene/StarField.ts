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

const COLOR_BLUE_RGB = { r: 0x4a / 255, g: 0x90 / 255, b: 0xd9 / 255 };
const COLOR_PINK_RGB = { r: 0xff / 255, g: 0x6b / 255, b: 0x9d / 255 };

const STRATA_COUNT = 10;

function lerpRGB(color1: typeof COLOR_BLUE_RGB, color2: typeof COLOR_BLUE_RGB, t: number): THREE.Color {
  const r = color1.r + t * (color2.r - color1.r);
  const g = color1.g + t * (color2.g - color1.g);
  const b = color1.b + t * (color2.b - color1.b);
  return new THREE.Color(r, g, b);
}

export class StarField {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private highlightMesh: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private colorSeeds: Float32Array | null = null;
  private velocities: THREE.Vector3[] = [];
  private params: StarFieldParams;
  private selectedIndex: number | null = null;
  private eventCallbacks: Set<EventCallback> = new Set();
  private material: THREE.PointsMaterial | null = null;
  private rotationY: number = 0;
  private group: THREE.Group = new THREE.Group();
  private frozen: boolean = false;

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
    this.validateDistribution();
  }

  private createParticles(): void {
    if (this.particles) {
      this.group.remove(this.particles);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    const { count, minRadius, maxRadius, colorOffset } = this.params;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.colorSeeds = new Float32Array(count);
    this.velocities = [];

    const minR3 = Math.pow(minRadius, 3);
    const maxR3 = Math.pow(maxRadius, 3);
    const totalVolume = maxR3 - minR3;

    const strataOuterRadii: number[] = [];
    for (let s = 1; s <= STRATA_COUNT; s++) {
      strataOuterRadii.push(Math.cbrt(minR3 + (s / STRATA_COUNT) * totalVolume));
    }

    let particleIdx = 0;
    for (let s = 0; s < STRATA_COUNT; s++) {
      const rInner = s === 0 ? minRadius : strataOuterRadii[s - 1];
      const rOuter = strataOuterRadii[s];
      const rInner3 = Math.pow(rInner, 3);
      const rOuter3 = Math.pow(rOuter, 3);
      const r3Range = rOuter3 - rInner3;

      let particlesInStratum = Math.floor(count / STRATA_COUNT);
      if (s < count % STRATA_COUNT) {
        particlesInStratum++;
      }

      for (let p = 0; p < particlesInStratum && particleIdx < count; p++, particleIdx++) {
        const i3 = particleIdx * 3;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const u = Math.random();
        const radius = Math.cbrt(rInner3 + u * r3Range);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        this.positions[i3] = x;
        this.positions[i3 + 1] = y;
        this.positions[i3 + 2] = z;

        const seed = Math.random();
        this.colorSeeds[particleIdx] = seed;
        const t = (seed + colorOffset) % 1;
        const color = lerpRGB(COLOR_BLUE_RGB, COLOR_PINK_RGB, t);
        this.colors[i3] = color.r;
        this.colors[i3 + 1] = color.g;
        this.colors[i3 + 2] = color.b;

        this.sizes[particleIdx] = 2 + Math.random() * 4;

        this.velocities.push(new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ));
      }
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

  validateDistribution(): void {
    if (!this.positions) return;
    const count = this.params.count;
    const { minRadius, maxRadius } = this.params;

    const strataCounts = new Array(STRATA_COUNT).fill(0);
    const strataVolumes = new Array(STRATA_COUNT).fill(0);

    const minR3 = Math.pow(minRadius, 3);
    const maxR3 = Math.pow(maxRadius, 3);
    const totalVolume = maxR3 - minR3;

    const strataOuterRadii: number[] = [];
    for (let s = 1; s <= STRATA_COUNT; s++) {
      strataOuterRadii.push(Math.cbrt(minR3 + (s / STRATA_COUNT) * totalVolume));
    }

    for (let s = 0; s < STRATA_COUNT; s++) {
      const rInner = s === 0 ? minRadius : strataOuterRadii[s - 1];
      const rOuter = strataOuterRadii[s];
      strataVolumes[s] = Math.pow(rOuter, 3) - Math.pow(rInner, 3);
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );

      for (let s = 0; s < STRATA_COUNT; s++) {
        const rOuter = strataOuterRadii[s];
        if (r <= rOuter + 0.001) {
          strataCounts[s]++;
          break;
        }
      }
    }

    const totalParticles = strataCounts.reduce((a, b) => a + b, 0);
    const densities = strataCounts.map((c, i) => c / strataVolumes[i]);
    const avgDensity = totalParticles / (totalVolume);

    console.log('========================================');
    console.log('  StarField Distribution Validation');
    console.log('  Method: Radial stratified sampling');
    console.log('  Strata: %d layers, equal volume', STRATA_COUNT);
    console.log('========================================');
    console.log(
      '%s  %s  %s  %s  %s',
      'Stratum'.padEnd(8),
      'R range'.padEnd(18),
      'Particles'.padEnd(10),
      'Expected'.padEnd(10),
      'Deviation'.padEnd(10)
    );

    let maxDeviation = 0;
    for (let s = 0; s < STRATA_COUNT; s++) {
      const rInner = s === 0 ? minRadius : strataOuterRadii[s - 1];
      const rOuter = strataOuterRadii[s];
      const expected = totalParticles / STRATA_COUNT;
      const deviation = ((strataCounts[s] - expected) / expected) * 100;
      maxDeviation = Math.max(maxDeviation, Math.abs(deviation));

      console.log(
        '  #%s    %s  %s    %s      %s%s%',
        String(s + 1).padStart(2, ' '),
        (`${rInner.toFixed(2)}-${rOuter.toFixed(2)}`).padEnd(16),
        String(strataCounts[s]).padStart(6, ' '),
        String(expected.toFixed(1)).padStart(6, ' '),
        deviation >= 0 ? ' +' : ' ',
        deviation.toFixed(2).padStart(6, ' ')
      );
    }

    console.log('----------------------------------------');
    console.log('  Max deviation: %s%', maxDeviation.toFixed(2));
    console.log('  Threshold: 5.00%');
    if (maxDeviation <= 5) {
      console.log('  ✓ PASS - Distribution is uniform ✓');
    } else {
      console.warn('  ✗ FAIL - Deviation exceeds 5% threshold');
    }
    console.log('========================================');
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

    if (!this.frozen) {
      this.rotationY += this.params.rotationSpeed * delta;
      this.group.rotation.y = this.rotationY;
    }

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

  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  isFrozen(): boolean {
    return this.frozen;
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
    const thresholdSq = threshold * threshold;

    for (let i = 0; i < this.params.count; i++) {
      if (i === centerIndex) continue;
      const i3 = i * 3;
      const dx = this.positions[i3] - cx;
      const dy = this.positions[i3 + 1] - cy;
      const dz = this.positions[i3 + 2] - cz;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < thresholdSq) {
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

    if (partial.colorOffset !== undefined && this.colors && this.colorSeeds) {
      for (let i = 0; i < this.params.count; i++) {
        const i3 = i * 3;
        const t = (this.colorSeeds[i] + partial.colorOffset) % 1;
        const color = lerpRGB(COLOR_BLUE_RGB, COLOR_PINK_RGB, t);
        this.colors[i3] = color.r;
        this.colors[i3 + 1] = color.g;
        this.colors[i3 + 2] = color.b;
      }
      const colorAttr = this.geometry?.getAttribute('color') as THREE.BufferAttribute;
      if (colorAttr) colorAttr.needsUpdate = true;
    }
  }

  getParams(): StarFieldParams {
    return { ...this.params };
  }
}
