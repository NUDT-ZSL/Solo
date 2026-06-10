export interface AudioFeatures {
  volume: number;
  lowFrequency: number;
  midFrequency: number;
  highFrequency: number;
  spectralCentroid: number;
  energy: number;
}

type AudioCallback = (features: AudioFeatures) => void;

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private sampleIntervalId: number | null = null;
  private callback: AudioCallback | null = null;
  private isInitialized: boolean = false;

  constructor() {}

  async init(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('麦克风API不可用');
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(new ArrayBuffer(bufferLength));
      this.timeDomainData = new Uint8Array(new ArrayBuffer(bufferLength));

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      return false;
    }
  }

  startSampling(callback: AudioCallback): void {
    if (!this.isInitialized || !this.analyser) {
      console.warn('音频管理器未初始化');
      return;
    }

    this.callback = callback;

    if (this.sampleIntervalId !== null) {
      this.stopSampling();
    }

    this.sampleIntervalId = window.setInterval(() => {
      this.analyze();
    }, 50);
  }

  stopSampling(): void {
    if (this.sampleIntervalId !== null) {
      clearInterval(this.sampleIntervalId);
      this.sampleIntervalId = null;
    }
  }

  private analyze(): void {
    if (!this.analyser || !this.frequencyData || !this.timeDomainData || !this.callback) {
      return;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const bufferLength = this.frequencyData.length;
    const nyquist = (this.audioContext?.sampleRate ?? 44100) / 2;

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalEnergy = 0;
    let weightedSum = 0;

    const lowEnd = Math.floor(bufferLength * 0.1);
    const midEnd = Math.floor(bufferLength * 0.5);

    for (let i = 0; i < bufferLength; i++) {
      const value = this.frequencyData[i];
      totalEnergy += value;

      const freq = (i / bufferLength) * nyquist;
      weightedSum += freq * value;

      if (i < lowEnd) {
        lowSum += value;
      } else if (i < midEnd) {
        midSum += value;
      } else {
        highSum += value;
      }
    }

    const lowCount = lowEnd;
    const midCount = midEnd - lowEnd;
    const highCount = bufferLength - midEnd;

    const lowFrequency = this.normalize(lowSum / Math.max(lowCount, 1));
    const midFrequency = this.normalize(midSum / Math.max(midCount, 1));
    const highFrequency = this.normalize(highSum / Math.max(highCount, 1));
    const energy = this.normalize(totalEnergy / bufferLength);

    const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;
    const normalizedCentroid = Math.min(spectralCentroid / (nyquist / 2), 1);

    let volumeSum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const v = (this.timeDomainData[i] - 128) / 128;
      volumeSum += v * v;
    }
    const rms = Math.sqrt(volumeSum / this.timeDomainData.length);
    const volume = Math.min(rms * 3, 1);

    this.callback({
      volume,
      lowFrequency,
      midFrequency,
      highFrequency,
      spectralCentroid: normalizedCentroid,
      energy
    });
  }

  private normalize(value: number): number {
    return Math.min(Math.max(value / 255, 0), 1);
  }

  destroy(): void {
    this.stopSampling();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.frequencyData = null;
    this.timeDomainData = null;
    this.callback = null;
    this.isInitialized = false;
  }
}
