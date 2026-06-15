export interface RainMix {
  drizzle: number
  shower: number
  thunder: number
}

export interface AudioEngineState {
  mix: RainMix
  intensity: number
  stormMode: boolean
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null

  private drizzleSource: AudioBufferSourceNode | null = null
  private drizzleFilter: BiquadFilterNode | null = null
  private drizzleGain: GainNode | null = null

  private showerSource: AudioBufferSourceNode | null = null
  private showerFilter: BiquadFilterNode | null = null
  private showerGain: GainNode | null = null

  private thunderSource: AudioBufferSourceNode | null = null
  private thunderFilter: BiquadFilterNode | null = null
  private thunderGain: GainNode | null = null
  private thunderPulseGain: GainNode | null = null

  private stormOscillator: OscillatorNode | null = null
  private stormGain: GainNode | null = null
  private stormIntervalId: number | null = null
  private thunderPulseIntervalId: number | null = null

  private state: AudioEngineState = {
    mix: { drizzle: 0.5, shower: 0.3, thunder: 0.2 },
    intensity: 50,
    stormMode: false
  }

  private isInitialized = false
  private isStarted = false

  private createNoiseBuffer(type: 'white' | 'pink', duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized')
    const bufferSize = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
    } else {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    }
    return buffer
  }

  private createLowFrequencyNoise(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized')
    const bufferSize = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      let sample = 0
      for (let f = 100; f <= 500; f += 20) {
        sample += Math.sin(2 * Math.PI * f * i / this.ctx.sampleRate) * (Math.random() * 0.5 + 0.5)
      }
      data[i] = sample / 20
    }
    return buffer
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.intensityToGain(this.state.intensity)

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8

    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)

    this.setupDrizzle()
    this.setupShower()
    this.setupThunder()

    this.updateMixGains()

    this.isInitialized = true
  }

  private setupDrizzle(): void {
    if (!this.ctx || !this.masterGain) return

    const buffer = this.createNoiseBuffer('pink', 5)
    this.drizzleSource = this.ctx.createBufferSource()
    this.drizzleSource.buffer = buffer
    this.drizzleSource.loop = true

    this.drizzleFilter = this.ctx.createBiquadFilter()
    this.drizzleFilter.type = 'bandpass'
    this.drizzleFilter.frequency.value = 3000
    this.drizzleFilter.Q.value = 1.5

    this.drizzleGain = this.ctx.createGain()
    this.drizzleGain.gain.value = 0

    this.drizzleSource.connect(this.drizzleFilter)
    this.drizzleFilter.connect(this.drizzleGain)
    this.drizzleGain.connect(this.masterGain)
  }

  private setupShower(): void {
    if (!this.ctx || !this.masterGain) return

    const buffer = this.createNoiseBuffer('white', 5)
    this.showerSource = this.ctx.createBufferSource()
    this.showerSource.buffer = buffer
    this.showerSource.loop = true

    this.showerFilter = this.ctx.createBiquadFilter()
    this.showerFilter.type = 'bandpass'
    this.showerFilter.frequency.value = 1500
    this.showerFilter.Q.value = 1.2

    this.showerGain = this.ctx.createGain()
    this.showerGain.gain.value = 0

    this.showerSource.connect(this.showerFilter)
    this.showerFilter.connect(this.showerGain)
    this.showerGain.connect(this.masterGain)
  }

  private setupThunder(): void {
    if (!this.ctx || !this.masterGain) return

    const buffer = this.createLowFrequencyNoise(5)
    this.thunderSource = this.ctx.createBufferSource()
    this.thunderSource.buffer = buffer
    this.thunderSource.loop = true

    this.thunderFilter = this.ctx.createBiquadFilter()
    this.thunderFilter.type = 'lowpass'
    this.thunderFilter.frequency.value = 500
    this.thunderFilter.Q.value = 1

    this.thunderGain = this.ctx.createGain()
    this.thunderGain.gain.value = 0

    this.thunderPulseGain = this.ctx.createGain()
    this.thunderPulseGain.gain.value = 0

    this.thunderSource.connect(this.thunderFilter)
    this.thunderFilter.connect(this.thunderGain)
    this.thunderGain.connect(this.thunderPulseGain)
    this.thunderPulseGain.connect(this.masterGain)
  }

  private intensityToGain(intensity: number): number {
    const clamped = Math.max(0, Math.min(100, intensity))
    const db = -20 + (clamped / 100) * 20
    return Math.pow(10, db / 20)
  }

  private updateMixGains(): void {
    const { mix, intensity } = this.state
    const total = mix.drizzle + mix.shower + mix.thunder || 1
    const normDrizzle = mix.drizzle / total
    const normShower = mix.shower / total
    const normThunder = mix.thunder / total
    const base = this.intensityToGain(intensity)

    if (this.drizzleGain) {
      this.drizzleGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.drizzleGain.gain.linearRampToValueAtTime(normDrizzle * base * 0.8, this.ctx!.currentTime + 0.05)
    }
    if (this.showerGain) {
      this.showerGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.showerGain.gain.linearRampToValueAtTime(normShower * base * 0.7, this.ctx!.currentTime + 0.05)
    }
    if (this.thunderGain) {
      this.thunderGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.thunderGain.gain.linearRampToValueAtTime(normThunder * base * 0.9, this.ctx!.currentTime + 0.05)
    }
    if (this.thunderPulseGain) {
      this.thunderPulseGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.thunderPulseGain.gain.linearRampToValueAtTime(normThunder > 0.01 ? 1 : 0, this.ctx!.currentTime + 0.05)
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) await this.init()
    if (!this.ctx || this.isStarted) return

    if (this.ctx.state === 'suspended') await this.ctx.resume()

    this.drizzleSource?.start(0)
    this.showerSource?.start(0)
    this.thunderSource?.start(0)

    this.isStarted = true
    this.startThunderPulses()
  }

  stop(): void {
    this.drizzleSource?.stop()
    this.showerSource?.stop()
    this.thunderSource?.stop()
    this.stopStormMode()
    this.stopThunderPulses()
    this.isStarted = false
  }

  setMix(mix: Partial<RainMix>): void {
    this.state.mix = { ...this.state.mix, ...mix }
    this.updateMixGains()
  }

  setIntensity(intensity: number): void {
    this.state.intensity = Math.max(0, Math.min(100, intensity))
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(
        this.intensityToGain(this.state.intensity),
        this.ctx.currentTime + 0.05
      )
    }
    this.updateMixGains()
  }

  getIntensity(): number {
    return this.state.intensity
  }

  getMix(): RainMix {
    return { ...this.state.mix }
  }

  getDominantRainType(): keyof RainMix {
    const { drizzle, shower, thunder } = this.state.mix
    if (drizzle >= shower && drizzle >= thunder) return 'drizzle'
    if (shower >= thunder) return 'shower'
    return 'thunder'
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  private startThunderPulses(): void {
    if (this.thunderPulseIntervalId) return
    const schedule = () => {
      const delay = 3000 + Math.random() * 7000
      this.thunderPulseIntervalId = window.setTimeout(() => {
        if (!this.ctx || !this.thunderPulseGain || !this.isStarted) {
          schedule()
          return
        }
        if (this.state.mix.thunder > 0.05) {
          const now = this.ctx.currentTime
          const pulseGain = 0.8 + Math.random() * 0.4
          this.thunderPulseGain.gain.cancelScheduledValues(now)
          this.thunderPulseGain.gain.setValueAtTime(1, now)
          this.thunderPulseGain.gain.linearRampToValueAtTime(1 + pulseGain, now + 0.05)
          this.thunderPulseGain.gain.linearRampToValueAtTime(1, now + 0.4)
        }
        schedule()
      }, delay)
    }
    schedule()
  }

  private stopThunderPulses(): void {
    if (this.thunderPulseIntervalId !== null) {
      clearTimeout(this.thunderPulseIntervalId)
      this.thunderPulseIntervalId = null
    }
  }

  startStormMode(): void {
    if (!this.isInitialized || this.state.stormMode || !this.ctx || !this.masterGain) return
    this.state.stormMode = true

    this.stormOscillator = this.ctx.createOscillator()
    this.stormOscillator.type = 'sine'
    this.stormOscillator.frequency.value = 60

    this.stormGain = this.ctx.createGain()
    this.stormGain.gain.value = 0

    this.stormOscillator.connect(this.stormGain)
    this.stormGain.connect(this.masterGain)
    this.stormOscillator.start(0)

    const scheduleBoom = () => {
      if (!this.state.stormMode || !this.ctx || !this.stormGain) return
      const delay = 2000 + Math.random() * 3000
      this.stormIntervalId = window.setTimeout(() => {
        if (!this.ctx || !this.stormGain || !this.state.stormMode) return
        const now = this.ctx.currentTime
        const freq = 40 + Math.random() * 40
        this.stormOscillator?.frequency.cancelScheduledValues(now)
        this.stormOscillator?.frequency.setValueAtTime(freq, now)
        this.stormGain.gain.cancelScheduledValues(now)
        this.stormGain.gain.setValueAtTime(0, now)
        this.stormGain.gain.linearRampToValueAtTime(0.4, now + 0.02)
        this.stormGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        scheduleBoom()
      }, delay)
    }
    scheduleBoom()
  }

  stopStormMode(): void {
    this.state.stormMode = false
    if (this.stormIntervalId !== null) {
      clearTimeout(this.stormIntervalId)
      this.stormIntervalId = null
    }
    if (this.stormOscillator) {
      try { this.stormOscillator.stop() } catch { /* ignore */ }
      this.stormOscillator.disconnect()
      this.stormOscillator = null
    }
    if (this.stormGain) {
      this.stormGain.disconnect()
      this.stormGain = null
    }
  }

  isStormMode(): boolean {
    return this.state.stormMode
  }

  dispose(): void {
    this.stop()
    this.ctx?.close()
    this.ctx = null
  }
}
