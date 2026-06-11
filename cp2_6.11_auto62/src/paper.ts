import * as THREE from 'three';

export interface FoldLine {
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  normal: THREE.Vector3;
  mesh: THREE.Line | null;
}

const MAX_FOLD_COUNT = 3;

export class PaperSheet {
  id: string;
  mesh: THREE.Group;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshPhongMaterial;
  foldCount: number = 0;
  vertices: THREE.Vector3[];
  foldLines: FoldLine[] = [];
  isSelected: boolean = false;
  color: THREE.Color;
  originalColor: THREE.Color;
  isDragging: boolean = false;
  dragOffset: THREE.Vector3 = new THREE.Vector3();
  foldLineGroup: THREE.Group;
  compoundId: string | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, id: string) {
    this.id = id;
    void scene;
    this.color = new THREE.Color('#F5F5DC');
    this.originalColor = new THREE.Color('#F5F5DC');

    this.vertices = [
      new THREE.Vector3(-1, 0, -1),
      new THREE.Vector3(1, 0, -1),
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(-1, 0, 1),
    ];

    this.geometry = this.createGeometry();
    this.material = new THREE.MeshPhongMaterial({
      color: this.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      shininess: 30,
    });

    const paperMesh = new THREE.Mesh(this.geometry, this.material);
    const edgesGeo = new THREE.EdgesGeometry(this.geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);

    this.mesh = new THREE.Group();
    this.mesh.add(paperMesh);
    this.mesh.add(edges);
    this.mesh.position.copy(position);
    this.mesh.userData = { paperId: this.id };

    this.foldLineGroup = new THREE.Group();
    this.mesh.add(this.foldLineGroup);

    this.generateFoldLines();
    this.renderFoldLines();
  }

  isFoldable(): boolean {
    return this.foldCount < MAX_FOLD_COUNT;
  }

  private createGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let i = 1; i < this.vertices.length - 1; i++) {
      positions.push(
        this.vertices[0].x, this.vertices[0].y, this.vertices[0].z,
        this.vertices[i].x, this.vertices[i].y, this.vertices[i].z,
        this.vertices[i + 1].x, this.vertices[i + 1].y, this.vertices[i + 1].z
      );
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }

  generateFoldLines(): void {
    this.clearFoldLines();

    if (!this.isFoldable()) return;

    const verts = this.vertices;
    const n = verts.length;

    if (n < 3) return;

    const centroid = new THREE.Vector3();
    for (const v of verts) centroid.add(v);
    centroid.divideScalar(n);

    const polygonNormal = this.computePolygonNormal(verts, centroid);
    if (polygonNormal.lengthSq() < 0.001) polygonNormal.set(0, 1, 0);

    const edgeMids: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const mid = new THREE.Vector3().addVectors(verts[i], verts[(i + 1) % n]).multiplyScalar(0.5);
      edgeMids.push(mid);
    }

    for (let i = 0; i < n; i++) {
      const start = edgeMids[i];
      let bestEnd: THREE.Vector3 | null = null;
      let bestDist = Infinity;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const end = edgeMids[j];
        const midLine = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const toCentroid = centroid.distanceTo(midLine);

        const dir = new THREE.Vector3().subVectors(end, start);
        const cross = new THREE.Vector3().crossVectors(dir, polygonNormal);

        let posCount = 0;
        let negCount = 0;
        for (const v of verts) {
          const toVert = new THREE.Vector3().subVectors(v, start);
          const dot = toVert.dot(cross);
          if (dot > 0.01) posCount++;
          else if (dot < -0.01) negCount++;
        }

        if (posCount > 0 && negCount > 0 && toCentroid < bestDist) {
          bestDist = toCentroid;
          bestEnd = end;
        }
      }

      if (bestEnd) {
        this.addFoldLine(start, bestEnd, polygonNormal);
      }
    }

    if (n <= 6) {
      for (let i = 0; i < n; i++) {
        const start = verts[i];
        let bestOpposite = -1;
        let bestDist = Infinity;
        for (let j = 0; j < n; j++) {
          if (j === i || j === (i + 1) % n || j === (i - 1 + n) % n) continue;
          const d = start.distanceTo(verts[j]);
          if (d < bestDist) {
            bestDist = d;
            bestOpposite = j;
          }
        }
        if (bestOpposite >= 0) {
          this.addFoldLine(start, verts[bestOpposite], polygonNormal);
        }
      }
    }

    this.deduplicateFoldLines();
  }

  private addFoldLine(start: THREE.Vector3, end: THREE.Vector3, polygonNormal: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    if (dir.lengthSq() < 0.0001) return;

    const normal = new THREE.Vector3().crossVectors(dir, polygonNormal).normalize();
    if (normal.length() < 0.001) {
      normal.set(0, 0, 1);
    }

    this.foldLines.push({
      startPoint: start.clone(),
      endPoint: end.clone(),
      normal,
      mesh: null,
    });
  }

  private computePolygonNormal(verts: THREE.Vector3[], centroid: THREE.Vector3): THREE.Vector3 {
    const normal = new THREE.Vector3();
    const n = verts.length;

    for (let i = 0; i < n; i++) {
      const v0 = verts[i].clone().sub(centroid);
      const v1 = verts[(i + 1) % n].clone().sub(centroid);
      const cross = new THREE.Vector3().crossVectors(v0, v1);
      normal.add(cross);
    }

    normal.normalize();
    return normal;
  }

  private deduplicateFoldLines(): void {
    const unique: FoldLine[] = [];
    const epsilon = 0.05;

    for (const fl of this.foldLines) {
      let isDuplicate = false;
      for (const u of unique) {
        const d1 = fl.startPoint.distanceTo(u.startPoint) + fl.endPoint.distanceTo(u.endPoint);
        const d2 = fl.startPoint.distanceTo(u.endPoint) + fl.endPoint.distanceTo(u.startPoint);
        if (Math.min(d1, d2) < epsilon) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        unique.push(fl);
      }
    }

    this.foldLines = unique;
  }

  private clearFoldLines(): void {
    for (const fl of this.foldLines) {
      if (fl.mesh) {
        this.foldLineGroup.remove(fl.mesh);
        fl.mesh.geometry.dispose();
        (fl.mesh.material as THREE.Material).dispose();
      }
    }
    this.foldLines = [];
  }

  renderFoldLines(): void {
    for (const fl of this.foldLines) {
      if (fl.mesh) {
        this.foldLineGroup.remove(fl.mesh);
        fl.mesh.geometry.dispose();
        (fl.mesh.material as THREE.Material).dispose();
      }

      const points: THREE.Vector3[] = [];
      const segments = 20;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const p = new THREE.Vector3().lerpVectors(fl.startPoint, fl.endPoint, t);
        if (i % 2 === 0) {
          points.push(p);
        }
      }

      if (points.length < 2) continue;

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineDashedMaterial({
        color: 0xFFD700,
        dashSize: 0.1,
        gapSize: 0.05,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });

      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      line.userData = { foldLineIndex: this.foldLines.indexOf(fl) };
      fl.mesh = line;
      this.foldLineGroup.add(line);
    }
  }

  fold(lineIndex: number, onComplete?: () => void): boolean {
    if (!this.isFoldable()) return false;
    if (lineIndex < 0 || lineIndex >= this.foldLines.length) return false;

    const foldLine = this.foldLines[lineIndex];
    const foldAxis = new THREE.Vector3().subVectors(foldLine.endPoint, foldLine.startPoint).normalize();

    const positiveVerts: THREE.Vector3[] = [];
    const negativeVerts: THREE.Vector3[] = [];

    const foldOrigin = foldLine.startPoint.clone();
    for (const v of this.vertices) {
      const toVert = new THREE.Vector3().subVectors(v, foldOrigin);
      const cross = new THREE.Vector3().crossVectors(foldAxis, toVert);
      if (cross.y >= 0) {
        positiveVerts.push(v.clone());
      } else {
        negativeVerts.push(v.clone());
      }
    }

    const mirroredVerts = negativeVerts.map(v => {
      const projected = foldOrigin.clone().add(
        foldAxis.clone().multiplyScalar(
          new THREE.Vector3().subVectors(v, foldOrigin).dot(foldAxis)
        )
      );
      const diff = new THREE.Vector3().subVectors(v, projected);
      return projected.clone().sub(diff);
    });

    const newVertices = [...positiveVerts, ...mirroredVerts];
    const uniqueVerts = this.removeDuplicateVertices(newVertices);

    const startTime = performance.now();
    const duration = 500;

    const originalVertices = this.vertices.map(v => v.clone());
    const targetVertices = uniqueVerts;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const interpolatedVerts = originalVertices.map((ov, i) => {
        if (i < targetVertices.length) {
          return ov.clone().lerp(targetVertices[i], eased);
        }
        return ov.clone().lerp(targetVertices[targetVertices.length - 1], eased);
      });

      this.updateMeshGeometry(interpolatedVerts);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.vertices = uniqueVerts;
        this.foldCount++;

        this.material.color.set('#FFB6C1');
        this.material.opacity = 0.85;

        if (this.isFoldable()) {
          this.generateFoldLines();
          this.renderFoldLines();
        } else {
          this.clearFoldLines();
        }

        this.updateMeshGeometry(this.vertices);

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
    return true;
  }

  private updateMeshGeometry(verts: THREE.Vector3[]): void {
    const paperMesh = this.mesh.children[0] as THREE.Mesh;
    const edgesMesh = this.mesh.children[1] as THREE.LineSegments;

    const positions: number[] = [];
    for (let i = 1; i < verts.length - 1; i++) {
      positions.push(
        verts[0].x, verts[0].y, verts[0].z,
        verts[i].x, verts[i].y, verts[i].z,
        verts[i + 1].x, verts[i + 1].y, verts[i + 1].z
      );
    }

    paperMesh.geometry.dispose();
    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    newGeo.computeVertexNormals();
    paperMesh.geometry = newGeo;

    const edgesGeo = new THREE.EdgesGeometry(newGeo);
    edgesMesh.geometry.dispose();
    edgesMesh.geometry = edgesGeo;
  }

  private removeDuplicateVertices(verts: THREE.Vector3[]): THREE.Vector3[] {
    const unique: THREE.Vector3[] = [];
    const epsilon = 0.01;
    for (const v of verts) {
      let isDuplicate = false;
      for (const u of unique) {
        if (v.distanceTo(u) < epsilon) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        unique.push(v);
      }
    }

    const centroid = new THREE.Vector3();
    for (const v of unique) centroid.add(v);
    centroid.divideScalar(unique.length);

    unique.sort((a, b) => {
      const angleA = Math.atan2(a.z - centroid.z, a.x - centroid.x);
      const angleB = Math.atan2(b.z - centroid.z, b.x - centroid.x);
      return angleA - angleB;
    });

    return unique;
  }

  flashFoldLine(lineIndex: number): void {
    if (lineIndex < 0 || lineIndex >= this.foldLines.length) return;
    const fl = this.foldLines[lineIndex];
    if (!fl.mesh) return;

    const mat = fl.mesh.material as THREE.LineDashedMaterial;
    const originalOpacity = mat.opacity;
    const originalColor = mat.color.clone();
    mat.opacity = 1;
    mat.color.set('#FFFFFF');
    mat.linewidth = 3;

    setTimeout(() => {
      mat.opacity = originalOpacity;
      mat.color.copy(originalColor);
      mat.linewidth = 2;
    }, 200);
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected;
    if (selected) {
      this.material.emissive.set('#333333');
      if (this.isFoldable()) {
        this.generateFoldLines();
        this.renderFoldLines();
      }
    } else {
      this.material.emissive.set('#000000');
    }
  }

  getWorldCenter(): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    this.mesh.getWorldPosition(worldPos);
    return worldPos;
  }

  getVertexCount(): number {
    return this.vertices.length;
  }

  getFaceCount(): number {
    return Math.max(this.vertices.length - 2, 1);
  }

  dispose(): void {
    this.clearFoldLines();
    this.geometry.dispose();
    this.material.dispose();
    for (const child of this.mesh.children) {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }
}

