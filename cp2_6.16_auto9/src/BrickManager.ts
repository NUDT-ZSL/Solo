declare const THREE: any;
import { BrickType, BrickData, UndoAction, MAX_BRICKS, MAX_UNDO_STEPS } from './types';
import { BrickFactory, BrickMeshData } from './BrickFactory';

export interface BrickManagerCallbacks {
  onBrickCountChange: (count: number, max: number, threshold: number) => void;
  onUndoStackChange: (canUndo: boolean) => void;
  onBrickPlaced: (mesh: any) => void;
  onBrickRemoved: (id: string) => void;
  onCollision: (position: any) => void;
  onAllCleared: () => void;
}

export class BrickManager {
  private scene: any;
  private factory: BrickFactory;
  private callbacks: BrickManagerCallbacks;

  private placedBricks: Map<string, BrickMeshData> = new Map();
  private undoStack: UndoAction[] = [];
  private idCounter = 0;
  private animationHandlers: Set<() => void> = new Set();

  private static readonly EPSILON = 0.001;

  constructor(scene: any, factory: BrickFactory, callbacks: BrickManagerCallbacks) {
    this.scene = scene;
    this.factory = factory;
    this.callbacks = callbacks;
  }

  getBrickCount(): number {
    return this.placedBricks.size;
  }

  getPlacedMeshes(): any[] {
    return Array.from(this.placedBricks.values()).map(b => b.mesh);
  }

  generateId(): string {
    this.idCounter++;
    return `brick_${this.idCounter}_${Date.now()}`;
  }

  checkCollision(type: BrickType, position: any, excludeId?: string): boolean {
    const localBox = this.factory.getLocalBoundingBox(type);
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(position.x, position.y, position.z);
    const newBox = localBox.clone().applyMatrix4(matrix);

    for (const [id, brickData] of this.placedBricks) {
      if (id === excludeId) continue;
      const existingBox = this.factory.getBoundingBoxWorld(brickData.mesh);
      if (this.intersects(newBox, existingBox)) {
        return true;
      }
    }
    return false;
  }

  private intersects(boxA: any, boxB: any): boolean {
    return (
      boxA.min.x < boxB.max.x - BrickManager.EPSILON &&
      boxA.max.x > boxB.min.x + BrickManager.EPSILON &&
      boxA.min.y < boxB.max.y - BrickManager.EPSILON &&
      boxA.max.y > boxB.min.y + BrickManager.EPSILON &&
      boxA.min.z < boxB.max.z - BrickManager.EPSILON &&
      boxA.max.z > boxB.min.z + BrickManager.EPSILON
    );
  }

  addBrick(type: BrickType, position: any): { success: boolean; mesh?: any; id?: string } {
    if (this.placedBricks.size >= MAX_BRICKS) {
      return { success: false };
    }

    if (this.checkCollision(type, position)) {
      this.callbacks.onCollision(position.clone());
      return { success: false };
    }

    const { mesh, boundingBox } = this.factory.createBrick(type);
    mesh.position.copy(position);
    mesh.updateMatrixWorld(true);

    const id = this.generateId();
    mesh.userData.brickId = id;
    mesh.userData.brickType = type;
    mesh.userData.baseBoundingBox = boundingBox.clone();

    this.scene.add(mesh);
    this.placedBricks.set(id, { mesh, boundingBox, type });

    const brickData: BrickData = {
      id,
      type,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z }
    };

    this.pushUndo({ type: 'add', brickData });
    this.notifyCountChange();
    this.callbacks.onBrickPlaced(mesh);

