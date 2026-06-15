import { useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { Track, Reverb } from '../store/audioStore'

export interface AudioEngineAPI {
  loadTrack: (trackId: string, url: string) => Promise<void>
  start: () => Promise<void>
  stop: () => void
  getFrequencyData: () => { low: number; mid: number; high: number }
  updateTrackParams: (trackId: string, params: Partial<{
    volume: number
    pan: number
    lowPass: number
    highPass: number
    muted: boolean
  }>) => void
  updateReverb: (reverb: Reverb) => void
  getCurrentTime: () => number
  dispose: () => void
}

interface TrackNodes {
  player: Tone.Player
  gain: Tone.Gain
  pan: Tone.Panner
  lowPass: Tone.Filter
  highPass: Tone.Filter
}

export function useAudioEngine() {
  const analyserRef = useRef<Tone.Analyser | null>(null)
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
  const reverbWetRef = useRef<Tone.CrossFade | null>(null)
  const tracksRef = useRef<Map<string, TrackNodes>>(new Map())
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(3))
  const startedRef = useRef(false)

  useEffect(() => {
    analyserRef.current = new Tone.Analyser('fft', 256)
    masterGainRef.current = new Tone.Gain(1).toDestination()
    reverbRef.current = new Tone.Reverb({ decay: 0.8, wet: 0 })
    reverbWetRef.current = new Tone.CrossFade(0)
    
    analyserRef.current.connect(masterGainRef.current)
    reverbRef.current.connect(reverbWetRef.current.b)
    masterGainRef.current.connect(reverbWetRef.current.a)
    reverbWetRef.current.connect(Tone.Destination)

    return () => {
      tracksRef.current.forEach((nodes) => {
        nodes.player.dispose()
        nodes.gain.dispose()
        nodes.pan.dispose()
        nodes.lowPass.dispose()
        nodes.highPass.dispose()
      })
      tracksRef.current.clear()
      analyserRef.current?.dispose()
      masterGainRef.current?.dispose()
      reverbRef.current?.dispose()
      reverbWetRef.current?.dispose()
      startedRef.current = false
    }
  }, [])

  const getFrequencyData = useCallback(() => {
    if (!analyserRef.current) return { low: 0, mid: 0, high: 0 }
    const values = analyserRef.current.getValue() as Float32Array
    if (!values || values.length === 0) return { low: 0, mid: 0, high: 0 }
    
    const len = values.length
    let lowSum = 0, midSum = 0, highSum = 0
    const lowEnd = Math.floor(len * 0.15)
    const midEnd = Math.floor(len * 0.5)
    
    for (let i = 0; i < lowEnd; i++) lowSum += (values[i] + 100) / 100
    for (let i = lowEnd; i < midEnd; i++) midSum += (values[i] + 100) / 100
    for (let i = midEnd; i < len; i++) highSum += (values[i] + 100) / 100
    
    return {
      low: Math.min(1, Math.max(0, lowSum / lowEnd)),
      mid: Math.min(1, Math.max(0, midSum / (midEnd - lowEnd))),
      high: Math.min(1, Math.max(0, highSum / (len - midEnd))),
    }
  }, [])

  const updateTrackParams = useCallback((trackId: string, params: Partial<{
    volume: number
    pan: number
    lowPass: number
    highPass: number
    muted: boolean
  }>) => {
    const nodes = tracksRef.current.get(trackId)
    if (!nodes) return
    if (params.volume !== undefined) {
      nodes.gain.gain.value = params.muted ? 0 : params.volume / 100
    }
    if (params.pan !== undefined) {
      nodes.pan.pan.value = params.pan / 100
    }
    if (params.lowPass !== undefined) {
      nodes.lowPass.frequency.value = params.lowPass
    }
    if (params.highPass !== undefined) {
      nodes.highPass.frequency.value = params.highPass
    }
    if (params.muted !== undefined) {
      const trackNodes = tracksRef.current.get(trackId)
      if (trackNodes) {
        // volume will be read from track state in practice
      }
    }
  }, [])

  const updateReverb = useCallback((reverb: Reverb) => {
    if (reverbRef.current) {
      const roomDecay = reverb.roomSize === 'small' ? 0.3 : reverb.roomSize === 'medium' ? 0.8 : 1.5
      reverbRef.current.decay = roomDecay
    }
    if (reverbWetRef.current) {
      reverbWetRef.current.fade.value = reverb.enabled ? reverb.wet : 0
    }
  }, [])

  const loadTrack = useCallback(async (trackId: string, url: string) => {
    await Tone.start()
    let existing = tracksRef.current.get(trackId)
    if (existing) {
      existing.player.stop()
      existing.player.dispose()
    }
    const player = new Tone.Player({ url, loop: true })
    const gain = new Tone.Gain(0.8)
    const pan = new Tone.Panner(0)
    const lowPass = new Tone.Filter({ frequency: 20000, type: 'lowpass' })
    const highPass = new Tone.Filter({ frequency: 20, type: 'highpass' })
    
    player.chain(highPass, lowPass, gain, pan)
    if (masterGainRef.current) {
      pan.connect(masterGainRef.current)
    }
    tracksRef.current.set(trackId, { player, gain, pan, lowPass, highPass })
  }, [])

  const start = useCallback(async () => {
    await Tone.start()
    startedRef.current = true
    Tone.Transport.start()
    tracksRef.current.forEach((nodes) => {
      if (!nodes.player.state || nodes.player.state !== 'started') {
        nodes.player.start()
      }
    })
  }, [])

  const stop = useCallback(() => {
    tracksRef.current.forEach((nodes) => {
      nodes.player.stop()
    })
    Tone.Transport.stop()
  }, [])

  const getCurrentTime = useCallback(() => Tone.Transport.seconds, [])

  const dispose = useCallback(() => {
    tracksRef.current.forEach((nodes) => {
      nodes.player.dispose()
      nodes.gain.dispose()
      nodes.pan.dispose()
      nodes.lowPass.dispose()
      nodes.highPass.dispose()
    })
    tracksRef.current.clear()
  }, [])

  return {
    loadTrack,
    start,
    stop,
    getFrequencyData,
    updateTrackParams,
    updateReverb,
    getCurrentTime,
    dispose,
  }
}
