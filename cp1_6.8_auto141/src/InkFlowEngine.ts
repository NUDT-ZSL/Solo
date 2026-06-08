import * as THREE from 'three';

const INK_LEVELS = [
  { name: '焦', color: new THREE.Color(0x1a1a1a), size: 3.5, opacity: 0.95 },
  { name: '浓', color: new THREE.Color(0x3a3a3a), size: 4.0, opacity: 0.82 },
  { name: '重', color: new THREE.Color(0x5a5a5a), size: 4.8, opacity: 0.65 },
  { name: '淡', color: new THREE.Color(0x8a8a8a), size: 5.8, opacity: 0.45 },
  { name: '清', color: new THREE.Color(0xb0b0b0), size: 7.0, opacity: 0.28 },
];

const MAX_INK = 30000;
const MAX_GOLD = 1500;
const MAX_EXPLOSION = 5000;

interface Vortex {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  lifetime: number;
  age: number;
}

export interface ParticleClickInfo {
  concentration: number;
  spreadSpeed: number;
  colorDepth: number;
  position: THREE.Vector3;
  inkName: string;
}

export type EngineEventCallback = (data?: unknown) => void;

export class InkFlowEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private inkPositions: Float32Array;
  private inkVelocities: Float32Array;
  private inkLives: Float32Array;
  private inkMaxLives: Float32Array;
  private inkSizes: Float32Array;
  private inkBaseSizes: Float32Array;
  private inkOpacities: Float32Array;
  private inkColors: Float32Array;
  private inkLevels: Uint8Array;
  private inkActive: Uint8Array;
  private inkCount = 0;

  private goldPositions: Float32Array;
  private goldVelocities: Float32Array;
  private goldSizes: Float32Array;
  private goldOpacities: Float32Array;
  private goldColors: Float32Array;
  private goldActive: Uint8Array;
  private goldCount = 0;

  private explosionPositions: Float32Array;
  private explosionVelocities: Float32Array;
  private explosionLives: Float32Array;
  private explosionMaxLives: Float32Array;
  private explosionSizes: Float32Array;
  private explosionOpacities: Float32Array;
  private explosionColors: Float32Array;
  private explosionActive: Uint8Array;
  private explosionCount = 0;

  private inkGeometry: THREE.BufferGeometry;
  private inkMaterial: THREE.ShaderMaterial;
  private inkPoints: THREE.Points;

  private goldGeometry: THREE.BufferGeometry;
  private goldMaterial: THREE.ShaderMaterial;
  private goldPoints: THREE.Points;

  private explosionGeometry: THREE.BufferGeometry;
  private explosionMaterial: THREE.ShaderMaterial;
  private explosionPoints: THREE.Points;

  private vortexes: Vortex[] = [];
  private vortexTimer = 0;

  private flowSpeed = 0.3;
  private inkAmount = 0.5;
  private spreadRadius = 1.0;

  private spawnTimer = 0;
  private clock = new THREE.Clock();

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private clickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private eventListeners: Map<string, EngineEventCallback[]> = new Map();

  private inkVertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 aColor;
    varying float vOpacity;
    varying vec3 vColor;
    void main() {
      vOpacity = aOpacity;
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private inkFragmentShader = `
    varying float vOpacity;
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.15, d) * vOpacity;
      vec3 col = vColor * (1.0 + 0.1 * smoothstep(0.3, 0.0, d));
      gl_FragColor = vec4(col, alpha);
    }
  `;

  private goldVertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 aColor;
    varying float vOpacity;
    varying vec3 vColor;
    void main() {
      vOpacity = aOpacity;
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (200.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private goldFragmentShader = `
    varying float vOpacity;
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.2, d) * vOpacity;
      float glow = exp(-d * 6.0) * 0.5;
      gl_FragColor = vec4(vColor + glow, alpha);
    }
  `;

  private explosionVertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 aColor;
    varying float vOpacity;
    varying vec3 vColor;
    void main() {
      vOpacity = aOpacity;
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private explosionFragmentShader = `
    varying float vOpacity;
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.inkPositions = new Float32Array(MAX_INK * 3);
    this.inkVelocities = new Float32Array(MAX_INK * 3);
    this.inkLives = new Float32Array(MAX_INK);
    this.inkMaxLives = new Float32Array(MAX_INK);
    this.inkSizes = new Float32Array(MAX_INK);
    this.inkBaseSizes = new Float32Array(MAX_INK);
    this.inkOpacities = new Float32Array(MAX_INK);
    this.inkColors = new Float32Array(MAX_INK * 3);
    this.inkLevels = new Uint8Array(MAX_INK);
    this.inkActive = new Uint8Array(MAX_INK);

    this.goldPositions = new Float32Array(MAX_GOLD * 3);
    this.goldVelocities = new Float32Array(MAX_GOLD * 3);
    this.goldSizes = new Float32Array(MAX_GOLD);
    this.goldOpacities = new Float32Array(MAX_GOLD);
    this.goldColors = new Float32Array(MAX_GOLD * 3);
    this.goldActive = new Uint8Array(MAX_GOLD);

    this.explosionPositions = new Float32Array(MAX_EXPLOSION * 3);
    this.explosionVelocities = new Float32Array(MAX_EXPLOSION * 3);
    this.explosionLives = new Float32Array(MAX_EXPLOSION);
    this.explosionMaxLives = new Float32Array(MAX_EXPLOSION);
    this.explosionSizes = new Float32Array(MAX_EXPLOSION);
    this.explosionOpacities = new Float32Array(MAX_EXPLOSION);
    this.explosionColors = new Float32Array(MAX_EXPLOSION * 3);
    this.explosionActive = new Uint8Array(MAX_EXPLOSION);

    this.inkGeometry = new THREE.BufferGeometry();
    this.inkGeometry.setAttribute('position', new THREE.BufferAttribute(this.inkPositions, 3));
    this.inkGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.inkSizes, 1));
    this.inkGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.inkOpacities, 1));
    this.inkGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.inkColors, 3));
    this.inkGeometry.setDrawRange(0, 0);

    this.inkMaterial = new THREE.ShaderMaterial({
      vertexShader: this.inkVertexShader,
      fragmentShader: this.inkFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.inkPoints = new THREE.Points(this.inkGeometry, this.inkMaterial);
    this.inkPoints.frustumCulled = false;
    this.scene.add(this.inkPoints);

    this.goldGeometry = new THREE.BufferGeometry();
    this.goldGeometry.setAttribute('position', new THREE.BufferAttribute(this.goldPositions, 3));
    this.goldGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.goldSizes, 1));
    this.goldGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.goldOpacities, 1));
    this.goldGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.goldColors, 3));
    this.goldGeometry.setDrawRange(0, 0);

    this.goldMaterial = new THREE.ShaderMaterial({
      vertexShader: this.goldVertexShader,
      fragmentShader: this.goldFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.goldPoints = new THREE.Points(this.goldGeometry, this.goldMaterial);
    this.goldPoints.frustumCulled = false;
    this.scene.add(this.goldPoints);

    this.explosionGeometry = new THREE.BufferGeometry();
    this.explosionGeometry.setAttribute('position', new THREE.BufferAttribute(this.explosionPositions, 3));
    this.explosionGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.explosionSizes, 1));
    this.explosionGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.explosionOpacities, 1));
    this.explosionGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.explosionColors, 3));
    this.explosionGeometry.setDrawRange(0, 0);

    this.explosionMaterial = new THREE.ShaderMaterial({
      vertexShader: this.explosionVertexShader,
      fragmentShader: this.explosionFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.explosionPoints = new THREE.Points(this.explosionGeometry, this.explosionMaterial);
    this.explosionPoints.frustumCulled = false;
    this.scene.add(this.explosionPoints);

    this.initGoldParticles();
  }

  private initGoldParticles(): void {
    for (let i = 0; i < MAX_GOLD; i++) {
      const i3 = i * 3;
      this.goldPositions[i3] = (Math.random() - 0.5) * 40;
      this.goldPositions[i3 + 1] = (Math.random() - 0.5) * 40;
      this.goldPositions[i3 + 2] = (Math.random() - 0.5) * 10;

      this.goldVelocities[i3] = (Math.random() - 0.5) * 0.02;
      this.goldVelocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      this.goldVelocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      this.goldSizes[i] = 0.5 + Math.random() * 1.5;
      this.goldOpacities[i] = 0.2 + Math.random() * 0.5;

      const goldHue = 0.1 + Math.random() * 0.05;
      const goldColor = new THREE.Color().setHSL(goldHue, 0.8, 0.6 + Math.random() * 0.2);
      this.goldColors[i3] = goldColor.r;
      this.goldColors[i3 + 1] = goldColor.g;
      this.goldColors[i3 + 2] = goldColor.b;

      this.goldActive[i] = 1;
    }
    this.goldCount = MAX_GOLD;
    this.goldGeometry.setDrawRange(0, this.goldCount);
  }

  private findFreeInkSlot(): number {
    for (let i = 0; i < MAX_INK; i++) {
      if (!this.inkActive[i]) return i;
    }
    return -1;
  }

  private findFreeExplosionSlot(): number {
    for (let i = 0; i < MAX_EXPLOSION; i++) {
      if (!this.explosionActive[i]) return i;
    }
    return -1;
  }

  spawnInkParticle(origin?: THREE.Vector3): void {
    const slot = this.findFreeInkSlot();
    if (slot === -1) return;

    const i3 = slot * 3;
    const level = Math.floor(Math.random() * INK_LEVELS.length);
    const ink = INK_LEVELS[level];

    if (origin) {
      this.inkPositions[i3] = origin.x + (Math.random() - 0.5) * 0.5;
      this.inkPositions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.5;
      this.inkPositions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.2;
    } else {
      this.inkPositions[i3] = (Math.random() - 0.5) * 30;
      this.inkPositions[i3 + 1] = (Math.random() - 0.5) * 30;
      this.inkPositions[i3 + 2] = (Math.random() - 0.5) * 5;
    }

    const speed = this.flowSpeed * 0.5;
    const angle = Math.random() * Math.PI * 2;
    this.inkVelocities[i3] = Math.cos(angle) * speed * (0.3 + Math.random() * 0.7);
    this.inkVelocities[i3 + 1] = Math.sin(angle) * speed * (0.3 + Math.random() * 0.7);
    this.inkVelocities[i3 + 2] = (Math.random() - 0.5) * speed * 0.2;

    this.inkLives[slot] = 1.0;
    this.inkMaxLives[slot] = 8 + Math.random() * 12;
    this.inkBaseSizes[slot] = ink.size * (0.6 + Math.random() * 0.8);
    this.inkSizes[slot] = this.inkBaseSizes[slot] * 0.3;
    this.inkOpacities[slot] = ink.opacity;
    this.inkColors[i3] = ink.color.r;
    this.inkColors[i3 + 1] = ink.color.g;
    this.inkColors[i3 + 2] = ink.color.b;
    this.inkLevels[slot] = level;
    this.inkActive[slot] = 1;

    if (slot >= this.inkCount) {
      this.inkCount = slot + 1;
    }
  }

  triggerExplosion(worldPos: THREE.Vector3): ParticleClickInfo | null {
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.inkCount; i++) {
      if (!this.inkActive[i]) continue;
      const i3 = i * 3;
      const dx = this.inkPositions[i3] - worldPos.x;
      const dy = this.inkPositions[i3 + 1] - worldPos.y;
      const dz = this.inkPositions[i3 + 2] - worldPos.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestIdx === -1) return null;

    const ci3 = closestIdx * 3;
    const clickPos = new THREE.Vector3(
      this.inkPositions[ci3],
      this.inkPositions[ci3 + 1],
      this.inkPositions[ci3 + 2]
    );

    const explosionRadius = 3 * this.spreadRadius;

    for (let i = 0; i < this.inkCount; i++) {
      if (!this.inkActive[i]) continue;
      const i3 = i * 3;
      const dx = this.inkPositions[i3] - clickPos.x;
      const dy = this.inkPositions[i3 + 1] - clickPos.y;
      const dz = this.inkPositions[i3 + 2] - clickPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < explosionRadius) {
        const force = (1 - dist / explosionRadius) * 2 * this.spreadRadius;
        const invDist = dist > 0.001 ? 1 / dist : 1;
        this.inkVelocities[i3] += dx * invDist * force;
        this.inkVelocities[i3 + 1] += dy * invDist * force;
        this.inkVelocities[i3 + 2] += dz * invDist * force;
        this.inkOpacities[i] *= 0.6;
      }
    }

    const numExpParticles = 80 + Math.floor(Math.random() * 60);
    for (let p = 0; p < numExpParticles; p++) {
      const slot = this.findFreeExplosionSlot();
      if (slot === -1) break;

      const s3 = slot * 3;
      this.explosionPositions[s3] = clickPos.x;
      this.explosionPositions[s3 + 1] = clickPos.y;
      this.explosionPositions[s3 + 2] = clickPos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.5 + Math.random() * 3;
      this.explosionVelocities[s3] = Math.sin(phi) * Math.cos(theta) * speed;
      this.explosionVelocities[s3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      this.explosionVelocities[s3 + 2] = Math.cos(phi) * speed;

      this.explosionLives[slot] = 1.0;
      this.explosionMaxLives[slot] = 1 + Math.random() * 2;
      this.explosionSizes[slot] = 2 + Math.random() * 4;
      this.explosionOpacities[slot] = 0.8 + Math.random() * 0.2;

      const level = this.inkLevels[closestIdx];
      const ink = INK_LEVELS[level];
      this.explosionColors[s3] = ink.color.r;
      this.explosionColors[s3 + 1] = ink.color.g;
      this.explosionColors[s3 + 2] = ink.color.b;
      this.explosionActive[slot] = 1;

      if (slot >= this.explosionCount) {
        this.explosionCount = slot + 1;
      }
    }

    const level = this.inkLevels[closestIdx];
    const ink = INK_LEVELS[level];
    const vx = this.inkVelocities[ci3];
    const vy = this.inkVelocities[ci3 + 1];
    const vz = this.inkVelocities[ci3 + 2];
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

    return {
      concentration: ink.opacity * this.inkLives[closestIdx],
      spreadSpeed: speed,
      colorDepth: 1 - level / (INK_LEVELS.length - 1),
      position: clickPos.clone(),
      inkName: ink.name,
    };
  }

  private spawnVortex(): void {
    this.vortexes.push({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 4
      ),
      strength: 0.3 + Math.random() * 0.7,
      radius: 2 + Math.random() * 3,
      lifetime: 3 + Math.random() * 5,
      age: 0,
    });
  }

  private applyVortexForces(dt: number): void {
    for (const vortex of this.vortexes) {
      vortex.age += dt;
      const ageRatio = vortex.age / vortex.lifetime;
      const fade = ageRatio < 0.2 ? ageRatio / 0.2 : ageRatio > 0.7 ? (1 - ageRatio) / 0.3 : 1;

      for (let i = 0; i < this.inkCount; i++) {
        if (!this.inkActive[i]) continue;
        const i3 = i * 3;
        const dx = this.inkPositions[i3] - vortex.position.x;
        const dy = this.inkPositions[i3 + 1] - vortex.position.y;
        const dz = this.inkPositions[i3 + 2] - vortex.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < vortex.radius && dist > 0.01) {
          const invDist = 1 / dist;
          const force = vortex.strength * fade * (1 - dist / vortex.radius) * dt;

          this.inkVelocities[i3] += (-dy * invDist * force + dx * invDist * force * 0.3);
          this.inkVelocities[i3 + 1] += (dx * invDist * force + dy * invDist * force * 0.3);
          this.inkVelocities[i3 + 2] += dz * invDist * force * 0.1;
        }
      }
    }

    this.vortexes = this.vortexes.filter(v => v.age < v.lifetime);
  }

  update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.spawnTimer += dt;
    const spawnInterval = 0.02 / (this.inkAmount + 0.1);
    while (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval;
      const count = Math.ceil(this.inkAmount * 3);
      for (let c = 0; c < count; c++) {
        this.spawnInkParticle();
      }
    }

    this.vortexTimer += dt;
    if (this.vortexTimer > 4 + Math.random() * 6) {
      this.vortexTimer = 0;
      this.spawnVortex();
    }

    this.applyVortexForces(dt);

    let inkDrawCount = 0;
    for (let i = 0; i < this.inkCount; i++) {
      if (!this.inkActive[i]) continue;
      const i3 = i * 3;

      this.inkLives[i] -= dt / this.inkMaxLives[i];
      if (this.inkLives[i] <= 0) {
        this.inkActive[i] = 0;
        continue;
      }

      const lifeRatio = 1 - this.inkLives[i];

      this.inkPositions[i3] += this.inkVelocities[i3] * dt;
      this.inkPositions[i3 + 1] += this.inkVelocities[i3 + 1] * dt;
      this.inkPositions[i3 + 2] += this.inkVelocities[i3 + 2] * dt;

      this.inkVelocities[i3] *= 0.995;
      this.inkVelocities[i3 + 1] *= 0.995;
      this.inkVelocities[i3 + 2] *= 0.995;

      const drift = this.flowSpeed * 0.01;
      this.inkVelocities[i3] += (Math.random() - 0.5) * drift;
      this.inkVelocities[i3 + 1] += (Math.random() - 0.5) * drift;

      this.inkSizes[i] = this.inkBaseSizes[i] * (0.3 + lifeRatio * 2.5 * this.spreadRadius);
      this.inkOpacities[i] = INK_LEVELS[this.inkLevels[i]].opacity * (1 - lifeRatio * 0.8);

      inkDrawCount = i + 1;
    }

    for (let i = 0; i < this.goldCount; i++) {
      if (!this.goldActive[i]) continue;
      const i3 = i * 3;

      this.goldPositions[i3] += this.goldVelocities[i3];
      this.goldPositions[i3 + 1] += this.goldVelocities[i3 + 1];
      this.goldPositions[i3 + 2] += this.goldVelocities[i3 + 2];

      this.goldOpacities[i] = 0.15 + 0.3 * Math.sin(Date.now() * 0.001 + i * 0.5);

      if (Math.abs(this.goldPositions[i3]) > 20) this.goldVelocities[i3] *= -1;
      if (Math.abs(this.goldPositions[i3 + 1]) > 20) this.goldVelocities[i3 + 1] *= -1;
      if (Math.abs(this.goldPositions[i3 + 2]) > 5) this.goldVelocities[i3 + 2] *= -1;
    }

    let expDrawCount = 0;
    for (let i = 0; i < this.explosionCount; i++) {
      if (!this.explosionActive[i]) continue;
      const i3 = i * 3;

      this.explosionLives[i] -= dt / this.explosionMaxLives[i];
      if (this.explosionLives[i] <= 0) {
        this.explosionActive[i] = 0;
        continue;
      }

      const lifeRatio = 1 - this.explosionLives[i];

      this.explosionPositions[i3] += this.explosionVelocities[i3] * dt;
      this.explosionPositions[i3 + 1] += this.explosionVelocities[i3 + 1] * dt;
      this.explosionPositions[i3 + 2] += this.explosionVelocities[i3 + 2] * dt;

      this.explosionVelocities[i3] *= 0.96;
      this.explosionVelocities[i3 + 1] *= 0.96;
      this.explosionVelocities[i3 + 2] *= 0.96;

      this.explosionSizes[i] = (2 + lifeRatio * 5) * this.spreadRadius;
      this.explosionOpacities[i] = (1 - lifeRatio) * 0.8;

      expDrawCount = i + 1;
    }

    this.inkGeometry.attributes.position.needsUpdate = true;
    this.inkGeometry.attributes.aSize.needsUpdate = true;
    this.inkGeometry.attributes.aOpacity.needsUpdate = true;
    this.inkGeometry.attributes.aColor.needsUpdate = true;
    this.inkGeometry.setDrawRange(0, inkDrawCount);

    this.goldGeometry.attributes.position.needsUpdate = true;
    this.goldGeometry.attributes.aOpacity.needsUpdate = true;
    this.goldGeometry.setDrawRange(0, this.goldCount);

    this.explosionGeometry.attributes.position.needsUpdate = true;
    this.explosionGeometry.attributes.aSize.needsUpdate = true;
    this.explosionGeometry.attributes.aOpacity.needsUpdate = true;
    this.explosionGeometry.attributes.aColor.needsUpdate = true;
    this.explosionGeometry.setDrawRange(0, expDrawCount);
  }

  handleClick(event: MouseEvent, container: HTMLElement): ParticleClickInfo | null {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.clickPlane, intersectPoint);

    if (intersectPoint) {
      return this.triggerExplosion(intersectPoint);
    }
    return null;
  }

  setFlowSpeed(val: number): void {
    this.flowSpeed = val;
  }

  setInkAmount(val: number): void {
    this.inkAmount = val;
  }

  setSpreadRadius(val: number): void {
    this.spreadRadius = val;
  }

  reset(): void {
    this.inkActive.fill(0);
    this.explosionActive.fill(0);
    this.inkCount = 0;
    this.explosionCount = 0;
    this.vortexes = [];
    this.inkGeometry.setDrawRange(0, 0);
    this.explosionGeometry.setDrawRange(0, 0);
  }

  on(event: string, callback: EngineEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const cb of listeners) cb(data);
    }
  }

  dispose(): void {
    this.inkGeometry.dispose();
    this.inkMaterial.dispose();
    this.goldGeometry.dispose();
    this.goldMaterial.dispose();
    this.explosionGeometry.dispose();
    this.explosionMaterial.dispose();
    this.scene.remove(this.inkPoints);
    this.scene.remove(this.goldPoints);
    this.scene.remove(this.explosionPoints);
  }
}
