export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array;
  private waveformData: Uint8Array;
  private fftSize: number = 256;
  private gain: number = 1;

  constructor() {
    this.frequencyData = new Uint8Array(this.fftSize / 2);
    this.waveformData = new Uint8Array(this.fftSize);
  }

  async init(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.gain;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Uint8Array(this.analyser.fftSize);
    } catch (error) {
      console.error('麦克风授权失败:', error);
      throw error;
    }
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return this.frequencyData;
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return this.waveformData;
    this.analyser.getByteTimeDomainData(this.waveformData as Uint8Array<ArrayBuffer>);
    return this.waveformData;
  }

  getVolume(): number {
    const data = this.getWaveformData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  getFrequencyBins(): number {
    return this.analyser ? this.analyser.frequencyBinCount : this.fftSize / 2;
  }

  setGain(value: number): void {
    this.gain = Math.max(0, Math.min(2, value));
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this.gain, this.audioContext!.currentTime, 0.1);
    }
  }

  getGain(): number {
    return this.gain;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.source = null;
  }
}