export class SnapDetector {
  private snapThreshold: number = 0.5;
  private sceneScale: number = 1.0;

  constructor(sceneScale: number = 1.0) {
    this.sceneScale = sceneScale;
  }

  setSceneScale(scale: number): void {
    this.sceneScale = scale;
  }

  getAdjustedThreshold(): number {
    return this.snapThreshold * this.sceneScale;
  }

  detect(paperA: PaperSheet, paperB: PaperSheet): boolean {
    if (paperA.id === paperB.id) return false;
    if (paperA.foldCount === 0 && paperB.foldCount === 0) return false;

    const threshold = this.getAdjustedThreshold();
    const centerA = paperA.getWorldCenter();
    const centerB = paperB.getWorldCenter();
    const distance = centerA.distanceTo(centerB);

    return distance < threshold;
  }

  findClosestPair(papers: PaperSheet[]): [PaperSheet, PaperSheet] | null {
    let closestPair: [PaperSheet, PaperSheet] | null = null;
    let closestDist = Infinity;
    const threshold = this.getAdjustedThreshold();

    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const a = papers[i];
        const b = papers[j];
        if (a.foldCount === 0 && b.foldCount === 0) continue;

        const dist = a.getWorldCenter().distanceTo(b.getWorldCenter());
        if (dist < threshold && dist < closestDist) {
          closestDist = dist;
          closestPair = [a, b];
        }
      }
    }

    return closestPair;
  }
}