    return { success: true, mesh, id };
  }

  removeBrick(id: string, animate = true): boolean {
    const brickData = this.placedBricks.get(id);
    if (!brickData) return false;

    const { mesh } = brickData;
    const brickDataRecord: BrickData = {
      id,
      type: brickData.type,
      position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z }
    };

    this.placedBricks.delete(id);

    if (animate) {
      this.animateFlyAway(mesh, () => {
        this.scene.remove(mesh);
        this.disposeMesh(mesh);
      });
    } else {
      this.scene.remove(mesh);
      this.disposeMesh(mesh);
    }

    this.pushUndo({ type: 'remove', brickData: brickDataRecord });
    this.notifyCountChange();
    this.callbacks.onBrickRemoved(id);

    return true;
  }

  private animateFlyAway(mesh: any, onComplete: () => void): void {
    const startPos = mesh.position.clone();
    const endPos = new THREE.Vector3(-15, 8, 0);
    const duration = 150;
    const startTime = performance.now();
    const startScale = mesh.scale.clone();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t * (2 - t);

      mesh.position.lerpVectors(startPos, endPos, ease);
      const scale = 1 - ease;
      mesh.scale.set(startScale.x * scale, startScale.y * scale, startScale.z * scale);
      if (mesh.material) {
        mesh.material.transparent = true;
        mesh.material.opacity = 1 - ease;
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        if (this.animationHandlers.has(animate)) {
          this.animationHandlers.delete(animate);
        }
        onComplete();
      }
    };

    this.animationHandlers.add(animate);
    requestAnimationFrame(animate);
  }

  animateBounce(position: any): void {
    const duration = 200;
    const startTime = performance.now();
    const startOffset = new THREE.Vector3(0, 0.3, 0);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = Math.sin(t * Math.PI);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        if (this.animationHandlers.has(animate)) {
          this.animationHandlers.delete(animate);
        }
      }
    };

    this.animationHandlers.add(animate);
    requestAnimationFrame(animate);
  }

  animatePlaceIn(mesh: any): void {
    const originalScale = mesh.scale.clone();
    mesh.scale.set(0.01, 0.01, 0.01);
    const duration = 150;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      mesh.scale.set(
        originalScale.x * (0.01 + 0.99 * ease),
        originalScale.y * (0.01 + 0.99 * ease),
        originalScale.z * (0.01 + 0.99 * ease)
      );

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        mesh.scale.copy(originalScale);
        if (this.animationHandlers.has(animate)) {
          this.animationHandlers.delete(animate);
        }
      }
    };

    this.animationHandlers.add(animate);
    requestAnimationFrame(animate);
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    const action = this.undoStack.pop()!;
    this.notifyUndoChange();

    if (action.type === 'add') {
      const { id } = action.brickData;
      const brickData = this.placedBricks.get(id);
      if (brickData) {
        this.placedBricks.delete(id);
        const { mesh } = brickData;
        this.animateFlyAway(mesh, () => {
          this.scene.remove(mesh);
          this.disposeMesh(mesh);
        });
        this.notifyCountChange();
        this.callbacks.onBrickRemoved(id);
      }
    } else if (action.type === 'remove') {
      const { brickData } = action;
      const { mesh, boundingBox, type } = this.factory.createBrick(brickData.type);
      mesh.position.set(brickData.position.x, brickData.position.y, brickData.position.z);
      mesh.rotation.set(brickData.rotation.x, brickData.rotation.y, brickData.rotation.z);
      mesh.userData.brickId = brickData.id;
      mesh.userData.brickType = type;
      mesh.userData.baseBoundingBox = boundingBox.clone();
      mesh.updateMatrixWorld(true);

      this.scene.add(mesh);
      this.placedBricks.set(brickData.id, { mesh, boundingBox, type });
      this.animatePlaceIn(mesh);
      this.notifyCountChange();
      this.callbacks.onBrickPlaced(mesh);
    }

    return true;
  }

  clearAll(animate = true): void {
    const brickIds = Array.from(this.placedBricks.keys());
    const total = brickIds.length;

    if (total === 0) {
      this.callbacks.onAllCleared();
      return;
    }

    let completed = 0;

    brickIds.forEach((id, index) => {
      const brickData = this.placedBricks.get(id);
      if (!brickData) return;

      this.placedBricks.delete(id);
      const { mesh } = brickData;

      const delay = animate ? index * 20 : 0;

      setTimeout(() => {
        if (animate) {
          this.animateFlyAway(mesh, () => {
            this.scene.remove(mesh);
            this.disposeMesh(mesh);
            completed++;
            if (completed === total) {
              this.undoStack = [];
              this.notifyCountChange();
              this.notifyUndoChange();
              this.callbacks.onAllCleared();
            }
          });
        } else {
          this.scene.remove(mesh);
          this.disposeMesh(mesh);
          completed++;
          if (completed === total) {
            this.undoStack = [];
            this.notifyCountChange();
            this.notifyUndoChange();
            this.callbacks.onAllCleared();
          }
        }
      }, delay);
    });

    this.notifyCountChange();
  }

  private pushUndo(action: UndoAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
    this.notifyUndoChange();
  }

  private notifyCountChange(): void {
    this.callbacks.onBrickCountChange(this.placedBricks.size, MAX_BRICKS, 120);
  }

  private notifyUndoChange(): void {
    this.callbacks.onUndoStackChange(this.undoStack.length > 0);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  getBrickById(id: string): any | null {
    const brickData = this.placedBricks.get(id);
    return brickData ? brickData.mesh : null;
  }

  private disposeMesh(mesh: any): void {
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m: any) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }
}
