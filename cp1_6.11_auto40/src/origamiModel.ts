import * as THREE from 'three';
import { FaceData, Triangle } from './faceGenerator';

export interface FaceMeshInfo {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  group: THREE.Group;
  baseColor: THREE.Color;
  centroid: THREE.Vector3;
  sharedEdge?: {
    pivot: THREE.Vector3;
    axis: THREE.Vector3;
    angle: number;
  };
  uvBounds: { minX: number; minY: number; maxX: number; maxY: number };
  avgColor: { r: number; g: number; b: number };
  waveFreq: number;
  waveAmp: number;
  wavePhase: number;
  foldProgress: number;
  foldTarget: number;
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
  private waveStartTime: number = 0;
  private waveEnabled: boolean = false;
  private autoRotate: boolean = false;
  private autoRotateSpeed: number = (Math.PI * 2) / 12000;

  private isDragging: boolean = false;
  private prevMouse: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: -0.3, y: 0 };
  private currentRotation: { x: number; y: number } = { x: -0.3, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private damping: number = 0.9;
  private initialCameraPosition: THREE.Vector3;
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
    this.initialCameraPosition = camera.position.clone();
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
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
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
    mat.emissiveIntensity = 0.5;
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

  public buildModel(faceData: FaceData) {
    this.clearModel();
    const { triangles, imageWidth, imageHeight, normalizedScale } = faceData;
    const offsetX = imageWidth / 2;
    const offsetY = imageHeight / 2;
    const foldedAngles = [Math.PI / 2, (3 * Math.PI) / 4];

    const meshMap = new Map<number, FaceMeshInfo>();
    const centerPoint = new THREE.Vector3(0, 0, 0);

    triangles.forEach((tri: Triangle, idx: number) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(9);
      const points = [tri.a, tri.b, tri.c].map(p => {
        const x = (p.x - offsetX) * normalizedScale;
        const y = -(p.y - offsetY) * normalizedScale;
        return new THREE.Vector3(x, y, 0);
      });
      centerPoint.add(points[0]).add(points[1]).add(points[2]);
      for (let i = 0; i < 3; i++) {
        vertices[i * 3] = points[i].x;
        vertices[i * 3 + 1] = points[i].y;
        vertices[i * 3 + 2] = points[i].z;
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
        metalness: 0.1,
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

      const faceGroup = new THREE.Group();
      faceGroup.add(mesh);
      faceGroup.add(edges);
      this.group.add(faceGroup);

      const centroidVec = new THREE.Vector3(
        (points[0].x + points[1].x + points[2].x) / 3,
        (points[0].y + points[1].y + points[2].y) / 3,
        0
      );

      const faceInfo: FaceMeshInfo = {
        mesh,
        edges,
        group: faceGroup,
        baseColor: color.clone(),
        centroid: centroidVec,
        uvBounds: tri.uvBounds,
        avgColor: tri.avgColor,
        waveFreq: 0.3 + Math.random() * 0.5,
        waveAmp: 2 + Math.random() * 2,
        wavePhase: Math.random() * Math.PI * 2,
        foldProgress: 0,
        foldTarget: 0,
        index: idx
      };

      mesh.userData.faceIndex = idx;
      this.faceMeshInfos.push(faceInfo);
      meshMap.set(idx, faceInfo);
    });

    centerPoint.divideScalar(triangles.length * 3);
    this.group.position.sub(centerPoint);

    triangles.forEach((tri, idx) => {
      const info = meshMap.get(idx)!;
      if (tri.neighbors.length > 0) {
        const neighborIdx = tri.neighbors[Math.floor(Math.random() * tri.neighbors.length)];
        const neighborTri = triangles[neighborIdx];
        if (neighborTri) {
          const sharedEdge = this.findSharedEdge(tri, neighborTri);
          if (sharedEdge) {
            const p1 = new THREE.Vector3(
              (sharedEdge.p1.x - offsetX) * normalizedScale,
              -(sharedEdge.p1.y - offsetY) * normalizedScale,
              0
            );
            const p2 = new THREE.Vector3(
              (sharedEdge.p2.x - offsetX) * normalizedScale,
              -(sharedEdge.p2.y - offsetY) * normalizedScale,
              0
            );
            const pivot = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            const axis = new THREE.Vector3().subVectors(p2, p1).normalize();
            const angle = foldedAngles[Math.floor(Math.random() * foldedAngles.length)];
            const sign = Math.random() > 0.5 ? 1 : -1;
            info.sharedEdge = {
              pivot,
              axis,
              angle: angle * sign
            };
            info.foldTarget = 1;
          }
        }
      }
      if (!info.sharedEdge) {
        const pts = [tri.a, tri.b, tri.c];
        const edgeIdx = Math.floor(Math.random() * 3);
        const p1 = new THREE.Vector3(
          (pts[edgeIdx].x - offsetX) * normalizedScale,
          -(pts[edgeIdx].y - offsetY) * normalizedScale,
          0
        );
        const p2 = new THREE.Vector3(
          (pts[(edgeIdx + 1) % 3].x - offsetX) * normalizedScale,
          -(pts[(edgeIdx + 1) % 3].y - offsetY) * normalizedScale,
          0
        );
        const pivot = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const axis = new THREE.Vector3().subVectors(p2, p1).normalize();
        info.sharedEdge = {
          pivot,
          axis,
          angle: foldedAngles[Math.floor(Math.random() * foldedAngles.length)] * (Math.random() > 0.5 ? 1 : -1)
        };
        info.foldTarget = 0.85;
      }
    });

    this.unfolding = true;
    this.unfoldStartTime = performance.now();
    this.waveStartTime = performance.now() + this.unfoldDuration + 500;
    this.faceMeshInfos.sort((a, b) => a.index - b.index);
  }

  private findSharedEdge(t1: Triangle, t2: Triangle): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    const pts1 = [t1.a, t1.b, t1.c];
    const pts2 = [t2.a, t2.b, t2.c];
    const shared: { x: number; y: number }[] = [];
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        if (Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1) {
          shared.push(p1);
          break;
        }
      }
    }
    if (shared.length >= 2) {
      return { p1: shared[0], p2: shared[1] };
    }
    return null;
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
    if (!info.sharedEdge) return;
    const { pivot, axis, angle } = info.sharedEdge;
    const eased = this.easeOutCubic(Math.min(1, Math.max(0, progress)));
    const currentAngle = angle * eased;
    info.group.position.set(0, 0, 0);
    info.group.rotation.set(0, 0, 0);
    info.group.updateMatrix();
    const pivotWorld = pivot.clone();
    const axisWorld = axis.clone();
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axisWorld, currentAngle);
    info.group.position.sub(pivotWorld);
    info.group.position.applyQuaternion(quaternion);
    info.group.position.add(pivotWorld);
    info.group.setRotationFromQuaternion(quaternion);
  }

  private applyWaveTransform(info: FaceMeshInfo, time: number) {
    const t = time / 1000;
    const offset = Math.sin(t * info.waveFreq * Math.PI * 2 + info.wavePhase) * info.waveAmp;
    if (info.sharedEdge) {
      const normal = new THREE.Vector3(0, 0, 1);
      normal.applyAxisAngle(info.sharedEdge.axis, info.sharedEdge.angle * info.foldProgress);
      info.group.position.add(normal.multiplyScalar(offset * 0.3));
    } else {
      info.group.position.z += offset;
    }
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
    this.updateAnimations(now);
  }

  private updateReset(now: number) {
    const elapsed = now - this.resetStartTime;
    if (this.resetPhase === 'camera') {
      const dur = 600;
      const t = Math.min(1, elapsed / dur);
      const eased = this.easeOutCubic(t);
      this.targetRotation.x = -0.3 * eased;
      this.targetRotation.y = 0 * eased;
      this.targetCameraDistance = 600 + (this.initialCameraPosition.length() - 600) * (1 - eased);
      if (elapsed >= dur) {
        this.resetStartTime = now;
        this.resetPhase = 'collapse';
      }
    } else if (this.resetPhase === 'collapse') {
      const dur = 800;
      const t = Math.min(1, elapsed / dur);
      const progress = 1 - this.easeOutCubic(t);
      for (const info of this.faceMeshInfos) {
        info.foldProgress = progress * info.foldTarget;
        this.applyFoldTransform(info, info.foldProgress / info.foldTarget);
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
      const t = Math.min(1, elapsed / dur);
      const eased = this.easeOutCubic(t);
      for (const info of this.faceMeshInfos) {
        info.foldProgress = eased * info.foldTarget;
        this.applyFoldTransform(info, eased);
        const edgeMat = info.edges.material as THREE.LineBasicMaterial;
        edgeMat.opacity = 0.6 * eased;
      }
      if (elapsed >= dur * 0.8) {
        this.waveEnabled = true;
      }
      if (elapsed >= dur) {
        this.resetting = false;
        this.waveStartTime = now;
      }
    }
  }

  private updateAnimations(now: number) {
    if (this.unfolding && !this.resetting) {
      const elapsed = now - this.unfoldStartTime;
      const t = Math.min(1, elapsed / this.unfoldDuration);
      void t;
      for (let i = 0; i < this.faceMeshInfos.length; i++) {
        const info = this.faceMeshInfos[i];
        const staggerDelay = (i / Math.max(1, this.faceMeshInfos.length)) * 300;
        const localT = Math.max(0, Math.min(1, (elapsed - staggerDelay) / (this.unfoldDuration - 200)));
        const localEased = this.easeOutCubic(localT);
        info.foldProgress = localEased * info.foldTarget;
        if (info.sharedEdge) {
          this.applyFoldTransform(info, localEased);
        }
        const edgeMat = info.edges.material as THREE.LineBasicMaterial;
        edgeMat.opacity = Math.min(0.6, localEased * 0.8);
      }
      if (elapsed >= this.unfoldDuration + 500) {
        this.unfolding = false;
        this.waveEnabled = true;
      }
    } else if (!this.resetting) {
      for (const info of this.faceMeshInfos) {
        if (info.sharedEdge && !this.resetting) {
          this.applyFoldTransform(info, info.foldProgress / Math.max(0.01, info.foldTarget));
        }
      }
    }
    if (this.waveEnabled && !this.resetting) {
      const waveTime = now - this.waveStartTime;
      for (const info of this.faceMeshInfos) {
        this.applyWaveTransform(info, waveTime);
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
      this.group.remove(info.group);
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
