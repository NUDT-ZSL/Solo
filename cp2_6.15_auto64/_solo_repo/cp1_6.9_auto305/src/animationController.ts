import * as TWEEN from '@tweenjs/tween.js';
import { ClayModel } from './clayModel';

export interface AnimationState {
  breathePhase: number;
  breatheAmount: number;
  pulseAmount: number;
  isResetting: boolean;
}

export class AnimationController {
  private clayModel: ClayModel;
  private state: AnimationState;
  private breatheTween: TWEEN.Tween<{ phase: number }> | null = null;
  private pulseTween: TWEEN.Tween<{ amount: number }> | null = null;
  private resetTweenGroup: TWEEN.Tween<any>[] = [];
  private onResetComplete: (() => void) | null = null;

  constructor(clayModel: ClayModel) {
    this.clayModel = clayModel;
    this.state = {
      breathePhase: 0,
      breatheAmount: 0,
      pulseAmount: 0,
      isResetting: false
    };
  }

  getState(): AnimationState {
    return this.state;
  }

  startBreathe(): void {
    if (this.breatheTween) {
      this.breatheTween.stop();
    }

    const breatheData = { phase: this.state.breathePhase };
    const period = 2000;

    this.breatheTween = new TWEEN.Tween(breatheData)
      .to({ phase: breatheData.phase + Math.PI * 2 }, period)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        this.state.breathePhase = breatheData.phase;
      })
      .repeat(Infinity)
      .start();

    const amountData = { amount: this.state.breatheAmount };
    new TWEEN.Tween(amountData)
      .to({ amount: 0.3 }, 500)
      .easing(TWEEN.Easing.Sinusoidal.Out)
      .onUpdate(() => {
        this.state.breatheAmount = amountData.amount;
      })
      .start();
  }

  stopBreathe(): void {
    const amountData = { amount: this.state.breatheAmount };
    new TWEEN.Tween(amountData)
      .to({ amount: 0 }, 500)
      .easing(TWEEN.Easing.Sinusoidal.In)
      .onUpdate(() => {
        this.state.breatheAmount = amountData.amount;
      })
      .onComplete(() => {
        if (this.breatheTween) {
          this.breatheTween.stop();
          this.breatheTween = null;
        }
      })
      .start();
  }

  triggerPulse(): void {
    if (this.state.isResetting) return;

    if (this.pulseTween) {
      this.pulseTween.stop();
    }

    const pulseData = { amount: 0 };
    this.pulseTween = new TWEEN.Tween(pulseData)
      .to({ amount: 0.5 }, 100)
      .easing(TWEEN.Easing.Quadratic.Out)
      .yoyo(true)
      .repeat(1)
      .onUpdate(() => {
        this.state.pulseAmount = pulseData.amount;
      })
      .onComplete(() => {
        this.state.pulseAmount = 0;
      })
      .start();
  }

  triggerReset(onComplete?: () => void): void {
    if (this.state.isResetting) return;

    this.state.isResetting = true;
    this.onResetComplete = onComplete || null;

    this.stopBreathe();

    const vertexCount = this.clayModel.getVertexCount();
    const vertexData = this.clayModel.getVertexData();
    const batchSize = 500;

    for (let batchStart = 0; batchStart < vertexCount; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, vertexCount);
      const offsets: number[] = [];
      const indices: number[] = [];

      for (let i = batchStart; i < batchEnd; i++) {
        offsets.push(vertexData[i].targetOffset);
        indices.push(i);
      }

      const resetData = { t: 0 };
      const initialOffsets = [...offsets];

      const tween = new TWEEN.Tween(resetData)
        .to({ t: 1 }, 500)
        .delay((batchStart / batchSize) * 10)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          for (let j = 0; j < indices.length; j++) {
            const vi = indices[j];
            const eased = 1 - resetData.t;
            vertexData[vi].targetOffset = initialOffsets[j] * eased;
            vertexData[vi].currentOffset = initialOffsets[j] * eased;
          }
        })
        .start();

      this.resetTweenGroup.push(tween);
    }

    const finalData = { t: 0 };
    new TWEEN.Tween(finalData)
      .to({ t: 1 }, 500)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        this.clayModel.resetToInitial();
        this.state.isResetting = false;
        this.resetTweenGroup = [];
        if (this.onResetComplete) {
          this.onResetComplete();
          this.onResetComplete = null;
        }
      })
      .start();
  }

  createCameraTween(
    target: { value: number },
    toValue: number,
    duration: number = 300,
    easing: (amount: number) => number = TWEEN.Easing.Quadratic.Out
  ): TWEEN.Tween<{ value: number }> {
    return new TWEEN.Tween(target)
      .to({ value: toValue }, duration)
      .easing(easing);
  }

  update(deltaTime: number): void {
    TWEEN.update();
  }

  isResetting(): boolean {
    return this.state.isResetting;
  }

  dispose(): void {
    if (this.breatheTween) {
      this.breatheTween.stop();
      this.breatheTween = null;
    }
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    this.resetTweenGroup.forEach(t => t.stop());
    this.resetTweenGroup = [];
  }
}
