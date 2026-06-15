export type Direction = 'up' | 'down' | 'left' | 'right';

const BEAT_INTERVAL_MS = 450;
const LOOP_LENGTH = 8;
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export class RhythmGenerator {
  private startTime: number = 0;
  private lastBeatIndex: number = -1;
  private directionPattern: Direction[] = [];
  private audioContext: AudioContext | null = null;
  private drumGain: GainNode | null = null;
  private scheduledBeats: Set<number> = new Set();

  constructor() {
    this.generateDirectionPattern();
  }

  private generateDirectionPattern(): void {
    const pattern: Direction[] = [];
    for (let i = 0; i < LOOP_LENGTH; i++) {
      const dirIndex = Math.floor(Math.random() * 4);
      pattern.push(DIRECTIONS[dirIndex]);
    }
    this.directionPattern = pattern;
  }

  public start(currentTime: number): void {
    this.startTime = currentTime;
    this.lastBeatIndex = -1;
    this.scheduledBeats.clear();
    this.initAudio();
  }

  private initAudio(): void {
    try {
      const AC = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AC();
      this.drumGain = this.audioContext.createGain();
      this.drumGain.gain.value = 0.6;
      this.drumGain.connect(this.audioContext.destination);
    } catch (_e) {
      this.audioContext = null;
      this.drumGain = null;
    }
  }

  public ensureAudioRunning(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  public getBeatInterval(): number {
    return BEAT_INTERVAL_MS;
  }

  public getBeatTime(beatIndex: number): number {
    return this.startTime + beatIndex * BEAT_INTERVAL_MS;
  }

  public getNextBeatTime(currentTime: number): number {
    const elapsed = currentTime - this.startTime;
    if (elapsed < 0) return this.startTime;
    const nextIndex = Math.floor(elapsed / BEAT_INTERVAL_MS) + 1;
    return this.getBeatTime(nextIndex);
  }

  public getDirectionForBeat(beatIndex: number): Direction {
    const loopIndex = ((beatIndex % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH;
    return this.directionPattern[loopIndex];
  }

  public checkAndFireBeat(currentTime: number): { beatIndex: number; direction: Direction; time: number } | null {
    const elapsed = currentTime - this.startTime;
    if (elapsed < 0) return null;
    const currentBeatIndex = Math.floor(elapsed / BEAT_INTERVAL_MS);

    if (currentBeatIndex > this.lastBeatIndex) {
      const fired: { beatIndex: number; direction: Direction; time: number }[] = [];
      for (let idx = this.lastBeatIndex + 1; idx <= currentBeatIndex; idx++) {
        this.lastBeatIndex = idx;
        if (!this.scheduledBeats.has(idx)) {
          this.scheduledBeats.add(idx);
          const beatTime = this.getBeatTime(idx);
          const direction = this.getDirectionForBeat(idx);
          this.playDrumSound();
          fired.push({ beatIndex: idx, direction, time: beatTime });
        }
      }
      if (fired.length > 0) {
        return fired[fired.length - 1];
      }
    }
    return null;
  }

  private playDrumSound(): void {
    if (!this.audioContext || !this.drumGain) return;
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.drumGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (_e) {
    }
  }

  public playHitSound(perfect: boolean): void {
    if (!this.audioContext || !this.drumGain) return;
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (perfect) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      }
      osc.connect(gain);
      gain.connect(this.drumGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (_e) {
    }
  }

  public getCurrentBeatIndex(currentTime: number): number {
    const elapsed = currentTime - this.startTime;
    if (elapsed < 0) return -1;
    return Math.floor(elapsed / BEAT_INTERVAL_MS);
  }
}
