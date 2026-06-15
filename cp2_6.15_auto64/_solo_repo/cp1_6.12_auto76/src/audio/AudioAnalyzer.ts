type SpectrumCallback = (data: Uint8Array) => void

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: AudioBufferSourceNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private frequencyData: Uint8Array
  private timeData: Uint8Array
  private spectrumIntervalId: number | null = null
  private spectrumRate: number = 30
  private startTime: number = 0
  private pausedAt: number = 0
  private isPlaying: boolean = false
  private spectrumCallbacks: Set<SpectrumCallback> = new Set()

  constructor() {
    this.frequencyData = new Uint8Array(256)
    this.timeData = new Uint8Array(256)
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.6
    }
    return this.audioContext
  }

  async loadAudioFile(file: File): Promise<void> {
    const ctx = this.ensureContext()
    this.stop()
    const arrayBuffer = await file.arrayBuffer()
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    this.pausedAt = 0
  }

  play(): void {
    if (!this.audioBuffer || this.isPlaying) return
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
    this.source = ctx.createBufferSource()
    this.source.buffer = this.audioBuffer
    this.source.connect(this.analyser!)
    this.analyser!.connect(ctx.destination)
    const offset = this.pausedAt
    this.source.start(0, offset)
    this.startTime = ctx.currentTime - offset
    this.isPlaying = true
    this.startSpectrumTimer()
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false
        this.pausedAt = 0
        this.stopSpectrumTimer()
      }
    }
  }

  pause(): void {
    if (!this.isPlaying || !this.source) return
    const currentTime = this.getCurrentTime()
    this.source.stop()
    this.source.disconnect()
    this.source = null
    this.pausedAt = currentTime
    this.isPlaying = false
    this.stopSpectrumTimer()
  }

  stop(): void {
    if (this.source) {
      try { this.source.stop() } catch (_e) { /* noop */ }
      this.source.disconnect()
      this.source = null
    }
    this.isPlaying = false
    this.pausedAt = 0
    this.stopSpectrumTimer()
  }

  private startSpectrumTimer(): void {
    this.stopSpectrumTimer()
    const intervalMs = 1000 / this.spectrumRate
    this.spectrumIntervalId = window.setInterval(() => {
      if (this.analyser) {
        this.analyser.getByteFrequencyData(this.frequencyData)
        this.analyser.getByteTimeDomainData(this.timeData)
        this.spectrumCallbacks.forEach(cb => cb(this.frequencyData))
      }
    }, intervalMs)
  }

  private stopSpectrumTimer(): void {
    if (this.spectrumIntervalId !== null) {
      clearInterval(this.spectrumIntervalId)
      this.spectrumIntervalId = null
    }
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData)
    }
    return this.frequencyData
  }

  getTimeData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeData)
    }
    return this.timeData
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pausedAt
    return this.audioContext.currentTime - this.startTime
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0
  }

  isAudioLoaded(): boolean {
    return this.audioBuffer !== null
  }

  isAudioPlaying(): boolean {
    return this.isPlaying
  }

  setSpectrumRate(hz: number): void {
    this.spectrumRate = Math.max(10, Math.min(120, hz))
    if (this.isPlaying) {
      this.startSpectrumTimer()
    }
  }

  getSpectrumRate(): number {
    return this.spectrumRate
  }

  onSpectrumUpdate(callback: SpectrumCallback): () => void {
    this.spectrumCallbacks.add(callback)
    return () => this.spectrumCallbacks.delete(callback)
  }

  getLowFrequencyEnergy(): number {
    let sum = 0
    const count = 16
    for (let i = 0; i < count && i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i]
    }
    return sum / count / 255
  }

  dispose(): void {
    this.stop()
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.audioContext) {
      void this.audioContext.close()
      this.audioContext = null
    }
    this.spectrumCallbacks.clear()
  }
}
