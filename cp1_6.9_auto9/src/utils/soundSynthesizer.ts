const hexToHue = (hex: string): number => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 30
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const d = max - min

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return h * 360
}

interface SoundParams {
  baseFreq: number
  pitchDirection: number
  bpm: number
}

export const calculateSoundParams = (color: string, dateStr: string): SoundParams => {
  const hue = hexToHue(color)
  const baseFreq = 300 + (hue / 360) * 500

  const date = new Date(dateStr)
  const month = date.getMonth()
  const pitchDirection = month < 6 ? 1 : -1

  const day = date.getDate()
  const bpm = 60 + ((day - 1) / 30) * 60

  return { baseFreq, pitchDirection, bpm }
}

export class SoundSynthesizer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private oscillators: OscillatorNode[] = []
  private gains: GainNode[] = []
  private isPlaying = false
  private intervalId: number | null = null
  private startTime = 0
  private duration = 5000

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume()
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  play(color: string, dateStr: string, onStop?: () => void): void {
    this.stop()
    this.initContext()

    if (!this.audioContext) return

    this.isPlaying = true
    this.startTime = performance.now()

    const { baseFreq, pitchDirection, bpm } = calculateSoundParams(color, dateStr)
    const noteInterval = 60000 / bpm / 2

    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.connect(this.audioContext.destination)

    const masterGain = this.audioContext.createGain()
    masterGain.gain.setValueAtTime(0, this.audioContext.currentTime)
    masterGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1)
    masterGain.connect(this.analyser)

    const scale = [0, 2, 4, 5, 7, 9, 11, 12]
    let noteIndex = 0

    const playNextNote = () => {
      if (!this.isPlaying || !this.audioContext || !masterGain) return

      const elapsed = performance.now() - this.startTime
      if (elapsed >= this.duration) {
        this.stop()
        onStop?.()
        return
      }

      const semitoneOffset = scale[noteIndex % scale.length] * pitchDirection
      const freq = baseFreq * Math.pow(2, semitoneOffset / 12)

      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime)

      gain.gain.setValueAtTime(0, this.audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + noteInterval / 1000 * 0.9)

      osc.connect(gain)
      gain.connect(masterGain)

      osc.start()
      osc.stop(this.audioContext.currentTime + noteInterval / 1000)

      this.oscillators.push(osc)
      this.gains.push(gain)

      noteIndex++
    }

    playNextNote()
    this.intervalId = window.setInterval(playNextNote, noteInterval)
  }

  stop(): void {
    this.isPlaying = false

    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    for (const osc of this.oscillators) {
      try {
        osc.stop()
      } catch {
        // ignore
      }
      osc.disconnect()
    }
    this.oscillators = []

    for (const gain of this.gains) {
      gain.disconnect()
    }
    this.gains = []

    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }
}

export const drawFrequencyBars = (
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode | null,
  width: number,
  height: number,
  color: string
): void => {
  ctx.clearRect(0, 0, width, height)

  if (!analyser) {
    return
  }

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)

  const barCount = 32
  const barWidth = width / barCount
  const step = Math.floor(bufferLength / barCount)

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color)
  const r = result ? parseInt(result[1], 16) : 255
  const g = result ? parseInt(result[2], 16) : 179
  const b = result ? parseInt(result[3], 16) : 71

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step]
    const barHeight = (value / 255) * height
    const x = i * barWidth
    const y = height - barHeight

    const gradient = ctx.createLinearGradient(x, y, x, height)
    gradient.addColorStop(0, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 0.9)`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.3)`)

    ctx.fillStyle = gradient
    ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
  }
}
