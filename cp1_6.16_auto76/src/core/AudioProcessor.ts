import type { AudioData } from '../types'

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null
  private dataArray: Uint8Array
  private isInitialized = false
  private hasError = false
  private errorMessage: string | null = null
  private smoothedVolume = 0

  constructor(fftSize: number = 128) {
    this.dataArray = new Uint8Array(fftSize)
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持音频输入功能')
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('您的浏览器不支持 Web Audio API')
      }

      this.audioContext = new AudioContextClass()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.dataArray.length * 2
      this.analyser.smoothingTimeConstant = 0.8

      this.microphone = this.audioContext.createMediaStreamSource(this.stream)
      this.microphone.connect(this.analyser)

      this.isInitialized = true
      this.hasError = false
      this.errorMessage = null

      return true
    } catch (error: any) {
      this.hasError = true
      this.isInitialized = false

      if (error.name === 'NotAllowedError') {
        this.errorMessage = '麦克风权限被拒绝，音频交互功能已禁用。您可以在浏览器设置中重新授权。'
      } else if (error.name === 'NotFoundError') {
        this.errorMessage = '未检测到可用的麦克风设备。'
      } else if (error.name === 'NotReadableError') {
        this.errorMessage = '麦克风被其他应用占用。'
      } else {
        this.errorMessage = error.message || '音频初始化失败，程序将以静默模式运行。'
      }

      console.warn('AudioProcessor 初始化失败:', this.errorMessage)
      return false
    }
  }

  public getAudioData(): AudioData {
    const frequencyData = new Uint8Array(this.dataArray.length)
    let volume = 0

    if (this.isInitialized && this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>)
      frequencyData.set(this.dataArray)

      let sum = 0
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i]
      }
      const rawVolume = sum / this.dataArray.length / 255
      this.smoothedVolume = this.smoothedVolume * 0.85 + rawVolume * 0.15
      volume = Math.min(1, this.smoothedVolume * 2.5)
    }

    return {
      volume,
      frequencyData,
      isActive: this.isInitialized,
      error: this.errorMessage,
    }
  }

  public async stop(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    if (this.microphone) {
      this.microphone.disconnect()
      this.microphone = null
    }
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
    this.isInitialized = false
  }

  public isActive(): boolean {
    return this.isInitialized
  }

  public getError(): string | null {
    return this.errorMessage
  }
}
