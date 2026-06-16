export interface GamepadEvent {
  timestamp: number;
  buttonName: string;
  isPressed: boolean;
}

export interface RecorderState {
  isRecording: boolean;
  isPlaying: boolean;
  events: GamepadEvent[];
}

export class GamepadRecorder {
  private events: GamepadEvent[] = [];
  private recording: boolean = false;
  private playing: boolean = false;
  private startTime: number = 0;
  private playbackTimeouts: number[] = [];

  startRecording(): void {
    this.events = [];
    this.recording = true;
    this.startTime = performance.now();
  }

  stopRecording(): void {
    this.recording = false;
  }

  recordEvent(event: Omit<GamepadEvent, 'timestamp'> & { timestamp?: number }): void {
    if (!this.recording) return;
    const timestamp = event.timestamp ?? performance.now();
    const relativeTimestamp = timestamp - this.startTime;
    this.events.push({
      timestamp: relativeTimestamp,
      buttonName: event.buttonName,
      isPressed: event.isPressed,
    });
  }

  playback(
    onEvent: (event: GamepadEvent) => void,
    onComplete: () => void
  ): void {
    if (this.events.length === 0 || this.playing) return;

    this.playing = true;
    this.playbackTimeouts = [];

    const scheduleNext = (index: number) => {
      if (index >= this.events.length || !this.playing) {
        this.playing = false;
        this.playbackTimeouts = [];
        onComplete();
        return;
      }

      const currentEvent = this.events[index];
      let delay: number;

      if (index === 0) {
        delay = currentEvent.timestamp;
      } else {
        const prevEvent = this.events[index - 1];
        delay = currentEvent.timestamp - prevEvent.timestamp;
      }

      const timeoutId = window.setTimeout(() => {
        if (!this.playing) return;
        onEvent(currentEvent);
        scheduleNext(index + 1);
      }, delay);

      this.playbackTimeouts.push(timeoutId);
    };

    scheduleNext(0);
  }

  stopPlayback(): void {
    this.playing = false;
    this.playbackTimeouts.forEach((id) => clearTimeout(id));
    this.playbackTimeouts = [];
  }

  isRecording(): boolean {
    return this.recording;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getEvents(): GamepadEvent[] {
    return [...this.events];
  }

  getEventCount(): number {
    return this.events.length;
  }

  getDuration(): number {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].timestamp;
  }

  clear(): void {
    this.events = [];
  }
}
