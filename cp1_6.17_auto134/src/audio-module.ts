export interface EnergyData {
  low: number
  mid: number
  high: number
  raw: Float32Array
}

export interface AudioModule {
  decodeAndPlay(file: File): Promise<void>
  play(): void
  pause(): void
  stop(): void
  setVolume(v: number): void
  getEnergy(): EnergyData
  getCurrentTime(): number
  getDuration(): number
  isPlaying(): boolean
  destroy(): void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
}

const FFT_SIZE = 2048
const LOW_MAX_BIN = 250
const MID_MAX_BIN = 4000
const HIGH_MAX_BIN = 20000

function freqToBin(freq: number, sampleRate: number): number {
  return Math.round((freq * FFT_SIZE) / sampleRate)
}

export function createAudioModule(): AudioModule {
  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let gainNode: GainNode | null = null
  let source: AudioBufferSourceNode | null = null
  let buffer: AudioBuffer | null = null
  let _playing = false
  let _startTime = 0
  let _pauseOffset = 0
  let rafId = 0

  const energyData: EnergyData = { low: 0, mid: 0, high: 0, raw: new Float32Array(0) }

  function ensureContext() {
    if (!audioCtx) {
      audioCtx = new AudioContext()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      gainNode = audioCtx.createGain()
      analyser.connect(gainNode)
      gainNode.connect(audioCtx.destination)
    }
  }

  function stopSource() {
    if (source) {
      try { source.stop() } catch { /* noop */ }
      source.disconnect()
      source = null
    }
  }

  function startPlayback(offset: number) {
    if (!buffer || !audioCtx || !analyser) return
    stopSource()
    source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.connect(analyser)
    source.onended = () => {
      if (_playing) {
        _playing = false
        _pauseOffset = 0
        mod.onEnded?.()
      }
    }
    source.start(0, offset)
    _startTime = audioCtx.currentTime - offset
    _playing = true
  }

  function tickTime() {
    if (!_playing || !audioCtx) return
    const ct = audioCtx.currentTime - _startTime
    const dur = buffer?.duration ?? 0
    mod.onTimeUpdate?.(Math.min(ct, dur), dur)
    rafId = requestAnimationFrame(tickTime)
  }

  const mod: AudioModule = {
    async decodeAndPlay(file: File) {
      ensureContext()
      if (audioCtx!.state === 'suspended') await audioCtx!.resume()
      stopSource()
      _playing = false
      _pauseOffset = 0

      const arrayBuf = await file.arrayBuffer()
      buffer = await audioCtx!.decodeAudioData(arrayBuf)

      energyData.raw = new Float32Array(analyser!.frequencyBinCount)
      startPlayback(0)
      cancelAnimationFrame(rafId)
      tickTime()
    },

    play() {
      if (!buffer || _playing) return
      ensureContext()
      if (audioCtx!.state === 'suspended') audioCtx!.resume()
      startPlayback(_pauseOffset)
      tickTime()
    },

    pause() {
      if (!_playing) return
      _pauseOffset = audioCtx!.currentTime - _startTime
      stopSource()
      _playing = false
      cancelAnimationFrame(rafId)
    },

    stop() {
      stopSource()
      _playing = false
      _pauseOffset = 0
      cancelAnimationFrame(rafId)
      mod.onTimeUpdate?.(0, buffer?.duration ?? 0)
    },

    setVolume(v: number) {
      ensureContext()
      gainNode!.gain.value = v / 100
    },

    getEnergy() {
      if (!analyser) return energyData
      const data = energyData.raw
      analyser.getFloatFrequencyData(data)

      const sr = audioCtx!.sampleRate
      const lowBin = freqToBin(LOW_MAX_BIN, sr)
      const midBin = freqToBin(MID_MAX_BIN, sr)
      const highBin = freqToBin(HIGH_MAX_BIN, sr)

      let lowSum = 0
      for (let i = 0; i < lowBin; i++) lowSum += data[i]
      energyData.low = lowBin > 0 ? (lowSum / lowBin + 140) / 140 : 0

      let midSum = 0
      for (let i = lowBin; i < midBin; i++) midSum += data[i]
      const midCount = midBin - lowBin
      energyData.mid = midCount > 0 ? (midSum / midCount + 140) / 140 : 0

      let highSum = 0
      for (let i = midBin; i < highBin && i < data.length; i++) highSum += data[i]
      const highCount = Math.min(highBin, data.length) - midBin
      energyData.high = highCount > 0 ? (highSum / highCount + 140) / 140 : 0

      energyData.low = Math.max(0, Math.min(1, energyData.low))
      energyData.mid = Math.max(0, Math.min(1, energyData.mid))
      energyData.high = Math.max(0, Math.min(1, energyData.high))

      return energyData
    },

    getCurrentTime() {
      if (!_playing || !audioCtx) return _pauseOffset
      return audioCtx.currentTime - _startTime
    },

    getDuration() {
      return buffer?.duration ?? 0
    },

    isPlaying() {
      return _playing
    },

    destroy() {
      stopSource()
      cancelAnimationFrame(rafId)
      if (audioCtx) {
        audioCtx.close()
        audioCtx = null
        analyser = null
        gainNode = null
      }
    },
  }

  return mod
}
