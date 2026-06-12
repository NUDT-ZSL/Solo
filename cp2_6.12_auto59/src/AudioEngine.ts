export interface AudioEngineCallbacks {
  onPlaybackUpdate?: (currentTime: number, duration: number) => void;
  onWaveformData?: (data: Float32Array) => void;
  onPlaybackEnd?: () => void;
  onAudioLoaded?: (duration: number, sampleRate: number) => void;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private callbacks: AudioEngineCallbacks = {};
  private duration: number = 0;
  private fileName: string = '';
  private waveformData: Float32Array | null = null;

  constructor(callbacks: AudioEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: AudioEngineCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async loadAudioFile(file: File): Promise<void> {
    const ctx = await this.ensureAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.fileName = file.name;
    this.pausedAt = 0;
    this.isPlaying = false;
    this.extractWaveformData();
    this.callbacks.onAudioLoaded?.(this.duration, this.audioBuffer.sampleRate);
    this.callbacks.onWaveformData?.(this.waveformData!);
  }

  private extractWaveformData(): void {
    if (!this.audioBuffer) return;
    const channelData = this.audioBuffer.getChannelData(0);
    const samples = 2000;
    const blockSize = Math.floor(channelData.length / samples);
    const filteredData = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      filteredData[i] = sum / blockSize;
    }

    const max = Math.max(...filteredData);
    if (max > 0) {
      for (let i = 0; i < samples; i++) {
        filteredData[i] /= max;
      }
    }

    this.waveformData = filteredData;
  }

  getWaveformData(): Float32Array | null {
    return this.waveformData;
  }

  getDuration(): number {
    return this.duration;
  }

  getFileName(): string {
    return this.fileName;
  }

  getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext) {
      return this.pausedAt;
    }
    return this.audioContext.currentTime - this.startTime;
  }

  isPlayingState(): boolean {
    return this.isPlaying;
  }

  async play(startTime?: number): Promise<void> {
    if (!this.audioBuffer) return;
    const ctx = await this.ensureAudioContext();

    this.stopSource();

    const startPos = startTime !== undefined ? startTime : this.pausedAt;
    if (startPos >= this.duration) {
      this.pausedAt = 0;
    }

    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.7;

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
        this.callbacks.onPlaybackEnd?.();
        this.stopAnimationLoop();
      }
    };

    const offset = startTime !== undefined ? startTime : this.pausedAt;
    this.sourceNode.start(0, offset);
    this.startTime = ctx.currentTime - offset;
    this.isPlaying = true;
    this.startAnimationLoop();
  }

  pause(): void {
    if (!this.isPlaying || !this.audioContext) return;
    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;
    this.stopSource();
    this.stopAnimationLoop();
  }

  stop(): void {
    this.isPlaying = false;
    this.pausedAt = 0;
    this.stopSource();
    this.stopAnimationLoop();
    this.callbacks.onPlaybackUpdate?.(0, this.duration);
  }

  seek(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this.duration));
    this.pausedAt = clampedTime;
    if (this.isPlaying) {
      this.play(clampedTime);
    } else {
      this.callbacks.onPlaybackUpdate?.(clampedTime, this.duration);
    }
  }

  private stopSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (!this.isPlaying || !this.audioContext) return;
      const currentTime = this.audioContext.currentTime - this.startTime;
      this.callbacks.onPlaybackUpdate?.(currentTime, this.duration);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  playBeatSound(frequency: number = 440, duration: number = 0.1, volume: number = 0.3): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
