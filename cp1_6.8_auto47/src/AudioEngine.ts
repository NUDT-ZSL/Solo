const FFT_SIZE = 256;
const VOLUME_THRESHOLD = 0.08;
const KEYBOARD_PULSE_FREQ = 440;
const KEYBOARD_PULSE_AMP = 0.6;

type AudioCallback = (frequency: number, volume: number, spectrum: number[]) => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number = 0;
  private isRunning: boolean = false;
  private onAudioData: AudioCallback | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

  async start(callback: AudioCallback): Promise<boolean> {
    if (this.isRunning) return true;
    this.onAudioData = callback;

    try {
      this.audioContext = new AudioContext();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.frequencyData = new Uint8Array(bufferLength);

      this.isRunning = true;
      this.analyze();

      this.keyDownHandler = (e: KeyboardEvent) => {
        if (e.repeat) return;
        this.onAudioData?.(KEYBOARD_PULSE_FREQ, KEYBOARD_PULSE_AMP, []);
      };
      window.addEventListener('keydown', this.keyDownHandler);

      return true;
    } catch {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.frequencyData = new Uint8Array(bufferLength);

      this.isRunning = true;
      this.analyze();

      this.keyDownHandler = (e: KeyboardEvent) => {
        if (e.repeat) return;
        this.onAudioData?.(KEYBOARD_PULSE_FREQ, KEYBOARD_PULSE_AMP, []);
      };
      window.addEventListener('keydown', this.keyDownHandler);

      return false;
    }
  }

  private analyze() {
    if (!this.isRunning || !this.analyser || !this.dataArray || !this.frequencyData) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.dataArray);

    const volume = this.computeRMS();
    const dominantFreq = this.computeDominantFrequency();
    const spectrum = Array.from(this.frequencyData).map((v) => v / 255);

    if (volume > VOLUME_THRESHOLD) {
      this.onAudioData?.(dominantFreq, volume, spectrum);
    }

    this.animationFrame = requestAnimationFrame(() => this.analyze());
  }

  private computeRMS(): number {
    if (!this.dataArray) return 0;
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / this.dataArray.length);
  }

  private computeDominantFrequency(): number {
    if (!this.frequencyData || !this.audioContext || !this.analyser) return 0;
    let maxVal = 0;
    let maxIndex = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxVal) {
        maxVal = this.frequencyData[i];
        maxIndex = i;
      }
    }
    const nyquist = this.audioContext.sampleRate / 2;
    return (maxIndex / this.frequencyData.length) * nyquist;
  }

  static frequencyToColor(freq: number): [number, number, number] {
    const minFreq = 80;
    const maxFreq = 4000;
    const t = Math.min(1, Math.max(0, (freq - minFreq) / (maxFreq - minFreq)));

    const r = Math.max(0, 1 - t * 2.5);
    const g = t < 0.3 ? t * 2 : t > 0.7 ? (1 - t) * 1.5 : 0.4;
    const b = Math.min(1, t * 2);

    return [r, g, b];
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
    this.frequencyData = null;
    this.onAudioData = null;
  }
}
