import * as THREE from 'three';

const PALETTE = [
  new THREE.Color(0.35, 0.25, 0.9),
  new THREE.Color(0.5, 0.35, 0.95),
  new THREE.Color(0.65, 0.55, 1.0),
  new THREE.Color(0.8, 0.8, 1.0),
  new THREE.Color(0.9, 0.9, 0.95),
  new THREE.Color(0.95, 0.92, 0.85),
  new THREE.Color(1.0, 0.9, 0.65),
  new THREE.Color(0.95, 0.85, 0.55),
];

interface ParticlePath {
  p0: THREE.Vector3;
  c1: THREE.Vector3;
  c2: THREE.Vector3;
  p3: THREE.Vector3;
  t: number;
  duration: number;
  phase: number;
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    vColor = color;
    vBrightness = aBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float perspective = 300.0 / max(-mvPosition.z, 1.0);
    gl_PointSize = aSize * perspective;
    gl_PointSize = clamp(gl_PointSize, 0.8, 80.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = length(uv);
    if (d > 1.0) discard;

    float core = pow(1.0 - d, 2.5);
    float glow = exp(-d * 3.2) * 0.55;
    float outer = exp(-d * 1.6) * 0.18 * vBrightness;

    vec3 c = vColor * (core + glow) + vec3(0.7, 0.7, 0.95) * outer;
    float a = smoothstep(1.0, 0.08, d);

    gl_FragColor = vec4(c, a * 0.95);
  }
`;

export class ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;

  private count: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizesAttr: Float32Array;
  private brightness: Float32Array;
  private paths: ParticlePath[];
  private baseSize: number = 4;
  private speedFactor: number = 1.0;
  private hoveredIndex: number = -1;
  private sphereRadius: number = 200;
  private _tmpV: THREE.Vector3 = new THREE.Vector3();
  private _tmpV2: THREE.Vector3 = new THREE.Vector3();
  private _tmpV3: THREE.Vector3 = new THREE.Vector3();
  private _tmpV4: THREE.Vector3 = new THREE.Vector3();

  constructor(count: number = 5000) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizesAttr = new Float32Array(count);
    this.brightness = new Float32Array(count);
    this.paths = new Array(count);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizesAttr, 1));
    this.geometry.setAttribute('aBrightness', new THREE.BufferAttribute(this.brightness, 1));

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

  private randomInSphere(radius: number, out: THREE.Vector3): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random() * 0.85 + 0.1);
    out.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
    return out;
  }

  private randomDir(): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
    );
  }

  private generateBezierPath(startPos: THREE.Vector3): ParticlePath {
    const dir = this.randomDir();
    const rotAxis = this.randomDir();
    const perp = new THREE.Vector3().crossVectors(dir, rotAxis).normalize();
    const perp2 = new THREE.Vector3().crossVectors(dir, perp).normalize();

    const travel = 50 + Math.random() * 90;
    const curveAmp1 = 35 + Math.random() * 55;
    const curveAmp2 = 30 + Math.random() * 60;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + (Math.random() - 0.5) * Math.PI * 1.3;

    const c1 = startPos.clone()
      .addScaledVector(dir, travel * 0.3)
      .addScaledVector(perp, Math.cos(angle1) * curveAmp1)
      .addScaledVector(perp2, Math.sin(angle1) * curveAmp1 * 0.8);

    const c2 = startPos.clone()
      .addScaledVector(dir, travel * 0.7)
      .addScaledVector(perp, Math.cos(angle2) * curveAmp2)
      .addScaledVector(perp2, Math.sin(angle2) * curveAmp2 * 0.9);

    const end = startPos.clone()
      .addScaledVector(dir, travel)
      .addScaledVector(perp, Math.cos(angle2) * curveAmp2 * 0.3)
      .addScaledVector(perp2, Math.sin(angle2) * curveAmp2 * 0.3);

    this.clampToSphere(end);
    this.clampToSphere(c1);
    this.clampToSphere(c2);

    return {
      p0: startPos.clone(),
      c1,
      c2,
      p3: end,
      t: 0,
      duration: 280 + Math.random() * 520,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private cubicBezier(
    p0: THREE.Vector3, c1: THREE.Vector3, c2: THREE.Vector3, p3: THREE.Vector3,
    t: number, out: THREE.Vector3,
  ): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    out.x = mt3 * p0.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t3 * p3.x;
    out.y = mt3 * p0.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t3 * p3.y;
    out.z = mt3 * p0.z + 3 * mt2 * t * c1.z + 3 * mt * t2 * c2.z + t3 * p3.z;
    return out;
  }

  private clampToSphere(pos: THREE.Vector3): THREE.Vector3 {
    const distSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
    const r2 = this.sphereRadius * this.sphereRadius;
    if (distSq > r2) {
      const s = this.sphereRadius / Math.sqrt(distSq);
      pos.x *= s; pos.y *= s; pos.z *= s;
    }
    return pos;
  }

  private initParticles(): void {
    for (let i = 0; i < this.count; i++) {
      const pos = this.randomInSphere(this.sphereRadius, this._tmpV);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      const bright = 0.3 + Math.random() * 0.7;
      this.brightness[i] = bright;

      const c = PALETTE[(Math.random() * PALETTE.length) | 0];
      const boost = 0.4 + bright * 0.9;
      this.colors[i * 3] = Math.min(1, c.r * boost);
      this.colors[i * 3 + 1] = Math.min(1, c.g * boost);
      this.colors[i * 3 + 2] = Math.min(1, c.b * boost);

      this.sizesAttr[i] = this.baseSize * (0.55 + bright * 0.7);

      const bp = this.generateBezierPath(new THREE.Vector3(pos.x, pos.y, pos.z));
      bp.t = Math.random() * 0.95;
      this.paths[i] = bp;
    }
  }

  update(delta: number): void {
    const step = delta * 60 * this.speedFactor;
    const positions = this.positions;
    const sizes = this.sizesAttr;
    const b = this.brightness;
    const bs = this.baseSize;
    const hv = this.hoveredIndex;
    const paths = this.paths;
    const tmp = this._tmpV;

    for (let i = 0; i < this.count; i++) {
      const path = paths[i];
      path.t += (step / path.duration);

      if (path.t >= 1.0) {
        const last = this.cubicBezier(path.p0, path.c1, path.c2, path.p3, 1.0, tmp);
        this.clampToSphere(last);
        const start = new THREE.Vector3(last.x, last.y, last.z);
        const np = this.generateBezierPath(start);
        np.p0.copy(start);
        paths[i] = np;
        continue;
      }

      const t = path.t;
      this.cubicBezier(path.p0, path.c1, path.c2, path.p3, t, tmp);
      this.clampToSphere(tmp);

      const ix = i * 3;
      positions[ix] = tmp.x;
      positions[ix + 1] = tmp.y;
      positions[ix + 2] = tmp.z;

      const hi = i === hv;
      sizes[i] = bs * (0.55 + b[i] * 0.7) * (hi ? 1.5 : 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  setParticleCount(newCount: number): void {
    if (newCount === this.count) return;

    const oldPositions = this.positions;
    const oldColors = this.colors;
    const oldBrightness = this.brightness;
    const oldPaths = this.paths;
    const oldCount = this.count;

    this.count = newCount;
    this.positions = new Float32Array(newCount * 3);
    this.colors = new Float32Array(newCount * 3);
    this.sizesAttr = new Float32Array(newCount);
    this.brightness = new Float32Array(newCount);
    this.paths = new Array(newCount);

    const copyCount = Math.min(newCount, oldCount);
    for (let i = 0; i < copyCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = oldPositions[i3];
      this.positions[i3 + 1] = oldPositions[i3 + 1];
      this.positions[i3 + 2] = oldPositions[i3 + 2];
      this.colors[i3] = oldColors[i3];
      this.colors[i3 + 1] = oldColors[i3 + 1];
      this.colors[i3 + 2] = oldColors[i3 + 2];
      this.brightness[i] = oldBrightness[i];
      this.sizesAttr[i] = this.baseSize * (0.55 + oldBrightness[i] * 0.7);
      this.paths[i] = oldPaths[i];
    }

    for (let i = copyCount; i < newCount; i++) {
      const pos = this.randomInSphere(this.sphereRadius, this._tmpV);
      const i3 = i * 3;
      this.positions[i3] = pos.x;
      this.positions[i3 + 1] = pos.y;
      this.positions[i3 + 2] = pos.z;

      const bright = 0.3 + Math.random() * 0.7;
      this.brightness[i] = bright;

      const c = PALETTE[(Math.random() * PALETTE.length) | 0];
      const boost = 0.4 + bright * 0.9;
      this.colors[i3] = Math.min(1, c.r * boost);
      this.colors[i3 + 1] = Math.min(1, c.g * boost);
      this.colors[i3 + 2] = Math.min(1, c.b * boost);

      this.sizesAttr[i] = this.baseSize * (0.55 + bright * 0.7);
      const bp = this.generateBezierPath(new THREE.Vector3(pos.x, pos.y, pos.z));
      bp.t = Math.random() * 0.95;
      this.paths[i] = bp;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizesAttr, 1));
    this.geometry.setAttribute('aBrightness', new THREE.BufferAttribute(this.brightness, 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  setBaseSize(size: number): void {
    this.baseSize = size;
    const s = this.sizesAttr;
    const b = this.brightness;
    const bs = size;
    const hv = this.hoveredIndex;
    for (let i = 0; i < this.count; i++) {
      s[i] = bs * (0.55 + b[i] * 0.7) * (i === hv ? 1.5 : 1.0);
    }
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  setSpeedFactor(factor: number): void {
    this.speedFactor = factor;
  }

  setHoveredIndex(index: number): void {
    if (this.hoveredIndex >= 0 && this.hoveredIndex < this.count) {
      const prev = this.hoveredIndex;
      this.sizesAttr[prev] = this.baseSize * (0.55 + this.brightness[prev] * 0.7);
    }
    this.hoveredIndex = index;
    if (index >= 0 && index < this.count) {
      this.sizesAttr[index] = this.baseSize * (0.55 + this.brightness[index] * 0.7) * 1.5;
    }
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
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

  getCount(): number { return this.count; }
  getBaseSize(): number { return this.baseSize; }
  getSpeedFactor(): number { return this.speedFactor; }

  getPositionAt(index: number, out?: THREE.Vector3): THREE.Vector3 {
    const r = out || new THREE.Vector3();
    return r.set(this.positions[index * 3], this.positions[index * 3 + 1], this.positions[index * 3 + 2]);
  }

  exportConfig(): object {
    const p = this.positions, c = this.colors, b = this.brightness;
    return {
      particleCount: this.count,
      baseSize: this.baseSize,
      speedFactor: this.speedFactor,
      particles: Array.from({ length: this.count }, (_, i) => {
        const i3 = i * 3;
        return {
          index: i,
          position: {
            x: parseFloat(p[i3].toFixed(2)),
            y: parseFloat(p[i3 + 1].toFixed(2)),
            z: parseFloat(p[i3 + 2].toFixed(2)),
          },
          brightness: parseFloat(b[i].toFixed(3)),
          color: {
            r: parseFloat(c[i3].toFixed(3)),
            g: parseFloat(c[i3 + 1].toFixed(3)),
            b: parseFloat(c[i3 + 2].toFixed(3)),
          },
        };
      }),
    };
  }
}
