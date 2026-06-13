export interface MeditationState {
  isActive: boolean;
  elapsedMs: number;
  breathPhase: number;
  remainingSeconds: number;
}

export class MeditationController {
  private state: MeditationState = {
    isActive: false,
    elapsedMs: 0,
    breathPhase: 0,
    remainingSeconds: 60,
  };

  private onExit: (() => void) | null = null;
  private static readonly DURATION_MS = 60000;
  private static readonly BREATH_PERIOD_MS = 4000;
  private static readonly BREATH_MIN_R = 50;
  private static readonly BREATH_MAX_R = 70;
  private static readonly BREATH_OPACITY = 0.6;

  enter(onExitCallback: () => void): void {
    if (this.state.isActive) return;
    this.state = {
      isActive: true,
      elapsedMs: 0,
      breathPhase: 0,
      remainingSeconds: 60,
    };
    this.onExit = onExitCallback;
  }

  exit(): MeditationState {
    const wasActive = this.state.isActive;
    this.state = {
      isActive: false,
      elapsedMs: 0,
      breathPhase: 0,
      remainingSeconds: 0,
    };
    this.onExit = null;
    return { ...this.state };
  }

  update(dt: number): MeditationState {
    if (!this.state.isActive) return this.state;

    this.state.elapsedMs += dt;
    this.state.breathPhase += (Math.PI * 2 / MeditationController.BREATH_PERIOD_MS) * dt;
    this.state.remainingSeconds = Math.max(0, Math.ceil((MeditationController.DURATION_MS - this.state.elapsedMs) / 1000));

    if (this.state.elapsedMs >= MeditationController.DURATION_MS) {
      const callback = this.onExit;
      this.exit();
      if (callback) callback();
      return { ...this.state };
    }

    return { ...this.state };
  }

  getState(): MeditationState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  getBreathCircleRadius(): number {
    const minR = MeditationController.BREATH_MIN_R;
    const maxR = MeditationController.BREATH_MAX_R;
    return minR + (maxR - minR) * (0.5 + 0.5 * Math.sin(this.state.breathPhase));
  }

  getBreathCircleOpacity(): number {
    return MeditationController.BREATH_OPACITY;
  }
}
