import { AudioState } from '../types'

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private oceanNodes: { source: AudioBufferSourceNode; gain: GainNode }[] = []
  private rainNodes: { source: AudioBufferSourceNode; gain: GainNode }[] = []
  private breathOscillator: OscillatorNode | null = null
  private breathGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private animationFrameId: number | null = null
  private breathInterval: number | null = null
  private rainInterval: number | null = null
  private state: AudioState = {
    isPlaying: false,
    volume: 0.5,
    oceanVolume: 0.3,
    rainVolume: 0.2,
    breathVolume: 0.4
  }
  private onSpectrumUpdate: ((data: Uint8Array) => void) | null = null

  constructor() {}

  private initContext(): void {
    if (this.audioContext) return
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.masterGain = this.audioContext.createGain()
    this.masterGain.connect(this.audioContext.destination)
    
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.masterGain.connect(this.analyser)
  }

  private createNoiseBuffer(duration: number, type: 'white' | 'pink' = 'white'): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')
    
    const bufferSize = this.audioContext.sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
    } else {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    }
    
    return buffer
  }

  private createReverb(duration: number): ConvolverNode {
    if (!this.audioContext) throw new Error('AudioContext not initialized')
    
    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const impulse = this.audioContext.createBuffer(2, length, sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }
    
    const convolver = this.audioContext.createConvolver()
    convolver.buffer = impulse
    
    return convolver
  }

  async start(sceneType: string): Promise<void> {
    this.initContext()
    if (!this.audioContext || !this.masterGain) return
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    
    this.state.isPlaying = true
    this.masterGain.gain.setValueAtTime(this.state.volume, this.audioContext.currentTime)

    if (sceneType.includes('海') || sceneType.includes('ocean') || sceneType.includes('浪') || sceneType.includes('放松')) {
      this.startOceanSound()
    }
    
    if (sceneType.includes('雨') || sceneType.includes('rain') || sceneType.includes('森林') || sceneType.includes('放松')) {
      this.startRainSound()
    }
    
    this.startBreathGuide()
    this.startSpectrumAnalysis()
  }

  private startOceanSound(): void {
    if (!this.audioContext || !this.masterGain) return

    for (let i = 0; i < 2; i++) {
      const noiseBuffer = this.createNoiseBuffer(3, 'pink')
      const source = this.audioContext.createBufferSource()
      source.buffer = noiseBuffer
      source.loop = true
      
      const filter = this.audioContext.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(200, this.audioContext.currentTime)
      filter.Q.setValueAtTime(1, this.audioContext.currentTime)
      
      const reverb = this.createReverb(3)
      
      const gain = this.audioContext.createGain()
      gain.gain.setValueAtTime(0, this.audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(
        this.state.oceanVolume * this.state.volume,
        this.audioContext.currentTime + 2
      )
      
      source.connect(filter)
      filter.connect(reverb)
      reverb.connect(gain)
      gain.connect(this.masterGain)
      
      source.start()
      this.oceanNodes.push({ source, gain })
    }
  }

  private startRainSound(): void {
    if (!this.audioContext || !this.masterGain) return

    this.rainInterval = window.setInterval(() => {
      if (!this.audioContext || !this.masterGain || !this.state.isPlaying) return
      
      const noiseBuffer = this.createNoiseBuffer(0.1 + Math.random() * 0.3, 'white')
      const source = this.audioContext.createBufferSource()
      source.buffer = noiseBuffer
      
      const gain = this.audioContext.createGain()
      const volume = (0.1 + Math.random() * 0.4) * this.state.rainVolume * this.state.volume
      
      gain.gain.setValueAtTime(0, this.audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + noiseBuffer.duration)
      
      const filter = this.audioContext.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.setValueAtTime(1000 + Math.random() * 3000, this.audioContext.currentTime)
      
      source.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain)
      
      source.start()
      source.onended = () => {
        const idx = this.rainNodes.findIndex(n => n.source === source)
        if (idx !== -1) this.rainNodes.splice(idx, 1)
      }
      
      this.rainNodes.push({ source, gain })
    }, 50 + Math.random() * 100)
  }

  private startBreathGuide(): void {
    if (!this.audioContext || !this.masterGain) return

    this.breathOscillator = this.audioContext.createOscillator()
    this.breathOscillator.type = 'sine'
    this.breathOscillator.frequency.setValueAtTime(440, this.audioContext.currentTime)
    
    this.breathGain = this.audioContext.createGain()
    this.breathGain.gain.setValueAtTime(0, this.audioContext.currentTime)
    
    this.breathOscillator.connect(this.breathGain)
    this.breathGain.connect(this.masterGain)
    this.breathOscillator.start()

    const cycleBreath = () => {
      if (!this.breathGain || !this.audioContext || !this.state.isPlaying) return
      
      const now = this.audioContext.currentTime
      const breathVolume = this.state.breathVolume * this.state.volume
      
      this.breathGain.gain.cancelScheduledValues(now)
      this.breathGain.gain.setValueAtTime(this.breathGain.gain.value, now)
      this.breathGain.gain.linearRampToValueAtTime(breathVolume, now + 2)
      this.breathGain.gain.linearRampToValueAtTime(0, now + 4)
    }
    
    cycleBreath()
    this.breathInterval = window.setInterval(cycleBreath, 4000)
  }

  private startSpectrumAnalysis(): void {
    if (!this.analyser) return
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    
    const update = () => {
      if (!this.analyser || !this.state.isPlaying) return
      
      this.analyser.getByteFrequencyData(dataArray)
      
      if (this.onSpectrumUpdate) {
        this.onSpectrumUpdate(new Uint8Array(dataArray))
      }
      
      this.animationFrameId = requestAnimationFrame(update)
    }
    
    update()
  }

  setOnSpectrumUpdate(callback: (data: Uint8Array) => void): void {
    this.onSpectrumUpdate = callback
  }

  stop(): void {
    this.state.isPlaying = false
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    if (this.breathInterval) {
      clearInterval(this.breathInterval)
      this.breathInterval = null
    }
    
    if (this.rainInterval) {
      clearInterval(this.rainInterval)
      this.rainInterval = null
    }
    
    this.oceanNodes.forEach(({ source, gain }) => {
      if (this.audioContext) {
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5)
      }
      setTimeout(() => {
        try { source.stop() } catch (e) {}
      }, 500)
    })
    this.oceanNodes = []
    
    this.rainNodes.forEach(({ source }) => {
      try { source.stop() } catch (e) {}
    })
    this.rainNodes = []
    
    if (this.breathOscillator) {
      try { this.breathOscillator.stop() } catch (e) {}
      this.breathOscillator = null
      this.breathGain = null
    }
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume))
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(this.state.volume, this.audioContext.currentTime + 0.1)
    }
  }

  getState(): AudioState {
    return { ...this.state }
  }

  destroy(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
