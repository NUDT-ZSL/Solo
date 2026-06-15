import { HexRing, MIN_DISTANCE, MAX_DISTANCE, DISTANCE_STEPS } from './HexRings';
import { AudioEngine } from './AudioEngine';

export const NOTE_DURATION = 300;

export class SequenceManager {
  private sequence: number[] = [];
  private isPlaying: boolean = false;
  private isLooping: boolean = false;
  private currentPlayIndex: number = -1;
  private scheduledTimeouts: number[] = [];

  constructor(
    private hexRing: HexRing,
    private audioEngine: AudioEngine,
    private onSequenceChange: () => void,
    private onPlayProgress: (progress: number) => void
  ) {}

  public addToSequence(index: number): void {
    if (!this.hexRing.hexagons[index].isActive) {
      this.sequence.push(index);
      this.onSequenceChange();
    }
  }

  public removeFromSequence(index: number): void {
    this.sequence = this.sequence.filter(i => i !== index);
    this.onSequenceChange();
  }

  public clear(): void {
    this.stop();
    this.sequence = [];
    this.hexRing.clearAll();
    this.onSequenceChange();
    this.onPlayProgress(0);
  }

  public getSequence(): number[] {
    return [...this.sequence];
  }

  public getSequenceLength(): number {
    return this.sequence.length;
  }

  public toggleLoop(): boolean {
    this.isLooping = !this.isLooping;
    return this.isLooping;
  }

  public getIsLooping(): boolean {
    return this.isLooping;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public play(): void {
    if (this.sequence.length === 0) return;
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.hexRing.isRotating = this.isLooping;
    this.playSequenceFrom(0);
  }

  private playSequenceFrom(startIndex: number): void {
    this.currentPlayIndex = startIndex;
    this.playNoteAtIndex(this.currentPlayIndex);
  }

  private playNoteAtIndex(index: number): void {
    if (!this.isPlaying) return;
    if (index >= this.sequence.length) {
      if (this.isLooping && this.sequence.length > 0) {
        this.playSequenceFrom(0);
      } else {
        this.stop();
      }
      return;
    }

    const hexIndex = this.sequence[index];
    const hex = this.hexRing.hexagons[hexIndex];
    if (!hex || !hex.isActive) {
      this.currentPlayIndex = index + 1;
      this.playNoteAtIndex(this.currentPlayIndex);
      return;
    }

    this.hexRing.setPlaying(hexIndex, true);
    this.audioEngine.playTone(this.hexRing.getHexFrequency(hex), NOTE_DURATION / 1000, 0.3);

    const progress = this.sequence.length > 0 ? (index + 1) / this.sequence.length : 0;
    this.onPlayProgress(progress);

    const timeoutId = window.setTimeout(() => {
      this.hexRing.setPlaying(hexIndex, false);
      this.currentPlayIndex = index + 1;
      if (this.currentPlayIndex >= this.sequence.length) {
        if (this.isLooping) {
          this.playSequenceFrom(0);
        } else {
          this.isPlaying = false;
          this.hexRing.isRotating = false;
          this.onPlayProgress(0);
        }
      } else {
        const nextTimeoutId = window.setTimeout(() => {
          this.playNoteAtIndex(this.currentPlayIndex);
        }, 50);
        this.scheduledTimeouts.push(nextTimeoutId);
      }
    }, NOTE_DURATION);

    this.scheduledTimeouts.push(timeoutId);
  }

  public stop(): void {
    this.isPlaying = false;
    this.hexRing.isRotating = false;
    for (const hex of this.hexRing.hexagons) {
      this.hexRing.setPlaying(hex.index, false);
    }
    for (const id of this.scheduledTimeouts) {
      clearTimeout(id);
    }
    this.scheduledTimeouts = [];
    this.currentPlayIndex = -1;
  }

  public getTotalDuration(): number {
    return this.sequence.length * NOTE_DURATION;
  }

  public randomActivateRandom(): void {
    this.clear();
    const hexCount = this.hexRing.hexagons.length;
    const count = Math.floor(Math.random() * 4) + 3;
    const available = [...Array(hexCount).keys()];
    for (let i = 0; i < count && available.length > 0; i++) {
      const randIdx = Math.floor(Math.random() * available.length);
      const hexIdx = available.splice(randIdx, 1)[0];
      if (this.hexRing.activateHexagon(hexIdx)) {
        const stepSize = (MAX_DISTANCE - MIN_DISTANCE) / DISTANCE_STEPS;
        const randomSteps = Math.floor(Math.random() * (DISTANCE_STEPS + 1));
        this.hexRing.hexagons[hexIdx].targetDistance = MIN_DISTANCE + randomSteps * stepSize;
        this.sequence.push(hexIdx);
      }
    }
    this.onSequenceChange();
  }
}
