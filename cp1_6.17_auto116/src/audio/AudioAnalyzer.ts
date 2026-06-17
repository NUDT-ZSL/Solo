export interface FreqBandData {
  low: number;
  mid: number;
  high: number;
}

type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private sampleRate: number = 44100;
  private state: AudioState = 'idle';
  private fileName: string = '';
  private duration: number = 0;

  public onStateChange: ((state: AudioState) => void) | null = null;
  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  public onLoaded: ((fileName: string, duration: number) => void) | null = null;

  private setState(state: AudioState): void {
    this.state = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  public getState(): AudioState {
    return this.state;
  }

  public getFileName(): string {
    return this.fileName;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getCurrentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  public setCurrentTime(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
    }
  }

  public async loadFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('文件大小不能超过20MB');
    }

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'];
    const validExtensions = ['.mp3', '.wav'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      throw new Error('只支持MP3和WAV格式');
    }

    this.setState('loading');
    this.fileName = file.name;

    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sampleRate = this.audioContext.sampleRate;

    const url = URL.createObjectURL(file);

    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    await new Promise<void>((resolve, reject) => {
      if (!this.audioElement) return reject(new Error('Audio element not created'));

      const onCanPlay = () => {
        this.duration = this.audioElement!.duration;
        this.sampleRate = this.audioContext!.sampleRate;
        this.setupNodes();
        this.setState('ready');
        if (this.onLoaded) {
          this.onLoaded(this.fileName, this.duration);
        }
        resolve();
      };

      const onError = () => {
        this.setState('idle');
        reject(new Error('音频文件加载失败'));
      };

      this.audioElement.addEventListener('canplaythrough', onCanPlay, { once: true });
      this.audioElement.addEventListener('error', onError, { once: true });
      this.audioElement.load();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate && this.audioElement) {
        this.onTimeUpdate(this.audioElement.currentTime, this.audioElement.duration);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.setState('ready');
    });
  }

  private setupNodes(): void {
    if (!this.audioContext || !this.audioElement) return;

    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.7;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.sourceNode
      .connect(this.analyserNode)
      .connect(this.gainNode)
      .connect(this.audioContext.destination);
  }

  public async play(): Promise<void> {
    if (!this.audioContext || !this.audioElement) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.state === 'ready' || this.state === 'paused') {
      await this.audioElement.play();
      this.setState('playing');
    }
  }

  public pause(): void {
    if (this.audioElement && this.state === 'playing') {
      this.audioElement.pause();
      this.setState('paused');
    }
  }

  public togglePlay(): void {
    if (this.state === 'playing') {
      this.pause();
    } else if (this.state === 'ready' || this.state === 'paused') {
      this.play();
    }
  }

  public getFreqData(): FreqBandData {
    if (!this.analyserNode || !this.frequencyData) {
      return { low: 0, mid: 0, high: 0 };
    }

    this.analyserNode.getByteFrequencyData(this.frequencyData);

    const nyquist = this.sampleRate / 2;
    const binCount = this.frequencyData.length;

    const lowStart = Math.floor(20 / nyquist * binCount);
    const lowEnd = Math.floor(250 / nyquist * binCount);
    const midStart = lowEnd;
    const midEnd = Math.floor(4000 / nyquist * binCount);
    const highStart = midEnd;
    const highEnd = Math.floor(20000 / nyquist * binCount);

    let lowSum = 0;
    let lowCount = 0;
    for (let i = lowStart; i < Math.min(lowEnd, binCount); i++) {
      lowSum += this.frequencyData[i];
      lowCount++;
    }

    let midSum = 0;
    let midCount = 0;
    for (let i = midStart; i < Math.min(midEnd, binCount); i++) {
      midSum += this.frequencyData[i];
      midCount++;
    }

    let highSum = 0;
    let highCount = 0;
    for (let i = highStart; i < Math.min(highEnd, binCount); i++) {
      highSum += this.frequencyData[i];
      highCount++;
    }

    return {
      low: lowCount > 0 ? lowSum / lowCount : 0,
      mid: midCount > 0 ? midSum / midCount : 0,
      high: highCount > 0 ? highSum / highCount : 0
    };
  }

  public isPlaying(): boolean {
    return this.state === 'playing';
  }

  private cleanup(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (_) { /* ignore */ }
    }
    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch (_) { /* ignore */ }
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (_) { /* ignore */ }
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) { /* ignore */ }
    }
    this.audioContext = null;
    this.audioElement = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.gainNode = null;
    this.frequencyData = null;
  }

  public destroy(): void {
    this.cleanup();
    this.state = 'idle';
  }
}
