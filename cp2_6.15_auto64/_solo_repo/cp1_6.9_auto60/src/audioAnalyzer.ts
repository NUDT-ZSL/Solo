import type { AudioAnalysisResult, SpectrumPeak, VolumePoint, EmotionPoint } from './types'

const WAVEFORM_POINTS = 240
const VOLUME_ENVELOPE_POINTS = 120
const EMOTION_CURVE_POINTS = 100
const MAX_SPECTRUM_PEAKS = 8

interface AnalyzerOptions {
  onProgress?: (progress: number) => void
}

export async function analyzeAudioFile(
  audioBuffer: AudioBuffer,
  options: AnalyzerOptions = {}
): Promise<AudioAnalysisResult> {
  const { onProgress } = options
  const startTime = performance.now()

  const duration = audioBuffer.duration
  const sampleRate = audioBuffer.sampleRate
  const numberOfChannels = audioBuffer.numberOfChannels

  onProgress?.(0.1)

  const channelData = audioBuffer.getChannelData(0)
  if (numberOfChannels > 1) {
    const left = audioBuffer.getChannelData(0)
    const right = audioBuffer.getChannelData(1)
    const mixed = new Float32Array(left.length)
    for (let i = 0; i < left.length; i++) {
      mixed[i] = (left[i] + right[i]) * 0.5
    }
    return processAudioBuffer(mixed, duration, sampleRate, onProgress, startTime)
  }

  return processAudioBuffer(channelData, duration, sampleRate, onProgress, startTime)
}

async function processAudioBuffer(
  channelData: Float32Array,
  duration: number,
  sampleRate: number,
  onProgress: ((progress: number) => void) | undefined,
  startTime: number
): Promise<AudioAnalysisResult> {
  const offlineCtx = new OfflineAudioContext(1, channelData.length, sampleRate)
  const source = offlineCtx.createBufferSource()
  const buffer = offlineCtx.createBuffer(1, channelData.length, sampleRate)
  buffer.copyToChannel(channelData as Float32Array<ArrayBuffer>, 0)
  source.buffer = buffer

  onProgress?.(0.25)

  await new Promise(resolve => setTimeout(resolve, 10))

  const waveform = extractWaveform(channelData, duration)
  onProgress?.(0.45)

  await new Promise(resolve => setTimeout(resolve, 10))

  const volumeEnvelope = extractVolumeEnvelope(channelData, duration)
  onProgress?.(0.65)

  await new Promise(resolve => setTimeout(resolve, 10))

  const { spectrumPeaks, emotionCurve } = extractSpectralFeatures(channelData, duration, sampleRate)
  onProgress?.(0.9)

  const elapsed = performance.now() - startTime
  console.log(`[AudioAnalyzer] Analysis completed in ${elapsed.toFixed(1)}ms`)

  onProgress?.(1.0)

  return {
    duration,
    waveform,
    spectrumPeaks,
    volumeEnvelope,
    emotionCurve,
    sampleRate
  }
}

function extractWaveform(channelData: Float32Array, duration: number): number[] {
  const result: number[] = new Array(WAVEFORM_POINTS)
  const samplesPerPoint = Math.floor(channelData.length / WAVEFORM_POINTS)

  for (let i = 0; i < WAVEFORM_POINTS; i++) {
    const start = i * samplesPerPoint
    const end = Math.min(start + samplesPerPoint, channelData.length)

    let maxAbs = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > maxAbs) maxAbs = abs
    }

    result[i] = maxAbs
  }

  const maxVal = Math.max(...result, 0.001)
  return result.map(v => v / maxVal)
}

