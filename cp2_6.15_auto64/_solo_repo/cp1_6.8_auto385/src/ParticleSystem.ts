import * as THREE from 'three';

interface ConstellationData {
  name: string;
  stars: THREE.Vector3[];
  connections: [number, number][];
}

interface TrailPoint {
  position: THREE.Vector3;
  age: number;
}

const MAX_PARTICLES = 5000;
const MAX_TRAIL = 80;

const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 40.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragmentShader = `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.12, d);
    vec3 warmWhite = vec3(1.0, 0.95, 0.85);
    vec3 col = mix(warmWhite * 0.5, warmWhite, core);
    gl_FragColor = vec4(col, glow * vAlpha * 0.75);
  }
`;

const trailVertexShader = `
  attribute float aTrailAlpha;
  varying float vTrailAlpha;
  void main() {
    vTrailAlpha = aTrailAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trailFragmentShader = `
  varying float vTrailAlpha;
  void main() {
    gl_FragColor = vec4(0.45, 0.55, 1.0, vTrailAlpha * 0.5);
  }
`;

const constellationStarVS = `
  attribute float aCSize;
  attribute float aCAlpha;
  varying float vCAlpha;
  void main() {
    vCAlpha = aCAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aCSize * (350.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 60.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const constellationStarFS = `
  uniform float uTime;
  varying float vCAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.1, d);
    float twinkle = 0.8 + 0.2 * sin(uTime * 3.0 + vCAlpha * 20.0);
    vec3 brightStar = vec3(0.9, 0.92, 1.0);
    vec3 col = mix(brightStar * 0.6, brightStar, core) * twinkle;
    gl_FragColor = vec4(col, glow * vCAlpha * 0.9);
  }
`;

export class ParticleSystem {
  private scene: THREE.Scene;
  private activeCount: number;

  private positions: Float32Array;
  private velocities: Float32Array;
  private basePositions: Float32Array;
  private targetPositions: Float32Array;
  private alphas: Float32Array;
  private sizes: Float32Array;
  private cWeights: Float32Array;

  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Points;

  private trail: TrailPoint[];
  private trailLine: THREE.Line;
  private trailGeo: THREE.BufferGeometry;
  private trailPositionsBuf: Float32Array;
  private trailAlphasBuf: Float32Array;

  private constellations: ConstellationData[];
  private currentCI: number;
  private cGroup: THREE.Group;
  private cLineMesh: THREE.LineSegments | null;
  private cStarMesh: THREE.Points | null;
  private cStarGeo: THREE.BufferGeometry;
  private cStarMaterial: THREE.ShaderMaterial;
  private cLineGeo: THREE.BufferGeometry;
  private cLineOpacity: number;

  private isBursting: boolean;
  private burstTimer: number;
  private burstCenter: THREE.Vector3;
  private formTimer: number;
  private isForming: boolean;

  lightBandSpeed: number;

  constructor(scene: THREE.Scene, count: number) {
    this.scene = scene;
    this.activeCount = count;
    this.lightBandSpeed = 1.0;
    this.trail = [];
    this.currentCI = 0;
    this.isBursting = false;
    this.burstTimer = 0;
    this.burstCenter = new THREE.Vector3();
    this.formTimer = 0;
    this.isForming = false;
    this.cLineOpacity = 0;

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.basePositions = new Float32Array(MAX_PARTICLES * 3);
    this.targetPositions = new Float32Array(MAX_PARTICLES * 3);
    this.alphas = new Float32Array(MAX_PARTICLES);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.cWeights = new Float32Array(MAX_PARTICLES);

    this.constellations = this.buildConstellations();

    this.initParticles();
    this.createParticleMesh();
    this.createTrailMesh();
    this.createConstellationGroup();
    this.assignConstellationTargets();
  }

  private initParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const x = (Math.random() - 0.5) * 18;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 140 - 10;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      this.targetPositions[i * 3] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;

      this.alphas[i] = 0.3 + Math.random() * 0.5;
      this.sizes[i] = 1.5 + Math.random() * 2.5;
      this.cWeights[i] = 0;
    }
  }

  private createParticleMesh(): void {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.sizes, 1)
    );
    this.geometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(this.alphas, 1)
    );
    this.geometry.setDrawRange(0, this.activeCount);

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  private createTrailMesh(): void {
    this.trailPositionsBuf = new Float32Array(MAX_TRAIL * 3);
    this.trailAlphasBuf = new Float32Array(MAX_TRAIL);

    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositionsBuf, 3)
    );
    this.trailGeo.setAttribute(
      'aTrailAlpha',
      new THREE.BufferAttribute(this.trailAlphasBuf, 1)
    );
    this.trailGeo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailLine = new THREE.Line(this.trailGeo, mat);
    this.scene.add(this.trailLine);
  }

  private createConstellationGroup(): void {
    this.cGroup = new THREE.Group();
    this.scene.add(this.cGroup);
    this.cLineMesh = null;
    this.cStarMesh = null;

    this.cStarGeo = new THREE.BufferGeometry();
    this.cStarMaterial = new THREE.ShaderMaterial({
      vertexShader: constellationStarVS,
      fragmentShader: constellationStarFS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
    });

    this.cLineGeo = new THREE.BufferGeometry();
  }

  private buildConstellations(): ConstellationData[] {
    return [
      {
        name: '北冕',
        stars: [
          new THREE.Vector3(0, 4.5, -25),
          new THREE.Vector3(1.5, 5.2, -25),
          new THREE.Vector3(3, 5.5, -25),
          new THREE.Vector3(4.5, 5.2, -25),
          new THREE.Vector3(6, 4.5, -25),
          new THREE.Vector3(5, 3.5, -25),
          new THREE.Vector3(1, 3.5, -25),
        ],
        connections: [
          [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6],
        ],
      },
      {
        name: '猎户',
        stars: [
          new THREE.Vector3(-6, 2, -5),
          new THREE.Vector3(-4, 2, -5),
          new THREE.Vector3(-5, 0.5, -5),
          new THREE.Vector3(-5.5, -0.5, -5),
          new THREE.Vector3(-4.5, -0.5, -5),
          new THREE.Vector3(-6.5, -2.5, -5),
          new THREE.Vector3(-3.5, -2.5, -5),
        ],
        connections: [
          [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 6],
        ],
      },
      {
        name: '天琴',
        stars: [
          new THREE.Vector3(5, 0, 15),
          new THREE.Vector3(6, 1.5, 15),
          new THREE.Vector3(7.5, 1.5, 15),
          new THREE.Vector3(7, 0, 15),
          new THREE.Vector3(6, -1, 15),
        ],
        connections: [
          [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [3, 4],
        ],
      },
      {
        name: '天鹅',
        stars: [
          new THREE.Vector3(0, 4, 35),
          new THREE.Vector3(0, 2, 35),
          new THREE.Vector3(0, 0, 35),
          new THREE.Vector3(-1.5, 2, 35),
          new THREE.Vector3(1.5, 2, 35),
        ],
        connections: [
          [0, 1], [1, 2], [3, 1], [1, 4],
        ],
      },
      {
        name: '仙后',
        stars: [
          new THREE.Vector3(-3, -3, -50),
          new THREE.Vector3(-1.5, -1.5, -50),
          new THREE.Vector3(0, -3, -50),
          new THREE.Vector3(1.5, -1.5, -50),
          new THREE.Vector3(3, -3, -50),
        ],
        connections: [
          [0, 1], [1, 2], [2, 3], [3, 4],
        ],
      },
    ];
  }

  private assignConstellationTargets(): void {
    const c = this.constellations[this.currentCI];
    const starCount = c.stars.length;
    const perStar = Math.floor(this.activeCount / starCount);
    const remainder = this.activeCount - perStar * starCount;

    let idx = 0;
    for (let s = 0; s < starCount; s++) {
      const count = perStar + (s < remainder ? 1 : 0);
      for (let j = 0; j < count; j++) {
        if (idx >= this.activeCount) break;
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
        );
        const target = c.stars[s].clone().add(offset);
        this.targetPositions[idx * 3] = target.x;
        this.targetPositions[idx * 3 + 1] = target.y;
        this.targetPositions[idx * 3 + 2] = target.z;
        idx++;
      }
    }
  }

  private updateConstellationVisuals(elapsed: number, opacity: number): void {
    this.cGroup.clear();
    if (opacity <= 0.01) return;

    const c = this.constellations[this.currentCI];

    const starPosArr = new Float32Array(c.stars.length * 3);
    const starSizeArr = new Float32Array(c.stars.length);
    const starAlphaArr = new Float32Array(c.stars.length);

    for (let i = 0; i < c.stars.length; i++) {
      starPosArr[i * 3] = c.stars[i].x;
      starPosArr[i * 3 + 1] = c.stars[i].y;
      starPosArr[i * 3 + 2] = c.stars[i].z;
      starSizeArr[i] = 4.0 + Math.random() * 2.0;
      starAlphaArr[i] = opacity;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPosArr, 3));
    starGeo.setAttribute('aCSize', new THREE.BufferAttribute(starSizeArr, 1));
    starGeo.setAttribute('aCAlpha', new THREE.BufferAttribute(starAlphaArr, 1));

    const starMat = this.cStarMaterial.clone();
    starMat.uniforms.uTime.value = elapsed;
    this.cGroup.add(new THREE.Points(starGeo, starMat));

    const lineVerts: number[] = [];
    for (const [a, b] of c.connections) {
      lineVerts.push(
        c.stars[a].x, c.stars[a].y, c.stars[a].z,
        c.stars[b].x, c.stars[b].y, c.stars[b].z
      );
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(lineVerts, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5588cc,
      transparent: true,
      opacity: opacity * 0.6,
      depthWrite: false,
    });
    this.cGroup.add(new THREE.LineSegments(lineGeo, lineMat));
  }

  update(delta: number, elapsed: number, mouseWorldPos: THREE.Vector3): void {
    const dt = Math.min(delta, 0.05);

    if (mouseWorldPos.lengthSq() > 0) {
      this.trail.push({
        position: mouseWorldPos.clone(),
        age: 0,
      });
    }

    while (this.trail.length > MAX_TRAIL) {
      this.trail.shift();
    }
    for (const tp of this.trail) {
      tp.age += dt;
    }
    this.trail = this.trail.filter((tp) => tp.age < 3.0);

    if (this.isBursting) {
      this.burstTimer += dt;
      if (this.burstTimer > 0.6) {
        this.isBursting = false;
        this.isForming = true;
        this.formTimer = 0;
      }
    }

    if (this.isForming) {
      this.formTimer += dt;
      const progress = Math.min(this.formTimer / 2.5, 1.0);
      for (let i = 0; i < this.activeCount; i++) {
        this.cWeights[i] = progress;
      }
      if (progress >= 1.0) {
        this.isForming = false;
      }
    }

    const speed = this.lightBandSpeed;

    for (let i = 0; i < this.activeCount; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      let vx = this.velocities[ix];
      let vy = this.velocities[iy];
      let vz = this.velocities[iz];

      vx += (Math.random() - 0.5) * 0.003;
      vy += (Math.random() - 0.5) * 0.003;
      vz += (Math.random() - 0.5) * 0.003;

      vx *= 0.98;
      vy *= 0.98;
      vz *= 0.98;

      if (!this.isBursting && this.trail.length > 0) {
        let closestDist = Infinity;
        let attractX = 0;
        let attractY = 0;
        let attractZ = 0;

        const sampleStep = Math.max(1, Math.floor(this.trail.length / 15));
        for (let t = 0; t < this.trail.length; t += sampleStep) {
          const tp = this.trail[t];
          const dx = tp.position.x - this.positions[ix];
          const dy = tp.position.y - this.positions[iy];
          const dz = tp.position.z - this.positions[iz];
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < closestDist) {
            closestDist = distSq;
            const f = Math.max(0, 1 - tp.age / 3.0) * speed;
            attractX = dx * f * 0.015;
            attractY = dy * f * 0.015;
            attractZ = dz * f * 0.015;
          }
        }

        if (closestDist < 64) {
          const trailInfluence = Math.max(0, 1 - this.cWeights[i]) * 0.7;
          vx += attractX * trailInfluence;
          vy += attractY * trailInfluence;
          vz += attractZ * trailInfluence;
        }
      }

      if (this.isBursting) {
        const dx = this.positions[ix] - this.burstCenter.x;
        const dy = this.positions[iy] - this.burstCenter.y;
        const dz = this.positions[iz] - this.burstCenter.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
        const burstForce = 3.0 / dist * (1 - this.burstTimer / 0.6);
        vx += (dx / dist) * burstForce * dt;
        vy += (dy / dist) * burstForce * dt;
        vz += (dz / dist) * burstForce * dt;
        this.cWeights[i] = 0;
      }

      if (this.cWeights[i] > 0 && !this.isBursting) {
        const w = this.cWeights[i];
        const tdx = this.targetPositions[ix] - this.positions[ix];
        const tdy = this.targetPositions[iy] - this.positions[iy];
        const tdz = this.targetPositions[iz] - this.positions[iz];
        vx += tdx * w * 1.5 * dt;
        vy += tdy * w * 1.5 * dt;
        vz += tdz * w * 1.5 * dt;
      }

      this.velocities[ix] = vx;
      this.velocities[iy] = vy;
      this.velocities[iz] = vz;

      this.positions[ix] += vx;
      this.positions[iy] += vy;
      this.positions[iz] += vz;

      if (Math.abs(this.positions[ix]) > 10) {
        this.positions[ix] = (Math.random() - 0.5) * 18;
        this.positions[iy] = (Math.random() - 0.5) * 12;
        this.positions[iz] = (Math.random() - 0.5) * 140 - 10;
        this.velocities[ix] = 0;
        this.velocities[iy] = 0;
        this.velocities[iz] = 0;
        this.cWeights[i] = 0;
      }
      if (Math.abs(this.positions[iy]) > 7) {
        this.positions[ix] = (Math.random() - 0.5) * 18;
        this.positions[iy] = (Math.random() - 0.5) * 12;
        this.positions[iz] = (Math.random() - 0.5) * 140 - 10;
        this.velocities[ix] = 0;
        this.velocities[iy] = 0;
        this.velocities[iz] = 0;
        this.cWeights[i] = 0;
      }
    }

    (
      this.geometry.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute
    ).needsUpdate = true;

    this.updateTrailGeometry();

    if (!this.isBursting) {
      const avgWeight =
        this.activeCount > 0
          ? Array.from(this.cWeights.slice(0, this.activeCount)).reduce(
              (a, b) => a + b,
              0
            ) / this.activeCount
          : 0;
      this.cLineOpacity = avgWeight;
    } else {
      this.cLineOpacity = Math.max(0, this.cLineOpacity - dt * 2);
    }
    this.updateConstellationVisuals(elapsed, this.cLineOpacity);
  }

  private updateTrailGeometry(): void {
    const len = this.trail.length;
    for (let i = 0; i < len; i++) {
      const tp = this.trail[i];
      this.trailPositionsBuf[i * 3] = tp.position.x;
      this.trailPositionsBuf[i * 3 + 1] = tp.position.y;
      this.trailPositionsBuf[i * 3 + 2] = tp.position.z;
      this.trailAlphasBuf[i] = Math.max(0, 1 - tp.age / 3.0);
    }
    this.trailGeo.setDrawRange(0, len);
    (
      this.trailGeo.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.trailGeo.getAttribute('aTrailAlpha') as THREE.BufferAttribute
    ).needsUpdate = true;
  }

  triggerBurst(worldPos: THREE.Vector3): void {
    this.isBursting = true;
    this.burstTimer = 0;
    this.burstCenter.copy(worldPos);
    this.isForming = false;
    this.formTimer = 0;
    for (let i = 0; i < this.activeCount; i++) {
      this.cWeights[i] = 0;
    }
  }

  switchConstellation(): void {
    this.currentCI =
      (this.currentCI + 1) % this.constellations.length;
    this.assignConstellationTargets();
    this.isForming = true;
    this.formTimer = 0;
    for (let i = 0; i < this.activeCount; i++) {
      this.cWeights[i] = 0;
    }
  }

  setParticleDensity(count: number): void {
    this.activeCount = Math.min(count, MAX_PARTICLES);
    this.geometry.setDrawRange(0, this.activeCount);
    this.assignConstellationTargets();
  }

  setLightBandSpeed(speed: number): void {
    this.lightBandSpeed = speed;
  }

  getConstellationStars(): THREE.Vector3[] {
    return this.constellations[this.currentCI].stars;
  }

  getCurrentConstellationName(): string {
    return this.constellations[this.currentCI].name;
  }
}
