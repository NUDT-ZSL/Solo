import { useRef, useCallback } from 'react'

interface AudioParams {
  frequency: number
  waveform: string
  duration: number
  attack: number
  decay: number
  sustain: number
  release: number
}

let audioCtx: AudioContext | null = null
const activeNodes: { osc: OscillatorNode; gain: GainNode }[] = []

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function useAudio() {
  const nodesRef = useRef(activeNodes)

  const playEmotionSound = useCallback((params: AudioParams) => {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = params.waveform as OscillatorType
    osc.frequency.setValueAtTime(params.frequency, now)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(1, now + params.attack)
    gain.gain.linearRampToValueAtTime(params.sustain, now + params.attack + params.decay)
    gain.gain.setValueAtTime(params.sustain, now + params.attack + params.decay)
    gain.gain.linearRampToValueAtTime(
      0,
      now + params.attack + params.decay + params.duration + params.release
    )

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + params.attack + params.decay + params.duration + params.release)

    const entry = { osc, gain }
    nodesRef.current.push(entry)

    osc.onended = () => {
      const idx = nodesRef.current.indexOf(entry)
      if (idx > -1) nodesRef.current.splice(idx, 1)
      osc.disconnect()
      gain.disconnect()
    }
  }, [])

  const stopAll = useCallback(() => {
    for (const { osc, gain } of nodesRef.current) {
      try {
        osc.stop()
        osc.disconnect()
        gain.disconnect()
      } catch {
        // already stopped
      }
    }
    nodesRef.current.length = 0
  }, [])

  return { playEmotionSound, stopAll }
}
