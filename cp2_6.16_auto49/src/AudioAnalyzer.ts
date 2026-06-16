export interface AudioAnalyzerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private fftSize: number;
  private lastFftUpdate: number = 0;
  private readonly FFT_INTERVAL: number = 38;

  constructor(options: AudioAnalyzerOptions = {}) {
    this.fftSize = options.fftSize ?? 256;
    this.frequencyData = new Uint8Array(this.fftSize / 2);
    this.timeDomainData = new Uint8Array(this.fftSize / 2);
  }

  connect(audioElement: HTMLAudioElement): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.82;
    }

    if (!this.audioSource) {
      this.audioSource = this.audioContext.createMediaElementSource(audioElement);
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
  }

  getFrequencyData(): Uint8Array {
    const now = performance.now();
    if (this.analyser && now - this.lastFftUpdate >= this.FFT_INTERVAL) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.lastFftUpdate = now;
    }
    return this.frequencyData;
  }

  getLastFftInterval(): number {
    return this.FFT_INTERVAL;
  }

  getFrequencyDataNormalized(count: number): number[] {
    const freq = this.getFrequencyData();
    const result: number[] = new Array(count).fill(0);

    if (freq.length === 0) return result;

    const usableEnd = Math.floor(freq.length * 0.7);
    const step = usableEnd / count;

    for (let i = 0; i < count; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.floor((i + 1) * step);
      let sum = 0;
      let cnt = 0;

      for (let j = startIdx; j < endIdx && j < freq.length; j++) {
        sum += freq[j];
        cnt++;
      }

      result[i] = cnt > 0 ? sum / cnt / 255 : 0;
    }

    return result;
  }

  getTimeDomainData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    }
    return this.timeDomainData;
  }

  getAverageVolume(): number {
    const freq = this.getFrequencyData();
    if (freq.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < freq.length; i++) {
      sum += freq[i];
    }
    return sum / freq.length / 255;
  }

  getBassVolume(): number {
    const freq = this.getFrequencyData();
    if (freq.length === 0) return 0;
    const bassEnd = Math.floor(freq.length * 0.15);
    let sum = 0;
    for (let i = 0; i < bassEnd; i++) {
      sum += freq[i];
    }
    return sum / bassEnd / 255;
  }

  dispose(): void {
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
