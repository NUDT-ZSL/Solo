import * as THREE from 'three';

export interface TidalConfig {
  particleCount: number;
  tidalSpeed: number;
  connectionDistance: number;
}

const MAX_PARTICLES = 3000;
const MAX_LINE_VERTICES = 80000;
const SPREAD_X = 50;
const SPREAD_Y = 12;
const SPREAD_Z = 50;

const COLOR_DEEP = { r: 0.04, g: 0.60, b: 0.54 };
const COLOR_MID = { r: 0.10, g: 0.54, b: 0.80 };
const COLOR_WARM = { r: 0.83, g: 0.63, b: 0.19 };

function lerpColor(t: number): { r: number; g: number; b: number } {
  const tc = Math.max(0, Math.min(1, t));
  if (tc < 0.5) {
    const s = tc * 2;
    return {
      r: COLOR_DEEP.r + (COLOR_MID.r - COLOR_DEEP.r) * s,
      g: COLOR_DEEP.g + (COLOR_MID.g - COLOR_DEEP.g) * s,
      b: COLOR_DEEP.b + (COLOR_MID.b - COLOR_DEEP.b) * s,
    };
  }
  const s = (tc - 0.5) * 2;
  return {
    r: COLOR_MID.r + (COLOR_WARM.r - COLOR_MID.r) * s,
    g: COLOR_MID.g + (COLOR_WARM.g - COLOR_MID.g) * s,
    b: COLOR_MID.b + (COLOR_WARM.b - COLOR_MID.b) * s,
  };
}

export class TidalNetwork {
  scene: THREE.Scene;
  config: TidalConfig;

  positions: Float32Array;
  basePositions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  particleCount: number;

  pointsMesh: THREE.Points;
  linesMesh: THREE.LineSegments;
  pointsGeometry: THREE.BufferGeometry;
  linesGeometry: THREE.BufferGeometry;
  linePositions: Float32Array;
  lineColors: Float32Array;

  private grid: Map<string, number[]>;
  time: number;

  constructor(scene: THREE.Scene, config: TidalConfig) {
    this.scene = scene;
    this.config = { ...config };
    this.particleCount = config.particleCount;
    this.time = 0;
    this.grid = new Map();

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.basePositions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.linePositions = new Float32Array(MAX_LINE_VERTICES * 3);
    this.lineColors = new Float32Array(MAX_LINE_VERTICES * 3);

    this.initParticles();
    this.createPointsMesh();
    this.createLinesMesh();
  }

  private initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * SPREAD_X;
      const y = (Math.random() - 0.5) * SPREAD_Y;
      const z = (Math.random() - 0.5) * SPREAD_Z;

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      const t = (y + SPREAD_Y / 2) / SPREAD_Y;
      const c = lerpColor(t);
      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;