function extractVolumeEnvelope(channelData: Float32Array, duration: number): VolumePoint[] {
  const result: VolumePoint[] = []
  const samplesPerPoint = Math.floor(channelData.length / VOLUME_ENVELOPE_POINTS)

  for (let i = 0; i < VOLUME_ENVELOPE_POINTS; i++) {
    const start = i * samplesPerPoint
    const end = Math.min(start + samplesPerPoint, channelData.length)
    const chunkSize = end - start

    let sumSq = 0
    for (let j = start; j < end; j++) {
      sumSq += channelData[j] * channelData[j]
    }

    const rms = Math.sqrt(sumSq / chunkSize)
    const db = rms > 0 ? 20 * Math.log10(rms) : -100
    const normalizedDb = Math.max(0, Math.min(1, (db + 100) / 100))
    const time = (i / VOLUME_ENVELOPE_POINTS) * duration

    result.push({ time, volume: normalizedDb })
  }

  return smoothArray(result, 2)
}

function smoothArray(points: VolumePoint[], windowSize: number): VolumePoint[] {
  const n = points.length
  const smoothed: VolumePoint[] = []

  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0

    for (let j = Math.max(0, i - windowSize); j <= Math.min(n - 1, i + windowSize); j++) {
      sum += points[j].volume
      count++
    }

    smoothed.push({
      time: points[i].time,
      volume: sum / count
    })
  }

  return smoothed
}

function extractSpectralFeatures(
  channelData: Float32Array,
  duration: number,
  sampleRate: number
): { spectrumPeaks: SpectrumPeak[]; emotionCurve: EmotionPoint[] } {
  const fftSize = 2048
  const hopSize = 1024
  const numFrames = Math.floor((channelData.length - fftSize) / hopSize)

  const spectrumPeaks: SpectrumPeak[] = []
  const frameEnergies: { time: number; bassEnergy: number; trebleEnergy: number; totalEnergy: number }[] = []

  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    const offset = frameIdx * hopSize
    const windowed = applyHannWindow(channelData, offset, fftSize)
    const magnitudes = computeFFTMagnitude(windowed)

    const time = (frameIdx * hopSize) / sampleRate
    const { bassEnergy, trebleEnergy, totalEnergy, peakFreq, peakMag } = analyzeFrame(magnitudes, sampleRate, fftSize)

    frameEnergies.push({ time, bassEnergy, trebleEnergy, totalEnergy })

    if (peakMag > 0.3) {
      spectrumPeaks.push({
        time,
        frequency: peakFreq,
        magnitude: peakMag
      })
    }
  }

  const selectedPeaks = selectProminentPeaks(spectrumPeaks, numFrames, duration)
  const emotionCurve = computeEmotionCurve(frameEnergies, duration)

  return { spectrumPeaks: selectedPeaks, emotionCurve }
}

function applyHannWindow(data: Float32Array, offset: number, size: number): Float32Array {
  const result = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    const sample = data[offset + i] || 0
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
    result[i] = sample * window
  }
  return result
}

function computeFFTMagnitude(data: Float32Array): Float32Array {
  const n = data.length
  const real = new Float32Array(data)
  const imag = new Float32Array(n)

  iterativeFFT(real, imag, n)

  const magnitudes = new Float32Array(n / 2)
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
  }

  const maxMag = Math.max(...magnitudes, 0.0001)
  for (let i = 0; i < magnitudes.length; i++) {
    magnitudes[i] /= maxMag
  }

  return magnitudes
}

function iterativeFFT(real: Float32Array, imag: Float32Array, n: number) {
  const levels = Math.log2(n)
  for (let i = 0; i < n; i++) {
    let j = 0
    for (let k = 0; k < levels; k++) {
      j = (j << 1) | ((i >> k) & 1)
    }
    if (j > i) {
      const tempR = real[i]
      const tempI = imag[i]
      real[i] = real[j]
      imag[i] = imag[j]
      real[j] = tempR
      imag[j] = tempI
    }
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2
    const angleStep = (-2 * Math.PI) / size

    for (let i = 0; i < n; i += size) {
      let angle = 0
      for (let j = 0; j < halfSize; j++) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const tpr = real[i + j + halfSize] * cos - imag[i + j + halfSize] * sin
        const tpi = real[i + j + halfSize] * sin + imag[i + j + halfSize] * cos

        real[i + j + halfSize] = real[i + j] - tpr
        imag[i + j + halfSize] = imag[i + j] - tpi
        real[i + j] += tpr
        imag[i + j] += tpi

        angle += angleStep
      }
    }
  }
}

