import type { InstrumentType, EnsembleResult, Note, EnsembleMode, Measure } from '../types'

export class AudioEngine {
  private static instance: AudioEngine | null = null
  private audioContext: AudioContext | null = null

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  private getContext(): AudioContext | null {
    return this.audioContext
  }

  playNote(instrument: InstrumentType, pitch: number, duration: number): void {
    const ctx = this.getContext()
    if (!ctx) return

    const baseFreq = 220 * Math.pow(2, pitch / 12)
    const now = ctx.currentTime

    switch (instrument) {
      case 'piano': {
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(baseFreq, now)
        osc2.type = 'triangle'
        osc2.frequency.setValueAtTime(baseFreq * 2, now)

        const osc2Gain = ctx.createGain()
        osc2Gain.gain.setValueAtTime(0.3, now)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.4, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        osc1.connect(gain)
        osc2.connect(osc2Gain)
        osc2Gain.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + duration)
        osc2.stop(now + duration)
        break
      }

      case 'violin': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(baseFreq, now)

        lfo.type = 'sine'
        lfo.frequency.setValueAtTime(6, now)
        lfoGain.gain.setValueAtTime(3, now)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        lfo.connect(lfoGain)
        lfoGain.connect(osc.frequency)
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        lfo.start(now)
        osc.stop(now + duration)
        lfo.stop(now + duration)
        break
      }

      case 'cello': {
        const osc = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(baseFreq / 2, now)
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(baseFreq / 2, now)

        const osc2Gain = ctx.createGain()
        osc2Gain.gain.setValueAtTime(0.5, now)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.35, now + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        osc.connect(gain)
        osc2.connect(osc2Gain)
        osc2Gain.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc2.start(now)
        osc.stop(now + duration)
        osc2.stop(now + duration)
        break
      }

      case 'flute': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(baseFreq, now)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.25, now + 0.005)
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + duration)
        break
      }

      case 'percussion': {
        const bufferSize = Math.floor(ctx.sampleRate * duration)
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)

        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15))
        }

        const source = ctx.createBufferSource()
        source.buffer = buffer

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.5, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        const filter = ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.setValueAtTime(800 + pitch * 100, now)

        source.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        source.start(now)
        break
      }
    }
  }

  playBell(): void {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  }

  async playEnsemble(
    result: EnsembleResult,
    onProgress: (progress: number) => void
  ): Promise<void> {
    const ctx = this.getContext()
    if (!ctx) {
      onProgress(100)
      return
    }

    const events: Array<{ time: number; note: Note }> = []
    const beatsPerSecond = 2

    for (const measure of result.measures) {
      for (const note of measure.notes) {
        const time =
          (measure.measureNumber - 1) * 4 * beatsPerSecond + note.beat * beatsPerSecond
        events.push({ time, note })
      }
    }

    if (events.length === 0) {
      onProgress(100)
      return
    }

    const startAt = ctx.currentTime
    const totalDur = result.totalDuration

    for (const event of events) {
      const delay = event.time * 1000
      setTimeout(() => {
        this.playNote(event.note.instrument, event.note.pitch, event.note.duration)
      }, delay)
    }

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!this.audioContext) {
          clearInterval(interval)
          onProgress(100)
          resolve()
          return
        }
        const elapsed = this.audioContext.currentTime - startAt
        const prog = Math.min(100, (elapsed / totalDur) * 100)
        onProgress(prog)

        if (prog >= 100) {
          clearInterval(interval)
          onProgress(100)
          resolve()
        }
      }, 50)
    })
  }
}
