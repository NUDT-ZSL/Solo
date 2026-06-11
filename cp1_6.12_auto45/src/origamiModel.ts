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
  targetAngle: number;
  type: 'mountain' | 'valley' | 'neutral';
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
  faceNormalsHelper: THREE.LineSegments | null = null;
  name: string;
  history: OrigamiState[] = [];
  savedState: OrigamiState | null = null;
  isAnimating = false;
  animationProgress = 0;
  animationStart: OrigamiState | null = null;
  animationEnd: OrigamiState | null = null;
  animationDuration = 1000;
  animationStartTime = 0;
  highlightedFaceIndex: number = -1;
  private tempVec3 = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();
  private tempAxis = new THREE.Vector3();

  constructor(name: string) {
    this.name = name;
    this.group = new THREE.Group();
    this.group.name = name;
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
      metalness: 0.0,
      roughness: 0.85
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = name + '_mesh';
    this.group.add(this.mesh);

    const creaseGeo = new THREE.BufferGeometry();
    const creaseMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });
    this.creaseLines = new THREE.LineSegments(creaseGeo, creaseMat);
    this.creaseLines.name = name + '_creases';
    this.group.add(this.creaseLines);
  }

  addVertex(x: number, y: number, z: number): number {
    const v = new THREE.Vector3(x, y, z);
    this.vertices.push({
      position: v.clone(),
      original: v.clone()
    });
    return this.vertices.length - 1;
  }

  addFace(a: number, b: number, c: number): number {
    const face: Face = {
      indices: [a, b, c],
      normal: new THREE.Vector3(),
      adjacentFaces: [],
      color: new THREE.Color()
    };
    this.faces.push(face);
    return this.faces.length - 1;
  }

  addCrease(v1: number, v2: number, f1: number, f2: number, type: 'mountain' | 'valley' | 'neutral' = 'neutral', groupId: number = 0): number {
    this.creases.push({
      vertexIndices: [v1, v2],
      faceIndices: [f1, f2],
      angle: 0,
      targetAngle: 0,
      type,
      groupId
    });
    return this.creases.length - 1;
  }

  computeAdjacency(): void {
    const edgeMap = new Map<string, number[]>();
    for (let fi = 0; fi < this.faces.length; fi++) {
      const f = this.faces[fi];
      const edges: [number, number][] = [
        [Math.min(f.indices[0], f.indices[1]), Math.max(f.indices[0], f.indices[1])],
        [Math.min(f.indices[1], f.indices[2]), Math.max(f.indices[1], f.indices[2])],
        [Math.min(f.indices[2], f.indices[0]), Math.max(f.indices[2], f.indices[0])]
      ];
      for (const e of edges) {
        const key = e[0] + '_' + e[1];
        if (!edgeMap.has(key)) edgeMap.set(key, []);
        edgeMap.get(key)!.push(fi);
      }
    }
    for (const faces of edgeMap.values()) {
      if (faces.length === 2) {
        if (!this.faces[faces[0]].adjacentFaces.includes(faces[1]))
          this.faces[faces[0]].adjacentFaces.push(faces[1]);
        if (!this.faces[faces[1]].adjacentFaces.includes(faces[0]))
          this.faces[faces[1]].adjacentFaces.push(faces[0]);
      }
    }
  }

  private getFacesOnSide(creaseIndex: number, side: 0 | 1): Set<number> {
    const crease = this.creases[creaseIndex];
    const pivotFace = crease.faceIndices[side];
    const excludedFace = crease.faceIndices[1 - side];
    const result = new Set<number>();
    const queue = [pivotFace];
    result.add(pivotFace);
    const creaseEdgeKey = Math.min(crease.vertexIndices[0], crease.vertexIndices[1]) +
      '_' + Math.max(crease.vertexIndices[0], crease.vertexIndices[1]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const adj of this.faces[current].adjacentFaces) {
        if (result.has(adj) || adj === excludedFace) continue;
        const f = this.faces[adj];
        const edges: [number, number][] = [
          [Math.min(f.indices[0], f.indices[1]), Math.max(f.indices[0], f.indices[1])],
          [Math.min(f.indices[1], f.indices[2]), Math.max(f.indices[1], f.indices[2])],
          [Math.min(f.indices[2], f.indices[0]), Math.max(f.indices[2], f.indices[0])]
        ];
        let sharesCrease = false;
        for (const e of edges) {
          const key = e[0] + '_' + e[1];
          if (key === creaseEdgeKey) { sharesCrease = true; break; }
        }
        if (sharesCrease) continue;
        result.add(adj);
        queue.push(adj);
      }
    }
    return result;
  }

  setCreaseAngle(creaseIndex: number, angleDeg: number, animate: boolean = true): void {
    const angle = THREE.MathUtils.clamp(angleDeg, 0, 180);
    this.creases[creaseIndex].targetAngle = angle;
    if (!animate) {
      this.creases[creaseIndex].angle = angle;
      this.applyCreaseRotation(creaseIndex);
    } else {
      this.creases[creaseIndex].angle = angle;
      this.applyCreaseRotation(creaseIndex);
    }
  }

  setCreaseAngleBatch(groupId: number, angleDeg: number): void {
    const angle = THREE.MathUtils.clamp(angleDeg, 0, 180);
    for (const crease of this.creases) {
      if (crease.groupId === groupId) {
        crease.targetAngle = angle;
        crease.angle = angle;
      }
    }
    this.reconstructFromBase();
  }

  private applyCreaseRotation(creaseIndex: number): void {
    const crease = this.creases[creaseIndex];
    const angleRad = (crease.angle - 0) * DEG2RAD;
    if (Math.abs(angleRad) < EPS) {
      this.updateGeometry();
      return;
    }
    const v0 = this.vertices[crease.vertexIndices[0]].position;
    const v1 = this.vertices[crease.vertexIndices[1]].position;
    this.tempAxis.subVectors(v1, v0).normalize();
    const facesToRotate = this.getFacesOnSide(creaseIndex, 1);
    this.tempQuat.setFromAxisAngle(this.tempAxis, angleRad);
    const affectedVertices = new Set<number>();
    for (const fi of facesToRotate) {
      const f = this.faces[fi];
      for (let vi = 0; vi < 3; vi++) {
        const vidx = f.indices[vi];
        if (vidx !== crease.vertexIndices[0] && vidx !== crease.vertexIndices[1]) {
          affectedVertices.add(vidx);
        }
      }
    }
    for (const vidx of affectedVertices) {
      const v = this.vertices[vidx].position;
      this.tempVec3.subVectors(v, v0);
      this.tempVec3.applyQuaternion(this.tempQuat);
      v.addVectors(v0, this.tempVec3);
    }
    this.updateGeometry();
  }

  reconstructFromBase(): void {
    for (const v of this.vertices) {
      v.position.copy(v.original);
    }
    for (const crease of this.creases) {
      crease.angle = crease.targetAngle;
    }
    const applied = new Set<number>();
    let changed = true;
    let safety = 0;
    while (changed && safety < 20) {
      changed = false;
      safety++;
      for (let ci = 0; ci < this.creases.length; ci++) {
        if (applied.has(ci)) continue;
        const crease = this.creases[ci];
        const angleRad = crease.angle * DEG2RAD;
        if (Math.abs(angleRad) < EPS) { applied.add(ci); continue; }
        const v0 = this.vertices[crease.vertexIndices[0]].position;
        const v1 = this.vertices[crease.vertexIndices[1]].position;
        this.tempAxis.subVectors(v1, v0);
        if (this.tempAxis.lengthSq() < EPS) { applied.add(ci); continue; }
        this.tempAxis.normalize();
        const facesToRotate = this.getFacesOnSide(ci, 1);
        this.tempQuat.setFromAxisAngle(this.tempAxis, angleRad);
        const affectedVertices = new Set<number>();
        for (const fi of facesToRotate) {
          const f = this.faces[fi];
          for (let vi = 0; vi < 3; vi++) {
            const vidx = f.indices[vi];
            if (vidx !== crease.vertexIndices[0] && vidx !== crease.vertexIndices[1]) {
              affectedVertices.add(vidx);
            }
          }
        }
        for (const vidx of affectedVertices) {
          const v = this.vertices[vidx].position;
          this.tempVec3.subVectors(v, v0);
          this.tempVec3.applyQuaternion(this.tempQuat);
          v.addVectors(v0, this.tempVec3);
        }
        applied.add(ci);
        changed = true;
      }
    }
    this.updateGeometry();
  }

  private assignFaceColors(): void {
    const center = new THREE.Vector3();
    for (const v of this.vertices) center.add(v.original);
    center.divideScalar(this.vertices.length);
    const pos = new THREE.Vector3();
    for (let fi = 0; fi < this.faces.length; fi++) {
      const f = this.faces[fi];
      pos.set(0, 0, 0);
      for (let vi = 0; vi < 3; vi++) pos.add(this.vertices[f.indices[vi]].original);
      pos.divideScalar(3);
      const d = pos.distanceTo(center);
      const t = THREE.MathUtils.smoothstep(d, 0, 3);
      f.color.setRGB(
        0.96 + 0.02 * t,
        0.94 + 0.02 * t,
        0.88 - 0.02 * t
      );
    }
  }

  updateGeometry(): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const normals: number[] = [];
    const faceIndicesMap: number[] = [];
    for (let fi = 0; fi < this.faces.length; fi++) {
      const f = this.faces[fi];
      const va = this.vertices[f.indices[0]].position;
      const vb = this.vertices[f.indices[1]].position;
      const vc = this.vertices[f.indices[2]].position;
      const ab = this.tempVec3.subVectors(vb, va);
      const ac = new THREE.Vector3().subVectors(vc, va);
      f.normal.crossVectors(ab, ac).normalize();
      const displayColor = (fi === this.highlightedFaceIndex)
        ? new THREE.Color(0xffeb99)
        : f.color;
      positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
      colors.push(
        displayColor.r, displayColor.g, displayColor.b,
        displayColor.r, displayColor.g, displayColor.b,
        displayColor.r, displayColor.g, displayColor.b
      );
      normals.push(
        f.normal.x, f.normal.y, f.normal.z,
        f.normal.x, f.normal.y, f.normal.z,
        f.normal.x, f.normal.y, f.normal.z
      );
      faceIndicesMap.push(fi, fi, fi);
    }
    const geo = this.mesh.geometry as THREE.BufferGeometry;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(faceIndicesMap.map((_, i) => i));
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    this.updateCreaseLines();
  }

  private updateCreaseLines(): void {
    const positions: number[] = [];
    for (const crease of this.creases) {
      const v0 = this.vertices[crease.vertexIndices[0]].position;
      const v1 = this.vertices[crease.vertexIndices[1]].position;
      positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
    }
    const geo = this.creaseLines.geometry as THREE.BufferGeometry;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.attributes.position.needsUpdate = true;
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  }

  highlightFace(faceIndex: number): void {
    this.highlightedFaceIndex = faceIndex;
    this.updateGeometry();
  }

  getFaceInfo(faceIndex: number): { normal: THREE.Vector3; adjacentFaces: number[]; area: number } | null {
    if (faceIndex < 0 || faceIndex >= this.faces.length) return null;
    const f = this.faces[faceIndex];
    const va = this.vertices[f.indices[0]].position;
    const vb = this.vertices[f.indices[1]].position;
    const vc = this.vertices[f.indices[2]].position;
    const ab = new THREE.Vector3().subVectors(vb, va);
    const ac = new THREE.Vector3().subVectors(vc, va);
    const area = 0.5 * ab.cross(ac).length();
    return {
      normal: f.normal.clone(),
      adjacentFaces: [...f.adjacentFaces],
      area
    };
  }

  saveState(): OrigamiState {
    const state: OrigamiState = {
      creaseAngles: this.creases.map(c => c.angle),
      matrix: this.group.matrix.toArray(),
      timestamp: Date.now()
    };
    this.savedState = state;
    return state;
  }

  pushHistory(): void {
    const state: OrigamiState = {
      creaseAngles: this.creases.map(c => c.angle),
      matrix: this.group.matrix.toArray(),
      timestamp: Date.now()
    };
    this.history.push(state);
  }

  undo(): boolean {
    if (this.history.length === 0) return false;
    const prev = this.history.pop()!;
    this.startAnimation(prev, 200);
    return true;
  }

  unfold(durationMs: number = 1000): void {
    const target: OrigamiState = {
      creaseAngles: new Array(this.creases.length).fill(0),
      matrix: new THREE.Matrix4().toArray(),
      timestamp: Date.now()
    };
    this.startAnimation(target, durationMs);
  }

  restore(durationMs: number = 300): void {
    if (!this.savedState) return;
    this.startAnimation(this.savedState, durationMs);
  }

  private startAnimation(target: OrigamiState, durationMs: number): void {
    this.animationStart = {
      creaseAngles: this.creases.map(c => c.angle),
      matrix: this.group.matrix.toArray(),
      timestamp: Date.now()
    };
    this.animationEnd = target;
    this.animationDuration = durationMs;
    this.animationStartTime = performance.now();
    this.isAnimating = true;
    this.animationProgress = 0;
  }

  updateAnimation(): boolean {
    if (!this.isAnimating || !this.animationStart || !this.animationEnd) return false;
    const t = Math.min(1, (performance.now() - this.animationStartTime) / this.animationDuration);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.animationProgress = ease;
    for (let i = 0; i < this.creases.length; i++) {
      const start = this.animationStart.creaseAngles[i];
      const end = this.animationEnd.creaseAngles[i];
      this.creases[i].angle = start + (end - start) * ease;
      this.creases[i].targetAngle = this.creases[i].angle;
    }
    this.reconstructFromBase();
    const mat = new THREE.Matrix4();
    const startMat = new THREE.Matrix4().fromArray(this.animationStart.matrix);
    const endMat = new THREE.Matrix4().fromArray(this.animationEnd.matrix);
    const sPos = new THREE.Vector3(), sQuat = new THREE.Quaternion(), sScale = new THREE.Vector3();
    const ePos = new THREE.Vector3(), eQuat = new THREE.Quaternion(), eScale = new THREE.Vector3();
    startMat.decompose(sPos, sQuat, sScale);
    endMat.decompose(ePos, eQuat, eScale);
    const pos = sPos.lerp(ePos, ease);
    const quat = sQuat.slerp(eQuat, ease);
    const scale = sScale.lerp(eScale, ease);
    mat.compose(pos, quat, scale);
    this.group.matrix.copy(mat);
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
    this.assignFaceColors();
    this.reconstructFromBase();
  }

  getActiveCreaseCount(): number {
    return this.creases.filter(c => Math.abs(c.angle) > 0.1).length;
  }

  getUndoCount(): number {
    return this.history.length;
  }

  exportJSON(): string {
    const state = this.saveState();
    return JSON.stringify(state, null, 2);
  }

  findCreaseByEdge(v1Idx: number, v2Idx: number): number {
    const key1 = Math.min(v1Idx, v2Idx) + '_' + Math.max(v1Idx, v2Idx);
    for (let i = 0; i < this.creases.length; i++) {
      const c = this.creases[i];
      const key2 = Math.min(c.vertexIndices[0], c.vertexIndices[1]) +
        '_' + Math.max(c.vertexIndices[0], c.vertexIndices[1]);
      if (key1 === key2) return i;
    }
    return -1;
  }

  getClosestCrease(point: THREE.Vector3, maxDist: number = 0.15): { index: number; distance: number } | null {
    let bestIdx = -1;
    let bestDist = maxDist;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.creases.length; i++) {
      const c = this.creases[i];
      const a = this.vertices[c.vertexIndices[0]].position;
      const b = this.vertices[c.vertexIndices[1]].position;
      const ab = new THREE.Vector3().subVectors(b, a);
      const len2 = ab.lengthSq();
      if (len2 < EPS) continue;
      const t = THREE.MathUtils.clamp(point.clone().sub(a).dot(ab) / len2, 0, 1);
      v.copy(a).addScaledVector(ab, t);
      const d = v.distanceTo(point);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return null;
    return { index: bestIdx, distance: bestDist };
  }
}

