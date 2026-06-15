export interface AnalysisData {
  low: number;
  mid: number;
  high: number;
  beat: boolean;
  volume: number;
  emotion: string;
  spectrum: Uint8Array;
}

export type BandType = 'low' | 'mid' | 'high';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private previousEnergy = 0;
  private beatThreshold = 1.35;
  private beatCooldown = 0;
  private _duration = 0;
  private _startTime = 0;
  private _isPlaying = false;
  private audioBuffer: AudioBuffer | null = null;

  async init() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  async loadAudioBuffer(buffer: AudioBuffer) {
    this.stop();
    this.audioBuffer = buffer;
    this._duration = buffer.duration;
  }

  async loadFile(file: File): Promise<{ success: boolean; error?: string }> {
    await this.init();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    if (audioBuffer.duration > 30) {
      return { success: false, error: '音频时长不能超过30秒' };
    }
    await this.loadAudioBuffer(audioBuffer);
    return { success: true };
  }

  async loadPreset(generateFn: (ctx: AudioContext) => Promise<AudioBuffer>) {
    await this.init();
    const buffer = await generateFn(this.audioContext!);
    await this.loadAudioBuffer(buffer);
  }

  play() {
    if (!this.audioContext || !this.audioBuffer || this._isPlaying) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gainNode!);
    this.source.onended = () => {
      this._isPlaying = false;
      this._startTime = 0;
    };
    this._startTime = this.audioContext.currentTime;
    this.source.start(0);
    this._isPlaying = true;
  }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch (_e) { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
    this._isPlaying = false;
    this._startTime = 0;
  }

  pause() {
    if (this.audioContext && this._isPlaying) {
      this.audioContext.suspend();
      this._isPlaying = false;
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      this._isPlaying = true;
    }
  }

  togglePlay() {
    if (this._isPlaying) {
      this.pause();
    } else if (this.audioBuffer) {
      if (this.audioContext!.state === 'suspended') {
        this.resume();
      } else {
        this.play();
      }
    }
  }

  analyze(): AnalysisData {
    const empty: AnalysisData = {
      low: 0, mid: 0, high: 0,
      beat: false, volume: 0,
      emotion: '静谧',
      spectrum: new Uint8Array(0),
    };
    if (!this.analyser || !this._isPlaying) return empty;

    this.analyser.getByteFrequencyData(this.frequencyData);
    const binCount = this.frequencyData.length;
    const sampleRate = this.audioContext!.sampleRate;
    const binHz = sampleRate / 2048;

    const lowEnd = Math.floor(300 / binHz);
    const midEnd = Math.floor(2000 / binHz);

    let lowSum = 0, midSum = 0, highSum = 0;
    let lowCount = 0, midCount = 0, highCount = 0;

    for (let i = 1; i < binCount; i++) {
      const val = this.frequencyData[i] / 255;
      if (i < lowEnd) { lowSum += val; lowCount++; }
      else if (i < midEnd) { midSum += val; midCount++; }
      else { highSum += val; highCount++; }
    }

    const low = lowCount > 0 ? lowSum / lowCount : 0;
    const mid = midCount > 0 ? midSum / midCount : 0;
    const high = highCount > 0 ? highSum / highCount : 0;

    let sumSq = 0;
    for (let i = 0; i < binCount; i++) {
      const val = this.frequencyData[i] / 255;
      sumSq += val * val;
    }
    const volume = Math.sqrt(sumSq / binCount);

    const currentEnergy = low * 0.55 + mid * 0.3 + high * 0.15;
    let beat = false;
    if (this.beatCooldown <= 0 && currentEnergy > this.previousEnergy * this.beatThreshold && currentEnergy > 0.12) {
      beat = true;
      this.beatCooldown = 8;
    }
    this.previousEnergy = this.previousEnergy * 0.88 + currentEnergy * 0.12;
    if (this.beatCooldown > 0) this.beatCooldown--;

    const emotion = this.computeEmotion(low, mid, high, volume, beat);

    return { low, mid, high, beat, volume, emotion, spectrum: this.frequencyData.slice() };
  }

  private computeEmotion(low: number, mid: number, high: number, volume: number, beat: boolean): string {
    if (beat && volume > 0.45) return '激昂';
    if (volume < 0.05) return '静谧';
    if (low > mid * 1.3 && low > high * 1.3) return '深沉';
    if (high > low * 1.2 && high > mid * 1.2) return '明亮';
    if (mid > low * 1.1 && mid > high * 1.1 && volume > 0.2) return '温暖';
    if (beat) return '跃动';
    return '流动';
  }

  setVolume(v: number) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  get isPlaying() { return this._isPlaying; }
  get duration() { return this._duration; }
  get currentTime() {
    if (!this.audioContext || !this._isPlaying) return 0;
    return this.audioContext.currentTime - this._startTime;
  }
  get hasAudio() { return this.audioBuffer !== null; }
  getAudioContext() { return this.audioContext; }

  getSpectrumSnapshot(): { labels: string[]; values: number[] } {
    if (!this.analyser || this.frequencyData.length === 0) {
      return { labels: [], values: [] };
    }
    const labels = ['低频', '中低频', '中频', '中高频', '高频', '超高频'];
    const binCount = this.frequencyData.length;
    const segmentSize = Math.floor(binCount / labels.length);
    const values: number[] = [];
    for (let i = 0; i < labels.length; i++) {
      let sum = 0;
      const start = i * segmentSize;
      for (let j = start; j < start + segmentSize && j < binCount; j++) {
        sum += this.frequencyData[j] / 255;
      }
      values.push(sum / segmentSize);
    }
    return { labels, values };
  }
}

export async function generatePresetBuffer(
  ctx: AudioContext,
  config: { frequencies: number[]; durations: number[]; waveType: OscillatorType; gain: number }
): Promise<AudioBuffer> {
  const totalDuration = config.durations.reduce((a, b) => a + b, 0);
  const offlineCtx = new OfflineAudioContext(2, ctx.sampleRate * totalDuration, ctx.sampleRate);
  let offset = 0;
  for (let i = 0; i < config.frequencies.length; i++) {
    const osc = offlineCtx.createOscillator();
    const gainNode = offlineCtx.createGain();
    osc.type = config.waveType;
    osc.frequency.value = config.frequencies[i];
    gainNode.gain.setValueAtTime(config.gain, offset);
    gainNode.gain.exponentialRampToValueAtTime(0.001, offset + config.durations[i] - 0.05);
    osc.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    osc.start(offset);
    osc.stop(offset + config.durations[i]);
    offset += config.durations[i];
  }
  return offlineCtx.startRendering();
}
