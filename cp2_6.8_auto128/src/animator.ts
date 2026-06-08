import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { Cube3D, Face, RotationStep } from './cube';

export interface AnimationRecord {
  step: RotationStep;
  timestamp: number;
  duration: number;
}

export type AnimatorStatus = 'idle' | 'playing' | 'paused';

type StepCallback = (index: number, step: RotationStep) => void;
type CompleteCallback = () => void;

export class CubeAnimator {
  private cube: Cube3D;
  private isAnimating: boolean = false;
  private pivot: THREE.Group | null = null;
  public records: AnimationRecord[] = [];
  public status: AnimatorStatus = 'idle';

  public onStepStart?: StepCallback;
  public onStepComplete?: StepCallback;
  public onComplete?: CompleteCallback;

  constructor(cube: Cube3D) {
    this.cube = cube;
  }

  public isBusy(): boolean {
    return this.isAnimating;
  }

  public animateStep(step: RotationStep, duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAnimating) {
        resolve();
        return;
      }
      this.isAnimating = true;
      const startTime = performance.now();

      const layerCubies = this.cube.getLayerCubies(step.face);
      const axis = this.cube.getAxisForFace(step.face);
      const targetAngle = this.cube.getAngleForStep(step);

      const pivot = new THREE.Group();
      this.pivot = pivot;
      this.cube.group.add(pivot);

      layerCubies.forEach(cubie => {
        pivot.attach(cubie.mesh);
      });

      const animState = { angle: 0 };
      new TWEEN.Tween(animState)
        .to({ angle: targetAngle }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          if (axis === 'x') pivot.rotation.x = animState.angle;
          else if (axis === 'y') pivot.rotation.y = animState.angle;
          else pivot.rotation.z = animState.angle;
        })
        .onComplete(() => {
          layerCubies.forEach(cubie => {
            this.cube.group.attach(cubie.mesh);
          });
          this.cube.snapCubiePositions();
          this.cube.group.remove(pivot);
          this.pivot = null;
          this.isAnimating = false;

          this.records.push({
            step,
            timestamp: startTime,
            duration,
          });

          resolve();
        })
        .start();
    });
  }

  public async playSequence(
    steps: RotationStep[],
    duration: number = 500,
    gap: number = 0,
    startIndex: number = 0
  ): Promise<void> {
    if (steps.length === 0) return;
    this.status = 'playing';
    for (let i = startIndex; i < steps.length; i++) {
      if (this.status === 'paused') {
        while (this.status === 'paused') {
          await new Promise(r => setTimeout(r, 50));
        }
      }
      if (this.status !== 'playing') break;
      this.onStepStart?.(i, steps[i]);
      await this.animateStep(steps[i], duration);
      this.onStepComplete?.(i, steps[i]);
      if (i < steps.length - 1 && gap > 0) {
        await new Promise(r => setTimeout(r, gap));
      }
    }
    if (this.status === 'playing') {
      this.status = 'idle';
      this.onComplete?.();
    }
  }

  public pause() {
    this.status = 'paused';
  }

  public resume() {
    this.status = 'playing';
  }

  public stop() {
    this.status = 'idle';
  }

  public clearRecords() {
    this.records = [];
  }

  public update(deltaTime: number) {
    TWEEN.update();
  }
}
