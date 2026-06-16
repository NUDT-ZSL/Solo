import { AudioClip, SAMPLE_RATE } from '../types';

export interface PreviewPlayerCallbacks {
  onTimeUpdate: (time: number) => void;
  onPlaybackEnd: () => void;
}

interface ClipPlaybackState {
  clipId: string;
  gainNode: GainNode;
  startOffsetInMix: number;
  clipDuration: number;
  clipFadeIn: number;
  clipFadeOut: number;
  clipVolume: number;
}

export class PreviewPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private clipStates: Map<string, ClipPlaybackState> = new Map();
  private startTime: number = 0;
  private offset: number = 0;
  private isPlaying: boolean = false;
  private animationFrame: number = 0;
  private callbacks: PreviewPlayerCallbacks;
  private clips: AudioClip[] = [];
  private totalDuration: number = 0;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private audioBufferSources: AudioBufferSourceNode[] = [];

  constructor(callbacks: PreviewPlayerCallbacks) {
    this.callbacks = callbacks;
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private buildClipAudioBuffer(clip: AudioClip, applyVolumeAndFade: boolean): AudioBuffer {
    const ctx = this.ensureContext();
    const trimStartSample = Math.floor(clip.trimStart * clip.sampleRate);
    const trimEndSample = Math.floor(clip.trimEnd * clip.sampleRate);
    const actualEnd = Math.min(trimEndSample, clip.pcmData.length);
    const trimmedLength = Math.max(1, actualEnd - trimStartSample);

    const buffer = ctx.createBuffer(2, trimmedLength, SAMPLE_RATE);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    const baseGain = applyVolumeAndFade ? clip.volume / 100 : 1.0;
    const fadeInSamples = applyVolumeAndFade ? Math.min(Math.floor(clip.fadeIn * clip.sampleRate), trimmedLength) : 0;
    const fadeOutSamples = applyVolumeAndFade ? Math.min(Math.floor(clip.fadeOut * clip.sampleRate), trimmedLength) : 0;

    for (let i = 0; i < trimmedLength; i++) {
      let sample = 0;
      const srcIdx = trimStartSample + i;
      if (srcIdx < clip.pcmData.length) {
        sample = clip.pcmData[srcIdx] * baseGain;
      }

      if (applyVolumeAndFade) {
        if (i < fadeInSamples && fadeInSamples > 0) {
          sample *= i / fadeInSamples;
        }
        if (i >= trimmedLength - fadeOutSamples && fadeOutSamples > 0) {
          sample *= (trimmedLength - i) / fadeOutSamples;
        }
      }

      leftChannel[i] = sample;
      rightChannel[i] = sample;
    }

    return buffer;
  }

  play(clips: AudioClip[], startOffset: number = 0): void {
    this.stopInternal();

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.clips = clips;
    this.totalDuration = clips.length > 0
      ? Math.max(...clips.map((c) => c.startTime + (c.trimEnd - c.trimStart)))
      : 0;

    if (this.totalDuration === 0) return;

    this.offset = Math.min(Math.max(0, startOffset), this.totalDuration);
    this.isPlaying = true;
    this.startTime = ctx.currentTime - this.offset;

    clips.forEach((clip) => {
      const clipDuration = clip.trimEnd - clip.trimStart;
      if (clipDuration <= 0) return;

      const clipStartInMix = clip.startTime;
      const clipEndInMix = clipStartInMix + clipDuration;

      if (clipEndInMix <= this.offset) return;

      const buffer = this.buildClipAudioBuffer(clip, false);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = clip.volume / 100;

      source.connect(gainNode);
      gainNode.connect(this.masterGain!);

      const playStartInClip = Math.max(0, this.offset - clipStartInMix);
      const whenToStart = clipStartInMix > this.offset ? clipStartInMix - this.offset : 0;
      const availableDuration = clipDuration - playStartInClip;

      const fadeInSec = clip.fadeIn;
      const fadeOutSec = clip.fadeOut;
      const adjustedFadeIn = fadeInSec - (fadeInSec > 0 ? playStartInClip : 0);

      if (adjustedFadeIn > 0) {
        const fadeInEndTime = ctx.currentTime + whenToStart + adjustedFadeIn;
        const startGain = fadeInSec > 0 ? Math.max(0, playStartInClip / fadeInSec) * (clip.volume / 100) : 0;
        gainNode.gain.setValueAtTime(startGain, ctx.currentTime + whenToStart);
        gainNode.gain.linearRampToValueAtTime(clip.volume / 100, fadeInEndTime);
      }

      if (fadeOutSec > 0 && availableDuration > fadeOutSec) {
        const fadeOutStart = ctx.currentTime + whenToStart + (availableDuration - fadeOutSec);
        const fadeOutEnd = ctx.currentTime + whenToStart + availableDuration;
        gainNode.gain.setValueAtTime(clip.volume / 100, fadeOutStart);
        gainNode.gain.linearRampToValueAtTime(0.0001, fadeOutEnd);
      }

      source.start(ctx.currentTime + whenToStart, playStartInClip, availableDuration);
      this.audioBufferSources.push(source);

      this.clipStates.set(clip.id, {
        clipId: clip.id,
        gainNode,
        startOffsetInMix: clipStartInMix,
        clipDuration,
        clipFadeIn: clip.fadeIn,
        clipFadeOut: clip.fadeOut,
        clipVolume: clip.volume,
      });

      source.onended = () => {
        try {
          gainNode.disconnect();
        } catch {}
        const idx = this.audioBufferSources.indexOf(source);
        if (idx >= 0) {
          this.audioBufferSources.splice(idx, 1);
        }
      };
    });

    const longestClipEnd = clips.reduce((max, clip) => {
      const end = clip.startTime + (clip.trimEnd - clip.trimStart);
      return end > max ? end : max;
    }, 0);
    const remaining = Math.max(0, longestClipEnd - this.offset);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      if (this.isPlaying) {
        this.stop();
        this.callbacks.onPlaybackEnd();
      }
    }, remaining * 1000 + 200);

    this.startTimeUpdate();
  }

  private startTimeUpdate(): void {
    const tick = () => {
      if (!this.isPlaying || !this.audioContext) return;
      const currentTime = this.audioContext.currentTime - this.startTime;
      if (currentTime >= this.totalDuration) {
        this.stop();
        this.callbacks.onPlaybackEnd();
        return;
      }
      this.callbacks.onTimeUpdate(currentTime);
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private stopInternal(): void {
    this.isPlaying = false;
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    cancelAnimationFrame(this.animationFrame);

    this.audioBufferSources.forEach((source) => {
      try {
        source.stop();
      } catch {}
      try {
        source.disconnect();
      } catch {}
    });
    this.audioBufferSources = [];

    this.clipStates.forEach((state) => {
      try {
        state.gainNode.disconnect();
      } catch {}
    });
    this.clipStates.clear();
  }

  stop(): void {
    this.stopInternal();
  }

  pause(): number {
    const currentPos = this.getCurrentTime();
    this.stopInternal();
    return currentPos;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.offset;
    return Math.min(this.audioContext.currentTime - this.startTime, this.totalDuration);
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  updateClipVolume(clipId: string, volume: number): void {
    const state = this.clipStates.get(clipId);
    if (!state || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    state.clipVolume = volume;

    const currentPosInMix = now - this.startTime;
    const posInClip = currentPosInMix - state.startOffsetInMix;

    let targetGain = volume / 100;

    if (state.clipFadeIn > 0 && posInClip < state.clipFadeIn) {
      const fadeProgress = Math.max(0, posInClip / state.clipFadeIn);
      targetGain *= fadeProgress;
    }

    if (state.clipFadeOut > 0) {
      const fadeOutStart = state.clipDuration - state.clipFadeOut;
      if (posInClip > fadeOutStart) {
        const fadeProgress = Math.max(0, (state.clipDuration - posInClip) / state.clipFadeOut);
        targetGain *= fadeProgress;
      }
    }

    state.gainNode.gain.cancelScheduledValues(now);
    state.gainNode.gain.setValueAtTime(state.gainNode.gain.value, now);
    state.gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.05);
  }

  updateClipFadeIn(clipId: string, fadeInSec: number): void {
    this.rebuildClip(clipId, { fadeIn: fadeInSec });
  }

  updateClipFadeOut(clipId: string, fadeOutSec: number): void {
    this.rebuildClip(clipId, { fadeOut: fadeOutSec });
  }

  private rebuildClip(clipId: string, updates: Partial<AudioClip>): void {
    if (!this.isPlaying) return;
    const currentTime = this.getCurrentTime();
    const clip = this.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const updatedClip = { ...clip, ...updates };
    const remainingClips = this.clips.filter((c) => c.id !== clipId);
    const isRestartNeeded =
      (updates.fadeIn !== undefined && updates.fadeIn !== clip.fadeIn) ||
      (updates.fadeOut !== undefined && updates.fadeOut !== clip.fadeOut);

    if (!isRestartNeeded) return;

    this.stopInternal();
    this.clips = [...remainingClips, updatedClip];
    this.play(this.clips, currentTime);
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }

  dispose(): void {
    this.stopInternal();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.masterGain = null;
  }
}
