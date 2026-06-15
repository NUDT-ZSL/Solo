/// <reference lib="webworker" />

interface SharedAudioBuffer {
  spectrum: Float32Array
  beats: Float32Array
  beatCount: Int32Array
  currentFrame: Int32Array
}

interface FFTResult {
  type: 'fft'
  spectrum: Float32Array
  timeData: Float32Array
}

interface FFTCompleteResult {
  type: 'fft-complete'
  spectrum: Float32Array
  timeData: Float32Array
}

interface ErrorResult {
  type: 'error'
  error: string
}

interface InitMessage {
  type: 'init'
  fftSize: number
  sharedBuffer?: SharedAudioBuffer
}

interface ProcessMessage {
  type: 'process'
  audioData: Float32Array
  sampleRate: number
}

interface ProcessSharedMessage {
  type: 'process-shared'
  audioData: Float32Array
  sampleRate: number
  analysisBuffer?: SharedAudioBuffer
}

type WorkerMessage = InitMessage | ProcessMessage | ProcessSharedMessage

const HOP_SIZE = 512

let fftSize = 2048
let sharedBuffer: SharedAudioBuffer | null = null
let analysisBuffer: SharedAudioBuffer | null = null

class SimpleFFT {
  private size: number
  private cosTable: Float32Array
  private sinTable: Float32Array
  private reverseTable: Int32Array

  constructor(size: number) {
    this.size = size
    this.cosTable = new Float32Array(size)
    this.sinTable = new Float32Array(size)
    this.reverseTable = new Int32Array(size)

    for (let i = 0; i < size; i++) {
      this.cosTable[i] = Math.cos(-2 * Math.PI * i / size)
      this.sinTable[i] = Math.sin(-2 * Math.PI * i / size)
    }

    let bits = 0
    while ((1 << bits) < size) bits++
    for (let i = 0; i < size; i++) {
      let reversed = 0
      for (let j = 0; j < bits; j++) {
        reversed = (reversed << 1) | ((i >> j) & 1)
      }
      this.reverseTable[i] = reversed
    }
  }

  transform(real: Float32Array, imag: Float32Array): void {
    const n = this.size
    const rev = this.reverseTable

    for (let i = 0; i < n; i++) {
      const j = rev[i]
      if (i < j) {
        let tmp = real[i]
        real[i] = real[j]
        real[j] = tmp
        tmp = imag[i]
        imag[i] = imag[j]
        imag[j] = tmp
      }
    }

    for (let size = 2; size <= n; size <<= 1) {
      const halfsize = size >> 1
      const tablestep = n / size
      for (let i = 0; i < n; i += size) {
        let k = 0
        for (let j = i; j < i + halfsize; j++) {
          const tpre = real[j + halfsize] * this.cosTable[k] - imag[j + halfsize] * this.sinTable[k]
          const tpim = real[j + halfsize] * this.sinTable[k] + imag[j + halfsize] * this.cosTable[k]
          real[j + halfsize] = real[j] - tpre
          imag[j + halfsize] = imag[j] - tpim
          real[j] += tpre
          imag[j] += tpim
          k += tablestep
        }
      }
    }
  }

  getMagnitude(real: Float32Array, imag: Float32Array, out: Float32Array, offset: number): void {
    const n = this.size
    for (let i = 0; i < n / 2; i++) {
      const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (n / 2)
      out[offset + i] = mag
    }
  }
}

let fft: SimpleFFT | null = null
let hannWindow: Float32Array | null = null

function initFFT(size: number): void {
  fft = new SimpleFFT(size)
  hannWindow = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)))
  }
}

