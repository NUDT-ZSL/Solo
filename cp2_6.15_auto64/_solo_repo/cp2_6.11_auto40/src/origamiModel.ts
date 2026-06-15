import * as THREE from 'three';
import type { Triangle, FaceData, Point } from './faceGenerator';

interface FaceRuntime {
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  tri: Triangle;
  hingeAxis: THREE.Vector3;
  hingePoint: THREE.Vector3;
  hingeAngleDeg: number;
  hingeAngleRad: number;
  baseColor: THREE.Color;
  breathFreqHz: number;
  breathAmp: number;
  breathPhase: number;
  highlighted: boolean;
  baseMat: THREE.MeshLambertMaterial;
  hlMat: THREE.MeshLambertMaterial;
  hingeSourceNeighbor: number;
}

export interface OrigamiCallbacks {
  onFaceClicked: (faceIdx: number, clientX: number, clientY: number) => void;
}

export class OrigamiModel {
  public readonly root: THREE.Group;
  private faces: FaceRuntime[] = [];
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cb: OrigamiCallbacks;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private ndc: THREE.Vector2 = new THREE.Vector2();

  private unfoldT: number = 0;
  private unfoldDir: 1 | -1 = 1;
  private unfolding: boolean = false;
  private unfoldStartMs: number = 0;
  private readonly UNFOLD_DURATION_MS = 2000;

  private dragging = false;
  private dragPrevX = 0;
  private dragPrevY = 0;
  private velX = 0;
  private velY = 0;
  private readonly DAMP = 0.9;
  private readonly ROT_SPEED = 0.005;

  private autoRot = false;
  private readonly AUTO_ROT_SPD = (2 * Math.PI) / 12000;

  private camDist = 320;
  private readonly CAM_MIN = 120;
  private readonly CAM_MAX = 960;
  private camTarget = new THREE.Vector3();
  private readonly INITIAL_CAM_POS: THREE.Vector3;

  private camAnim = false;
  private camAnimStartPos = new THREE.Vector3();
  private camAnimStartTgt = new THREE.Vector3();
  private camAnimT = 0;
  private readonly CAM_ANIM_DUR_MS = 1200;

