export interface FrequencyBands {
  low: number;
  mid: number;
  high: number;
}

export interface SpectrumData {
  bands: FrequencyBands;
  rawData: Uint8Array;
  bars: number[];
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private sampleRate: number = 44100;
  private fftSize: number = 2048;
  private barCount: number = 32;

  public get audio(): HTMLAudioElement | null {
    return this.audioElement;
  }

  public get isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  public get currentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  public get duration(): number {
    return this.audioElement ? this.audioElement.duration || 0 : 0;
  }

  public init(): void {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.85;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
    this.sampleRate = this.audioContext.sampleRate;
  }

  public async loadFile(file: File): Promise<void> {
    this.init();

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = URL.createObjectURL(file);

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    await this.audioElement.load();

    if (this.audioContext && this.analyser && this.gainNode) {
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  public async play(): Promise<void> {
    if (!this.audioElement) return;

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    await this.audioElement.play();
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(time: number): void {
    if (this.audioElement && this.audioElement.duration) {
      this.audioElement.currentTime = Math.max(0, Math.min(time, this.audioElement.duration));
    }
  }

  public getSpectrum(): SpectrumData {
    if (!this.analyser || !this.frequencyData || !this.timeData) {
      return {
        bands: { low: 0, mid: 0, high: 0 },
        rawData: new Uint8Array(),
        bars: new Array(this.barCount).fill(0)
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);

    const bands = this.calculateFrequencyBands();
    const bars = this.calculateBars();

    return {
      bands,
      rawData: this.frequencyData.slice(),
      bars
    };
  }

  private calculateFrequencyBands(): FrequencyBands {
    if (!this.analyser || !this.frequencyData) {
      return { low: 0, mid: 0, high: 0 };
    }

    const nyquist = this.sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;

    const lowStart = this.freqToBin(20, nyquist, binCount);
    const lowEnd = this.freqToBin(250, nyquist, binCount);
    const midStart = lowEnd;
    const midEnd = this.freqToBin(2000, nyquist, binCount);
    const highStart = midEnd;
    const highEnd = this.freqToBin(20000, nyquist, binCount);

    const lowAvg = this.averageRange(this.frequencyData, lowStart, Math.min(lowEnd, binCount - 1));
    const midAvg = this.averageRange(this.frequencyData, midStart, Math.min(midEnd, binCount - 1));
    const highAvg = this.averageRange(this.frequencyData, highStart, Math.min(highEnd, binCount - 1));

    return {
      low: lowAvg / 255,
      mid: midAvg / 255,
      high: highAvg / 255
    };
  }

  private calculateBars(): number[] {
    if (!this.analyser || !this.frequencyData) {
      return new Array(this.barCount).fill(0);
    }

    const bars: number[] = [];
    const binCount = this.analyser.frequencyBinCount;
    const maxBin = this.freqToBin(16000, this.sampleRate / 2, binCount);

    const barsLog = true;

    for (let i = 0; i < this.barCount; i++) {
      let startBin: number;
      let endBin: number;

      if (barsLog) {
        const freqStart = 20 * Math.pow(16000 / 20, i / this.barCount);
        const freqEnd = 20 * Math.pow(16000 / 20, (i + 1) / this.barCount);
        startBin = this.freqToBin(freqStart, this.sampleRate / 2, binCount);
        endBin = this.freqToBin(freqEnd, this.sampleRate / 2, binCount);
      } else {
        startBin = Math.floor((i / this.barCount) * maxBin);
        endBin = Math.floor(((i + 1) / this.barCount) * maxBin);
      }

      startBin = Math.max(0, Math.min(startBin, binCount - 1));
      endBin = Math.max(startBin + 1, Math.min(endBin, binCount - 1));

      const avg = this.averageRange(this.frequencyData, startBin, endBin);
      bars.push(avg / 255);
    }

    return bars;
  }

  private freqToBin(freq: number, nyquist: number, binCount: number): number {
    return Math.floor((freq / nyquist) * binCount);
  }

  private averageRange(data: Uint8Array<ArrayBufferLike>, start: number, end: number): number {
    if (start >= end) return 0;

    let sum = 0;
    const count = end - start;

    for (let i = start; i < end; i++) {
      sum += data[i];
    }

    return sum / count;
  }

  public dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

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

    this.frequencyData = null;
    this.timeData = null;
  }
}
