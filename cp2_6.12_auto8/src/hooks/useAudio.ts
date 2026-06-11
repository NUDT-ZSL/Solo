import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'

const FADE_DURATION = 0.3

function applyFade(
  gainNode: GainNode,
  ctx: AudioContext,
  targetVolume: number,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const now = ctx.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(Math.max(targetVolume, 0.0001), now + duration)
    setTimeout(resolve, duration * 1000 + 10)
  })
}

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const oscillatorGainRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const rafIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  const store = usePlayerStore

  const initAudio = useCallback(() => {
    if (isInitializedRef.current) return

    const ctx = new AudioContext()

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.75

    const oscillatorGain = ctx.createGain()
    oscillatorGain.gain.value = 0.15

    oscillatorGain.connect(analyser)
    analyser.connect(masterGain)
    masterGain.connect(ctx.destination)

    audioContextRef.current = ctx
    masterGainRef.current = masterGain
    analyserRef.current = analyser
    oscillatorGainRef.current = oscillatorGain
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
      const oscGain = oscillatorGainRef.current
      if (!ctx || !oscGain) return

      const oscs: OscillatorNode[] = []
      const count = frequencies.length

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = oscTypes[i] || 'sine'
        osc.frequency.value = freq

        const individualGain = ctx.createGain()
        individualGain.gain.value = 1 / count

        osc.connect(individualGain)
        individualGain.connect(oscGain)
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
          stopOscillators()
          createOscillators(
            newState.playlist[newState.currentSongIndex].frequencies,
            newState.playlist[newState.currentSongIndex].oscTypes
          )
          if (masterGainRef.current && audioContextRef.current) {
            applyFade(masterGainRef.current, audioContextRef.current, newState.volume, FADE_DURATION)
          }
        } else {
          store.getState().setCurrentTime(newTime)
        }
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }
    lastTimeRef.current = 0
    rafIdRef.current = requestAnimationFrame(tick)
  }, [store, createOscillators, stopOscillators])

  const fadeInMaster = useCallback(async () => {
    const masterGain = masterGainRef.current
    const ctx = audioContextRef.current
    if (!masterGain || !ctx) return
    const vol = store.getState().volume
    store.getState().setIsFading(true)
    await applyFade(masterGain, ctx, vol, FADE_DURATION)
    store.getState().setIsFading(false)
  }, [store])

  const fadeOutMaster = useCallback(async (): Promise<void> => {
    const masterGain = masterGainRef.current
    const ctx = audioContextRef.current
    if (!masterGain || !ctx) return Promise.resolve()
    store.getState().setIsFading(true)
    await applyFade(masterGain, ctx, 0.0001, FADE_DURATION)
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
    fadeInMaster()
    store.getState().setIsPlaying(true)
  }, [initAudio, createOscillators, fadeInMaster, store])

  const pause = useCallback(() => {
    fadeOutMaster().then(() => {
      store.getState().setIsPlaying(false)
    })
  }, [fadeOutMaster, store])

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

      const performSwitch = () => {
        stopOscillators()
        store.getState().setCurrentSongIndex(index)
        store.getState().setCurrentTime(0)
        const newSong = store.getState().playlist[index]
        createOscillators(newSong.frequencies, newSong.oscTypes)
        if (wasPlaying) {
          fadeInMaster()
          store.getState().setIsPlaying(true)
        }
      }

      if (wasPlaying) {
        fadeOutMaster().then(performSwitch)
      } else {
        performSwitch()
      }
    },
    [stopOscillators, createOscillators, fadeOutMaster, fadeInMaster, store]
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
      (state.currentSongIndex - 1 + state.playlist.length) % state.playlist.length
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
      const masterGain = masterGainRef.current
      const ctx = audioContextRef.current
      if (masterGain && ctx && store.getState().isPlaying) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime)
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime)
        masterGain.gain.linearRampToValueAtTime(clamped, ctx.currentTime + 0.08)
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
