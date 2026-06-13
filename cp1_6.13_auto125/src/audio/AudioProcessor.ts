export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null
  private rafId: number = 0
  private pulseCooldown: number = 0

  public threshold: number = 0.3
  public onVolume: ((volume: number, waveData: Float32Array) => void) | null = null
  public onPulse: (() => void) | null = null
  public onStoneTone: ((frequency: number, duration: number) => void) | null = null

  async startMicrophone(): Promise<void> {
    if (this.stream) return

    this.audioContext = new AudioContext()
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.microphone = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    this.analyser.smoothingTimeConstant = 0.5
    this.microphone.connect(this.analyser)

    this.startAnalysis()
  }

  private startAnalysis(): void {
    if (!this.analyser) return

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)
    const timeDataArray = new Float32Array(256)

    const analyze = () => {
      if (!this.analyser || !this.audioContext) return

      this.analyser.getFloatFrequencyData(dataArray)
      this.analyser.getFloatTimeDomainData(timeDataArray)

      let sumSquares = 0
      for (let i = 0; i < bufferLength; i++) {
        const normalized = Math.max(-100, dataArray[i]) / 100 + 1
        sumSquares += normalized * normalized
      }
      const volume = Math.sqrt(sumSquares / bufferLength)

      if (this.onVolume) {
        this.onVolume(volume, timeDataArray)
      }

      if (this.pulseCooldown > 0) {
        this.pulseCooldown -= 16
      }

      if (volume > this.threshold && this.pulseCooldown <= 0) {
        this.pulseCooldown = 400
        if (this.onPulse) {
          this.onPulse()
        }
      }

      this.rafId = requestAnimationFrame(analyze)
    }

    analyze()
  }

  playStoneTone(frequency: number = 440, duration: number = 0.5): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(this.audioContext.destination)

    osc.start(now)
    osc.stop(now + duration)
  }

  playPulseSound(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1200, now)
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.8)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.8)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.audioContext.destination)

    osc.start(now)
    osc.stop(now + 0.8)
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId)
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.audioContext = null
    this.analyser = null
    this.microphone = null
    this.stream = null
  }
}
