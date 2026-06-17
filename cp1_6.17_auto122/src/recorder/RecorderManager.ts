export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecorderOptions {
  sampleRate?: number;
  maxDurationSec?: number;
  mimeType?: string;
}

export class RecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private state: RecorderState = 'idle';
  private startTime = 0;
  private durationTimer: number | null = null;
  private realtimeTimer: number | null = null;
  private maxDurationSec: number;
  private sampleRate: number;
  private mimeType: string;
  private audioContextSampleRate = 44100;

  public onDataAvailable: ((chunk: Blob) => void) | null = null;
  public onRealtimeData: ((dataArray: Float32Array, sampleRate: number) => void) | null = null;
  public onStop: ((blob: Blob, durationSec: number) => void) | null = null;
  public onDurationUpdate: ((durationSec: number) => void) | null = null;
  public onStateChange: ((state: RecorderState) => void) | null = null;
  public onError: ((error: Error) => void) | null = null;

  constructor(options: RecorderOptions = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.maxDurationSec = options.maxDurationSec ?? 120;
    this.mimeType = options.mimeType ?? this.getPreferredMimeType();
  }

  private getPreferredMimeType(): string {
    const types = [
      'audio/webm;codecs=pcm',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=pcm',
      'audio/ogg',
      '',
    ];
    for (const type of types) {
      if (type === '' || (window.MediaRecorder && MediaRecorder.isTypeSupported(type))) {
        return type;
      }
    }
    return '';
  }

  public isRecording(): boolean {
    return this.state === 'recording';
  }

  public isPaused(): boolean {
    return this.state === 'paused';
  }

  public getState(): RecorderState {
    return this.state;
  }

  public getDurationSec(): number {
    if (this.state === 'idle') return 0;
    return (performance.now() - this.startTime) / 1000;
  }

  private setState(newState: RecorderState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  public async start(): Promise<void> {
    if (this.state === 'recording') {
      throw new Error('Recorder is already recording');
    }

    try {
      this.cleanup();
      this.chunks = [];

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
      this.audioContextSampleRate = this.audioContext.sampleRate;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;
      source.connect(this.analyser);

      const recorderOptions: MediaRecorderOptions = {};
      if (this.mimeType) {
        recorderOptions.mimeType = this.mimeType;
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
          this.onDataAvailable?.(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
        const duration = this.getDurationSec();
        this.onStop?.(blob, duration);
      };

      this.mediaRecorder.onerror = (e) => {
        const error = new Error(`MediaRecorder error: ${(e as unknown as { error?: Error }).error?.message ?? 'Unknown'}`);
        this.onError?.(error);
      };

      this.startTime = performance.now();
      this.mediaRecorder.start(100);

      this.startRealtimeCapture();
      this.startDurationCheck();
      this.setState('recording');
    } catch (err) {
      this.cleanup();
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      throw error;
    }
  }

  private startRealtimeCapture(): void {
    if (this.realtimeTimer !== null) {
      cancelAnimationFrame(this.realtimeTimer);
    }

    let lastFrameTime = 0;
    const frameInterval = 1000 / 30;

    const captureFrame = () => {
      if (this.state !== 'recording' && this.state !== 'paused') {
        this.realtimeTimer = null;
        return;
      }

      const now = performance.now();
      if (now - lastFrameTime >= frameInterval && this.analyser) {
        lastFrameTime = now;
        if (this.state === 'recording') {
          const bufferLength = this.analyser.fftSize;
          const dataArray = new Float32Array(bufferLength);
          this.analyser.getFloatTimeDomainData(dataArray);
          this.onRealtimeData?.(dataArray, this.audioContextSampleRate);
        }
      }

      this.realtimeTimer = requestAnimationFrame(captureFrame);
    };

    this.realtimeTimer = requestAnimationFrame(captureFrame);
  }

  private startDurationCheck(): void {
    if (this.durationTimer !== null) {
      window.clearInterval(this.durationTimer);
    }

    this.durationTimer = window.setInterval(() => {
      const duration = this.getDurationSec();
      this.onDurationUpdate?.(duration);
      if (duration >= this.maxDurationSec && this.state === 'recording') {
        void this.stop();
      }
    }, 100);
  }

  public pause(): void {
    if (this.state !== 'recording') return;
    this.mediaRecorder?.pause();
    this.setState('paused');
  }

  public resume(): void {
    if (this.state !== 'paused') return;
    this.mediaRecorder?.resume();
    this.setState('recording');
  }

  public async stop(): Promise<Blob> {
    if (this.state === 'idle' || this.state === 'stopped') {
      throw new Error('Recorder is not recording');
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.mediaRecorder) {
          reject(new Error('No active MediaRecorder'));
          return;
        }

        const handleStop = (blob: Blob, durationSec: number) => {
          const finalBlob = blob;
          this.cleanupTimers();
          this.setState('stopped');
          resolve(finalBlob);
          void durationSec;
        };

        const originalOnStop = this.onStop;
        this.onStop = (blob, duration) => {
          this.onStop = originalOnStop;
          originalOnStop?.(blob, duration);
          handleStop(blob, duration);
        };

        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        } else {
          const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
          handleStop(blob, this.getDurationSec());
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private cleanupTimers(): void {
    if (this.durationTimer !== null) {
      window.clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.realtimeTimer !== null) {
      cancelAnimationFrame(this.realtimeTimer);
      this.realtimeTimer = null;
    }
  }

  private cleanup(): void {
    this.cleanupTimers();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
    this.setState('idle');
  }

  public destroy(): void {
    this.cleanup();
    this.chunks = [];
    this.onDataAvailable = null;
    this.onRealtimeData = null;
    this.onStop = null;
    this.onDurationUpdate = null;
    this.onStateChange = null;
    this.onError = null;
  }

  public getLatestData(): Blob | null {
    if (this.chunks.length === 0) return null;
    return new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
  }
}
