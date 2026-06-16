export interface InstrumentType {
  id: 'bianzhong' | 'guqin' | 'pipa' | 'dizi'
  name: string
  frequency: number
  harmonics: number[]
  harmonicAmplitudes: number[]
  color: string
  symbol: string
}

export const INSTRUMENTS: InstrumentType[] = [
  {
    id: 'bianzhong',
    name: '编钟',
    frequency: 130.81,
    harmonics: [2, 3, 4, 5, 6],
    harmonicAmplitudes: [0.8, 0.6, 0.4, 0.3, 0.2],
    color: '#ff6b6b',
    symbol: '钟'
  },
  {
    id: 'guqin',
    name: '古琴',
    frequency: 246.94,
    harmonics: [2, 3, 4, 5, 6],
    harmonicAmplitudes: [0.7, 0.5, 0.35, 0.25, 0.15],
    color: '#48dbfb',
    symbol: '琴'
  },
  {
    id: 'pipa',
    name: '琵琶',
    frequency: 392.00,
    harmonics: [2, 3, 4, 5],
    harmonicAmplitudes: [0.65, 0.45, 0.3, 0.2],
    color: '#feca57',
    symbol: '琵'
  },
  {
    id: 'dizi',
    name: '笛子',
    frequency: 880.00,
    harmonics: [2, 3, 4],
    harmonicAmplitudes: [0.55, 0.35, 0.2],
    color: '#ff9ff3',
    symbol: '笛'
  }
]

export interface SoundWave {
  id: string
  instrumentId: string
  x: number
  y: number
  startTime: number
  radius: number
  maxRadius: number
  duration: number
  frequency: number
  instrumentIndex: number
}

export interface FrequencyBin {
  frequency: number
  amplitude: number
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function frequencyToColor(frequency: number): string {
  if (frequency < 200) return '#ff6b6b'
  if (frequency < 800) return '#48dbfb'
  return '#feca57'
}

export function frequencyBand(frequency: number): 'low' | 'mid' | 'high' {
  if (frequency < 200) return 'low'
  if (frequency < 800) return 'mid'
  return 'high'
}

export function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < r1 + r2 && distance > Math.abs(r1 - r2)
}

export function calculateWaveInterference(
  wave1: SoundWave,
  wave2: SoundWave,
  currentTime: number
): { constructive: number; destructive: number; interferencePoints: { x: number; y: number; type: 'constructive' | 'destructive' }[] } {
  const elapsed1 = currentTime - wave1.startTime
  const elapsed2 = currentTime - wave2.startTime
  const progress1 = Math.min(1, elapsed1 / wave1.duration)
  const progress2 = Math.min(1, elapsed2 / wave2.duration)

  if (progress1 <= 0 || progress2 <= 0 || progress1 >= 1 || progress2 >= 1) {
    return { constructive: 0, destructive: 0, interferencePoints: [] }
  }

  const dx = wave2.x - wave1.x
  const dy = wave2.y - wave1.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const r1 = wave1.radius
  const r2 = wave2.radius

  if (distance >= r1 + r2 || distance <= Math.abs(r1 - r2)) {
    return { constructive: 0, destructive: 0, interferencePoints: [] }
  }

  const freqDiff = Math.abs(wave1.frequency - wave2.frequency)
  const freqAvg = (wave1.frequency + wave2.frequency) / 2
  const freqRatio = freqDiff / freqAvg

  const constructive = Math.max(0, 1 - freqRatio * 2) * (1 - Math.abs(progress1 - progress2))
  const destructive = freqRatio > 0.05 ? Math.min(1, freqRatio * 3) * (1 - Math.abs(progress1 - progress2)) : 0.1

  const interferencePoints: { x: number; y: number; type: 'constructive' | 'destructive' }[] = []

  if (distance > 0) {
    const nx = dx / distance
    const ny = dy / distance

    const a = (r1 * r1 - r2 * r2 + distance * distance) / (2 * distance)
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))

    const mx = wave1.x + a * nx
    const my = wave1.y + a * ny

    const px = -ny * h
    const py = nx * h

    const p1x = mx + px
    const p1y = my + py
    const p2x = mx - px
    const p2y = my - py

    const midX = (wave1.x + wave2.x) / 2
    const midY = (wave1.y + wave2.y) / 2

    interferencePoints.push({
      x: p1x,
      y: p1y,
      type: constructive > destructive ? 'constructive' : 'destructive'
    })
    interferencePoints.push({
      x: p2x,
      y: p2y,
      type: constructive > destructive ? 'constructive' : 'destructive'
    })
    interferencePoints.push({
      x: midX,
      y: midY,
      type: constructive > destructive ? 'constructive' : 'destructive'
    })
  }

  return { constructive, destructive, interferencePoints }
}

