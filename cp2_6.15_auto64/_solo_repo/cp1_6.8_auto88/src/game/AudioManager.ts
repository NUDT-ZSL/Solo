export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private initialized = false

  init() {
    if (this.initialized) return
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.3
      this.masterGain.connect(this.ctx.destination)
      this.initialized = true
    } catch {
      this.initialized = false
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.3) {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  private playNoise(duration: number, volume = 0.2) {
    if (!this.ctx || !this.masterGain) return
    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5
    }
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2000
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    source.start()
  }

  playJump() {
    this.playTone(440, 0.15, 'square', 0.2)
    setTimeout(() => this.playTone(660, 0.1, 'square', 0.15), 50)
  }

  playLand() {
    this.playTone(120, 0.1, 'triangle', 0.15)
  }

  playClimb() {
    this.playTone(330, 0.08, 'triangle', 0.15)
    setTimeout(() => this.playTone(440, 0.08, 'triangle', 0.12), 40)
  }

  playSteamHit() {
    this.playNoise(0.3, 0.25)
    this.playTone(200, 0.2, 'sawtooth', 0.15)
  }

  playSteamLeak() {
    this.playNoise(0.5, 0.15)
    this.playTone(150, 0.3, 'sawtooth', 0.1)
  }

  playCoreCollect() {
    this.playTone(880, 0.1, 'sine', 0.25)
    setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.2), 80)
    setTimeout(() => this.playTone(1320, 0.2, 'sine', 0.18), 160)
  }

  playLightToggle() {
    this.playTone(550, 0.15, 'triangle', 0.2)
    this.playTone(700, 0.1, 'triangle', 0.15)
  }

  playBossHit() {
    this.playTone(100, 0.3, 'sawtooth', 0.3)
    this.playNoise(0.2, 0.2)
  }

  playBossDeath() {
    this.playTone(200, 0.2, 'square', 0.25)
    setTimeout(() => this.playTone(150, 0.3, 'square', 0.2), 150)
    setTimeout(() => this.playTone(100, 0.5, 'sawtooth', 0.25), 300)
    setTimeout(() => this.playNoise(0.6, 0.3), 200)
  }

  playDoorOpen() {
    this.playTone(440, 0.2, 'sine', 0.2)
    setTimeout(() => this.playTone(550, 0.2, 'sine', 0.2), 100)
    setTimeout(() => this.playTone(660, 0.3, 'sine', 0.25), 200)
  }

  playPlayerHurt() {
    this.playTone(200, 0.15, 'sawtooth', 0.2)
    this.playNoise(0.15, 0.15)
  }

  playGameOver() {
    this.playTone(330, 0.3, 'square', 0.2)
    setTimeout(() => this.playTone(280, 0.3, 'square', 0.18), 250)
    setTimeout(() => this.playTone(220, 0.5, 'square', 0.15), 500)
  }

  playVictory() {
    this.playTone(523, 0.15, 'sine', 0.2)
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.2), 120)
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.2), 240)
    setTimeout(() => this.playTone(1047, 0.4, 'sine', 0.25), 360)
  }
}

export const audioManager = new AudioManager()