  private hlIdx = -1;
  private clock = new THREE.Clock();
  private faceData: FaceData | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, cb: OrigamiCallbacks) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cb = cb;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.INITIAL_CAM_POS = camera.position.clone();
    this.bindInteraction();
  }

  // ============== 对外 API ==============
  build(faceData: FaceData): void {
    this.clear();
    this.faceData = faceData;
    const { triangles: tris, imageWidth: W, imageHeight: H } = faceData;
    const scale = 220 / Math.max(W, H);
    const ox = -W * scale / 2;
    const oy = H * scale / 2;

    this.faces = tris.map((tri, i) => this.buildOneFace(tri, i, tris, W, H, scale, ox, oy));
    this.faces.forEach(f => this.root.add(f.group));

    this.unfoldT = 0;
    this.unfoldDir = 1;
    this.unfolding = true;
    this.unfoldStartMs = performance.now();
  }

  setAutoRotate(v: boolean): void { this.autoRot = v; }
  isAutoRotate(): boolean { return this.autoRot; }
  faceCount(): number { return this.faces.length; }

  getFacePayload(i: number): { tri: Triangle; faceData: FaceData } | null {
    if (!this.faceData || i < 0 || i >= this.faces.length) return null;
    return { tri: this.faces[i].tri, faceData: this.faceData };
  }

  clearHL(): void { this.setHL(-1); }

  resetViewAndReplay(): void {
    this.camAnim = true;
    this.camAnimStartPos.copy(this.camera.position);
    this.camAnimStartTgt.copy(this.camTarget);
    this.camAnimT = 0;

    this.unfoldT = 1;
    this.unfoldDir = -1;
    this.unfolding = true;
    this.unfoldStartMs = performance.now();

    setTimeout(() => {
      this.unfoldT = 0;
      this.unfoldDir = 1;
      this.unfolding = true;
      this.unfoldStartMs = performance.now();
    }, 1100);
  }

  dispose(): void { this.clear(); this.scene.remove(this.root); }

  // ============== 每帧更新 ==============
  update(): void {
    const nowMs = performance.now();
    const elapsedSec = this.clock.getElapsedTime();

    if (this.unfolding) {
      const raw = Math.min(1, (nowMs - this.unfoldStartMs) / this.UNFOLD_DURATION_MS);
      const eased = this.cubicOut(raw);
      if (this.unfoldDir === 1) this.unfoldT = eased;
      else this.unfoldT = 1 - eased;
      if (raw >= 1) this.unfolding = false;
    }

    if (this.autoRot && !this.dragging) this.velY = this.AUTO_ROT_SPD * 16;

    if (Math.abs(this.velX) > 1e-5 || Math.abs(this.velY) > 1e-5) {
      const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.velY);
      const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.velX);
      this.root.quaternion.premultiply(qY).premultiply(qX);
      if (!this.dragging) { this.velX *= this.DAMP; this.velY *= this.DAMP; }
    }

    if (this.camAnim) {
      this.camAnimT += 16 / this.CAM_ANIM_DUR_MS;
      const t = this.easeInOut(Math.min(1, this.camAnimT));
      this.camera.position.lerpVectors(this.camAnimStartPos, this.INITIAL_CAM_POS, t);
      this.camTarget.lerpVectors(this.camAnimStartTgt, new THREE.Vector3(), t);
      if (t >= 1) {
        this.camAnim = false;
        this.root.quaternion.identity();
        this.velX = this.velY = 0;
      }
    }

    for (const f of this.faces) {
      const ang = f.hingeAngleRad * this.unfoldT;

      f.group.position.copy(f.hingePoint).negate();
      f.group.position.applyAxisAngle(f.hingeAxis, ang);
      f.group.position.add(f.hingePoint);

      const q = new THREE.Quaternion().setFromAxisAngle(f.hingeAxis, ang);
      f.group.quaternion.copy(q);

      const breathZ = Math.sin(elapsedSec * f.breathFreqHz * 2 * Math.PI + f.breathPhase) * f.breathAmp;
      const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(q).multiplyScalar(breathZ * this.unfoldT);
      f.group.position.add(localZ);

      const em = f.edges.material as THREE.LineBasicMaterial;
      if (this.unfoldT < 0.95) em.opacity = this.unfoldT * 0.6;
      else if (!f.highlighted) em.opacity = 0.6;
    }

    if (!this.camAnim) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.camera.position.copy(this.camTarget).add(dir.multiplyScalar(-this.camDist));
    }
    this.camera.lookAt(this.camTarget);
  }

  // ============== 内部：构建单个面片 ==============
  private buildOneFace(tri: Triangle, idx: number, all: Triangle[], _W: number, _H: number, scale: number, ox: number, oy: number): FaceRuntime {
    const to3 = (p: Point) => new THREE.Vector3(p.x * scale + ox, -(p.y * scale) + oy, 0);

    const a = to3(tri.a), b = to3(tri.b), c = to3(tri.c);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z
    ]), 3));
    geom.computeVertexNormals();

    const color = new THREE.Color(tri.color.r / 255, tri.color.g / 255, tri.color.b / 255);
    const baseMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const hlMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 1, emissive: 0x00B4FF, emissiveIntensity: 0.35 });
    const mesh = new THREE.Mesh(geom, baseMat);

    const edgeGeom = new THREE.EdgesGeometry(geom);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 });
    const edges = new THREE.LineSegments(edgeGeom, edgeMat);

    const group = new THREE.Group();
    group.add(mesh, edges);

    const { axis, point, angleDeg, neighbor } = this.findHingeBySharedEdge(idx, tri, all, to3);

    return {
      group, mesh, edges, tri,
      hingeAxis: axis, hingePoint: point,
      hingeAngleDeg: angleDeg,
      hingeAngleRad: angleDeg * Math.PI / 180,
      baseColor: color,
      breathFreqHz: 0.3 + Math.random() * 0.5,
      breathAmp: 2 + Math.random() * 2,
      breathPhase: Math.random() * 2 * Math.PI,
      highlighted: false,
      baseMat, hlMat,
      hingeSourceNeighbor: neighbor
    };
  }

  // ============== 核心：按相邻面片共享边找折轴（非中心向量法） ==============
  private findHingeBySharedEdge(
    _idx: number,
    tri: Triangle,
    all: Triangle[],
    to3: (p: Point) => THREE.Vector3
  ): { axis: THREE.Vector3; point: THREE.Vector3; angleDeg: number; neighbor: number } {
    const neigh = tri.neighbors;
    let sharedP3D: [THREE.Vector3, THREE.Vector3] | null = null;
    let matchedNeighbor = -1;

    if (neigh && neigh.length > 0) {
      const nIdx = neigh[Math.floor(Math.random() * neigh.length)];
      const nt = all[nIdx];
      const myPts: Point[] = [tri.a, tri.b, tri.c];
      const nbPts: Point[] = [nt.a, nt.b, nt.c];
      const shared: THREE.Vector3[] = [];
      for (const mp of myPts) {
        for (const np of nbPts) {
          if (Math.abs(mp.x - np.x) < 0.6 && Math.abs(mp.y - np.y) < 0.6) {
            shared.push(to3(mp));
            break;
          }
        }
      }
      if (shared.length >= 2) {
        sharedP3D = [shared[0], shared[1]];
        matchedNeighbor = nIdx;
      }
    }

    if (!sharedP3D) {
      const pts = [tri.a, tri.b, tri.c];
      sharedP3D = [to3(pts[0]), to3(pts[1])];
      matchedNeighbor = -1;
    }

    const [s, e] = sharedP3D;
    const axis = new THREE.Vector3().subVectors(e, s);
    if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0);
    axis.normalize();
    const point = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);

    const angleChoices = [90, 135];
    const pickedAngle = angleChoices[Math.floor(Math.random() * angleChoices.length)];
    const sign = Math.random() > 0.5 ? 1 : -1;

    return { axis, point, angleDeg: pickedAngle * sign, neighbor: matchedNeighbor };
  }

  // ============== 交互 ==============
  private bindInteraction(): void {
    const cv = this.renderer.domElement;
    cv.addEventListener('pointerdown', e => {
      this.dragging = true;
      this.dragPrevX = e.clientX; this.dragPrevY = e.clientY;
      this.velX = this.velY = 0;
    });
    cv.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragPrevX, dy = e.clientY - this.dragPrevY;
      this.velY = dx * this.ROT_SPEED;
      this.velX = dy * this.ROT_SPEED;
      this.dragPrevX = e.clientX; this.dragPrevY = e.clientY;
    });
    cv.addEventListener('pointerup', e => {
      if (!this.dragging) return;
      const moved = Math.abs(this.velX) > 0.002 || Math.abs(this.velY) > 0.002;
      this.dragging = false;
      if (!moved) this.handlePick(e);
    });
    cv.addEventListener('pointerleave', () => { this.dragging = false; });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      this.camDist *= 1 + e.deltaY * 0.001;
      this.camDist = Math.max(this.CAM_MIN, Math.min(this.CAM_MAX, this.camDist));
    }, { passive: false });
  }

  private handlePick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.faces.map(f => f.mesh));
    if (hits.length === 0) return;
    const m = hits[0].object as THREE.Mesh;
    const idx = this.faces.findIndex(f => f.mesh === m);
    if (idx < 0) return;
    this.setHL(idx);
    this.cb.onFaceClicked(idx, e.clientX, e.clientY);
  }

  setHL(i: number): void {
    if (this.hlIdx >= 0 && this.hlIdx < this.faces.length) {
      const p = this.faces[this.hlIdx];
      p.mesh.material = p.baseMat;
      p.highlighted = false;
      (p.edges.material as THREE.LineBasicMaterial).color.setHex(0xFFFFFF);
      (p.edges.material as THREE.LineBasicMaterial).opacity = this.unfoldT >= 0.95 ? 0.6 : this.unfoldT * 0.6;
    }
    this.hlIdx = i;
    if (i >= 0 && i < this.faces.length) {
      const p = this.faces[i];
      p.mesh.material = p.hlMat;
      p.highlighted = true;
      (p.edges.material as THREE.LineBasicMaterial).color.setHex(0x00B4FF);
      (p.edges.material as THREE.LineBasicMaterial).opacity = 1;
    }
  }

  // ============== 辅助 ==============
  private clear(): void {
    for (const f of this.faces) {
      this.root.remove(f.group);
      f.mesh.geometry.dispose();
      f.baseMat.dispose(); f.hlMat.dispose();
      f.edges.geometry.dispose();
      (f.edges.material as THREE.Material).dispose();
    }
    this.faces = [];
    this.faceData = null;
    this.hlIdx = -1;
  }

  private cubicOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
  private easeInOut(t: number): number { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
}
