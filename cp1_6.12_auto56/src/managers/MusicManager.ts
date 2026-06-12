export type BeatWindow = 'loose' | 'standard' | 'strict';

export interface BeatState {
  currentBeat: number;
  beatProgress: number;
  timeSinceLastBeatMs: number;
  timeUntilNextBeatMs: number;
  isNearBeat: boolean;
  beatOffsetMs: number;
  audioTimeSec: number;
}

export interface MusicSettings {
  volume: number;
  bpm: number;
  beatWindow: BeatWindow;
}

interface PhaserSoundWithSeek {
  seek: number;
  volume: number;
  isPlaying: boolean;
  play(markerName?: string | Phaser.Types.Sound.SoundConfig, config?: Phaser.Types.Sound.SoundConfig): boolean;
  pause(): boolean;
  stop(): void;
  destroy(): void;
}

export class MusicManager {
  private scene: Phaser.Scene;
  private music: PhaserSoundWithSeek | null = null;
  private bpm: number;
  private beatDurationMs: number;
  private beatDurationSec: number;
  private settings: MusicSettings;
  private beatTimesMs: number[] = [];
  private beatTimesSec: number[] = [];
  private currentBeatIndex: number = 0;
  private isPlaying: boolean = false;
  private manualTimeSec: number = 0;
  private manualTimeStartMs: number = 0;
  private pausedAtSec: number = 0;

  private audioStartOffsetSec: number = 0;

  constructor(scene: Phaser.Scene, settings: MusicSettings) {
    this.scene = scene;
    this.settings = { ...settings };
    this.bpm = settings.bpm;
    this.beatDurationMs = 60000 / this.bpm;
    this.beatDurationSec = 60 / this.bpm;
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

    const raw = this.scene.sound.add(key, {
      volume: this.settings.volume / 100,
      loop: true
    });
    this.music = raw as unknown as PhaserSoundWithSeek;

    if (this.music) {
      this.music.play();
      this.isPlaying = true;
      this.manualTimeStartMs = this.scene.time.now;
      this.manualTimeSec = 0;
      this.pausedAtSec = 0;
      this.audioStartOffsetSec = 0;
      this.generateBeatTimes();
    }
  }

  setAudioStartOffset(offsetSec: number): void {
    this.audioStartOffsetSec = offsetSec;
  }

  private generateBeatTimes(): void {
    this.beatTimesMs = [];
    this.beatTimesSec = [];
    const totalBeats = 2000;
    for (let i = 0; i < totalBeats; i++) {
      this.beatTimesMs.push(i * this.beatDurationMs);
      this.beatTimesSec.push(i * this.beatDurationSec);
    }
    this.currentBeatIndex = 0;
  }

  getAudioTimeSec(): number {
    if (!this.isPlaying) {
      return this.pausedAtSec;
    }

    if (this.music && this.music.seek > 0) {
      return this.music.seek;
    }

    const elapsedMs = this.scene.time.now - this.manualTimeStartMs;
    return this.manualTimeSec + elapsedMs / 1000;
  }

  getEffectiveTimeSec(): number {
    const rawTime = this.getAudioTimeSec();
    return Math.max(0, rawTime - this.audioStartOffsetSec);
  }

  getBeatState(): BeatState {
    const effectiveTimeSec = this.getEffectiveTimeSec();
    const effectiveTimeMs = effectiveTimeSec * 1000;

    const currentBeat = Math.floor(effectiveTimeMs / this.beatDurationMs);
    const beatProgress = (effectiveTimeMs % this.beatDurationMs) / this.beatDurationMs;

    const timeSinceLastBeatMs = effectiveTimeMs - currentBeat * this.beatDurationMs;
    const timeUntilNextBeatMs = (currentBeat + 1) * this.beatDurationMs - effectiveTimeMs;

    const halfWindowMs = this.getBeatWindowMs() / 2;
    const isNearBeat = timeSinceLastBeatMs < halfWindowMs || timeUntilNextBeatMs < halfWindowMs;

    let beatOffsetMs: number;
    if (timeSinceLastBeatMs < timeUntilNextBeatMs) {
      beatOffsetMs = timeSinceLastBeatMs;
    } else {
      beatOffsetMs = -timeUntilNextBeatMs;
    }

    if (currentBeat !== this.currentBeatIndex) {
      this.currentBeatIndex = currentBeat;
    }

    return {
      currentBeat,
      beatProgress,
      timeSinceLastBeatMs,
      timeUntilNextBeatMs,
      isNearBeat,
      beatOffsetMs,
      audioTimeSec: effectiveTimeSec
    };
  }

