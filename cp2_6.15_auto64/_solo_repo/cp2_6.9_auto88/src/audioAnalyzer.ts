export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(2048);
  private isPlaying: boolean = false;

  constructor() {}

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  async loadFromFile(file: File): Promise<void> {
    this.stop();
    this.ensureContext();

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

    this.source = this.audioContext!.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(this.analyser!);
    this.source.onended = () => {
      this.isPlaying = false;
    };

    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    this.source.start();
    this.isPlaying = true;
  }

  async loadFromSample(sampleIndex: number): Promise<void> {
    this.stop();
    this.ensureContext();

    const duration = 8;
    const sampleRate = this.audioContext!.sampleRate;
    const length = duration * sampleRate;
    const audioBuffer = this.audioContext!.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;

        if (sampleIndex === 0) {
          const freq1 = 110 * Math.pow(2, (sampleIndex * 3) / 12);
          const freq2 = 220 * Math.pow(2, (sampleIndex * 5) / 12);
          const freq3 = 440 * Math.pow(2, (sampleIndex * 7) / 12);
          sample = Math.sin(2 * Math.PI * freq1 * t) * 0.3
            + Math.sin(2 * Math.PI * freq2 * t) * 0.2
            + Math.sin(2 * Math.PI * freq3 * t) * 0.15
            + Math.sin(2 * Math.PI * 880 * t) * 0.1;
          sample *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t);
        } else if (sampleIndex === 1) {
          for (let h = 1; h <= 8; h++) {
            sample += Math.sin(2 * Math.PI * 130.81 * h * t) / h * 0.15;
          }
          sample *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
        } else {
          const beat = Math.floor(t * 4) % 4;
          if (beat === 0 || beat === 2) {
            sample = Math.sin(2 * Math.PI * 60 * t) * 0.6;
            sample = Math.tanh(sample * 3) * 0.4;
          }
          sample += Math.sin(2 * Math.PI * 440 * Math.pow(2, Math.floor(t * 2) % 4 / 12) * t) * 0.2;
          sample += Math.sin(2 * Math.PI * 880 * Math.pow(2, Math.floor(t * 4) % 8 / 12) * t) * 0.1;
        }

        const envelope = Math.sin(Math.PI * t / duration);
        channelData[i] = sample * envelope * 0.5;
      }
    }

    this.source = this.audioContext!.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(this.analyser!);
    this.source.loop = true;
    this.source.onended = () => {
      this.isPlaying = false;
    };

    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    this.source.start();
    this.isPlaying = true;
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  getBands(): { low: number; mid: number; high: number } {
    const data = this.getFrequencyData();
    const nyquist = this.audioContext ? this.audioContext.sampleRate / 2 : 22050;
    const binWidth = nyquist / data.length;

    const lowEnd = Math.floor(200 / binWidth);
    const midEnd = Math.floor(2000 / binWidth);
    const highEnd = Math.floor(20000 / binWidth);

    let lowSum = 0, lowCount = 0;
    let midSum = 0, midCount = 0;
    let highSum = 0, highCount = 0;

    for (let i = 0; i < Math.min(lowEnd, data.length); i++) {
      lowSum += data[i];
      lowCount++;
    }
    for (let i = lowEnd; i < Math.min(midEnd, data.length); i++) {
      midSum += data[i];
      midCount++;
    }
    for (let i = midEnd; i < Math.min(highEnd, data.length); i++) {
      highSum += data[i];
      highCount++;
    }

    return {
      low: lowCount > 0 ? lowSum / lowCount / 255 : 0,
      mid: midCount > 0 ? midSum / midCount / 255 : 0,
      high: highCount > 0 ? highSum / highCount / 255 : 0
    };
  }

  getSpectrumBands(count: number): number[] {
    const data = this.getFrequencyData();
    const bands: number[] = [];
    const binCount = data.length;
    const bandSize = Math.floor(binCount / count);

    for (let i = 0; i < count; i++) {
      let sum = 0;
      const start = i * bandSize;
      const end = Math.min(start + bandSize, binCount);
      for (let j = start; j < end; j++) {
        sum += data[j];
      }
      bands.push((end > start) ? sum / (end - start) / 255 : 0);
    }
    return bands;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (_e) {
        // ignore if already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
