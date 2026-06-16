import React, { useRef, useEffect, useCallback, useState } from 'react'
import {
  INSTRUMENTS,
  SoundWave,
  FrequencyBin,
  easeInOutCubic,
  frequencyToColor,
  calculateWaveInterference,
  calculateSpectrum,
  calculateHarmonyScore,
  rgba
} from './utils'

export interface PlacedInstrument {
  id: string
  instrumentIndex: number
  x: number
  y: number
  originalX: number
  originalY: number
  isPlaying: boolean
  playStartTime: number
  score: number
  showScore: boolean
}

interface SimulationProps {
  placedInstruments: PlacedInstrument[]
  setPlacedInstruments: React.Dispatch<React.SetStateAction<PlacedInstrument[]>>
  volume: number
  reverb: number
  onSpectrumUpdate: (spectrum: FrequencyBin[]) => void
  onScoreUpdate: (id: string, score: number) => void
  presetPlaying: boolean
}

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 640
const INSTRUMENT_SIZE = 48
const INSTRUMENT_RADIUS = INSTRUMENT_SIZE / 2
const WAVE_MAX_RADIUS = 200
const WAVE_DURATION = 1500

const Simulation: React.FC<SimulationProps> = ({
  placedInstruments,
  setPlacedInstruments,
  volume,
  reverb,
  onSpectrumUpdate,
  onScoreUpdate,
  presetPlaying
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wavesRef = useRef<SoundWave[]>([])
  const animationFrameRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<Map<string, { oscillators: OscillatorNode[]; gains: GainNode[]; mainGain: GainNode; reverbNode?: ConvolverNode }>>(new Map())
  const targetVolumeRef = useRef(volume)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    targetVolumeRef.current = volume
  }, [volume])

  const createImpulseResponse = useCallback((ctx: AudioContext, duration: number, decay: number): AudioBuffer => {
    const rate = ctx.sampleRate
    const length = rate * duration
    const impulse = ctx.createBuffer(2, length, rate)
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return impulse
  }, [])

  const ensureAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const playInstrumentSound = useCallback((instrumentId: string, instrumentIndex: number, _startDelay: number = 0) => {
    const ctx = ensureAudioContext()
    const instrument = INSTRUMENTS[instrumentIndex]

    stopInstrumentSound(instrumentId)

    const oscillators: OscillatorNode[] = []
    const gains: GainNode[] = []

    const mainGain = ctx.createGain()
    const volFactor = targetVolumeRef.current / 100
    mainGain.gain.setValueAtTime(0, ctx.currentTime)
    mainGain.gain.linearRampToValueAtTime(volFactor * 0.5, ctx.currentTime + 0.05)
    mainGain.gain.exponentialRampToValueAtTime(volFactor * 0.001, ctx.currentTime + 3)

    const reverbAmount = reverb / 100
    let reverbNode: ConvolverNode | undefined
    let reverbGain: GainNode | undefined
    let dryGain: GainNode | undefined

    if (reverbAmount > 0) {
      reverbNode = ctx.createConvolver()
      reverbNode.buffer = createImpulseResponse(ctx, 2, 3)
      reverbGain = ctx.createGain()
      reverbGain.gain.value = reverbAmount * 0.5
      dryGain = ctx.createGain()
      dryGain.gain.value = 1 - reverbAmount * 0.5

      mainGain.connect(dryGain)
      dryGain.connect(ctx.destination)
      mainGain.connect(reverbNode)
      reverbNode.connect(reverbGain)
      reverbGain.connect(ctx.destination)
    } else {
      mainGain.connect(ctx.destination)
    }

    const frequencies = [instrument.frequency, ...instrument.harmonics.map(h => instrument.frequency * h)]
    const amplitudes = [1, ...instrument.harmonicAmplitudes]

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = i === 0 ? 'sine' : i % 2 === 0 ? 'triangle' : 'sine'
      osc.frequency.value = freq
      gain.gain.value = (amplitudes[i] || 0.3) / frequencies.length
      osc.connect(gain)
      gain.connect(mainGain)
      oscillators.push(osc)
      gains.push(gain)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 3)
    })

    audioNodesRef.current.set(instrumentId, { oscillators, gains, mainGain, reverbNode })

    setTimeout(() => {
      stopInstrumentSound(instrumentId)
    }, 3200)
  }, [ensureAudioContext, reverb, createImpulseResponse])

  const stopInstrumentSound = useCallback((instrumentId: string) => {
    const nodes = audioNodesRef.current.get(instrumentId)
    if (nodes) {
      const ctx = audioContextRef.current
      if (ctx) {
        nodes.mainGain.gain.cancelScheduledValues(ctx.currentTime)
        nodes.mainGain.gain.setValueAtTime(nodes.mainGain.gain.value, ctx.currentTime)
        nodes.mainGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      }
      setTimeout(() => {
        nodes.oscillators.forEach(osc => {
          try { osc.disconnect() } catch { /* ignore */ }
        })
        nodes.gains.forEach(g => {
          try { g.disconnect() } catch { /* ignore */ }
        })
        try { nodes.mainGain.disconnect() } catch { /* ignore */ }
        if (nodes.reverbNode) {
          try { nodes.reverbNode.disconnect() } catch { /* ignore */ }
        }
        audioNodesRef.current.delete(instrumentId)
      }, 250)
    }
  }, [])

  useEffect(() => {
    audioNodesRef.current.forEach((nodes, id) => {
      const ctx = audioContextRef.current
      if (ctx && nodes.mainGain) {
        const currentGain = nodes.mainGain.gain.value
        const targetGain = targetVolumeRef.current / 100 * 0.5
        nodes.mainGain.gain.cancelScheduledValues(ctx.currentTime)
        nodes.mainGain.gain.setValueAtTime(currentGain, ctx.currentTime)
        nodes.mainGain.gain.linearRampToValueAtTime(Math.max(0.001, targetGain), ctx.currentTime + 0.2)
      }
    })
  }, [volume])

  const spawnWave = useCallback((instrumentId: string, instrumentIndex: number, x: number, y: number, delay: number = 0) => {
    const instrument = INSTRUMENTS[instrumentIndex]
    const waveId = `${instrumentId}-${Date.now()}-${Math.random()}`
    const now = performance.now()

    setTimeout(() => {
      wavesRef.current.push({
        id: waveId,
        instrumentId,
        x,
        y,
        startTime: performance.now(),
        radius: 0,
        maxRadius: WAVE_MAX_RADIUS,
        duration: WAVE_DURATION,
        frequency: instrument.frequency,
        instrumentIndex
      })
    }, delay)
  }, [])

  const handleInstrumentClick = useCallback((id: string, instrumentIndex: number, x: number, y: number) => {
    playInstrumentSound(id, instrumentIndex, 0)
    spawnWave(id, instrumentIndex, x, y)

    setPlacedInstruments(prev => prev.map(inst =>
      inst.id === id
        ? { ...inst, isPlaying: true, playStartTime: performance.now(), showScore: false, score: 0 }
        : inst
    ))

    setTimeout(() => {
      setPlacedInstruments(prev => prev.map(inst =>
        inst.id === id ? { ...inst, isPlaying: false } : inst
      ))
    }, 3000)
  }, [playInstrumentSound, spawnWave, setPlacedInstruments])

  const playPresetSequence = useCallback(() => {
    if (!presetPlaying) return

    const now = Date.now()
    const timeline = [
      { index: 0, delay: 0 },
      { index: 1, delay: 2000 },
      { index: 2, delay: 4000 },
      { index: 3, delay: 6000 }
    ]

    timeline.forEach(({ index, delay }) => {
      setTimeout(() => {
        const instrument = placedInstruments.find(p => p.instrumentIndex === index)
        if (instrument) {
          playInstrumentSound(instrument.id, instrument.instrumentIndex, 0)
          spawnWave(instrument.id, instrument.instrumentIndex, instrument.x, instrument.y)
          setPlacedInstruments(prev => prev.map(inst =>
            inst.id === instrument.id
              ? { ...inst, isPlaying: true, playStartTime: performance.now() }
              : inst
          ))
        }
      }, delay)
    })

    const replayInterval = setInterval(() => {
      const elapsed = Date.now() - now
      if (elapsed >= 10000) {
        clearInterval(replayInterval)
        placedInstruments.forEach((instrument, idx) => {
          const score = calculateHarmonyScore(
            placedInstruments.map(p => ({
              x: p.x, y: p.y, instrumentIndex: p.instrumentIndex, isPlaying: true
            })),
            wavesRef.current,
            performance.now()
          )
          const finalScore = Math.max(0, Math.min(100, score + idx * 2))
          onScoreUpdate(instrument.id, finalScore)
        })
        return
      }
      const stage = Math.floor((elapsed / 2000))
      if (stage >= 0 && stage <= 3) {
        const instrument = placedInstruments.find(p => p.instrumentIndex === stage)
        if (instrument) {
          spawnWave(instrument.id, instrument.instrumentIndex, instrument.x, instrument.y)
        }
      }
      for (let i = 0; i < Math.min(stage + 1, 4); i++) {
        const instrument = placedInstruments.find(p => p.instrumentIndex === i)
        if (instrument) {
          playInstrumentSound(instrument.id, instrument.instrumentIndex, 0)
          setPlacedInstruments(prev => prev.map(inst =>
            inst.id === instrument.id
              ? { ...inst, isPlaying: true, playStartTime: performance.now() }
              : inst
          ))
        }
      }
    }, 2800)
  }, [presetPlaying, placedInstruments, playInstrumentSound, spawnWave, setPlacedInstruments, onScoreUpdate])

  useEffect(() => {
    if (presetPlaying) {
      playPresetSequence()
    }
  }, [presetPlaying, playPresetSequence])

  const getCanvasCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)
    for (const inst of placedInstruments) {
      const dx = x - inst.x
      const dy = y - inst.y
      if (Math.sqrt(dx * dx + dy * dy) <= INSTRUMENT_RADIUS + 5) {
        setDraggingId(inst.id)
        setDragOffset({ x: dx, y: dy })
        setPlacedInstruments(prev => prev.map(p =>
          p.id === inst.id ? { ...p, originalX: p.x, originalY: p.y } : p
        ))
        return
      }
    }
  }, [getCanvasCoords, placedInstruments, setPlacedInstruments])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)

    let foundHover: string | null = null
    for (const inst of placedInstruments) {
      const dx = x - inst.x
      const dy = y - inst.y
      if (Math.sqrt(dx * dx + dy * dy) <= INSTRUMENT_RADIUS + 10) {
        foundHover = inst.id
        break
      }
    }
    setHoveredId(foundHover)

    if (draggingId) {
      const newX = Math.max(INSTRUMENT_RADIUS + 5, Math.min(CANVAS_WIDTH - INSTRUMENT_RADIUS - 5, x - dragOffset.x))
      const newY = Math.max(INSTRUMENT_RADIUS + 5, Math.min(CANVAS_HEIGHT - INSTRUMENT_RADIUS - 5, y - dragOffset.y))
      setPlacedInstruments(prev => prev.map(inst =>
        inst.id === draggingId ? { ...inst, x: newX, y: newY } : inst
      ))
    }
  }, [draggingId, dragOffset, getCanvasCoords, placedInstruments, setPlacedInstruments])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)

    if (draggingId) {
      const inst = placedInstruments.find(p => p.id === draggingId)
      if (inst) {
        const dx = x - dragOffset.x - inst.originalX
        const dy = y - dragOffset.y - inst.originalY
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 5) {
          handleInstrumentClick(inst.id, inst.instrumentIndex, inst.x, inst.y)
        } else {
          spawnWave(inst.id, inst.instrumentIndex, inst.x, inst.y)
        }
      }
      setDraggingId(null)
    }
  }, [draggingId, dragOffset, getCanvasCoords, placedInstruments, handleInstrumentClick, spawnWave])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastFrameTime = performance.now()
    let spectrumTimer = 0

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTime
      lastFrameTime = currentTime
      spectrumTimer += deltaTime

      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      drawGrid(ctx)

      const activeWaves: SoundWave[] = []
      wavesRef.current = wavesRef.current.filter(wave => {
        const elapsed = currentTime - wave.startTime
        if (elapsed < 0 || elapsed > wave.duration) return false

        const progress = elapsed / wave.duration
        const easedProgress = easeInOutCubic(progress)
        wave.radius = easedProgress * wave.maxRadius

        if (progress > 0 && progress < 1) {
          activeWaves.push(wave)
          drawSoundWave(ctx, wave, progress)
        }

        return progress < 1
      })

      drawInterference(ctx, activeWaves, currentTime)

      placedInstruments.forEach(inst => {
        drawInstrument(ctx, inst, currentTime, hoveredId === inst.id || draggingId === inst.id)
        if (draggingId === inst.id) {
          drawDragLine(ctx, inst)
        }
        if (inst.showScore) {
          drawScore(ctx, inst)
        }
      })

      if (spectrumTimer >= 33) {
        const spectrum = calculateSpectrum(activeWaves, currentTime, volume)
        onSpectrumUpdate(spectrum)
        spectrumTimer = 0
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [placedInstruments, hoveredId, draggingId, volume, onSpectrumUpdate])

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }
  }

  const drawSoundWave = (ctx: CanvasRenderingContext2D, wave: SoundWave, progress: number) => {
    const alpha = (1 - progress) * 0.6
    const color = frequencyToColor(wave.frequency)

    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = Math.max(0, progress - ring * 0.15)
      if (ringProgress <= 0 || ringProgress >= 1) continue

      const ringRadius = easeInOutCubic(ringProgress) * wave.maxRadius
      const ringAlpha = alpha * (1 - ring * 0.25)

      const gradient = ctx.createRadialGradient(
        wave.x, wave.y, ringRadius * 0.95,
        wave.x, wave.y, ringRadius
      )
      gradient.addColorStop(0, rgba(color, 0))
      gradient.addColorStop(0.5, rgba(color, ringAlpha * 0.5))
      gradient.addColorStop(1, rgba(color, 0))

      ctx.beginPath()
      ctx.arc(wave.x, wave.y, ringRadius, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(color, ringAlpha)
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(wave.x, wave.y, ringRadius + 3, 0, Math.PI * 2)
      ctx.strokeStyle = gradient
      ctx.lineWidth = 6
      ctx.stroke()
    }
  }

  const drawInterference = (ctx: CanvasRenderingContext2D, waves: SoundWave[], currentTime: number) => {
    const interferenceRegions: { x: number; y: number; radius: number; type: 'constructive' | 'destructive' }[] = []

    for (let i = 0; i < waves.length; i++) {
      for (let j = i + 1; j < waves.length; j++) {
        const { interferencePoints, constructive, destructive } = calculateWaveInterference(waves[i], waves[j], currentTime)

        interferencePoints.forEach(point => {
          const intensity = Math.max(constructive, destructive)
          if (intensity > 0.1) {
            interferenceRegions.push({
              x: point.x,
              y: point.y,
              radius: 20 + intensity * 30,
              type: point.type
            })
          }
        })
      }
    }

    interferenceRegions.forEach(region => {
      if (region.type === 'constructive') {
        const blinkAlpha = 0.3 * (0.7 + 0.3 * Math.sin(currentTime / 250))
        const gradient = ctx.createRadialGradient(
          region.x, region.y, 0,
          region.x, region.y, region.radius
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${blinkAlpha})`)
        gradient.addColorStop(0.6, `rgba(255, 255, 255, ${blinkAlpha * 0.5})`)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.beginPath()
        ctx.arc(region.x, region.y, region.radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(region.x, region.y, region.radius * 0.5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${blinkAlpha})`
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        ctx.save()
        const gridAlpha = 0.5

        ctx.beginPath()
        ctx.arc(region.x, region.y, region.radius, 0, Math.PI * 2)
        ctx.clip()

        ctx.strokeStyle = `rgba(30, 30, 60, ${gridAlpha})`
        ctx.lineWidth = 1
        const gridStep = 4

        for (let gx = region.x - region.radius; gx < region.x + region.radius; gx += gridStep) {
          ctx.beginPath()
          ctx.moveTo(gx, region.y - region.radius)
          ctx.lineTo(gx, region.y + region.radius)
          ctx.stroke()
        }
        for (let gy = region.y - region.radius; gy < region.y + region.radius; gy += gridStep) {
          ctx.beginPath()
          ctx.moveTo(region.x - region.radius, gy)
          ctx.lineTo(region.x + region.radius, gy)
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(region.x, region.y, region.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(20, 20, 40, ${gridAlpha * 0.8})`
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.restore()
      }
    })
  }

  const drawInstrument = (ctx: CanvasRenderingContext2D, inst: PlacedInstrument, currentTime: number, isHovered: boolean) => {
    const instrument = INSTRUMENTS[inst.instrumentIndex]
    const playProgress = inst.isPlaying
      ? Math.min(1, (currentTime - inst.playStartTime) / 3000)
      : 0
    const pulseScale = inst.isPlaying ? 1 + Math.sin(playProgress * Math.PI * 6) * 0.08 : 1

    if (isHovered) {
      const glowAlpha = 0.4 + Math.sin(currentTime / 300) * 0.1
      const glowGradient = ctx.createRadialGradient(
        inst.x, inst.y, INSTRUMENT_RADIUS,
        inst.x, inst.y, INSTRUMENT_RADIUS + 25
      )
      glowGradient.addColorStop(0, rgba('#48dbfb', glowAlpha))
      glowGradient.addColorStop(1, rgba('#48dbfb', 0))

      ctx.beginPath()
      ctx.arc(inst.x, inst.y, INSTRUMENT_RADIUS + 25, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()
    }

    const radius = INSTRUMENT_RADIUS * pulseScale

    ctx.save()
    ctx.shadowColor = instrument.color
    ctx.shadowBlur = inst.isPlaying ? 20 : 10

    const gradient = ctx.createRadialGradient(
      inst.x - radius * 0.3, inst.y - radius * 0.3, 0,
      inst.x, inst.y, radius
    )
    gradient.addColorStop(0, lightenColor(instrument.color, 30))
    gradient.addColorStop(0.7, instrument.color)
    gradient.addColorStop(1, darkenColor(instrument.color, 30))

    ctx.beginPath()
    ctx.arc(inst.x, inst.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.31)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(instrument.symbol, inst.x, inst.y + 2)

    ctx.fillStyle = '#e0e0ff'
    ctx.font = '11px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(instrument.name, inst.x, inst.y + INSTRUMENT_RADIUS + 14)
  }

  const drawDragLine = (ctx: CanvasRenderingContext2D, inst: PlacedInstrument) => {
    ctx.save()
    ctx.setLineDash([6, 6])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.19)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(inst.originalX, inst.originalY)
    ctx.lineTo(inst.x, inst.y)
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(inst.originalX, inst.originalY, INSTRUMENT_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  const drawScore = (ctx: CanvasRenderingContext2D, inst: PlacedInstrument) => {
    const scoreY = inst.y - INSTRUMENT_RADIUS - 25

    ctx.fillStyle = 'rgba(22, 33, 62, 0.95)'
    const boxWidth = 60
    const boxHeight = 30
    const boxX = inst.x - boxWidth / 2
    const boxY = scoreY - boxHeight / 2

    ctx.beginPath()
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 6)
    ctx.fill()
    ctx.strokeStyle = '#48dbfb'
    ctx.lineWidth = 1.5
    ctx.stroke()

    const scoreColor = inst.score >= 80 ? '#4ade80' : inst.score >= 60 ? '#feca57' : '#ff6b6b'
    ctx.fillStyle = scoreColor
    ctx.font = 'bold 18px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${inst.score}`, inst.x, scoreY + 2)
  }

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
    const B = Math.min(255, (num & 0x0000FF) + amt)
    return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`
  }

  const darkenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, (num >> 16) - amt)
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
    const B = Math.max(0, (num & 0x0000FF) - amt)
    return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        width: '100%',
        maxWidth: `${CANVAS_WIDTH}px`,
        height: 'auto',
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        borderRadius: '12px',
        cursor: draggingId ? 'grabbing' : hoveredId ? 'grab' : 'default',
        display: 'block',
        userSelect: 'none',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDraggingId(null)
        setHoveredId(null)
      }}
    />
  )
}

export default Simulation
