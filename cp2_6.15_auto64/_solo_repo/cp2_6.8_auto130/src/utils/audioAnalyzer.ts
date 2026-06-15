export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null

  constructor() {
    this.init()
  }

  private init() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    } catch (e) {
      console.error('Web Audio API not supported:', e)
    }
  }

  connectMediaElement(element: HTMLMediaElement) {
    if (!this.audioContext || !this.analyser) return
    try {
      if (this.source) {
        this.source.disconnect()
      }
      this.source = this.audioContext.createMediaElementSource(element)
      this.source.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)
    } catch (e) {
      console.error('Failed to connect media element:', e)
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  getSpectrum(): number[] {
    if (!this.analyser || !this.dataArray) {
      return new Array(128).fill(0)
    }
    this.analyser.getByteFrequencyData(this.dataArray)
    return Array.from(this.dataArray).map((v) => v / 255)
  }

  getWaveform(): number[] {
    if (!this.analyser || !this.dataArray) {
      return new Array(128).fill(0)
    }
    this.analyser.getByteTimeDomainData(this.dataArray)
    return Array.from(this.dataArray).map((v) => v / 255)
  }

  async decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null
    try {
      return await this.audioContext.decodeAudioData(buffer.slice(0))
    } catch (e) {
      console.error('Failed to decode audio data:', e)
      return null
    }
  }

  destroy() {
    if (this.source) {
      try {
        this.source.disconnect()
      } catch (e) {
        // ignore
      }
      this.source = null
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect()
      } catch (e) {
        // ignore
      }
      this.analyser = null
    }
    if (this.audioContext) {
      try {
        this.audioContext.close()
      } catch (e) {
        // ignore
      }
      this.audioContext = null
    }
    this.dataArray = null
  }
}
