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

    const now = this.audioContext.currentTime

    switch (type) {
      case 'collect':
        this.playTone(800, 0.15, 'sine', 0.3, now, 1200)
        break

      case 'collision':
        this.playTone(200, 0.3, 'sawtooth', 0.4, now, 50)
        break

      case 'boost': {
        const notes = [600, 900, 1200]
        const noteDuration = 0.06
        notes.forEach((freq, i) => {
          const noteStart = now + i * noteDuration
          this.playTone(freq, noteDuration, 'square', 0.25, noteStart)
        })
        break
      }
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    startVolume: number,
    startTime: number,
    endFrequency?: number
  ): void {
    if (!this.audioContext || !this.sfxGain) {
      return
    }

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const endTime = startTime + duration

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startTime)
    if (endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), endTime)
    }

    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(startVolume, startTime + 0.01)
    gainNode.gain.setValueAtTime(startVolume, endTime - 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime)

    oscillator.connect(gainNode)
    gainNode.connect(this.sfxGain)

    oscillator.start(startTime)
    oscillator.stop(endTime + 0.02)
  }
}

export const audioManager = new AudioManager()
