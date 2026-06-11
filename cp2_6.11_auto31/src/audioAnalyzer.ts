export type RecordingState = 'idle' | 'recording' | 'done';

export interface AudioAnalysisResult {
  frequencyData: Uint8Array;
  normalizedAmplitudes: number[];
  ringCount: number;
}

export interface SpectrumData {
  bars: number[];
  amplitude: number;
}

export type SpectrumCallback = (data: SpectrumData) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private state: RecordingState = 'idle';
  private ringCount: number = 5;
  private spectrumCallback: SpectrumCallback | null = null;
  private animationFrameId: number = 0;
  private maxDuration: number = 5;
  private autoStopTimer: number = 0;
  private recordingStartTime: number = 0;
  private lastAnalysisTime: number = 0;

  constructor(ringCount: number) {
    this.ringCount = ringCount;
  }

  getState(): RecordingState {
    return this.state;
  }

  setRingCount(count: number): void {
    this.ringCount = count;
  }

  onSpectrumUpdate(callback: SpectrumCallback): void {
    this.spectrumCallback = callback;
  }

  async startRecording(maxDuration: number = 5): Promise<void> {
    const t0 = performance.now();
    this.maxDuration = maxDuration;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (err) {
      console.error('[AudioAnalyzer] 麦克风权限获取失败:', err);
      throw err;
    }

    this.audioContext = new AudioContext({ sampleRate: 44100 });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.sourceNode.connect(this.analyser);

    const t1 = performance.now();
    console.log(`[AudioAnalyzer] 音频初始化耗时: ${(t1 - t0).toFixed(1)}ms`);

    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.mediaRecorder.start();

    this.state = 'recording';
    this.recordingStartTime = performance.now();
    console.log(`[AudioAnalyzer] 开始录制 @ ${new Date().toISOString()}`);

    this.startSpectrumLoop();

    this.autoStopTimer = window.setTimeout(() => {
      if (this.state === 'recording') {
        console.log('[AudioAnalyzer] 达到最大录制时长，自动停止');
        this.stopRecording();
      }
    }, maxDuration * 1000);
  }

  private startSpectrumLoop(): void {
    const loop = () => {
      if (this.state !== 'recording' || !this.analyser) return;

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      const bars: number[] = [];
      const binCount = Math.min(bufferLength, 64);
      for (let i = 0; i < binCount; i++) {
        bars.push(dataArray[i] / 255);
      }

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const amplitude = sum / (bufferLength * 255);

      if (this.spectrumCallback) {
        this.spectrumCallback({ bars, amplitude });
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  async stopRecording(): Promise<AudioAnalysisResult> {
    const t0 = performance.now();

    if (this.autoStopTimer) {
      window.clearTimeout(this.autoStopTimer);
      this.autoStopTimer = 0;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (!this.analyser || !this.audioContext) {
      this.state = 'done';
      return { frequencyData: new Uint8Array(0), normalizedAmplitudes: [], ringCount: this.ringCount };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const t1 = performance.now();
    this.lastAnalysisTime = t1 - t0;
    console.log(`[AudioAnalyzer] FFT分析耗时: ${this.lastAnalysisTime.toFixed(1)}ms`);
    console.log(`[AudioAnalyzer] 录制总时长: ${((t1 - this.recordingStartTime) / 1000).toFixed(2)}s`);
    console.log(`[AudioAnalyzer] 录制→分析延迟: ${(t1 - this.recordingStartTime).toFixed(1)}ms`);

    const normalizedAmplitudes = this.computeNormalizedAmplitudes(frequencyData);

    this.state = 'done';

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    return { frequencyData, normalizedAmplitudes, ringCount: this.ringCount };
  }

  private computeNormalizedAmplitudes(frequencyData: Uint8Array): number[] {
    const amplitudes: number[] = [];
    const binCount = frequencyData.length;
    const binsPerRing = Math.floor(binCount / this.ringCount);

    for (let r = 0; r < this.ringCount; r++) {
      let sum = 0;
      const start = r * binsPerRing;
      const end = r === this.ringCount - 1 ? binCount : start + binsPerRing;
      for (let i = start; i < end; i++) {
        sum += frequencyData[i];
      }
      const avg = sum / (end - start);
      amplitudes.push(avg / 255);
    }

    return amplitudes;
  }

  getLastAnalysisTime(): number {
    return this.lastAnalysisTime;
  }

  dispose(): void {
    if (this.autoStopTimer) {
      window.clearTimeout(this.autoStopTimer);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.sourceNode = null;
    this.state = 'idle';
  }
}
