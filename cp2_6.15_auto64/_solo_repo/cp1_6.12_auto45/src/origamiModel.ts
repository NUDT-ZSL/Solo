import * as THREE from 'three';

export interface Vertex {
  position: THREE.Vector3;
  original: THREE.Vector3;
}

export interface Face {
  indices: [number, number, number];
  normal: THREE.Vector3;
  adjacentFaces: number[];
  color: THREE.Color;
}

export interface Crease {
  vertexIndices: [number, number];
  faceIndices: [number, number];
  angle: number;
  type: 'mountain' | 'valley';
  groupId: number;
}

export interface OrigamiState {
  creaseAngles: number[];
  matrix: number[];
  timestamp: number;
}

const EPS = 1e-6;
const DEG2RAD = Math.PI / 180;

export class OrigamiModel {
  vertices: Vertex[] = [];
  faces: Face[] = [];
  creases: Crease[] = [];
  group: THREE.Group;
  mesh: THREE.Mesh;
  creaseLines: THREE.LineSegments;
  name: string;
  history: OrigamiState[] = [];
  savedState: OrigamiState | null = null;
  isAnimating = false;
  animationStart: OrigamiState | null = null;
  animationEnd: OrigamiState | null = null;
  animationDuration = 1000;
  animationStartTime = 0;
  highlightedFaceIndex: number = -1;

  private _tv = new THREE.Vector3();
  private _tv2 = new THREE.Vector3();
  private _tq = new THREE.Quaternion();
  private _ta = new THREE.Vector3();
  private _tm = new THREE.Matrix4();
  private _posBuf: Float32Array | null = null;
  private _colBuf: Float32Array | null = null;
  private _normBuf: Float32Array | null = null;

