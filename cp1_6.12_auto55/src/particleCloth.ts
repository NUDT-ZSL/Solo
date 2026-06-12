import * as THREE from 'three';

export type DensityLevel = 'sparse' | 'medium' | 'dense';

export type ThemeName = 'fire' | 'cold' | 'jungle';

export interface ThemeColors {
  center: THREE.Color;
  edge: THREE.Color;
  accent: string;
  accentGlow: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  fire: {
    center: new THREE.Color(0xffcc55),
    edge: new THREE.Color(0xff3322),
    accent: '#ff8844',
    accentGlow: 'rgba(255, 136, 68, 0.5)',
  },
  cold: {
    center: new THREE.Color(0x88ddff),
    edge: new THREE.Color(0x6633cc),
    accent: '#66aaff',
    accentGlow: 'rgba(102, 170, 255, 0.5)',
  },
  jungle: {
    center: new THREE.Color(0xccff66),
    edge: new THREE.Color(0x22aa44),
    accent: '#66dd88',
    accentGlow: 'rgba(102, 221, 136, 0.5)',
  },
};

export const DENSITY_CONFIG: Record<DensityLevel, { nodesX: number; nodesY: number; perNode: number }> = {
  sparse: { nodesX: 14, nodesY: 14, perNode: 10 },
  medium: { nodesX: 20, nodesY: 20, perNode: 12 },
  dense: { nodesX: 28, nodesY: 28, perNode: 10 },
};

interface Node {
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  pinned: boolean;
  index: number;
}

interface Particle {
  nodeIndex: number;
  offset: THREE.Vector3;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  highlightT: number;
}

interface Trail {
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface Spring {
  a: number;
  b: number;
  restLength: number;
}

export interface DragState {
  active: boolean;
  nodeIndex: number | null;
  targetPos: THREE.Vector3;
  startPos: THREE.Vector3;
}

export class ParticleCloth {
  scene: THREE.Scene;
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;

  nodePositions: Float32Array;
  nodePrevPositions: Float32Array;
  nodePinned: Uint8Array;

  nodesX = 20;
  nodesY = 20;
  perNode = 12;
  totalParticles = 0;
  totalNodes = 0;

  nodeSpacing = 0.6;
  gravity = -0.12;
  elasticity = 0.5;
  damping = 0.85;
  iterations = 4;

  particles: Particle[] = [];
  nodes: Node[] = [];
  springs: Spring[] = [];
  trails: Trail[] = [];
  maxTrails = 400;

  theme: ThemeName = 'fire';
  currentTheme: ThemeColors;
  targetTheme: ThemeColors;
  themeTransitionT = 1;
  themeTransitionDuration = 1000;
  themeTransitionStart = 0;

  drag: DragState = { active: false, nodeIndex: null, targetPos: new THREE.Vector3(), startPos: new THREE.Vector3() };
  dragRadius = 3.0;
  highlightDuration = 500;
  trailDuration = 200;
  lastTrailEmit = 0;
  trailEmitInterval = 16;

  clothWidth = 0;
  clothHeight = 0;
  centerOffsetX = 0;
  centerOffsetY = 0;

  densityLevel: DensityLevel = 'medium';
  transitioningDensity = false;
  densityTransitionStart = 0;
  densityTransitionDuration = 600;
  targetDensity: DensityLevel = 'medium';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentTheme = { ...THEMES.fire, center: THEMES.fire.center.clone(), edge: THEMES.fire.edge.clone() };
    this.targetTheme = { ...THEMES.fire, center: THEMES.fire.center.clone(), edge: THEMES.fire.edge.clone() };

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(0);
    this.colors = new Float32Array(0);
    this.sizes = new Float32Array(0);
    this.nodePositions = new Float32Array(0);
    this.nodePrevPositions = new Float32Array(0);
    this.nodePinned = new Uint8Array(0);

    const material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      map: this.createSpriteTexture(),
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);

