import React, { useEffect, useRef, useState, useCallback } from 'react'
import { BrushEngine } from './engine/BrushEngine'
import { LifeSimulator } from './engine/LifeSimulator'
import { ControlPanel } from './components/ControlPanel'
import './App.css'

interface HistoryItem {
  id: number
  thumbnail: string
  savedAt: number
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<BrushEngine | null>(null)
  const simulatorRef = useRef<LifeSimulator | null>(null)
  const animationRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const fpsRef = useRef<number>(60)

  const [startHue, setStartHue] = useState(176)
  const [endHue, setEndHue] = useState(343)
  const [brushSize, setBrushSize] = useState(3)
  const [maxAge, setMaxAge] = useState(1800)
  const [backgroundColor, setBackgroundColor] = useState('#0B0C10')
  const [particleCount, setParticleCount] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const historyIdRef = useRef(0)

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [])

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getCanvasCoords(e)
    engineRef.current?.startDrawing(x, y)
  }, [getCanvasCoords])

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getCanvasCoords(e)
    engineRef.current?.moveDrawing(x, y)
  }, [getCanvasCoords])

  const handlePointerUp = useCallback(() => {
    engineRef.current?.endDrawing()
  }, [])

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current
    if (!canvas || !offscreen) return

    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    const thumbW = 160
    const thumbH = 120
    offscreen.width = thumbW
    offscreen.height = thumbH

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, thumbW, thumbH)
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, thumbW, thumbH)

    const thumbnail = offscreen.toDataURL('image/png')

    setHistory((prev) => {
      const newItem: HistoryItem = {
        id: historyIdRef.current++,
        thumbnail,
        savedAt: Math.floor(Date.now() / 1000)
      }
      const updated = [newItem, ...prev]
      return updated.slice(0, 5)
    })
  }, [backgroundColor])

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine || isClearing) return

    saveToHistory()
    setIsClearing(true)

    const cx = canvas.width / 2
    const cy = canvas.height / 2
    engine.addExplosionParticles(cx, cy, canvas.width, canvas.height)

    setTimeout(() => {
      engine.clearParticles()
      setIsClearing(false)
    }, 1000)
  }, [isClearing, saveToHistory])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    offscreenCanvasRef.current = document.createElement('canvas')
    engineRef.current = new BrushEngine({
      startHue,
      endHue,
      brushSize,
      maxAge,
      saturation: 90,
      lightness: 80
    })
    simulatorRef.current = new LifeSimulator(engineRef.current)

    const displayWidth = () => canvas.width / (window.devicePixelRatio || 1)
    const displayHeight = () => canvas.height / (window.devicePixelRatio || 1)

    const render = (timestamp: number) => {
      if (lastFrameRef.current === 0) lastFrameRef.current = timestamp
      const delta = timestamp - lastFrameRef.current
      lastFrameRef.current = timestamp

      frameCountRef.current++
      if (frameCountRef.current % 30 === 0) {
        fpsRef.current = Math.round(1000 / delta)
      }

      const particles = simulatorRef.current?.update() || []
      const activeCount = particles.filter(
        (p) => !p.isExplosion && !p.isInkDot
      ).length
      setParticleCount(activeCount)

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, displayWidth(), displayHeight())

      ctx.globalCompositeOperation = 'lighter'

      for (const p of particles) {
        if (p.alpha <= 0) continue

        const glowRadius = p.isExplosion || p.isInkDot
          ? p.radius * 1.5
          : p.radius * 2.5

        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, glowRadius
        )

        const color = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha})`
        const glow = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`

        gradient.addColorStop(0, color)
        gradient.addColorStop(0.4, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * 0.6})`)
        gradient.addColorStop(1, glow)

        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = color
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [backgroundColor])

  useEffect(() => {
    engineRef.current?.updateConfig({
      startHue,
      endHue,
      brushSize,
      maxAge
    })
  }, [startHue, endHue, brushSize, maxAge])

  const formatTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    return `${Math.floor(diff / 3600)}小时前`
  }

  return (
    <div className="app-container">
      <div className="history-sidebar">
        <h3 className="history-title">历史</h3>
        {history.length === 0 ? (
          <p className="history-empty">暂无记录<br /><span>清空画布后保存</span></p>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <img
                  src={item.thumbnail}
                  alt="历史画作"
                  className="history-thumb"
                />
                <div className="history-overlay">
                  <span>{formatTime(item.savedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="life-canvas"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
        <button
          className="floating-clear-btn"
          onClick={handleClear}
          disabled={isClearing}
        >
          {isClearing ? '✦ 爆散中...' : '🗑 清空'}
        </button>
      </div>

      <ControlPanel
        startHue={startHue}
        endHue={endHue}
        brushSize={brushSize}
        maxAge={maxAge}
        backgroundColor={backgroundColor}
        particleCount={particleCount}
        onStartHueChange={setStartHue}
        onEndHueChange={setEndHue}
        onBrushSizeChange={setBrushSize}
        onMaxAgeChange={setMaxAge}
        onBackgroundColorChange={setBackgroundColor}
        onClear={handleClear}
      />
    </div>
  )
}
