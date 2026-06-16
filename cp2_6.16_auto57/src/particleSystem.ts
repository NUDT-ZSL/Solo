import * as THREE from 'three';

export type ColorMode = 'distance' | 'velocity';

const PARTICLE_COUNT = 5000;
const SPHERE_RADIUS = 80;
const TRAIL_LENGTH = 5;
const GRAVITY_COEFFICIENT = 0.8;
const REPULSION_COEFFICIENT = 0.3;
const REPULSION_DISTANCE = 2;
const MAX_SPEED = 3;
const GRID_CELL_SIZE = REPULSION_DISTANCE;

const particleVertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha * 0.9);
  }
`;

const trailVertexShader = `
  attribute vec3 color;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

export class ParticleSystem {
  public particles: THREE.Points;
  public trails: THREE.LineSegments;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailAlphas: Float32Array;
  private trailHistory: THREE.Vector3[][];

  private colorMode: ColorMode = 'distance';
  private gravityPosition: THREE.Vector3 = new THREE.Vector3();

  private warmColor = new THREE.Color('#ff6b35');
  private violetColor = new THREE.Color('#7b2ff7');
  private coolColor = new THREE.Color('#00d4ff');
  private lowSpeedColor = new THREE.Color('#00e5ff');
  private highSpeedColor = new THREE.Color('#ff1744');

  private gridMap: Map<string, number[]> = new Map();

