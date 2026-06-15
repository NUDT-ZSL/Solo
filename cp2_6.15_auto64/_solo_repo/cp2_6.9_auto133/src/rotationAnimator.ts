import * as THREE from 'three';
import { RubiksCube, Move, Axis } from './rubiksCube';

export type AnimationCallback = (progress: number) => void;
export type CompleteCallback = () => void;

export interface AnimationOptions {
  duration: number;
  onProgress?: AnimationCallback;
  onComplete?: CompleteCallback;
}

export interface PendingAnimation {
  move: Move;
  options: AnimationOptions;
}

export class RotationAnimator {
  private cube: RubiksCube;
  private isAnimating = false;
  private currentTime = 0;
  private currentDuration = 0;
  private currentMove: Move | null = null;
  private rotationGroup: THREE.Group | null = null;
  private onComplete: CompleteCallback | null = null;
  private onProgress: AnimationCallback | null = null;
  private pendingQueue: PendingAnimation[] = [];
  private speedMultiplier = 1;
  private baseRotationAngle = Math.PI / 2;

  constructor(cube: RubiksCube) {
    this.cube = cube;
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(5, speed));
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public getIsAnimating(): boolean {
    return this.isAnimating || this.pendingQueue.length > 0;
  }

  public enqueueMove(move: Move, options: Partial<AnimationOptions> = {}): void {
    const fullOptions: AnimationOptions = {
      duration: options.duration ?? 300,
      onProgress: options.onProgress,
      onComplete: options.onComplete
    };

    this.pendingQueue.push({ move, options: fullOptions });

    if (!this.isAnimating) {
      this.startNext();
    }
  }

  public enqueueMoves(moves: Move[], stepDelay: number = 400, baseDuration: number = 300,
    onStepComplete?: (index: number, move: Move) => void,
    onAllComplete?: () => void): void {
    moves.forEach((move, index) => {
      const delay = index * stepDelay;
      setTimeout(() => {
        this.enqueueMove(move, {
          duration: baseDuration,
          onComplete: () => {
            if (onStepComplete) onStepComplete(index, move);
            if (index === moves.length - 1 && onAllComplete) {
              setTimeout(() => onAllComplete(), 100);
            }
          }
        });
      }, delay);
    });
  }

  public immediateMove(move: Move): void {
    const angle = this.baseRotationAngle * move.direction;
    if (move.notation.includes('2')) {
      this.performImmediate(move.axis, move.layer, angle * 2);
    } else {
      this.performImmediate(move.axis, move.layer, angle);
    }
  }

  private performImmediate(axis: Axis, layer: number, angle: number): void {
    const group = this.cube.createRotationGroup(axis, layer);
    if (axis === 'x') group.rotation.x = angle;
    else if (axis === 'y') group.rotation.y = angle;
    else if (axis === 'z') group.rotation.z = angle;
    this.cube.finalizeRotation(axis, layer);
  }

  private startNext(): void {
    if (this.pendingQueue.length === 0) return;

    const pending = this.pendingQueue.shift()!;
    this.currentMove = pending.move;
    this.currentDuration = pending.options.duration / this.speedMultiplier;
    this.currentTime = 0;
    this.onProgress = pending.options.onProgress || null;
    this.onComplete = pending.options.onComplete || null;

    this.rotationGroup = this.cube.createRotationGroup(this.currentMove.axis, this.currentMove.layer);
    this.isAnimating = true;
  }

  public update(deltaTime: number): void {
    if (!this.isAnimating || !this.currentMove || !this.rotationGroup) return;

    this.currentTime += deltaTime * 1000;
    const rawProgress = Math.min(this.currentTime / this.currentDuration, 1);
    const easedProgress = this.easeInOutCubic(rawProgress);

    const isDouble = this.currentMove.notation.includes('2');
    const totalAngle = this.baseRotationAngle * this.currentMove.direction * (isDouble ? 2 : 1);

    if (this.currentMove.axis === 'x') {
      this.rotationGroup.rotation.x = totalAngle * easedProgress;
    } else if (this.currentMove.axis === 'y') {
      this.rotationGroup.rotation.y = totalAngle * easedProgress;
    } else if (this.currentMove.axis === 'z') {
      this.rotationGroup.rotation.z = totalAngle * easedProgress;
    }

    if (this.onProgress) {
      this.onProgress(easedProgress);
    }

    if (rawProgress >= 1) {
      this.finishCurrent();
    }
  }

  private finishCurrent(): void {
    if (!this.currentMove) return;

    const move = this.currentMove;
    this.cube.finalizeRotation(move.axis, move.layer);

    this.rotationGroup = null;
    this.currentMove = null;
    this.isAnimating = false;

    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }

    if (this.pendingQueue.length > 0) {
      this.startNext();
    }
  }

  public clearQueue(): void {
    this.pendingQueue = [];
  }

  public startDragRotation(axis: Axis, layer: number): THREE.Group {
    if (this.isAnimating) {
      this.clearQueue();
      if (this.rotationGroup && this.currentMove) {
        this.cube.finalizeRotation(this.currentMove.axis, this.currentMove.layer);
        this.rotationGroup = null;
        this.currentMove = null;
        this.isAnimating = false;
      }
    }
    return this.cube.createRotationGroup(axis, layer);
  }

  public updateDragRotation(group: THREE.Group, axis: Axis, angle: number): void {
    if (axis === 'x') group.rotation.x = angle;
    else if (axis === 'y') group.rotation.y = angle;
    else if (axis === 'z') group.rotation.z = angle;
  }

  public finishDragRotation(axis: Axis, layer: number): void {
    this.cube.finalizeRotation(axis, layer);
  }

  public snapToNearest90(group: THREE.Group, axis: Axis): { angle: number; snaps: number } {
    let currentAngle = 0;
    if (axis === 'x') currentAngle = group.rotation.x;
    else if (axis === 'y') currentAngle = group.rotation.y;
    else if (axis === 'z') currentAngle = group.rotation.z;

    const snap = Math.PI / 2;
    const snaps = Math.round(currentAngle / snap);
    const snappedAngle = snaps * snap;

    if (axis === 'x') group.rotation.x = snappedAngle;
    else if (axis === 'y') group.rotation.y = snappedAngle;
    else if (axis === 'z') group.rotation.z = snappedAngle;

    return { angle: snappedAngle, snaps };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
