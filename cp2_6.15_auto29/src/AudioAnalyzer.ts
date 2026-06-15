export interface AudioData {
  spectrum: Float32Array
  beat: boolean
  volume: number
  lowFreqEnergy: number
  midFreqEnergy: number
  highFreqEnergy: number
}

type AudioSourceType = 'none' | 'microphone' | 'file'

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private spectrumData: Float32Array
  private timeData: Float32Array
  private animationId: number | null = null
  private callbacks: Set<(data: AudioData) => void> = new Set()
  private energyHistory: number[] = []
  private lastBeatTime: number = 0
  private sourceType: AudioSourceType = 'none'
  private isPlaying: boolean = false
  private fileBuffer: AudioBuffer | null = null
  private progressCallback: ((progress: number) => void) | null = null
  private beatThreshold: number = 1.5

  constructor() {
    this.spectrumData = new Float32Array(new ArrayBuffer(128 * 4))
    this.timeData = new Float32Array(new ArrayBuffer(2048 * 4))
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1.0
      this.gainNode.connect(this.analyser)
      this.spectrumData = new Float32Array(new ArrayBuffer(this.analyser.frequencyBinCount * 4))
    }
    return this.audioContext
  }

  getSourceType(): AudioSourceType {
    return this.sourceType
  }

  isSourcePlaying(): boolean {
    return this.isPlaying
  }

  async connectMicrophone(): Promise<boolean> {
    this.stop()
    const ctx = this.ensureAudioContext()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.sourceNode = ctx.createMediaStreamSource(stream)
      this.sourceNode.connect(this.gainNode!)
      this.sourceType = 'microphone'
      this.isPlaying = true
      this.startLoop()
      return true
    } catch (error) {
      alert('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风。')
      return false
    }
  }

  async loadAudioFile(file: File): Promise<boolean> {
    if (file.size > 10 * 1024 * 1024) {
      alert('音频文件大小不能超过10MB')
      return false
    }

    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/x-wav']
    if (!validTypes.includes(file.type) && 
        !file.name.toLowerCase().endsWith('.wav') && 
        !file.name.toLowerCase().endsWith('.mp3')) {
      alert('只支持WAV和MP3格式的音频文件')
      return false
    }

    this.stop()
    this.progressCallback?.(0)

    const ctx = this.ensureAudioContext()

    try {
      const arrayBuffer = await this.readFileWithProgress(file)
      this.progressCallback?.(50)

      this.fileBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
      this.progressCallback?.(100)

      this.sourceType = 'file'
      await this.playFileBuffer()
      return true
    } catch (error) {
      console.error('Error loading audio file:', error)
      alert('加载音频文件失败')
      this.progressCallback?.(0)
      return false
    }
  }

  private readFileWithProgress(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      let lastProgress = 0

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 50)
          if (progress > lastProgress) {
            lastProgress = progress
            this.progressCallback?.(progress)
          }
        }
      }

      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  private async playFileBuffer(): Promise<void> {
    if (!this.audioContext || !this.fileBuffer) return

    const ctx = this.audioContext
    const bufferSource = ctx.createBufferSource()
    bufferSource.buffer = this.fileBuffer
    bufferSource.connect(this.gainNode!)
    bufferSource.connect(ctx.destination)

    bufferSource.onended = () => {
      if (this.sourceType === 'file' && this.isPlaying) {
        this.isPlaying = false
      }
    }

    this.sourceNode = bufferSource
    bufferSource.start(0)
    this.isPlaying = true
    this.startLoop()
  }

  setProgressCallback(callback: (progress: number) => void): void {
    this.progressCallback = callback
  }

  subscribe(callback: (data: AudioData) => void): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  private startLoop(): void {
    if (this.animationId !== null) return

    const targetFPS = 60
    const frameInterval = 1000 / targetFPS
    let lastFrameTime = performance.now()

    const loop = (currentTime: number) => {
      const elapsed = currentTime - lastFrameTime

      if (elapsed >= frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval)
        this.update()
      }

      this.animationId = requestAnimationFrame(loop)
    }

    this.animationId = requestAnimationFrame(loop)
  }

  private update(): void {
    if (!this.analyser) return

    this.analyser.getFloatFrequencyData(this.spectrumData as unknown as Float32Array<ArrayBuffer>)
    this.analyser.getFloatTimeDomainData(this.timeData as unknown as Float32Array<ArrayBuffer>)

    const normalizedSpectrum = new Float32Array(this.spectrumData.length)
    let totalEnergy = 0
    let lowEnergy = 0
    let midEnergy = 0
    let highEnergy = 0

    const lowEnd = Math.floor(this.spectrumData.length * 0.2)
    const midEnd = Math.floor(this.spectrumData.length * 0.6)

    for (let i = 0; i < this.spectrumData.length; i++) {
      const normalized = (this.spectrumData[i] + 140) / 140
      const value = Math.max(0, Math.min(1, normalized))
      normalizedSpectrum[i] = value
      totalEnergy += value

      if (i < lowEnd) lowEnergy += value
      else if (i < midEnd) midEnergy += value
      else highEnergy += value
    }

    const binCount = this.spectrumData.length
    const avgEnergy = totalEnergy / binCount
    const lowFreqEnergy = lowEnergy / lowEnd
    const midFreqEnergy = midEnergy / (midEnd - lowEnd)
    const highFreqEnergy = highEnergy / (binCount - midEnd)

    this.energyHistory.push(avgEnergy)
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift()
    }

    const historyAvg = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length
    const now = performance.now()
    let beat = false

    if (avgEnergy > historyAvg * this.beatThreshold && 
        avgEnergy > 0.3 && 
        now - this.lastBeatTime > 200) {
      beat = true
      this.lastBeatTime = now
    }

    let volume = 0
    for (let i = 0; i < this.timeData.length; i++) {
      volume += this.timeData[i] * this.timeData[i]
    }
    volume = Math.sqrt(volume / this.timeData.length)
    volume = Math.min(1, volume * 3)

    const data: AudioData = {
      spectrum: normalizedSpectrum,
      beat,
      volume,
      lowFreqEnergy,
      midFreqEnergy,
      highFreqEnergy
    }

    this.callbacks.forEach(cb => cb(data))
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    if (this.sourceNode) {
      try {
        if ('stop' in this.sourceNode) {
          (this.sourceNode as AudioBufferSourceNode).stop()
        }
      } catch (e) {}
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    this.isPlaying = false
    this.energyHistory = []
    this.lastBeatTime = 0
  }

  destroy(): void {
    this.stop()
    this.callbacks.clear()
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.fileBuffer = null
  }
}

export const audioAnalyzer = new AudioAnalyzer()
