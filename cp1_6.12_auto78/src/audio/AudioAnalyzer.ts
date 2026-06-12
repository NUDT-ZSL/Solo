export interface AudioFeatures {
  volume: number;
  normalizedFrequency: Float32Array;
  dominantFrequency: number;
  isLowEnergy: boolean;
  lowEnergyDuration: number;
  highFreqEnergy: number;
  midFreqEnergy: number;
  lowFreqEnergy: number;
  fullSpectrumEnergy: number;
}

export interface FrequencyBand {
  label: string;
  minHz: number;
  maxHz: number;
  minBin: number;
  maxBin: number;
}

const ANALYSIS_FPS = 30;
const FFT_SIZE = 2048;
const LOW_ENERGY_THRESHOLD = 0.1;
const LOW_ENERGY_TIMEOUT = 10;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);
  private sampleRate: number = 44100;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / ANALYSIS_FPS;
  private lowEnergyStart: number = 0;
  private _isLowEnergy: boolean = false;
  private _lowEnergyDuration: number = 0;
  private micActive: boolean = false;

  readonly frequencyBands: FrequencyBand[] = [
    { label: 'butterfly', minHz: 800, maxHz: 2000, minBin: 0, maxBin: 0 },
    { label: 'bee', minHz: 400, maxHz: 800, minBin: 0, maxBin: 0 },
    { label: 'beetle', minHz: 100, maxHz: 400, minBin: 0, maxBin: 0 },
    { label: 'firefly', minHz: 0, maxHz: 0, minBin: 0, maxBin: 0 },
  ];

  async init(): Promise<boolean> {
    try {
      this.audioContext = new AudioContext();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -10;

      this.source.connect(this.analyser);

      this.sampleRate = this.audioContext.sampleRate;
      const binCount = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(binCount);
      this.timeDomainData = new Uint8Array(binCount);

      this.computeBandBins();
      this.micActive = true;
      return true;
    } catch (e) {
      console.error('AudioAnalyzer init failed:', e);
      this.micActive = false;
      return false;
    }
  }

  private computeBandBins(): void {
    if (!this.analyser) return;
    const binCount = this.analyser.frequencyBinCount;
    const hzPerBin = this.sampleRate / (FFT_SIZE);

    for (const band of this.frequencyBands) {
      if (band.label === 'firefly') {
        band.minBin = 0;
        band.maxBin = binCount - 1;
      } else {
        band.minBin = Math.max(0, Math.floor(band.minHz / hzPerBin));
        band.maxBin = Math.min(binCount - 1, Math.ceil(band.maxHz / hzPerBin));
      }
    }
  }

  update(time: number): AudioFeatures {
    const defaultFeatures: AudioFeatures = {
      volume: 0,
      normalizedFrequency: new Float32Array(0),
      dominantFrequency: 0,
      isLowEnergy: false,
      lowEnergyDuration: 0,
      highFreqEnergy: 0,
      midFreqEnergy: 0,
      lowFreqEnergy: 0,
      fullSpectrumEnergy: 0,
    };

    if (!this.analyser || !this.micActive) return defaultFeatures;

    if (time - this.lastUpdateTime < this.updateInterval) {
      return defaultFeatures;
    }
    this.lastUpdateTime = time;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const volume = this.computeVolume();
    const normalizedFrequency = this.computeNormalizedFrequency();
    const dominantFrequency = this.computeDominantFrequency();
    const bandEnergies = this.computeBandEnergies();

    this.updateLowEnergyState(volume, time);

    return {
      volume,
      normalizedFrequency,
      dominantFrequency,
      isLowEnergy: this._isLowEnergy,
      lowEnergyDuration: this._lowEnergyDuration,
      highFreqEnergy: bandEnergies.high,
      midFreqEnergy: bandEnergies.mid,
      lowFreqEnergy: bandEnergies.low,
      fullSpectrumEnergy: bandEnergies.full,
    };
  }

  private computeVolume(): number {
    let sum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const v = (this.timeDomainData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.timeDomainData.length);
    return Math.min(1.0, rms * 3.0);
  }

  private computeNormalizedFrequency(): Float32Array {
    const len = this.frequencyData.length;
    const normalized = new Float32Array(len);

    for (let i = 0; i < len; i++) {
      normalized[i] = this.frequencyData[i] / 255.0;
    }

    return normalized;
  }

  private computeDominantFrequency(): number {
    let maxVal = 0;
    let maxIdx = 0;
    for (let i = 1; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxVal) {
        maxVal = this.frequencyData[i];
        maxIdx = i;
      }
    }
    const hzPerBin = this.sampleRate / FFT_SIZE;
    return maxIdx * hzPerBin;
  }

  private computeBandEnergies(): { high: number; mid: number; low: number; full: number } {
    const computeBandEnergy = (band: FrequencyBand): number => {
      if (!this.analyser) return 0;
      let sum = 0;
      let count = 0;
      for (let i = band.minBin; i <= band.maxBin; i++) {
        sum += this.frequencyData[i] / 255.0;
        count++;
      }
      return count > 0 ? sum / count : 0;
    };

    return {
      high: computeBandEnergy(this.frequencyBands[0]),
      mid: computeBandEnergy(this.frequencyBands[1]),
      low: computeBandEnergy(this.frequencyBands[2]),
      full: computeBandEnergy(this.frequencyBands[3]),
    };
  }

  private updateLowEnergyState(volume: number, time: number): void {
    if (volume < LOW_ENERGY_THRESHOLD) {
      if (this.lowEnergyStart === 0) {
        this.lowEnergyStart = time;
      }
      this._lowEnergyDuration = (time - this.lowEnergyStart) / 1000;
      if (this._lowEnergyDuration >= LOW_ENERGY_TIMEOUT) {
        this._isLowEnergy = true;
      }
    } else {
      this.lowEnergyStart = 0;
      this._lowEnergyDuration = 0;
      this._isLowEnergy = false;
    }
  }

  getRawFrequencyData(): Uint8Array {
    return this.frequencyData;
  }

  getTimeDomainData(): Uint8Array {
    return this.timeDomainData;
  }

  getIsLowEnergy(): boolean {
    return this._isLowEnergy;
  }

  destroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.micActive = false;
  }
}