      this.sizes[i] = 1.5 + Math.random() * 2.0;
    }
  }

  private createPointsMesh() {
    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.pointsGeometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(this.colors, 3)
    );
    this.pointsGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.sizes, 1)
    );
    this.pointsGeometry.setDrawRange(0, this.particleCount);

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (280.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          alpha = pow(alpha, 1.5);
          gl_FragColor = vec4(vColor * (1.0 + alpha * 0.4), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeometry, material);
    this.scene.add(this.pointsMesh);
  }

  private createLinesMesh() {
    this.linesGeometry = new THREE.BufferGeometry();
    this.linesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.linePositions, 3)
    );
    this.linesGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.lineColors, 3)
    );
    this.linesGeometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.linesMesh = new THREE.LineSegments(this.linesGeometry, material);
    this.scene.add(this.linesMesh);
  }

  update(delta: number) {
    this.time += delta * this.config.tidalSpeed;
    this.updateTidal();
    this.updateConnections();
    this.pointsGeometry.attributes.position.needsUpdate = true;
    this.pointsGeometry.attributes.aColor.needsUpdate = true;
    this.linesGeometry.attributes.position.needsUpdate = true;
    this.linesGeometry.attributes.color.needsUpdate = true;
  }

  private updateTidal() {
    const springK = 0.025;
    const damping = 0.92;
    const t = this.time;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const bx = this.basePositions[i3];
      const by = this.basePositions[i3 + 1];
      const bz = this.basePositions[i3 + 2];

      const wave1 =
        Math.sin(bx * 0.12 + t * 0.8) * Math.cos(bz * 0.1 + t * 0.5) * 2.5;
      const wave2 = Math.sin(bx * 0.08 - t * 0.3 + bz * 0.06) * 1.5;
      const wave3 = Math.cos(bz * 0.15 + t * 0.6) * 1.0;
      const tidalY = wave1 + wave2 + wave3;

      const tidalX = Math.sin(by * 0.2 + t * 0.4) * 0.5;
      const tidalZ = Math.cos(bx * 0.1 + t * 0.3) * 0.5;

      const tx = bx + tidalX;
      const ty = by + tidalY;
      const tz = bz + tidalZ;

      this.velocities[i3] += (tx - this.positions[i3]) * springK;
      this.velocities[i3 + 1] += (ty - this.positions[i3 + 1]) * springK;
      this.velocities[i3 + 2] += (tz - this.positions[i3 + 2]) * springK;

      this.velocities[i3] *= damping;
      this.velocities[i3 + 1] *= damping;
      this.velocities[i3 + 2] *= damping;

      this.positions[i3] += this.velocities[i3];
      this.positions[i3 + 1] += this.velocities[i3 + 1];
      this.positions[i3 + 2] += this.velocities[i3 + 2];

      const currentY = this.positions[i3 + 1];
      const normalizedY = (currentY + SPREAD_Y / 2) / SPREAD_Y;
      const brightness =
        0.65 + 0.35 * Math.sin(t * 1.2 + bx * 0.1 + bz * 0.1);

      const c = lerpColor(normalizedY);
      this.colors[i3] = c.r * brightness;
      this.colors[i3 + 1] = c.g * brightness;
      this.colors[i3 + 2] = c.b * brightness;
    }
  }

  private buildGrid() {
    this.grid.clear();
    const cs = this.config.connectionDistance;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const cx = Math.floor(this.positions[i3] / cs);
      const cy = Math.floor(this.positions[i3 + 1] / cs);
      const cz = Math.floor(this.positions[i3 + 2] / cs);
      const key = `${cx},${cy},${cz}`;
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(i);
    }
  }

  private updateConnections() {
    this.buildGrid();
    const dist = this.config.connectionDistance;
    const dist2 = dist * dist;
    let lineIdx = 0;

    for (let i = 0; i < this.particleCount && lineIdx < MAX_LINE_VERTICES - 2; i++) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const cx = Math.floor(px / dist);
      const cy = Math.floor(py / dist);
      const cz = Math.floor(pz / dist);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const cell = this.grid.get(key);
            if (!cell) continue;

            for (let ci = 0; ci < cell.length; ci++) {
              const j = cell[ci];
              if (j <= i) continue;
              if (lineIdx >= MAX_LINE_VERTICES - 2) break;

              const j3 = j * 3;
              const ddx = this.positions[j3] - px;
              const ddy = this.positions[j3 + 1] - py;
              const ddz = this.positions[j3 + 2] - pz;
              const d2 = ddx * ddx + ddy * ddy + ddz * ddz;

              if (d2 < dist2) {
                const alpha = 1.0 - Math.sqrt(d2) / dist;
                const li = lineIdx * 3;

                this.linePositions[li] = px;
                this.linePositions[li + 1] = py;
                this.linePositions[li + 2] = pz;

                this.linePositions[li + 3] = this.positions[j3];
                this.linePositions[li + 4] = this.positions[j3 + 1];
                this.linePositions[li + 5] = this.positions[j3 + 2];

                const avgR = (this.colors[i3] + this.colors[j3]) * 0.5;
                const avgG = (this.colors[i3 + 1] + this.colors[j3 + 1]) * 0.5;
                const avgB = (this.colors[i3 + 2] + this.colors[j3 + 2]) * 0.5;

                this.lineColors[li] = avgR * alpha;
                this.lineColors[li + 1] = avgG * alpha;
                this.lineColors[li + 2] = avgB * alpha;
                this.lineColors[li + 3] = avgR * alpha;
                this.lineColors[li + 4] = avgG * alpha;
                this.lineColors[li + 5] = avgB * alpha;

                lineIdx += 2;
              }
            }
          }
        }
      }
    }

    this.linesGeometry.setDrawRange(0, lineIdx);
  }

  applyVortex(
    worldX: number,
    worldY: number,
    worldZ: number,
    radius: number,
    strength: number
  ) {
    const r2 = radius * radius;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const dx = this.positions[i3] - worldX;
      const dy = this.positions[i3 + 1] - worldY;
      const dz = this.positions[i3 + 2] - worldZ;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2 || d2 < 0.01) continue;

      const d = Math.sqrt(d2);
      const falloff = 1.0 - d / radius;
      const s = strength * falloff;

      const nx = dx / d;
      const nz = dz / d;

      this.velocities[i3] += (-nz * s + nx * s * 0.15);
      this.velocities[i3 + 1] += s * 0.3 * falloff;
      this.velocities[i3 + 2] += (nx * s + nz * s * 0.15);
    }
  }

  applyRipple(
    worldX: number,
    worldY: number,
    worldZ: number,
    ringRadius: number,
    width: number,
    strength: number
  ) {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const dx = this.positions[i3] - worldX;
      const dz = this.positions[i3 + 2] - worldZ;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      const distToRing = Math.abs(horizontalDist - ringRadius);
      if (distToRing > width) continue;

      const falloff = 1.0 - distToRing / width;
      const s = strength * falloff;

      if (horizontalDist > 0.01) {
        const nx = dx / horizontalDist;
        const nz = dz / horizontalDist;
        this.velocities[i3] += nx * s;
        this.velocities[i3 + 1] += s * 0.5 * falloff;
        this.velocities[i3 + 2] += nz * s;
      } else {
        this.velocities[i3 + 1] += s * 0.5;
      }
    }
  }

  setParticleCount(count: number) {
    this.particleCount = count;
    this.config.particleCount = count;
    this.initParticles();
    this.pointsGeometry.attributes.aSize.needsUpdate = true;
    this.pointsGeometry.setDrawRange(0, count);
  }

  setConnectionDistance(dist: number) {
    this.config.connectionDistance = dist;
  }

  setTidalSpeed(speed: number) {
    this.config.tidalSpeed = speed;
  }

  resetLayout() {
    this.initParticles();
    this.time = 0;
  }

  dispose() {
    this.pointsMesh.geometry.dispose();
    (this.pointsMesh.material as THREE.Material).dispose();
    this.linesMesh.geometry.dispose();
    (this.linesMesh.material as THREE.Material).dispose();
    this.scene.remove(this.pointsMesh);
    this.scene.remove(this.linesMesh);
  }
}
