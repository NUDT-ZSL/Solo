import * as THREE from 'three';
import { ColorTheme, lerpThemeColor } from './colors';

const VEIN_COUNT_FACTOR = 0.007;
const VEIN_CONTROL_POINTS = 12;
const VEIN_STEP_LENGTH = 3.5;
const VEIN_SPREAD = 22;
const OFFSET_MAX = 0.9;
const PARTICLE_BASE_SIZE = 2.5;
const EXPLOSION_DURATION = 0.7;
const CONVERGE_SPEED = 1.8;
const CONVERGE_SPIRAL_RATE = 4.0;
const CONNECTION_MAX_DIST = 2.8;
const CROSS_JUNCTION_DIST = 3.5;
const JUNCTION_SAMPLES = 40;

enum PState { Flowing, Exploding, Converging }

interface VeinPath {
  curve: THREE.CatmullRomCurve3;
  particleIndices: number[];
}

interface Junction {
  veinA: number;
  tA: number;
  veinB: number;
  tB: number;
}

interface ExplosionVFX {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;

  private positions: Float32Array;
  private pColors: Float32Array;
  private alphas: Float32Array;
  private pSizes: Float32Array;
  private velocities: Float32Array;
  private veinIndices: Int32Array;
  private veinTs: Float32Array;
  private offsetMags: Float32Array;
  private offsetAngles: Float32Array;
  private states: Uint8Array;
  private lives: Float32Array;
  private convergeTargets: Float32Array;

  private veins: VeinPath[] = [];
  private junctions: Junction[] = [];

  private pointsGeo: THREE.BufferGeometry;
  private pointsMat: THREE.ShaderMaterial;
  private pointsMesh: THREE.Points;

  private linePositions: Float32Array;
  private lineColors: Float32Array;
  private linesGeo: THREE.BufferGeometry;
  private linesMat: THREE.LineBasicMaterial;
  private linesMesh: THREE.LineSegments;

  private explosionVFXs: ExplosionVFX[] = [];

  private maxLines: number;
  private activeLines: number = 0;

  particleCount: number = 2000;
  flowSpeed: number = 1.0;
  currentTheme: ColorTheme;

