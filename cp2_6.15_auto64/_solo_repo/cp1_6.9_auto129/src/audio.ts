export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private riverNoiseNode: AudioBufferSourceNode | null = null
  private riverGain: GainNode | null = null
  private boatFrictionOsc: OscillatorNode | null = null
  private boatFrictionGain: GainNode | null = null
  private initialized = false

  constructor() {}

  init() {
    if (this.initialized) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioContext = new AudioCtx()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.audioContext.destination)
      this.initialized = true
      this.startRiverAmbient()
      this.startBoatFriction()
    } catch (e) {
      console.warn('Web Audio API not supported:', e)
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  private createNoiseBuffer(duration: number = 2): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')
    const bufferSize = this.audioContext.sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  private startRiverAmbient() {
    if (!this.audioContext || !this.masterGain) return

    const noiseBuffer = this.createNoiseBuffer(3)
    this.riverNoiseNode = this.audioContext.createBufferSource()
    this.riverNoiseNode.buffer = noiseBuffer
    this.riverNoiseNode.loop = true

    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 200
    filter.Q.value = 0.5

    const filter2 = this.audioContext.createBiquadFilter()
    filter2.type = 'bandpass'
    filter2.frequency.value = 120
    filter2.Q.value = 0.3

    this.riverGain = this.audioContext.createGain()
    this.riverGain.gain.value = 0.08

    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    lfo.frequency.value = 0.3
    lfoGain.gain.value = 60
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    this.riverNoiseNode.connect(filter)
    filter.connect(filter2)
    filter2.connect(this.riverGain)
    this.riverGain.connect(this.masterGain)

    this.riverNoiseNode.start()
    lfo.start()
  }

  private startBoatFriction() {
    if (!this.audioContext || !this.masterGain) return

    this.boatFrictionOsc = this.audioContext.createOscillator()
    this.boatFrictionOsc.type = 'sawtooth'
    this.boatFrictionOsc.frequency.value = 150

    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 250

    this.boatFrictionGain = this.audioContext.createGain()
    this.boatFrictionGain.gain.value = 0.03

    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    lfo.frequency.value = 1.5 + Math.random()
    lfoGain.gain.value = 0.015
    lfo.connect(lfoGain)
    lfoGain.connect(this.boatFrictionGain.gain)

    this.boatFrictionOsc.connect(filter)
    filter.connect(this.boatFrictionGain)
    this.boatFrictionGain.connect(this.masterGain)

    this.boatFrictionOsc.start()
    lfo.start()
  }

  playCollectArpeggio(startFreq: number = 440) {
    if (!this.audioContext || !this.masterGain) return
    const now = this.audioContext.currentTime
    const semitoneRatio = Math.pow(2, 1 / 12)

    const noteOffsets = [0, 3 + Math.floor(Math.random() * 3), 7 + Math.floor(Math.random() * 3)]

    noteOffsets.forEach((offset, i) => {
      const freq = startFreq * Math.pow(semitoneRatio, offset)
      const osc = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      const startTime = now + i * 0.08
      const endTime = startTime + 0.25

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, endTime)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(startTime)
      osc.stop(endTime)
    })
  }

  playPortalPulse() {
    if (!this.audioContext || !this.masterGain) return
    const now = this.audioContext.currentTime

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(50, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.3)
  }

  playWallBounce() {
    if (!this.audioContext || !this.masterGain) return
    const now = this.audioContext.currentTime

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15)

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 300

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.15)
  }

  playGameOver() {
    if (!this.audioContext || !this.masterGain) return
    const now = this.audioContext.currentTime

    for (let i = 0; i < 4; i++) {
      const osc = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()
      const freq = 220 * Math.pow(0.9, i)

      osc.type = 'sine'
      osc.frequency.value = freq

      const startTime = now + i * 0.2
      const endTime = startTime + 0.5

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, endTime)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(startTime)
      osc.stop(endTime)
    }
  }

  playVictory() {
    if (!this.audioContext || !this.masterGain) return
    const now = this.audioContext.currentTime
    const freqs = [523.25, 659.25, 783.99, 1046.5]

    freqs.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()

      osc.type = 'triangle'
      osc.frequency.value = freq

      const startTime = now + i * 0.12
      const endTime = startTime + 0.5

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, endTime)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(startTime)
      osc.stop(endTime)
    })
  }

  destroy() {
    if (this.riverNoiseNode) {
      try { this.riverNoiseNode.stop() } catch (e) {}
    }
    if (this.boatFrictionOsc) {
      try { this.boatFrictionOsc.stop() } catch (e) {}
    }
    if (this.audioContext) {
      try { this.audioContext.close() } catch (e) {}
    }
  }
}
