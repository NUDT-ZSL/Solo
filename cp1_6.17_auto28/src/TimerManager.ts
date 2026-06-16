export type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

export interface TimerState {
  id: string;
  totalSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  onExpire?: () => void;
  onTick?: (remaining: number) => void;
}

export class TimerManager {
  private timers: Map<string, TimerState> = new Map();
  private intervals: Map<string, number> = new Map();
  private lastTickTime: Map<string, number> = new Map();

  createTimer(
    id: string,
    totalSeconds: number,
    onExpire?: () => void,
    onTick?: (remaining: number) => void
  ): TimerState {
    const timer: TimerState = {
      id,
      totalSeconds,
      remainingSeconds: totalSeconds,
      status: 'idle',
      onExpire,
      onTick,
    };
    this.timers.set(id, timer);
    return { ...timer };
  }

  startTimer(id: string): TimerState | null {
    const timer = this.timers.get(id);
    if (!timer) return null;

    if (timer.status === 'running') return { ...timer };

    if (timer.status === 'expired') {
      timer.remainingSeconds = timer.totalSeconds;
    }

    timer.status = 'running';
    this.lastTickTime.set(id, Date.now());

    const intervalId = window.setInterval(() => {
      this.tick(id);
    }, 100);

    this.intervals.set(id, intervalId);

    return { ...timer };
  }

  private tick(id: string): void {
    const timer = this.timers.get(id);
    if (!timer || timer.status !== 'running') return;

    const now = Date.now();
    const lastTick = this.lastTickTime.get(id) || now;
    const elapsedMs = now - lastTick;

    if (elapsedMs >= 100) {
      const elapsedSeconds = elapsedMs / 1000;
      timer.remainingSeconds = Math.max(0, timer.remainingSeconds - elapsedSeconds);
      this.lastTickTime.set(id, now);

      if (timer.onTick) {
        timer.onTick(timer.remainingSeconds);
      }

      if (timer.remainingSeconds <= 0) {
        this.expireTimer(id);
      }
    }
  }

  private expireTimer(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) return;

    timer.remainingSeconds = 0;
    timer.status = 'expired';

    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }

    this.lastTickTime.delete(id);

    if (timer.onExpire) {
      timer.onExpire();
    }
  }

  pauseTimer(id: string): TimerState | null {
    const timer = this.timers.get(id);
    if (!timer) return null;

    if (timer.status !== 'running') return { ...timer };

    timer.status = 'paused';

    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }

    this.lastTickTime.delete(id);

    return { ...timer };
  }

  resetTimer(id: string): TimerState | null {
    const timer = this.timers.get(id);
    if (!timer) return null;

    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }

    this.lastTickTime.delete(id);

    timer.remainingSeconds = timer.totalSeconds;
    timer.status = 'idle';

    return { ...timer };
  }

  getTimer(id: string): TimerState | null {
    const timer = this.timers.get(id);
    return timer ? { ...timer } : null;
  }

  getAllTimers(): TimerState[] {
    return Array.from(this.timers.values()).map(t => ({ ...t }));
  }

  destroyTimer(id: string): void {
    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }

    this.lastTickTime.delete(id);
    this.timers.delete(id);
  }

  destroyAllTimers(): void {
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals.clear();
    this.lastTickTime.clear();
    this.timers.clear();
  }

  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const timerManager = new TimerManager();
