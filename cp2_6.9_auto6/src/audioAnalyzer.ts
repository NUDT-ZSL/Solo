export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array;
  private isActive: boolean = false;

  constructor() {
    this.frequencyData = new Uint8Array(128);
  }

  async start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      this.isActive = true;
      return true;
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      return false;
    }
  }

  stop(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.isActive = false;
  }

  update(): void {
    if (this.analyser && this.isActive) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
  }

  getFrequencyData(): Uint8Array {
    return this.frequencyData;
  }

  getLowFrequencyEnergy(): number {
    let sum = 0;
    const len = Math.floor(this.frequencyData.length * 0.2);
    for (let i = 0; i < len; i++) {
      sum += this.frequencyData[i];
    }
    return sum / len / 255;
  }

  getHighFrequencyEnergy(): number {
    let sum = 0;
    const start = Math.floor(this.frequencyData.length * 0.6);
    const len = this.frequencyData.length - start;
    for (let i = start; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    return sum / len / 255;
  }

  getTotalEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    return sum / this.frequencyData.length / 255;
  }

  getActive(): boolean {
    return this.isActive;
  }
}
