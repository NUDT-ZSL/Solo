import Pitchfinder from 'pitchfinder';

export interface PitchData {
  time: number;
  pitch: number;
  confidence: number;
}

export type PitchCallback = (data: PitchData) => void;

export interface LatencyStats {
  bufferLatencyMs: number;
  interpolationLatencyMs: number;
  totalEstimatedLatencyMs: number;
  workletProcessingCount: number;
  lastWorkletTimestamp: number;
  audioContextSampleRate: number;
  audioContextLatency: number;
  audioContextOutputLatency: number;
}

interface InterpolationState {
  lastValidPitch: number | null;
  lastValidTime: number;
  lastValidConfidence: number;
  lastEmittedTime: number;
}

export class PitchTracker {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private detectPitch: ((float32AudioBuffer: Float32Array) => number | null) | null = null;
  private callback: PitchCallback | null = null;
  private isRunning: boolean = false;
  private workletNode: AudioWorkletNode | null = null;
  private bufferSize: number = 512;
  private interpolationState: InterpolationState = {
    lastValidPitch: null,
    lastValidTime: -1,
    lastValidConfidence: 0,
    lastEmittedTime: -1
  };
  private targetFrameInterval: number = 1000 / 60;
  private rmsHistory: number[] = [];
  private maxRmsHistory: number = 3;
  private workletMessageCount: number = 0;
  private lastWorkletMessageTime: number = 0;
  private processStartPerformanceTime: number = 0;

  constructor() {}

