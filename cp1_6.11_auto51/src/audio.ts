import { NoteColor, NOTE_COLORS, BASE_NOTE_DURATION } from './config';

export type NotePlayedCallback = (color: NoteColor, index: number) => void;

export interface PlacedNote {
  color: NoteColor;
  x: number;
  y: number;
  id: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentTimeouts: number[] = [];
  private notes: PlacedNote[] = [];
  private speed: number = 1;
  private notePlayedCallback: NotePlayedCallback | null = null;
  private playCompleteCallback: (() => void) | null = null;
  private currentNoteIndex: number = -1;

  constructor() {}

  public init(): void {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
  }

  public setNotes(notes: PlacedNote[]): void {
    this.notes = notes;
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public onNotePlayed(callback: NotePlayedCallback): void {
    this.notePlayedCallback = callback;
  }

  public onPlayComplete(callback: () => void): void {
    this.playCompleteCallback = callback;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentNoteIndex(): number {
    return this.currentNoteIndex;
  }

  public playNote(color: NoteColor, noteDuration: number = BASE_NOTE_DURATION): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const noteConfig = NOTE_COLORS[color];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const duration = noteDuration / this.speed;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(noteConfig.frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  public startPlayback(): void {
    if (!this.audioContext) {
      this.init();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.notes.length === 0) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentNoteIndex = -1;
    this.scheduleNotes();
  }

  private scheduleNotes(): void {
    if (!this.isPlaying || this.notes.length === 0) return;

    const noteDuration = BASE_NOTE_DURATION / this.speed;
    const interval = noteDuration;

    let delay = 0;
    this.notes.forEach((note, index) => {
      const timeoutId = window.setTimeout(() => {
        if (!this.isPlaying) return;
        this.currentNoteIndex = index;
        this.playNote(note.color, BASE_NOTE_DURATION);
        if (this.notePlayedCallback) {
          this.notePlayedCallback(note.color, index);
        }
      }, delay);
      this.currentTimeouts.push(timeoutId);
      delay += interval * 1000;
    });

    const loopTimeoutId = window.setTimeout(() => {
      if (!this.isPlaying) return;
      if (this.playCompleteCallback) {
        this.playCompleteCallback();
      }
      this.scheduleNotes();
    }, delay);
    this.currentTimeouts.push(loopTimeoutId);
  }

  public stopPlayback(): void {
    this.isPlaying = false;
    this.currentNoteIndex = -1;
    this.currentTimeouts.forEach((id) => clearTimeout(id));
    this.currentTimeouts = [];
  }

  public destroy(): void {
    this.stopPlayback();
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