  checkBeatHitAtAudioTime(audioTimeSec: number): {
    hit: boolean;
    accuracy: number;
    offsetMs: number;
    beatIndex: number;
  } {
    const effectiveTimeSec = audioTimeSec - this.audioStartOffsetSec;
    const effectiveTimeMs = Math.max(0, effectiveTimeSec) * 1000;
    const beatWindowMs = this.getBeatWindowMs();

    const nearestBeat = Math.round(effectiveTimeMs / this.beatDurationMs);
    const nearestBeatTimeMs = nearestBeat * this.beatDurationMs;
    const offsetMs = effectiveTimeMs - nearestBeatTimeMs;
    const absOffsetMs = Math.abs(offsetMs);

    const hit = absOffsetMs <= beatWindowMs / 2;
    const accuracy = hit ? 1 - (absOffsetMs / (beatWindowMs / 2)) : 0;

    return { hit, accuracy, offsetMs, beatIndex: nearestBeat };
  }

  getBeatTimeMs(beatIndex: number): number {
    if (beatIndex >= 0 && beatIndex < this.beatTimesMs.length) {
      return this.beatTimesMs[beatIndex];
    }
    return beatIndex * this.beatDurationMs;
  }

  getBeatTimeSec(beatIndex: number): number {
    if (beatIndex >= 0 && beatIndex < this.beatTimesSec.length) {
      return this.beatTimesSec[beatIndex];
    }
    return beatIndex * this.beatDurationSec;
  }

  getBeatTimesMsArray(): ReadonlyArray<number> {
    return this.beatTimesMs;
  }

  getBeatTimesSecArray(): ReadonlyArray<number> {
    return this.beatTimesSec;
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

  pause(): void {
    if (this.music && this.isPlaying) {
      this.pausedAtSec = this.getAudioTimeSec();
      this.music.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.music && !this.isPlaying) {
      this.manualTimeStartMs = this.scene.time.now;
      this.manualTimeSec = this.pausedAtSec;
      this.music.play();
      this.isPlaying = true;
    }
  }

  stop(): void {
    if (this.music) {
      this.music.stop();
      this.isPlaying = false;
      this.pausedAtSec = 0;
      this.manualTimeSec = 0;
      this.currentBeatIndex = 0;
    }
  }

  setVolume(volume: number): void {
    this.settings.volume = Phaser.Math.Clamp(volume, 0, 100);
    if (this.music) {
      this.music.volume = this.settings.volume / 100;
    }
  }

  getVolume(): number {
    return this.settings.volume;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    this.beatDurationMs = 60000 / bpm;
    this.beatDurationSec = 60 / bpm;
    if (this.isPlaying) {
      this.generateBeatTimes();
    }
  }

  getBpm(): number {
    return this.bpm;
  }

  getBeatDurationMs(): number {
    return this.beatDurationMs;
  }

  getBeatDurationSec(): number {
    return this.beatDurationSec;
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

  getCurrentBeatIndex(): number {
    return this.currentBeatIndex;
  }

  getAudioStartOffsetSec(): number {
    return this.audioStartOffsetSec;
  }

  destroy(): void {
    if (this.music) {
      this.music.destroy();
      this.music = null;
    }
    this.beatTimesMs = [];
    this.beatTimesSec = [];
  }
}
