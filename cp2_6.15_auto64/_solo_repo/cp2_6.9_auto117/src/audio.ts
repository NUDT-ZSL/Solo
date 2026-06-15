export interface AudioState {
  frequency: number | null;
  isRecording: boolean;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Float32Array | null = null;
  private lastFrequency: number | null = null;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 100;
  private readonly MIN_FREQ = 300;
  private readonly MAX_FREQ = 800;

  async startRecording(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.dataArray = new Float32Array(this.analyser.fftSize);
      this.lastFrequency = null;
      return true;
    } catch (err) {
      console.error('麦克风访问失败:', err);
      return false;
    }
  }

  stopRecording(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.lastFrequency = null;
  }

  getFrequency(): number | null {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
      return this.lastFrequency;
    }
    this.lastUpdateTime = now;

    if (!this.analyser || !this.dataArray || !this.audioContext) {
      this.lastFrequency = null;
      return null;
    }

    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);
    const freq = this.autocorrelate(this.dataArray, this.audioContext.sampleRate);

    if (freq !== -1 && freq >= this.MIN_FREQ && freq <= this.MAX_FREQ) {
      this.lastFrequency = Math.round(freq);
    } else {
      this.lastFrequency = null;
    }
    return this.lastFrequency;
  }

  private autocorrelate(buf: Float32Array, sampleRate: number): number {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1;
    const threshold = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < threshold) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
    }

    const trimmed = buf.slice(r1, r2);
    const trimmedSize = trimmed.length;
    const c = new Array(trimmedSize).fill(0);
    for (let i = 0; i < trimmedSize; i++) {
      for (let j = 0; j < trimmedSize - i; j++) {
        c[i] = c[i] + trimmed[j] * trimmed[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < trimmedSize; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    if (T0 === 0) return -1;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  getMinFreq(): number { return this.MIN_FREQ; }
  getMaxFreq(): number { return this.MAX_FREQ; }
}
