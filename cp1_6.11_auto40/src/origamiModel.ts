import * as THREE from 'three';
import { FaceData, Triangle, SharedEdge } from './faceGenerator';

export interface FaceMeshInfo {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  group: THREE.Group;
  pivotGroup: THREE.Group;
  baseColor: THREE.Color;
  centroid: THREE.Vector3;
  planeNormal: THREE.Vector3;
  localPivot: THREE.Vector3;
  localAxis: THREE.Vector3;
  foldAngle: number;
  foldOrder: number;
  uvBounds: { minX: number; minY: number; maxX: number; maxY: number };
  avgColor: { r: number; g: number; b: number };
  waveFreq: number;
  waveAmp: number;
  wavePhase: number;
  privateTime: number;
  foldProgress: number;
  index: number;
}

interface OrigamiModelCallbacks {
  onFaceClick?: (faceInfo: FaceMeshInfo, screenPos: { x: number; y: number }) => void;
}

export class OrigamiModel {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private faceMeshInfos: FaceMeshInfo[] = [];
  private callbacks: OrigamiModelCallbacks;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement;
  private selectedFace: FaceMeshInfo | null = null;
  private originalEmissiveMap: Map<FaceMeshInfo, THREE.Color> = new Map();

  private unfoldStartTime: number = 0;
  private unfolding: boolean = false;
  private unfoldDuration: number = 2000;
  private waveEnabled: boolean = false;
  private autoRotate: boolean = false;
  private autoRotateSpeed: number = (Math.PI * 2) / 12000;

