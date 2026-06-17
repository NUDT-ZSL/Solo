import {
  eventBus,
  updateGlobalState,
  globalState,
  type FreqBandData,
  type AudioState
} from '../shared/GlobalState';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private sampleRate: number = 44100;
  private rafId: number | null = null;

  constructor() {
    eventBus.on('audioFileSelected', (file: File) => {
      this.loadFile(file);
    });
    eventBus.on('playPauseToggle', () => {
      this.togglePlay();
    });
    eventBus.on('audioSeek', (time: number) => {
      this.setCurrentTime(time);
    });
  }

  public async loadFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) {
      eventBus.emit('audioLoadError', '文件大小不能超过20MB');
      return;
    }

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'];
    const validExtensions = ['.mp3', '.wav'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      eventBus.emit('audioLoadError', '只支持MP3和WAV格式');
      return;
    }

    this.setState('loading');
    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sampleRate = this.audioContext.sampleRate;

    const url = URL.createObjectURL(file);

    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    try {
      await new Promise<void>((resolve, reject) => {
        if (!this.audioElement) return reject(new Error('Audio element not created'));

        const onCanPlay = () => {
          this.duration = this.audioElement!.duration;
          this.sampleRate = this.audioContext!.sampleRate;
          this.setupNodes();
          resolve();
        };

        const onError = () => {
          reject(new Error('音频文件加载失败'));
        };

        this.audioElement.addEventListener('canplaythrough', onCanPlay, { once: true });
        this.audioElement.addEventListener('error', onError, { once: true });
        this.audioElement.load();
      });

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          eventBus.emit('audioTimeUpdate', {
            currentTime: this.audioElement.currentTime,
            duration: this.audioElement.duration
          });
          updateGlobalState({
            audioFile: {
              ...globalState.audioFile,
              currentTime: this.audioElement.currentTime,
              duration: this.audioElement.duration
            }
          });
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.setState('ready');
        this.stopFreqLoop();
      });

      updateGlobalState({
        audioFile: {
          name: file.name,
          duration: this.duration,
          currentTime: 0
        }
      });
      eventBus.emit('audioLoaded', {
        fileName: file.name,
        duration: this.duration
      });
      this.setState('ready');
    } catch (err: any) {
      this.setState('idle');
      eventBus.emit('audioLoadError', err.message || '音频文件加载失败');
    }
  }

  private get duration(): number {
    return this.audioElement?.duration ?? 0;
  }

  private set duration(_: number) {
  }

  private setState(state: AudioState): void {
    updateGlobalState({
      audioState: state,
      isPlaying: state === 'playing'
    });
    eventBus.emit('audioStateChange', state);
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

    const state = globalState.audioState;
    if (state === 'ready' || state === 'paused') {
      await this.audioElement.play();
      this.setState('playing');
      this.startFreqLoop();
    }
  }

  public pause(): void {
    if (this.audioElement && globalState.audioState === 'playing') {
      this.audioElement.pause();
      this.setState('paused');
      this.stopFreqLoop();
    }
  }

  public togglePlay(): void {
    if (globalState.audioState === 'playing') {
      this.pause();
    } else if (globalState.audioState === 'ready' || globalState.audioState === 'paused') {
      this.play();
    }
  }

  private startFreqLoop(): void {
    if (this.rafId !== null) return;

    const loop = () => {
      const data = this.getFreqData();
      updateGlobalState({ freqData: data });
      eventBus.emit('freqDataUpdate', data);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopFreqLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public getFreqData(): FreqBandData {
    if (!this.analyserNode || !this.frequencyData) {
      return { low: 0, mid: 0, high: 0 };
    }

    this.analyserNode.getByteFrequencyData(this.frequencyData);

    const binCount = this.frequencyData.length;
    const binWidth = this.sampleRate / 2 / binCount;

    const freqToBin = (freq: number): number => Math.floor(freq / binWidth);

    const lowStart = freqToBin(20);
    const lowEnd = freqToBin(250);
    const midStart = lowEnd;
    const midEnd = freqToBin(4000);
    const highStart = midEnd;
    const highEnd = freqToBin(20000);

    let lowSum = 0;
    let lowCount = 0;
    const safeLowEnd = Math.min(lowEnd, binCount);
    for (let i = lowStart; i < safeLowEnd; i++) {
      lowSum += this.frequencyData[i];
      lowCount++;
    }

    let midSum = 0;
    let midCount = 0;
    const safeMidEnd = Math.min(midEnd, binCount);
    for (let i = midStart; i < safeMidEnd; i++) {
      midSum += this.frequencyData[i];
      midCount++;
    }

    let highSum = 0;
    let highCount = 0;
    const safeHighEnd = Math.min(highEnd, binCount);
    for (let i = highStart; i < safeHighEnd; i++) {
      highSum += this.frequencyData[i];
      highCount++;
    }

    return {
      low: lowCount > 0 ? lowSum / lowCount : 0,
      mid: midCount > 0 ? midSum / midCount : 0,
      high: highCount > 0 ? highSum / highCount : 0
    };
  }

  public setCurrentTime(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
    }
  }

  private cleanup(): void {
    this.stopFreqLoop();

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
    updateGlobalState({
      audioState: 'idle',
      isPlaying: false
    });
  }
}
