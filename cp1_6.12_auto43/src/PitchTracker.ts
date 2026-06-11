import Pitchfinder from 'pitchfinder';

export interface PitchData {
  time: number;
  pitch: number;
  confidence: number;
}

export type PitchCallback = (data: PitchData) => void;

export class PitchTracker {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private detectPitch: ((float32AudioBuffer: Float32Array) => number | null) | null = null;
  private callback: PitchCallback | null = null;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private bufferSize: number = 2048;

  constructor() {}

  async start(callback: PitchCallback): Promise<void> {
    if (this.isRunning) return;

    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize * 2;

      this.source.connect(this.analyser);

      this.detectPitch = Pitchfinder.YIN({
        sampleRate: this.audioContext.sampleRate,
        threshold: 0.1,
        probabilityThreshold: 0.1
      });

      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.bufferSize,
        1,
        1
      );

      this.callback = callback;
      this.startTime = this.audioContext.currentTime;
      this.isRunning = true;

      this.scriptProcessor.onaudioprocess = this.handleAudioProcess.bind(this);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

    } catch (error) {
      console.error('PitchTracker start error:', error);
      this.cleanup();
      throw error;
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.detectPitch || !this.analyser || !this.audioContext || !this.callback) return;

    const inputData = new Float32Array(this.bufferSize);
    event.inputBuffer.copyFromChannel(inputData, 0);

    let rms = 0;
    for (let i = 0; i < inputData.length; i++) {
      rms += inputData[i] * inputData[i];
    }
    rms = Math.sqrt(rms / inputData.length);

    const confidence = Math.min(1, rms * 3);
    if (confidence < 0.05) return;

    const pitch = this.detectPitch(inputData);
    const time = this.audioContext.currentTime - this.startTime;

    if (pitch !== null && pitch > 80 && pitch < 2000) {
      this.callback({
        time,
        pitch,
        confidence
      });
    }
  }

  stop(): void {
    this.isRunning = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.callback = null;
    this.detectPitch = null;
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate ?? 44100;
  }

  destroy(): void {
    this.stop();
  }
}
