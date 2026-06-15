export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  public isActive: boolean = false;
  public onStatusChange: ((active: boolean) => void) | null = null;

  public async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.isActive = true;

      if (this.onStatusChange) {
        this.onStatusChange(true);
      }

      return true;
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      this.isActive = false;
      if (this.onStatusChange) {
        this.onStatusChange(false);
      }
      return false;
    }
  }

  public stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.source = null;
    this.frequencyData = null;
    this.isActive = false;

    if (this.onStatusChange) {
      this.onStatusChange(false);
    }
  }

  public toggle(): Promise<boolean> {
    if (this.isActive) {
      this.stop();
      return Promise.resolve(false);
    } else {
      return this.start();
    }
  }

  private getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.frequencyData) return null;
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  private getBandEnergy(lowFreq: number, highFreq: number): number {
    const data = this.getFrequencyData();
    if (!data || !this.analyser || !this.audioContext) return 0;

    const nyquist = this.audioContext.sampleRate / 2;
    const lowIndex = Math.floor((lowFreq / nyquist) * data.length);
    const highIndex = Math.ceil((highFreq / nyquist) * data.length);

    let sum = 0;
    let count = 0;
    for (let i = lowIndex; i <= highIndex && i < data.length; i++) {
      sum += data[i];
      count++;
    }

    return count > 0 ? sum / (count * 255) : 0;
  }

  public getLowEnergy(): number {
    return this.getBandEnergy(20, 250);
  }

  public getMidEnergy(): number {
    return this.getBandEnergy(250, 2000);
  }

  public getHighEnergy(): number {
    return this.getBandEnergy(2000, 20000);
  }

  public getFullSpectrum(): number[] {
    const data = this.getFrequencyData();
    if (!data) return [];
    return Array.from(data).map((v) => v / 255);
  }

  public getPeakEnergy(): number {
    const data = this.getFrequencyData();
    if (!data) return 0;
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = data[i] / 255;
      if (val > max) max = val;
    }
    return max;
  }
}
