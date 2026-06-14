import { useRef, useState, useCallback, useEffect } from 'react'

export interface TrackAudioState {
  id: string
  volume: number
  muted: boolean
  solo: boolean
}

export interface AudioEngineState {
  isPlaying: boolean
  masterVolume: number
}

const generateNoiseBuffer = (
  audioContext: AudioContext,
  type: 'white' | 'pink' | 'brown' | 'ocean' | 'rain' | 'wind' | 'birds' | 'fire' | 'cafe' | 'fan' | 'forest' | 'traffic' | 'waves' = 'white',
  duration: number = 2
): AudioBuffer => {
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * duration
  const buffer = audioContext.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let lastOut = 0
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0

    switch (type) {
      case 'white':
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1
        }
        break
      case 'pink':
      case 'fan':
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.969 * b2 + white * 0.153852
          b3 = 0.8665 * b3 + white * 0.3104856
          b4 = 0.55 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.016898
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
          b6 = white * 0.115926
        }
        break
      case 'brown':
      case 'forest':
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1
          data[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = data[i]
          data[i] *= 3.5
        }
        break
      case 'rain':
        for (let i = 0; i < length; i++) {
          const drop = Math.random()
          const intensity = drop > 0.9995 ? Math.random() * 0.8 : 0
          data[i] = (Math.random() * 2 - 1) * 0.08 + intensity * (Math.random() * 2 - 1)
        }
        break
      case 'ocean':
      case 'waves':
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate
          const wave = Math.sin(t * 0.15 * Math.PI * 2) * 0.5 + 0.5
          const wave2 = Math.sin(t * 0.08 * Math.PI * 2 + 1) * 0.3 + 0.7
          data[i] = (Math.random() * 2 - 1) * 0.15 * wave * wave2
        }
        break
      case 'wind':
      case 'traffic':
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate
          const mod = Math.sin(t * 0.3) * 0.5 + 0.5
          data[i] = (Math.random() * 2 - 1) * 0.2 * (0.5 + mod * 0.5)
        }
        break
      case 'fire':
        for (let i = 0; i < length; i++) {
          const crackle = Math.random() > 0.997 ? (Math.random() - 0.5) * 2 : 0
          data[i] = (Math.random() * 2 - 1) * 0.05 + crackle * 0.5
        }
        break
      case 'birds': {
        let birdPhase = 0
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate
          birdPhase += 800 / sampleRate * Math.PI * 2
          const chirpActive = Math.sin(t * 0.5) > 0.3 && Math.random() > 0.995
          const chirp = chirpActive
            ? Math.sin(birdPhase * (1 + Math.sin(t * 10) * 0.3)) *
              Math.exp(-((t * 2) % 0.3)) *
              0.4
            : 0
          data[i] = chirp + (Math.random() - 0.5) * 0.01
        }
        break
      }
      case 'cafe':
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate
          const murmur = Math.sin(t * 120 * Math.PI * 2) * 0.02 +
                         Math.sin(t * 180 * Math.PI * 2 + 1.3) * 0.015 +
                         Math.sin(t * 95 * Math.PI * 2 + 2.1) * 0.018
          const clink = Math.random() > 0.9998 ? (Math.random() - 0.5) * 0.3 : 0
          data[i] = murmur + clink + (Math.random() - 0.5) * 0.04
        }
        break
      default:
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1
        }
    }
  }

  return buffer
}

const soundTypeMap: Record<string, any> = {
  rain: 'rain',
  waves: 'waves',
  fire: 'fire',
  birds: 'birds',
  traffic: 'traffic',
  cafe: 'cafe',
  fan: 'fan',
  forest: 'forest',
}

