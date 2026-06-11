import * as THREE from 'three';

const PALETTE = [
  new THREE.Color(0.3, 0.2, 0.8),
  new THREE.Color(0.45, 0.3, 0.9),
  new THREE.Color(0.6, 0.55, 0.95),
  new THREE.Color(0.75, 0.75, 0.95),
  new THREE.Color(0.88, 0.88, 0.92),
  new THREE.Color(0.92, 0.9, 0.85),
  new THREE.Color(0.95, 0.88, 0.6),
  new THREE.Color(0.9, 0.82, 0.5),
];

interface ParticlePath {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  p3: THREE.Vector3;
  t: number;
  speed: number;
}

const vertexShader = `
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    float core = smoothstep(0.5, 0.0, dist);
    float glow = exp(-dist * 4.0) * 0.6;
    float halo = exp(-dist * 2.0) * 0.15;

    vec3 color = vColor * (core + glow) + vec3(0.6, 0.6, 0.8) * halo;
    float alpha = smoothstep(0.5, 0.15, dist);

    gl_FragColor = vec4(color, alpha);
  }
`;

export class ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;

  private count: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private brightness: Float32Array;
  private paths: ParticlePath[];
  private baseSize: number = 4;
  private speedFactor: number = 1.0;
  private hoveredIndex: number = -1;
  private sphereRadius: number = 200;

  constructor(count: number = 5000) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.brightness = new Float32Array(count);
    this.paths = [];

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private randomInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
  }

  private generatePath(startPos: THREE.Vector3): ParticlePath {
    const offset = 60;
    return {
      p0: startPos.clone(),
      p1: startPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * offset * 2,
        (Math.random() - 0.5) * offset * 2,
        (Math.random() - 0.5) * offset * 2,
      )),
      p2: startPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * offset * 3,
        (Math.random() - 0.5) * offset * 3,
        (Math.random() - 0.5) * offset * 3,
      )),
      p3: startPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * offset * 2,
        (Math.random() - 0.5) * offset * 2,
        (Math.random() - 0.5) * offset * 2,
      )),
      t: 0,
      speed: 0.002 + Math.random() * 0.004,
    };
  }

  private cubicBezier(path: ParticlePath, t: number): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return new THREE.Vector3(
      mt3 * path.p0.x + 3 * mt2 * t * path.p1.x + 3 * mt * t2 * path.p2.x + t3 * path.p3.x,
      mt3 * path.p0.y + 3 * mt2 * t * path.p1.y + 3 * mt * t2 * path.p2.y + t3 * path.p3.y,
      mt3 * path.p0.z + 3 * mt2 * t * path.p1.z + 3 * mt * t2 * path.p2.z + t3 * path.p3.z,
    );
  }

  private clampToSphere(pos: THREE.Vector3): THREE.Vector3 {
    const dist = pos.length();
    if (dist > this.sphereRadius) {
      pos.multiplyScalar(this.sphereRadius / dist);
    }
    return pos;
  }

  private initParticles(): void {
    this.paths = [];
    for (let i = 0; i < this.count; i++) {
      const pos = this.randomInSphere(this.sphereRadius);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      const bright = 0.3 + Math.random() * 0.7;
      this.brightness[i] = bright;

      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)].clone();
      color.multiplyScalar(bright);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = this.baseSize * (0.5 + bright * 0.5);

      this.paths.push(this.generatePath(pos));
    }
  }

  update(delta: number): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      const path = this.paths[i];
      path.t += path.speed * this.speedFactor * delta * 60;

      if (path.t >= 1.0) {
        const endPos = this.cubicBezier(path, 1.0);
        this.clampToSphere(endPos);
        const newPath = this.generatePath(endPos);
        newPath.p0.copy(endPos);
        this.paths[i] = newPath;
        continue;
      }

      const pos = this.cubicBezier(path, path.t);
      this.clampToSphere(pos);

      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      const isHovered = i === this.hoveredIndex;
      const bright = this.brightness[i];
      this.sizes[i] = this.baseSize * (0.5 + bright * 0.5) * (isHovered ? 1.5 : 1.0);
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  setParticleCount(newCount: number): void {
    if (newCount === this.count) return;

    const oldPositions = this.positions;
    const oldColors = this.colors;
    const oldBrightness = this.brightness;
    const oldPaths = this.paths;

    this.count = newCount;
    this.positions = new Float32Array(newCount * 3);
    this.colors = new Float32Array(newCount * 3);
    this.sizes = new Float32Array(newCount);
    this.brightness = new Float32Array(newCount);
    this.paths = [];

    const copyCount = Math.min(newCount, oldPositions.length / 3);
    for (let i = 0; i < copyCount; i++) {
      this.positions[i * 3] = oldPositions[i * 3];
      this.positions[i * 3 + 1] = oldPositions[i * 3 + 1];
      this.positions[i * 3 + 2] = oldPositions[i * 3 + 2];
      this.colors[i * 3] = oldColors[i * 3];
      this.colors[i * 3 + 1] = oldColors[i * 3 + 1];
      this.colors[i * 3 + 2] = oldColors[i * 3 + 2];
      this.brightness[i] = oldBrightness[i];
      this.sizes[i] = this.baseSize * (0.5 + oldBrightness[i] * 0.5);
      this.paths.push(oldPaths[i] || this.generatePath(
        new THREE.Vector3(oldPositions[i * 3], oldPositions[i * 3 + 1], oldPositions[i * 3 + 2]),
      ));
    }

    for (let i = copyCount; i < newCount; i++) {
      const pos = this.randomInSphere(this.sphereRadius);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      const bright = 0.3 + Math.random() * 0.7;
      this.brightness[i] = bright;

      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)].clone();
      color.multiplyScalar(bright);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = this.baseSize * (0.5 + bright * 0.5);
      this.paths.push(this.generatePath(pos));
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  setBaseSize(size: number): void {
    this.baseSize = size;
    for (let i = 0; i < this.count; i++) {
      const bright = this.brightness[i];
      const isHovered = i === this.hoveredIndex;
      this.sizes[i] = size * (0.5 + bright * 0.5) * (isHovered ? 1.5 : 1.0);
    }
    (this.geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
  }

  setSpeedFactor(factor: number): void {
    this.speedFactor = factor;
  }

  setHoveredIndex(index: number): void {
    if (this.hoveredIndex >= 0 && this.hoveredIndex < this.count) {
      const prev = this.hoveredIndex;
      const bright = this.brightness[prev];
      this.sizes[prev] = this.baseSize * (0.5 + bright * 0.5);
    }
    this.hoveredIndex = index;
  }

  getParticleInfo(index: number): { x: number; y: number; z: number; brightness: number; index: number } | null {
    if (index < 0 || index >= this.count) return null;
    return {
      x: parseFloat(this.positions[index * 3].toFixed(1)),
      y: parseFloat(this.positions[index * 3 + 1].toFixed(1)),
      z: parseFloat(this.positions[index * 3 + 2].toFixed(1)),
      brightness: parseFloat(this.brightness[index].toFixed(2)),
      index,
    };
  }

  getCount(): number {
    return this.count;
  }

  getBaseSize(): number {
    return this.baseSize;
  }

  getSpeedFactor(): number {
    return this.speedFactor;
  }

  getPositionAt(index: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.positions[index * 3],
      this.positions[index * 3 + 1],
      this.positions[index * 3 + 2],
    );
  }

  exportConfig(): object {
    return {
      particleCount: this.count,
      baseSize: this.baseSize,
      speedFactor: this.speedFactor,
      particles: Array.from({ length: this.count }, (_, i) => ({
        index: i,
        position: {
          x: parseFloat(this.positions[i * 3].toFixed(2)),
          y: parseFloat(this.positions[i * 3 + 1].toFixed(2)),
          z: parseFloat(this.positions[i * 3 + 2].toFixed(2)),
        },
        brightness: parseFloat(this.brightness[i].toFixed(3)),
        color: {
          r: parseFloat(this.colors[i * 3].toFixed(3)),
          g: parseFloat(this.colors[i * 3 + 1].toFixed(3)),
          b: parseFloat(this.colors[i * 3 + 2].toFixed(3)),
        },
      })),
    };
  }
}
