export interface RecordingResult {
  audioBase64: string;
  sampleRate: number;
  length: number;
  waveformData: number[];
  frequencyData: number[][];
}

export interface WaveformSample {
  amplitude: number;
  frequency: number;
  hue: number;
  brightness: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private recordedBuffers: Float32Array[] = [];
  private isRecording = false;
  private offlineContext: OfflineAudioContext | null = null;
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private startTime = 0;
  private duration = 15;
  private onProgress: ((progress: number, waveform: WaveformSample[]) => void) | null = null;
  private onComplete: ((result: RecordingResult) => void) | null = null;
  private onFrequencyData: ((data: Float32Array) => void) | null = null;
  private collectedWaveform: WaveformSample[] = [];
  private rawFrequencyHistory: number[][] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'OffscreenCanvas' in window) {
      this.offscreenCanvas = new OffscreenCanvas(300, 400);
      this.offscreenCtx = (this.offscreenCanvas as OffscreenCanvas).getContext('2d');
    } else if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 300;
      this.offscreenCanvas.height = 400;
      this.offscreenCtx = (this.offscreenCanvas as HTMLCanvasElement).getContext('2d');
    }
  }

  async init(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return true;
    } catch (err) {
      console.error('AudioContext初始化失败:', err);
      return false;
    }
  }

  async startRecording(
    duration: number = 15,
    onProgress?: (progress: number, waveform: WaveformSample[]) => void,
    onComplete?: (result: RecordingResult) => void,
    onFrequencyData?: (data: Float32Array) => void
  ): Promise<boolean> {
    try {
      this.duration = duration;
      this.onProgress = onProgress || null;
      this.onComplete = onComplete || null;
      this.onFrequencyData = onFrequencyData || null;
      this.recordedBuffers = [];
      this.collectedWaveform = [];
      this.rawFrequencyHistory = [];
      this.isRecording = true;

      if (!this.audioContext) {
        await this.init();
      }

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      if (!this.audioContext || !this.mediaStream) return false;

      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone.connect(this.analyser);

      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const channelData = event.inputBuffer.getChannelData(0);
        this.recordedBuffers.push(new Float32Array(channelData));

        const frequencyData = new Float32Array(this.analyser!.frequencyBinCount);
        this.analyser!.getFloatFrequencyData(frequencyData);

        const timeData = new Float32Array(this.analyser!.fftSize);
        this.analyser!.getFloatTimeDomainData(timeData);

        const freqSnapshot = new Array(frequencyData.length);
        for (let i = 0; i < frequencyData.length; i++) {
          freqSnapshot[i] = frequencyData[i];
        }
        this.rawFrequencyHistory.push(freqSnapshot);

        const { amplitude, frequency, hue, brightness } = this.analyzeFrame(frequencyData, timeData);
        this.collectedWaveform.push({ amplitude, frequency, hue, brightness });

        if (this.onFrequencyData) {
          this.onFrequencyData(frequencyData);
        }

        const elapsed = (this.audioContext!.currentTime - this.startTime);
        const progress = Math.min(1, elapsed / this.duration);

        if (this.onProgress) {
          this.onProgress(progress, [...this.collectedWaveform]);
        }

        if (progress >= 1) {
          this.stopRecording();
        }
      };

      this.startTime = this.audioContext.currentTime;
      return true;
    } catch (err) {
      console.error('开始录音失败:', err);
      this.cleanup();
      return false;
    }
  }

  stopRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    this.cleanup();

    const result = this.buildRecordingResult();
    if (this.onComplete && result) {
      this.onComplete(result);
    }
  }

  cancelRecording(): void {
    this.isRecording = false;
    this.cleanup();
  }

  private analyzeFrame(frequencyData: Float32Array, timeData: Float32Array): WaveformSample {
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      sumSq += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sumSq / timeData.length);
    const amplitude = Math.min(1, rms * 5);

    let maxBin = 0;
    let maxValue = -Infinity;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxBin = i;
      }
    }

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const frequency = (maxBin / frequencyData.length) * nyquist;

    const minFreq = 80;
    const maxFreq = 8000;
    const normalizedFreq = Math.max(0, Math.min(1, (Math.log2(Math.max(frequency, minFreq) / minFreq)) / Math.log2(maxFreq / minFreq)));
    const hue = (normalizedFreq * 360) % 360;

    const dbMin = -100;
    const dbMax = -10;
    const normalizedDb = Math.max(0, Math.min(1, (maxValue - dbMin) / (dbMax - dbMin)));
    const brightness = 0.3 + normalizedDb * 0.7;

    return {
      amplitude,
      frequency,
      hue,
      brightness
    };
  }

  private buildRecordingResult(): RecordingResult | null {
    if (this.recordedBuffers.length === 0 || !this.audioContext) return null;

    const totalLength = this.recordedBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const mergedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of this.recordedBuffers) {
      mergedBuffer.set(buf, offset);
      offset += buf.length;
    }

    const sampleRate = this.audioContext.sampleRate;
    const length = totalLength / sampleRate;

    const wavBuffer = this.encodeWAV(mergedBuffer, sampleRate, 1);
    const wavBase64 = this.bufferToBase64(wavBuffer);

    const waveformData = this.collectedWaveform.map(w => w.amplitude);

    return {
      audioBase64: wavBase64,
      sampleRate,
      length,
      waveformData,
      frequencyData: this.rawFrequencyHistory
    };
  }

  private encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    const volume = 1;
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    void volume;

    return buffer;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
      binary += String.fromCharCode.apply(null, Array.from(chunk) as number[]);
    }
    return btoa(binary);
  }

  decodeBase64ToAudio(base64: string): Promise<AudioBuffer | null> {
    return new Promise((resolve, reject) => {
      try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const buffer = bytes.buffer;

        if (!this.audioContext) {
          reject(new Error('AudioContext未初始化'));
          return;
        }

        this.audioContext.decodeAudioData(
          buffer.slice(0),
          (audioBuffer) => resolve(audioBuffer),
          (err) => reject(err)
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  drawWaveformOnCanvas(
    ctx: CanvasRenderingContext2D,
    waveform: WaveformSample[],
    width: number,
    height: number,
    clear: boolean = true
  ): void {
    if (clear) {
      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(0, 0, width, height);
    }

    if (waveform.length === 0) return;

    const samples = waveform.length;
    const lineHeight = height / samples;

    for (let i = 0; i < samples; i++) {
      const sample = waveform[i];
      const y = height - (i + 1) * lineHeight;
      const barWidth = Math.max(2, sample.amplitude * (width * 0.9));
      const x = (width - barWidth) / 2;

      const hue = sample.hue;
      const saturation = 70 + sample.amplitude * 30;
      const lightness = 20 + sample.brightness * 50;

      const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);
      gradient.addColorStop(0.5, `hsla(${(hue + 30) % 360}, ${saturation + 10}%, ${lightness + 10}%, 1)`);
      gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, Math.max(1, lineHeight - 1));

      ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.5)`;
      ctx.shadowBlur = 8 * sample.amplitude;
      ctx.fillRect(x, y, barWidth, Math.max(1, lineHeight - 1));
      ctx.shadowBlur = 0;
    }
  }

  drawRealtimeWaveform(
    ctx: CanvasRenderingContext2D,
    waveform: WaveformSample[],
    width: number,
    height: number
  ): void {
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, width, height);

    if (waveform.length === 0) return;

    const centerY = height / 2;
    const barSpacing = width / 64;
    const barWidth = barSpacing * 0.7;

    const recentSamples = waveform.slice(-64);

    for (let i = 0; i < recentSamples.length; i++) {
      const sample = recentSamples[i];
      const x = i * barSpacing + (barSpacing - barWidth) / 2;
      const barHeight = Math.max(4, sample.amplitude * height * 0.45);

      const hue = sample.hue;
      const saturation = 75;
      const lightness = 35 + sample.brightness * 35;

      const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 15}%, 0.95)`);
      gradient.addColorStop(0.5, `hsla(${(hue + 20) % 360}, ${saturation}%, ${lightness}%, 1)`);
      gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness + 15}%, 0.95)`);

      ctx.fillStyle = gradient;
      ctx.shadowColor = `hsla(${hue}, 85%, 60%, 0.6)`;
      ctx.shadowBlur = 12 * sample.amplitude;
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
      ctx.shadowBlur = 0;
    }
  }

  drawTimerRing(
    ctx: CanvasRenderingContext2D,
    progress: number,
    width: number,
    height: number
  ): void {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 8;
    const lineWidth = 6;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 80, 160, 0.3)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const hue = (1 - progress) * 150;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;

    const gradient = ctx.createLinearGradient(
      centerX - radius, centerY - radius,
      centerX + radius, centerY + radius
    );
    gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
    gradient.addColorStop(0.5, `hsl(${(hue + 160) % 360}, 80%, 60%)`);
    gradient.addColorStop(1, `hsl(330, 80%, 60%)`);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    const remainingSeconds = Math.ceil((1 - progress) * this.duration);
    ctx.fillStyle = `hsl(${hue}, 70%, 70%)`;
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${remainingSeconds}s`, centerX, centerY);
  }

  private cleanup(): void {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }
    if (this.microphone) {
      try {
        this.microphone.disconnect();
      } catch {}
      this.microphone = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  destroy(): void {
    this.cleanup();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