function analyzeFrame(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number
): { bassEnergy: number; trebleEnergy: number; totalEnergy: number; peakFreq: number; peakMag: number } {
  const nyquist = sampleRate / 2
  const binSize = nyquist / magnitudes.length

  const bassEnd = Math.floor(250 / binSize)
  const trebleStart = Math.floor(4000 / binSize)

  let bassEnergy = 0
  let trebleEnergy = 0
  let totalEnergy = 0
  let peakIdx = 0
  let peakMag = 0

  for (let i = 0; i < magnitudes.length; i++) {
    const mag = magnitudes[i]
    totalEnergy += mag * mag
    if (i < bassEnd) bassEnergy += mag * mag
    if (i >= trebleStart && i < magnitudes.length) trebleEnergy += mag * mag
    if (mag > peakMag) {
      peakMag = mag
      peakIdx = i
    }
  }

  return {
    bassEnergy: bassEnergy / bassEnd,
    trebleEnergy: trebleEnergy / Math.max(1, magnitudes.length - trebleStart),
    totalEnergy: totalEnergy / magnitudes.length,
    peakFreq: peakIdx * binSize,
    peakMag
  }
}

function selectProminentPeaks(
  allPeaks: SpectrumPeak[],
  numFrames: number,
  duration: number
): SpectrumPeak[] {
  if (allPeaks.length === 0) return []

  const sortedByMagnitude = [...allPeaks].sort((a, b) => b.magnitude - a.magnitude)

  const selected: SpectrumPeak[] = []
  const minTimeGap = duration / (MAX_SPECTRUM_PEAKS + 2)

  for (const peak of sortedByMagnitude) {
    const tooClose = selected.some(s => Math.abs(s.time - peak.time) < minTimeGap)
    if (!tooClose) {
      selected.push(peak)
      if (selected.length >= MAX_SPECTRUM_PEAKS) break
    }
  }

  return selected.sort((a, b) => a.time - b.time)
}

function computeEmotionCurve(
  frameEnergies: { time: number; bassEnergy: number; trebleEnergy: number; totalEnergy: number }[],
  duration: number
): EmotionPoint[] {
  if (frameEnergies.length === 0) {
    return Array.from({ length: EMOTION_CURVE_POINTS }, (_, i) => ({
      time: (i / EMOTION_CURVE_POINTS) * duration,
      value: 0.5
    }))
  }

  const maxBass = Math.max(...frameEnergies.map(f => f.bassEnergy), 0.0001)
  const maxTreble = Math.max(...frameEnergies.map(f => f.trebleEnergy), 0.0001)
  const maxTotal = Math.max(...frameEnergies.map(f => f.totalEnergy), 0.0001)

  const normalized = frameEnergies.map(f => ({
    time: f.time,
    arousal: (f.totalEnergy / maxTotal) * 0.5 + (f.trebleEnergy / maxTreble) * 0.3 + (f.bassEnergy / maxBass) * 0.2
  }))

  const maxArousal = Math.max(...normalized.map(n => n.arousal), 0.0001)
  const scaled = normalized.map(n => ({
    time: n.time,
    arousal: n.arousal / maxArousal
  }))

  const result: EmotionPoint[] = []
  const step = scaled.length / EMOTION_CURVE_POINTS

  for (let i = 0; i < EMOTION_CURVE_POINTS; i++) {
    const idx = Math.min(Math.floor(i * step), scaled.length - 1)
    const startIdx = Math.max(0, idx - 1)
    const endIdx = Math.min(scaled.length - 1, idx + 1)

    let sum = 0
    let count = 0
    for (let j = startIdx; j <= endIdx; j++) {
      sum += scaled[j].arousal
      count++
    }

    result.push({
      time: (i / EMOTION_CURVE_POINTS) * duration,
      value: sum / count
    })
  }

  return result
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatTimeShort(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
