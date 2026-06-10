import fs from 'fs'
import path from 'path'
import { MPEGDecoder } from 'mpg123-decoder'

function computeFFT(samples: Float64Array, numBins: number): Float64Array {
  const N = samples.length
  const real = new Float64Array(N)
  const imag = new Float64Array(N)
  for (let i = 0; i < N; i++) real[i] = samples[i]

  for (let s = 1; s < N; s *= 2) {
    const half = s
    const step = s * 2
    for (let i = 0; i < N; i += step) {
      for (let j = 0; j < half; j++) {
        const angle = -2 * Math.PI * j / step
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const evenIdx = i + j
        const oddIdx = i + j + half
        if (oddIdx < N) {
          const tReal = cos * real[oddIdx] - sin * imag[oddIdx]
          const tImag = sin * real[oddIdx] + cos * imag[oddIdx]
          real[oddIdx] = real[evenIdx] - tReal
          imag[oddIdx] = imag[evenIdx] - tImag
          real[evenIdx] = real[evenIdx] + tReal
          imag[evenIdx] = imag[evenIdx] + tImag
        }
      }
    }
  }

  const magnitudes = new Float64Array(numBins)
  for (let k = 0; k < numBins; k++) {
    magnitudes[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) / N
  }
  return magnitudes
}

function bitReverse(data: Float64Array, N: number): void {
  let j = 0
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      const temp = data[i]
      data[i] = data[j]
      data[j] = temp
    }
    let k = N >> 1
    while (k <= j) {
      j -= k
      k >>= 1
    }
    j += k
  }
}

function dct(coeffs: Float64Array, numOut: number): Float64Array {
  const N = coeffs.length
  const out = new Float64Array(numOut)
  for (let k = 0; k < numOut; k++) {
    let sum = 0
    for (let n = 0; n < N; n++) {
      sum += coeffs[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N))
    }
    out[k] = sum
  }
  return out
}

function parseWAV(buffer: Buffer): { samples: Float64Array; sampleRate: number } {
  if (
    buffer.length < 44 ||
    buffer[0] !== 0x52 || buffer[1] !== 0x49 ||
    buffer[2] !== 0x46 || buffer[3] !== 0x46 ||
    buffer[8] !== 0x57 || buffer[9] !== 0x41 ||
    buffer[10] !== 0x56 || buffer[11] !== 0x45
  ) {
    return { samples: new Float64Array(0), sampleRate: 44100 }
  }

  const numChannels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)

  let dataOffset = 12
  while (dataOffset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', dataOffset, dataOffset + 4)
    const chunkSize = buffer.readUInt32LE(dataOffset + 4)
    if (chunkId === 'data') {
      dataOffset += 8
      const dataEnd = Math.min(dataOffset + chunkSize, buffer.length)
      const rawData = buffer.subarray(dataOffset, dataEnd)

      let numSamples: number
      let samples: Float64Array

      if (bitsPerSample === 16) {
        numSamples = Math.floor(rawData.length / 2)
        samples = new Float64Array(numSamples)
        for (let i = 0; i < numSamples; i++) {
          const val = rawData.readInt16LE(i * 2)
          samples[i] = val / 32768.0
        }
      } else if (bitsPerSample === 24) {
        numSamples = Math.floor(rawData.length / 3)
        samples = new Float64Array(numSamples)
        for (let i = 0; i < numSamples; i++) {
          const lo = rawData[i * 3]
          const mid = rawData[i * 3 + 1]
          const hi = rawData[i * 3 + 2]
          let val = (hi << 16) | (mid << 8) | lo
          if (val >= 0x800000) val -= 0x1000000
          samples[i] = val / 8388608.0
        }
      } else if (bitsPerSample === 32) {
        numSamples = Math.floor(rawData.length / 4)
        samples = new Float64Array(numSamples)
        for (let i = 0; i < numSamples; i++) {
          samples[i] = rawData.readFloatLE(i * 4)
        }
      } else if (bitsPerSample === 8) {
        numSamples = rawData.length
        samples = new Float64Array(numSamples)
        for (let i = 0; i < numSamples; i++) {
          samples[i] = (rawData[i] - 128) / 128.0
        }
      } else {
        return { samples: new Float64Array(0), sampleRate }
      }

      if (numChannels > 1) {
        const monoLength = Math.floor(samples.length / numChannels)
        const mono = new Float64Array(monoLength)
        for (let i = 0; i < monoLength; i++) {
          let sum = 0
          for (let ch = 0; ch < numChannels; ch++) {
            sum += samples[i * numChannels + ch]
          }
          mono[i] = sum / numChannels
        }
        return { samples: mono, sampleRate }
      }

      return { samples, sampleRate }
    }
    dataOffset += 8 + chunkSize
    if (chunkSize % 2 !== 0) dataOffset++
  }

  return { samples: new Float64Array(0), sampleRate: 44100 }
}

