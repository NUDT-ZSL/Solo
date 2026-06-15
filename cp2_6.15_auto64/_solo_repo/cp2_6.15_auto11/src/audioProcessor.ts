export interface AudioAnalysisData {
  sampleRate: number
  duration: number
  numFrames: number
  spectrum: Float32Array
  timeData: Float32Array
  fftSize: number
  beats: Float32Array
  waveform: Float32Array
}

export interface SharedAudioBuffer {
  spectrum: Float32Array
  beats: Float32Array
  beatCount: Int32Array
  currentFrame: Int32Array
}

export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'stopped'

const FFT_SIZE = 2048
const HOP_SIZE = 512
const SPECTRUM_BINS = FFT_SIZE / 2

const LOW_FREQ_MIN = Math.floor(20 / (44100 / FFT_SIZE))
const LOW_FREQ_MAX = Math.floor(200 / (44100 / FFT_SIZE))
const MID_FREQ_MIN = Math.floor(200 / (44100 / FFT_SIZE))
const MID_FREQ_MAX = Math.floor(2000 / (44100 / FFT_SIZE))
const HIGH_FREQ_MIN = Math.floor(2000 / (44100 / FFT_SIZE))
const HIGH_FREQ_MAX = Math.floor(20000 / (44100 / FFT_SIZE))

export const FREQ_RANGES = {
  low: { min: LOW_FREQ_MIN, max: LOW_FREQ_MAX },
  mid: { min: MID_FREQ_MIN, max: MID_FREQ_MAX },
  high: { min: HIGH_FREQ_MIN, max: HIGH_FREQ_MAX },
}

function createSharedBuffer(): SharedAudioBuffer {
  const hasSharedBuffer = typeof SharedArrayBuffer !== 'undefined'
  
  const createBuffer = (bytes: number) => {
    if (hasSharedBuffer) {
      return new SharedArrayBuffer(bytes)
    }
    return new ArrayBuffer(bytes)
  }

  const spectrumBuffer = createBuffer(SPECTRUM_BINS * Float32Array.BYTES_PER_ELEMENT)
  const beatsBuffer = createBuffer(1024 * Float32Array.BYTES_PER_ELEMENT)
  const beatCountBuffer = createBuffer(Int32Array.BYTES_PER_ELEMENT)
  const currentFrameBuffer = createBuffer(Int32Array.BYTES_PER_ELEMENT)

  return {
    spectrum: new Float32Array(spectrumBuffer),
    beats: new Float32Array(beatsBuffer),
    beatCount: new Int32Array(beatCountBuffer),
    currentFrame: new Int32Array(currentFrameBuffer),
  }
}