function processWithSharedBuffer(
  audioData: Float32Array,
  sampleRate: number
): void {
  if (!fft || !hannWindow || !sharedBuffer) {
    self.postMessage({ type: 'error', error: 'FFT not initialized' } as ErrorResult)
    return
  }

  try {
    const numFrames = Math.max(1, Math.floor((audioData.length - fftSize) / HOP_SIZE) + 1)
    const spectrumPerFrame = fftSize / 2

    const spectrumFrames = new Float32Array(numFrames * spectrumPerFrame)
    const timeFrames = new Float32Array(numFrames * fftSize)

    const real = new Float32Array(fftSize)
    const imag = new Float32Array(fftSize)

    const batchSize = Math.min(128, numFrames)

    for (let batchStart = 0; batchStart < numFrames; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, numFrames)

      for (let frame = batchStart; frame < batchEnd; frame++) {
        const start = frame * HOP_SIZE

        for (let i = 0; i < fftSize; i++) {
          const idx = start + i
          real[i] = (idx < audioData.length ? audioData[idx] : 0) * hannWindow[i]
          imag[i] = 0
          if (idx < audioData.length) {
            timeFrames[frame * fftSize + i] = audioData[idx]
          }
        }

        fft.transform(real, imag)
        fft.getMagnitude(real, imag, spectrumFrames, frame * spectrumPerFrame)
      }

      if (sharedBuffer) {
        const progress = batchEnd / numFrames
        Atomics.store(sharedBuffer.currentFrame, 0, Math.floor(progress * 1000))
      }
    }

    if (sharedBuffer) {
      for (let i = 0; i < spectrumPerFrame; i++) {
        sharedBuffer.spectrum[i] = spectrumFrames[i]
      }
    }

    if (analysisBuffer) {
      const beats = detectBeats(spectrumFrames, numFrames, spectrumPerFrame, sampleRate)
      Atomics.store(analysisBuffer.beatCount, 0, beats.length)
      for (let i = 0; i < beats.length && i < analysisBuffer.beats.length; i++) {
        analysisBuffer.beats[i] = beats[i]
      }
    }

    const result: FFTCompleteResult = {
      type: 'fft-complete',
      spectrum: spectrumFrames,
      timeData: timeFrames
    }

    self.postMessage(result, [
      spectrumFrames.buffer,
      timeFrames.buffer
    ])
  } catch (e) {
    self.postMessage({ type: 'error', error: String(e) } as ErrorResult)
  }
}

function detectBeats(
  spectrum: Float32Array,
  numFrames: number,
  spectrumPerFrame: number,
  sampleRate: number
): Float32Array {
  const bassBins = Math.min(Math.floor(200 / (sampleRate / fftSize)), spectrumPerFrame)
  const energyHistory: number[] = []
  const beats: number[] = []
  const frameDuration = HOP_SIZE / sampleRate
  const maxHistory = 43

  for (let frame = 0; frame < numFrames; frame++) {
    let bassEnergy = 0
    const specOffset = frame * spectrumPerFrame
    for (let i = 0; i < bassBins; i++) {
      bassEnergy += spectrum[specOffset + i]
    }
    energyHistory.push(bassEnergy)

    if (energyHistory.length > maxHistory) {
      energyHistory.shift()
    }

    if (energyHistory.length >= maxHistory) {
      const slice = energyHistory.slice(0, maxHistory - 1)
      let sum = 0
      let sqSum = 0
      for (let i = 0; i < slice.length; i++) {
        sum += slice[i]
        sqSum += slice[i] * slice[i]
      }
      const avg = sum / slice.length
      const variance = (sqSum / slice.length) - avg * avg
      const threshold = avg * (-0.0025714 * variance + 1.5142857)

      if (bassEnergy > threshold && bassEnergy > avg * 1.3) {
        const beatTime = frame * frameDuration
        if (beats.length === 0 || beatTime - beats[beats.length - 1] > 0.2) {
          beats.push(beatTime)
        }
      }
    }
  }

  return new Float32Array(beats)
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const message = e.data

  if (message.type === 'init') {
    fftSize = message.fftSize
    initFFT(fftSize)
    if (message.sharedBuffer) {
      sharedBuffer = message.sharedBuffer
    }
    return
  }

  if (message.type === 'process-shared') {
    if (message.analysisBuffer) {
      analysisBuffer = message.analysisBuffer
    }
    processWithSharedBuffer(message.audioData, message.sampleRate)
    return
  }

  if (message.type === 'process' && fft && hannWindow) {
    const { audioData } = message

    const numFrames = Math.max(1, Math.floor((audioData.length - fftSize) / HOP_SIZE) + 1)
    const spectrumFrames = new Float32Array(numFrames * (fftSize / 2))
    const timeFrames = new Float32Array(numFrames * fftSize)

    const real = new Float32Array(fftSize)
    const imag = new Float32Array(fftSize)

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * HOP_SIZE

      for (let i = 0; i < fftSize; i++) {
        const idx = start + i
        if (idx < audioData.length) {
          real[i] = audioData[idx] * hannWindow[i]
        } else {
          real[i] = 0
        }
        imag[i] = 0
        if (idx < audioData.length) {
          timeFrames[frame * fftSize + i] = audioData[idx]
        }
      }

      fft.transform(real, imag)
      fft.getMagnitude(real, imag, spectrumFrames, frame * (fftSize / 2))
    }

    const result: FFTResult = {
      type: 'fft',
      spectrum: spectrumFrames,
      timeData: timeFrames
    }

    self.postMessage(result, [
      spectrumFrames.buffer,
      timeFrames.buffer
    ])
  }
}
