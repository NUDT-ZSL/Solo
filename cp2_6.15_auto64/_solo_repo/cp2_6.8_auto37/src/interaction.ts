import * as THREE from 'three';
import { TreeGenerator, BranchData } from './tree';

interface LaserSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  line: THREE.Line;
  life: number;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private tree: TreeGenerator;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private lastWorldPoint: THREE.Vector3 | null = null;
  private laserSegments: LaserSegment[] = [];

  private cutRadius: number = 1.0;
  private clickCount: number = 0;
  private clickTimer: number | null = null;

  private onStatsUpdate: ((stats: { branchCount: number; leafCount: number; maxLayer: number } | null) => void) | null = null;
  private onBloom: (() => void) | null = null;

  private planeY: number = 2;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    tree: TreeGenerator
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.tree = tree;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  public setCutRadius(radius: number): void {
    this.cutRadius = radius;
  }

  public setStatsCallback(cb: (stats: { branchCount: number; leafCount: number; maxLayer: number } | null) => void): void {
    this.onStatsUpdate = cb;
  }

  public setBloomCallback(cb: () => void): void {
    this.onBloom = cb;
  }

  private setupEventListeners(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));

    domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
  }

  private updateMouse(event: MouseEvent | Touch): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectionWithPlane(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.planeY);
    const intersection = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(plane, intersection);
    return result ? intersection : null;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.updateMouse(event);
    this.handlePress();
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    if (this.isDragging) {
      this.handleDrag();
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.updateMouse(event);
    this.handleRelease();
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      this.updateMouse(event.touches[0]);
      this.handlePress();
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0 && this.isDragging) {
      this.updateMouse(event.touches[0]);
      this.handleDrag();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.handleRelease();
  }

  private handlePress(): void {
    const worldPoint = this.getIntersectionWithPlane();
    if (!worldPoint) return;

    this.isDragging = true;
    this.lastWorldPoint = worldPoint.clone();

    this.checkClickCollision();
  }

  private handleDrag(): void {
    const worldPoint = this.getIntersectionWithPlane();
    if (!worldPoint || !this.lastWorldPoint) return;

    this.createLaserSegment(this.lastWorldPoint, worldPoint);
    this.checkCutCollision(this.lastWorldPoint, worldPoint);
    this.lastWorldPoint = worldPoint.clone();
  }

  private handleRelease(): void {
    this.isDragging = false;
    this.lastWorldPoint = null;
  }

  private checkClickCollision(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const branchMeshes = this.tree.branches.map(b => b.mesh);
    const leafMeshes = this.tree.leaves;
    const allMeshes = [...branchMeshes, ...leafMeshes];

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      this.clickCount++;

      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
      }

      if (this.clickCount >= 2) {
        this.clickCount = 0;
        if (this.onBloom) {
          this.onBloom();
        } else {
          this.tree.triggerBloom();
        }
        return;
      }

      this.clickTimer = window.setTimeout(() => {
        if (this.clickCount === 1) {
          const stats = this.tree.getStats();
          if (this.onStatsUpdate) {
            this.onStatsUpdate(stats);
          }
        }
        this.clickCount = 0;
        this.clickTimer = null;
      }, 280);
    } else {
      if (this.onStatsUpdate) {
        this.onStatsUpdate(null);
      }
    }
  }

  private createLaserSegment(start: THREE.Vector3, end: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.6,
      linewidth: Math.max(1, this.cutRadius * 2)
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.laserSegments.push({
      start: start.clone(),
      end: end.clone(),
      line,
      life: 0.3
    });
  }

  private checkCutCollision(start: THREE.Vector3, end: THREE.Vector3): void {
    const cutLength = new THREE.Vector3().subVectors(end, start).length();
    if (cutLength < 0.001) return;

    const branchesToCut: Set<BranchData> = new Set();
    const leavesToCut: Set<THREE.Mesh> = new Set();

    for (const branch of this.tree.branches) {
      if (this.segmentIntersectsBranch(start, end, branch)) {
        branchesToCut.add(branch);
      }
    }

    for (const leaf of this.tree.leaves) {
      if (this.pointNearSegment(leaf.position, start, end, this.cutRadius * 0.8)) {
        leavesToCut.add(leaf);
      }
    }

    for (const branch of branchesToCut) {
      this.tree.cutBranch(branch);
    }

    for (const leaf of leavesToCut) {
      this.tree.cutLeaf(leaf);
    }
  }

  private segmentIntersectsBranch(
    segStart: THREE.Vector3,
    segEnd: THREE.Vector3,
    branch: BranchData
  ): boolean {
    const dist = this.distanceBetweenSegments(
      segStart, segEnd,
      branch.start, branch.end
    );
    return dist < (this.cutRadius + branch.radius);
  }

  private distanceBetweenSegments(
    p1: THREE.Vector3, p2: THREE.Vector3,
    p3: THREE.Vector3, p4: THREE.Vector3
  ): number {
    const p13 = new THREE.Vector3().subVectors(p1, p3);
    const p43 = new THREE.Vector3().subVectors(p4, p3);

    if (p43.lengthSq() < 0.0001) return Infinity;

    const p21 = new THREE.Vector3().subVectors(p2, p1);

    if (p21.lengthSq() < 0.0001) return Infinity;

    const d1343 = p13.dot(p43);
    const d4321 = p43.dot(p21);
    const d1321 = p13.dot(p21);
    const d4343 = p43.dot(p43);
    const d2121 = p21.dot(p21);

    const denom = d2121 * d4343 - d4321 * d4321;

    if (Math.abs(denom) < 0.0001) {
      return this.pointToSegmentDistance(p1, p3, p4);
    }

    const numer = d1343 * d4321 - d1321 * d4343;

    const mua = Math.max(0, Math.min(1, numer / denom));
    const mub = Math.max(0, Math.min(1, (d1343 + d4321 * mua) / d4343));

    const pa = new THREE.Vector3().addVectors(p1, p21.multiplyScalar(mua));
    const pb = new THREE.Vector3().addVectors(p3, p43.multiplyScalar(mub));

    return pa.distanceTo(pb);
  }

  private pointToSegmentDistance(
    point: THREE.Vector3,
    segStart: THREE.Vector3,
    segEnd: THREE.Vector3
  ): number {
    const segVec = new THREE.Vector3().subVectors(segEnd, segStart);
    const pointVec = new THREE.Vector3().subVectors(point, segStart);
    const segLenSq = segVec.lengthSq();

    if (segLenSq < 0.0001) return point.distanceTo(segStart);

    let t = pointVec.dot(segVec) / segLenSq;
    t = Math.max(0, Math.min(1, t));

    const projection = new THREE.Vector3().addVectors(
      segStart,
      segVec.multiplyScalar(t)
    );

    return point.distanceTo(projection);
  }

  private pointNearSegment(
    point: THREE.Vector3,
    segStart: THREE.Vector3,
    segEnd: THREE.Vector3,
    radius: number
  ): boolean {
    return this.pointToSegmentDistance(point, segStart, segEnd) < radius;
  }

  public update(deltaTime: number): void {
    for (let i = this.laserSegments.length - 1; i >= 0; i--) {
      const seg = this.laserSegments[i];
      seg.life -= deltaTime;

      const material = seg.line.material as THREE.LineBasicMaterial;
      material.opacity = Math.max(0, (seg.life / 0.3) * 0.6);

      if (seg.life <= 0) {
        this.scene.remove(seg.line);
        seg.line.geometry.dispose();
        (seg.line.material as THREE.Material).dispose();
        this.laserSegments.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    const domElement = this.renderer.domElement;
    domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    domElement.removeEventListener('mouseleave', this.onMouseUp.bind(this));

    for (const seg of this.laserSegments) {
      this.scene.remove(seg.line);
      seg.line.geometry.dispose();
      (seg.line.material as THREE.Material).dispose();
    }
    this.laserSegments = [];
  }
}