class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private mediaDest: MediaStreamAudioDestinationNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private worker: Worker | null = null
  private startTime = 0
  private pauseOffset = 0
  private sharedBuffer: SharedAudioBuffer | null = null
  private analysisBuffer: SharedAudioBuffer | null = null
  private animationFrameId: number | null = null
  private state: PlaybackState = 'idle'
  private analysisData: AudioAnalysisData | null = null
  private onProgress: ((progress: number) => void) | null = null
  private onStateChange: ((state: PlaybackState) => void) | null = null
  private onCurrentTime: ((time: number, spectrum: Float32Array) => void) | null = null
  private loopEnabled = false
  private onEnded: (() => void) | null = null
  private playbackStartTime = 0

  constructor() {
    this.sharedBuffer = createSharedBuffer()
    this.initWorker()
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL('./audioWorker.ts', import.meta.url),
        { type: 'module' }
      )
      this.worker.postMessage({
        type: 'init',
        fftSize: FFT_SIZE,
        sharedBuffer: this.sharedBuffer,
      })
    } catch (e) {
      console.warn('Web Worker not available, falling back to main thread:', e)
    }
  }

  getSharedBuffer(): SharedAudioBuffer | null {
    return this.sharedBuffer
  }

  getAnalysisSharedBuffer(): SharedAudioBuffer | null {
    return this.analysisBuffer
  }

  setOnProgress(callback: (progress: number) => void): void {
    this.onProgress = callback
  }

  setOnStateChange(callback: (state: PlaybackState) => void): void {
    this.onStateChange = callback
  }

  setOnCurrentTime(callback: (time: number, spectrum: Float32Array) => void): void {
    this.onCurrentTime = callback
  }

  setOnEnded(callback: () => void): void {
    this.onEnded = callback
  }

  getState(): PlaybackState {
    return this.state
  }

  getAnalysisData(): AudioAnalysisData | null {
    return this.analysisData
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0
  }

  getCurrentTime(): number {
    if (this.state === 'playing' && this.audioContext) {
      return this.audioContext.currentTime - this.startTime + this.pauseOffset
    }
    return this.pauseOffset
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  getMediaStream(): MediaStream | null {
    return this.mediaDest?.stream || null
  }

  setLoopEnabled(enabled: boolean): void {
    this.loopEnabled = enabled
    if (this.sourceNode) {
      this.sourceNode.loop = enabled
    }
  }

  private setState(state: PlaybackState): void {
    this.state = state
    this.onStateChange?.(state)
  }

  async loadFromFile(file: File): Promise<AudioAnalysisData> {
    this.setState('loading')
    this.onProgress?.(0)

    const arrayBuffer = await this.readFile(file)
    return this.decodeAndAnalyze(arrayBuffer)
  }

  async loadFromArrayBuffer(buffer: ArrayBuffer, _name = 'audio'): Promise<AudioAnalysisData> {
    this.setState('loading')
    this.onProgress?.(0)
    return this.decodeAndAnalyze(buffer)
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          this.onProgress?.(e.loaded / e.total * 0.5)
        }
      }
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  private async decodeAndAnalyze(arrayBuffer: ArrayBuffer): Promise<AudioAnalysisData> {
    const decodeStart = performance.now()

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }

    this.onProgress?.(0.55)

    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))

    this.onProgress?.(0.65)

    const channelData = this.audioBuffer.getChannelData(0)
    const sampleRate = this.audioBuffer.sampleRate
    const duration = this.audioBuffer.duration

    const adjustedLowMax = Math.min(Math.floor(200 / (sampleRate / FFT_SIZE)), SPECTRUM_BINS)
    const adjustedMidMax = Math.min(Math.floor(2000 / (sampleRate / FFT_SIZE)), SPECTRUM_BINS)
    const adjustedHighMax = Math.min(Math.floor(20000 / (sampleRate / FFT_SIZE)), SPECTRUM_BINS)
    ;(FREQ_RANGES.low as { min: number; max: number }).max = adjustedLowMax
    ;(FREQ_RANGES.mid as { min: number; max: number }).min = adjustedLowMax
    ;(FREQ_RANGES.mid as { min: number; max: number }).max = adjustedMidMax
    ;(FREQ_RANGES.high as { min: number; max: number }).min = adjustedMidMax
    ;(FREQ_RANGES.high as { min: number; max: number }).max = adjustedHighMax

    const numFrames = Math.max(1, Math.floor((channelData.length - FFT_SIZE) / HOP_SIZE) + 1)
    const spectrumPerFrame = SPECTRUM_BINS

    this.onProgress?.(0.75)

    let spectrumFrames: Float32Array
    let timeFrames: Float32Array

    if (this.worker && typeof SharedArrayBuffer !== 'undefined') {
      const result = await this.processWithWorkerShared(channelData, sampleRate)
      spectrumFrames = result.spectrum
      timeFrames = result.timeData
    } else {
      const fallback = this.processFallbackOptimized(channelData, numFrames, spectrumPerFrame)
      spectrumFrames = fallback.spectrum
      timeFrames = fallback.timeData
    }

    this.onProgress?.(0.9)

    const beats = this.detectBeatsOptimized(spectrumFrames, numFrames, spectrumPerFrame, sampleRate)
    const waveform = this.downsampleWaveform(channelData, 1024)

    this.analysisBuffer = createSharedBuffer()
    if (this.analysisData) {
      this.analysisBuffer.spectrum.set(this.analysisData.spectrum.slice(0, SPECTRUM_BINS))
    }
    Atomics.store(this.analysisBuffer.beatCount, 0, beats.length)
    for (let i = 0; i < beats.length && i < this.analysisBuffer.beats.length; i++) {
      this.analysisBuffer.beats[i] = beats[i]
    }

    this.analysisData = {
      sampleRate,
      duration,
      numFrames,
      spectrum: spectrumFrames,
      timeData: timeFrames,
      fftSize: FFT_SIZE,
      beats,
      waveform
    }

    if (this.sharedBuffer) {
      this.sharedBuffer.spectrum.fill(0)
    }

    const decodeTime = (performance.now() - decodeStart) / 1000
    console.log(`Audio analysis completed in ${decodeTime.toFixed(2)}s`)

    this.onProgress?.(1)
    this.setState('ready')
    this.pauseOffset = 0

    return this.analysisData
  }

  private processWithWorkerShared(
    audioData: Float32Array,
    sampleRate: number
  ): Promise<{ spectrum: Float32Array; timeData: Float32Array }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'))
      }, 5000)

      const messageHandler = (e: MessageEvent) => {
        if (e.data.type === 'fft-complete') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', messageHandler)
          resolve({
            spectrum: e.data.spectrum,
            timeData: e.data.timeData
          })
        } else if (e.data.type === 'error') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', messageHandler)
          reject(new Error(e.data.error))
        }
      }

      this.worker!.addEventListener('message', messageHandler)
      this.worker!.postMessage(
        {
          type: 'process-shared',
          audioData: audioData,
          sampleRate,
          analysisBuffer: this.analysisBuffer,
        },
        [audioData.buffer]
      )
    })
  }

  private processFallbackOptimized(
    audioData: Float32Array,
    numFrames: number,
    spectrumPerFrame: number
  ): { spectrum: Float32Array; timeData: Float32Array } {
    const spectrum = new Float32Array(numFrames * spectrumPerFrame)
    const timeData = new Float32Array(numFrames * FFT_SIZE)

    const cosTable = new Float32Array(FFT_SIZE)
    const sinTable = new Float32Array(FFT_SIZE)
    const reverseTable = new Int32Array(FFT_SIZE)

    for (let i = 0; i < FFT_SIZE; i++) {
      cosTable[i] = Math.cos(-2 * Math.PI * i / FFT_SIZE)
      sinTable[i] = Math.sin(-2 * Math.PI * i / FFT_SIZE)
    }

    let bits = 0
    while ((1 << bits) < FFT_SIZE) bits++
    for (let i = 0; i < FFT_SIZE; i++) {
      let rev = 0
      for (let j = 0; j < bits; j++) {
        rev = (rev << 1) | ((i >> j) & 1)
      }
      reverseTable[i] = rev
    }

    const hannWindow = new Float32Array(FFT_SIZE)
    for (let i = 0; i < FFT_SIZE; i++) {
      hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)))
    }

    const real = new Float32Array(FFT_SIZE)
    const imag = new Float32Array(FFT_SIZE)

    const batchSize = Math.min(64, numFrames)
    let processed = 0

    const processBatch = () => {
      const end = Math.min(processed + batchSize, numFrames)

      for (let frame = processed; frame < end; frame++) {
        const start = frame * HOP_SIZE

        for (let i = 0; i < FFT_SIZE; i++) {
          const idx = start + i
          real[i] = (idx < audioData.length ? audioData[idx] : 0) * hannWindow[i]
          imag[i] = 0
          if (idx < audioData.length) {
            timeData[frame * FFT_SIZE + i] = audioData[idx]
          }
        }

        for (let i = 0; i < FFT_SIZE; i++) {
          const j = reverseTable[i]
          if (i < j) {
            let tmp = real[i]; real[i] = real[j]; real[j] = tmp
            tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp
          }
        }

        for (let size = 2; size <= FFT_SIZE; size <<= 1) {
          const half = size >> 1
          const step = FFT_SIZE / size
          for (let i = 0; i < FFT_SIZE; i += size) {
            let k = 0
            for (let j = i; j < i + half; j++) {
              const cos = cosTable[k]
              const sin = sinTable[k]
              const tpr = real[j + half] * cos - imag[j + half] * sin
              const tpi = real[j + half] * sin + imag[j + half] * cos
              real[j + half] = real[j] - tpr
              imag[j + half] = imag[j] - tpi
              real[j] += tpr
              imag[j] += tpi
              k += step
            }
          }
        }

        const specOffset = frame * spectrumPerFrame
        for (let i = 0; i < spectrumPerFrame; i++) {
          const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
          spectrum[specOffset + i] = mag / (FFT_SIZE / 2)
        }
      }

      processed = end
      if (processed < numFrames) {
        requestAnimationFrame(processBatch)
      }
    }

    processBatch()

    return { spectrum, timeData }
  }

  private detectBeatsOptimized(
    spectrum: Float32Array,
    numFrames: number,
    spectrumPerFrame: number,
    sampleRate: number
  ): Float32Array {
    const bassBins = Math.min(Math.floor(200 / (sampleRate / FFT_SIZE)), spectrumPerFrame)
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

  private downsampleWaveform(channelData: Float32Array, targetSize: number): Float32Array {
    const blockSize = Math.floor(channelData.length / targetSize)
    const result = new Float32Array(targetSize)

    for (let i = 0; i < targetSize; i++) {
      const start = i * blockSize
      let max = 0
      for (let j = 0; j < blockSize && start + j < channelData.length; j += 4) {
        const val = Math.abs(channelData[start + j])
        if (val > max) max = val
      }
      result[i] = max
    }

    return result
  }

  async play(startTime?: number): Promise<void> {
    if (!this.audioBuffer || !this.audioContext) return

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    this.stop(false)

    this.sourceNode = this.audioContext.createBufferSource()
    this.sourceNode.buffer = this.audioBuffer
    this.sourceNode.loop = this.loopEnabled

    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    this.analyser.smoothingTimeConstant = 0.8

    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 1

    this.mediaDest = this.audioContext.createMediaStreamDestination()

    this.sourceNode.connect(this.analyser)
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)
    this.analyser.connect(this.mediaDest)

    const offset = startTime ?? this.pauseOffset
    this.sourceNode.start(0, offset)
    this.startTime = this.audioContext.currentTime
    this.pauseOffset = offset
    this.playbackStartTime = performance.now()

    this.sourceNode.onended = () => {
      if (!this.loopEnabled) {
        this.setState('stopped')
        this.pauseOffset = 0
        this.stopAnalysisLoop()
        this.onEnded?.()
      }
    }

    this.setState('playing')
    this.startAnalysisLoop()
  }

  pause(): void {
    if (this.state !== 'playing' || !this.audioContext || !this.sourceNode) return

    this.pauseOffset = this.audioContext.currentTime - this.startTime + this.pauseOffset
    this.sourceNode.onended = null
    this.sourceNode.stop()
    this.sourceNode.disconnect()
    this.sourceNode = null

    this.setState('paused')
    this.stopAnalysisLoop()
  }

  stop(resetPosition = true): void {
    if (this.sourceNode) {
      this.sourceNode.onended = null
      try { this.sourceNode.stop() } catch { /* noop */ }
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    this.stopAnalysisLoop()

    if (this.sharedBuffer) {
      Atomics.store(this.sharedBuffer.currentFrame, 0, 0)
      this.sharedBuffer.spectrum.fill(0)
    }

    if (resetPosition) {
      this.pauseOffset = 0
      this.setState('stopped')
    }
  }

  seek(time: number): void {
    const wasPlaying = this.state === 'playing'
    this.pauseOffset = Math.max(0, Math.min(time, this.getDuration()))

    if (this.analysisData && this.sharedBuffer) {
      const frame = Math.floor(time / (HOP_SIZE / this.analysisData.sampleRate))
      const clampedFrame = Math.max(0, Math.min(frame, this.analysisData.numFrames - 1))
      const bins = this.analysisData.fftSize / 2
      Atomics.store(this.sharedBuffer.currentFrame, 0, clampedFrame)

      const frameOffset = clampedFrame * bins
      for (let i = 0; i < bins; i++) {
        const val = this.analysisData.spectrum[frameOffset + i]
        this.sharedBuffer.spectrum[i] = val
      }
    }

    if (wasPlaying) {
      this.play(this.pauseOffset)
    }
  }

  private startAnalysisLoop(): void {
    const freqData = new Float32Array(SPECTRUM_BINS)

    const loop = () => {
      if (this.state !== 'playing' || !this.analyser || !this.sharedBuffer) {
        return
      }

      this.analyser.getFloatFrequencyData(freqData)

      for (let i = 0; i < SPECTRUM_BINS; i++) {
        const db = freqData[i]
        const normalized = Math.max(0, Math.min(1, (db + 100) / 80))
        this.sharedBuffer.spectrum[i] = normalized
      }

      const currentT = this.getCurrentTime()
      if (this.analysisData) {
        const frame = Math.floor(currentT / (HOP_SIZE / this.analysisData.sampleRate))
        Atomics.store(this.sharedBuffer.currentFrame, 0, frame)
      }

      if (this.onCurrentTime) {
        const specCopy = new Float32Array(this.sharedBuffer.spectrum)
        this.onCurrentTime(currentT, specCopy)
      }

      this.animationFrameId = requestAnimationFrame(loop)
    }

    this.animationFrameId = requestAnimationFrame(loop)
  }

  private stopAnalysisLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  getSpectrumAtTime(time: number): Float32Array | null {
    if (!this.analysisData || !this.sharedBuffer) return null

    const frame = Math.floor(time / (HOP_SIZE / this.analysisData.sampleRate))
    const clampedFrame = Math.max(0, Math.min(frame, this.analysisData.numFrames - 1))
    const bins = SPECTRUM_BINS

    const result = new Float32Array(bins)
    let max = 0
    const frameOffset = clampedFrame * bins

    for (let i = 0; i < bins; i++) {
      const val = this.analysisData.spectrum[frameOffset + i]
      result[i] = val
      if (val > max) max = val
    }
    if (max > 0) {
      for (let i = 0; i < bins; i++) {
        result[i] /= max
        this.sharedBuffer.spectrum[i] = result[i]
      }
    }

    Atomics.store(this.sharedBuffer.currentFrame, 0, clampedFrame)

    return result
  }

  getSharedSpectrum(): Float32Array | null {
    if (!this.sharedBuffer) return null
    return new Float32Array(this.sharedBuffer.spectrum)
  }

  getLowMidHighEnergies(): { low: number; mid: number; high: number } {
    if (!this.sharedBuffer) {
      return { low: 0, mid: 0, high: 0 }
    }

    const spec = this.sharedBuffer.spectrum
    let low = 0, mid = 0, high = 0

    const { low: lr, mid: mr, high: hr } = FREQ_RANGES

    for (let i = lr.min; i < lr.max && i < SPECTRUM_BINS; i++) {
      low += spec[i]
    }
    for (let i = mr.min; i < mr.max && i < SPECTRUM_BINS; i++) {
      mid += spec[i]
    }
    for (let i = hr.min; i < hr.max && i < SPECTRUM_BINS; i++) {
      high += spec[i]
    }

    return {
      low: low / Math.max(1, lr.max - lr.min),
      mid: mid / Math.max(1, mr.max - mr.min),
      high: high / Math.max(1, hr.max - hr.min),
    }
  }

  destroy(): void {
    this.stop()
    this.stopAnalysisLoop()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

export const audioProcessor = new AudioProcessor()