export function calculateSpectrum(
  activeWaves: SoundWave[],
  currentTime: number,
  volume: number
): FrequencyBin[] {
  const spectrumBins: { [key: number]: number } = {}
  const minFreq = 20
  const maxFreq = 4000
  const binCount = 128
  const binSize = (maxFreq - minFreq) / binCount

  for (let i = 0; i < binCount; i++) {
    spectrumBins[minFreq + i * binSize + binSize / 2] = 0
  }

  activeWaves.forEach(wave => {
    const elapsed = currentTime - wave.startTime
    const progress = Math.min(1, elapsed / wave.duration)
    if (progress <= 0 || progress >= 1) return

    const instrument = INSTRUMENTS[wave.instrumentIndex]
    const decayFactor = 1 - easeInOutQuad(progress)
    const volFactor = volume / 100

    const centerFreq = instrument.frequency
    const mainBinIndex = Math.floor((centerFreq - minFreq) / binSize)
    if (mainBinIndex >= 0 && mainBinIndex < binCount) {
      const freq = minFreq + mainBinIndex * binSize + binSize / 2
      spectrumBins[freq] = (spectrumBins[freq] || 0) + 0.6 * volFactor * decayFactor
    }

    instrument.harmonics.forEach((harmonic, idx) => {
      const harmonicFreq = centerFreq * harmonic
      const harmonicAmp = instrument.harmonicAmplitudes[idx] || 0.3
      const harmBinIndex = Math.floor((harmonicFreq - minFreq) / binSize)
      if (harmBinIndex >= 0 && harmBinIndex < binCount) {
        const freq = minFreq + harmBinIndex * binSize + binSize / 2
        spectrumBins[freq] = (spectrumBins[freq] || 0) + harmonicAmp * 0.6 * volFactor * decayFactor
      }
    })
  })

  const result: FrequencyBin[] = Object.entries(spectrumBins).map(([freq, amp]) => ({
    frequency: parseFloat(freq),
    amplitude: Math.min(1, amp)
  }))

  result.sort((a, b) => a.frequency - b.frequency)
  return result
}

export function calculateHarmonyScore(
  instruments: { x: number; y: number; instrumentIndex: number; isPlaying: boolean }[],
  waves: SoundWave[],
  currentTime: number
): number {
  const playing = instruments.filter(i => i.isPlaying)
  if (playing.length === 0) return 0

  let totalHarmony = 0
  let pairCount = 0

  for (let i = 0; i < playing.length; i++) {
    for (let j = i + 1; j < playing.length; j++) {
      const inst1 = INSTRUMENTS[playing[i].instrumentIndex]
      const inst2 = INSTRUMENTS[playing[j].instrumentIndex]

      const freqRatio = Math.max(inst1.frequency, inst2.frequency) / Math.min(inst1.frequency, inst2.frequency)
      const simpleRatios = [1, 1.25, 1.333, 1.5, 2, 2.5, 3]
      let harmony = 0

      simpleRatios.forEach(ratio => {
        const diff = Math.abs(freqRatio - ratio)
        if (diff < 0.1) {
          harmony = Math.max(harmony, 1 - diff * 10)
        }
      })

      const dx = playing[j].x - playing[i].x
      const dy = playing[j].y - playing[i].y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const optimalDistance = 150
      const distanceFactor = Math.max(0, 1 - Math.abs(distance - optimalDistance) / optimalDistance)

      totalHarmony += harmony * 0.7 + distanceFactor * 0.3
      pairCount++
    }
  }

  if (pairCount === 0) {
    return Math.round(60 + Math.random() * 20)
  }

  return Math.round((totalHarmony / pairCount) * 80 + 20)
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 }
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
