import { EventEmitter } from './EventBus'
import { WaveType } from './types'

type EventBus = EventEmitter<Record<string, unknown>>

export class SoundEngine {
  private eventBus: EventBus
  private ctx: AudioContext | null = null
  private oscillator: OscillatorNode | null = null
  private gainNode: GainNode | null = null
  private analyser: AnalyserNode | null = null

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return null
      this.ctx = new AudioCtx()
      return this.ctx
    } catch {
      return null
    }
  }

  start(frequency: number, waveType: WaveType): void {
    const ctx = this.ensureContext()
    if (!ctx) return

    this.stop()

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    oscillator.type = waveType
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048

    oscillator.connect(gainNode)
    gainNode.connect(analyser)
    analyser.connect(ctx.destination)

    oscillator.start()

    this.oscillator = oscillator
    this.gainNode = gainNode
    this.analyser = analyser

    this.eventBus.emit('waveGenerated', { frequency, waveType })
  }

  stop(): void {
    if (!this.oscillator || !this.gainNode || !this.ctx) {
      this.cleanup()
      return
    }

    const ctx = this.ctx
    const gain = this.gainNode
    const osc = this.oscillator

    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)

    osc.stop(ctx.currentTime + 0.05)

    this.oscillator = null
    this.gainNode = null

    osc.onended = () => {
      try {
        gain.disconnect()
      } catch {}
    }
  }

  analyze(): Float32Array {
    if (!this.analyser) return new Float32Array(0)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return new Float32Array(data)
  }

  getWaveformData(): Float32Array {
    if (!this.analyser) return new Float32Array(0)
    const data = new Uint8Array(this.analyser.fftSize)
    this.analyser.getByteTimeDomainData(data)
    return new Float32Array(data)
  }

  detectFrequency(): number {
    if (!this.analyser || !this.ctx) return 0

    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)

    let maxIndex = 0
    let maxValue = 0
    for (let i = 0; i < data.length; i++) {
      if (data[i] > maxValue) {
        maxValue = data[i]
        maxIndex = i
      }
    }

    if (maxValue === 0) return 0

    const frequency = maxIndex * this.ctx.sampleRate / this.analyser.fftSize
    this.eventBus.emit('frequencyDetected', { frequency, amplitude: maxValue })

    return frequency
  }

  destroy(): void {
    this.stop()
    if (this.analyser) {
      try { this.analyser.disconnect() } catch {}
      this.analyser = null
    }
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }

  private cleanup(): void {
    if (this.oscillator) {
      try { this.oscillator.stop() } catch {}
      try { this.oscillator.disconnect() } catch {}
      this.oscillator = null
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect() } catch {}
      this.gainNode = null
    }
    if (this.analyser) {
      try { this.analyser.disconnect() } catch {}
      this.analyser = null
    }
  }
}
