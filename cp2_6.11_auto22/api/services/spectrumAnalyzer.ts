import fs from 'fs'

function computeDFT(samples: Float64Array, numBins: number): Float64Array {
  const magnitudes = new Float64Array(numBins)
  const N = samples.length
  for (let k = 0; k < numBins; k++) {
    let re = 0
    let im = 0
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N
      re += samples[n] * Math.cos(angle)
      im -= samples[n] * Math.sin(angle)
    }
    magnitudes[k] = Math.sqrt(re * re + im * im) / N
  }
  return magnitudes
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

export function analyzeSpectrum(filePath: string): { high: number; mid: number; low: number; mfcc: number[] } {
  const buffer = fs.readFileSync(filePath)

  let offset = 0
  if (
    buffer.length > 44 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 &&
    buffer[2] === 0x46 && buffer[3] === 0x46
  ) {
    offset = 44
  }

  const remaining = buffer.length - offset
  const numSamples = Math.floor(remaining / 2)
  const samples = new Float64Array(numSamples)

  for (let i = 0; i < numSamples; i++) {
    const lo = buffer[offset + i * 2]
    const hi = buffer[offset + i * 2 + 1]
    let val = (hi << 8) | (lo & 0xff)
    if (val >= 0x8000) val -= 0x10000
    samples[i] = val / 32768.0
  }

  const chunkSize = Math.min(2048, numSamples)
  const numBins = Math.floor(chunkSize / 2)

  const avgSpectrum = new Float64Array(numBins)
  let chunkCount = 0

  for (let start = 0; start + chunkSize <= numSamples; start += chunkSize) {
    const chunk = samples.slice(start, start + chunkSize)

    for (let i = 0; i < chunk.length; i++) {
      chunk[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (chunk.length - 1)))
    }

    const mags = computeDFT(chunk, numBins)
    for (let k = 0; k < numBins; k++) {
      avgSpectrum[k] += mags[k]
    }
    chunkCount++
  }

  if (chunkCount === 0) {
    return { high: 33, mid: 33, low: 34, mfcc: Array.from({ length: 13 }, () => 0) }
  }

  for (let k = 0; k < numBins; k++) {
    avgSpectrum[k] /= chunkCount
  }

  const sampleRate = 44100
  const binHz = sampleRate / chunkSize
  const lowBinEnd = Math.min(Math.ceil(300 / binHz), numBins)
  const midBinEnd = Math.min(Math.ceil(2000 / binHz), numBins)

  let lowEnergy = 0
  let midEnergy = 0
  let highEnergy = 0

  for (let k = 1; k < lowBinEnd; k++) lowEnergy += avgSpectrum[k]
  for (let k = lowBinEnd; k < midBinEnd; k++) midEnergy += avgSpectrum[k]
  for (let k = midBinEnd; k < numBins; k++) highEnergy += avgSpectrum[k]

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