async function decodeMP3(filePath: string): Promise<{ samples: Float64Array; sampleRate: number }> {
  const decoder = new MPEGDecoder()
  await decoder.ready

  try {
    const fileData = fs.readFileSync(filePath)
    const uint8 = new Uint8Array(fileData)
    const result = decoder.decode(uint8)

    if (!result.channelData || result.channelData.length === 0 || result.samplesDecoded === 0) {
      return { samples: new Float64Array(0), sampleRate: result.sampleRate || 44100 }
    }

    const leftChannel = result.channelData[0]
    const samples = new Float64Array(leftChannel.length)
    for (let i = 0; i < leftChannel.length; i++) {
      samples[i] = leftChannel[i]
    }

    return { samples, sampleRate: result.sampleRate }
  } finally {
    decoder.free()
  }
}

function analyzePCM(samples: Float64Array, sampleRate: number): { high: number; mid: number; low: number; mfcc: number[] } {
  if (samples.length < 256) {
    return { high: 33, mid: 33, low: 34, mfcc: Array.from({ length: 13 }, () => 0) }
  }

  const chunkSize = 2048
  const numBins = Math.floor(chunkSize / 2)

  const avgSpectrum = new Float64Array(numBins)
  let chunkCount = 0

  for (let start = 0; start + chunkSize <= samples.length; start += Math.floor(chunkSize * 0.5)) {
    const chunk = new Float64Array(chunkSize)
    for (let i = 0; i < chunkSize; i++) {
      const winIdx = start + i
      if (winIdx < samples.length) {
        chunk[i] = samples[winIdx] * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (chunkSize - 1)))
      }
    }

    const mags = computeFFT(chunk, numBins)
    for (let k = 0; k < numBins; k++) {
      avgSpectrum[k] += mags[k] * mags[k]
    }
    chunkCount++
  }

  if (chunkCount === 0) {
    return { high: 33, mid: 33, low: 34, mfcc: Array.from({ length: 13 }, () => 0) }
  }

  for (let k = 0; k < numBins; k++) {
    avgSpectrum[k] = Math.sqrt(avgSpectrum[k] / chunkCount)
  }

  const binHz = sampleRate / chunkSize
  const lowBinEnd = Math.min(Math.ceil(300 / binHz), numBins)
  const midBinEnd = Math.min(Math.ceil(2000 / binHz), numBins)

  let lowEnergy = 0
  let midEnergy = 0
  let highEnergy = 0

  for (let k = 1; k < lowBinEnd; k++) lowEnergy += avgSpectrum[k] * avgSpectrum[k]
  for (let k = lowBinEnd; k < midBinEnd; k++) midEnergy += avgSpectrum[k] * avgSpectrum[k]
  for (let k = midBinEnd; k < numBins; k++) highEnergy += avgSpectrum[k] * avgSpectrum[k]

  const totalEnergy = lowEnergy + midEnergy + highEnergy || 1

  const low = Math.round((lowEnergy / totalEnergy) * 100)
  const mid = Math.round((midEnergy / totalEnergy) * 100)
  const high = 100 - low - mid

  const numMelBins = 26
  const melSpectrum = new Float64Array(numMelBins)
  for (let m = 0; m < numMelBins; m++) {
    const centerBin = Math.round(((m + 1) / (numMelBins + 1)) * numBins)
    const spread = Math.max(1, Math.round(numBins / (numMelBins + 1)))
    let sum = 0
    let weightSum = 0
    for (let k = Math.max(1, centerBin - spread); k < Math.min(numBins, centerBin + spread + 1); k++) {
      const dist = Math.abs(k - centerBin) / spread
      const weight = 1 - dist
      sum += avgSpectrum[k] * weight
      weightSum += weight
    }
    melSpectrum[m] = Math.log(sum / weightSum + 1e-10)
  }

  const mfccCoeffs = dct(melSpectrum, 13)
  const mfcc: number[] = []
  for (let i = 0; i < 13; i++) {
    mfcc.push(Math.round(mfccCoeffs[i] * 1000) / 1000)
  }

  return { high, mid, low, mfcc }
}

export async function analyzeSpectrum(filePath: string): Promise<{ high: number; mid: number; low: number; mfcc: number[] }> {
  const ext = path.extname(filePath).toLowerCase()
  let samples: Float64Array
  let sampleRate: number

  if (ext === '.mp3') {
    const result = await decodeMP3(filePath)
    samples = result.samples
    sampleRate = result.sampleRate
  } else {
    const buffer = fs.readFileSync(filePath)
    const result = parseWAV(buffer)
    samples = result.samples
    sampleRate = result.sampleRate
  }

  return analyzePCM(samples, sampleRate)
}