  private isDragging: boolean = false;
  private prevMouse: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: -0.25, y: 0 };
  private currentRotation: { x: number; y: number } = { x: -0.25, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private damping: number = 0.92;
  private _initialCameraPosition: THREE.Vector3;
  private currentCameraDistance: number = 600;
  private targetCameraDistance: number = 600;

  private resetting: boolean = false;
  private resetStartTime: number = 0;
  private resetPhase: 'camera' | 'collapse' | 'expand' = 'camera';

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    callbacks: OrigamiModelCallbacks = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.callbacks = callbacks;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._initialCameraPosition = camera.position.clone();
    void this._initialCameraPosition;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    let downTime = 0;
    let downPos = { x: 0, y: 0 };

    this.domElement.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      downTime = performance.now();
      downPos = { x: e.clientX, y: e.clientY };
      this.prevMouse = { x: e.clientX, y: e.clientY };
      this.rotationVelocity = { x: 0, y: 0 };
    });

    this.domElement.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.prevMouse.x;
        const dy = e.clientY - this.prevMouse.y;
        this.targetRotation.y += dx * 0.008;
        this.targetRotation.x += dy * 0.008;
        this.targetRotation.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.targetRotation.x));
        this.rotationVelocity.x = dy * 0.008;
        this.rotationVelocity.y = dx * 0.008;
        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    this.domElement.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      const timeDiff = performance.now() - downTime;
      const moveDiff = Math.abs(e.clientX - downPos.x) + Math.abs(e.clientY - downPos.y);
      if (timeDiff < 300 && moveDiff < 5) {
        this.handleClick(e.clientX, e.clientY);
      }
    });

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      this.targetCameraDistance = Math.max(300, Math.min(1800, this.targetCameraDistance * factor));
    }, { passive: false });
  }

  private handleClick(clientX: number, clientY: number) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.faceMeshInfos.map(f => f.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    this.clearSelection();
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const faceInfo = this.faceMeshInfos.find(f => f.mesh === hitMesh);
      if (faceInfo) {
        this.selectFace(faceInfo);
        if (this.callbacks.onFaceClick) {
          this.callbacks.onFaceClick(faceInfo, { x: clientX, y: clientY });
        }
      }
    }
  }

  private selectFace(faceInfo: FaceMeshInfo) {
    this.selectedFace = faceInfo;
    const mat = faceInfo.mesh.material as THREE.MeshStandardMaterial;
    this.originalEmissiveMap.set(faceInfo, mat.emissive.clone());
    mat.emissive.setHex(0x00B4FF);
    mat.emissiveIntensity = 0.55;
    const edgeMat = faceInfo.edges.material as THREE.LineBasicMaterial;
    edgeMat.color.setHex(0x00B4FF);
    edgeMat.opacity = 1;
  }

  public clearSelection() {
    if (this.selectedFace) {
      const mat = this.selectedFace.mesh.material as THREE.MeshStandardMaterial;
      const orig = this.originalEmissiveMap.get(this.selectedFace);
      if (orig) mat.emissive.copy(orig);
      mat.emissiveIntensity = 0;
      const edgeMat = this.selectedFace.edges.material as THREE.LineBasicMaterial;
      edgeMat.color.setHex(0xFFFFFF);
      edgeMat.opacity = 0.6;
      this.originalEmissiveMap.delete(this.selectedFace);
      this.selectedFace = null;
    }
  }

  private computeBFSTriangleOrder(triangles: Triangle[]): number[] {
    if (triangles.length === 0) return [];
    const visited = new Set<number>();
    const order: number[] = [];
    const queue: number[] = [];
    let largestIdx = 0;
    let largestArea = 0;
    for (let i = 0; i < triangles.length; i++) {
      if (triangles[i].area > largestArea) {
        largestArea = triangles[i].area;
        largestIdx = i;
      }
    }
    queue.push(largestIdx);
    visited.add(largestIdx);
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      const tri = triangles[current];
      for (const neighborIdx of tri.neighbors) {
        if (!visited.has(neighborIdx) && neighborIdx < triangles.length) {
          visited.add(neighborIdx);
          queue.push(neighborIdx);
        }
      }
    }
    for (let i = 0; i < triangles.length; i++) {
      if (!visited.has(i)) {
        order.push(i);
        visited.add(i);
      }
    }
    return order;
  }

  private findFoldEdge(tri: Triangle, _triIdx: number, foldedSet: Set<number>): SharedEdge | null {
    for (const se of tri.sharedEdges) {
      if (foldedSet.has(se.neighborIndex)) {
        return se;
      }
    }
    return null;
  }

  public buildModel(faceData: FaceData) {
    this.clearModel();
    const { triangles, imageWidth, imageHeight, normalizedScale } = faceData;
    const offsetX = imageWidth / 2;
    const offsetY = imageHeight / 2;
    const foldAngles = [Math.PI / 2, (3 * Math.PI) / 4];

    const order = this.computeBFSTriangleOrder(triangles);
    const foldedSet = new Set<number>();

    const tempInfos: Map<number, FaceMeshInfo> = new Map();
    const _worldTriPoints: Map<number, THREE.Vector3[]> = new Map();

    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i];
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(9);
      const points = [tri.a, tri.b, tri.c].map(p => {
        const x = (p.x - offsetX) * normalizedScale;
        const y = -(p.y - offsetY) * normalizedScale;
        return new THREE.Vector3(x, y, 0);
      });
      _worldTriPoints.set(i, points);
      for (let j = 0; j < 3; j++) {
        vertices[j * 3] = points[j].x;
        vertices[j * 3 + 1] = points[j].y;
        vertices[j * 3 + 2] = points[j].z;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();

      const color = new THREE.Color(
        tri.avgColor.r / 255,
        tri.avgColor.g / 255,
        tri.avgColor.b / 255
      );

      const material = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide,
        flatShading: true,
        metalness: 0.08,
        roughness: 0.7,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.98
      });

      const mesh = new THREE.Mesh(geometry, material);
      const edgeGeo = new THREE.EdgesGeometry(geometry, 0);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);

      const pivotGroup = new THREE.Group();
      const faceGroup = new THREE.Group();
      faceGroup.add(mesh);
      faceGroup.add(edges);
      pivotGroup.add(faceGroup);
      this.group.add(pivotGroup);

      const centroidVec = new THREE.Vector3(
        (points[0].x + points[1].x + points[2].x) / 3,
        (points[0].y + points[1].y + points[2].y) / 3,
        0
      );

      const ab = new THREE.Vector3().subVectors(points[1], points[0]);
      const ac = new THREE.Vector3().subVectors(points[2], points[0]);
      const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

      const faceInfo: FaceMeshInfo = {
        mesh,
        edges,
        group: faceGroup,
        pivotGroup,
        baseColor: color.clone(),
        centroid: centroidVec,
        planeNormal: normal,
        localPivot: new THREE.Vector3(),
        localAxis: new THREE.Vector3(0, 0, 1),
        foldAngle: 0,
        foldOrder: 0,
        uvBounds: tri.uvBounds,
        avgColor: tri.avgColor,
        waveFreq: 0.3 + Math.random() * 0.5,
        waveAmp: 2 + Math.random() * 2,
        wavePhase: Math.random() * Math.PI * 2,
        privateTime: Math.random() * 2000,
        foldProgress: 0,
        index: i
      };

      mesh.userData.faceIndex = i;
      tempInfos.set(i, faceInfo);
      this.faceMeshInfos.push(faceInfo);
    }

    const _parentPivotMap = new Map<number, THREE.Group | null>();

    for (let orderIdx = 0; orderIdx < order.length; orderIdx++) {
      const triIdx = order[orderIdx];
      const info = tempInfos.get(triIdx)!;
      const tri = triangles[triIdx];

      info.foldOrder = orderIdx;

      if (orderIdx === 0) {
        info.foldAngle = 0;
        info.localPivot.set(0, 0, 0);
        info.localAxis.set(1, 0, 0);
        _parentPivotMap.set(triIdx, null);
        foldedSet.add(triIdx);
        continue;
      }

      const foldEdge = this.findFoldEdge(tri, triIdx, foldedSet);
      let p1: THREE.Vector3, p2: THREE.Vector3;
      let parentIdx: number | null = null;
      if (foldEdge) {
        parentIdx = foldEdge.neighborIndex;
        p1 = new THREE.Vector3(
          (foldEdge.edge[0].x - offsetX) * normalizedScale,
          -(foldEdge.edge[0].y - offsetY) * normalizedScale,
          0
        );
        p2 = new THREE.Vector3(
          (foldEdge.edge[1].x - offsetX) * normalizedScale,
          -(foldEdge.edge[1].y - offsetY) * normalizedScale,
          0
        );
      } else {
        const pts = [tri.a, tri.b, tri.c];
        const edgeIdx = Math.floor(Math.random() * 3);
        p1 = new THREE.Vector3(
          (pts[edgeIdx].x - offsetX) * normalizedScale,
          -(pts[edgeIdx].y - offsetY) * normalizedScale,
          0
        );
        p2 = new THREE.Vector3(
          (pts[(edgeIdx + 1) % 3].x - offsetX) * normalizedScale,
          -(pts[(edgeIdx + 1) % 3].y - offsetY) * normalizedScale,
          0
        );
      }

      const pivotWorld = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const axisWorld = new THREE.Vector3().subVectors(p2, p1).normalize();
      if (axisWorld.lengthSq() < 1e-6) {
        axisWorld.set(1, 0, 0);
      }

      if (parentIdx !== null && tempInfos.has(parentIdx)) {
        const parentInfo = tempInfos.get(parentIdx)!;
        const parentPivotGroup = parentInfo.pivotGroup;
        this.group.remove(info.pivotGroup);
        parentPivotGroup.add(info.pivotGroup);
        _parentPivotMap.set(triIdx, parentPivotGroup);
        const localPivot = info.pivotGroup.parent!.worldToLocal(pivotWorld.clone());
        const localAxis = info.pivotGroup.parent!.worldToLocal(axisWorld.clone().add(pivotWorld)).sub(localPivot).normalize();
        info.localPivot.copy(localPivot);
        info.localAxis.copy(localAxis.lengthSq() > 1e-6 ? localAxis : new THREE.Vector3(1, 0, 0));
      } else {
        const localPivot = this.group.worldToLocal(pivotWorld.clone());
        const localAxis = this.group.worldToLocal(axisWorld.clone().add(pivotWorld)).sub(localPivot).normalize();
        info.localPivot.copy(localPivot);
        info.localAxis.copy(localAxis.lengthSq() > 1e-6 ? localAxis : new THREE.Vector3(1, 0, 0));
        _parentPivotMap.set(triIdx, null);
      }

      const angleChoice = foldAngles[Math.floor(Math.random() * foldAngles.length)];
      const dir = Math.random() > 0.5 ? 1 : -1;
      const centroid = info.centroid.clone();
      const pivotToCentroid = new THREE.Vector3().subVectors(centroid, pivotWorld);
      const crossCheck = new THREE.Vector3().crossVectors(axisWorld, pivotToCentroid);
      const normalSign = crossCheck.dot(new THREE.Vector3(0, 0, 1));
      const finalDir = normalSign >= 0 ? -dir : dir;
      info.foldAngle = angleChoice * finalDir;

      foldedSet.add(triIdx);
    }

    for (const info of this.faceMeshInfos) {
      info.pivotGroup.position.copy(info.localPivot);
    }

    const centerPoint = new THREE.Vector3();
    for (const info of this.faceMeshInfos) {
      centerPoint.add(info.centroid);
    }
    centerPoint.divideScalar(Math.max(1, this.faceMeshInfos.length));
    this.group.position.sub(centerPoint);

    this.unfolding = true;
    this.unfoldStartTime = performance.now();
    this.faceMeshInfos.sort((a, b) => a.index - b.index);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
  }

  public isAutoRotating(): boolean {
    return this.autoRotate;
  }

  public resetView() {
    this.resetting = true;
    this.resetStartTime = performance.now();
    this.resetPhase = 'camera';
    this.autoRotate = false;
  }

  private applyFoldTransform(info: FaceMeshInfo, progress: number) {
    const eased = this.easeOutCubic(Math.min(1, Math.max(0, progress)));
    const currentAngle = info.foldAngle * eased;
    info.group.position.set(0, 0, 0);
    info.group.rotation.set(0, 0, 0);
    info.group.position.sub(info.localPivot);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(info.localAxis, currentAngle);
    info.group.position.applyQuaternion(quaternion);
    info.group.position.add(info.localPivot);
    info.group.setRotationFromQuaternion(quaternion);
  }

  private applyWaveTransform(info: FaceMeshInfo, deltaTimeMs: number) {
    info.privateTime += deltaTimeMs;
    const tSec = info.privateTime / 1000;
    const offset = Math.sin(tSec * info.waveFreq * Math.PI * 2 + info.wavePhase) * info.waveAmp;
    const progress = info.foldProgress;
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(info.localAxis, info.foldAngle * progress);
    const normalLocal = new THREE.Vector3(0, 0, 1);
    normalLocal.applyQuaternion(rotQuat).normalize();
    const waveVec = normalLocal.multiplyScalar(offset * 0.35);
    info.group.position.add(waveVec);
  }

  public update(deltaTime: number, now: number) {
    if (this.resetting) {
      this.updateReset(now);
    }
    if (this.autoRotate && !this.isDragging && !this.resetting) {
      this.targetRotation.y += this.autoRotateSpeed * deltaTime;
    }
    if (!this.isDragging && !this.resetting) {
      this.targetRotation.x += this.rotationVelocity.x;
      this.targetRotation.y += this.rotationVelocity.y;
      this.rotationVelocity.x *= this.damping;
      this.rotationVelocity.y *= this.damping;
      if (Math.abs(this.rotationVelocity.x) < 0.0001) this.rotationVelocity.x = 0;
      if (Math.abs(this.rotationVelocity.y) < 0.0001) this.rotationVelocity.y = 0;
    }
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.08;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.08;
    this.group.rotation.x = this.currentRotation.x;
    this.group.rotation.y = this.currentRotation.y;
    this.currentCameraDistance += (this.targetCameraDistance - this.currentCameraDistance) * 0.08;
    const camDir = new THREE.Vector3(0, 0, 1);
    const camQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-this.currentRotation.x, -this.currentRotation.y, 0, 'YXZ'));
    camDir.applyQuaternion(camQuat);
    this.camera.position.copy(camDir.multiplyScalar(this.currentCameraDistance));
    this.camera.lookAt(0, 0, 0);
    this.updateAnimations(now, deltaTime);
  }

  private updateReset(now: number) {
    const elapsed = now - this.resetStartTime;
    if (this.resetPhase === 'camera') {
      const dur = 500;
      const t = Math.min(1, elapsed / dur);
      const eased = this.easeOutCubic(t);
      this.targetRotation.x = -0.25 + (this.targetRotation.x + 0.25) * (1 - eased);
      this.targetRotation.y *= (1 - eased);
      this.targetCameraDistance = 600 + (this.targetCameraDistance - 600) * (1 - eased);
      if (elapsed >= dur) {
        this.resetStartTime = now;
        this.resetPhase = 'collapse';
      }
    } else if (this.resetPhase === 'collapse') {
      const dur = 900;
      const t = Math.min(1, elapsed / dur);
      const progress = 1 - this.easeOutCubic(t);
      for (const info of this.faceMeshInfos) {
        info.foldProgress = progress;
        this.applyFoldTransform(info, progress);
        const edgeMat = info.edges.material as THREE.LineBasicMaterial;
        edgeMat.opacity = 0.6 * (1 - t);
      }
      if (elapsed >= dur) {
        this.resetStartTime = now;
        this.resetPhase = 'expand';
        this.waveEnabled = false;
      }
    } else if (this.resetPhase === 'expand') {
      const dur = 2000;
      for (const info of this.faceMeshInfos) {
        const maxOrder = Math.max(1, this.faceMeshInfos.length);
        const staggerDelay = (info.foldOrder / maxOrder) * 400;
        const localT = Math.max(0, Math.min(1, (elapsed - staggerDelay) / (dur - 400)));
        const eased = this.easeOutCubic(localT);
        info.foldProgress = eased;
        this.applyFoldTransform(info, eased);
        const edgeMat = info.edges.material as THREE.LineBasicMaterial;
        edgeMat.opacity = Math.min(0.6, eased * 0.7);
      }
      if (elapsed >= dur * 0.8) {
        this.waveEnabled = true;
      }
      if (elapsed >= dur) {
        this.resetting = false;
      }
    }
  }

  private updateAnimations(now: number, deltaTime: number) {
    if (this.unfolding && !this.resetting) {
      const elapsed = now - this.unfoldStartTime;
      const maxOrder = Math.max(1, this.faceMeshInfos.length);
      for (const info of this.faceMeshInfos) {
        const staggerDelay = (info.foldOrder / maxOrder) * 350;
        const localT = Math.max(0, Math.min(1, (elapsed - staggerDelay) / (this.unfoldDuration - 200)));
        const eased = this.easeOutCubic(localT);
        info.foldProgress = eased;
        this.applyFoldTransform(info, eased);
        const edgeMat = info.edges.material as THREE.LineBasicMaterial;
        edgeMat.opacity = Math.min(0.6, eased * 0.8);
      }
      if (elapsed >= this.unfoldDuration + 400) {
        this.unfolding = false;
        this.waveEnabled = true;
      }
    } else if (!this.resetting) {
      for (const info of this.faceMeshInfos) {
        this.applyFoldTransform(info, info.foldProgress);
      }
    }
    if (this.waveEnabled && !this.resetting) {
      for (const info of this.faceMeshInfos) {
        this.applyWaveTransform(info, deltaTime);
      }
    }
  }

  public getFaceCount(): number {
    return this.faceMeshInfos.length;
  }

  public getFaceMeshInfos(): FaceMeshInfo[] {
    return this.faceMeshInfos;
  }

  public clearModel() {
    for (const info of this.faceMeshInfos) {
      info.group.remove(info.mesh);
      info.group.remove(info.edges);
      info.pivotGroup.remove(info.group);
      if (info.pivotGroup.parent) {
        info.pivotGroup.parent.remove(info.pivotGroup);
      }
      info.mesh.geometry.dispose();
      (info.mesh.material as THREE.Material).dispose();
      info.edges.geometry.dispose();
      (info.edges.material as THREE.Material).dispose();
    }
    this.faceMeshInfos = [];
    this.originalEmissiveMap.clear();
    this.selectedFace = null;
    this.waveEnabled = false;
    this.unfolding = false;
  }

  public dispose() {
    this.clearModel();
    this.scene.remove(this.group);
  }
}