  constructor() {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.trailHistory = [];

    this.initializeParticles();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false
    });

    this.particles = new THREE.Points(geometry, material);

    const trailSegmentCount = PARTICLE_COUNT * (TRAIL_LENGTH - 1);
    this.trailPositions = new Float32Array(trailSegmentCount * 2 * 3);
    this.trailColors = new Float32Array(trailSegmentCount * 2 * 3);
    this.trailAlphas = new Float32Array(trailSegmentCount * 2);

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.trailAlphas, 1));

    const trailMaterial = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false
    });

    this.trails = new THREE.LineSegments(trailGeometry, trailMaterial);
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1 / 3) * SPHERE_RADIUS;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      const speed = 0.1 + Math.random() * 0.4;
      const vTheta = Math.random() * Math.PI * 2;
      const vPhi = Math.acos(2 * Math.random() - 1);

      this.velocities[i * 3] = speed * Math.sin(vPhi) * Math.cos(vTheta);
      this.velocities[i * 3 + 1] = speed * Math.sin(vPhi) * Math.sin(vTheta);
      this.velocities[i * 3 + 2] = speed * Math.cos(vPhi);

      this.sizes[i] = 1.5 + Math.random() * 1.5;

      this.trailHistory[i] = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        this.trailHistory[i].push(new THREE.Vector3(x, y, z));
      }
    }
  }

  public setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
  }

  public getColorMode(): ColorMode {
    return this.colorMode;
  }

  public setGravityPosition(pos: THREE.Vector3): void {
    this.gravityPosition.copy(pos);
  }

  public getAverageSpeed(): number {
    let totalSpeed = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const vx = this.velocities[i * 3];
      const vy = this.velocities[i * 3 + 1];
      const vz = this.velocities[i * 3 + 2];
      totalSpeed += Math.sqrt(vx * vx + vy * vy + vz * vz);
    }
    return totalSpeed / PARTICLE_COUNT;
  }

  public getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  public reset(): void {
    this.initializeParticles();
    this.updateColors();
    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.particles.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  private buildSpatialGrid(): void {
    this.gridMap.clear();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const gx = Math.floor(this.positions[i3] / GRID_CELL_SIZE);
      const gy = Math.floor(this.positions[i3 + 1] / GRID_CELL_SIZE);
      const gz = Math.floor(this.positions[i3 + 2] / GRID_CELL_SIZE);
      const key = `${gx},${gy},${gz}`;
      if (!this.gridMap.has(key)) {
        this.gridMap.set(key, []);
      }
      this.gridMap.get(key)!.push(i);
    }
  }

  private getNearbyParticles(i: number): number[] {
    const i3 = i * 3;
    const gx = Math.floor(this.positions[i3] / GRID_CELL_SIZE);
    const gy = Math.floor(this.positions[i3 + 1] / GRID_CELL_SIZE);
    const gz = Math.floor(this.positions[i3 + 2] / GRID_CELL_SIZE);

    const nearby: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = this.gridMap.get(key);
          if (cell) {
            for (const j of cell) {
              if (j !== i) {
                nearby.push(j);
              }
            }
          }
        }
      }
    }
    return nearby;
  }

  private updateColors(): void {
    let maxDistance = 0;
    let maxSpeed = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = this.positions[i * 3];
      const py = this.positions[i * 3 + 1];
      const pz = this.positions[i * 3 + 2];
      const dx = px - this.gravityPosition.x;
      const dy = py - this.gravityPosition.y;
      const dz = pz - this.gravityPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxDistance = Math.max(maxDistance, distance);

      const vx = this.velocities[i * 3];
      const vy = this.velocities[i * 3 + 1];
      const vz = this.velocities[i * 3 + 2];
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      maxSpeed = Math.max(maxSpeed, speed);
    }

    maxDistance = Math.max(maxDistance, 1);
    maxSpeed = Math.max(maxSpeed, 0.01);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let color: THREE.Color;

      if (this.colorMode === 'distance') {
        const px = this.positions[i * 3];
        const py = this.positions[i * 3 + 1];
        const pz = this.positions[i * 3 + 2];
        const dx = px - this.gravityPosition.x;
        const dy = py - this.gravityPosition.y;
        const dz = pz - this.gravityPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const t = Math.min(distance / maxDistance, 1);

        if (t < 0.5) {
          color = this.warmColor.clone().lerp(this.violetColor, t * 2);
        } else {
          color = this.violetColor.clone().lerp(this.coolColor, (t - 0.5) * 2);
        }
      } else {
        const vx = this.velocities[i * 3];
        const vy = this.velocities[i * 3 + 1];
        const vz = this.velocities[i * 3 + 2];
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const t = Math.min(speed / maxSpeed, 1);
        color = this.lowSpeedColor.clone().lerp(this.highSpeedColor, t);
      }

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    this.buildSpatialGrid();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const dx = this.gravityPosition.x - px;
      const dy = this.gravityPosition.y - py;
      const dz = this.gravityPosition.z - pz;

      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq) + 0.001;

      const gravityForce = GRAVITY_COEFFICIENT / Math.max(distSq, 1);
      this.velocities[i3] += (dx / dist) * gravityForce * dt;
      this.velocities[i3 + 1] += (dy / dist) * gravityForce * dt;
      this.velocities[i3 + 2] += (dz / dist) * gravityForce * dt;

      let repX = 0, repY = 0, repZ = 0;
      const nearby = this.getNearbyParticles(i);

      for (const j of nearby) {
        const j3 = j * 3;
        const rdx = px - this.positions[j3];
        const rdy = py - this.positions[j3 + 1];
        const rdz = pz - this.positions[j3 + 2];
        const rDistSq = rdx * rdx + rdy * rdy + rdz * rdz;

        if (rDistSq < REPULSION_DISTANCE * REPULSION_DISTANCE && rDistSq > 0.0001) {
          const rDist = Math.sqrt(rDistSq);
          const force = REPULSION_COEFFICIENT * (1 - rDist / REPULSION_DISTANCE) / rDist;
          repX += rdx * force;
          repY += rdy * force;
          repZ += rdz * force;
        }
      }

      this.velocities[i3] += repX * dt;
      this.velocities[i3 + 1] += repY * dt;
      this.velocities[i3 + 2] += repZ * dt;

      const speedSq = this.velocities[i3] ** 2 + this.velocities[i3 + 1] ** 2 + this.velocities[i3 + 2] ** 2;
      if (speedSq > MAX_SPEED * MAX_SPEED) {
        const speed = Math.sqrt(speedSq);
        this.velocities[i3] = (this.velocities[i3] / speed) * MAX_SPEED;
        this.velocities[i3 + 1] = (this.velocities[i3 + 1] / speed) * MAX_SPEED;
        this.velocities[i3 + 2] = (this.velocities[i3 + 2] / speed) * MAX_SPEED;
      }

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      const history = this.trailHistory[i];
      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        history[t].copy(history[t - 1]);
      }
      history[0].set(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
    }

    this.updateColors();
    this.updateTrails();

    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.particles.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.trails.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trails.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.trails.geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateTrails(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const history = this.trailHistory[i];
      const colorR = this.colors[i * 3];
      const colorG = this.colors[i * 3 + 1];
      const colorB = this.colors[i * 3 + 2];

      for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
        const segmentIndex = (i * (TRAIL_LENGTH - 1) + t) * 2;
        const posIndex = segmentIndex * 3;
        const alphaIndex = segmentIndex;

        const p1 = history[t];
        const p2 = history[t + 1];

        this.trailPositions[posIndex] = p1.x;
        this.trailPositions[posIndex + 1] = p1.y;
        this.trailPositions[posIndex + 2] = p1.z;

        this.trailPositions[posIndex + 3] = p2.x;
        this.trailPositions[posIndex + 4] = p2.y;
        this.trailPositions[posIndex + 5] = p2.z;

        this.trailColors[posIndex] = colorR;
        this.trailColors[posIndex + 1] = colorG;
        this.trailColors[posIndex + 2] = colorB;

        this.trailColors[posIndex + 3] = colorR;
        this.trailColors[posIndex + 4] = colorG;
        this.trailColors[posIndex + 5] = colorB;

        const alpha1 = 0.5 - t * 0.08;
        const alpha2 = 0.5 - (t + 1) * 0.08;

        this.trailAlphas[alphaIndex] = Math.max(alpha1, 0.1);
        this.trailAlphas[alphaIndex + 1] = Math.max(alpha2, 0.1);
      }
    }
  }
}