export function createCraneModel(): OrigamiModel {
  const model = new OrigamiModel('crane');
  const S = 2;
  const h = S * 0.5;
  const d = 0.01;

  const tl = model.addVertex(-S, 0, -S);
  const tr = model.addVertex(S, 0, -S);
  const br = model.addVertex(S, 0, S);
  const bl = model.addVertex(-S, 0, S);
  const c = model.addVertex(0, 0, 0);

  const tlT = model.addVertex(-S, d, -S);
  const trT = model.addVertex(S, d, -S);
  const brT = model.addVertex(S, d, S);
  const blT = model.addVertex(-S, d, S);
  const cT = model.addVertex(0, d, 0);

  const bodyFrontLeft = model.addFace(tl, c, bl);
  const bodyFrontRight = model.addFace(tr, br, c);
  const bodyBackLeft = model.addFace(tlT, blT, cT);
  const bodyBackRight = model.addFace(trT, cT, brT);
  model.addFace(tl, tlT, cT);
  model.faces.pop();
  const bodyTL1 = model.addFace(tl, tlT, cT);
  const bodyTL2 = model.addFace(tl, cT, c);
  const bodyTR1 = model.addFace(tr, c, cT);
  const bodyTR2 = model.addFace(tr, cT, trT);
  const bodyBR1 = model.addFace(br, cT, c);
  const bodyBR2 = model.addFace(br, brT, cT);
  const bodyBL1 = model.addFace(bl, c, cT);
  const bodyBL2 = model.addFace(bl, cT, blT);

  const S2 = S * 0.7;
  const wingY = h * 0.6;
  const w1a = model.addVertex(-S2, d, -S * 0.3);
  const w1b = model.addVertex(-S2 * 1.3, wingY, 0);
  const w1c = model.addVertex(-S2, d, S * 0.3);
  const w2a = model.addVertex(S2, d, -S * 0.3);
  const w2b = model.addVertex(S2 * 1.3, wingY, 0);
  const w2c = model.addVertex(S2, d, S * 0.3);
  const w1back = model.addVertex(-S2, -d, -S * 0.3);
  const w1backB = model.addVertex(-S2 * 1.3, wingY - d, 0);
  const w1backC = model.addVertex(-S2, -d, S * 0.3);
  const w2back = model.addVertex(S2, -d, -S * 0.3);
  const w2backB = model.addVertex(S2 * 1.3, wingY - d, 0);
  const w2backC = model.addVertex(S2, -d, S * 0.3);

  const wingLTop = model.addFace(w1a, w1b, w1c);
  model.addFace(w1back, w1backC, w1backB);
  const wingRTop = model.addFace(w2a, w2c, w2b);
  model.addFace(w2back, w2backB, w2backC);
  model.addFace(w1a, w1back, w1backB);
  const wLEdge2 = model.addFace(w1a, w1backB, w1b);
  model.addFace(w1b, w1backB, w1backC);
  const wLEdge4 = model.addFace(w1b, w1backC, w1c);
  model.addFace(w1c, w1backC, w1back);
  model.addFace(w1c, w1back, w1a);
  model.addFace(w2a, w2backB, w2back);
  const wREdge2 = model.addFace(w2a, w2b, w2backB);
  model.addFace(w2b, w2backC, w2backB);
  const wREdge4 = model.addFace(w2b, w2c, w2backC);
  model.addFace(w2c, w2back, w2backC);
  model.addFace(w2c, w2a, w2back);

  const neckBaseZ = -S * 0.9;
  const neckTipY = h * 1.1;
  const headLen = S * 0.4;
  const nb1 = model.addVertex(-S * 0.18, d, neckBaseZ);
  const nb2 = model.addVertex(S * 0.18, d, neckBaseZ);
  const nt1 = model.addVertex(-S * 0.08, neckTipY, -S * 1.15);
  const nt2 = model.addVertex(S * 0.08, neckTipY, -S * 1.15);
  const beak = model.addVertex(0, neckTipY * 0.9, -S * 1.15 - headLen);
  const nb1B = model.addVertex(-S * 0.18, -d, neckBaseZ);
  const nb2B = model.addVertex(S * 0.18, -d, neckBaseZ);
  const nt1B = model.addVertex(-S * 0.08, neckTipY - d, -S * 1.15);
  const nt2B = model.addVertex(S * 0.08, neckTipY - d, -S * 1.15);
  const beakB = model.addVertex(0, neckTipY * 0.9 - d, -S * 1.15 - headLen);

  const neckL = model.addFace(nb1, nt1, nt2);
  const neckL2 = model.addFace(nb1, nt2, nb2);
  model.addFace(nb1B, nb2B, nt1B);
  model.addFace(nb2B, nt2B, nt1B);
  model.addFace(nt1, beak, nt2);
  model.addFace(nt1B, nt2B, beakB);
  model.addFace(nb1, nb1B, nt1B);
  const neckSide2 = model.addFace(nb1, nt1B, nt1);
  const neckSide3 = model.addFace(nb2, nt2, nt2B);
  model.addFace(nb2, nt2B, nb2B);
  model.addFace(nt1, nt1B, beakB);
  model.addFace(nt1, beakB, beak);
  model.addFace(nt2, beak, beakB);
  model.addFace(nt2, beakB, nt2B);

  const tailBaseZ = S * 0.9;
  const tailTipY = h * 0.4;
  const tb1 = model.addVertex(-S * 0.15, d, tailBaseZ);
  const tb2 = model.addVertex(S * 0.15, d, tailBaseZ);
  const tt1 = model.addVertex(-S * 0.05, tailTipY, S * 1.2);
  const tt2 = model.addVertex(S * 0.05, tailTipY, S * 1.2);
  const tb1B = model.addVertex(-S * 0.15, -d, tailBaseZ);
  const tb2B = model.addVertex(S * 0.15, -d, tailBaseZ);
  const tt1B = model.addVertex(-S * 0.05, tailTipY - d, S * 1.2);
  const tt2B = model.addVertex(S * 0.05, tailTipY - d, S * 1.2);

  const tailTop = model.addFace(tb1, tt1, tt2);
  const tailTop2 = model.addFace(tb1, tt2, tb2);
  model.addFace(tb1B, tb2B, tt1B);
  model.addFace(tb2B, tt2B, tt1B);
  model.addFace(tb1, tb1B, tt1B);
  const tailSide2 = model.addFace(tb1, tt1B, tt1);
  const tailSide3 = model.addFace(tb2, tt2, tt2B);
  model.addFace(tb2, tt2B, tb2B);

  const bodyDiag1 = model.addCrease(tl, br, bodyFrontLeft, bodyFrontRight, 'mountain', 1);
  const bodyDiag2 = model.addCrease(tr, bl, bodyFrontLeft, bodyFrontRight, 'valley', 2);
  model.addCrease(tl, c, bodyFrontLeft, bodyTL2, 'valley', 3);
  model.addCrease(bl, c, bodyFrontLeft, bodyBL1, 'valley', 3);
  model.addCrease(tr, c, bodyFrontRight, bodyTR1, 'mountain', 4);
  model.addCrease(br, c, bodyFrontRight, bodyBR1, 'mountain', 4);

  model.addCrease(cT, tlT, bodyBackLeft, bodyTL1, 'valley', 3);
  model.addCrease(cT, blT, bodyBackLeft, bodyBL2, 'valley', 3);
  model.addCrease(cT, trT, bodyBackRight, bodyTR2, 'mountain', 4);
  model.addCrease(cT, brT, bodyBackRight, bodyBR2, 'mountain', 4);

  model.addCrease(w1a, w1c, bodyTL2, wingLTop, 'mountain', 5);
  model.addCrease(w2a, w2c, bodyTR2, wingRTop, 'mountain', 5);
  const wingLCrease = model.creases.length;
  model.addCrease(w1a, w1b, wingLTop, wLEdge2, 'valley', 6);
  model.addCrease(w1b, w1c, wingLTop, wLEdge4, 'valley', 6);
  model.addCrease(w2a, w2b, wingRTop, wREdge2, 'valley', 7);
  model.addCrease(w2b, w2c, wingRTop, wREdge4, 'valley', 7);

  model.addCrease(nb1, nb2, bodyTL2, neckL2, 'mountain', 8);
  model.addCrease(nt1, nt2, neckL, neckL2, 'valley', 8);
  const neckFold = model.creases.length;
  model.addCrease(nb1, nt1, neckL, neckSide2, 'neutral', 9);
  model.addCrease(nb2, nt2, neckL2, neckSide3, 'neutral', 9);

  model.addCrease(tb1, tb2, bodyBL2, tailTop2, 'mountain', 10);
  model.addCrease(tt1, tt2, tailTop, tailTop2, 'valley', 10);
  model.addCrease(tb1, tt1, tailTop, tailSide2, 'neutral', 11);
  model.addCrease(tb2, tt2, tailTop2, tailSide3, 'neutral', 11);

  model.finalize();

  model.setCreaseAngle(bodyDiag1, 70, false);
  model.setCreaseAngle(bodyDiag2, 70, false);
  model.reconstructFromBase();

  model.setCreaseAngle(wingLCrease, 45, false);
  model.setCreaseAngle(wingLCrease + 1, 45, false);
  model.setCreaseAngle(wingLCrease + 2, 45, false);
  model.setCreaseAngle(wingLCrease + 3, 45, false);
  model.reconstructFromBase();

  model.setCreaseAngle(neckFold, 60, false);
  model.reconstructFromBase();

  model.setCreaseAngle(neckFold + 4, 35, false);
  model.reconstructFromBase();

  model.history = [];
  return model;
}

