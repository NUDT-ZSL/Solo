import * as THREE from 'three';
import type { VoxelGrid } from '@voxel/VoxelGrid';
import type { CutPlaneState } from '@/types';
import { eventBus } from '@/utils/EventBus';

interface PlaneInfo {
  state: CutPlaneState;
  mesh: THREE.Mesh;
  guideLine: THREE.Line;
}

export class CutPlaneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public voxelGrid: VoxelGrid | null = null;

  private planes: Map<'x' | 'y' | 'z', PlaneInfo> = new Map();
  private isDragging: boolean = false;
  private dragAxis: 'x' | 'y' | 'z' | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private dragStartPos: number = 0;
  private dragStartValue: number = 0;
  private animationFrame: number | null = null;
  private pendingPositions: Map<'x' | 'y' | 'z', { target: number; current: number }> = new Map();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.initPlane('x');
    this.initPlane('y');
    this.initPlane('z');

    this.bindEvents();
  }

  public setVoxelGrid(grid: VoxelGrid): void {
    this.voxelGrid = grid;
    this.updatePlaneMeshes();
  }

  public setPlaneEnabled(axis: 'x' | 'y' | 'z', enabled: boolean): void {
    const plane = this.planes.get(axis);
    if (!plane) return;
    plane.state.enabled = enabled;
    plane.mesh.visible = enabled;
    plane.guideLine.visible = false;
    this.applyAndNotify();
  }

  public setPlanePosition(axis: 'x' | 'y' | 'z', position: number, animate: boolean = true): void {
    const plane = this.planes.get(axis);
    if (!plane) return;
    const clamped = Math.max(0, Math.min(1, position));

    if (animate) {
      this.pendingPositions.set(axis, { target: clamped, current: plane.state.position });
      this.startAnimation();
    } else {
      plane.state.position = clamped;
      this.updatePlaneMeshes();
      this.applyAndNotify();
    }
  }

  public getStates(): CutPlaneState[] {
    return Array.from(this.planes.values()).map(p => p.state);
  }

  public dispose(): void {
    this.unbindEvents();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    for (const plane of this.planes.values()) {
      this.scene.remove(plane.mesh);
      this.scene.remove(plane.guideLine);
      plane.mesh.geometry.dispose();
      (plane.mesh.material as THREE.Material).dispose();
      plane.guideLine.geometry.dispose();
      (plane.guideLine.material as THREE.Material).dispose();
    }
    this.planes.clear();
  }

  private initPlane(axis: 'x' | 'y' | 'z'): void {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: axis === 'x' ? 0xff8c42 : axis === 'y' ? 0x4aff8c : 0x4a9eff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    this.scene.add(mesh);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3()
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.8 });
    const guideLine = new THREE.Line(lineGeo, lineMat);
    guideLine.visible = false;
    this.scene.add(guideLine);

    this.planes.set(axis, {
      state: { enabled: false, position: 0.5, axis },
      mesh,
      guideLine
    });
  }

  private updatePlaneMeshes(): void {
    if (!this.voxelGrid) return;
    const bb = this.voxelGrid.boundingBox;
    const sizeX = bb.maxX - bb.minX;
    const sizeY = bb.maxY - bb.minY;
    const sizeZ = bb.maxZ - bb.minZ;
    const maxDim = Math.max(sizeX, sizeY, sizeZ) * 1.05;

    for (const [axis, plane] of this.planes) {
      const t = plane.state.position;
      const { mesh } = plane;

      if (axis === 'x') {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.PlaneGeometry(maxDim, maxDim);
        mesh.position.set(bb.minX + t * sizeX, (bb.minY + bb.maxY) / 2, (bb.minZ + bb.maxZ) / 2);
        mesh.rotation.y = Math.PI / 2;
      } else if (axis === 'y') {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.PlaneGeometry(maxDim, maxDim);
        mesh.position.set((bb.minX + bb.maxX) / 2, bb.minY + t * sizeY, (bb.minZ + bb.maxZ) / 2);
        mesh.rotation.x = Math.PI / 2;
      } else {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.PlaneGeometry(maxDim, maxDim);
        mesh.position.set((bb.minX + bb.maxX) / 2, (bb.minY + bb.maxY) / 2, bb.minZ + t * sizeZ);
      }
    }
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  private unbindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerUp);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.voxelGrid) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    for (const [axis, plane] of this.planes) {
      if (!plane.state.enabled) continue;
      const hits = this.raycaster.intersectObject(plane.mesh);
      if (hits.length > 0) {
        this.isDragging = true;
        this.dragAxis = axis;
        this.dragStartPos = this.getDragCoord(e, axis);
        this.dragStartValue = plane.state.position;
        plane.guideLine.visible = true;
        this.renderer.domElement.style.cursor = 'move';
        e.preventDefault();
        return;
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.voxelGrid) {
      this.renderer.domElement.style.cursor = 'default';
      return;
    }

    if (this.isDragging && this.dragAxis) {
      const plane = this.planes.get(this.dragAxis);
      if (!plane) return;

      const current = this.getDragCoord(e, this.dragAxis);
      const delta = current - this.dragStartPos;
      const bb = this.voxelGrid.boundingBox;
      const size = this.dragAxis === 'x' ? bb.maxX - bb.minX :
                   this.dragAxis === 'y' ? bb.maxY - bb.minY :
                   bb.maxZ - bb.minZ;
      const tDelta = -delta / size;
      const newPos = Math.max(0, Math.min(1, this.dragStartValue + tDelta));
      plane.state.position = newPos;
      this.updatePlaneMeshes();
      this.updateGuideLine(e);
      this.applyAndNotify();
    } else {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      let hover = false;
      for (const [, plane] of this.planes) {
        if (!plane.state.enabled) continue;
        const hits = this.raycaster.intersectObject(plane.mesh);
        if (hits.length > 0) {
          hover = true;
          break;
        }
      }
      this.renderer.domElement.style.cursor = hover ? 'move' : 'default';
    }
  };

  private onPointerUp = (): void => {
    if (this.isDragging && this.dragAxis) {
      const plane = this.planes.get(this.dragAxis);
      if (plane) plane.guideLine.visible = false;
    }
    this.isDragging = false;
    this.dragAxis = null;
    this.renderer.domElement.style.cursor = 'default';
  };

  private getDragCoord(e: PointerEvent, axis: 'x' | 'y' | 'z'): number {
    const vector = new THREE.Vector3(this.pointer.x, this.pointer.y, 0.5);
    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
    if (axis === 'x') return pos.x;
    if (axis === 'y') return pos.y;
    return pos.z;
  }

  private updateGuideLine(e: PointerEvent): void {
    if (!this.dragAxis) return;
    const plane = this.planes.get(this.dragAxis);
    if (!plane || !this.voxelGrid) return;

    const bb = this.voxelGrid.boundingBox;
    const t = plane.state.position;
    let start = new THREE.Vector3();
    let end = new THREE.Vector3();

    if (this.dragAxis === 'x') {
      const x = bb.minX + t * (bb.maxX - bb.minX);
      start.set(x, bb.minY, bb.minZ);
      end.set(x, bb.maxY, bb.maxZ);
    } else if (this.dragAxis === 'y') {
      const y = bb.minY + t * (bb.maxY - bb.minY);
      start.set(bb.minX, y, bb.minZ);
      end.set(bb.maxX, y, bb.maxZ);
    } else {
      const z = bb.minZ + t * (bb.maxZ - bb.minZ);
      start.set(bb.minX, bb.minY, z);
      end.set(bb.maxX, bb.maxY, z);
    }

    const positions = new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]);
    plane.guideLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    plane.guideLine.geometry.attributes.position.needsUpdate = true;
  }

  private applyAndNotify(): void {
    if (this.voxelGrid) {
      this.voxelGrid.applyCutPlanes(this.getStates());
    }
    eventBus.emit('cutplane:changed', this.getStates());
  }

  private startAnimation(): void {
    if (this.animationFrame !== null) return;

    const animate = () => {
      let needsUpdate = false;
      for (const [axis, pending] of this.pendingPositions) {
        const diff = pending.target - pending.current;
        if (Math.abs(diff) < 0.001) {
          pending.current = pending.target;
          this.pendingPositions.delete(axis);
        } else {
          pending.current += diff * 0.15;
          needsUpdate = true;
        }
        const plane = this.planes.get(axis);
        if (plane) {
          plane.state.position = pending.current;
        }
      }

      if (needsUpdate || this.pendingPositions.size > 0) {
        this.updatePlaneMeshes();
        this.applyAndNotify();
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
      }
    };
    animate();
  }
}