export class CompoundStructure {
  id: string;
  papers: PaperSheet[];
  mesh: THREE.Group;
  faceCount: number = 0;
  vertexCount: number = 0;

  constructor(id: string, papers: PaperSheet[], scene: THREE.Scene) {
    this.id = id;
    this.papers = papers;

    this.mesh = new THREE.Group();

    const colorA = papers[0].material.color.clone();
    const colorB = papers[1].material.color.clone();
    const blendedColor = colorA.lerp(colorB, 0.5);

    for (const paper of papers) {
      const relativePos = paper.mesh.position.clone();
      paper.mesh.position.set(0, 0, 0);
      paper.material.color.copy(blendedColor);
      paper.material.opacity = 0.8;
      paper.compoundId = this.id;
      this.mesh.add(paper.mesh);
      paper.mesh.position.copy(relativePos);
    }

    this.vertexCount = papers.reduce((sum, p) => sum + p.getVertexCount(), 0);
    this.faceCount = papers.reduce((sum, p) => sum + p.getFaceCount(), 0);

    scene.add(this.mesh);
  }

  getStructureType(): StructureType | null {
    const topology = this.analyzeTopology();
    return this.classifyByTopology(topology);
  }

  private analyzeTopology(): {
    faceCount: number;
    vertexCount: number;
    edgeCount: number;
    uniqueVertices: THREE.Vector3[];
    adjacencyMap: Map<number, number[]>;
    sharpCorners: number;
    eulerCharacteristic: number;
  } {
    const uniqueVertices = this.collectUniqueVertices();
    const vertexCount = uniqueVertices.length;

    const adjacencyMap = this.buildAdjacencyMap(uniqueVertices);
    let edgeCount = 0;
    for (const [, neighbors] of adjacencyMap) {
      edgeCount += neighbors.length;
    }
    edgeCount = edgeCount / 2;

    const faceCount = this.faceCount;
    const eulerCharacteristic = vertexCount - edgeCount + faceCount;

    const sharpCorners = this.countSharpCorners(uniqueVertices, adjacencyMap);

    return {
      faceCount,
      vertexCount,
      edgeCount,
      uniqueVertices,
      adjacencyMap,
      sharpCorners,
      eulerCharacteristic,
    };
  }

