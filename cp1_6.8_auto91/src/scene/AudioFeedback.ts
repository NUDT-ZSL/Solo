export class AudioFeedback {
  private ctx: AudioContext | null = null
  private windOsc: OscillatorNode | null = null
  private windGain: GainNode | null = null
  private windFilter: BiquadFilterNode | null = null
  private initialized: boolean = false

  init() {
    if (this.initialized) return
    try {
      this.ctx = new AudioContext()
      this.windFilter = this.ctx.createBiquadFilter()
      this.windFilter.type = 'lowpass'
      this.windFilter.frequency.value = 300
      this.windFilter.Q.value = 1

      this.windOsc = this.ctx.createOscillator()
      this.windOsc.type = 'sawtooth'
      this.windOsc.frequency.value = 100

      this.windGain = this.ctx.createGain()
      this.windGain.gain.value = 0

      this.windOsc.connect(this.windFilter)
      this.windFilter.connect(this.windGain)
      this.windGain.connect(this.ctx.destination)
      this.windOsc.start()
      this.initialized = true
    } catch {
      this.initialized = false
    }
  }

  updateWind(windSpeed: number) {
    if (!this.windOsc || !this.windGain || !this.windFilter) return
    const t = this.ctx!.currentTime
    const speedRatio = windSpeed / 10
    this.windOsc.frequency.setTargetAtTime(80 + speedRatio * 120, t, 0.3)
    this.windGain.gain.setTargetAtTime(speedRatio * 0.06, t, 0.3)
    this.windFilter.frequency.setTargetAtTime(200 + speedRatio * 400, t, 0.3)
  }

  playAvalanche() {
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 50 + Math.random() * 30

      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8)

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 150
      filter.Q.value = 2

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.8)
    } catch {
      // ignore audio errors
    }
  }

  dispose() {
    try {
      this.windOsc?.stop()
    } catch {
      // ignore
    }
    this.ctx?.close()
    this.ctx = null
    this.initialized = false
  }
}
