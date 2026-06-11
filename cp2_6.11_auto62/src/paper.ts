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

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, position: THREE.Vector3, id: string) {
    this.id = id;
    this.scene = scene;
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

    const n = this.vertices.length;

    if (n === 4) {
      this.addFoldLine(this.vertices[0], this.vertices[2]);
      this.addFoldLine(this.vertices[1], this.vertices[3]);
      const mid01 = new THREE.Vector3().addVectors(this.vertices[0], this.vertices[1]).multiplyScalar(0.5);
      const mid23 = new THREE.Vector3().addVectors(this.vertices[2], this.vertices[3]).multiplyScalar(0.5);
      this.addFoldLine(mid01, mid23);
      const mid03 = new THREE.Vector3().addVectors(this.vertices[0], this.vertices[3]).multiplyScalar(0.5);
      const mid12 = new THREE.Vector3().addVectors(this.vertices[1], this.vertices[2]).multiplyScalar(0.5);
      this.addFoldLine(mid03, mid12);
    } else {
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const mid = new THREE.Vector3().addVectors(this.vertices[i], this.vertices[next]).multiplyScalar(0.5);
        const oppositeIdx = (i + Math.floor(n / 2)) % n;
        const oppositeNext = (oppositeIdx + 1) % n;
        const oppositeMid = new THREE.Vector3().addVectors(this.vertices[oppositeIdx], this.vertices[oppositeNext]).multiplyScalar(0.5);
        this.addFoldLine(mid, oppositeMid);
      }

      if (n <= 6) {
        for (let i = 0; i < n; i++) {
          const oppositeIdx = (i + Math.floor(n / 2)) % n;
          this.addFoldLine(this.vertices[i], this.vertices[oppositeIdx]);
        }
      }
    }
  }

  private addFoldLine(start: THREE.Vector3, end: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(end, start);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(dir, up).normalize();
    if (normal.length() < 0.001) {
      normal.set(1, 0, 0);
    }

    this.foldLines.push({
      startPoint: start.clone(),
      endPoint: end.clone(),
      normal,
      mesh: null,
    });
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

  detect(paperA: PaperSheet, paperB: PaperSheet): boolean {
    if (paperA.id === paperB.id) return false;
    if (paperA.foldCount === 0 && paperB.foldCount === 0) return false;

    const centerA = paperA.getWorldCenter();
    const centerB = paperB.getWorldCenter();
    const distance = centerA.distanceTo(centerB);

    return distance < this.snapThreshold;
  }

  findClosestPair(papers: PaperSheet[]): [PaperSheet, PaperSheet] | null {
    let closestPair: [PaperSheet, PaperSheet] | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const a = papers[i];
        const b = papers[j];
        if (a.foldCount === 0 && b.foldCount === 0) continue;

        const dist = a.getWorldCenter().distanceTo(b.getWorldCenter());
        if (dist < this.snapThreshold && dist < closestDist) {
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
    if (this.faceCount >= 5 && this.faceCount <= 7 && this.vertexCount >= 7) {
      return StructureType.HEXAHEDRON;
    }
    if (this.faceCount >= 3 && this.faceCount <= 5 && this.vertexCount >= 4 && this.vertexCount <= 6) {
      return StructureType.TETRAHEDRON;
    }
    if (this.vertexCount >= 8) {
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
