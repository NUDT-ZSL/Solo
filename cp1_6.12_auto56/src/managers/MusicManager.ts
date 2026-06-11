export type BeatWindow = 'loose' | 'standard' | 'strict';

export interface BeatState {
  currentBeat: number;
  beatProgress: number;
  timeSinceLastBeat: number;
  timeUntilNextBeat: number;
  isNearBeat: boolean;
  beatOffset: number;
}

export interface MusicSettings {
  volume: number;
  bpm: number;
  beatWindow: BeatWindow;
}

export class MusicManager {
  private scene: Phaser.Scene;
  private music: Phaser.Sound.BaseSound | null = null;
  private bpm: number = 120;
  private beatDuration: number = 500;
  private settings: MusicSettings;
  private beatTimes: number[] = [];
  private currentBeatIndex: number = 0;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pausedTime: number = 0;

  constructor(scene: Phaser.Scene, settings: MusicSettings) {
    this.scene = scene;
    this.settings = { ...settings };
    this.bpm = settings.bpm;
    this.beatDuration = 60000 / this.bpm;
  }

  loadMusic(key: string, url: string): void {
    if (!this.scene.cache.audio.has(key)) {
      this.scene.load.audio(key, url);
    }
  }

  playMusic(key: string): void {
    if (this.music) {
      this.music.stop();
    }
    this.music = this.scene.sound.add(key, {
      volume: this.settings.volume / 100,
      loop: true
    });
    if (this.music) {
      this.music.play();
      this.isPlaying = true;
      this.startTime = this.scene.time.now;
      this.pausedTime = 0;
      this.generateBeatTimes();
    }
  }

  private generateBeatTimes(): void {
    this.beatTimes = [];
    const totalBeats = 1000;
    for (let i = 0; i < totalBeats; i++) {
      this.beatTimes.push(i * this.beatDuration);
    }
    this.currentBeatIndex = 0;
  }

  getBeatState(currentTime: number): BeatState {
    const elapsed = this.getElapsedTime(currentTime);
    const beatProgress = (elapsed % this.beatDuration) / this.beatDuration;
    const currentBeat = Math.floor(elapsed / this.beatDuration);

    const timeSinceLastBeat = elapsed - currentBeat * this.beatDuration;
    const timeUntilNextBeat = (currentBeat + 1) * this.beatDuration - elapsed;

    const halfWindow = this.getBeatWindowMs() / 2;
    const isNearBeat = timeSinceLastBeat < halfWindow || timeUntilNextBeat < halfWindow;

    let beatOffset: number;
    if (timeSinceLastBeat < timeUntilNextBeat) {
      beatOffset = timeSinceLastBeat;
    } else {
      beatOffset = -timeUntilNextBeat;
    }

    if (currentBeat !== this.currentBeatIndex) {
      this.currentBeatIndex = currentBeat;
    }

    return {
      currentBeat,
      beatProgress,
      timeSinceLastBeat,
      timeUntilNextBeat,
      isNearBeat,
      beatOffset
    };
  }

  checkBeatHit(inputTime: number): { hit: boolean; accuracy: number; offset: number } {
    const elapsed = this.getElapsedTime(inputTime);
    const beatWindow = this.getBeatWindowMs();

    const nearestBeat = Math.round(elapsed / this.beatDuration);
    const nearestBeatTime = nearestBeat * this.beatDuration;
    const offset = elapsed - nearestBeatTime;
    const absOffset = Math.abs(offset);

    const hit = absOffset <= beatWindow / 2;
    const accuracy = hit ? 1 - (absOffset / (beatWindow / 2)) : 0;

    return { hit, accuracy, offset };
  }

  private getBeatWindowMs(): number {
    switch (this.settings.beatWindow) {
      case 'loose':
        return 150;
      case 'strict':
        return 60;
      case 'standard':
      default:
        return 100;
    }
  }

  getElapsedTime(currentTime: number): number {
    if (!this.isPlaying) return this.pausedTime;
    return currentTime - this.startTime + this.pausedTime;
  }

  pause(): void {
    if (this.music && this.isPlaying) {
      this.pausedTime = this.getElapsedTime(this.scene.time.now);
      this.music.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.music && !this.isPlaying) {
      this.startTime = this.scene.time.now;
      this.music.resume();
      this.isPlaying = true;
    }
  }

  stop(): void {
    if (this.music) {
      this.music.stop();
      this.isPlaying = false;
      this.pausedTime = 0;
      this.currentBeatIndex = 0;
    }
  }

  setVolume(volume: number): void {
    this.settings.volume = Phaser.Math.Clamp(volume, 0, 100);
    if (this.music) {
      (this.music as unknown as { volume: number }).volume = this.settings.volume / 100;
    }
  }

  getVolume(): number {
    return this.settings.volume;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    this.beatDuration = 60000 / bpm;
  }

  getBpm(): number {
    return this.bpm;
  }

  getBeatDuration(): number {
    return this.beatDuration;
  }

  setBeatWindow(window: BeatWindow): void {
    this.settings.beatWindow = window;
  }

  getBeatWindow(): BeatWindow {
    return this.settings.beatWindow;
  }

  isMusicPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    if (this.music) {
      this.music.destroy();
      this.music = null;
    }
    this.beatTimes = [];
  }
}
