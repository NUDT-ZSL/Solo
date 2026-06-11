import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'

const FADE_DURATION = 0.3
const FADE_CURVE = 'linear' as const

type FadeType = 'in' | 'out'

function applyFade(
  gainNode: GainNode,
  ctx: AudioContext,
  type: FadeType,
  targetVolume: number,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const currentTime = ctx.currentTime
    gainNode.gain.cancelScheduledValues(currentTime)
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime)

    if (type === 'in') {
      if (FADE_CURVE === 'linear') {
        gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration)
      } else {
        gainNode.gain.exponentialRampToValueAtTime(Math.max(targetVolume, 0.0001), currentTime + duration)
      }
    } else {
      if (FADE_CURVE === 'linear') {
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration)
      } else {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + duration)
      }
    }

    setTimeout(resolve, duration * 1000 + 50)
  })
}

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const rafIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  const store = usePlayerStore

  const initAudio = useCallback(() => {
    if (isInitializedRef.current) return
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.8
    const gainNode = ctx.createGain()
    gainNode.gain.value = 0
    analyser.connect(gainNode)
    gainNode.connect(ctx.destination)
    audioContextRef.current = ctx
    analyserRef.current = analyser
    gainNodeRef.current = gainNode
    isInitializedRef.current = true
  }, [])

  const stopOscillators = useCallback(() => {
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (_e) {
        /* already stopped */
      }
    })
    oscillatorsRef.current = []
  }, [])

  const createOscillators = useCallback(
    (frequencies: number[], oscTypes: OscillatorType[]) => {
      stopOscillators()
      const ctx = audioContextRef.current
      const analyser = analyserRef.current
      if (!ctx || !analyser) return

      const oscs: OscillatorNode[] = []
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = oscTypes[i] || 'sine'
        osc.frequency.value = freq
        const oscGain = ctx.createGain()
        oscGain.gain.value = 0.15 / frequencies.length
        osc.connect(oscGain)
        oscGain.connect(analyser)
        osc.start()
        oscs.push(osc)
      })
      oscillatorsRef.current = oscs
    },
    [stopOscillators]
  )

  const startProgressLoop = useCallback(() => {
    const tick = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }
      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const state = store.getState()
      if (state.isPlaying && !state.isFading) {
        const newTime = state.currentTime + delta
        if (newTime >= state.playlist[state.currentSongIndex].duration) {
          store.getState().nextSong()
          const newState = store.getState()
          createOscillators(
            newState.playlist[newState.currentSongIndex].frequencies,
            newState.playlist[newState.currentSongIndex].oscTypes
          )
          fadeIn()
        } else {
          store.getState().setCurrentTime(newTime)
        }
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }
    lastTimeRef.current = 0
    rafIdRef.current = requestAnimationFrame(tick)
  }, [store, createOscillators])

  const fadeIn = useCallback(async () => {
    const gainNode = gainNodeRef.current
    const ctx = audioContextRef.current
    if (!gainNode || !ctx) return
    const vol = store.getState().volume
    store.getState().setIsFading(true)
    await applyFade(gainNode, ctx, 'in', vol, FADE_DURATION)
    store.getState().setIsFading(false)
  }, [store])

  const fadeOut = useCallback(async (): Promise<void> => {
    const gainNode = gainNodeRef.current
    const ctx = audioContextRef.current
    if (!gainNode || !ctx) return Promise.resolve()
    store.getState().setIsFading(true)
    await applyFade(gainNode, ctx, 'out', 0, FADE_DURATION)
    store.getState().setIsFading(false)
  }, [store])

  const play = useCallback(() => {
    initAudio()
    const ctx = audioContextRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const state = store.getState()
    const song = state.playlist[state.currentSongIndex]
    if (oscillatorsRef.current.length === 0) {
      createOscillators(song.frequencies, song.oscTypes)
    }
    fadeIn()
    store.getState().setIsPlaying(true)
  }, [initAudio, createOscillators, fadeIn, store])

  const pause = useCallback(() => {
    fadeOut().then(() => {
      store.getState().setIsPlaying(false)
    })
  }, [fadeOut, store])

  const togglePlay = useCallback(() => {
    const state = store.getState()
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [play, pause])

  const switchSong = useCallback(
    (index: number) => {
      const state = store.getState()
      const wasPlaying = state.isPlaying
      const doSwitch = () => {
        stopOscillators()
        store.getState().setCurrentSongIndex(index)
        store.getState().setCurrentTime(0)
        const newState = store.getState()
        createOscillators(
          newState.playlist[newState.currentSongIndex].frequencies,
          newState.playlist[newState.currentSongIndex].oscTypes
        )
        if (wasPlaying) {
          fadeIn()
          store.getState().setIsPlaying(true)
        }
      }
      if (wasPlaying) {
        fadeOut().then(doSwitch)
      } else {
        doSwitch()
      }
    },
    [stopOscillators, createOscillators, fadeIn, fadeOut, store]
  )

  const next = useCallback(() => {
    const state = store.getState()
    const nextIndex = (state.currentSongIndex + 1) % state.playlist.length
    switchSong(nextIndex)
  }, [switchSong, store])

  const prev = useCallback(() => {
    const state = store.getState()
    if (state.currentTime > 3) {
      store.getState().setCurrentTime(0)
      return
    }
    const prevIndex =
      (state.currentSongIndex - 1 + state.playlist.length) %
      state.playlist.length
    switchSong(prevIndex)
  }, [switchSong, store])

  const seek = useCallback(
    (time: number) => {
      store.getState().setCurrentTime(time)
    },
    [store]
  )

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol))
      store.getState().setVolume(clamped)
      const gainNode = gainNodeRef.current
      const ctx = audioContextRef.current
      if (gainNode && ctx && store.getState().isPlaying) {
        gainNode.gain.cancelScheduledValues(ctx.currentTime)
        gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime)
        gainNode.gain.linearRampToValueAtTime(clamped, ctx.currentTime + 0.05)
      }
    },
    [store]
  )

  const getFrequencyData = useCallback((): Uint8Array => {
    const analyser = analyserRef.current
    if (!analyser) return new Uint8Array(64)
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    return data
  }, [])

  useEffect(() => {
    startProgressLoop()
    return () => {
      cancelAnimationFrame(rafIdRef.current)
      stopOscillators()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [startProgressLoop, stopOscillators])

  return {
    play,
    pause,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    switchSong,
    getFrequencyData,
  }
}
