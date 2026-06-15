/// <reference lib="webworker" />

interface FFTResult {
  type: 'fft'
  spectrum: Float32Array
  timeData: Float32Array
}

interface InitMessage {
  type: 'init'
  fftSize: number
}

interface ProcessMessage {
  type: 'process'
  audioData: Float32Array
  sampleRate: number
}

type WorkerMessage = InitMessage | ProcessMessage

let fftSize = 2048

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

  getMagnitude(real: Float32Array, imag: Float32Array): Float32Array {
    const n = this.size
    const magnitude = new Float32Array(n / 2)
    for (let i = 0; i < n / 2; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (n / 2)
    }
    return magnitude
  }
}

let fft: SimpleFFT | null = null

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const message = e.data

  if (message.type === 'init') {
    fftSize = message.fftSize
    fft = new SimpleFFT(fftSize)
    return
  }

  if (message.type === 'process' && fft) {
    const { audioData } = message

    const real = new Float32Array(fftSize)
    const imag = new Float32Array(fftSize)

    const windowFunc = (n: number, N: number) => 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)))
    for (let i = 0; i < fftSize && i < audioData.length; i++) {
      real[i] = audioData[i] * windowFunc(i, fftSize)
      imag[i] = 0
    }

    fft.transform(real, imag)

    const numFrames = Math.max(1, Math.floor(audioData.length / fftSize))
    const spectrumFrames = new Float32Array(numFrames * (fftSize / 2))
    const timeFrames = new Float32Array(numFrames * fftSize)

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * fftSize
      const real2 = new Float32Array(fftSize)
      const imag2 = new Float32Array(fftSize)

      for (let i = 0; i < fftSize; i++) {
        const idx = start + i
        if (idx < audioData.length) {
          real2[i] = audioData[idx] * windowFunc(i, fftSize)
        } else {
          real2[i] = 0
        }
        imag2[i] = 0
        if (idx < audioData.length) {
          timeFrames[frame * fftSize + i] = audioData[idx]
        }
      }

      fft.transform(real2, imag2)
      const frameMag = fft.getMagnitude(real2, imag2)

      for (let i = 0; i < fftSize / 2; i++) {
        spectrumFrames[frame * (fftSize / 2) + i] = frameMag[i]
      }
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