  async start(callback: PitchCallback): Promise<void> {
    if (this.isRunning) return;

    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize * 2;
      this.analyser.smoothingTimeConstant = 0;

      this.source.connect(this.analyser);

      this.detectPitch = Pitchfinder.YIN({
        sampleRate: this.audioContext.sampleRate,
        threshold: 0.1,
        probabilityThreshold: 0.05
      });

      const workletCode = this.getWorkletCode();
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(workletUrl);

      this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-processor', {
        processorOptions: { bufferSize: this.bufferSize }
      });

      this.workletNode.port.onmessage = (event) => {
        this.handleWorkletMessage(event.data);
      };

      this.analyser.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      this.callback = callback;
      this.isRunning = true;
      this.processStartPerformanceTime = performance.now();
      this.workletMessageCount = 0;

      this.interpolationState = {
        lastValidPitch: null,
        lastValidTime: -1,
        lastValidConfidence: 0,
        lastEmittedTime: -1
      };

    } catch (error) {
      console.error('PitchTracker start error:', error);
      this.cleanup();
      throw error;
    }
  }

  private getWorkletCode(): string {
    return `
      class PitchProcessor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [];
        }

        constructor(options) {
          super();
          this.bufferSize = options.processorOptions.bufferSize || 512;
          this.bufferedData = new Float32Array(this.bufferSize);
          this.bufferedLength = 0;
          this.processStartTime = currentTime;
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (!input || input.length === 0) return true;

          const channelData = input[0];
          if (!channelData) return true;

          const available = this.bufferedLength + channelData.length;

          if (available >= this.bufferSize) {
            this.bufferedData.set(channelData.subarray(0, this.bufferSize - this.bufferedLength), this.bufferedLength);

            const newBuffer = new Float32Array(this.bufferSize);
            const remaining = channelData.length - (this.bufferSize - this.bufferedLength);
            newBuffer.set(channelData.subarray(channelData.length - remaining), 0);
            newBuffer.set(this.bufferedData.subarray(0, this.bufferSize - remaining), remaining);

            const copyBuffer = new Float32Array(this.bufferedData);
            const sampleTime = currentTime - this.processStartTime - (this.bufferSize / sampleRate);

            this.port.postMessage({
              type: 'audio',
              data: copyBuffer,
              time: sampleTime
            });

            this.bufferedData = newBuffer;
            this.bufferedLength = this.bufferSize;
          } else {
            this.bufferedData.set(channelData, this.bufferedLength);
            this.bufferedLength += channelData.length;
          }

          return true;
        }
      }

      registerProcessor('pitch-processor', PitchProcessor);
    `;
  }

  private handleWorkletMessage(message: { type: string; data: Float32Array; time: number }): void {
    if (message.type !== 'audio') return;
    if (!this.detectPitch || !this.callback) return;

    this.workletMessageCount++;
    this.lastWorkletMessageTime = performance.now();

    const inputData = message.data;

    let rms = 0;
    for (let i = 0; i < inputData.length; i++) {
      rms += inputData[i] * inputData[i];
    }
    rms = Math.sqrt(rms / inputData.length);

    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > this.maxRmsHistory) {
      this.rmsHistory.shift();
    }

    const smoothedRms = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
    const confidence = Math.min(1, smoothedRms * 3);

    if (confidence < 0.03) {
      return;
    }

    const pitch = this.detectPitch(inputData);
    const bufferTime = message.time;

    if (pitch !== null && pitch > 80 && pitch < 2000) {
      const state = this.interpolationState;

      if (state.lastValidPitch !== null && state.lastValidTime >= 0) {
        const dt = bufferTime - state.lastValidTime;
        const numFrames = Math.max(1, Math.floor((dt * 1000) / this.targetFrameInterval));

        for (let i = 1; i <= numFrames; i++) {
          const t = i / numFrames;
          const interpolatedTime = state.lastValidTime + dt * t;

          if (interpolatedTime <= state.lastEmittedTime) continue;

          const freqRatio = pitch / state.lastValidPitch;
          const interpolatedPitch = state.lastValidPitch * Math.pow(freqRatio, t);
          const interpolatedConfidence = state.lastValidConfidence + (confidence - state.lastValidConfidence) * t;

          if (this.callback) {
            this.callback({
              time: interpolatedTime,
              pitch: interpolatedPitch,
              confidence: interpolatedConfidence
            });
          }

          state.lastEmittedTime = interpolatedTime;
        }
      } else {
        if (this.callback) {
          this.callback({
            time: bufferTime,
            pitch,
            confidence
          });
        }
        state.lastEmittedTime = bufferTime;
      }

      state.lastValidPitch = pitch;
      state.lastValidTime = bufferTime;
      state.lastValidConfidence = confidence;
    } else {
      if (this.interpolationState.lastValidPitch !== null) {
        const state = this.interpolationState;
        const nowTime = bufferTime;
        const dt = nowTime - state.lastValidTime;

        if (dt < 0.15) {
          const numFrames = Math.floor((dt * 1000) / this.targetFrameInterval);
          for (let i = 1; i <= numFrames; i++) {
            const t = i / numFrames;
            const interpolatedTime = state.lastValidTime + dt * t;

            if (interpolatedTime <= state.lastEmittedTime) continue;

            const decayFactor = Math.max(0, 1 - t * 2);
            const interpolatedConfidence = state.lastValidConfidence * decayFactor;

            if (interpolatedConfidence < 0.05) break;

            if (this.callback) {
              this.callback({
                time: interpolatedTime,
                pitch: state.lastValidPitch!,
                confidence: interpolatedConfidence
              });
            }

            state.lastEmittedTime = interpolatedTime;
          }
        } else {
          state.lastValidPitch = null;
          state.lastValidTime = -1;
          state.lastValidConfidence = 0;
        }
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
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
    this.rmsHistory = [];
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate ?? 48000;
  }

  getBufferSize(): number {
    return this.bufferSize;
  }

  getLatencyMs(): number {
    const sr = this.getSampleRate();
    const bufferLatency = (this.bufferSize / sr) * 1000;
    return bufferLatency;
  }

  getLatencyStats(): LatencyStats {
    const sr = this.getSampleRate();
    const bufferLatencyMs = (this.bufferSize / sr) * 1000;
    const interpolationLatencyMs = this.targetFrameInterval;
    const ctxLatency = (this.audioContext as AudioContext & { baseLatency?: number })?.baseLatency ?? 0;
    const ctxOutputLatency = (this.audioContext as AudioContext & { outputLatency?: number })?.outputLatency ?? 0;
    const audioCtxTotal = (ctxLatency + ctxOutputLatency) * 1000;

    return {
      bufferLatencyMs,
      interpolationLatencyMs,
      totalEstimatedLatencyMs: bufferLatencyMs + interpolationLatencyMs + audioCtxTotal,
      workletProcessingCount: this.workletMessageCount,
      lastWorkletTimestamp: this.lastWorkletMessageTime,
      audioContextSampleRate: sr,
      audioContextLatency: ctxLatency,
      audioContextOutputLatency: ctxOutputLatency
    };
  }

  getUptimeMs(): number {
    if (this.processStartPerformanceTime === 0) return 0;
    return performance.now() - this.processStartPerformanceTime;
  }

  destroy(): void {
    this.stop();
  }
}
