export interface PlayLog {
  time: number;
  string: number;
  hui: number;
}

type PlayCallback = (log: PlayLog, index: number) => void;
type ActiveIndexCallback = (index: number | null) => void;

export class PlayLogger {
  private logs: PlayLog[] = [];
  private startTime: number | null = null;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private playbackTimers: number[] = [];
  private speed: number = 1;

  private onPlay: PlayCallback | null = null;
  private onActiveIndexChange: ActiveIndexCallback | null = null;

  getLogs(): PlayLog[] {
    return [...this.logs];
  }

  get isRecordingActive(): boolean {
    return this.isRecording;
  }

  get isPlaybackActive(): boolean {
    return this.isPlaying;
  }

  setPlayCallback(cb: PlayCallback): void {
    this.onPlay = cb;
  }

  setActiveIndexCallback(cb: ActiveIndexCallback): void {
    this.onActiveIndexChange = cb;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(3, speed));
  }

  startRecording(): void {
    if (this.isPlaying) this.stopPlayback();
    this.isRecording = true;
    this.logs = [];
    this.startTime = performance.now();
  }

  stopRecording(): void {
    this.isRecording = false;
    this.startTime = null;
  }

  record(stringIdx: number, huiIdx: number): PlayLog | null {
    if (!this.isRecording || this.startTime === null) return null;

    const log: PlayLog = {
      time: Math.round(performance.now() - this.startTime),
      string: stringIdx,
      hui: huiIdx
    };
    this.logs.push(log);
    return log;
  }

  clear(): void {
    if (this.isPlaying) this.stopPlayback();
    this.stopRecording();
    this.logs = [];
  }

  startPlayback(): boolean {
    if (this.isPlaying || this.logs.length === 0) return false;
    this.isPlaying = true;

    const baseTime = this.logs[0].time;

    for (let i = 0; i < this.logs.length; i++) {
      const log = this.logs[i];
      const delay = (log.time - baseTime) / this.speed;

      const timerId = window.setTimeout(() => {
        if (this.onActiveIndexChange) this.onActiveIndexChange(i);
        if (this.onPlay) this.onPlay(log, i);
      }, delay);
      this.playbackTimers.push(timerId);
    }

    const totalDuration = (this.logs[this.logs.length - 1].time - baseTime) / this.speed;
    const endTimerId = window.setTimeout(() => {
      this.stopPlayback();
    }, totalDuration + 100);
    this.playbackTimers.push(endTimerId);

    return true;
  }

  stopPlayback(): void {
    for (const id of this.playbackTimers) {
      clearTimeout(id);
    }
    this.playbackTimers = [];
    this.isPlaying = false;
    if (this.onActiveIndexChange) this.onActiveIndexChange(null);
  }

  hasLogs(): boolean {
    return this.logs.length > 0;
  }

  formatLog(log: PlayLog): string {
    return `t=${log.time}ms 弦${log.string + 1} 徽${log.hui + 1}`;
  }
}