  private collectUniqueVertices(): THREE.Vector3[] {
    const allVerts: THREE.Vector3[] = [];
    for (const paper of this.papers) {
      for (const v of paper.vertices) {
        const worldV = v.clone().applyMatrix4(paper.mesh.matrixWorld);
        allVerts.push(worldV);
      }
    }

    const unique: THREE.Vector3[] = [];
    const epsilon = 0.1;
    for (const v of allVerts) {
      let isDuplicate = false;
      for (const u of unique) {
        if (v.distanceTo(u) < epsilon) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) unique.push(v);
    }
    return unique;
  }

  private buildAdjacencyMap(uniqueVerts: THREE.Vector3[]): Map<number, number[]> {
    const adjacency = new Map<number, number[]>();
    const epsilon = 0.15;

    for (let i = 0; i < uniqueVerts.length; i++) {
      adjacency.set(i, []);
    }

    for (const paper of this.papers) {
      const n = paper.vertices.length;
      for (let i = 0; i < n; i++) {
        const v1 = paper.vertices[i].clone().applyMatrix4(paper.mesh.matrixWorld);
        const v2 = paper.vertices[(i + 1) % n].clone().applyMatrix4(paper.mesh.matrixWorld);

        let idx1 = -1, idx2 = -1;
        for (let j = 0; j < uniqueVerts.length; j++) {
          if (idx1 < 0 && v1.distanceTo(uniqueVerts[j]) < epsilon) idx1 = j;
          if (idx2 < 0 && v2.distanceTo(uniqueVerts[j]) < epsilon) idx2 = j;
          if (idx1 >= 0 && idx2 >= 0) break;
        }

        if (idx1 >= 0 && idx2 >= 0 && idx1 !== idx2) {
          const neighbors1 = adjacency.get(idx1)!;
          const neighbors2 = adjacency.get(idx2)!;
          if (!neighbors1.includes(idx2)) neighbors1.push(idx2);
          if (!neighbors2.includes(idx1)) neighbors2.push(idx1);
        }
      }
    }

    return adjacency;
  }

