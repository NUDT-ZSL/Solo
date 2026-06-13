import * as THREE from 'three';
import { GridController, Voxel } from './GridController';
import { ToolType } from './UIPanel';

export interface HitResult {
  voxelX: number;
  voxelY: number;
  voxelZ: number;
  faceNormal: THREE.Vector3;
  hit: boolean;
  hitType: 'voxel' | 'ground' | 'none';
}

export class ToolManager {
  private gridController: GridController;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private raycaster: THREE.Raycaster;
  private meshGroup: THREE.Group;
  private groundPlane: THREE.Plane;
  private gridSize: number;

  private currentTool: ToolType = 'single';
  private currentColor: string = '#ff3366';
  private brushSize: number = 1;
  private isDrawing: boolean = false;
  private lastPosKey: string = '';

  private onGridChanged: () => void;
  private onBrushHint: () => void;

  constructor(
    gridController: GridController,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    meshGroup: THREE.Group,
    callbacks: { onGridChanged: () => void; onBrushHint: () => void }
  ) {
    this.gridController = gridController;
    this.camera = camera;
    this.canvas = canvas;
    this.meshGroup = meshGroup;
    this.gridSize = gridController.size;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.onGridChanged = callbacks.onGridChanged;
    this.onBrushHint = callbacks.onBrushHint;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  public setTool(tool: ToolType): void {
    this.currentTool = tool;
  }

  public getTool(): ToolType {
    return this.currentTool;
  }

  public setColor(color: string): void {
    this.currentColor = color;
  }

  public getColor(): string {
    return this.currentColor;
  }

  public setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(5, size));
  }

  public getBrushSize(): number {
    return this.brushSize;
  }

  public isEraserMode(): boolean {
    return this.currentTool === 'eraser';
  }

  private onWheel(e: WheelEvent): void {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      this.brushSize = Math.max(1, Math.min(5, this.brushSize + delta));
      this.onBrushHint();
    }
  }

  private getMouseNDC(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  public raycastVoxel(clientX: number, clientY: number): HitResult {
    const ndc = this.getMouseNDC(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);

    const result: HitResult = {
      voxelX: 0,
      voxelY: 0,
      voxelZ: 0,
      faceNormal: new THREE.Vector3(0, 1, 0),
      hit: false,
      hitType: 'none'
    };

    const meshIntersects = this.raycaster.intersectObject(this.meshGroup, true);
    let meshDist = Infinity;

    if (meshIntersects.length > 0 && meshIntersects[0].face) {
      const hit = meshIntersects[0];
      meshDist = hit.distance;
      const p = hit.point.clone();
      const normal = hit.face.normal.clone();
      normal.transformDirection(hit.object.matrixWorld);

      const eps = 0.01;
      const vx = Math.floor(p.x - normal.x * eps);
      const vy = Math.floor(p.y - normal.y * eps);
      const vz = Math.floor(p.z - normal.z * eps);

      result.voxelX = vx;
      result.voxelY = vy;
      result.voxelZ = vz;
      result.faceNormal = normal;
      result.hit = true;
      result.hitType = 'voxel';
    }

    const groundPoint = new THREE.Vector3();
    const groundHit = this.raycaster.ray.intersectPlane(this.groundPlane, groundPoint);
    if (groundHit && groundPoint.y >= -0.01 && groundPoint.y <= 0.01) {
      const groundDist = this.raycaster.ray.origin.distanceTo(groundPoint);
      if (groundDist < meshDist) {
        const vx = Math.floor(groundPoint.x);
        const vy = 0;
        const vz = Math.floor(groundPoint.z);
        if (vx >= 0 && vx < this.gridSize && vz >= 0 && vz < this.gridSize) {
          result.voxelX = vx;
          result.voxelY = vy;
          result.voxelZ = vz;
          result.faceNormal = new THREE.Vector3(0, 1, 0);
          result.hit = true;
          result.hitType = 'ground';
        }
      }
    }

    return result;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    const hit = this.raycastVoxel(e.clientX, e.clientY);
    if (!hit.hit) return;

    this.isDrawing = true;
    this.lastPosKey = '';
    this.gridController.beginBatch();
    this.applyAtHit(hit);
    this.onGridChanged();
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.isDrawing) {
      this.gridController.endBatch();
      this.onGridChanged();
    }
    this.isDrawing = false;
    this.lastPosKey = '';
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;

    const hit = this.raycastVoxel(e.clientX, e.clientY);
    if (!hit.hit) return;

    const posKey = `${hit.voxelX},${hit.voxelY},${hit.voxelZ},${hit.faceNormal.x},${hit.faceNormal.y},${hit.faceNormal.z}`;
    if (posKey === this.lastPosKey) return;
    this.lastPosKey = posKey;

    this.applyAtHit(hit);
    this.onGridChanged();
  }

  private applyAtHit(hit: HitResult): void {
    if (this.currentTool === 'eraser') {
      if (hit.hitType === 'voxel') {
        this.eraseAt(hit);
      }
    } else {
      this.placeAt(hit);
    }
  }

  private placeAt(hit: HitResult): void {
    let px = hit.voxelX;
    let py = hit.voxelY;
    let pz = hit.voxelZ;

    if (hit.hitType === 'voxel') {
      const existing = this.gridController.getVoxel(hit.voxelX, hit.voxelY, hit.voxelZ);
      if (existing) {
        px = hit.voxelX + Math.round(hit.faceNormal.x);
        py = hit.voxelY + Math.round(hit.faceNormal.y);
        pz = hit.voxelZ + Math.round(hit.faceNormal.z);
      }
    }

    if (!this.gridController.inBounds(px, py, pz)) return;

    switch (this.currentTool) {
      case 'single':
      case 'eraser':
        this.gridController.setVoxel(px, py, pz, this.currentColor);
        break;
      case 'sphere':
        this.placeSphere(px, py, pz);
        break;
      case 'fill':
        this.placeFill(px, py, pz, hit.faceNormal);
        break;
    }
  }

  private placeSphere(cx: number, cy: number, cz: number): void {
    const r = this.brushSize;
    for (let x = cx - r; x <= cx + r; x++) {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let z = cz - r; z <= cz + r; z++) {
          const dx = x - cx + 0.5;
          const dy = y - cy + 0.5;
          const dz = z - cz + 0.5;
          if (dx * dx + dy * dy + dz * dz <= r * r) {
            this.gridController.setVoxel(x, y, z, this.currentColor);
          }
        }
      }
    }
  }

  private placeFill(cx: number, cy: number, cz: number, normal: THREE.Vector3): void {
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);
    const half = 2;

    if (absX >= absY && absX >= absZ) {
      for (let dy = -half; dy < half; dy++) {
        for (let dz = -half; dz < half; dz++) {
          this.gridController.setVoxel(cx, cy + dy, cz + dz, this.currentColor);
        }
      }
    } else if (absY >= absX && absY >= absZ) {
      for (let dx = -half; dx < half; dx++) {
        for (let dz = -half; dz < half; dz++) {
          this.gridController.setVoxel(cx + dx, cy, cz + dz, this.currentColor);
        }
      }
    } else {
      for (let dx = -half; dx < half; dx++) {
        for (let dy = -half; dy < half; dy++) {
          this.gridController.setVoxel(cx + dx, cy + dy, cz, this.currentColor);
        }
      }
    }
  }

  private eraseAt(hit: HitResult): void {
    switch (this.currentTool) {
      case 'eraser':
      case 'single':
      case 'fill':
        this.gridController.removeVoxel(hit.voxelX, hit.voxelY, hit.voxelZ);
        break;
      case 'sphere':
        this.eraseSphere(hit.voxelX, hit.voxelY, hit.voxelZ);
        break;
    }
  }

  private eraseSphere(cx: number, cy: number, cz: number): void {
    const r = this.brushSize;
    for (let x = cx - r; x <= cx + r; x++) {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let z = cz - r; z <= cz + r; z++) {
          const dx = x - cx + 0.5;
          const dy = y - cy + 0.5;
          const dz = z - cz + 0.5;
          if (dx * dx + dy * dy + dz * dz <= r * r) {
            this.gridController.removeVoxel(x, y, z);
          }
        }
      }
    }
  }

  public getBrushPreviewVoxels(hit: HitResult): Voxel[] {
    if (!hit.hit) return [];

    const result: Voxel[] = [];
    const isErase = this.currentTool === 'eraser';

    let px = hit.voxelX;
    let py = hit.voxelY;
    let pz = hit.voxelZ;

    if (!isErase && hit.hitType === 'voxel') {
      const existing = this.gridController.getVoxel(hit.voxelX, hit.voxelY, hit.voxelZ);
      if (existing) {
        px = hit.voxelX + Math.round(hit.faceNormal.x);
        py = hit.voxelY + Math.round(hit.faceNormal.y);
        pz = hit.voxelZ + Math.round(hit.faceNormal.z);
      }
    }

    if (isErase) {
      if (hit.hitType !== 'voxel') return [];
      if (this.currentTool === 'eraser' || this.currentTool === 'single' || this.currentTool === 'fill') {
        if (this.gridController.getVoxel(hit.voxelX, hit.voxelY, hit.voxelZ)) {
          result.push({ x: hit.voxelX, y: hit.voxelY, z: hit.voxelZ, color: '#ff4444' });
        }
      } else if (this.currentTool === 'sphere') {
        const r = this.brushSize;
        for (let x = hit.voxelX - r; x <= hit.voxelX + r; x++) {
          for (let y = hit.voxelY - r; y <= hit.voxelY + r; y++) {
            for (let z = hit.voxelZ - r; z <= hit.voxelZ + r; z++) {
              const dx = x - hit.voxelX + 0.5;
              const dy = y - hit.voxelY + 0.5;
              const dz = z - hit.voxelZ + 0.5;
              if (dx * dx + dy * dy + dz * dz <= r * r && this.gridController.getVoxel(x, y, z)) {
                result.push({ x, y, z, color: '#ff4444' });
              }
            }
          }
        }
      }
    } else {
      switch (this.currentTool) {
        case 'single':
          if (this.gridController.inBounds(px, py, pz)) {
            result.push({ x: px, y: py, z: pz, color: this.currentColor });
          }
          break;
        case 'sphere':
          const r = this.brushSize;
          for (let x = px - r; x <= px + r; x++) {
            for (let y = py - r; y <= py + r; y++) {
              for (let z = pz - r; z <= pz + r; z++) {
                const dx = x - px + 0.5;
                const dy = y - py + 0.5;
                const dz = z - pz + 0.5;
                if (dx * dx + dy * dy + dz * dz <= r * r) {
                  if (this.gridController.inBounds(x, y, z)) {
                    result.push({ x, y, z, color: this.currentColor });
                  }
                }
              }
            }
          }
          break;
        case 'fill':
          const absX = Math.abs(hit.faceNormal.x);
          const absY = Math.abs(hit.faceNormal.y);
          const absZ = Math.abs(hit.faceNormal.z);
          const half = 2;
          if (absX >= absY && absX >= absZ) {
            for (let dy = -half; dy < half; dy++) {
              for (let dz = -half; dz < half; dz++) {
                if (this.gridController.inBounds(px, py + dy, pz + dz)) {
                  result.push({ x: px, y: py + dy, z: pz + dz, color: this.currentColor });
                }
              }
            }
          } else if (absY >= absX && absY >= absZ) {
            for (let dx = -half; dx < half; dx++) {
              for (let dz = -half; dz < half; dz++) {
                if (this.gridController.inBounds(px + dx, py, pz + dz)) {
                  result.push({ x: px + dx, y: py, z: pz + dz, color: this.currentColor });
                }
              }
            }
          } else {
            for (let dx = -half; dx < half; dx++) {
              for (let dy = -half; dy < half; dy++) {
                if (this.gridController.inBounds(px + dx, py + dy, pz)) {
                  result.push({ x: px + dx, y: py + dy, z: pz, color: this.currentColor });
                }
              }
            }
          }
          break;
        case 'eraser':
          break;
      }
    }

    return result;
  }
}
