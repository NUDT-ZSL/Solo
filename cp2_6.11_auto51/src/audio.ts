import { AUDIO, NOTE_COLORS, NoteColor } from './config';

export type NotePlayCallback = (color: NoteColor) => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private onNotePlayCallbacks: NotePlayCallback[] = [];
  private scheduledTimeouts: number[] = [];

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = AUDIO.VOLUME;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public onNotePlay(callback: NotePlayCallback): void {
    this.onNotePlayCallbacks.push(callback);
  }

  private triggerNotePlayCallbacks(color: NoteColor): void {
    this.onNotePlayCallbacks.forEach((cb) => {
      try {
        cb(color);
      } catch (e) {
        console.error('Note play callback error:', e);
      }
    });
  }

  public playNote(color: NoteColor, speed: number = 1.0): void {
    const ctx = this.ensureContext();
    const cfg = NOTE_COLORS[color];
    const duration = AUDIO.BASE_NOTE_DURATION / speed;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = cfg.frequency;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1.0, now + AUDIO.ATTACK);
    gain.gain.linearRampToValueAtTime(0.0, now + duration + AUDIO.RELEASE);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start(now);
    osc.stop(now + duration + AUDIO.RELEASE + 0.05);

    this.triggerNotePlayCallbacks(color);
  }

  public scheduleSequence(
    colors: NoteColor[],
    speed: number,
    onIndexChange: (index: number) => void
  ): () => void {
    this.ensureContext();
    this.clearScheduled();

    if (colors.length === 0) return () => {};

    const noteDuration = (AUDIO.BASE_NOTE_DURATION + AUDIO.GAP_BETWEEN_NOTES) / speed;
    let cancelled = false;
    let currentIndex = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      if (currentIndex >= colors.length) {
        currentIndex = 0;
      }
      const color = colors[currentIndex];
      onIndexChange(currentIndex);
      this.playNote(color, speed);
      currentIndex++;
      const id = window.setTimeout(scheduleNext, noteDuration * 1000);
      this.scheduledTimeouts.push(id);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      this.clearScheduled();
    };
  }

  public clearScheduled(): void {
    this.scheduledTimeouts.forEach((id) => clearTimeout(id));
    this.scheduledTimeouts = [];
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
