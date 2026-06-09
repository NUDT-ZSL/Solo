import type { WaveformState } from './waveform';
import type { BlendMode } from './waveform';

export interface RecordedFrame {
  state: WaveformState;
  timestamp: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private oscillatorA: OscillatorNode | null = null;
  private oscillatorB: OscillatorNode | null = null;
  private gainNodeA: GainNode | null = null;
  private gainNodeB: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private recordedFrames: RecordedFrame[] = [];
  private recordingTimer: number | null = null;
  private readonly RECORD_DURATION = 15000;

  private isPlaying: boolean = false;
  private playbackStartTime: number = 0;
  private playbackFrameIndex: number = 0;
  private playbackRafId: number | null = null;

  private onPlaybackFrame?: (state: WaveformState) => void;
  private onPlaybackEnd?: () => void;
  private onRecordingEnd?: () => void;
  private onRecordingProgress?: (progress: number) => void;

  constructor() {}

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public initAudio(): void {
    this.ensureContext();
    if (!this.audioContext) return;

    if (this.oscillatorA) {
      this.oscillatorA.stop();
      this.oscillatorA.disconnect();
    }
    if (this.oscillatorB) {
      this.oscillatorB.stop();
      this.oscillatorB.disconnect();
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
    }

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.15;
    this.masterGain.connect(this.audioContext.destination);

    this.gainNodeA = this.audioContext.createGain();
    this.gainNodeA.gain.value = 0.5;
    this.gainNodeA.connect(this.masterGain);

    this.gainNodeB = this.audioContext.createGain();
    this.gainNodeB.gain.value = 0.5;
    this.gainNodeB.connect(this.masterGain);

    this.oscillatorA = this.audioContext.createOscillator();
    this.oscillatorA.type = 'sine';
    this.oscillatorA.frequency.value = 500;
    this.oscillatorA.connect(this.gainNodeA);
    this.oscillatorA.start();

    this.oscillatorB = this.audioContext.createOscillator();
    this.oscillatorB.type = 'sine';
    this.oscillatorB.frequency.value = 1000;
    this.oscillatorB.connect(this.gainNodeB);
    this.oscillatorB.start();
  }

  public setFrequencyA(freq: number): void {
    if (this.oscillatorA && this.audioContext) {
      this.oscillatorA.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
  }

  public setFrequencyB(freq: number): void {
    if (this.oscillatorB && this.audioContext) {
      this.oscillatorB.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
  }

  public setBlendMode(mode: BlendMode): void {
    if (!this.gainNodeA || !this.gainNodeB || !this.audioContext) return;

    const time = this.audioContext.currentTime;
    switch (mode) {
      case 'add':
        this.gainNodeA.gain.setTargetAtTime(0.5, time, 0.05);
        this.gainNodeB.gain.setTargetAtTime(0.5, time, 0.05);
        break;
      case 'difference':
        this.gainNodeA.gain.setTargetAtTime(0.4, time, 0.05);
        this.gainNodeB.gain.setTargetAtTime(-0.4, time, 0.05);
        break;
      case 'maximum':
        this.gainNodeA.gain.setTargetAtTime(0.6, time, 0.05);
        this.gainNodeB.gain.setTargetAtTime(0.3, time, 0.05);
        break;
    }
  }

  public startRecording(initialState: WaveformState): void {
    if (this.isRecording) return;

    this.ensureContext();
    this.isRecording = true;
    this.recordedFrames = [];
    this.recordingStartTime = performance.now();

    this.recordFrame(initialState);

    const progressInterval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(progressInterval);
        return;
      }
      const elapsed = performance.now() - this.recordingStartTime;
      const progress = Math.min(elapsed / this.RECORD_DURATION, 1);
      if (this.onRecordingProgress) {
        this.onRecordingProgress(progress);
      }
      if (progress >= 1) {
        clearInterval(progressInterval);
      }
    }, 50);