export function createLilyModel(): OrigamiModel {
  const model = new OrigamiModel('lily');
  const S = 2.2;
  const d = 0.01;

  const tl = model.addVertex(-S, 0, -S);
  const tr = model.addVertex(S, 0, -S);
  const br = model.addVertex(S, 0, S);
  const bl = model.addVertex(-S, 0, S);
  const c = model.addVertex(0, 0, 0);
  const tlT = model.addVertex(-S, d, -S);
  const trT = model.addVertex(S, d, -S);
  const brT = model.addVertex(S, d, S);
  const blT = model.addVertex(-S, d, S);
  const cT = model.addVertex(0, d, 0);

  const sqTL = model.addFace(tl, c, bl);
  const sqTR = model.addFace(tr, br, c);
  model.addFace(tlT, blT, cT);
  model.addFace(trT, cT, brT);
  model.addFace(tl, tlT, cT);
  const seam1b = model.addFace(tl, cT, c);
  const seam2a = model.addFace(tr, c, cT);
  model.addFace(tr, cT, trT);
  const seam3a = model.addFace(br, cT, c);
  model.addFace(br, brT, cT);
  const seam4a = model.addFace(bl, c, cT);
  model.addFace(bl, cT, blT);

  const petalCount = 6;
  const petalBaseR = S * 0.5;
  const petalTopY = S * 1.2;
  const petalTipR = S * 1.1;
  const petalCenters: { baseX: number; baseZ: number; tipX: number; tipY: number; tipZ: number }[] = [];
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    petalCenters.push({
      baseX: nx * petalBaseR,
      baseZ: nz * petalBaseR,
      tipX: nx * petalTipR,
      tipY: petalTopY * (0.85 + 0.15 * Math.sin(i * 1.3)),
      tipZ: nz * petalTipR
    });
  }
  const petalWidth = 0.55;
  for (let i = 0; i < petalCount; i++) {
    const p = petalCenters[i];
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const tx = -Math.sin(angle) * petalWidth;
    const tz = Math.cos(angle) * petalWidth;
    const bL = model.addVertex(p.baseX + tx, d, p.baseZ + tz);
    const bR = model.addVertex(p.baseX - tx, d, p.baseZ - tz);
    const mL = model.addVertex(p.tipX * 0.5 + tx * 0.8, p.tipY * 0.4, p.tipZ * 0.5 + tz * 0.8);
    const mR = model.addVertex(p.tipX * 0.5 - tx * 0.8, p.tipY * 0.4, p.tipZ * 0.5 - tz * 0.8);
    const tip = model.addVertex(p.tipX, p.tipY, p.tipZ);
    const bLb = model.addVertex(p.baseX + tx, -d, p.baseZ + tz);
    const bRb = model.addVertex(p.baseX - tx, -d, p.baseZ - tz);
    const mLb = model.addVertex(p.tipX * 0.5 + tx * 0.8, p.tipY * 0.4 - d, p.tipZ * 0.5 + tz * 0.8);
    const mRb = model.addVertex(p.tipX * 0.5 - tx * 0.8, p.tipY * 0.4 - d, p.tipZ * 0.5 - tz * 0.8);
    const tipb = model.addVertex(p.tipX, p.tipY - d, p.tipZ);
    const top1 = model.addFace(bL, mL, tip);
    const top2 = model.addFace(bL, tip, mR);
    const top3 = model.addFace(bL, mR, bR);
    model.addFace(bLb, tipb, mLb);
    model.addFace(bLb, mRb, tipb);
    model.addFace(bLb, bRb, mRb);
    model.addFace(bL, bLb, mLb);
    const edge2 = model.addFace(bL, mLb, mL);
    model.addFace(mL, mLb, tipb);
    model.addFace(mL, tipb, tip);
    model.addFace(tip, tipb, mRb);
    const edge6 = model.addFace(tip, mRb, mR);
    model.addFace(mR, mRb, bRb);
    const edge8 = model.addFace(mR, bRb, bR);
    model.addFace(bR, bRb, bLb);
    model.addFace(bR, bLb, bL);

    model.addCrease(bL, bR, seam1b, top3, 'valley', 100 + i);
    model.addCrease(mL, tip, top1, edge2, 'mountain', 200 + i);
    model.addCrease(mR, tip, top2, edge6, 'mountain', 200 + i);
    model.addCrease(bL, mL, top1, edge2, 'valley', 210 + i);
    model.addCrease(bR, mR, top3, edge8, 'valley', 210 + i);
  }

  model.addCrease(tl, c, sqTL, seam1b, 'mountain', 1);
  model.addCrease(bl, c, sqTL, seam4a, 'valley', 1);
  model.addCrease(tr, c, sqTR, seam2a, 'mountain', 2);
  model.addCrease(br, c, sqTR, seam3a, 'valley', 2);
  model.addCrease(tl, br, sqTL, sqTR, 'mountain', 3);
  model.addCrease(tr, bl, sqTL, sqTR, 'valley', 4);

  model.finalize();

  model.setCreaseAngle(model.creases.length - 4, 80, false);
  model.setCreaseAngle(model.creases.length - 3, 80, false);
  model.setCreaseAngle(model.creases.length - 2, 80, false);
  model.setCreaseAngle(model.creases.length - 1, 80, false);
  model.reconstructFromBase();

  const petalCreaseStart = model.creases.length - petalCount * 5 - 4;
  for (let i = 0; i < petalCount; i++) {
    model.setCreaseAngle(petalCreaseStart + i * 5, 65, false);
    model.setCreaseAngle(petalCreaseStart + i * 5 + 1, 30, false);
    model.setCreaseAngle(petalCreaseStart + i * 5 + 2, 30, false);
    model.setCreaseAngle(petalCreaseStart + i * 5 + 3, 15, false);
    model.setCreaseAngle(petalCreaseStart + i * 5 + 4, 15, false);
  }
  model.reconstructFromBase();

  model.history = [];
  return model;
}

export function createModelByName(name: string): OrigamiModel {
  switch (name) {
    case 'crane': return createCraneModel();
    case 'lily': return createLilyModel();
    default: return createCraneModel();
  }
}
