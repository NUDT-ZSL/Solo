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

export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'stopped'

const FFT_SIZE = 2048
const HOP_SIZE = 512

class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private worker: Worker | null = null
  private startTime = 0
  private pauseOffset = 0
  private sharedSpectrum: Float32Array | null = null
  private sharedTimeData: Uint8Array | null = null
  private animationFrameId: number | null = null
  private state: PlaybackState = 'idle'
  private analysisData: AudioAnalysisData | null = null
  private onProgress: ((progress: number) => void) | null = null
  private onStateChange: ((state: PlaybackState) => void) | null = null
  private onCurrentTime: ((time: number, spectrum: Float32Array) => void) | null = null
  private loopEnabled = false
  private onEnded: (() => void) | null = null

  constructor() {
    this.initWorker()
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL('./audioWorker.ts', import.meta.url),
        { type: 'module' }
      )
      this.worker.postMessage({ type: 'init', fftSize: FFT_SIZE })
    } catch (e) {
      console.warn('Web Worker not available, falling back to main thread')
    }
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
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }

    this.onProgress?.(0.6)

    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))

    this.onProgress?.(0.8)

    const channelData = this.audioBuffer.getChannelData(0)
    const sampleRate = this.audioBuffer.sampleRate
    const duration = this.audioBuffer.duration

    const numFrames = Math.max(1, Math.floor((channelData.length - FFT_SIZE) / HOP_SIZE) + 1)
    const spectrumPerFrame = FFT_SIZE / 2

    let spectrumFrames: Float32Array
    let timeFrames: Float32Array

    if (this.worker) {
      const result = await this.processWithWorker(channelData)
      spectrumFrames = result.spectrum
      timeFrames = result.timeData
    } else {
      const fallback = this.processFallback(channelData, numFrames, spectrumPerFrame)
      spectrumFrames = fallback.spectrum
      timeFrames = fallback.timeData
    }

    const beats = this.detectBeats(spectrumFrames, numFrames, spectrumPerFrame, sampleRate)
    const waveform = this.downsampleWaveform(channelData, 1024)

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

    this.sharedSpectrum = new Float32Array(spectrumPerFrame)
    this.sharedTimeData = new Uint8Array(FFT_SIZE)

    this.onProgress?.(1)
    this.setState('ready')
    this.pauseOffset = 0

    return this.analysisData
  }

  private processWithWorker(audioData: Float32Array): Promise<{ spectrum: Float32Array; timeData: Float32Array }> {
    return new Promise((resolve) => {
      const messageHandler = (e: MessageEvent) => {
        if (e.data.type === 'fft') {
          this.worker!.removeEventListener('message', messageHandler)
          resolve({
            spectrum: e.data.spectrum,
            timeData: e.data.timeData
          })
        }
      }

      this.worker!.addEventListener('message', messageHandler)
      this.worker!.postMessage(
        {
          type: 'process',
          audioData: audioData,
          sampleRate: this.audioContext?.sampleRate || 44100
        },
        [audioData.buffer]
      )
    })
  }

  private processFallback(audioData: Float32Array, numFrames: number, spectrumPerFrame: number): { spectrum: Float32Array; timeData: Float32Array } {
    const spectrum = new Float32Array(numFrames * spectrumPerFrame)
    const timeData = new Float32Array(numFrames * FFT_SIZE)

    const real = new Float32Array(FFT_SIZE)
    const imag = new Float32Array(FFT_SIZE)
    const reverseTable = new Int32Array(FFT_SIZE)

    let bits = 0
    while ((1 << bits) < FFT_SIZE) bits++
    for (let i = 0; i < FFT_SIZE; i++) {
      let rev = 0
      for (let j = 0; j < bits; j++) {
        rev = (rev << 1) | ((i >> j) & 1)
      }
      reverseTable[i] = rev
    }

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * HOP_SIZE

      for (let i = 0; i < FFT_SIZE; i++) {
        const idx = start + i
        const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)))
        real[i] = (idx < audioData.length ? audioData[idx] : 0) * hann
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
            const cos = Math.cos(-2 * Math.PI * k / FFT_SIZE)
            const sin = Math.sin(-2 * Math.PI * k / FFT_SIZE)
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

      for (let i = 0; i < spectrumPerFrame; i++) {
        spectrum[frame * spectrumPerFrame + i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (FFT_SIZE / 2)
      }
    }

    return { spectrum, timeData }
  }

  private detectBeats(spectrum: Float32Array, numFrames: number, spectrumPerFrame: number, sampleRate: number): Float32Array {
    const bassBins = Math.floor(200 / (sampleRate / FFT_SIZE))
    const energyHistory: number[] = []
    const beats: number[] = []
    const frameDuration = HOP_SIZE / sampleRate

    for (let frame = 0; frame < numFrames; frame++) {
      let bassEnergy = 0
      for (let i = 0; i < bassBins && i < spectrumPerFrame; i++) {
        bassEnergy += spectrum[frame * spectrumPerFrame + i]
      }
      energyHistory.push(bassEnergy)

      if (energyHistory.length > 43) {
        energyHistory.shift()
      }

      if (energyHistory.length >= 43) {
        const avg = energyHistory.slice(0, 42).reduce((a, b) => a + b, 0) / 42
        const variance = energyHistory.slice(0, 42).reduce((a, b) => a + (b - avg) * (b - avg), 0) / 42
        const threshold = avg * (-0.0025714 * variance + 1.5142857)

        if (bassEnergy > threshold && bassEnergy > avg * 1.3) {
          const lastBeat = beats.length > 0 ? beats[beats.length - 1] : -1
          if (frame * frameDuration - lastBeat > 0.2) {
            beats.push(frame * frameDuration)
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
      for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
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

    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 1

    this.sourceNode.connect(this.analyser)
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)

    const offset = startTime ?? this.pauseOffset
    this.sourceNode.start(0, offset)
    this.startTime = this.audioContext.currentTime
    this.pauseOffset = offset

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

    if (resetPosition) {
      this.pauseOffset = 0
      this.setState('stopped')
    }
  }

  seek(time: number): void {
    const wasPlaying = this.state === 'playing'
    this.pauseOffset = Math.max(0, Math.min(time, this.getDuration()))
    if (wasPlaying) {
      this.play(this.pauseOffset)
    }
  }

  private startAnalysisLoop(): void {
    const loop = () => {
      if (this.state !== 'playing' || !this.analyser || !this.sharedSpectrum || !this.sharedTimeData) {
        return
      }

      const freqData = new Float32Array(this.analyser.frequencyBinCount)
      this.analyser.getFloatFrequencyData(freqData)

      const normalized = new Float32Array(freqData.length)
      for (let i = 0; i < freqData.length; i++) {
        const db = freqData[i]
        normalized[i] = Math.max(0, Math.min(1, (db + 100) / 80))
      }

      this.sharedSpectrum.set(normalized)

      const currentT = this.getCurrentTime()
      this.onCurrentTime?.(currentT, normalized)

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
    if (!this.analysisData || !this.sharedSpectrum) return null

    const frame = Math.floor(time / (HOP_SIZE / this.analysisData.sampleRate))
    const clampedFrame = Math.max(0, Math.min(frame, this.analysisData.numFrames - 1))
    const bins = this.analysisData.fftSize / 2

    const result = new Float32Array(bins)
    let max = 0
    for (let i = 0; i < bins; i++) {
      const val = this.analysisData.spectrum[clampedFrame * bins + i]
      result[i] = val
      if (val > max) max = val
    }
    if (max > 0) {
      for (let i = 0; i < bins; i++) {
        result[i] /= max
      }
    }

    this.sharedSpectrum.set(result)
    return result
  }

  getSharedSpectrum(): Float32Array | null {
    return this.sharedSpectrum
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
