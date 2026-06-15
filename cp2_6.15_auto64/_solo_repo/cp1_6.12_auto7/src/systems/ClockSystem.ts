import { TimePhase, TimeState } from '../types.js';

interface PhaseConfig {
  phase: TimePhase;
  duration: number;
  lightStart: number;
  lightEnd: number;
  timeStart: string;
  timeEnd: string;
}

const PHASE_CONFIG: PhaseConfig[] = [
  { phase: TimePhase.DAWN, duration: 10, lightStart: 0.3, lightEnd: 1.0, timeStart: '06:00:00', timeEnd: '12:00:00' },
  { phase: TimePhase.NOON, duration: 20, lightStart: 1.0, lightEnd: 0.9, timeStart: '12:00:00', timeEnd: '18:00:00' },
  { phase: TimePhase.DUSK, duration: 15, lightStart: 0.9, lightEnd: 0.3, timeStart: '18:00:00', timeEnd: '21:00:00' },
  { phase: TimePhase.NIGHT, duration: 15, lightStart: 0.3, lightEnd: 0.3, timeStart: '21:00:00', timeEnd: '06:00:00' },
];

export class ClockSystem {
  private elapsed: number = 0;
  private currentPhaseIndex: number = 0;
  private phaseElapsed: number = 0;
  private cachedState: TimeState;

  constructor() {
    this.cachedState = this.buildState();
  }

  public update(deltaTime: number): void {
    this.elapsed += deltaTime;
    this.phaseElapsed += deltaTime;

    const currentConfig = PHASE_CONFIG[this.currentPhaseIndex];
    if (this.phaseElapsed >= currentConfig.duration) {
      this.phaseElapsed -= currentConfig.duration;
      this.currentPhaseIndex = (this.currentPhaseIndex + 1) % PHASE_CONFIG.length;
    }

    this.cachedState = this.buildState();
  }

  public getTimeState(): TimeState {
    return this.cachedState;
  }

  private buildState(): TimeState {
    const config = PHASE_CONFIG[this.currentPhaseIndex];
    const phaseProgress = this.phaseElapsed / config.duration;
    const lightIntensity = config.lightStart + (config.lightEnd - config.lightStart) * phaseProgress;

    return {
      phase: config.phase,
      phaseProgress,
      lightIntensity,
      totalSeconds: this.elapsed,
      formattedTime: this.formatTime(config, phaseProgress),
    };
  }

  private formatTime(config: PhaseConfig, progress: number): string {
    const parseSeconds = (hms: string): number => {
      const [h, m, s] = hms.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };

    let startSec = parseSeconds(config.timeStart);
    let endSec = parseSeconds(config.timeEnd);

    if (endSec < startSec) {
      endSec += 24 * 3600;
    }

    let currentSec = Math.floor(startSec + (endSec - startSec) * progress);
    currentSec = currentSec % (24 * 3600);

    const h = Math.floor(currentSec / 3600);
    const m = Math.floor((currentSec % 3600) / 60);
    const s = currentSec % 60;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
