import type { SFXType } from './types'
import { bridge } from './Bridge'

class AudioManager {
  private audioContext: AudioContext | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicOscillator: OscillatorNode | null = null
  private isPlaying: boolean = false
  private initialized: boolean = false

  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    this.musicGain = this.audioContext.createGain()
    this.musicGain.gain.value = 0.1
    this.musicGain.connect(this.audioContext.destination)
    
    this.sfxGain = this.audioContext.createGain()
    this.sfxGain.gain.value = 0.3
    this.sfxGain.connect(this.audioContext.destination)

    bridge.on('audio:playMusic', () => this.playMusic())
    bridge.on('audio:stopMusic', () => this.stopMusic())
    bridge.on('audio:playSFX', (type: SFXType) => this.playSFX(type))

    this.initialized = true
  }

  private createMusicLoop(): void {
    if (!this.audioContext || !this.musicGain) {
      return
    }

    const osc1 = this.audioContext.createOscillator()
    const osc2 = this.audioContext.createOscillator()
    
    osc1.type = 'sine'
    osc2.type = 'triangle'
    
    const now = this.audioContext.currentTime
    const noteDuration = 0.4
    
    osc1.frequency.setValueAtTime(220, now)
    osc1.frequency.setValueAtTime(247, now + noteDuration)
    osc1.frequency.setValueAtTime(262, now + noteDuration * 2)
    osc1.frequency.setValueAtTime(294, now + noteDuration * 3)
    osc1.frequency.setValueAtTime(262, now + noteDuration * 4)
    osc1.frequency.setValueAtTime(247, now + noteDuration * 5)
    osc1.frequency.setValueAtTime(220, now + noteDuration * 6)
    
    osc2.frequency.setValueAtTime(330, now)
    osc2.frequency.setValueAtTime(294, now + noteDuration)
    osc2.frequency.setValueAtTime(262, now + noteDuration * 2)
    osc2.frequency.setValueAtTime(247, now + noteDuration * 3)
    osc2.frequency.setValueAtTime(262, now + noteDuration * 4)
    osc2.frequency.setValueAtTime(294, now + noteDuration * 5)
    osc2.frequency.setValueAtTime(330, now + noteDuration * 6)
    
    const musicGain = this.audioContext.createGain()
    musicGain.gain.value = 0
    musicGain.gain.setValueAtTime(0, now)
    musicGain.gain.linearRampToValueAtTime(0.15, now + 0.1)
    
    osc1.connect(musicGain)
    osc2.connect(musicGain)
    musicGain.connect(this.musicGain)
    
    const loopDuration = noteDuration * 7
    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + loopDuration)
    osc2.stop(now + loopDuration)
    
    this.musicOscillator = osc1
    
    osc1.onended = () => {
      if (this.isPlaying) {
        this.createMusicLoop()
      }
    }
  }

  playMusic(): void {
    if (!this.initialized || this.isPlaying) {
      return
    }
    
    this.isPlaying = true
    this.createMusicLoop()
  }

  stopMusic(): void {
    this.isPlaying = false
    
    if (this.musicOscillator) {
      try {
        this.musicOscillator.stop()
      } catch (e) {
        // Oscillator may have already stopped
      }
      this.musicOscillator = null
    }
  }

  playSFX(type: SFXType): void {
    if (!this.initialized || !this.audioContext || !this.sfxGain) {
      return
    }

    switch (type) {
      case 'collect':
        this.playTone(800, 0.15, 'sine', 0.3, 1200)
        break

      case 'collision':
        this.playTone(200, 0.3, 'sawtooth', 0.4, 50)
        break

      case 'boost': {
        const notes = [600, 900, 1200]
        const noteDuration = 0.2 / notes.length
        notes.forEach((freq, i) => {
          this.playTone(freq, noteDuration, 'square', 0.25, undefined, i * noteDuration)
        })
        break
      }
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    startVolume: number = 0.3,
    endFrequency?: number,
    startTimeOffset: number = 0
  ): void {
    if (!this.audioContext || !this.sfxGain) {
      return
    }

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const startTime = this.audioContext.currentTime + startTimeOffset

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startTime)
    if (endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration)
    }

    gainNode.gain.setValueAtTime(startVolume, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(this.sfxGain)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }
}

export const audioManager = new AudioManager()
