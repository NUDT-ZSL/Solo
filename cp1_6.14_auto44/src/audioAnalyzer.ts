export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array | null = null;
  private waveformData: Float32Array | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private duration = 0;
  private sampleRate = 44100;

  private onPlaybackEndCallback: (() => void) | null = null;
  private onTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;

  constructor() {}

  async loadAudioFile(file: File): Promise<void> {
    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.8;

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.duration = this.audioBuffer.duration;
    this.sampleRate = this.audioBuffer.sampleRate;

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.waveformData = new Float32Array(bufferLength);
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.source) {
      this.source.stop();
      this.source.disconnect();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    const offset = this.pauseTime;
    this.startTime = this.audioContext.currentTime - offset;
    this.source.start(0, offset);
    this.isPlaying = true;

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
        if (this.onPlaybackEndCallback) {
          this.onPlaybackEndCallback();
        }
      }
    };

    this.startTimeUpdate();
  }

  pause(): void {
    if (!this.audioContext || !this.source) return;

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  seek(time: number): void {
    this.pauseTime = Math.max(0, Math.min(time, this.duration));
    if (this.isPlaying) {
      this.play();
    }
  }

  getCurrentTime(): number {
    if (this.audioContext && this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  getDuration(): number {
    return this.duration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser && this.frequencyData) {
      (this.analyser as any).getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData || new Uint8Array(0);
  }

  getWaveformData(): Float32Array {
    if (this.analyser && this.waveformData) {
      (this.analyser as any).getFloatTimeDomainData(this.waveformData);
    }
    return this.waveformData || new Float32Array(0);
  }

  getWaveformSamples(startSample: number, count: number): Float32Array {
    if (!this.audioBuffer) return new Float32Array(0);

    const channelData = this.audioBuffer.getChannelData(0);
    const samples = new Float32Array(count);
    const start = Math.max(0, Math.min(startSample, channelData.length - count));

    for (let i = 0; i < count; i++) {
      samples[i] = channelData[start + i] || 0;
    }

    return samples;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  setOnPlaybackEnd(callback: () => void): void {
    this.onPlaybackEndCallback = callback;
  }

  setOnTimeUpdate(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdateCallback = callback;
  }

  private startTimeUpdate(): void {
    const update = () => {
      if (this.isPlaying && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.getCurrentTime(), this.duration);
      }
      if (this.isPlaying) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  }

  cleanup(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
    this.frequencyData = null;
    this.waveformData = null;
  }
}
