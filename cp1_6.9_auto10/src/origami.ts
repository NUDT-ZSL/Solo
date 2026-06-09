type Vec3 = { x: number; y: number; z: number };

interface Face {
  baseVertices: [Vec3, Vec3, Vec3];
  vertices: [Vec3, Vec3, Vec3];
  foldAxis: Vec3;
  foldVertexIndex: number;
  baseHue: number;
  hue: number;
  hueOffset: number;
  normal: Vec3;
  center: Vec3;
  reflectivity: number;
  zDepth: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  hue: number;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface OrigamiParams {
  foldAngle: number;
  unfoldSpeed: number;
  particleMultiplier: number;
  autoPlay: boolean;
}

const LIGHT_DIR: Vec3 = normalize({ x: 0, y: -0.7071, z: 0.7071 });
const MAX_PARTICLES = 800;

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

function normalize(v: Vec3): Vec3 {
  const l = length(v);
  return l === 0 ? { x: 0, y: 0, z: 0 } : scale(v, 1 / l);
}

function rotateAroundAxis(v: Vec3, axis: Vec3, angleRad: number): Vec3 {
  const a = normalize(axis);
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const t = 1 - c;
  const { x, y, z } = v;
  const { x: ax, y: ay, z: az } = a;
  return {
    x: (t * ax * ax + c) * x + (t * ax * ay - s * az) * y + (t * ax * az + s * ay) * z,
    y: (t * ax * ay + s * az) * x + (t * ay * ay + c) * y + (t * ay * az - s * ax) * z,
    z: (t * ax * az - s * ay) * x + (t * ay * az + s * ax) * y + (t * az * az + c) * z
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildFlowerFaces(): Face[] {
  const faces: Face[] = [];
  const R = 1.0;
  const rings = 4;
  const perRing = 3;

  function spherical(theta: number, phi: number): Vec3 {
    return {
      x: R * Math.sin(phi) * Math.cos(theta),
      y: R * Math.cos(phi),
      z: R * Math.sin(phi) * Math.sin(theta)
    };
  }

  const vertices: Vec3[] = [];
  for (let r = 0; r < rings; r++) {
    const phi = (Math.PI / (rings - 1)) * r;
    for (let p = 0; p < perRing; p++) {
      const theta = (2 * Math.PI / perRing) * p + (r % 2) * (Math.PI / perRing);
      vertices.push(spherical(theta, phi));
    }
  }

  function vi(r: number, p: number): number {
    return r * perRing + ((p % perRing) + perRing) % perRing;
  }

  const icosaFaces: [number, number, number][] = [];
  for (let r = 0; r < rings - 1; r++) {
    for (let p = 0; p < perRing; p++) {
      icosaFaces.push([vi(r, p), vi(r + 1, p), vi(r + 1, p + 1)]);
      icosaFaces.push([vi(r, p), vi(r + 1, p + 1), vi(r, p + 1)]);
    }
  }

  for (let i = 0; i < 12 && i < icosaFaces.length; i++) {
    const [i0, i1, i2] = icosaFaces[i];
    const v0 = vertices[i0];
    const v1 = vertices[i1];
    const v2 = vertices[i2];
    const center = scale(add(add(v0, v1), v2), 1 / 3);
    const verts: [Vec3, Vec3, Vec3] = [
      { ...v0 }, { ...v1 }, { ...v2 }
    ];
    const baseHue = Math.random() * 180;
    const faceNormal = normalize(cross(sub(v1, v0), sub(v2, v0)));
    const foldVertexIndex = i % 3;
    const fv = verts[foldVertexIndex];
    const oppositeCenter = scale(add(verts[(foldVertexIndex + 1) % 3], verts[(foldVertexIndex + 2) % 3]), 0.5);
    const foldAxis = normalize(sub(fv, oppositeCenter));
    faces.push({
      baseVertices: verts.map(v => ({ ...v })) as [Vec3, Vec3, Vec3],
      vertices: verts.map(v => ({ ...v })) as [Vec3, Vec3, Vec3],
      foldAxis,
      foldVertexIndex,
      baseHue,
      hue: baseHue,
      hueOffset: 0,
      normal: faceNormal,
      center,
      reflectivity: 0.5,
      zDepth: center.z
    });
  }
  return faces;
}

export class OrigamiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private faces: Face[];
  private particles: Particle[];
  private params: OrigamiParams;
  private targetParams: OrigamiParams;
  private transitionStart: number = 0;
  private transitionDuration: number = 1000;
  private transitioning: boolean = false;
  private startParams: OrigamiParams;
  private lastTimestamp: number = 0;
  private globalRotation: number = 0;
  private autoPlayTimer: number = 0;
  private autoPlayInterval: number = 4000;
  private prevFoldAngle: number = 30;
  private dpr: number = 1;
  private width: number = 800;
  private height: number = 600;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.faces = buildFlowerFaces();
    this.particles = [];
    this.params = {
      foldAngle: 30,
      unfoldSpeed: 1,
      particleMultiplier: 1,
      autoPlay: false
    };
    this.startParams = { ...this.params };
    this.targetParams = { ...this.params };
    this.prevFoldAngle = this.params.foldAngle;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  updateParam(params: Partial<OrigamiParams>): void {
    const newTarget = { ...this.targetParams, ...params };
    if (
      newTarget.foldAngle !== this.targetParams.foldAngle ||
      newTarget.unfoldSpeed !== this.targetParams.unfoldSpeed ||
      newTarget.particleMultiplier !== this.targetParams.particleMultiplier
    ) {
      this.startParams = { ...this.params };
      this.targetParams = newTarget;
      this.transitionStart = performance.now();
      this.transitionDuration = 1000;
      this.transitioning = true;
    } else {
      this.targetParams = newTarget;
      this.params = { ...this.params, ...params };
    }
  }

  randomizeColors(): void {
    for (const face of this.faces) {
      face.baseHue = Math.random() * 180;
    }
    this.startParams = { ...this.params };
    this.targetParams = { ...this.params, foldAngle: this.params.foldAngle + 0.001 };
    this.transitionStart = performance.now();
    this.transitionDuration = 1000;
    this.transitioning = true;
  }

  reset(): void {
    for (const face of this.faces) {
      face.baseHue = Math.random() * 180;
      face.hueOffset = 0;
    }
    this.startParams = { ...this.params };
    this.targetParams = {
      foldAngle: 30,
      unfoldSpeed: 1,
      particleMultiplier: 1,
      autoPlay: this.params.autoPlay
    };
    this.transitionStart = performance.now();
    this.transitionDuration = 1000;
    this.transitioning = true;
  }

  private autoPlaySwitch(): void {
    const randomAngle = 30 + Math.random() * 120;
    const randomSpeed = 1 + Math.random() * 3;
    for (const face of this.faces) {
      face.hueOffset = (face.hueOffset + (Math.random() * 40 - 20) + 180) % 180;
    }
    this.startParams = { ...this.params };
    this.targetParams = {
      ...this.params,
      foldAngle: randomAngle,
      unfoldSpeed: randomSpeed
    };
    this.transitionStart = performance.now();
    this.transitionDuration = 2000;
    this.transitioning = true;
  }

  private emitParticles(face: Face, count: number, screenCenterX: number, screenCenterY: number, scale: number): void {
    const proj = (v: Vec3) => ({
      x: screenCenterX + v.x * scale,
      y: screenCenterY + v.y * scale
    });
    for (let i = 0; i < count; i++) {
      if (this.particles.filter(p => p.active).length >= MAX_PARTICLES) break;
      const vertIdx = Math.floor(Math.random() * 3);
      const v = face.vertices[vertIdx];
      const sp = proj(v);
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const life = 1500;
      const particle: Particle = {
        x: sp.x,
        y: sp.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        gravity: 120,
        hue: face.hue,
        size: 2 + Math.random() * 3,
        life,
        maxLife: life,
        active: true
      };
      const slot = this.particles.find(p => !p.active);
      if (slot) {
        Object.assign(slot, particle);
      } else {
        this.particles.push(particle);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
    }
  }

  private updateTransition(now: number): void {
    if (!this.transitioning) return;
    const elapsed = now - this.transitionStart;
    if (elapsed >= this.transitionDuration) {
      this.params = { ...this.targetParams };
      this.transitioning = false;
      return;
    }
    const t = easeInOut(elapsed / this.transitionDuration);
    this.params.foldAngle = lerp(this.startParams.foldAngle, this.targetParams.foldAngle, t);
    this.params.unfoldSpeed = lerp(this.startParams.unfoldSpeed, this.targetParams.unfoldSpeed, t);
    this.params.particleMultiplier = lerp(this.startParams.particleMultiplier, this.targetParams.particleMultiplier, t);
    this.params.autoPlay = this.targetParams.autoPlay;
  }

  private computeGeometry(now: number): void {
    const foldRad = (this.params.foldAngle * Math.PI) / 180;
    const globalRot = this.globalRotation;
    const cos = Math.cos(globalRot);
    const sin = Math.sin(globalRot);

    for (const face of this.faces) {
      for (let i = 0; i < 3; i++) {
        let v = { ...face.baseVertices[i] };
        if (i !== face.foldVertexIndex) {
          v = rotateAroundAxis(v, face.foldAxis, -foldRad);
        }
        const x = v.x * cos - v.z * sin;
        const z = v.x * sin + v.z * cos;
        v.x = x;
        v.z = z;
        face.vertices[i] = v;
      }
      const [v0, v1, v2] = face.vertices;
      face.normal = normalize(cross(sub(v1, v0), sub(v2, v0)));
      face.center = scale(add(add(v0, v1), v2), 1 / 3);
      face.zDepth = face.center.z;
      const nl = dot(face.normal, LIGHT_DIR);
      face.reflectivity = 0.3 + 0.7 * Math.max(0, nl);
      face.hue = (face.baseHue + face.hueOffset + 180) % 180;
    }

    this.faces.sort((a, b) => a.zDepth - b.zDepth);
  }

  private project(v: Vec3, cx: number, cy: number, s: number): { x: number; y: number } {
    return { x: cx + v.x * s, y: cy + v.y * s };
  }

  private drawBackground(): void {
    const { ctx, width, height } = this;
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 217, 61, 0.05)');
    grad.addColorStop(0.5, 'rgba(108, 99, 255, 0.03)');
    grad.addColorStop(1, 'rgba(26, 26, 46, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  private drawFace(face: Face, cx: number, cy: number, s: number): void {
    const { ctx } = this;
    const pts = face.vertices.map(v => this.project(v, cx, cy, s));
    const hue = face.hue;
    const refl = face.reflectivity;
    const lightness = 35 + refl * 25;
    const saturation = 75;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();

    const grad = ctx.createLinearGradient(
      pts[0].x, pts[0].y,
      (pts[0].x + pts[1].x + pts[2].x) / 3,
      (pts[0].y + pts[1].y + pts[2].y) / 3
    );
    grad.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.92)`);
    grad.addColorStop(1, `hsla(${(hue + 20) % 180}, ${saturation}%, ${lightness - 10}%, 0.85)`);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${Math.min(lightness + 15, 80)}%, 0.6)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (refl > 0.5) {
      const cp = {
        x: (pts[0].x + pts[1].x + pts[2].x) / 3,
        y: (pts[0].y + pts[1].y + pts[2].y) / 3
      };
      const haloR = 30 * refl;
      const haloGrad = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, haloR);
      haloGrad.addColorStop(0, `hsla(${hue}, 95%, 85%, ${0.6 * (refl - 0.5) * 2})`);
      haloGrad.addColorStop(1, `hsla(${hue}, 95%, 85%, 0)`);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, haloR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < 3; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % 3];
      const cp2 = {
        x: (pts[0].x + pts[1].x + pts[2].x) / 3,
        y: (pts[0].y + pts[1].y + pts[2].y) / 3
      };
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dirX = mx - cp2.x;
      const dirY = my - cp2.y;
      const beamLen = 50 + refl * 60;
      const dlen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      const bx = cp2.x + (dirX / dlen) * beamLen;
      const by = cp2.y + (dirY / dlen) * beamLen;

      ctx.save();
      ctx.globalAlpha = refl * 0.3;
      const beamGrad = ctx.createLinearGradient(cp2.x, cp2.y, bx, by);
      beamGrad.addColorStop(0, `hsla(${hue}, 95%, 80%, 0.6)`);
      beamGrad.addColorStop(1, `hsla(${hue}, 95%, 80%, 0)`);
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2 + refl * 3;
      ctx.beginPath();
      ctx.moveTo(cp2.x, cp2.y);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(): void {
    const { ctx } = this;
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      const size = p.size * alpha;
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      grad.addColorStop(0, `hsla(${p.hue}, 95%, 75%, 1)`);
      grad.addColorStop(0.5, `hsla(${p.hue}, 95%, 65%, 0.6)`);
      grad.addColorStop(1, `hsla(${p.hue}, 95%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  render(timestamp: number): void {
    const dt = this.lastTimestamp ? Math.min(timestamp - this.lastTimestamp, 50) : 16;
    this.lastTimestamp = timestamp;

    this.updateTransition(timestamp);

    this.globalRotation += 0.0003 * dt * this.params.unfoldSpeed;

    const deltaAngle = Math.abs(this.params.foldAngle - this.prevFoldAngle);
    const isUnfolding = this.params.foldAngle > this.prevFoldAngle && deltaAngle > 0.1;
    this.prevFoldAngle = this.params.foldAngle;

    this.computeGeometry(timestamp);
    this.updateParticles(dt);

    if (this.params.autoPlay) {
      this.autoPlayTimer += dt;
      if (this.autoPlayTimer >= this.autoPlayInterval && !this.transitioning) {
        this.autoPlayTimer = 0;
        this.autoPlaySwitch();
      }
    }

    this.drawBackground();

    const cx = this.width / 2;
    const cy = this.height / 2;
    const s = Math.min(this.width, this.height) * 0.22;

    if (isUnfolding) {
      const baseCount = Math.round(5 + (this.params.unfoldSpeed - 1) * 3.75);
      const particleCount = Math.max(1, Math.round(baseCount * this.params.particleMultiplier));
      for (const face of this.faces) {
        this.emitParticles(face, particleCount, cx, cy, s);
      }
    }

    for (const face of this.faces) {
      this.drawFace(face, cx, cy, s);
    }

    this.drawParticles();
  }

  getParams(): OrigamiParams {
    return { ...this.params };
  }
}