  private pendingExplodePoints: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene, theme: ColorTheme) {
    this.scene = scene;
    this.currentTheme = theme;
    this.maxLines = 8000;

    const n = this.particleCount;
    this.positions = new Float32Array(n * 3);
    this.pColors = new Float32Array(n * 3);
    this.alphas = new Float32Array(n);
    this.pSizes = new Float32Array(n);
    this.velocities = new Float32Array(n * 3);
    this.veinIndices = new Int32Array(n);
    this.veinTs = new Float32Array(n);
    this.offsetMags = new Float32Array(n);
    this.offsetAngles = new Float32Array(n);
    this.states = new Uint8Array(n);
    this.lives = new Float32Array(n);
    this.convergeTargets = new Float32Array(n * 3);

    this.pointsGeo = new THREE.BufferGeometry();
    this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeo.setAttribute('aColor', new THREE.BufferAttribute(this.pColors, 3));
    this.pointsGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.pointsGeo.setAttribute('aSize', new THREE.BufferAttribute(this.pSizes, 1));

    this.pointsMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (280.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float diamond = (abs(uv.x) + abs(uv.y)) * 0.75;
          float dist = length(uv);
          float glow = exp(-dist * 2.8);
          float core = smoothstep(0.65, 0.0, diamond);
          vec3 col = vColor * (1.0 + core * 0.9);
          float a = vAlpha * (core * 0.92 + glow * 0.38);
          if (a < 0.008) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeo, this.pointsMat);
    scene.add(this.pointsMesh);

    this.linePositions = new Float32Array(this.maxLines * 6);
    this.lineColors = new Float32Array(this.maxLines * 6);
    this.linesGeo = new THREE.BufferGeometry();
    this.linesGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.linesGeo.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.linesGeo.setDrawRange(0, 0);

    this.linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.linesMesh = new THREE.LineSegments(this.linesGeo, this.linesMat);
    scene.add(this.linesMesh);

    this.generateVeins();
    this.distributeParticles();
    this.applyThemeColors();
  }

  private generateVeins(): void {
    this.veins = [];
    const count = Math.max(6, Math.round(this.particleCount * VEIN_COUNT_FACTOR));

    for (let v = 0; v < count; v++) {
      const pts: THREE.Vector3[] = [];
      let pos = new THREE.Vector3(
        (Math.random() - 0.5) * VEIN_SPREAD,
        (Math.random() - 0.5) * VEIN_SPREAD,
        (Math.random() - 0.5) * VEIN_SPREAD
      );
      let dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      const numPts = VEIN_CONTROL_POINTS + Math.floor(Math.random() * 6);
      const step = VEIN_STEP_LENGTH + Math.random() * 2;

      for (let i = 0; i < numPts; i++) {
        pts.push(pos.clone());
        dir.x += (Math.random() - 0.5) * 0.9;
        dir.y += (Math.random() - 0.5) * 0.9;
        dir.z += (Math.random() - 0.5) * 0.9;
        dir.normalize();
        pos = pos.clone().add(dir.clone().multiplyScalar(step));
      }

      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      this.veins.push({ curve, particleIndices: [] });
    }

    this.computeJunctions();
  }

  private computeJunctions(): void {
    this.junctions = [];
    const n = this.veins.length;
    if (n < 2) return;

    const sampled: THREE.Vector3[][] = this.veins.map(v => {
      const arr: THREE.Vector3[] = [];
      for (let i = 0; i < JUNCTION_SAMPLES; i++) {
        arr.push(v.curve.getPointAt(i / (JUNCTION_SAMPLES - 1)));
      }
      return arr;
    });

    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        let bestDist = CROSS_JUNCTION_DIST;
        let bestI = 0;
        let bestJ = 0;
        for (let i = 0; i < JUNCTION_SAMPLES; i += 2) {
          for (let j = 0; j < JUNCTION_SAMPLES; j += 2) {
            const d = sampled[a][i].distanceTo(sampled[b][j]);
            if (d < bestDist) {
              bestDist = d;
              bestI = i;
              bestJ = j;
            }
          }
        }
        if (bestDist < CROSS_JUNCTION_DIST) {
          this.junctions.push({
            veinA: a,
            tA: bestI / (JUNCTION_SAMPLES - 1),
            veinB: b,
            tB: bestJ / (JUNCTION_SAMPLES - 1),
          });
        }
      }
    }
  }

  private distributeParticles(): void {
    const n = this.particleCount;
    const veinCount = this.veins.length;
    const perVein = Math.floor(n / veinCount);
    let remaining = n - perVein * veinCount;

    for (const vein of this.veins) {
      vein.particleIndices = [];
    }

    let idx = 0;
    for (let v = 0; v < veinCount; v++) {
      const count = perVein + (remaining > 0 ? 1 : 0);
      if (remaining > 0) remaining--;
      for (let i = 0; i < count && idx < n; i++, idx++) {
        this.veinIndices[idx] = v;
        this.veinTs[idx] = Math.random();
        this.offsetMags[idx] = Math.random() * OFFSET_MAX;
        this.offsetAngles[idx] = Math.random() * Math.PI * 2;
        this.states[idx] = PState.Flowing;
        this.lives[idx] = 0;
        this.alphas[idx] = 1.0;
        this.pSizes[idx] = PARTICLE_BASE_SIZE * (0.7 + Math.random() * 0.6);
        this.velocities[idx * 3] = 0;
        this.velocities[idx * 3 + 1] = 0;
        this.velocities[idx * 3 + 2] = 0;
        this.veins[v].particleIndices.push(idx);
      }
    }

    this.updateAllPositions();
  }

  private updateAllPositions(): void {
    const n = this.particleCount;
    for (let i = 0; i < n; i++) {
      if (this.states[i] === PState.Flowing) {
        this.computeFlowingPosition(i);
      }
    }
    this.markPositionsDirty();
  }

  private computeFlowingPosition(i: number): void {
    const vi = this.veinIndices[i];
    const vein = this.veins[vi];
    if (!vein) return;
    const t = ((this.veinTs[i] % 1) + 1) % 1;
    const point = vein.curve.getPointAt(t);
    const tangent = vein.curve.getTangentAt(t);

    const up = Math.abs(tangent.y) < 0.99
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const perp1 = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const perp2 = new THREE.Vector3().crossVectors(tangent, perp1).normalize();

    const angle = this.offsetAngles[i];
    const mag = this.offsetMags[i];
    const ox = perp1.x * Math.cos(angle) + perp2.x * Math.sin(angle);
    const oy = perp1.y * Math.cos(angle) + perp2.y * Math.sin(angle);
    const oz = perp1.z * Math.cos(angle) + perp2.z * Math.sin(angle);

    this.positions[i * 3] = point.x + ox * mag;
    this.positions[i * 3 + 1] = point.y + oy * mag;
    this.positions[i * 3 + 2] = point.z + oz * mag;
  }

  private markPositionsDirty(): void {
    this.pointsGeo.attributes.position.needsUpdate = true;
    this.pointsGeo.attributes.aColor.needsUpdate = true;
    this.pointsGeo.attributes.aAlpha.needsUpdate = true;
    this.pointsGeo.attributes.aSize.needsUpdate = true;
  }

  private applyThemeColors(): void {
    const n = this.particleCount;
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      if (this.states[i] === PState.Flowing) {
        const t = this.offsetMags[i] / OFFSET_MAX;
        lerpThemeColor(this.currentTheme, t, tmp);
        this.pColors[i * 3] = tmp.r;
        this.pColors[i * 3 + 1] = tmp.g;
        this.pColors[i * 3 + 2] = tmp.b;
      }
    }
    this.pointsGeo.attributes.aColor.needsUpdate = true;
  }

  update(dt: number): void {
    const n = this.particleCount;
    const capped = Math.min(dt, 0.05);

    for (let i = 0; i < n; i++) {
      const state = this.states[i];
      if (state === PState.Flowing) {
        this.updateFlowing(i, capped);
      } else if (state === PState.Exploding) {
        this.updateExploding(i, capped);
      } else if (state === PState.Converging) {
        this.updateConverging(i, capped);
      }
    }

    while (this.pendingExplodePoints.length > 0) {
      const pt = this.pendingExplodePoints.pop()!;
      this.triggerExplosion(pt);
    }

    this.updateConnections();
    this.updateExplosionVFX(capped);

    this.markPositionsDirty();
  }

  private updateFlowing(i: number, dt: number): void {
    const veinLen = this.veins[this.veinIndices[i]].curve.getLength();
    const speed = (this.flowSpeed * 2.0) / Math.max(veinLen, 1);
    this.veinTs[i] += speed * dt;
    if (this.veinTs[i] > 1) this.veinTs[i] -= 1;
    this.offsetAngles[i] += dt * 0.15;
    this.computeFlowingPosition(i);

    const t = this.offsetMags[i] / OFFSET_MAX;
    const tmp = new THREE.Color();
    lerpThemeColor(this.currentTheme, t, tmp);
    this.pColors[i * 3] = tmp.r;
    this.pColors[i * 3 + 1] = tmp.g;
    this.pColors[i * 3 + 2] = tmp.b;
    this.alphas[i] = 0.85 + Math.sin(this.veinTs[i] * Math.PI * 6) * 0.15;
    this.pSizes[i] = PARTICLE_BASE_SIZE * (0.7 + this.offsetMags[i] * 0.5);
  }

  private updateExploding(i: number, dt: number): void {
    this.positions[i * 3] += this.velocities[i * 3] * dt;
    this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
    this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

    const damping = 0.96;
    this.velocities[i * 3] *= damping;
    this.velocities[i * 3 + 1] *= damping;
    this.velocities[i * 3 + 2] *= damping;

    this.lives[i] -= dt;
    const progress = 1 - this.lives[i] / EXPLOSION_DURATION;

    this.alphas[i] = Math.max(0, 1 - progress * 0.5);
    this.pSizes[i] = PARTICLE_BASE_SIZE * (0.4 + (1 - progress) * 0.8);

    const dc = this.currentTheme.debris;
    this.pColors[i * 3] = dc.r;
    this.pColors[i * 3 + 1] = dc.g;
    this.pColors[i * 3 + 2] = dc.b;

    if (this.lives[i] <= 0) {
      this.states[i] = PState.Converging;
      this.lives[i] = 0;
    }
  }

  private updateConverging(i: number, dt: number): void {
    const tx = this.convergeTargets[i * 3];
    const ty = this.convergeTargets[i * 3 + 1];
    const tz = this.convergeTargets[i * 3 + 2];

    const dx = tx - this.positions[i * 3];
    const dy = ty - this.positions[i * 3 + 1];
    const dz = tz - this.positions[i * 3 + 2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.3) {
      this.states[i] = PState.Flowing;
      this.veinTs[i] = Math.random();
      this.offsetMags[i] = Math.random() * OFFSET_MAX;
      this.offsetAngles[i] = Math.random() * Math.PI * 2;
      this.alphas[i] = 1.0;
      this.computeFlowingPosition(i);
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    const spiral = CONVERGE_SPIRAL_RATE * dt;
    const cosS = Math.cos(spiral);
    const sinS = Math.sin(spiral);
    const srx = nx * cosS - nz * sinS;
    const srz = nx * sinS + nz * cosS;

    const speed = CONVERGE_SPEED * (1 + this.lives[i] * 0.5);
    this.lives[i] += dt;

    this.positions[i * 3] += srx * speed * dt;
    this.positions[i * 3 + 1] += ny * speed * dt;
    this.positions[i * 3 + 2] += srz * speed * dt;

    const convergeProgress = Math.min(1, this.lives[i] * 0.5);
    this.alphas[i] = 0.4 + convergeProgress * 0.5;

    const tmp = new THREE.Color();
    lerpThemeColor(this.currentTheme, 1 - convergeProgress, tmp);
    this.pColors[i * 3] = tmp.r;
    this.pColors[i * 3 + 1] = tmp.g;
    this.pColors[i * 3 + 2] = tmp.b;
  }

  explodeAt(worldPoint: THREE.Vector3): void {
    this.pendingExplodePoints.push(worldPoint.clone());
  }

  private triggerExplosion(center: THREE.Vector3): void {
    const n = this.particleCount;
    const radius = 6.0;

    for (let i = 0; i < n; i++) {
      if (this.states[i] !== PState.Flowing) continue;

      const dx = this.positions[i * 3] - center.x;
      const dy = this.positions[i * 3 + 1] - center.y;
      const dz = this.positions[i * 3 + 2] - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < radius) {
        this.states[i] = PState.Exploding;
        this.lives[i] = EXPLOSION_DURATION;

        const factor = 1 - dist / radius;
        const force = factor * 8 + 2;
        const nd = dist > 0.01 ? 1 / dist : 1;
        const rdx = dx * nd + (Math.random() - 0.5) * 0.6;
        const rdy = dy * nd + (Math.random() - 0.5) * 0.6;
        const rdz = dz * nd + (Math.random() - 0.5) * 0.6;
        const rl = Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz) || 1;

        this.velocities[i * 3] = (rdx / rl) * force;
        this.velocities[i * 3 + 1] = (rdy / rl) * force;
        this.velocities[i * 3 + 2] = (rdz / rl) * force;

        this.convergeTargets[i * 3] = center.x + (Math.random() - 0.5) * 3;
        this.convergeTargets[i * 3 + 1] = center.y + (Math.random() - 0.5) * 3;
        this.convergeTargets[i * 3 + 2] = center.z + (Math.random() - 0.5) * 3;

        const vi = this.veinIndices[i];
        const idx = this.veins[vi].particleIndices.indexOf(i);
        if (idx !== -1) this.veins[vi].particleIndices.splice(idx, 1);
      }
    }

    this.generateVeins();
    this.reassignVeinIndices();
    this.createExplosionVFX(center);
  }

  private reassignVeinIndices(): void {
    const n = this.particleCount;
    let nextVein = 0;
    for (let i = 0; i < n; i++) {
      if (this.states[i] === PState.Flowing) {
        this.veinIndices[i] = nextVein % this.veins.length;
        this.veins[nextVein % this.veins.length].particleIndices.push(i);
        nextVein++;
      }
    }
  }

  private createExplosionVFX(center: THREE.Vector3): void {
    const geo = new THREE.SphereGeometry(0.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: this.currentTheme.glow,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    this.scene.add(mesh);

    this.explosionVFXs.push({
      mesh,
      life: 0,
      maxLife: 1.2,
    });
  }

  private updateExplosionVFX(dt: number): void {
    for (let i = this.explosionVFXs.length - 1; i >= 0; i--) {
      const vfx = this.explosionVFXs[i];
      vfx.life += dt;
      const progress = vfx.life / vfx.maxLife;

      if (progress >= 1) {
        this.scene.remove(vfx.mesh);
        vfx.mesh.geometry.dispose();
        (vfx.mesh.material as THREE.Material).dispose();
        this.explosionVFXs.splice(i, 1);
        continue;
      }

      const scale = 1 + progress * 12;
      vfx.mesh.scale.set(scale, scale, scale);
      (vfx.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - progress) * (1 - progress);
    }
  }

  private updateConnections(): void {
    let lineIdx = 0;
    const ml = this.maxLines;
    const lp = this.linePositions;
    const lc = this.lineColors;
    const theme = this.currentTheme;

    for (const vein of this.veins) {
      const indices = vein.particleIndices;
      if (indices.length < 2) continue;

      const sorted = indices.slice().sort((a, b) => this.veinTs[a] - this.veinTs[b]);

      for (let k = 0; k < sorted.length - 1 && lineIdx < ml; k++) {
        const ai = sorted[k];
        const bi = sorted[k + 1];

        const ax = this.positions[ai * 3], ay = this.positions[ai * 3 + 1], az = this.positions[ai * 3 + 2];
        const bx = this.positions[bi * 3], by = this.positions[bi * 3 + 1], bz = this.positions[bi * 3 + 2];
        const dd = (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2;

        if (dd > CONNECTION_MAX_DIST * CONNECTION_MAX_DIST) continue;

        const o = lineIdx * 6;
        lp[o] = ax; lp[o + 1] = ay; lp[o + 2] = az;
        lp[o + 3] = bx; lp[o + 4] = by; lp[o + 5] = bz;

        const fade = 1 - Math.sqrt(dd) / CONNECTION_MAX_DIST;
        const a1 = this.alphas[ai] * fade * 0.5;
        const a2 = this.alphas[bi] * fade * 0.5;

        lc[o] = theme.line.r * a1; lc[o + 1] = theme.line.g * a1; lc[o + 2] = theme.line.b * a1;
        lc[o + 3] = theme.line.r * a2; lc[o + 4] = theme.line.g * a2; lc[o + 5] = theme.line.b * a2;

        lineIdx++;
      }
    }

    for (const junc of this.junctions) {
      if (lineIdx >= ml) break;
      if (junc.veinA >= this.veins.length || junc.veinB >= this.veins.length) continue;

      const veinA = this.veins[junc.veinA];
      const veinB = this.veins[junc.veinB];

      let closestA = -1, closestB = -1;
      let bestDistA = Infinity, bestDistB = Infinity;

      for (const pi of veinA.particleIndices) {
        const d = Math.abs(this.veinTs[pi] - junc.tA);
        const td = Math.min(d, 1 - d);
        if (td < bestDistA) { bestDistA = td; closestA = pi; }
      }
      for (const pi of veinB.particleIndices) {
        const d = Math.abs(this.veinTs[pi] - junc.tB);
        const td = Math.min(d, 1 - d);
        if (td < bestDistB) { bestDistB = td; closestB = pi; }
      }

      if (closestA < 0 || closestB < 0) continue;
      if (this.states[closestA] !== PState.Flowing || this.states[closestB] !== PState.Flowing) continue;

      const ax = this.positions[closestA * 3], ay = this.positions[closestA * 3 + 1], az = this.positions[closestA * 3 + 2];
      const bx = this.positions[closestB * 3], by = this.positions[closestB * 3 + 1], bz = this.positions[closestB * 3 + 2];

      const o = lineIdx * 6;
      lp[o] = ax; lp[o + 1] = ay; lp[o + 2] = az;
      lp[o + 3] = bx; lp[o + 4] = by; lp[o + 5] = bz;

      const fade = 0.35;
      lc[o] = theme.line.r * fade; lc[o + 1] = theme.line.g * fade; lc[o + 2] = theme.line.b * fade;
      lc[o + 3] = theme.line.r * fade; lc[o + 4] = theme.line.g * fade; lc[o + 5] = theme.line.b * fade;

      lineIdx++;
    }

    this.activeLines = lineIdx;
    this.linesGeo.setDrawRange(0, lineIdx * 2);
    this.linesGeo.attributes.position.needsUpdate = true;
    this.linesGeo.attributes.color.needsUpdate = true;
  }

  setParticleCount(count: number): void {
    if (count === this.particleCount) return;
    this.particleCount = count;

    const n = count;
    this.positions = new Float32Array(n * 3);
    this.pColors = new Float32Array(n * 3);
    this.alphas = new Float32Array(n);
    this.pSizes = new Float32Array(n);
    this.velocities = new Float32Array(n * 3);
    this.veinIndices = new Int32Array(n);
    this.veinTs = new Float32Array(n);
    this.offsetMags = new Float32Array(n);
    this.offsetAngles = new Float32Array(n);
    this.states = new Uint8Array(n);
    this.lives = new Float32Array(n);
    this.convergeTargets = new Float32Array(n * 3);

    this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeo.setAttribute('aColor', new THREE.BufferAttribute(this.pColors, 3));
    this.pointsGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.pointsGeo.setAttribute('aSize', new THREE.BufferAttribute(this.pSizes, 1));

    this.generateVeins();
    this.distributeParticles();
    this.applyThemeColors();
  }

  setFlowSpeed(speed: number): void {
    this.flowSpeed = speed;
  }

  setTheme(theme: ColorTheme): void {
    this.currentTheme = theme;
    this.applyThemeColors();
    this.linesMat.color.copy(theme.line);
  }

  resetToFlowing(): void {
    const n = this.particleCount;
    for (let i = 0; i < n; i++) {
      if (this.states[i] !== PState.Flowing) {
        this.states[i] = PState.Flowing;
        this.veinTs[i] = Math.random();
        this.offsetMags[i] = Math.random() * OFFSET_MAX;
        this.offsetAngles[i] = Math.random() * Math.PI * 2;
        this.alphas[i] = 1.0;
      }
    }
    this.generateVeins();
    this.distributeParticles();
    this.applyThemeColors();
  }

  dispose(): void {
    this.pointsGeo.dispose();
    this.pointsMat.dispose();
    this.linesGeo.dispose();
    this.linesMat.dispose();
    for (const vfx of this.explosionVFXs) {
      this.scene.remove(vfx.mesh);
      vfx.mesh.geometry.dispose();
      (vfx.mesh.material as THREE.Material).dispose();
    }
  }
}
