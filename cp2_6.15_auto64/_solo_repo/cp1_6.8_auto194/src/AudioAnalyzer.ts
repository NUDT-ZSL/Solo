export interface AudioFeatures {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  rms: number;
  spectralCentroid: number;
  isBeat: boolean;
  bassLevel: number;
  midLevel: number;
  highLevel: number;
}

const BEAT_THRESHOLD = 1.4;
const BEAT_COOLDOWN_MS = 150;
const MAX_AUDIO_DURATION = 30;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);
  private prevRms = 0;
  private lastBeatTime = 0;
  private beatHistory: number[] = [];
  private _isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentTime(): number {
    if (!this._isPlaying) return this.pauseTime;
    return this.audioContext ? this.audioContext.currentTime - this.startTime : 0;
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private setupAnalyser(): AnalyserNode {
    const ctx = this.ensureContext();
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(ctx.destination);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    }
    return this.analyser;
  }

  private disconnectSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      if (this.sourceNode instanceof AudioBufferSourceNode) {
        try {
          this.sourceNode.stop();
        } catch {}
      }
      this.sourceNode = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this._isPlaying = false;
  }

  async loadPreset(name: string): Promise<void> {
    this.disconnectSource();
    const ctx = this.ensureContext();
    const analyser = this.setupAnalyser();

    try {
      const response = await fetch(`/audio/${name}.mp3`);
      if (!response.ok) {
        this.createSyntheticPreset(name);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.playBuffer(ctx, analyser);
    } catch {
      this.createSyntheticPreset(name);
    }
  }

  private createSyntheticPreset(name: string): void {
    const ctx = this.ensureContext();
    const analyser = this.setupAnalyser();
    const sampleRate = ctx.sampleRate;
    const duration = MAX_AUDIO_DURATION;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    if (name === 'clair-de-lune') {
      this.generateClairDeLune(leftChannel, rightChannel, sampleRate);
    } else if (name === 'canon') {
      this.generateCanon(leftChannel, rightChannel, sampleRate);
    } else {
      this.generateAmbient(leftChannel, rightChannel, sampleRate);
    }

    this.audioBuffer = buffer;
    this.playBuffer(ctx, analyser);
  }

  private generateClairDeLune(left: Float32Array, right: Float32Array, sr: number): void {
    const notes = [261.63, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    for (let i = 0; i < left.length; i++) {
      const t = i / sr;
      const segT = t % 4;
      const noteIdx = Math.floor((t / 4) * 3) % notes.length;
      const freq = notes[noteIdx];
      const env = Math.exp(-segT * 0.8) * (segT > 0.05 ? 1 : segT / 0.05);
      const vibrato = 1 + 0.003 * Math.sin(2 * Math.PI * 5 * t);
      const val = 0.15 * env * Math.sin(2 * Math.PI * freq * vibrato * t)
        + 0.08 * env * Math.sin(2 * Math.PI * freq * 2 * t)
        + 0.03 * Math.sin(2 * Math.PI * 130.81 * t) * 0.3;
      left[i] = val;
      right[i] = val * 0.95 + 0.02 * Math.sin(2 * Math.PI * freq * 1.002 * t) * env;
    }
  }

  private generateCanon(left: Float32Array, right: Float32Array, sr: number): void {
    const melody = [523.25, 493.88, 440.0, 392.0, 349.23, 329.63, 293.66, 261.63];
    const bassNotes = [130.81, 146.83, 164.81, 174.61];
    for (let i = 0; i < left.length; i++) {
      const t = i / sr;
      const melodyIdx = Math.floor(t / 1.5) % melody.length;
      const bassIdx = Math.floor(t / 3) % bassNotes.length;
      const mFreq = melody[melodyIdx];
      const bFreq = bassNotes[bassIdx];
      const mEnv = 1 - ((t % 1.5) / 1.5) * 0.5;
      const mVal = 0.12 * mEnv * Math.sin(2 * Math.PI * mFreq * t)
        + 0.06 * mEnv * Math.sin(2 * Math.PI * mFreq * 2 * t);
      const bVal = 0.1 * Math.sin(2 * Math.PI * bFreq * t)
        + 0.05 * Math.sin(2 * Math.PI * bFreq * 3 * t);
      left[i] = mVal + bVal;
      right[i] = mVal * 0.9 + bVal;
    }
  }

  private generateAmbient(left: Float32Array, right: Float32Array, sr: number): void {
    for (let i = 0; i < left.length; i++) {
      const t = i / sr;
      left[i] = 0.08 * Math.sin(2 * Math.PI * 220 * t)
        + 0.05 * Math.sin(2 * Math.PI * 330 * t)
        + 0.03 * Math.sin(2 * Math.PI * 440 * t * (1 + 0.01 * Math.sin(t)));
      right[i] = 0.07 * Math.sin(2 * Math.PI * 220 * t)
        + 0.04 * Math.sin(2 * Math.PI * 277 * t)
        + 0.03 * Math.sin(2 * Math.PI * 440 * t);
    }
  }

  private playBuffer(ctx: AudioContext, analyser: AnalyserNode): void {
    if (!this.audioBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(analyser);
    source.loop = true;
    source.start(0);
    this.sourceNode = source;
    this.startTime = ctx.currentTime;
    this._isPlaying = true;

    source.onended = () => {
      this._isPlaying = false;
    };
  }

  async loadUserAudio(file: File): Promise<void> {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('文件过大');
    }

    this.disconnectSource();
    const ctx = this.ensureContext();
    const analyser = this.setupAnalyser();

    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

    if (decodedBuffer.duration > MAX_AUDIO_DURATION) {
      const newLength = Math.floor(MAX_AUDIO_DURATION * decodedBuffer.sampleRate);
      const trimmedBuffer = ctx.createBuffer(
        decodedBuffer.numberOfChannels,
        newLength,
        decodedBuffer.sampleRate
      );
      for (let ch = 0; ch < decodedBuffer.numberOfChannels; ch++) {
        const src = decodedBuffer.getChannelData(ch);
        const dst = trimmedBuffer.getChannelData(ch);
        dst.set(src.subarray(0, newLength));
      }
      this.audioBuffer = trimmedBuffer;
    } else {
      this.audioBuffer = decodedBuffer;
    }

    this.playBuffer(ctx, analyser);
  }

  stop(): void {
    this.disconnectSource();
  }

  getFeatures(): AudioFeatures {
    if (!this.analyser || !this._isPlaying) {
      return {
        frequencyData: new Uint8Array(1024),
        timeDomainData: new Uint8Array(1024),
        rms: 0,
        spectralCentroid: 0,
        isBeat: false,
        bassLevel: 0,
        midLevel: 0,
        highLevel: 0,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);

    const freq = this.frequencyData;
    const binCount = freq.length;
    const nyquist = this.audioContext!.sampleRate / 2;
    const binWidth = nyquist / binCount;

    let sum = 0;
    let weightedSum = 0;
    for (let i = 0; i < binCount; i++) {
      sum += freq[i];
      weightedSum += freq[i] * (i * binWidth);
    }

    const rms = this.computeRms();
    const spectralCentroid = sum > 0 ? weightedSum / sum : 0;

    const bassEnd = Math.floor(250 / binWidth);
    const midEnd = Math.floor(4000 / binWidth);
    const highEnd = Math.floor(20000 / binWidth);

    let bassSum = 0, midSum = 0, highSum = 0;
    for (let i = 0; i < bassEnd && i < binCount; i++) bassSum += freq[i];
    for (let i = bassEnd; i < midEnd && i < binCount; i++) midSum += freq[i];
    for (let i = midEnd; i < highEnd && i < binCount; i++) highSum += freq[i];

    const bassLevel = bassEnd > 0 ? bassSum / (bassEnd * 255) : 0;
    const midLevel = (midEnd - bassEnd) > 0 ? midSum / ((midEnd - bassEnd) * 255) : 0;
    const highLevel = (highEnd - midEnd) > 0 ? highSum / ((highEnd - midEnd) * 255) : 0;

    const isBeat = this.detectBeat(rms);

    return {
      frequencyData: freq,
      timeDomainData: this.timeDomainData,
      rms,
      spectralCentroid,
      isBeat,
      bassLevel,
      midLevel,
      highLevel,
    };
  }

  private computeRms(): number {
    const data = this.timeDomainData;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }

  private detectBeat(rms: number): boolean {
    const now = performance.now();
    if (now - this.lastBeatTime < BEAT_COOLDOWN_MS) return false;

    this.beatHistory.push(rms);
    if (this.beatHistory.length > 43) this.beatHistory.shift();

    const avg = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const isBeat = rms > avg * BEAT_THRESHOLD && rms > 0.05;

    if (isBeat) {
      this.lastBeatTime = now;
    }

    this.prevRms = rms;
    return isBeat;
  }

  getFrequencySnapshot(): Uint8Array {
    if (!this.frequencyData.length) return new Uint8Array(0);
    return new Uint8Array(this.frequencyData);
  }

  getEmotionTags(features: AudioFeatures): string[] {
    const tags: string[] = [];
    const { bassLevel, midLevel, highLevel, rms, spectralCentroid } = features;

    const dominant = Math.max(bassLevel, midLevel, highLevel);

    if (dominant === bassLevel && rms > 0.15) {
      tags.push('激昂', '雄浑');
    } else if (dominant === highLevel && rms > 0.1) {
      tags.push('明快', '轻盈');
    } else if (dominant === midLevel && rms < 0.15) {
      tags.push('温暖', '宁静');
    } else if (rms < 0.05) {
      tags.push('柔和', '悠远');
    }

    if (bassLevel > 0.3 && midLevel > 0.3 && highLevel > 0.3) {
      tags.push('丰富', '和谐');
    }

    if (spectralCentroid > 4000) {
      tags.push('清亮');
    } else if (spectralCentroid < 800) {
      tags.push('深沉');
    }

    if (tags.length === 0) {
      tags.push('宁静');
    }

    return tags;
  }
}
