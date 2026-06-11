export interface BeatEvent {
  time: number;
  beatNumber: number;
  totalBeats: number;
  isDownbeat: boolean;
}

export type BeatCallback = (event: BeatEvent) => void;

export type TimeSignature = '2/4' | '3/4' | '4/4';

export class Metronome {
  private audioContext: AudioContext | null = null;
  private bpm: number = 100;
  private timeSignature: TimeSignature = '4/4';
  private beatCallback: BeatCallback | null = null;
  private isRunning: boolean = false;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private schedulerTimer: number | null = null;
  private lookahead: number = 25.0;
  private scheduleAheadTime: number = 0.1;
  private startTime: number = 0;

  constructor(audioContext?: AudioContext) {
    if (audioContext) {
      this.audioContext = audioContext;
    }
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(40, Math.min(200, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  setTimeSignature(sig: TimeSignature): void {
    this.timeSignature = sig;
  }

  getTimeSignature(): TimeSignature {
    return this.timeSignature;
  }

  private getBeatsPerMeasure(): number {
    return parseInt(this.timeSignature.split('/')[0]);
  }

  start(callback: BeatCallback): void {
    if (this.isRunning) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    this.beatCallback = callback;
    this.isRunning = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext.currentTime + 0.05;
    this.startTime = this.nextNoteTime;

    this.scheduler();
  }

  stop(): void {
    this.isRunning = false;
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.beatCallback = null;
  }

  private scheduler(): void {
    if (!this.isRunning || !this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat++;
    const beatsPerMeasure = this.getBeatsPerMeasure();
    if (this.currentBeat >= beatsPerMeasure) {
      this.currentBeat = 0;
    }
  }

  private scheduleNote(beatNumber: number, time: number): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    osc.frequency.value = beatNumber === 0 ? 1200 : 800;
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(envelope);
    envelope.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.05);

    const beatsPerMeasure = this.getBeatsPerMeasure();
    const elapsed = time - this.startTime;

    if (this.beatCallback) {
      this.beatCallback({
        time: elapsed,
        beatNumber,
        totalBeats: beatsPerMeasure,
        isDownbeat: beatNumber === 0
      });
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  destroy(): void {
    this.stop();
  }
}
