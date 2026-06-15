export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private _isPlaying = false;
  private _startTime = 0;
  private _pauseOffset = 0;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);
      this.timeDomainData = new Uint8Array(bufferLength);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  async loadFile(file: File): Promise<void> {
    const ctx = this.ensureContext();
    if (this._isPlaying) {
      this.stop();
    }
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this._pauseOffset = 0;
  }

  play(): void {
    if (!this.audioBuffer || this._isPlaying) return;
    const ctx = this.ensureContext();
    this.source = ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gainNode!);
    this.source.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this._pauseOffset = 0;
      }
    };
    this.source.start(0, this._pauseOffset);
    this._startTime = ctx.currentTime - this._pauseOffset;
    this._isPlaying = true;
  }

  pause(): void {
    if (!this._isPlaying || !this.source) return;
    const ctx = this.ensureContext();
    this._pauseOffset = ctx.currentTime - this._startTime;
    this.source.onended = null;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this._isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch (_) { /* noop */ }
      this.source.disconnect();
      this.source = null;
    }
    this._isPlaying = false;
    this._pauseOffset = 0;
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(
        Math.max(0, Math.min(1, value)),
        this.audioContext!.currentTime
      );
    }
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  getTimeDomainData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    }
    return this.timeDomainData;
  }

  getAverageVolume(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length / 255;
  }

  getCurrentTime(): number {
    if (!this._isPlaying || !this.audioContext) return this._pauseOffset;
    return this.audioContext.currentTime - this._startTime;
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
      this.gainNode = null;
    }
    this.audioBuffer = null;
  }
}
