import { BeatResult, BeatInfo, BeatQuality } from './types'

export class BeatDetector {
  private bpm: number = 90
  private startTime: number = 0
  private running: boolean = false
  private beatInterval: number = 0
  private tolerance: number = 100
  private beatStrengths: number[] = []
  private nextBeatIndex: number = 0
  private audioContext: AudioContext | null = null
  private currentBeatBuffer: number = 0

  loadBeatMap(bpm: number, beatStrengths: number[], tolerance: number = 100): void {
    this.bpm = bpm
    this.beatInterval = 60000 / bpm
    this.beatStrengths = beatStrengths
    this.tolerance = tolerance
    this.nextBeatIndex = 0
  }

  start(audioContext: AudioContext): void {
    this.audioContext = audioContext
    this.startTime = audioContext.currentTime * 1000
    this.running = true
    this.nextBeatIndex = 0
    this.currentBeatBuffer = 0
  }

  stop(): void {
    this.running = false
    this.audioContext = null
  }

  getElapsedTime(): number {
    if (!this.audioContext) return 0
    return this.audioContext.currentTime * 1000 - this.startTime
  }

  checkBeat(inputTime: number): BeatResult {
    if (!this.running) {
      return { hit: false, quality: 'miss', deviation: 999 }
    }

    const elapsed = inputTime - this.startTime
    const beatIndex = Math.round(elapsed / this.beatInterval)
    const beatTime = beatIndex * this.beatInterval
    const deviation = elapsed - beatTime
    const absDeviation = Math.abs(deviation)

    if (absDeviation <= this.tolerance) {
      const quality: BeatQuality = absDeviation <= this.tolerance * 0.4 ? 'perfect' : 'good'
      return { hit: true, quality, deviation }
    }

    return { hit: false, quality: 'miss', deviation }
  }

  getNextBeats(count: number): BeatInfo[] {
    if (!this.running || !this.audioContext) return []

    const elapsed = this.getElapsedTime()
    const currentBeatIndex = Math.floor(elapsed / this.beatInterval)
    const beats: BeatInfo[] = []

    for (let i = 0; i < count; i++) {
      const idx = currentBeatIndex + i + 1
      const time = idx * this.beatInterval
      const strengthIdx = idx % this.beatStrengths.length
      const strengthValue = this.beatStrengths[strengthIdx]
      const strength = strengthValue >= 0.7 ? 'strong' : 'weak'

      beats.push({
        time: time + this.startTime,
        strength,
        index: idx,
      })
    }

    return beats
  }

  getCurrentBeatProgress(): number {
    if (!this.running || !this.audioContext) return 0
    const elapsed = this.getElapsedTime()
    return (elapsed % this.beatInterval) / this.beatInterval
  }

  getCurrentBeatIndex(): number {
    if (!this.running) return 0
    const elapsed = this.getElapsedTime()
    return Math.floor(elapsed / this.beatInterval)
  }

  isOnBeat(): boolean {
    if (!this.running) return false
    const progress = this.getCurrentBeatProgress()
    const threshold = 0.15
    return progress < threshold || progress > (1 - threshold)
  }

  getBPM(): number {
    return this.bpm
  }

  getBeatInterval(): number {
    return this.beatInterval
  }

  isRunning(): boolean {
    return this.running
  }

  playMetronomeClick(audioContext: AudioContext, strong: boolean): void {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.connect(gain)
    gain.connect(audioContext.destination)

    osc.frequency.value = strong ? 800 : 600
    osc.type = 'sine'
    gain.gain.value = strong ? 0.15 : 0.08
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05)

    osc.start(audioContext.currentTime)
    osc.stop(audioContext.currentTime + 0.05)
  }

  playDrumBeat(audioContext: AudioContext, strong: boolean): void {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const noise = audioContext.createOscillator()
    const noiseGain = audioContext.createGain()

    osc.connect(gain)
    gain.connect(audioContext.destination)
    noise.connect(noiseGain)
    noiseGain.connect(audioContext.destination)

    osc.frequency.value = strong ? 150 : 100
    osc.type = 'sine'
    gain.gain.value = strong ? 0.3 : 0.15
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15)

    noise.frequency.value = strong ? 80 : 60
    noise.type = 'square'
    noiseGain.gain.value = strong ? 0.1 : 0.05
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08)

    const now = audioContext.currentTime
    osc.start(now)
    osc.stop(now + 0.15)
    noise.start(now)
    noise.stop(now + 0.08)
  }
}