    this.recordingTimer = window.setTimeout(() => {
      this.stopRecording();
    }, this.RECORD_DURATION);
  }

  public recordFrame(state: WaveformState): void {
    if (!this.isRecording) return;
    this.recordedFrames.push({
      state: { ...state },
      timestamp: performance.now() - this.recordingStartTime
    });
  }

  public stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    if (this.recordingTimer !== null) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.onRecordingEnd) {
      this.onRecordingEnd();
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public hasRecording(): boolean {
    return this.recordedFrames.length > 0;
  }

  public getRecordedFrames(): RecordedFrame[] {
    return [...this.recordedFrames];
  }

  public clearRecording(): void {
    this.stopPlayback();
    this.recordedFrames = [];
  }

  public startPlayback(
    onFrame: (state: WaveformState) => void,
    onEnd?: () => void
  ): void {
    if (this.isPlaying || this.recordedFrames.length === 0) return;

    this.isPlaying = true;
    this.playbackStartTime = performance.now();
    this.playbackFrameIndex = 0;
    this.onPlaybackFrame = onFrame;
    this.onPlaybackEnd = onEnd;

    this.playbackLoop();
  }

  private playbackLoop = (): void => {
    if (!this.isPlaying || this.recordedFrames.length === 0) {
      this.stopPlayback();
      return;
    }

    const elapsed = performance.now() - this.playbackStartTime;
    const totalDuration = this.recordedFrames[this.recordedFrames.length - 1].timestamp;

    while (
      this.playbackFrameIndex < this.recordedFrames.length - 1 &&
      this.recordedFrames[this.playbackFrameIndex + 1].timestamp <= elapsed
    ) {
      this.playbackFrameIndex++;
    }

    const currentFrame = this.recordedFrames[this.playbackFrameIndex];
    let stateToUse = currentFrame.state;

    if (this.playbackFrameIndex < this.recordedFrames.length - 1) {
      const nextFrame = this.recordedFrames[this.playbackFrameIndex + 1];
      const frameDuration = nextFrame.timestamp - currentFrame.timestamp;
      if (frameDuration > 0) {
        const t = (elapsed - currentFrame.timestamp) / frameDuration;
        stateToUse = this.interpolateState(currentFrame.state, nextFrame.state, t);
      }
    }

    if (this.onPlaybackFrame) {
      this.onPlaybackFrame(stateToUse);
    }

    if (elapsed >= totalDuration) {
      this.stopPlayback();
      return;
    }

    this.playbackRafId = requestAnimationFrame(this.playbackLoop);
  };

  private interpolateState(a: WaveformState, b: WaveformState, t: number): WaveformState {
    return {
      freqA: a.freqA + (b.freqA - a.freqA) * t,
      freqB: a.freqB + (b.freqB - a.freqB) * t,
      blendMode: t < 0.5 ? a.blendMode : b.blendMode
    };
  }

  public stopPlayback(): void {
    this.isPlaying = false;
    if (this.playbackRafId !== null) {
      cancelAnimationFrame(this.playbackRafId);
      this.playbackRafId = null;
    }
    if (this.onPlaybackEnd) {
      const callback = this.onPlaybackEnd;
      this.onPlaybackEnd = undefined;
      callback();
    }
    this.onPlaybackFrame = undefined;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setOnRecordingEnd(callback: () => void): void {
    this.onRecordingEnd = callback;
  }

  public setOnRecordingProgress(callback: (progress: number) => void): void {
    this.onRecordingProgress = callback;
  }

  public getPlaybackProgress(): number {
    if (!this.isPlaying || this.recordedFrames.length === 0) return 0;
    const elapsed = performance.now() - this.playbackStartTime;
    const totalDuration = this.recordedFrames[this.recordedFrames.length - 1].timestamp;
    return Math.min(elapsed / totalDuration, 1);
  }

  public dispose(): void {
    this.stopPlayback();
    this.stopRecording();
    if (this.oscillatorA) {
      try { this.oscillatorA.stop(); } catch {}
      this.oscillatorA.disconnect();
      this.oscillatorA = null;
    }
    if (this.oscillatorB) {
      try { this.oscillatorB.stop(); } catch {}
      this.oscillatorB.disconnect();
      this.oscillatorB = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
