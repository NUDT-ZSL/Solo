export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
  volume: number;
}

export class AudioController {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array | null = null;
  private _isPlaying = false;
  private _hasAudio = false;
  private _volume = 0.8;

  constructor() {}

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get hasAudio(): boolean {
    return this._hasAudio;
  }

  async loadFile(file: File): Promise<void> {
    if (!file.type.startsWith('audio/') && 
        !file.name.toLowerCase().endsWith('.mp3') && 
        !file.name.toLowerCase().endsWith('.wav')) {
      throw new Error('请上传 MP3 或 WAV 格式的音频文件');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('文件大小不能超过 10MB');
    }

    this.stop();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this._volume;
      this.gainNode.connect(this.audioContext.destination);
      this.analyser.connect(this.gainNode);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this._hasAudio = true;
  }

  play(): void {
    if (!this.audioContext || !this.analyser || !this.audioBuffer) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stop();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.source.onended = () => {
      this._isPlaying = false;
    };
    this.source.start(0);
    this._isPlaying = true;
  }

  pause(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this._isPlaying = false;
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
    this._isPlaying = false;
  }

  setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(100, value)) / 100;
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume;
    }
  }

  getFrequencyData(): FrequencyData {
    if (!this.analyser || !this.frequencyData || !this._isPlaying) {
      return { low: 0, mid: 0, high: 0, volume: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    const bins = this.frequencyData;
    const totalBins = bins.length;

    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    const binFreq = sampleRate / (this.analyser.fftSize ?? 256);

    const lowEnd = Math.min(totalBins, Math.ceil(250 / binFreq));
    const midEnd = Math.min(totalBins, Math.ceil(2000 / binFreq));

    let lowSum = 0;
    let lowCount = 0;
    for (let i = 0; i < lowEnd; i++) {
      lowSum += bins[i];
      lowCount++;
    }

    let midSum = 0;
    let midCount = 0;
    for (let i = lowEnd; i < midEnd; i++) {
      midSum += bins[i];
      midCount++;
    }

    let highSum = 0;
    let highCount = 0;
    for (let i = midEnd; i < totalBins; i++) {
      highSum += bins[i];
      highCount++;
    }

    let totalSum = 0;
    for (let i = 0; i < totalBins; i++) {
      totalSum += bins[i];
    }

    const normalize = (sum: number, count: number): number => {
      if (count === 0) return 0;
      return Math.min(1, (sum / count) / 255);
    };

    return {
      low: normalize(lowSum, lowCount),
      mid: normalize(midSum, midCount),
      high: normalize(highSum, highCount),
      volume: Math.min(1, (totalSum / totalBins) / 255)
    };
  }
}
