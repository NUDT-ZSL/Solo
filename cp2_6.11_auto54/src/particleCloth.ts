import * as THREE from 'three';
import type { EmotionWord } from './textParser';

export enum ClothMode {
  Cloak = 1,
  Robe = 2,
  Armor = 3,
}

const vertexShader = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aOpacity;

varying vec3 vColor;
varying float vOpacity;

uniform float uScale;

void main() {
  vColor = aColor;
  vOpacity = aOpacity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.01, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vOpacity;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float glow = pow(1.0 - d * 2.0, 1.5);
  gl_FragColor = vec4(vColor * glow, vOpacity * glow);
}
`;

interface BodySegmentMesh {
  geometry: THREE.BufferGeometry;
  weight: number;
  name: string;
  center: THREE.Vector3;
}

interface ParticleMeta {
  segmentIndex: number;
  segmentName: string;
  randomSeed: number;
  baseBary: [number, number, number];
  triVertIndices: [number, number, number];
  triPositions: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  triNormals: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

function buildMaleBodySegments(): BodySegmentMesh[] {
  const segs: BodySegmentMesh[] = [];

  const addCylinder = (
    name: string,
    center: THREE.Vector3,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    weight: number,
    rot: [number, number, number] = [0, 0, 0],
    radialSeg = 24,
    heightSeg = 6
  ) => {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSeg, heightSeg);
    geo.translate(center.x, center.y, center.z);
    geo.rotateX(rot[0]);
    geo.rotateY(rot[1]);
    geo.rotateZ(rot[2]);
    geo.computeVertexNormals();
    segs.push({ geometry: geo, weight, name, center });
  };

  const addSphere = (
    name: string,
    center: THREE.Vector3,
    radiusX: number,
    radiusY: number,
    radiusZ: number,
    weight: number,
    rot: [number, number, number] = [0, 0, 0]
  ) => {
    const geo = new THREE.SphereGeometry(1, 32, 16);
    geo.scale(radiusX, radiusY, radiusZ);
    geo.translate(center.x, center.y, center.z);
    geo.rotateX(rot[0]);
    geo.rotateY(rot[1]);
    geo.rotateZ(rot[2]);
    geo.computeVertexNormals();
    segs.push({ geometry: geo, weight, name, center });
  };

  addSphere('head', new THREE.Vector3(0, 1.62, 0), 0.095, 0.105, 0.10, 0.05);
  addCylinder('neck', new THREE.Vector3(0, 1.49, 0), 0.045, 0.05, 0.06, 0.02);
  addCylinder('chest', new THREE.Vector3(0, 1.32, 0), 0.21, 0.195, 0.24, 0.14);
  addCylinder('abdomen', new THREE.Vector3(0, 1.08, 0), 0.195, 0.17, 0.22, 0.09);
  addCylinder('hip', new THREE.Vector3(0, 0.93, 0), 0.17, 0.19, 0.12, 0.07);

  addCylinder('leftUpperArm', new THREE.Vector3(-0.28, 1.28, 0), 0.048, 0.042, 0.26, 0.05, [0, 0, 0.14]);
  addCylinder('rightUpperArm', new THREE.Vector3(0.28, 1.28, 0), 0.048, 0.042, 0.26, 0.05, [0, 0, -0.14]);
  addCylinder('leftForearm', new THREE.Vector3(-0.33, 1.04, 0.02), 0.042, 0.036, 0.24, 0.04, [0, 0, 0.09]);
  addCylinder('rightForearm', new THREE.Vector3(0.33, 1.04, 0.02), 0.042, 0.036, 0.24, 0.04, [0, 0, -0.09]);
  addSphere('leftHand', new THREE.Vector3(-0.37, 0.89, 0.03), 0.03, 0.045, 0.025, 0.015);
  addSphere('rightHand', new THREE.Vector3(0.37, 0.89, 0.03), 0.03, 0.045, 0.025, 0.015);

  addCylinder('leftThigh', new THREE.Vector3(-0.09, 0.64, 0), 0.078, 0.06, 0.42, 0.08);
  addCylinder('rightThigh', new THREE.Vector3(0.09, 0.64, 0), 0.078, 0.06, 0.42, 0.08);
  addCylinder('leftShin', new THREE.Vector3(-0.09, 0.31, 0), 0.06, 0.048, 0.4, 0.06);
  addCylinder('rightShin', new THREE.Vector3(0.09, 0.31, 0), 0.06, 0.048, 0.4, 0.06);
  addSphere('leftFoot', new THREE.Vector3(-0.09, 0.04, 0.05), 0.042, 0.028, 0.085, 0.02);
  addSphere('rightFoot', new THREE.Vector3(0.09, 0.04, 0.05), 0.042, 0.028, 0.085, 0.02);

  return segs;
}

function sampleTriangleUniform(
  triVerts: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
  triNorms: [THREE.Vector3, THREE.Vector3, THREE.Vector3]
): { position: THREE.Vector3; normal: THREE.Vector3; bary: [number, number, number] } {
  let u = Math.random();
  let v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  const w = 1 - u - v;

  const pos = new THREE.Vector3(
    u * triVerts[0].x + v * triVerts[1].x + w * triVerts[2].x,
    u * triVerts[0].y + v * triVerts[1].y + w * triVerts[2].y,
    u * triVerts[0].z + v * triVerts[1].z + w * triVerts[2].z
  );

  const normal = new THREE.Vector3(
    u * triNorms[0].x + v * triNorms[1].x + w * triNorms[2].x,
    u * triNorms[0].y + v * triNorms[1].y + w * triNorms[2].y,
    u * triNorms[0].z + v * triNorms[1].z + w * triNorms[2].z
  ).normalize();

  return { position: pos, normal, bary: [u, v, w] };
}

function sampleMeshSurface(
  geometry: THREE.BufferGeometry,
  count: number
): { positions: Float32Array; normals: Float32Array; metas: Omit<ParticleMeta, 'segmentIndex' | 'segmentName' | 'randomSeed'>[] } {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const indexAttr = geometry.index;

  const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
  const triAreas: number[] = [];
  let totalArea = 0;

  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const crossVec = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    let i0, i1, i2;
    if (indexAttr) {
      i0 = indexAttr.getX(t * 3);
      i1 = indexAttr.getX(t * 3 + 1);
      i2 = indexAttr.getX(t * 3 + 2);
    } else {
      i0 = t * 3; i1 = t * 3 + 1; i2 = t * 3 + 2;
    }
    va.set(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
    vb.set(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1));
    vc.set(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2));
    ab.subVectors(vb, va);
    ac.subVectors(vc, va);
    crossVec.crossVectors(ab, ac);
    const area = crossVec.length() * 0.5;
    triAreas.push(area);
    totalArea += area;
  }

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const metas: Omit<ParticleMeta, 'segmentIndex' | 'segmentName' | 'randomSeed'>[] = [];

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalArea;
    let picked = 0;
    for (let t = 0; t < triCount; t++) {
      r -= triAreas[t];
      if (r <= 0) { picked = t; break; }
    }
    let i0, i1, i2;
    if (indexAttr) {
      i0 = indexAttr.getX(picked * 3);
      i1 = indexAttr.getX(picked * 3 + 1);
      i2 = indexAttr.getX(picked * 3 + 2);
    } else {
      i0 = picked * 3; i1 = picked * 3 + 1; i2 = picked * 3 + 2;
    }
    const tv: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
      new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0)),
      new THREE.Vector3(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1)),
      new THREE.Vector3(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2)),
    ];
    const tn: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
      new THREE.Vector3(normAttr.getX(i0), normAttr.getY(i0), normAttr.getZ(i0)).normalize(),
      new THREE.Vector3(normAttr.getX(i1), normAttr.getY(i1), normAttr.getZ(i1)).normalize(),
      new THREE.Vector3(normAttr.getX(i2), normAttr.getY(i2), normAttr.getZ(i2)).normalize(),
    ];
    const sample = sampleTriangleUniform(tv, tn);
    const offset = 0.003 + Math.random() * 0.005;
    positions[i * 3] = sample.position.x + sample.normal.x * offset;
    positions[i * 3 + 1] = sample.position.y + sample.normal.y * offset;
    positions[i * 3 + 2] = sample.position.z + sample.normal.z * offset;
    normals[i * 3] = sample.normal.x;
    normals[i * 3 + 1] = sample.normal.y;
    normals[i * 3 + 2] = sample.normal.z;
    metas.push({
      baseBary: sample.bary,
      triVertIndices: [i0, i1, i2],
      triPositions: tv,
      triNormals: tn,
    });
  }

  return { positions, normals, metas };
}

function computeTangents(normals: Float32Array, count: number): Float32Array {
  const tangents = new Float32Array(count * 6);
  const up = new THREE.Vector3(0, 1, 0);
  const alt = new THREE.Vector3(1, 0, 0);

  for (let i = 0; i < count; i++) {
    const normal = new THREE.Vector3(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
    let t1 = new THREE.Vector3().crossVectors(normal, up);
    if (t1.lengthSq() < 0.0001) {
      t1 = new THREE.Vector3().crossVectors(normal, alt);
    }
    t1.normalize();
    const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize();
    tangents[i * 6] = t1.x; tangents[i * 6 + 1] = t1.y; tangents[i * 6 + 2] = t1.z;
    tangents[i * 6 + 3] = t2.x; tangents[i * 6 + 4] = t2.y; tangents[i * 6 + 5] = t2.z;
  }
  return tangents;
}

const POS_COLOR_A = new THREE.Color('#FF6B6B');
const POS_COLOR_B = new THREE.Color('#FFD93D');
const NEG_COLOR_A = new THREE.Color('#6BCB77');
const NEG_COLOR_B = new THREE.Color('#4D96FF');
const NEU_COLOR = new THREE.Color('#E0E0E0');
const COL_CYAN = new THREE.Color('#66FCF1');
const COL_PINK = new THREE.Color('#FF4D6D');

const SHOULDER_CENTER = new THREE.Vector3(0, 1.35, 0);
const WAIST_Y = 0.92;
const ARMOR_ZONES = new Set([
  'chest', 'abdomen', 'leftUpperArm', 'rightUpperArm',
  'leftForearm', 'rightForearm', 'leftThigh', 'rightThigh',
  'leftShin', 'rightShin',
]);

interface PerfSample { frameTime: number; }

export class ParticleCloth {
  readonly particleCount: number;
  readonly group: THREE.Group;
  readonly perfSamples: PerfSample[] = [];

  private geometry: THREE.BufferGeometry;
  private trailGeometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private trailMaterial: THREE.ShaderMaterial;
  private points: THREE.Points;
  private trailPoints: THREE.Points;

  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private normals: Float32Array;
  private tangents: Float32Array;
  private colors: Float32Array;
  private opacities: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;
  private randomSeeds: Float32Array;
  private particleMetas: ParticleMeta[];
  private emotionAssignments: Int32Array;

  private prevPositions: Float32Array[] = [];
  private trailFade: number = 0;

  private mode: ClothMode = ClothMode.Cloak;
  private emotions: EmotionWord[] = [];
  private time: number = 0;
  private bodyBounds: { min: THREE.Vector3; max: THREE.Vector3 };

  constructor(particleCount: number, gender: 'male' | 'female' = 'male') {
    this.particleCount = particleCount;
    this.group = new THREE.Group();
    this.emotionAssignments = new Int32Array(particleCount).fill(-1);

    const bodySegs = gender === 'male' ? buildMaleBodySegments() : buildMaleBodySegments().map(s => {
      const g = s.geometry.clone();
      if (s.name === 'chest' || s.name === 'leftUpperArm' || s.name === 'rightUpperArm' ||
          s.name === 'abdomen' || s.name === 'leftForearm' || s.name === 'rightForearm') {
        g.scale(0.85, 1, 1);
      }
      if (s.name === 'hip' || s.name === 'leftThigh' || s.name === 'rightThigh' ||
          s.name === 'abdomen') {
        const sx = s.name === 'hip' ? 1.15 : 1.02;
        const pos = g.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          pos.setX(i, pos.getX(i) * sx);
        }
        pos.needsUpdate = true;
      }
      g.computeVertexNormals();
      return { ...s, geometry: g };
    });

    const totalWeight = bodySegs.reduce((s, seg) => s + seg.weight, 0);

    const posChunks: Float32Array[] = [];
    const normChunks: Float32Array[] = [];
    const metaChunk: ParticleMeta[] = [];

    for (let si = 0; si < bodySegs.length; si++) {
      const seg = bodySegs[si];
      const count = Math.max(1, Math.round(particleCount * seg.weight / totalWeight));
      const { positions, normals, metas } = sampleMeshSurface(seg.geometry, count);
      posChunks.push(positions);
      normChunks.push(normals);
      for (let i = 0; i < count; i++) {
        metaChunk.push({
          segmentIndex: si,
          segmentName: seg.name,
          randomSeed: Math.random(),
          baseBary: metas[i].baseBary,
          triVertIndices: metas[i].triVertIndices,
          triPositions: metas[i].triPositions,
          triNormals: metas[i].triNormals,
        });
      }
      seg.geometry.dispose();
    }

    let totalLen = posChunks.reduce((s, c) => s + c.length, 0);
    while (totalLen / 3 < particleCount) {
      const seg = bodySegs[Math.floor(Math.random() * bodySegs.length)];
      const { positions, normals, metas } = sampleMeshSurface(seg.geometry, 1);
      posChunks.push(positions);
      normChunks.push(normals);
      metaChunk.push({
        segmentIndex: bodySegs.indexOf(seg),
        segmentName: seg.name,
        randomSeed: Math.random(),
        baseBary: metas[0].baseBary,
        triVertIndices: metas[0].triVertIndices,
        triPositions: metas[0].triPositions,
        triNormals: metas[0].triNormals,
      });
      totalLen += 3;
      seg.geometry.dispose();
    }
    for (const s of bodySegs) s.geometry.dispose();

    const actualCount = Math.min(particleCount, totalLen / 3);
    this.basePositions = new Float32Array(actualCount * 3);
    this.normals = new Float32Array(actualCount * 3);
    let off = 0;
    for (const pc of posChunks) {
      const take = Math.min(pc.length, this.basePositions.length - off);
      this.basePositions.set(pc.subarray(0, take), off);
      off += take;
      if (off >= this.basePositions.length) break;
    }
    off = 0;
    for (const nc of normChunks) {
      const take = Math.min(nc.length, this.normals.length - off);
      this.normals.set(nc.subarray(0, take), off);
      off += take;
      if (off >= this.normals.length) break;
    }
    this.particleMetas = metaChunk.slice(0, actualCount);

    this.currentPositions = new Float32Array(this.basePositions);
    this.tangents = computeTangents(this.normals, actualCount);
    this.randomSeeds = new Float32Array(actualCount);
    this.baseSizes = new Float32Array(actualCount);
    this.sizes = new Float32Array(actualCount);
    this.colors = new Float32Array(actualCount * 3);
    this.opacities = new Float32Array(actualCount);

    this.bodyBounds = { min: new THREE.Vector3(Infinity, Infinity, Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity) };
    for (let i = 0; i < actualCount; i++) {
      this.randomSeeds[i] = Math.random();
      this.baseSizes[i] = 0.010 + this.randomSeeds[i] * 0.012;
      this.sizes[i] = this.baseSizes[i];
      this.opacities[i] = 0.6 + this.randomSeeds[i] * 0.4;

      const y = this.basePositions[i * 3 + 1] / 1.75;
      const c = COL_CYAN.clone().lerp(COL_PINK, Math.max(0, Math.min(1, y)));
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;

      this.bodyBounds.min.min(new THREE.Vector3(
        this.basePositions[i * 3], this.basePositions[i * 3 + 1], this.basePositions[i * 3 + 2]
      ));
      this.bodyBounds.max.max(new THREE.Vector3(
        this.basePositions[i * 3], this.basePositions[i * 3 + 1], this.basePositions[i * 3 + 2]
      ));
    }

    for (let f = 0; f < 6; f++) this.prevPositions.push(new Float32Array(this.basePositions));

    const trailPos = new Float32Array(actualCount * 3);
    const trailOp = new Float32Array(actualCount);
    const trailCol = new Float32Array(actualCount * 3);
    const trailSz = new Float32Array(actualCount);
    for (let i = 0; i < actualCount; i++) trailSz[i] = this.baseSizes[i] * 1.5;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    this.trailGeometry.setAttribute('aColor', new THREE.BufferAttribute(trailCol, 3));
    this.trailGeometry.setAttribute('aSize', new THREE.BufferAttribute(trailSz, 1));
    this.trailGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(trailOp, 1));

    const initialScale = (typeof window !== 'undefined' ? window.innerHeight : 1000) / (2 * Math.tan(60 * Math.PI / 360));
    this.material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: { uScale: { value: initialScale } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: { uScale: { value: initialScale } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trailPoints.visible = false;
    this.group.add(this.points);
    this.group.add(this.trailPoints);
  }

  getBounds() { return { min: this.bodyBounds.min.clone(), max: this.bodyBounds.max.clone() }; }
  getMode(): ClothMode { return this.mode; }
  setMode(m: ClothMode): void { this.mode = m; }

  applyEmotion(emotions: EmotionWord[]): void {
    this.emotions = emotions;
    this.emotionAssignments.fill(-1);
    for (let ei = 0; ei < emotions.length; ei++) {
      const emo = emotions[ei];
      const per = Math.min(5, Math.max(2, Math.floor(2 + emo.intensity * 3)));
      let assigned = 0, att = 0;
      while (assigned < per && att < this.particleCount * 3) {
        const idx = Math.floor(Math.random() * this.particleCount);
        if (this.emotionAssignments[idx] === -1) {
          this.emotionAssignments[idx] = ei;
          assigned++;
        }
        att++;
      }
    }
    this.updateEmotionColors();
  }

  private updateEmotionColors(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const ei = this.emotionAssignments[i];
      if (ei >= 0 && ei < this.emotions.length) {
        const emo = this.emotions[ei];
        let col: THREE.Color;
        if (emo.sentiment === 'positive') {
          col = POS_COLOR_A.clone().lerp(POS_COLOR_B, emo.intensity);
        } else if (emo.sentiment === 'negative') {
          col = NEG_COLOR_A.clone().lerp(NEG_COLOR_B, emo.intensity);
        } else {
          col = NEU_COLOR.clone();
        }
        this.colors[i * 3] = col.r;
        this.colors[i * 3 + 1] = col.g;
        this.colors[i * 3 + 2] = col.b;
      }
    }
  }

  update(deltaTime: number, rotationDeltaMag: number): { calcTimeMs: number } {
    const tStart = performance.now();
    this.time += deltaTime;
    const dt = deltaTime;
    const time = this.time;

    const pos = this.currentPositions;
    const opa = this.opacities;
    const sz = this.sizes;
    const base = this.basePositions;
    const nr = this.normals;
    const tg = this.tangents;
    const seeds = this.randomSeeds;
    const metas = this.particleMetas;
    const emos = this.emotions;
    const emap = this.emotionAssignments;
    const count = this.particleCount;

    if (this.mode === ClothMode.Cloak) {
      for (let i = 0; i < count; i++) {
        const bx = base[i*3], by = base[i*3+1], bz = base[i*3+2];
        const nx = nr[i*3], ny = nr[i*3+1], nz = nr[i*3+2];
        const seed = seeds[i];
        const name = metas[i].segmentName;
        const dx = bx - SHOULDER_CENTER.x, dy = by - SHOULDER_CENTER.y, dz = bz - SHOULDER_CENTER.z;
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const ix = d > 0.001 ? dx / d : nx, iy = d > 0.001 ? dy / d : ny, iz = d > 0.001 ? dz / d : nz;
        const near = ['chest','leftUpperArm','rightUpperArm','neck'].includes(name) && d < 0.4;
        let ox, oy, oz, op;
        if (near) {
          const R = 0.075 + seed * 0.075;
          const ph = time * 1.5 + seed * Math.PI * 2;
          const ex = (Math.sin(ph) + 1) * 0.5;
          ox = ix * R * ex; oy = iy * R * ex + R * 0.3 * ex * Math.sin(ph * 0.7); oz = iz * R * ex;
          op = 1.0 - ex * 0.4;
        } else {
          const rp = time * 2.0 - d * 5.0;
          const ra = Math.max(0, 0.02 * (1.0 - d * 0.8));
          const s = Math.sin(rp) * ra;
          ox = nx * s; oy = ny * s; oz = nz * s;
          op = 0.6 + seed * 0.4;
        }
        const lerpK = Math.min(1, dt * 5);
        pos[i*3] += (bx + ox - pos[i*3]) * lerpK;
        pos[i*3+1] += (by + oy - pos[i*3+1]) * lerpK;
        pos[i*3+2] += (bz + oz - pos[i*3+2]) * lerpK;
        opa[i] += (op - opa[i]) * lerpK;
        sz[i] += (this.baseSizes[i] - sz[i]) * lerpK;

        const ei = emap[i];
        if (ei >= 0 && ei < emos.length) {
          const emo = emos[ei];
          const t1x = tg[i*6], t1y = tg[i*6+1], t1z = tg[i*6+2];
          const t2x = tg[i*6+3], t2y = tg[i*6+4], t2z = tg[i*6+5];
          const v = 0.5 + emo.intensity * 1.5;
          const k = emo.intensity * Math.PI;
          const f = 0.5 + emo.rhythm * 2.0;
          const ph = time * v + seed * Math.PI * 2;
          const ang = k * ph;
          const fs = 0.02;
          const eox = (t1x * Math.cos(ang) + t2x * Math.sin(ang)) * fs;
          const eoy = (t1y * Math.cos(ang) + t2y * Math.sin(ang)) * fs;
          const eoz = (t1z * Math.cos(ang) + t2z * Math.sin(ang)) * fs;
          const pulse = Math.sin(time * f * Math.PI * 2) * 0.005 * emo.intensity;
          pos[i*3] += eox + nx * pulse;
          pos[i*3+1] += eoy + ny * pulse;
          pos[i*3+2] += eoz + nz * pulse;
        }
      }
    } else if (this.mode === ClothMode.Robe) {
      for (let i = 0; i < count; i++) {
        const bx = base[i*3], by = base[i*3+1], bz = base[i*3+2];
        const nx = nr[i*3], ny = nr[i*3+1], nz = nr[i*3+2];
        const seed = seeds[i];
        const T = 3.0 + seed * 2.0;
        const om = Math.PI * 2 / T;
        const th = om * time + seed * Math.PI * 2;
        const r = 0.03;
        let ox, oy, oz, op;
        if (by < WAIST_Y) {
          const yR = (WAIST_Y - by) / WAIST_Y;
          const droopY = -0.05 * yR * yR;
          const side = bx > 0 ? 1 : -1;
          const spx = Math.cos(th * side) * r * (1 + yR);
          const spy = Math.sin(th * side * 0.5) * r * 0.5;
          const spz = Math.sin(th * side) * r * (1 + yR);
          const ff = yR * yR * 0.15;
          const hd = Math.sqrt(bx * bx + bz * bz);
          const fdx = hd > 0.001 ? bx / hd : 0;
          const fdz = hd > 0.001 ? bz / hd : 0;
          const fl = ff * (1 + Math.sin(th * 0.5) * 0.3);
          ox = spx + fdx * fl; oy = droopY + spy; oz = spz + fdz * fl;
          op = 0.7 + seed * 0.3;
        } else {
          const side = bx > 0 ? 1 : -1;
          ox = Math.cos(th * side) * r * 0.5;
          oy = Math.sin(th) * r * 0.3;
          oz = Math.sin(th * side) * r * 0.5;
          op = 0.6 + seed * 0.4;
        }
        const lerpK = Math.min(1, dt * 5);
        pos[i*3] += (bx + ox - pos[i*3]) * lerpK;
        pos[i*3+1] += (by + oy - pos[i*3+1]) * lerpK;
        pos[i*3+2] += (bz + oz - pos[i*3+2]) * lerpK;
        opa[i] += (op - opa[i]) * lerpK;
        sz[i] += (this.baseSizes[i] - sz[i]) * lerpK;

        const ei = emap[i];
        if (ei >= 0 && ei < emos.length) {
          const emo = emos[ei];
          const t1x = tg[i*6], t1y = tg[i*6+1], t1z = tg[i*6+2];
          const t2x = tg[i*6+3], t2y = tg[i*6+4], t2z = tg[i*6+5];
          const v = 0.5 + emo.intensity * 1.5;
          const k = emo.intensity * Math.PI;
          const f = 0.5 + emo.rhythm * 2.0;
          const ph = time * v + seed * Math.PI * 2;
          const ang = k * ph;
          const fs = 0.02;
          const eox = (t1x * Math.cos(ang) + t2x * Math.sin(ang)) * fs;
          const eoy = (t1y * Math.cos(ang) + t2y * Math.sin(ang)) * fs;
          const eoz = (t1z * Math.cos(ang) + t2z * Math.sin(ang)) * fs;
          const pulse = Math.sin(time * f * Math.PI * 2) * 0.005 * emo.intensity;
          pos[i*3] += eox + nx * pulse;
          pos[i*3+1] += eoy + ny * pulse;
          pos[i*3+2] += eoz + nz * pulse;
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        const bx = base[i*3], by = base[i*3+1], bz = base[i*3+2];
        const nx = nr[i*3], ny = nr[i*3+1], nz = nr[i*3+2];
        const seed = seeds[i];
        const name = metas[i].segmentName;
        const inArmor = ARMOR_ZONES.has(name);
        let ox, oy, oz, op, ts;
        if (inArmor) {
          const shrink = 0.3 + Math.sin(time * 2.0 + seed * 6.28) * 0.1;
          const jx = Math.sin(time * 8 + seed * 100) * 0.002;
          const jy = Math.cos(time * 7 + seed * 200) * 0.002;
          const jz = Math.sin(time * 9 + seed * 300) * 0.002;
          ox = -nx * shrink * 0.01 + jx;
          oy = -ny * shrink * 0.01 + jy;
          oz = -nz * shrink * 0.01 + jz;
          op = 0.9 + Math.sin(time * 3) * 0.1;
          ts = this.baseSizes[i] * 1.3;
        } else {
          const ft = 0.025 + seed * 0.025;
          const pp = time * 1.5 + seed * Math.PI * 2;
          const add = ft + Math.sin(pp) * 0.01;
          ox = nx * add; oy = ny * add; oz = nz * add;
          op = 0.15 + Math.sin(pp) * 0.1;
          ts = this.baseSizes[i] * 2.0;
        }
        const lerpK = Math.min(1, dt * 5);
        pos[i*3] += (bx + ox - pos[i*3]) * lerpK;
        pos[i*3+1] += (by + oy - pos[i*3+1]) * lerpK;
        pos[i*3+2] += (bz + oz - pos[i*3+2]) * lerpK;
        opa[i] += (op - opa[i]) * lerpK;
        sz[i] += (ts - sz[i]) * lerpK;

        const ei = emap[i];
        if (ei >= 0 && ei < emos.length) {
          const emo = emos[ei];
          const t1x = tg[i*6], t1y = tg[i*6+1], t1z = tg[i*6+2];
          const t2x = tg[i*6+3], t2y = tg[i*6+4], t2z = tg[i*6+5];
          const v = 0.5 + emo.intensity * 1.5;
          const k = emo.intensity * Math.PI;
          const f = 0.5 + emo.rhythm * 2.0;
          const ph = time * v + seed * Math.PI * 2;
          const ang = k * ph;
          const fs = 0.02;
          const eox = (t1x * Math.cos(ang) + t2x * Math.sin(ang)) * fs;
          const eoy = (t1y * Math.cos(ang) + t2y * Math.sin(ang)) * fs;
          const eoz = (t1z * Math.cos(ang) + t2z * Math.sin(ang)) * fs;
          const pulse = Math.sin(time * f * Math.PI * 2) * 0.005 * emo.intensity;
          pos[i*3] += eox + nx * pulse;
          pos[i*3+1] += eoy + ny * pulse;
          pos[i*3+2] += eoz + nz * pulse;
        }
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;

    this.updateTrail(rotationDeltaMag, dt);

    const calcTimeMs = performance.now() - tStart;
    this.perfSamples.push({ frameTime: calcTimeMs });
    if (this.perfSamples.length > 1800) this.perfSamples.shift();

    return { calcTimeMs };
  }

  private updateTrail(rotationDeltaMag: number, dt: number): void {
    this.prevPositions.push(new Float32Array(this.currentPositions));
    if (this.prevPositions.length > 6) this.prevPositions.shift();

    if (rotationDeltaMag > 0.002) {
      this.trailFade = 1.0;
    } else {
      this.trailFade *= Math.pow(0.05, dt);
      if (this.trailFade < 0.01) {
        this.trailPoints.visible = false;
        return;
      }
    }

    if (this.prevPositions.length < 4) return;

    const prev = this.prevPositions[this.prevPositions.length - 4];
    this.trailPoints.visible = true;

    const tPos = (this.trailGeometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const tCol = (this.trailGeometry.attributes.aColor as THREE.BufferAttribute).array as Float32Array;
    const tOp = (this.trailGeometry.attributes.aOpacity as THREE.BufferAttribute).array as Float32Array;
    const tSz = (this.trailGeometry.attributes.aSize as THREE.BufferAttribute).array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      tPos[i*3] = prev[i*3]; tPos[i*3+1] = prev[i*3+1]; tPos[i*3+2] = prev[i*3+2];
      tCol[i*3] = this.colors[i*3]; tCol[i*3+1] = this.colors[i*3+1]; tCol[i*3+2] = this.colors[i*3+2];
      tOp[i] = this.opacities[i] * this.trailFade * 0.4;
      tSz[i] = this.sizes[i] * 1.5;
    }
    (this.trailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  updateScale(viewportHeight: number, fov: number): void {
    const scale = viewportHeight / (2 * Math.tan(fov * Math.PI / 360));
    this.material.uniforms.uScale.value = scale;
    this.trailMaterial.uniforms.uScale.value = scale;
  }

  getSnapshot(): { positions: Float32Array; colors: Float32Array; opacities: Float32Array } {
    return {
      positions: new Float32Array(this.currentPositions),
      colors: new Float32Array(this.colors),
      opacities: new Float32Array(this.opacities),
    };
  }

  setPositions(p: Float32Array): void {
    this.currentPositions.set(p);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
  setColors(c: Float32Array): void {
    this.colors.set(c);
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
  }
  setOpacities(o: Float32Array): void {
    this.opacities.set(o);
    (this.geometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}
