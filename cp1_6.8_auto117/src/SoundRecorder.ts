import type { EmotionTag } from '@/types'

type RecordingState = 'idle' | 'recording' | 'stopped'

class SoundRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private audioContext: AudioContext | null = null
  private startTime: number = 0
  private maxDuration: number = 60
  private state: RecordingState = 'idle'
  private onStateChange: ((state: RecordingState) => void) | null = null
  private onTimeUpdate: ((elapsed: number) => void) | null = null
  private timerInterval: ReturnType<typeof setInterval> | null = null

  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  setCallbacks(
    onStateChange: (state: RecordingState) => void,
    onTimeUpdate: (elapsed: number) => void
  ) {
    this.onStateChange = onStateChange
    this.onTimeUpdate = onTimeUpdate
  }

  async startRecording(): Promise<void> {
    if (this.state === 'recording') return

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      this.mediaRecorder = new MediaRecorder(this.stream)
      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100)
      this.startTime = Date.now()
      this.state = 'recording'
      this.onStateChange?.(this.state)

      this.timerInterval = setInterval(() => {
        const elapsed = (Date.now() - this.startTime) / 1000
        this.onTimeUpdate?.(elapsed)
        if (elapsed >= this.maxDuration) {
          this.stopRecording()
        }
      }, 100)
    } catch (err) {
      console.error('Failed to start recording:', err)
      throw err
    }
  }

  async stopRecording(): Promise<Blob | null> {
    if (this.state !== 'recording' || !this.mediaRecorder) return null

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null)
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' })
        this.cleanup()
        resolve(blob)
      }

      this.mediaRecorder.stop()
      this.state = 'stopped'
      this.onStateChange?.(this.state)
    })
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(data)
    return data
  }

  getState(): RecordingState {
    return this.state
  }

  private cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyser = null
    this.mediaRecorder = null
  }

  reset() {
    this.cleanup()
    this.audioChunks = []
    this.state = 'idle'
    this.onStateChange?.(this.state)
    this.onTimeUpdate?.(0)
  }
}

export default SoundRecorder
export type { RecordingState }
