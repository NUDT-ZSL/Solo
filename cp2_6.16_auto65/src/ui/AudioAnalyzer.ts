import { FrequencyData, MAX_AUDIO_SIZE } from '@/types/index';

export class AudioAnalyzer {
  public onFrequencyData: ((data: FrequencyData) => void) | null = null;
  public onProgress: ((progress: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private animationFrameId: number = 0;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private _isPlaying: boolean = false;

  async loadFile(file: File): Promise<void> {
    if (file.size > MAX_AUDIO_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_AUDIO_SIZE} bytes`);
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.pauseOffset = 0;
    this.performInitialAnalysis();
  }

  private performInitialAnalysis(): void {
    if (!this.analyser || !this.audioBuffer || !this.frequencyData) return;

    const binCount = this.analyser.frequencyBinCount;
    const tempData = new Uint8Array(binCount);
    const sampleRate = this.audioBuffer.sampleRate;
    const fftSize = this.analyser.fftSize;
    const resolution = sampleRate / fftSize;

    const channelData = this.audioBuffer.getChannelData(0);
    for (let i = 0; i < binCount && i < channelData.length; i++) {
      tempData[i] = Math.min(255, Math.floor(Math.abs(channelData[i]) * 255));
    }

    const low = this.computeBandRMS(tempData, resolution, 20, 250);
    const mid = this.computeBandRMS(tempData, resolution, 250, 4000);
    const high = this.computeBandRMS(tempData, resolution, 4000, 20000);

    if (this.onFrequencyData) {
      this.onFrequencyData({ low, mid, high });
    }

    if (this.onProgress) {
      this.onProgress(0, this.audioBuffer.duration);
    }
  }

  play(): void {
    if (this._isPlaying) return;
    if (!this.audioContext || !this.analyser || !this.gainNode || !this.audioBuffer) return;

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this.pauseOffset = 0;
        cancelAnimationFrame(this.animationFrameId);
        if (this.onEnded) {
          this.onEnded();
        }
      }
    };

    this.sourceNode.start(0, this.pauseOffset);
    this.startTime = this.audioContext.currentTime - this.pauseOffset;
    this._isPlaying = true;

    this.analyze();
  }

  private analyze(): void {
    if (!this._isPlaying || !this.analyser || !this.frequencyData || !this.audioBuffer) return;

    const frameStart = performance.now();

    this.analyser.getByteFrequencyData(this.frequencyData);

    const sampleRate = this.audioBuffer.sampleRate;
    const fftSize = this.analyser.fftSize;
    const resolution = sampleRate / fftSize;

    const low = this.computeBandRMS(this.frequencyData, resolution, 20, 250);
    const mid = this.computeBandRMS(this.frequencyData, resolution, 250, 4000);
    const high = this.computeBandRMS(this.frequencyData, resolution, 4000, 20000);

    if (this.onFrequencyData) {
      this.onFrequencyData({ low, mid, high });
    }

    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();
    if (this.onProgress) {
      this.onProgress(currentTime / duration, duration);
    }

    const frameEnd = performance.now();
    const elapsed = frameEnd - frameStart;

    void elapsed;

    if (currentTime < duration) {
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }
  }

  private computeBandRMS(data: Uint8Array, resolution: number, lowFreq: number, highFreq: number): number {
    const startBin = Math.max(1, Math.floor(lowFreq / resolution));
    const endBin = Math.min(data.length - 1, Math.floor(highFreq / resolution));

    if (startBin > endBin || endBin <= 0) return 0;

    let sumSquares = 0;
    let count = 0;
    for (let i = startBin; i <= endBin; i++) {
      const normalized = data[i] / 255;
      sumSquares += normalized * normalized;
      count++;
    }

    if (count === 0) return 0;
    return Math.sqrt(sumSquares / count);
  }

  pause(): void {
    if (!this._isPlaying || !this.audioContext) return;

    this.pauseOffset = this.audioContext.currentTime - this.startTime;

    if (this.sourceNode) {
      this.sourceNode.onended = null;
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this._isPlaying = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  togglePlay(): void {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number): void {
    this.pauseOffset = time;
    if (this._isPlaying) {
      this.pause();
      this.play();
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (!this._isPlaying) return this.pauseOffset;
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  getIsPlaying(): boolean {
    return this._isPlaying;
  }

  dispose(): void {
    this.pause();

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffer = null;
    this.frequencyData = null;
    this.onFrequencyData = null;
    this.onProgress = null;
    this.onEnded = null;
    this.pauseOffset = 0;
    this.startTime = 0;
  }
}
