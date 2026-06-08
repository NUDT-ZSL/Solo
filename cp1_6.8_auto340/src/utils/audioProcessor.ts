export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  amplitude: number;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  isBeat: boolean;
  beatIntensity: number;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);
  private previousBassEnergy = 0;
  private beatDecay = 0;
  private lastBeatTime = 0;
  private _isBeat = false;
  private _beatIntensity = 0;

  get sampleRate(): number {
    return this.audioContext?.sampleRate ?? 44100;
  }

  get fftSize(): number {
    return this.analyser?.fftSize ?? 2048;
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

  async loadFile(file: File): Promise<HTMLAudioElement> {
    this.disconnectSource();

    const ctx = this.ensureContext();
    const analyser = this.setupAnalyser();

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    const url = URL.createObjectURL(file);
    audio.src = url;

    await new Promise<void>((resolve, reject) => {
      audio.oncanplaythrough = () => resolve();
      audio.onerror = () => reject(new Error('无法加载音频文件'));
      audio.load();
    });

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);

    this.source = source;
    this.audioElement = audio;
    this.gainNode = ctx.createGain();
    source.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    audio.play();
    return audio;
  }

  async startMicrophone(): Promise<void> {
    this.disconnectSource();

    const ctx = this.ensureContext();
    const analyser = this.setupAnalyser();

    analyser.disconnect();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const source = ctx.createMediaStreamSource(this.mediaStream);
    source.connect(analyser);

    this.source = source;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    analyser.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);
  }

  stopMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.disconnectSource();
  }

  pauseAudio(): void {
    this.audioElement?.pause();
  }

  resumeAudio(): void {
    this.audioElement?.play();
  }

  private disconnectSource(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
    }
  }

  getAnalysisData(): AudioAnalysisData {
    if (!this.analyser) {
      const empty = new Uint8Array(1024);
      return {
        frequencyData: empty,
        timeDomainData: empty,
        amplitude: 0,
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        isBeat: false,
        beatIntensity: 0,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const binCount = this.analyser.frequencyBinCount;
    const nyquist = this.sampleRate / 2;
    const binWidth = nyquist / binCount;

    const bassEnd = Math.min(Math.floor(200 / binWidth), binCount);
    const midEnd = Math.min(Math.floor(2000 / binWidth), binCount);

    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < binCount; i++) {
      const val = this.frequencyData[i] / 255;
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    const bassEnergy = bassEnd > 0 ? bassSum / bassEnd : 0;
    const midEnergy = midEnd - bassEnd > 0 ? midSum / (midEnd - bassEnd) : 0;
    const highEnergy = binCount - midEnd > 0 ? highSum / (binCount - midEnd) : 0;

    let amplitude = 0;
    for (let i = 0; i < binCount; i++) {
      const val = (this.timeDomainData[i] - 128) / 128;
      amplitude += val * val;
    }
    amplitude = Math.sqrt(amplitude / binCount);

    const now = performance.now();
    this._isBeat = false;

    const bassDelta = bassEnergy - this.previousBassEnergy;
    if (bassDelta > 0.08 && bassEnergy > 0.25 && now - this.lastBeatTime > 200) {
      this._isBeat = true;
      this._beatIntensity = Math.min(bassDelta * 5, 1);
      this.beatDecay = 1;
      this.lastBeatTime = now;
    } else {
      this.beatDecay *= 0.92;
      this._beatIntensity = this.beatDecay;
    }

    this.previousBassEnergy = bassEnergy * 0.7 + this.previousBassEnergy * 0.3;

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      amplitude,
      bassEnergy,
      midEnergy,
      highEnergy,
      isBeat: this._isBeat,
      beatIntensity: this._beatIntensity,
    };
  }

  destroy(): void {
    this.disconnectSource();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.stopMicrophone();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }
}