    this.rebuild(this.densityLevel);
  }

  createSpriteTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  rebuild(density: DensityLevel) {
    const cfg = DENSITY_CONFIG[density];
    this.nodesX = cfg.nodesX;
    this.nodesY = cfg.nodesY;
    this.perNode = cfg.perNode;
    this.densityLevel = density;
    this.totalNodes = this.nodesX * this.nodesY;
    this.totalParticles = this.totalNodes * this.perNode;

    this.clothWidth = (this.nodesX - 1) * this.nodeSpacing;
    this.clothHeight = (this.nodesY - 1) * this.nodeSpacing;
    this.centerOffsetX = -this.clothWidth / 2;
    this.centerOffsetY = this.clothHeight / 2 + 1.5;

    this.nodePositions = new Float32Array(this.totalNodes * 3);
    this.nodePrevPositions = new Float32Array(this.totalNodes * 3);
    this.nodePinned = new Uint8Array(this.totalNodes);

    this.nodes = [];
    for (let y = 0; y < this.nodesY; y++) {
      for (let x = 0; x < this.nodesX; x++) {
        const i = y * this.nodesX + x;
        const px = x * this.nodeSpacing + this.centerOffsetX;
        const py = this.centerOffsetY - y * this.nodeSpacing;
        const pz = 0;
        this.nodePositions[i * 3] = px;
        this.nodePositions[i * 3 + 1] = py;
        this.nodePositions[i * 3 + 2] = pz;
        this.nodePrevPositions[i * 3] = px;
        this.nodePrevPositions[i * 3 + 1] = py;
        this.nodePrevPositions[i * 3 + 2] = pz;
        const pinned = y === 0 && (x % 3 === 0 || x === this.nodesX - 1);
        this.nodePinned[i] = pinned ? 1 : 0;
        this.nodes.push({
          pos: new THREE.Vector3(px, py, pz),
          prev: new THREE.Vector3(px, py, pz),
          pinned,
          index: i,
        });
      }
    }

    this.springs = [];
    for (let y = 0; y < this.nodesY; y++) {
      for (let x = 0; x < this.nodesX; x++) {
        const i = y * this.nodesX + x;
        if (x < this.nodesX - 1) this.addSpring(i, i + 1);
        if (y < this.nodesY - 1) this.addSpring(i, i + this.nodesX);
        if (x < this.nodesX - 1 && y < this.nodesY - 1) {
          this.addSpring(i, i + this.nodesX + 1);
          this.addSpring(i + 1, i + this.nodesX);
        }
        if (x < this.nodesX - 2) this.addSpring(i, i + 2);
        if (y < this.nodesY - 2) this.addSpring(i, i + this.nodesX * 2);
      }
    }

    this.particles = [];
    this.positions = new Float32Array(this.totalParticles * 3);
    this.colors = new Float32Array(this.totalParticles * 3);
    this.sizes = new Float32Array(this.totalParticles);

    for (let n = 0; n < this.totalNodes; n++) {
      const nx = (n % this.nodesX) / (this.nodesX - 1);
      const ny = Math.floor(n / this.nodesX) / (this.nodesY - 1);
      const cx = 0.5, cy = 0.5;
      const distFromCenter = Math.min(1, Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2) * 2.2);
      for (let p = 0; p < this.perNode; p++) {
        const angle = (p / this.perNode) * Math.PI * 2 + Math.random() * 0.3;
        const radius = 0.12 + Math.random() * 0.15;
        const ox = Math.cos(angle) * radius;
        const oy = Math.sin(angle) * radius;
        const oz = (Math.random() - 0.5) * 0.08;
        const baseColor = new THREE.Color().lerpColors(this.currentTheme.center, this.currentTheme.edge, distFromCenter);
        const currentColor = baseColor.clone();
        const targetColor = baseColor.clone();
        this.particles.push({
          nodeIndex: n,
          offset: new THREE.Vector3(ox, oy, oz),
          baseColor,
          currentColor,
          targetColor,
          highlightT: 0,
        });
      }
    }

    this.updateBuffersStatic();
  }

  addSpring(a: number, b: number) {
    const dx = this.nodePositions[a * 3] - this.nodePositions[b * 3];
    const dy = this.nodePositions[a * 3 + 1] - this.nodePositions[b * 3 + 1];
    const dz = this.nodePositions[a * 3 + 2] - this.nodePositions[b * 3 + 2];
    const rest = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.springs.push({ a, b, restLength: rest });
  }

  updateBuffersStatic() {
    for (let i = 0; i < this.totalParticles; i++) {
      const p = this.particles[i];
      const n = p.nodeIndex;
      this.positions[i * 3] = this.nodePositions[n * 3] + p.offset.x;
      this.positions[i * 3 + 1] = this.nodePositions[n * 3 + 1] + p.offset.y;
      this.positions[i * 3 + 2] = this.nodePositions[n * 3 + 2] + p.offset.z;
      this.colors[i * 3] = p.currentColor.r;
      this.colors[i * 3 + 1] = p.currentColor.g;
      this.colors[i * 3 + 2] = p.currentColor.b;
      this.sizes[i] = 0.15 + Math.random() * 0.1;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  setElasticity(v: number) {
    this.elasticity = v;
  }

  setDamping(v: number) {
    this.damping = v;
  }

  setDensity(level: DensityLevel) {
    if (level === this.densityLevel) return;
    this.targetDensity = level;
    this.transitioningDensity = true;
    this.densityTransitionStart = performance.now();
  }

  setTheme(themeName: ThemeName, now: number) {
    if (themeName === this.theme) return;
    this.theme = themeName;
    const t = THEMES[themeName];
    this.targetTheme = { ...t, center: t.center.clone(), edge: t.edge.clone() };
    this.themeTransitionT = 0;
    this.themeTransitionStart = now;
  }

  applyNodeDrag(nodeIndex: number, target: THREE.Vector3) {
    for (let i = 0; i < this.totalNodes; i++) {
      if (this.nodePinned[i]) continue;
      const dx = this.nodePositions[i * 3] - this.nodePositions[nodeIndex * 3];
      const dy = this.nodePositions[i * 3 + 1] - this.nodePositions[nodeIndex * 3 + 1];
      const dz = this.nodePositions[i * 3 + 2] - this.nodePositions[nodeIndex * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= this.dragRadius) {
        const falloff = 1 - dist / this.dragRadius;
        const weight = falloff * falloff * (3 - 2 * falloff);
        this.nodePositions[i * 3] += (target.x - this.nodePositions[nodeIndex * 3]) * weight;
        this.nodePositions[i * 3 + 1] += (target.y - this.nodePositions[nodeIndex * 3 + 1]) * weight;
        this.nodePositions[i * 3 + 2] += (target.z - this.nodePositions[nodeIndex * 3 + 2]) * weight;
      }
    }
    for (let p = 0; p < this.totalParticles; p++) {
      const particle = this.particles[p];
      const n = particle.nodeIndex;
      const dx = this.nodePositions[n * 3] - this.nodePositions[nodeIndex * 3];
      const dy = this.nodePositions[n * 3 + 1] - this.nodePositions[nodeIndex * 3 + 1];
      const dz = this.nodePositions[n * 3 + 2] - this.nodePositions[nodeIndex * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= this.dragRadius) {
        particle.highlightT = 1;
      }
    }
  }

  emitTrail(now: number) {
    if (now - this.lastTrailEmit < this.trailEmitInterval) return;
    this.lastTrailEmit = now;
    if (this.drag.active && this.drag.nodeIndex != null) {
      const n = this.drag.nodeIndex;
      for (let i = 0; i < this.totalNodes; i++) {
        const dx = this.nodePositions[i * 3] - this.nodePositions[n * 3];
        const dy = this.nodePositions[i * 3 + 1] - this.nodePositions[n * 3 + 1];
        const dz = this.nodePositions[i * 3 + 2] - this.nodePositions[n * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= this.dragRadius * 0.6) {
          if (this.trails.length >= this.maxTrails) break;
          const col = new THREE.Color(0xffffff);
          this.trails.push({
            pos: new THREE.Vector3(this.nodePositions[i * 3], this.nodePositions[i * 3 + 1], this.nodePositions[i * 3 + 2]),
            life: this.trailDuration,
            maxLife: this.trailDuration,
            color: col,
          });
        }
      }
    }
  }

  physicsStep(dt: number) {
    const d = Math.pow(this.damping, dt * 60);
    const g = this.gravity * dt * 60;
    for (let i = 0; i < this.totalNodes; i++) {
      if (this.nodePinned[i]) continue;
      const x = this.nodePositions[i * 3];
      const y = this.nodePositions[i * 3 + 1];
      const z = this.nodePositions[i * 3 + 2];
      const px = this.nodePrevPositions[i * 3];
      const py = this.nodePrevPositions[i * 3 + 1];
      const pz = this.nodePrevPositions[i * 3 + 2];
      const vx = (x - px) * d;
      const vy = (y - py) * d;
      const vz = (z - pz) * d;
      this.nodePrevPositions[i * 3] = x;
      this.nodePrevPositions[i * 3 + 1] = y;
      this.nodePrevPositions[i * 3 + 2] = z;
      this.nodePositions[i * 3] = x + vx;
      this.nodePositions[i * 3 + 1] = y + vy + g;
      this.nodePositions[i * 3 + 2] = z + vz;
    }
    const stiffness = this.elasticity;
    for (let iter = 0; iter < this.iterations; iter++) {
      for (let s = 0; s < this.springs.length; s++) {
        const sp = this.springs[s];
        const ax = sp.a * 3, bx = sp.b * 3;
        const dx = this.nodePositions[bx] - this.nodePositions[ax];
        const dy = this.nodePositions[bx + 1] - this.nodePositions[ax + 1];
        const dz = this.nodePositions[bx + 2] - this.nodePositions[ax + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        const diff = (dist - sp.restLength) / dist * stiffness * 0.5;
        const ox = dx * diff;
        const oy = dy * diff;
        const oz = dz * diff;
        if (!this.nodePinned[sp.a]) {
          this.nodePositions[ax] += ox;
          this.nodePositions[ax + 1] += oy;
          this.nodePositions[ax + 2] += oz;
        }
        if (!this.nodePinned[sp.b]) {
          this.nodePositions[bx] -= ox;
          this.nodePositions[bx + 1] -= oy;
          this.nodePositions[bx + 2] -= oz;
        }
      }
    }
  }

  update(now: number, dt: number) {
    if (this.transitioningDensity) {
      const t = Math.min(1, (now - this.densityTransitionStart) / this.densityTransitionDuration);
      if (t >= 1) {
        this.transitioningDensity = false;
        this.rebuild(this.targetDensity);
      }
    }

    if (this.themeTransitionT < 1) {
      this.themeTransitionT = Math.min(1, (now - this.themeTransitionStart) / this.themeTransitionDuration);
      const t = this.themeTransitionT;
      for (let p = 0; p < this.totalParticles; p++) {
        const particle = this.particles[p];
        const n = particle.nodeIndex;
        const nx = (n % this.nodesX) / (this.nodesX - 1);
        const ny = Math.floor(n / this.nodesX) / (this.nodesY - 1);
        const cx = 0.5, cy = 0.5;
        const distFromCenter = Math.min(1, Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2) * 2.2);
        const targetCol = new THREE.Color().lerpColors(this.targetTheme.center, this.targetTheme.edge, distFromCenter);
        particle.baseColor.lerp(targetCol, 0.08);
      }
    }

    const steps = 2;
    for (let s = 0; s < steps; s++) {
      this.physicsStep(dt / steps);
    }

    for (let i = 0; i < this.trails.length; i++) {
      this.trails[i].life -= dt * 1000;
    }
    this.trails = this.trails.filter(t => t.life > 0);

    this.emitTrail(now);

    const hlFactor = dt * 1000 / this.highlightDuration;

    for (let p = 0; p < this.totalParticles; p++) {
      const particle = this.particles[p];
      const n = particle.nodeIndex;
      this.positions[p * 3] = this.nodePositions[n * 3] + particle.offset.x;
      this.positions[p * 3 + 1] = this.nodePositions[n * 3 + 1] + particle.offset.y;
      this.positions[p * 3 + 2] = this.nodePositions[n * 3 + 2] + particle.offset.z;

      if (particle.highlightT > 0) {
        particle.highlightT = Math.max(0, particle.highlightT - hlFactor);
      }
      const w = particle.highlightT;
      const r = particle.baseColor.r * (1 - w) + 1 * w;
      const g = particle.baseColor.g * (1 - w) + 1 * w;
      const b = particle.baseColor.b * (1 - w) + 1 * w;
      this.colors[p * 3] = r;
      this.colors[p * 3 + 1] = g;
      this.colors[p * 3 + 2] = b;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  findNearestNode(worldPos: THREE.Vector3): number {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.totalNodes; i++) {
      const dx = this.nodePositions[i * 3] - worldPos.x;
      const dy = this.nodePositions[i * 3 + 1] - worldPos.y;
      const dz = this.nodePositions[i * 3 + 2] - worldPos.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  getNodePosition(index: number, out: THREE.Vector3) {
    out.x = this.nodePositions[index * 3];
    out.y = this.nodePositions[index * 3 + 1];
    out.z = this.nodePositions[index * 3 + 2];
  }

  getTrailGeometry(): { positions: Float32Array; colors: Float32Array } {
    const count = this.trails.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = this.trails[i];
      pos[i * 3] = t.pos.x;
      pos[i * 3 + 1] = t.pos.y;
      pos[i * 3 + 2] = t.pos.z;
      const alpha = t.life / t.maxLife;
      col[i * 3] = 1 * alpha;
      col[i * 3 + 1] = 1 * alpha;
      col[i * 3 + 2] = 0.9 * alpha;
    }
    return { positions: pos, colors: col };
  }

  getThemeAccent(): { accent: string; accentGlow: string } {
    const t = THEMES[this.theme];
    return { accent: t.accent, accentGlow: t.accentGlow };
  }

  dispose() {
    this.geometry.dispose();
    const mat = this.points.material as THREE.PointsMaterial;
    if (mat.map) mat.map.dispose();
    mat.dispose();
  }
}
