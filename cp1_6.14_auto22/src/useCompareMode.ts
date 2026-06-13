import { useState, useRef, useCallback, useEffect } from 'react'
import type { CompareMode } from './types'

interface CompareModeState {
  compareMode: CompareMode
  dividerPosition: number
  blinkOpacity: number
  isDraggingDivider: boolean
  setCompareMode: (mode: CompareMode) => void
  handleDividerMouseDown: (e: React.MouseEvent) => void
  setCanvasWrapperRef: (el: HTMLDivElement | null) => void
  setCanvasRef: (el: HTMLCanvasElement | null) => void
}

export function useCompareMode(layerCount: number): CompareModeState {
  const [compareMode, setCompareModeRaw] = useState<CompareMode>('none')
  const [dividerPosition, setDividerPosition] = useState(0.5)
  const [blinkOpacity, setBlinkOpacity] = useState(0)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)

  const blinkRafRef = useRef<number>(0)
  const blinkStartRef = useRef<number>(0)
  const wrapperElRef = useRef<HTMLDivElement | null>(null)
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)

  const setCanvasWrapperRef = useCallback((el: HTMLDivElement | null) => {
    wrapperElRef.current = el
  }, [])

  const setCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasElRef.current = el
  }, [])

  const setCompareMode = useCallback((mode: CompareMode) => {
    if (mode === 'blink' && layerCount < 2) return
    if (mode === 'divider' && layerCount < 2) return

    if (mode !== 'blink') {
      if (blinkRafRef.current) {
        cancelAnimationFrame(blinkRafRef.current)
        blinkRafRef.current = 0
      }
      setBlinkOpacity(0)
    }

    if (mode === 'blink') {
      blinkStartRef.current = performance.now()
      setBlinkOpacity(0)
    }

    if (mode === 'divider') {
      setDividerPosition(0.5)
    }

    setCompareModeRaw(mode)
  }, [layerCount])

  useEffect(() => {
    if (layerCount < 2 && compareMode !== 'none') {
      if (blinkRafRef.current) {
        cancelAnimationFrame(blinkRafRef.current)
        blinkRafRef.current = 0
      }
      setCompareModeRaw('none')
      setBlinkOpacity(0)
    }
  }, [layerCount, compareMode])

  useEffect(() => {
    if (compareMode !== 'blink') return

    const BLINK_DURATION = 12000
    const HALF_CYCLE = 500
    const FADE_DURATION = 300

    const animate = (now: number) => {
      const elapsed = now - blinkStartRef.current

      if (elapsed >= BLINK_DURATION) {
        setBlinkOpacity(0)
        setCompareModeRaw('none')
        blinkRafRef.current = 0
        return
      }

      const positionInHalf = elapsed % HALF_CYCLE
      const halfCycleIndex = Math.floor(elapsed / HALF_CYCLE)
      const phase = halfCycleIndex % 2

      let t: number
      if (positionInHalf < FADE_DURATION) {
        t = positionInHalf / FADE_DURATION
      } else {
        t = 1
      }

      setBlinkOpacity(phase === 0 ? t : 1 - t)

      blinkRafRef.current = requestAnimationFrame(animate)
    }

    blinkStartRef.current = performance.now()
    blinkRafRef.current = requestAnimationFrame(animate)

    return () => {
      if (blinkRafRef.current) {
        cancelAnimationFrame(blinkRafRef.current)
        blinkRafRef.current = 0
      }
    }
  }, [compareMode])

  const calcDividerPosition = useCallback((clientX: number) => {
    const canvas = canvasElRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return
    const x = clientX - rect.left
    const pos = Math.max(0, Math.min(1, x / rect.width))
    setDividerPosition(pos)
  }, [])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingDivider(true)
    calcDividerPosition(e.clientX)
  }, [calcDividerPosition])

  useEffect(() => {
    if (!isDraggingDivider) return

    const onMove = (e: MouseEvent) => {
      e.preventDefault()
      calcDividerPosition(e.clientX)
    }
    const onUp = () => {
      setIsDraggingDivider(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingDivider, calcDividerPosition])

  return {
    compareMode,
    dividerPosition,
    blinkOpacity,
    isDraggingDivider,
    setCompareMode,
    handleDividerMouseDown,
    setCanvasWrapperRef,
    setCanvasRef,
  }
}