  private countSharpCorners(verts: THREE.Vector3[], adjacency: Map<number, number[]>): number {
    let sharpCount = 0;
    const sharpAngleThreshold = 60 * Math.PI / 180;

    for (let i = 0; i < verts.length; i++) {
      const neighbors = adjacency.get(i);
      if (!neighbors || neighbors.length < 2) continue;

      let minAngle = Math.PI * 2;
      for (let a = 0; a < neighbors.length; a++) {
        for (let b = a + 1; b < neighbors.length; b++) {
          const va = new THREE.Vector3().subVectors(verts[neighbors[a]], verts[i]).normalize();
          const vb = new THREE.Vector3().subVectors(verts[neighbors[b]], verts[i]).normalize();
          const dot = Math.max(-1, Math.min(1, va.dot(vb)));
          const angle = Math.acos(dot);
          minAngle = Math.min(minAngle, angle);
        }
      }

      if (minAngle < sharpAngleThreshold) {
        sharpCount++;
      }
    }

    return sharpCount;
  }

  private classifyByTopology(topology: {
    faceCount: number;
    vertexCount: number;
    edgeCount: number;
    sharpCorners: number;
    eulerCharacteristic: number;
  }): StructureType | null {
    const { faceCount, vertexCount, sharpCorners, eulerCharacteristic } = topology;

    if (Math.abs(eulerCharacteristic - 2) < 0.1 && faceCount === 6 && vertexCount >= 8) {
      return StructureType.HEXAHEDRON;
    }

    if (faceCount >= 4 && faceCount <= 6 && vertexCount >= 4 && vertexCount <= 6 && sharpCorners >= 3) {
      return StructureType.TETRAHEDRON;
    }

    if (sharpCorners >= 5 || (faceCount >= 8 && vertexCount >= 8)) {
      return StructureType.STAR;
    }

    if (faceCount >= 5 && faceCount <= 7 && vertexCount >= 7) {
      return StructureType.HEXAHEDRON;
    }

    if (faceCount >= 3 && faceCount <= 5 && vertexCount >= 4 && vertexCount <= 6) {
      return StructureType.TETRAHEDRON;
    }

    if (vertexCount >= 8) {
      return StructureType.STAR;
    }

    return null;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    for (const paper of this.papers) {
      paper.dispose();
    }
  }
}

export enum StructureType {
  HEXAHEDRON = 'HEXAHEDRON',
  TETRAHEDRON = 'TETRAHEDRON',
  STAR = 'STAR',
}
