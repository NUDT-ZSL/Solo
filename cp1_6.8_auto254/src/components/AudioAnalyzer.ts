import type { Emotion } from '@/utils/textParser'

interface AudioAnalysisResult {
  speed: number
  emotion: Emotion
  text: string
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private recognition: SpeechRecognition | null = null
  private onData: ((result: AudioAnalysisResult) => void) | null = null
  private volumeHistory: number[] = []
  private animationFrame: number = 0
  private isRunning = false

  constructor() {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'zh-CN'
    }
  }

  async start(onData: (result: AudioAnalysisResult) => void): Promise<boolean> {
    if (this.isRunning) return false
    this.onData = onData

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      source.connect(this.analyser)
      this.isRunning = true
      this.volumeHistory = []
      this.analyzeLoop()

      if (this.recognition) {
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
          }
          if (transcript && this.onData) {
            this.onData({
              speed: this.estimateSpeed(),
              emotion: this.estimateEmotion(),
              text: transcript,
            })
          }
        }
        this.recognition.start()
      }

      return true
    } catch {
      return false
    }
  }

  stop(): void {
    this.isRunning = false
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    if (this.recognition) {
      try { this.recognition.stop() } catch {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.audioContext = null
    this.analyser = null
    this.mediaStream = null
  }

  private analyzeLoop(): void {
    if (!this.isRunning || !this.analyser) return
    const dataArray = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)
    this.volumeHistory.push(rms)
    if (this.volumeHistory.length > 60) this.volumeHistory.shift()
    this.animationFrame = requestAnimationFrame(() => this.analyzeLoop())
  }

  private estimateSpeed(): number {
    if (this.volumeHistory.length < 10) return 1.0
    let peaks = 0
    const threshold = 0.05
    for (let i = 1; i < this.volumeHistory.length - 1; i++) {
      if (
        this.volumeHistory[i] > threshold &&
        this.volumeHistory[i] > this.volumeHistory[i - 1] &&
        this.volumeHistory[i] > this.volumeHistory[i + 1]
      ) {
        peaks++
      }
    }
    return Math.min(3, Math.max(0.1, peaks / 5))
  }

  private estimateEmotion(): Emotion {
    if (!this.analyser || this.volumeHistory.length < 10) return 'neutral'
    const freqData = new Float32Array(this.analyser.frequencyBinCount)
    this.analyser.getFloatFrequencyData(freqData)
    let lowEnergy = 0
    let highEnergy = 0
    const mid = Math.floor(freqData.length / 3)
    for (let i = 0; i < mid; i++) lowEnergy += freqData[i]
    for (let i = mid; i < freqData.length; i++) highEnergy += freqData[i]
    const avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length
    if (avgVolume > 0.1 && highEnergy > lowEnergy * 0.5) return 'positive'
    if (avgVolume < 0.03 && lowEnergy > highEnergy * 2) return 'negative'
    return 'neutral'
  }
}
