import { eventBus } from '../utils/eventBus';

export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  lowEnergy: number;
  midHighEnergy: number;
  bassEnergy: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private animationId: number | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;
  private fileName: string = '';
  private decodeProgressTimer: number | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;
      this.gainNode.connect(this.audioContext.destination);
      this.analyser.connect(this.gainNode);
      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(new ArrayBuffer(bufferLength)) as Uint8Array<ArrayBuffer>;
      this.timeDomainData = new Uint8Array(new ArrayBuffer(bufferLength)) as Uint8Array<ArrayBuffer>;
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  async loadFile(file: File): Promise<void> {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('文件大小超过50MB限制');
    }
    if (!/\.mp3$|\.wav$/i.test(file.name)) {
      throw new Error('仅支持MP3和WAV格式');
    }

    this.fileName = file.name;
    eventBus.emit('audio:fileName', file.name);
    eventBus.emit('audio:loadProgress', 0);

    let lastReportedProgress = 0;
    const reportProgress = (percent: number) => {
      const rounded = Math.round(percent);
      if (rounded > lastReportedProgress) {
        lastReportedProgress = rounded;
        eventBus.emit('audio:loadProgress', rounded);
      }
    };

    const fileSizeKB = file.size / 1024;
    const totalSteps = Math.max(10, Math.min(50, Math.round(fileSizeKB / 100)));
    const stepPercent = 45 / totalSteps;
    const stepInterval = Math.max(20, Math.min(100, 500 / totalSteps));

    let simulatedReadProgress = 0;
    let hasRealProgress = false;
    let readProgressInterval: number | null = null;

    const startSimulatedProgress = () => {
      if (hasRealProgress || readProgressInterval !== null) return;
      let currentStep = 0;
      readProgressInterval = window.setInterval(() => {
        if (hasRealProgress) {
          if (readProgressInterval !== null) {
            clearInterval(readProgressInterval);
            readProgressInterval = null;
          }
          return;
        }
        currentStep++;
        simulatedReadProgress = Math.min(45, currentStep * stepPercent);
        reportProgress(simulatedReadProgress);
        if (currentStep >= totalSteps && readProgressInterval !== null) {
          clearInterval(readProgressInterval);
          readProgressInterval = null;
        }
      }, stepInterval);
    };

    startSimulatedProgress();

    const onReadProgress = (percent: number, isReal: boolean) => {
      if (isReal) {
        hasRealProgress = true;
        if (readProgressInterval !== null) {
          clearInterval(readProgressInterval);
          readProgressInterval = null;
        }
      }
      reportProgress(Math.max(simulatedReadProgress, percent));
    };

    const arrayBuffer = await this.readFileAsArrayBuffer(file, onReadProgress);
    if (readProgressInterval !== null) {
      clearInterval(readProgressInterval);
      readProgressInterval = null;
    }
    reportProgress(50);

    if (!this.audioContext) {
      this.initAudioContext();
    }

    let decodeProgress = 50;
    const decodeStart = Date.now();
    const expectedDecodeTime = Math.min(3000, Math.max(500, file.size / 50000));
    const decodeSteps = Math.max(10, Math.min(30, Math.round(fileSizeKB / 200)));
    const decodeInterval = expectedDecodeTime / decodeSteps;

    this.decodeProgressTimer = window.setInterval(() => {
      const elapsed = Date.now() - decodeStart;
      const simulatedProgress = Math.min(95, 50 + (elapsed / expectedDecodeTime) * 45);
      if (simulatedProgress > decodeProgress) {
        decodeProgress = simulatedProgress;
        reportProgress(decodeProgress);
      }
    }, Math.max(30, decodeInterval));

    try {
      this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
      if (this.decodeProgressTimer !== null) {
        clearInterval(this.decodeProgressTimer);
        this.decodeProgressTimer = null;
      }
      reportProgress(100);
    } catch (e) {
      if (this.decodeProgressTimer !== null) {
        clearInterval(this.decodeProgressTimer);
        this.decodeProgressTimer = null;
      }
      throw e;
    }

    eventBus.emit('audio:loaded', {
      duration: this.audioBuffer.duration,
      fileName: file.name
    });

    this.play();
  }

  private readFileAsArrayBuffer(file: File, onProgress: (percent: number, isReal: boolean) => void): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 50;
          onProgress(percent, true);
        }
      };
      reader.onload = () => {
        onProgress(50, true);
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = () => {
        reject(reader.error || new Error('文件读取失败'));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stopSource();
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser!);
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
        eventBus.emit('audio:ended');
        eventBus.emit('audio:timeupdate', 0, this.audioBuffer?.duration || 0);
      }
    };

    this.startTime = this.audioContext.currentTime - this.pausedAt;
    this.source.start(0, this.pausedAt);
    this.isPlaying = true;
    eventBus.emit('audio:play');
    this.startAnalysis();
  }

  pause(): void {
    if (!this.isPlaying || !this.audioContext) return;
    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.stopSource();
    this.isPlaying = false;
    eventBus.emit('audio:pause');
    this.stopAnalysis();
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;
    const wasPlaying = this.isPlaying;
    this.pausedAt = Math.max(0, Math.min(time, this.audioBuffer.duration));
    if (wasPlaying) {
      this.play();
    } else {
      eventBus.emit('audio:timeupdate', this.pausedAt, this.audioBuffer.duration);
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
  }

  private startAnalysis(): void {
    this.stopAnalysis();
    const analyze = () => {
      if (!this.analyser || !this.frequencyData || !this.timeDomainData) return;
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);

      const lowEnergy = this.calculateBandEnergy(20, 250);
      const midHighEnergy = this.calculateBandEnergy(250, 2000);
      const bassEnergy = this.calculateBandEnergy(20, 120);

      const audioData: AudioData = {
        frequencyData: new Uint8Array(this.frequencyData) as Uint8Array<ArrayBuffer>,
        timeDomainData: new Uint8Array(this.timeDomainData) as Uint8Array<ArrayBuffer>,
        lowEnergy,
        midHighEnergy,
        bassEnergy
      };

      eventBus.emit('audio:data', audioData);

      if (this.audioContext && this.audioBuffer && this.isPlaying) {
        const currentTime = this.audioContext.currentTime - this.startTime;
        eventBus.emit('audio:timeupdate', currentTime, this.audioBuffer.duration);
      }

      this.animationId = requestAnimationFrame(analyze);
    };
    analyze();
  }

  private stopAnalysis(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private calculateBandEnergy(minFreq: number, maxFreq: number): number {
    if (!this.analyser || !this.frequencyData || !this.audioContext) return 0;
    const nyquist = this.audioContext.sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;
    const binWidth = nyquist / binCount;
    const startBin = Math.floor(minFreq / binWidth);
    const endBin = Math.min(Math.ceil(maxFreq / binWidth), binCount - 1);
    let sum = 0;
    let count = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += this.frequencyData[i];
      count++;
    }
    return count > 0 ? sum / (count * 255) : 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getFileName(): string {
    return this.fileName;
  }

  destroy(): void {
    this.stopAnalysis();
    this.stopSource();
    if (this.decodeProgressTimer !== null) {
      clearInterval(this.decodeProgressTimer);
      this.decodeProgressTimer = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioAnalyzer;
