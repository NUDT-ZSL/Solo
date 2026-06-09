import * as THREE from 'three';

export type ColorTheme = 'lava' | 'deepSea' | 'aurora';

export interface ThemePalette {
  colors: [THREE.Color, THREE.Color];
  accent: THREE.Color;
}

export const THEMES: Record<ColorTheme, ThemePalette> = {
  lava: {
    colors: [new THREE.Color('#ff7b3d'), new THREE.Color('#6b0f1a')],
    accent: new THREE.Color('#ffb347')
  },
  deepSea: {
    colors: [new THREE.Color('#00d4aa'), new THREE.Color('#5a4a7a')],
    accent: new THREE.Color('#6ee7b7')
  },
  aurora: {
    colors: [new THREE.Color('#a855f7'), new THREE.Color('#2dd4bf')],
    accent: new THREE.Color('#c084fc')
  }
};

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, t);
}

export function getThemeGradient(theme: ColorTheme, t: number): THREE.Color {
  const palette = THEMES[theme];
  return lerpColor(palette.colors[0], palette.colors[1], t);
}

/* ============================================================
 *  Perlin-like simple noise for organic motion
 * ============================================================ */
const PERM = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function noise3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = PERM[X] + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;
  return (
    (1 - w) * ((1 - v) * ((1 - u) * grad(PERM[AA], x, y, z) + u * grad(PERM[BA], x - 1, y, z)) +
      v * ((1 - u) * grad(PERM[AB], x, y - 1, z) + u * grad(PERM[BB], x - 1, y - 1, z))) +
    w * ((1 - v) * ((1 - u) * grad(PERM[AA + 1], x, y, z - 1) + u * grad(PERM[BA + 1], x - 1, y, z - 1)) +
      v * ((1 - u) * grad(PERM[AB + 1], x, y - 1, z - 1) + u * grad(PERM[BB + 1], x - 1, y - 1, z - 1)))
  );
}

/* ============================================================
 *  FireflySystem - floating particles like fireflies
 * ============================================================ */
export interface FireflyConfig {
  count: number;
  scene: THREE.Scene;
  bounds: number;
  theme?: ColorTheme;
}

export class FireflySystem {
  private scene: THREE.Scene;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private phases: Float32Array;
  private sizes: Float32Array;
  private count: number;
  private bounds: number;
  public theme: ColorTheme = 'aurora';

