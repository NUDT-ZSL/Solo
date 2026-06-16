export interface AudioPeakData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface AudioAnalysisResult {
  peaks: number[];
  duration: number;
  sampleRate: number;
  frequencyData: Uint8Array;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode = this.audioContext.createGain();
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  public async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioPeakData> {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const buffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;

    const peaks = this.extractPeaks(channelData, 1000);

    return { peaks, duration, sampleRate };
  }

  private extractPeaks(channelData: Float32Array, numPeaks: number): number[] {
    const peaks: number[] = [];
    const blockSize = Math.floor(channelData.length / numPeaks);

    for (let i = 0; i < numPeaks; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let max = 0;

      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }

      peaks.push(max);
    }

    return peaks;
  }

  public calculateFadeCurve(
    duration: number,
    fadeIn: number,
    fadeOut: number,
    sampleRate: number
  ): number[] {
    const totalSamples = Math.floor(duration * sampleRate);
    const fadeInSamples = Math.floor(fadeIn * sampleRate);
    const fadeOutSamples = Math.floor(fadeOut * sampleRate);
    const curve: number[] = new Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      let gain = 1;

      if (i < fadeInSamples) {
        gain = i / fadeInSamples;
        gain = this.applyEasing(gain);
      } else if (i > totalSamples - fadeOutSamples) {
        gain = (totalSamples - i) / fadeOutSamples;
        gain = this.applyEasing(gain);
      }

      curve[i] = gain;
    }

    return curve;
  }

  private applyEasing(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public timestampToPosition(timestamp: number, totalDuration: number): number {
    return Math.min(Math.max(timestamp / totalDuration, 0), 1) * 100;
  }

  public positionToTimestamp(position: number, totalDuration: number): number {
    return (position / 100) * totalDuration;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(128);
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public async loadAudio(url: string): Promise<void> {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  public play(offset: number = 0): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) {
      return;
    }

    if (this.isPlaying) {
      this.stop();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);

    const startOffset = this.pauseTime > 0 ? this.pauseTime : offset;
    this.source.start(0, startOffset);
    this.startTime = this.audioContext.currentTime - startOffset;
    this.isPlaying = true;

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
      }
    };
  }

  public pause(): void {
    if (!this.isPlaying || !this.audioContext || !this.source) {
      return;
    }

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.isPlaying = false;
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  public getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  public applyFadeGain(fadeIn: number, fadeOut: number, currentTime: number, duration: number): void {
    if (!this.gainNode) return;

    let gain = 1;

    if (currentTime < fadeIn) {
      gain = currentTime / fadeIn;
      gain = this.applyEasing(gain);
    } else if (currentTime > duration - fadeOut) {
      gain = (duration - currentTime) / fadeOut;
      gain = this.applyEasing(gain);
    }

    this.gainNode.gain.setTargetAtTime(gain, this.audioContext?.currentTime || 0, 0.01);
  }

  public async analyzeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioAnalysisResult> {
    const peakData = await this.decodeAudio(arrayBuffer);
    return {
      ...peakData,
      frequencyData: this.getFrequencyData()
    };
  }

  public destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getAverageFrequency(frequencyData: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }
  return sum / frequencyData.length;
}

export function frequencyToColor(frequency: number, maxFrequency: number = 255): string {
  const ratio = frequency / maxFrequency;
  const hue = 200 + ratio * 160;
  return `hsl(${hue}, 80%, 50%)`;
}
