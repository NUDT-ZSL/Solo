import { Player, Destination } from 'tone';
import type { AudioFeatures } from '@/types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private currentPlayer: Player | null = null;
  private recording = false;
  private playing = false;
  private sourceNode: AudioBufferSourceNode | null = null;

  async init(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
  }

  async startRecording(): Promise<void> {
    await this.init();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start();
    this.recording = true;
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Not recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/wav' });
        this.chunks = [];
        this.recording = false;

        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        }
        this.mediaRecorder = null;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async playAudio(url: string): Promise<void> {
    this.stopPlayback();
    await this.init();

    this.playing = true;

    return new Promise((resolve, reject) => {
      this.currentPlayer = new Player(url, () => {
        if (this.currentPlayer) {
          this.currentPlayer.connect(Destination);
          if (this.analyser && this.audioContext) {
            this.currentPlayer.connect(this.analyser);
          }
          this.currentPlayer.start();
        }
      });

      this.currentPlayer.onstop = () => {
        this.playing = false;
        this.currentPlayer?.dispose();
        this.currentPlayer = null;
        resolve();
      };

      this.currentPlayer.onerror = (err) => {
        this.playing = false;
        this.currentPlayer?.dispose();
        this.currentPlayer = null;
        reject(err);
      };
    });
  }

  stopPlayback(): void {
    if (this.currentPlayer) {
      this.currentPlayer.stop();
      this.currentPlayer.dispose();
      this.currentPlayer = null;
    }
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.playing = false;
  }

  pausePlayback(): void {
    if (this.currentPlayer) {
      this.audioContext?.suspend();
    }
  }

  resumePlayback(): void {
    if (this.currentPlayer) {
      this.audioContext?.resume();
    }
  }

  setVolume(value: number): void {
    const db = 20 * Math.log10(Math.max(0.0001, value));
    Destination.volume.value = db;
  }

  getWaveformData(): Float32Array {
    if (!this.analyser) return new Float32Array(128);
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(data);
    return data;
  }

  getFrequencyData(): Float32Array {
    if (!this.analyser) return new Float32Array(128);
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(data);
    return data;
  }

  extractFeatures(audioBuffer: AudioBuffer): AudioFeatures {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const length = channelData.length;

    let sumSquares = 0;
    for (let i = 0; i < length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const averageRms = Math.sqrt(sumSquares / length);

    const loudness = 20 * Math.log10(averageRms + 0.0001);

    const fftSize = 2048;
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    const analyserNode = offlineCtx.createAnalyser();
    analyserNode.fftSize = fftSize;
    source.connect(analyserNode);
    analyserNode.connect(offlineCtx.destination);
    source.start(0);

    const freqData = new Float32Array(analyserNode.frequencyBinCount);
    analyserNode.getFloatFrequencyData(freqData);

    let maxFreqIndex = 0;
    let maxFreqValue = -Infinity;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i] > maxFreqValue) {
        maxFreqValue = freqData[i];
        maxFreqIndex = i;
      }
    }
    const averageFreq = (maxFreqIndex * sampleRate) / fftSize;

    const binWidth = sampleRate / fftSize;
    const lowBin = Math.floor(500 / binWidth);
    const midBin = Math.floor(2000 / binWidth);
    let lowEnergy = 0;
    let totalEnergy = 0;
    for (let i = 0; i < freqData.length; i++) {
      const energy = Math.pow(10, freqData[i] / 10);
      totalEnergy += energy;
      if (i < lowBin) {
        lowEnergy += energy;
      }
    }
    const warmth = totalEnergy > 0 ? Math.min(1, lowEnergy / totalEnergy) : 0;

    const threshold = averageRms * 1.5;
    let peakCount = 0;
    const windowSize = Math.floor(sampleRate * 0.01);
    for (let i = windowSize; i < length - windowSize; i += windowSize) {
      let windowMax = 0;
      for (let j = i; j < i + windowSize && j < length; j++) {
        const val = Math.abs(channelData[j]);
        if (val > windowMax) windowMax = val;
      }
      if (windowMax > threshold) peakCount++;
    }

    const durationSeconds = length / sampleRate;
    const tempo = Math.round((peakCount / durationSeconds) * 60);

    return {
      averageRms,
      averageFreq,
      tempo: Math.max(40, Math.min(240, tempo)),
      loudness,
      warmth,
    };
  }

  isRecording(): boolean {
    return this.recording;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  destroy(): void {
    this.stopPlayback();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.recording = false;
    this.playing = false;
  }
}