  constructor(config: FireflyConfig) {
    this.scene = config.scene;
    this.count = config.count;
    this.bounds = config.bounds;
    if (config.theme) this.theme = config.theme;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.phases = new Float32Array(this.count);
    this.sizes = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const r = this.bounds * (0.3 + Math.random() * 0.7);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);
      this.velocities[i3] = (Math.random() - 0.5) * 0.004;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.004;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.004;
      this.phases[i] = Math.random() * Math.PI * 2;
      this.sizes[i] = 1.5 + Math.random() * 3.5;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      vertexColors: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'Fireflies';
    this.scene.add(this.points);
  }

  getPoints(): THREE.Points { return this.points; }
  getPositionArray(): Float32Array { return this.positions; }
  getCount(): number { return this.count; }

  update(delta: number, time: number): void {
    const palette = THEMES[this.theme];
    const baseColor = palette.colors[0];
    const accentColor = palette.accent;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const phase = this.phases[i];
      const nx = noise3(this.positions[i3] * 0.4 + time * 0.05, this.positions[i3 + 1] * 0.4, this.positions[i3 + 2] * 0.4 + phase);
      const ny = noise3(this.positions[i3] * 0.4 + 100, this.positions[i3 + 1] * 0.4 + time * 0.05, this.positions[i3 + 2] * 0.4 + 200 + phase);
      const nz = noise3(this.positions[i3] * 0.4 + 300 + phase, this.positions[i3 + 1] * 0.4 + 400, this.positions[i3 + 2] * 0.4 + time * 0.05);

      const speed = 0.35 * delta;
      this.positions[i3] += (nx * 0.5 + this.velocities[i3]) * speed;
      this.positions[i3 + 1] += (ny * 0.5 + this.velocities[i3 + 1]) * speed;
      this.positions[i3 + 2] += (nz * 0.5 + this.velocities[i3 + 2]) * speed;

      const dist = Math.sqrt(
        this.positions[i3] ** 2 + this.positions[i3 + 1] ** 2 + this.positions[i3 + 2] ** 2
      );
      if (dist > this.bounds * 1.1) {
        const scale = (this.bounds * 0.9) / dist;
        this.positions[i3] *= scale;
        this.positions[i3 + 1] *= scale;
        this.positions[i3 + 2] *= scale;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;

    const colMix = (Math.sin(time * 0.7) + 1) * 0.5;
    this.material.color.copy(lerpColor(baseColor, accentColor, 0.3 + colMix * 0.4));
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* ============================================================
 *  ConnectionNetwork - lines between nearby fireflies
 * ============================================================ */
export class ConnectionNetwork {
  private scene: THREE.Scene;
  private fireflies: THREE.Points;
  private maxDistance: number;
  private line: THREE.LineSegments;
  private lineGeometry: THREE.BufferGeometry;
  private lineMaterial: THREE.LineBasicMaterial;
  private maxConnections: number;

  constructor(fireflies: THREE.Points, scene: THREE.Scene, maxDistance: number) {
    this.fireflies = fireflies;
    this.scene = scene;
    this.maxDistance = maxDistance;
    this.maxConnections = 600;

    const positions = new Float32Array(this.maxConnections * 6);
    const colors = new Float32Array(this.maxConnections * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.lineGeometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.line = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.line.name = 'ConnectionNetwork';
    this.scene.add(this.line);
  }

  update(theme: ColorTheme = 'aurora'): void {
    const positions = this.fireflies.geometry.attributes.position.array as Float32Array;
    const linePositions = this.lineGeometry.attributes.position.array as Float32Array;
    const lineColors = this.lineGeometry.attributes.color.array as Float32Array;
    const count = positions.length / 3;

    const palette = THEMES[theme];
    const col0 = palette.colors[0];
    const col1 = palette.accent;

    const cellSize = this.maxDistance;
    const grid = new Map<string, number[]>();

    for (let i = 0; i < count; i++) {
      const cx = Math.floor(positions[i * 3] / cellSize);
      const cy = Math.floor(positions[i * 3 + 1] / cellSize);
      const cz = Math.floor(positions[i * 3 + 2] / cellSize);
      const key = `${cx},${cy},${cz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(i);
    }

    let lineIdx = 0;
    const maxDistSq = this.maxDistance * this.maxDistance;
    let segCount = 0;

    for (let i = 0; i < count && segCount < this.maxConnections; i++) {
      const i3 = i * 3;
      const cx = Math.floor(positions[i3] / cellSize);
      const cy = Math.floor(positions[i3 + 1] / cellSize);
      const cz = Math.floor(positions[i3 + 2] / cellSize);

      for (let dx = -1; dx <= 1 && segCount < this.maxConnections; dx++) {
        for (let dy = -1; dy <= 1 && segCount < this.maxConnections; dy++) {
          for (let dz = -1; dz <= 1 && segCount < this.maxConnections; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const cell = grid.get(key);
            if (!cell) continue;
            for (const j of cell) {
              if (j <= i) continue;
              const j3 = j * 3;
              const dx2 = positions[i3] - positions[j3];
              const dy2 = positions[i3 + 1] - positions[j3 + 1];
              const dz2 = positions[i3 + 2] - positions[j3 + 2];
              const distSq = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;
              if (distSq < maxDistSq) {
                const alpha = 1 - Math.sqrt(distSq) / this.maxDistance;
                const w = lineIdx * 6;
                linePositions[w] = positions[i3];
                linePositions[w + 1] = positions[i3 + 1];
                linePositions[w + 2] = positions[i3 + 2];
                linePositions[w + 3] = positions[j3];
                linePositions[w + 4] = positions[j3 + 1];
                linePositions[w + 5] = positions[j3 + 2];

                const mixT = 0.3 + alpha * 0.4;
                const cr = THREE.MathUtils.lerp(col0.r, col1.r, mixT) * alpha;
                const cg = THREE.MathUtils.lerp(col0.g, col1.g, mixT) * alpha;
                const cb = THREE.MathUtils.lerp(col0.b, col1.b, mixT) * alpha;
                lineColors[w] = cr;
                lineColors[w + 1] = cg;
                lineColors[w + 2] = cb;
                lineColors[w + 3] = cr;
                lineColors[w + 4] = cg;
                lineColors[w + 5] = cb;

                lineIdx++;
                segCount++;
              }
            }
          }
        }
      }
    }

    this.lineGeometry.setDrawRange(0, segCount * 2);
    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.color.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.line);
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
  }
}

/* ============================================================
 *  PulseRing - expanding torus ring from clicked cluster
 * ============================================================ */
export interface PulseRingConfig {
  position: THREE.Vector3;
  theme: ColorTheme;
  maxRadius: number;
  duration: number;
  scene: THREE.Scene;
  onRadiusReached: (radius: number, position: THREE.Vector3, theme: ColorTheme) => void;
}

export class PulseRing {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh;
  private config: PulseRingConfig;
  private elapsed: number = 0;
  private currentRadius: number = 0;
  private triggeredRadii: Set<number> = new Set();
  private disposed: boolean = false;

  constructor(config: PulseRingConfig) {
    this.config = config;
    this.scene = config.scene;
    const palette = THEMES[config.theme];

    const geometry = new THREE.TorusGeometry(0.01, 0.035, 16, 128);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor0: { value: palette.colors[0].clone() },
        uColor1: { value: palette.accent.clone() },
        uOpacity: { value: 1.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor0;
        uniform vec3 uColor1;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float pulse = 0.6 + 0.4 * sin(vUv.x * 6.28318 * 8.0 + uTime * 4.0);
          vec3 col = mix(uColor0, uColor1, vUv.x);
          float edge = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
          gl_FragColor = vec4(col * pulse, uOpacity * edge);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(config.position);
    this.mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    this.mesh.rotation.z = Math.random() * Math.PI;
    this.scene.add(this.mesh);
  }

  update(delta: number, time: number): boolean {
    if (this.disposed) return true;
    this.elapsed += delta;

    const progress = Math.min(this.elapsed / this.config.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.currentRadius = eased * this.config.maxRadius;

    const scale = this.currentRadius / 0.01 || 1;
    this.mesh.scale.set(scale, scale, scale);

    const opacity = progress < 0.15
      ? progress / 0.15
      : (1 - (progress - 0.15) / 0.85);
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.max(0, opacity * 0.85);
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

    for (let r = 1; r <= 8; r++) {
      const targetR = r;
      if (!this.triggeredRadii.has(targetR) && this.currentRadius >= targetR) {
        this.triggeredRadii.add(targetR);
        this.config.onRadiusReached(this.currentRadius, this.config.position, this.config.theme);
      }
    }

    if (progress >= 1) {
      this.dispose();
      return true;
    }
    return false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.mesh);
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
  }
}

/* ============================================================
 *  Shared ripple texture for crystal light patterns
 * ============================================================ */
let g_rippleTexture: THREE.CanvasTexture | null = null;
let g_rippleCanvas: HTMLCanvasElement | null = null;
let g_rippleCtx: CanvasRenderingContext2D | null = null;

export function getRippleTexture(): THREE.CanvasTexture {
  if (g_rippleTexture) return g_rippleTexture;

  const size = 256;
  g_rippleCanvas = document.createElement('canvas');
  g_rippleCanvas.width = size;
  g_rippleCanvas.height = size;
  g_rippleCtx = g_rippleCanvas.getContext('2d')!;

  g_rippleTexture = new THREE.CanvasTexture(g_rippleCanvas);
  g_rippleTexture.wrapS = THREE.RepeatWrapping;
  g_rippleTexture.wrapT = THREE.RepeatWrapping;
  g_rippleTexture.magFilter = THREE.LinearFilter;
  g_rippleTexture.minFilter = THREE.LinearFilter;

  updateRippleTexture(0, 1);
  return g_rippleTexture;
}

export function updateRippleTexture(time: number, speed: number): void {
  if (!g_rippleCtx || !g_rippleCanvas || !g_rippleTexture) return;
  const ctx = g_rippleCtx;
  const W = g_rippleCanvas.width, H = g_rippleCanvas.height;

  ctx.clearRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.5, 'rgba(30,20,50,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';
  const t = time * speed;

  for (let band = 0; band < 8; band++) {
    const phase = (t * 0.4 + band * 0.35) % 1.0;
    const y = phase * H * 2 - H * 0.5;
    const bandGrad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    const alpha = 0.12 + Math.sin(t * 2.0 + band) * 0.05;
    bandGrad.addColorStop(0, `rgba(255,255,255,0)`);
    bandGrad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    bandGrad.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, y - 30, W, 60);
  }

  for (let streak = 0; streak < 12; streak++) {
    const baseX = ((streak / 12) * W + t * 40 * (0.5 + (streak % 3) * 0.3)) % (W + 100) - 50;
    const width = 2 + (streak % 4);
    const streakGrad = ctx.createLinearGradient(baseX - 20, 0, baseX + width + 20, 0);
    streakGrad.addColorStop(0, 'rgba(255,255,255,0)');
    streakGrad.addColorStop(0.5, `rgba(255,255,255,${0.08 + (streak % 5) * 0.015})`);
    streakGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(baseX - 20, 0, width + 40, H);
  }

  for (let sparkle = 0; sparkle < 40; sparkle++) {
    const sx = ((sparkle * 73 + t * 80) % W + W) % W;
    const sy = ((sparkle * 131 * 0.37 + t * 60 * (1 + (sparkle % 3) * 0.2)) % H + H) % H;
    const a = 0.2 + 0.3 * Math.abs(Math.sin(t * 3 + sparkle * 0.7));
    const sz = 1 + (sparkle % 3);
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  g_rippleTexture.needsUpdate = true;
}

export function disposeRippleTexture(): void {
  if (g_rippleTexture) {
    g_rippleTexture.dispose();
    g_rippleTexture = null;
  }
  g_rippleCanvas = null;
  g_rippleCtx = null;
}

/* ============================================================
 *  TipParticles - particles emitted from crystal tips
 * ============================================================ */
const TIP_MAX_PARTICLES = 800;

export interface TipParticlesConfig {
  scene: THREE.Scene;
}

export interface TipEmitter {
  getTipWorldPosition(target: THREE.Vector3): void;
  getEmissionRate(): number;
  getThemeColors(): [THREE.Color, THREE.Color];
  isHovered(): boolean;
}

export class TipParticles {
  private scene: THREE.Scene;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private maxLifetime: Float32Array;
  private colors: Float32Array;
  private nextSlot: number = 0;
  private emitAccumulator: Map<number, number> = new Map();

  constructor(config: TipParticlesConfig) {
    this.scene = config.scene;

    this.positions = new Float32Array(TIP_MAX_PARTICLES * 3);
    this.velocities = new Float32Array(TIP_MAX_PARTICLES * 3);
    this.lifetimes = new Float32Array(TIP_MAX_PARTICLES);
    this.maxLifetime = new Float32Array(TIP_MAX_PARTICLES);
    this.colors = new Float32Array(TIP_MAX_PARTICLES * 3);

    this.lifetimes.fill(-1);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'TipParticles';
    this.scene.add(this.points);
  }

  emit(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    lifetime: number,
    color0: THREE.Color,
    color1: THREE.Color
  ): void {
    const idx = this.nextSlot;
    let found = false;
    for (let attempt = 0; attempt < TIP_MAX_PARTICLES; attempt++) {
      const check = (this.nextSlot + attempt) % TIP_MAX_PARTICLES;
      if (this.lifetimes[check] <= 0) {
        this.nextSlot = (check + 1) % TIP_MAX_PARTICLES;
        const i3 = check * 3;
        this.positions[i3] = position.x;
        this.positions[i3 + 1] = position.y;
        this.positions[i3 + 2] = position.z;
        this.velocities[i3] = velocity.x;
        this.velocities[i3 + 1] = velocity.y;
        this.velocities[i3 + 2] = velocity.z;
        this.lifetimes[check] = lifetime;
        this.maxLifetime[check] = lifetime;
        const mix = Math.random();
        this.colors[i3] = THREE.MathUtils.lerp(color0.r, color1.r, mix);
        this.colors[i3 + 1] = THREE.MathUtils.lerp(color0.g, color1.g, mix);
        this.colors[i3 + 2] = THREE.MathUtils.lerp(color0.b, color1.b, mix);
        found = true;
        break;
      }
    }
    if (!found) {
      this.nextSlot = (this.nextSlot + 1) % TIP_MAX_PARTICLES;
    }
  }

  emitFromEmitters(emitters: TipEmitter[], delta: number, time: number): void {
    for (let ei = 0; ei < emitters.length; ei++) {
      const emitter = emitters[ei];
      const rate = emitter.getEmissionRate();
      const acc = (this.emitAccumulator.get(ei) || 0) + rate * delta;
      let toEmit = Math.floor(acc);
      this.emitAccumulator.set(ei, acc - toEmit);

      if (toEmit > 0) {
        const pos = new THREE.Vector3();
        const [c0, c1] = emitter.getThemeColors();
        while (toEmit-- > 0) {
          emitter.getTipWorldPosition(pos);
          pos.x += (Math.random() - 0.5) * 0.05;
          pos.y += (Math.random() - 0.5) * 0.05;
          pos.z += (Math.random() - 0.5) * 0.05;
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            0.3 + Math.random() * 0.7,
            (Math.random() - 0.5) * 0.4
          ).normalize().multiplyScalar(0.4 + Math.random() * 0.6);
          this.emit(pos, dir, 1.2 + Math.random() * 1.5, c0, c1);
        }
      }
    }
  }

  update(delta: number, time: number): void {
    for (let i = 0; i < TIP_MAX_PARTICLES; i++) {
      if (this.lifetimes[i] > 0) {
        this.lifetimes[i] -= delta;
        const i3 = i * 3;
        this.positions[i3] += this.velocities[i3] * delta;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
        this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;
        this.velocities[i3 + 1] -= 0.15 * delta;

        const alphaFade = Math.max(0, this.lifetimes[i] / this.maxLifetime[i]);
        this.colors[i3] *= 1;
        this.colors[i3 + 1] *= 1;
        this.colors[i3 + 2] *= 1;
        if (alphaFade <= 0.01) {
          this.lifetimes[i] = -1;
        }
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