  constructor(name: string) {
    this.name = name;
    this.group = new THREE.Group();
    this.group.name = name;

    const geo = new THREE.BufferGeometry();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: true,
      metalness: 0.02,
      roughness: 0.9
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    const cGeo = new THREE.BufferGeometry();
    const cMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.95
    });
    this.creaseLines = new THREE.LineSegments(cGeo, cMat);
    this.group.add(this.creaseLines);
  }

  addV(x: number, y: number, z: number): number {
    const v = new THREE.Vector3(x, y, z);
    this.vertices.push({ position: v.clone(), original: v.clone() });
    return this.vertices.length - 1;
  }

  addF(a: number, b: number, c: number): number {
    this.faces.push({
      indices: [a, b, c],
      normal: new THREE.Vector3(),
      adjacentFaces: [],
      color: new THREE.Color()
    });
    return this.faces.length - 1;
  }

  addCr(v1: number, v2: number, f1: number, f2: number, type: 'mountain' | 'valley', groupId: number): number {
    this.creases.push({
      vertexIndices: [v1, v2],
      faceIndices: [f1, f2],
      angle: 0,
      type,
      groupId
    });
    return this.creases.length - 1;
  }

  private ek(a: number, b: number): string {
    return Math.min(a, b) + '_' + Math.max(a, b);
  }

  computeAdjacency(): void {
    const edgeMap = new Map<string, number[]>();
    for (let fi = 0; fi < this.faces.length; fi++) {
      const f = this.faces[fi];
      for (let ei = 0; ei < 3; ei++) {
        const key = this.ek(f.indices[ei], f.indices[(ei + 1) % 3]);
        if (!edgeMap.has(key)) edgeMap.set(key, []);
        edgeMap.get(key)!.push(fi);
      }
    }
    for (const faces of edgeMap.values()) {
      for (let i = 0; i < faces.length; i++) {
        for (let j = 0; j < faces.length; j++) {
          if (i !== j && !this.faces[faces[i]].adjacentFaces.includes(faces[j])) {
            this.faces[faces[i]].adjacentFaces.push(faces[j]);
          }
        }
      }
    }
  }

  private creasesInGroup(groupId: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.creases.length; i++) {
      if (this.creases[i].groupId === groupId) result.push(i);
    }
    return result;
  }

  private groupAxis(groupId: number): [number, number] | null {
    const group = this.creasesInGroup(groupId);
    if (group.length === 0) return null;
    let v0 = this.creases[group[0]].vertexIndices[0];
    let v1 = this.creases[group[0]].vertexIndices[1];
    for (let i = 1; i < group.length; i++) {
      const cr = this.creases[group[i]];
      const a = cr.vertexIndices[0];
      const b = cr.vertexIndices[1];
      if (a === v0 || a === v1) {
        if (a === v0) v0 = v1;
        v1 = b;
      } else if (b === v0 || b === v1) {
        if (b === v0) v0 = v1;
        v1 = a;
      }
    }
    return [v0, v1];
  }

  private facesOnSideOfGroup(groupId: number, startCreaseIdx: number, side: 0 | 1): Set<number> {
    const group = this.creasesInGroup(groupId);
    const exclKeys = new Set<string>();
    for (const ci of group) {
      const cr = this.creases[ci];
      exclKeys.add(this.ek(cr.vertexIndices[0], cr.vertexIndices[1]));
    }
    const startFace = this.creases[startCreaseIdx].faceIndices[side];

    const result = new Set<number>();
    const queue: number[] = [startFace];
    result.add(startFace);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const adj of this.faces[cur].adjacentFaces) {
        if (result.has(adj)) continue;
        const f = this.faces[adj];
        let sharesCr = false;
        for (let ei = 0; ei < 3; ei++) {
          if (exclKeys.has(this.ek(f.indices[ei], f.indices[(ei + 1) % 3]))) {
            sharesCr = true; break;
          }
        }
        if (sharesCr) continue;
        result.add(adj);
        queue.push(adj);
      }
    }
    return result;
  }

  private vertsFromFaces(faceSet: Set<number>): Set<number> {
    const vs = new Set<number>();
    for (const fi of faceSet) {
      const f = this.faces[fi];
      vs.add(f.indices[0]);
      vs.add(f.indices[1]);
      vs.add(f.indices[2]);
    }
    return vs;
  }

  private rotateAroundEdge(
    vertSet: Set<number>,
    eV0: number,
    eV1: number,
    angleRad: number,
    flip: boolean = false
  ): void {
    if (Math.abs(angleRad) < EPS) return;
    const v0 = this.vertices[eV0].position;
    const v1 = this.vertices[eV1].position;
    this._ta.subVectors(v1, v0);
    if (this._ta.lengthSq() < EPS) return;
    this._ta.normalize();
    if (flip) this._ta.negate();
    this._tq.setFromAxisAngle(this._ta, angleRad);

    for (const vi of vertSet) {
      if (vi === eV0 || vi === eV1) continue;
      const v = this.vertices[vi].position;
      this._tv.subVectors(v, v0);
      this._tv.applyQuaternion(this._tq);
      v.addVectors(v0, this._tv);
    }
  }

  setCreaseAngle(idx: number, angleDeg: number): void {
    const angle = THREE.MathUtils.clamp(angleDeg, 0, 180);
    const cr = this.creases[idx];
    const delta = angle - cr.angle;
    if (Math.abs(delta) < 0.001) return;

    const faceSet = this.facesOnSide(idx, 1);
    const vertSet = this.vertsFromFaces(faceSet);
    const flip = cr.type === 'valley';
    this.rotateAroundEdge(vertSet, cr.vertexIndices[0], cr.vertexIndices[1], delta * DEG2RAD, flip);
    cr.angle = angle;
    this.updateGeometry();
  }

  setCreaseBatch(groupId: number, angleDeg: number): void {
    const angle = THREE.MathUtils.clamp(angleDeg, 0, 180);
    let changed = false;
    for (let i = 0; i < this.creases.length; i++) {
      if (this.creases[i].groupId === groupId) {
        if (Math.abs(this.creases[i].angle - angle) > 0.001) {
          this.creases[i].angle = angle;
          changed = true;
        }
      }
    }
    if (changed) this.rebuildFromAngles();
  }

  resetFlat(): void {
    for (const v of this.vertices) v.position.copy(v.original);
    for (const c of this.creases) c.angle = 0;
  }

  rebuildFromAngles(): void {
    const angles = this.creases.map(c => c.angle);
    this.resetFlat();
    for (let ci = 0; ci < this.creases.length; ci++) {
      const angle = angles[ci];
      if (Math.abs(angle) < 0.001) continue;
      const cr = this.creases[ci];
      const faceSet = this.facesOnSide(ci, 1);
      const vertSet = this.vertsFromFaces(faceSet);
      const flip = cr.type === 'valley';
      this.rotateAroundEdge(vertSet, cr.vertexIndices[0], cr.vertexIndices[1], angle * DEG2RAD, flip);
      cr.angle = angle;
    }
    this.updateGeometry();
  }

  private colorFaces(): void {
    const c1 = new THREE.Color(0xf5f0e0);
    const c2 = new THREE.Color(0xf0e6c8);
    const center = new THREE.Vector3();
    for (const v of this.vertices) center.add(v.original);
    center.divideScalar(this.vertices.length);
    const tmp = new THREE.Vector3();

    for (let fi = 0; fi < this.faces.length; fi++) {
      const f = this.faces[fi];
      tmp.set(0, 0, 0);
      for (let vi = 0; vi < 3; vi++) tmp.add(this.vertices[f.indices[vi]].original);
      tmp.divideScalar(3);
      const d = tmp.distanceTo(center);
      const t = THREE.MathUtils.clamp(d / 3, 0, 1);
      f.color.copy(c1).lerp(c2, t);
    }
  }

  updateGeometry(): void {
    const n = this.faces.length;
    const size = n * 9;

    if (!this._posBuf || this._posBuf.length !== size) {
      this._posBuf = new Float32Array(size);
      this._colBuf = new Float32Array(size);
      this._normBuf = new Float32Array(size);
    }

    const pos = this._posBuf!;
    const col = this._colBuf!;
    const nrm = this._normBuf!;

    for (let fi = 0; fi < n; fi++) {
      const f = this.faces[fi];
      const va = this.vertices[f.indices[0]].position;
      const vb = this.vertices[f.indices[1]].position;
      const vc = this.vertices[f.indices[2]].position;

      const i = fi * 9;
      pos[i] = va.x; pos[i + 1] = va.y; pos[i + 2] = va.z;
      pos[i + 3] = vb.x; pos[i + 4] = vb.y; pos[i + 5] = vb.z;
      pos[i + 6] = vc.x; pos[i + 7] = vc.y; pos[i + 8] = vc.z;

      this._tv.subVectors(vb, va);
      this._tv2.subVectors(vc, va);
      f.normal.crossVectors(this._tv, this._tv2).normalize();

      nrm[i] = f.normal.x; nrm[i + 1] = f.normal.y; nrm[i + 2] = f.normal.z;
      nrm[i + 3] = f.normal.x; nrm[i + 4] = f.normal.y; nrm[i + 5] = f.normal.z;
      nrm[i + 6] = f.normal.x; nrm[i + 7] = f.normal.y; nrm[i + 8] = f.normal.z;

      const dc = fi === this.highlightedFaceIndex ? new THREE.Color(0xffeb99) : f.color;
      col[i] = dc.r; col[i + 1] = dc.g; col[i + 2] = dc.b;
      col[i + 3] = dc.r; col[i + 4] = dc.g; col[i + 5] = dc.b;
      col[i + 6] = dc.r; col[i + 7] = dc.g; col[i + 8] = dc.b;
    }

    const g = this.mesh.geometry as THREE.BufferGeometry;
    if (!g.getAttribute('position')) {
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      g.setIndex([]);
    } else {
      (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (g.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (g.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    }
    g.computeBoundingBox();
    g.computeBoundingSphere();
    this.updateCreases();
  }

  private updateCreases(): void {
    const n = this.creases.length;
    const pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const c = this.creases[i];
      const v0 = this.vertices[c.vertexIndices[0]].position;
      const v1 = this.vertices[c.vertexIndices[1]].position;
      const o = i * 6;
      pos[o] = v0.x; pos[o + 1] = v0.y; pos[o + 2] = v0.z;
      pos[o + 3] = v1.x; pos[o + 4] = v1.y; pos[o + 5] = v1.z;
    }
    const g = this.creaseLines.geometry as THREE.BufferGeometry;
    if (!g.getAttribute('position')) {
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    } else {
      (g.attributes.position as THREE.BufferAttribute).array = pos;
      (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }

  highlightFace(fi: number): void {
    this.highlightedFaceIndex = fi;
    this.updateGeometry();
  }

  getFaceInfo(fi: number): { normal: THREE.Vector3; adjacents: number[]; area: number } | null {
    if (fi < 0 || fi >= this.faces.length) return null;
    const f = this.faces[fi];
    const va = this.vertices[f.indices[0]].position;
    const vb = this.vertices[f.indices[1]].position;
    const vc = this.vertices[f.indices[2]].position;
    const ab = new THREE.Vector3().subVectors(vb, va);
    const ac = new THREE.Vector3().subVectors(vc, va);
    const area = 0.5 * ab.cross(ac).length();
    return { normal: f.normal.clone(), adjacents: [...f.adjacentFaces], area };
  }

  saveState(): OrigamiState {
    const s: OrigamiState = {
      creaseAngles: this.creases.map(c => c.angle),
      matrix: this.group.matrix.toArray(),
      timestamp: Date.now()
    };
    this.savedState = s;
    return s;
  }

  pushHistory(): void {
    this.history.push({
      creaseAngles: this.creases.map(c => c.angle),
      matrix: this.group.matrix.clone().toArray(),
      timestamp: Date.now()
    });
  }

  undo(): boolean {
    if (this.history.length === 0 || this.isAnimating) return false;
    const prev = this.history.pop()!;
    this._animateTo(prev, 200);
    return true;
  }

  unfold(durationMs: number = 1000): void {
    if (this.isAnimating) return;
    this._animateTo({
      creaseAngles: new Array(this.creases.length).fill(0),
      matrix: this.group.matrix.clone().toArray(),
      timestamp: Date.now()
    }, durationMs);
  }

  restore(durationMs: number = 300): void {
    if (!this.savedState || this.isAnimating) return;
    this._animateTo(this.savedState, durationMs);
  }

  private _animateTo(target: OrigamiState, durationMs: number): void {
    this.animationStart = {
      creaseAngles: this.creases.map(c => c.angle),
      matrix: this.group.matrix.clone().toArray(),
      timestamp: Date.now()
    };
    this.animationEnd = target;
    this.animationDuration = durationMs;
    this.animationStartTime = performance.now();
    this.isAnimating = true;
  }

  updateAnimation(): boolean {
    if (!this.isAnimating || !this.animationStart || !this.animationEnd) return false;

    const t = Math.min(1, (performance.now() - this.animationStartTime) / this.animationDuration);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    for (let i = 0; i < this.creases.length; i++) {
      this.creases[i].angle = this.animationStart.creaseAngles[i] +
        (this.animationEnd.creaseAngles[i] - this.animationStart.creaseAngles[i]) * ease;
    }
    this.rebuildFromAngles();

    const sM = new THREE.Matrix4().fromArray(this.animationStart.matrix);
    const eM = new THREE.Matrix4().fromArray(this.animationEnd.matrix);
    const sP = new THREE.Vector3(), sQ = new THREE.Quaternion(), sS = new THREE.Vector3();
    const eP = new THREE.Vector3(), eQ = new THREE.Quaternion(), eS = new THREE.Vector3();
    sM.decompose(sP, sQ, sS);
    eM.decompose(eP, eQ, eS);
    const p = sP.clone().lerp(eP, ease);
    const q = sQ.clone().slerp(eQ, ease);
    const s = sS.clone().lerp(eS, ease);
    this._tm.compose(p, q, s);
    this.group.matrix.copy(this._tm);
    this.group.matrixAutoUpdate = false;

    if (t >= 1) {
      this.isAnimating = false;
      this.group.matrixAutoUpdate = true;
      return false;
    }
    return true;
  }

  finalize(): void {
    this.computeAdjacency();
    this.colorFaces();
    this.rebuildFromAngles();
  }

  activeCreaseCount(): number {
    return this.creases.filter(c => Math.abs(c.angle) > 0.1).length;
  }
  undoCount(): number { return this.history.length; }
  exportJSON(): string { return JSON.stringify(this.saveState(), null, 2); }

  closestCrease(point: THREE.Vector3, maxDist: number = 0.2): { index: number; dist: number } | null {
    let best = -1, bestD = maxDist;
    const proj = new THREE.Vector3();
    for (let i = 0; i < this.creases.length; i++) {
      const c = this.creases[i];
      const a = this.vertices[c.vertexIndices[0]].position;
      const b = this.vertices[c.vertexIndices[1]].position;
      const ab = this._tv.subVectors(b, a);
      const l2 = ab.lengthSq();
      if (l2 < EPS) continue;
      const t = THREE.MathUtils.clamp(this._tv2.subVectors(point, a).dot(ab) / l2, 0, 1);
      proj.copy(a).addScaledVector(ab, t);
      const d = proj.distanceTo(point);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best < 0 ? null : { index: best, dist: bestD };
  }

  faceCount(): number { return this.faces.length; }
  creaseCount(): number { return this.creases.length; }
  vertexCount(): number { return this.vertices.length; }
}

export function createCraneModel(): OrigamiModel {
  const m = new OrigamiModel('crane');
  const S = 2.0;
  const half = S / 2;

  const fl = m.addV(-half, 0, -half);
  const fr = m.addV(half, 0, -half);
  const br = m.addV(half, 0, half);
  const bl = m.addV(-half, 0, half);
  const c = m.addV(0, 0, 0);

  const fm = m.addV(0, 0, -half);
  const rm = m.addV(half, 0, 0);
  const bm = m.addV(0, 0, half);
  const lm = m.addV(-half, 0, 0);

  const fFL = m.addF(fl, fm, c);
  const fFR = m.addF(fm, fr, c);
  const fRF = m.addF(fr, rm, c);
  const fRB = m.addF(rm, br, c);
  const fBR = m.addF(br, bm, c);
  const fBL = m.addF(bm, bl, c);
  const fLB = m.addF(bl, lm, c);
  const fLF = m.addF(lm, fl, c);

  const cr_midF = m.addCr(fm, c, fFL, fFR, 'mountain', 1);
  const cr_midR = m.addCr(rm, c, fRF, fRB, 'valley', 2);
  const cr_midB = m.addCr(bm, c, fBR, fBL, 'mountain', 3);
  const cr_midL = m.addCr(lm, c, fLB, fLF, 'valley', 4);

  const cr_diagFL = m.addCr(fl, c, fFL, fLF, 'valley', 10);
  const cr_diagFR = m.addCr(fr, c, fFR, fRF, 'mountain', 11);
  const cr_diagBR = m.addCr(br, c, fRB, fBR, 'valley', 12);
  const cr_diagBL = m.addCr(bl, c, fBL, fLB, 'mountain', 13);

  const wl = m.addV(-half * 0.5, 0, half * 0.25);
  const wr = m.addV(half * 0.5, 0, half * 0.25);
  const nt = m.addV(0, 0, -half * 0.7);
  const tt = m.addV(0, 0, half * 0.6);

  const f_w1 = m.addF(lm, wl, c);
  const f_w2 = m.addF(wl, bm, c);
  const f_wr1 = m.addF(rm, c, wr);
  const f_wr2 = m.addF(wr, bm, c);
  const f_n1 = m.addF(fm, fl, nt);
  const f_n2 = m.addF(fm, nt, fr);
  const f_t1 = m.addF(bm, tt, bl);
  const f_t2 = m.addF(bm, br, tt);

  m.addCr(lm, wl, f_w1, fLB, 'valley', 20);
  m.addCr(wl, bm, f_w2, fBL, 'mountain', 21);
  m.addCr(rm, wr, f_wr1, fRF, 'mountain', 22);
  m.addCr(wr, bm, f_wr2, fBR, 'valley', 23);
  m.addCr(fm, nt, f_n1, fFL, 'valley', 24);
  m.addCr(fm, nt, f_n2, fFR, 'mountain', 25);
  m.addCr(bm, tt, f_t1, fBL, 'mountain', 26);
  m.addCr(bm, tt, f_t2, fBR, 'valley', 27);

  m.addCr(wl, c, f_w1, f_w2, 'mountain', 30);
  m.addCr(wr, c, f_wr1, f_wr2, 'valley', 31);
  m.addCr(fl, nt, f_n1, fLF, 'mountain', 32);
  m.addCr(fr, nt, f_n2, fRF, 'valley', 33);
  m.addCr(bl, tt, f_t1, fLB, 'valley', 34);
  m.addCr(br, tt, f_t2, fRB, 'mountain', 35);

  m.finalize();

  m.creases[cr_midL].angle = 70;
  m.creases[cr_midR].angle = 70;
  m.creases[cr_midF].angle = 55;
  m.creases[cr_midB].angle = 35;
  m.creases[cr_diagFL].angle = 25;
  m.creases[cr_diagFR].angle = 25;
  m.creases[cr_diagBR].angle = 20;
  m.creases[cr_diagBL].angle = 20;
  m.rebuildFromAngles();

  m.history = [];
  m.saveState();
  return m;
}

export function createLilyModel(): OrigamiModel {
  const m = new OrigamiModel('lily');
  const S = 2.6;
  const half = S / 2;
  const nPetals = 6;
  const pH = S * 0.95;

  const c = m.addV(0, 0, 0);
  const basePts: number[] = [];
  const tipPts: number[] = [];
  const midPts: number[] = [];

  for (let i = 0; i < nPetals; i++) {
    const a = (i / nPetals) * Math.PI * 2 - Math.PI / 2;
    basePts.push(m.addV(Math.cos(a) * half, 0, Math.sin(a) * half));
    tipPts.push(m.addV(Math.cos(a) * half * 1.15, pH, Math.sin(a) * half * 1.15));
    const ma = a + Math.PI / nPetals;
    const mr = half * 0.5;
    midPts.push(m.addV(Math.cos(ma) * mr, pH * 0.3, Math.sin(ma) * mr));
  }

  const baseFaces: number[] = [];
  const petalFacesL: number[] = [];
  const petalFacesR: number[] = [];

  for (let i = 0; i < nPetals; i++) {
    const next = (i + 1) % nPetals;
    const f1 = m.addF(c, basePts[i], midPts[i]);
    const f2 = m.addF(c, midPts[i], basePts[next]);
    baseFaces.push(f1, f2);

    const pL = m.addF(basePts[i], tipPts[i], midPts[(i - 1 + nPetals) % nPetals]);
    const pR = m.addF(basePts[next], midPts[i], tipPts[i]);
    petalFacesL.push(pL);
    petalFacesR.push(pR);
  }

  for (let i = 0; i < nPetals; i++) {
    const next = (i + 1) % nPetals;
    m.addCr(basePts[i], basePts[next],
      baseFaces[i * 2], baseFaces[i * 2 + 1], 'valley', 100 + i);
    m.addCr(c, midPts[i],
      baseFaces[i * 2], baseFaces[i * 2 + 1], 'mountain', 200 + i);
    m.addCr(basePts[i], tipPts[i],
      petalFacesL[i], baseFaces[i * 2], 'mountain', 300 + i);
    m.addCr(midPts[i], tipPts[i],
      petalFacesR[i], baseFaces[i * 2 + 1], 'valley', 400 + i);
  }

  m.finalize();

  for (let i = 0; i < m.creaseCount(); i++) {
    const cr = m.creases[i];
    if (cr.groupId >= 100 && cr.groupId < 200) cr.angle = 40;
    if (cr.groupId >= 200 && cr.groupId < 300) cr.angle = 30;
    if (cr.groupId >= 300 && cr.groupId < 400) cr.angle = 60;
    if (cr.groupId >= 400 && cr.groupId < 500) cr.angle = 35;
  }
  m.rebuildFromAngles();

  m.history = [];
  m.saveState();
  return m;
}

export function createModelByName(name: string): OrigamiModel {
  switch (name) {
    case 'crane': return createCraneModel();
    case 'lily': return createLilyModel();
    default: return createCraneModel();
  }
}
