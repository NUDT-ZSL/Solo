import { useEffect, useRef, useState, useCallback } from 'react'
import { ParticleEngine, type TextParticle } from './ParticleEngine'
import { Renderer } from './renderer'

export function useAnimationLoop(
  callback: (deltaMs: number, totalMs: number) => void,
  enabled: boolean = true
): void {
  const callbackRef = useRef(callback)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const tick = (time: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = time
        lastTimeRef.current = time
      }
      const delta = time - lastTimeRef.current
      const total = time - startTimeRef.current
      lastTimeRef.current = time
      callbackRef.current(delta, total)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      startTimeRef.current = 0
      lastTimeRef.current = 0
    }
  }, [enabled])
}

interface ParticleSystemHandlers {
  updateText: (text: string) => void
  clear: () => void
  getParticles: () => TextParticle[]
  getEngine: () => ParticleEngine | null
  resize: (w: number, h: number) => void
  ensureEngine: (w: number, h: number) => void
}

export function useParticleSystem(
  initialWidth: number,
  initialHeight: number
): ParticleSystemHandlers {
  const engineRef = useRef<ParticleEngine | null>(null)

  const ensureEngine = useCallback((w: number, h: number) => {
    if (!engineRef.current && w > 0 && h > 0) {
      engineRef.current = new ParticleEngine({
        canvasWidth: w,
        canvasHeight: h
      })
    }
  }, [])

  useEffect(() => {
    ensureEngine(initialWidth, initialHeight)
    return () => {
      engineRef.current = null
    }
  }, [ensureEngine, initialWidth, initialHeight])

  const updateText = useCallback((text: string) => {
    engineRef.current?.updateText(text)
  }, [])

  const clear = useCallback(() => {
    engineRef.current?.clear()
  }, [])

  const getParticles = useCallback((): TextParticle[] => {
    return engineRef.current?.getParticles() ?? []
  }, [])

  const getEngine = useCallback((): ParticleEngine | null => {
    return engineRef.current
  }, [])

  const resize = useCallback((w: number, h: number) => {
    if (!engineRef.current) {
      ensureEngine(w, h)
    } else {
      engineRef.current.resize(w, h)
    }
  }, [ensureEngine])

  return { updateText, clear, getParticles, getEngine, resize, ensureEngine }
}

interface RendererHandlers {
  setCanvas: (canvas: HTMLCanvasElement | null) => void
  resize: (w: number, h: number) => void
  exportPNG: () => string
  getRenderer: () => Renderer | null
}

export function useCanvasRenderer(): RendererHandlers {
  const rendererRef = useRef<Renderer | null>(null)

  const setCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const w = canvas.width || canvas.clientWidth
        const h = canvas.height || canvas.clientHeight
        rendererRef.current = new Renderer(ctx, w, h)
      } else {
        rendererRef.current = null
      }
    } else {
      rendererRef.current = null
    }
  }, [])

  const resize = useCallback((w: number, h: number) => {
    rendererRef.current?.resize(w, h)
  }, [])

  const exportPNG = useCallback((): string => {
    return rendererRef.current?.exportPNG() ?? ''
  }, [])

  const getRenderer = useCallback((): Renderer | null => {
    return rendererRef.current
  }, [])

  return { setCanvas, resize, exportPNG, getRenderer }
}

interface TextInputState {
  text: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  setText: (text: string) => void
  reset: () => void
}

export function useTextInput(initialValue: string = ''): TextInputState {
  const [text, setTextState] = useState<string>(initialValue)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setTextState(e.target.value)
    },
    []
  )

  const setText = useCallback((newText: string) => {
    setTextState(newText)
  }, [])

  const reset = useCallback(() => {
    setTextState('')
  }, [])

  return { text, onChange, setText, reset }
}