const useAudioEngine = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const trackNodesRef = useRef<
    Map<
      string,
      {
        source: AudioBufferSourceNode
        gain: GainNode
        analyser: AnalyserNode
      }
    >
  >(new Map())

  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    masterVolume: 80,
  })

  const [trackLevels, setTrackLevels] = useState<Record<string, number>>({})
  const animationFrameRef = useRef<number | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.gain.value = 0.8
      masterGainRef.current.connect(audioContextRef.current.destination)
    }
    return audioContextRef.current
  }, [])

  const updateLevels = useCallback(() => {
    const levels: Record<string, number> = {}
    trackNodesRef.current.forEach(({ analyser }, id) => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
      const avg =
        dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
      levels[id] = avg
    })
    setTrackLevels((prev) => ({ ...prev, ...levels }))
    animationFrameRef.current = requestAnimationFrame(updateLevels)
  }, [])

  const addTrack = useCallback(
    (trackId: string, soundId: string, initialVolume: number = 70) => {
      const ctx = initAudioContext()
      if (trackNodesRef.current.has(trackId)) return

      const soundType = soundTypeMap[soundId] || 'pink'
      const buffer = generateNoiseBuffer(ctx, soundType, 3)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      const gain = ctx.createGain()
      gain.gain.value = initialVolume / 100

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256

      source.connect(gain)
      gain.connect(analyser)
      analyser.connect(masterGainRef.current!)

      if (state.isPlaying) {
        source.start()
      }

      trackNodesRef.current.set(trackId, { source, gain, analyser })
    },
    [initAudioContext, state.isPlaying]
  )

  const removeTrack = useCallback((trackId: string) => {
    const nodes = trackNodesRef.current.get(trackId)
    if (nodes) {
      try {
        nodes.source.stop()
      } catch (_) {}
      nodes.source.disconnect()
      nodes.gain.disconnect()
      nodes.analyser.disconnect()
      trackNodesRef.current.delete(trackId)
      setTrackLevels((prev) => {
        const next = { ...prev }
        delete next[trackId]
        return next
      })
    }
  }, [])

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const nodes = trackNodesRef.current.get(trackId)
    if (nodes) {
      nodes.gain.gain.value = volume / 100
    }
  }, [])

  const setTrackMuted = useCallback((trackId: string, muted: boolean, actualVolume: number) => {
    const nodes = trackNodesRef.current.get(trackId)
    if (nodes) {
      nodes.gain.gain.value = muted ? 0 : actualVolume / 100
    }
  }, [])

  const setSoloMode = useCallback(
    (activeTrackId: string | null, tracks: TrackAudioState[]) => {
      trackNodesRef.current.forEach((nodes, id) => {
        const track = tracks.find((t) => t.id === id)
        if (!track) return

        if (activeTrackId) {
          if (id === activeTrackId) {
            nodes.gain.gain.value = track.muted ? 0 : track.volume / 100
          } else {
            nodes.gain.gain.value = 0
          }
        } else {
          nodes.gain.gain.value = track.muted ? 0 : track.volume / 100
        }
      })
    },
    []
  )

  const play = useCallback(() => {
    const ctx = initAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    trackNodesRef.current.forEach(({ source }) => {
      try {
        source.start()
      } catch (_) {}
    })

    setState((prev) => ({ ...prev, isPlaying: true }))

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateLevels)
    }
  }, [initAudioContext, updateLevels])

  const pause = useCallback(() => {
    trackNodesRef.current.forEach(({ source }) => {
      try {
        source.stop()
      } catch (_) {}

      const ctx = initAudioContext()
      const buffer = source.buffer
      const soundId = Array.from(trackNodesRef.current.entries()).find(
        ([, n]) => n.source === source
      )?.[0]
      const soundType = Object.entries(soundTypeMap).find(([k]) => {
        const trackNodes = trackNodesRef.current
        const entry = Array.from(trackNodes.entries()).find(([, n]) => n.source === source)
        return entry && entry[0]
      })?.[0] || 'pink'

      if (buffer && ctx) {
        const newSource = ctx.createBufferSource()
        newSource.buffer = buffer
        newSource.loop = true
        const entry = Array.from(trackNodesRef.current.entries()).find(
          ([, n]) => n.source === source
        )
        if (entry) {
          const id = entry[0]
          const nodes = entry[1]
          newSource.connect(nodes.gain)
          trackNodesRef.current.set(id, { ...nodes, source: newSource })
        }
      }
    })

    setState((prev) => ({ ...prev, isPlaying: false }))

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [initAudioContext])

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [state.isPlaying, play, pause])

  const setMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume / 100
    }
    setState((prev) => ({ ...prev, masterVolume: volume }))
  }, [])

  const clearAllTracks = useCallback(() => {
    trackNodesRef.current.forEach((_, id) => removeTrack(id))
  }, [removeTrack])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      trackNodesRef.current.forEach(({ source }) => {
        try {
          source.stop()
        } catch (_) {}
      })
      audioContextRef.current?.close()
    }
  }, [])

  return {
    state,
    trackLevels,
    addTrack,
    removeTrack,
    setTrackVolume,
    setTrackMuted,
    setSoloMode,
    play,
    pause,
    togglePlay,
    setMasterVolume,
    clearAllTracks,
  }
}

export default useAudioEngine
