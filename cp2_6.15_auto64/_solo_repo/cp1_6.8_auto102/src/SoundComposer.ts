const FREQ_MAP: Record<string, number> = {
  green: 440,
  pink: 523.25,
  yellow: 659.25,
}

function colorToNoteKey(r: number, g: number, b: number): string {
  if (g > r && g > b) return 'green'
  if (r > g && b > g) return 'pink'
  return 'yellow'
}

export class SoundComposer {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private volume: number = 0.5

  init(): void {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.volume
    this.masterGain.connect(this.ctx.destination)
  }

  setVolume(v: number): void {
    this.volume = v
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.05)
    }
  }

  playAuroraTone(r: number, g: number, b: number, posX: number): void {
    if (!this.ctx || !this.masterGain) this.init()
    if (!this.ctx || !this.masterGain) return

    const key = colorToNoteKey(r, g, b)
    const freq = FREQ_MAP[key]

    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime)

    const secondOsc = this.ctx.createOscillator()
    secondOsc.type = 'triangle'
    secondOsc.frequency.setValueAtTime(freq * 2, this.ctx.currentTime)

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime)
    filter.Q.setValueAtTime(1, this.ctx.currentTime)

    const gain = this.ctx.createGain()
    const now = this.ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5)

    const panner = this.ctx.createStereoPanner()
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, posX / 40)), now)

    osc.connect(filter)
    secondOsc.connect(filter)
    filter.connect(gain)
    gain.connect(panner)
    panner.connect(this.masterGain)

    osc.start(now)
    secondOsc.start(now)
    osc.stop(now + 3)
    secondOsc.stop(now + 3)
  }

  dispose(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
      this.masterGain = null
    }
  }
}
