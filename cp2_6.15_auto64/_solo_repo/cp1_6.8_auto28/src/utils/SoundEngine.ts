import { FrequencyBands } from '@/types';

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  async startRecording(): Promise<void> {
    const ctx = this.getContext();
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.chunks = [];

    const source = ctx.createMediaStreamSource(this.mediaStream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(100);
  }

  stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Not recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);

        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((t) => t.stop());
          this.mediaStream = null;
        }
      };

      this.mediaRecorder.stop();
    });
  }

  async playAudio(
    audioData: string,
    fadeIn: number = 0.05,
    fadeOut: number = 0.05,
    onEnded?: () => void
  ): Promise<void> {
    this.stopPlayback();

    const ctx = this.getContext();
    const response = await fetch(audioData);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    this.currentSource = ctx.createBufferSource();
    this.gainNode = ctx.createGain();

    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn);

    const fadeStart = Math.max(0, audioBuffer.duration - fadeOut);
    this.gainNode.gain.setValueAtTime(1, ctx.currentTime + fadeStart);
    this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + audioBuffer.duration);

    this.currentSource.onended = () => {
      this.currentSource = null;
      this.gainNode = null;
      onEnded?.();
    };

    this.currentSource.start(0);
  }

  stopPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    this.gainNode = null;
  }

  extractWaveform(audioData: string): Promise<number[]> {
    return new Promise(async (resolve) => {
      const ctx = this.getContext();
      const response = await fetch(audioData);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const samples = 64;
      const blockSize = Math.floor(rawData.length / samples);
      const waveform: number[] = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }

      const max = Math.max(...waveform, 0.001);
      resolve(waveform.map((v) => v / max));
    });
  }

  extractFrequencyBands(audioData: string): Promise<FrequencyBands> {
    return new Promise(async (resolve) => {
      const ctx = this.getContext();
      const response = await fetch(audioData);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = offlineCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyser.connect(offlineCtx.destination);
      source.start(0);

      await offlineCtx.startRendering();

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);

      const len = freqData.length;
      const third = Math.floor(len / 3);

      let lowSum = 0, midSum = 0, highSum = 0;
      for (let i = 0; i < third; i++) lowSum += freqData[i];
      for (let i = third; i < third * 2; i++) midSum += freqData[i];
      for (let i = third * 2; i < len; i++) highSum += freqData[i];

      const low = lowSum / third / 255;
      const mid = midSum / third / 255;
      const high = highSum / (len - third * 2) / 255;

      const total = low + mid + high || 1;
      resolve({
        low: low / total,
        mid: mid / total,
        high: high / total,
      });
    });
  }

  async processAudio(audioData: string): Promise<{
    waveform: number[];
    frequencyBands: FrequencyBands;
    colorPrimary: string;
    colorSecondary: string;
  }> {
    const [waveform, frequencyBands] = await Promise.all([
      this.extractWaveform(audioData),
      this.extractFrequencyBands(audioData),
    ]);

    const { low, mid, high } = frequencyBands;
    const colorPrimary = this.mapFrequencyToColor(low, mid, high);
    const colorSecondary = this.mapFrequencyToColor(mid, high, low);

    return { waveform, frequencyBands, colorPrimary, colorSecondary };
  }

  private mapFrequencyToColor(low: number, mid: number, high: number): string {
    const r = Math.round(255 * low);
    const g = Math.round(190 * mid + 65 * low);
    const b = Math.round(237 * high + 255 * mid);
    return `rgb(${r},${g},${b})`;
  }

  static mapBandsToHSL(bands: FrequencyBands): { h: number; s: number; l: number } {
    const { low, high } = bands;
    const h = 280 * high + 20 * low;
    const s = 85 + 15 * high;
    const l = 50 + 10 * high;
    return { h, s, l };
  }
}

export const soundEngine = new SoundEngine();
