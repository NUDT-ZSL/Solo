export type RecordState = 'idle' | 'recording' | 'redo';

export interface AudioAnalyzerResult {
  frequencyBands: number[];
  spectrumData: Uint8Array;
}

type StateChangeCallback = (state: RecordState) => void;
type SpectrumCallback = (data: Uint8Array) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private state: RecordState = 'idle';
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private maxDuration: number = 5000;
  private animFrameId: number = 0;
  private onStateChange: StateChangeCallback | null = null;
  private onSpectrum: SpectrumCallback | null = null;
  private ringCount: number = 5;
  private recordedBuffer: AudioBuffer | null = null;

  constructor() {}

  setRingCount(count: number): void {
    this.ringCount = count;
  }

  onStateChangeCallback(cb: StateChangeCallback): void {
    this.onStateChange = cb;
  }

  onSpectrumCallback(cb: SpectrumCallback): void {
    this.onSpectrum = cb;
  }

  getState(): RecordState {
    return this.state;
  }

  hasRecordedData(): boolean {
    return this.recordedBuffer !== null;
  }

  private setState(s: RecordState): void {
    this.state = s;
    if (this.onStateChange) this.onStateChange(s);
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
    }
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;
    }
  }

  async startRecording(): Promise<void> {
    this.ensureAudioContext();
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 44100, channelCount: 1, echoCancellation: false, noiseSuppression: false },
      });
    } catch {
      console.error('Microphone access denied');
      return;
    }

    this.sourceNode = this.audioContext!.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.analyser!);

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
      this.processRecording();
    };
    this.mediaRecorder.start(100);
    this.startTime = Date.now();
    this.setState('recording');
    this.startSpectrumLoop();
    this.autoStopTimer();
  }

  private autoStopTimer(): void {
    const check = () => {
      if (this.state !== 'recording') return;
      if (Date.now() - this.startTime >= this.maxDuration) {
        this.stopRecording();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    cancelAnimationFrame(this.animFrameId);
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  private async processRecording(): Promise<void> {
    if (this.chunks.length === 0) {
      this.setState('redo');
      return;
    }
    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    try {
      const arrayBuffer = await blob.arrayBuffer();
      this.recordedBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    } catch {
      console.error('Failed to decode audio');
    }
    this.setState('redo');
  }

  getFrequencyBandsFromBuffer(ringCount: number): number[] {
    if (!this.recordedBuffer) return new Array(ringCount).fill(0);

    const offlineCtx = new OfflineAudioContext(1, this.recordedBuffer.length, this.recordedBuffer.sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = this.recordedBuffer;
    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(offlineCtx.destination);
    source.start(0);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    const bands = splitIntoBands(freqData, ringCount);
    return bands;
  }

  private startSpectrumLoop(): void {
    const loop = () => {
      if (this.state !== 'recording') return;
      if (this.analyser) {
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        if (this.onSpectrum) this.onSpectrum(data);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  reset(): void {
    this.stopRecording();
    this.recordedBuffer = null;
    this.chunks = [];
    this.setState('idle');
  }

  dispose(): void {
    this.reset();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }
}

export function splitIntoBands(freqData: Uint8Array, bandCount: number): number[] {
  const binCount = freqData.length;
  const bands: number[] = [];
  const binsPerBand = Math.floor(binCount / bandCount);

  for (let i = 0; i < bandCount; i++) {
    let sum = 0;
    const start = i * binsPerBand;
    const end = start + binsPerBand;
    for (let j = start; j < end && j < binCount; j++) {
      sum += freqData[j];
    }
    const avg = sum / binsPerBand;
    bands.push(Math.min(avg / 255, 1));
  }

  return bands;
}
