import WorkerManager from './worker-manager';

type AudioDataCallback = (bands: Uint8Array, volume: number) => void;

class AudioCapture {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private capturing = false;
  private workerManager: WorkerManager;
  private onDataCallback: AudioDataCallback | null = null;
  private frequencyRange: string = 'full';

  constructor(workerManager: WorkerManager) {
    this.workerManager = workerManager;
  }

  setFrequencyRange(range: string): void {
    this.frequencyRange = range;
    this.workerManager.setRange(range);
  }

  onAudioData(callback: AudioDataCallback): void {
    this.onDataCallback = callback;
  }

  async start(): Promise<void> {
    if (this.capturing) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 44100 });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.6;

      this.source.connect(this.analyser);

      this.capturing = true;
      this.loop();
    } catch (err) {
      console.error('Microphone access denied:', err);
      throw err;
    }
  }

  stop(): void {
    this.capturing = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }

  isCapturing(): boolean {
    return this.capturing;
  }

  private loop(): void {
    if (!this.capturing || !this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const timeDomainData = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(timeDomainData);

    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const v = (timeDomainData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeDomainData.length);
    const volume = Math.min(1, rms * 3);

    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    const copy = new Uint8Array(timeDomainData);

    this.workerManager.dispatch(copy, sampleRate, this.frequencyRange, (bands) => {
      if (this.onDataCallback) {
        this.onDataCallback(bands, volume);
      }
    });

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  destroy(): void {
    this.stop();
    this.onDataCallback = null;
  }
}

export default AudioCapture;
