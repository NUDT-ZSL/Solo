import { useEffect, useRef, useState, useCallback } from 'react'
import { useSandPhysics } from './useSandPhysics'

const MIN_WIDTH = 800
const MIN_HEIGHT = 600

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const isMouseDownRef = useRef(false)
  const mousePosRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null })
  const canvasSizeRef = useRef({ width: MIN_WIDTH, height: MIN_HEIGHT })

  const [isResetting, setIsResetting] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: MIN_WIDTH, height: MIN_HEIGHT })
  const [currentColor, setCurrentColorState] = useState<string | null>(null)

  const physics = useSandPhysics()

  const getCanvasCoords = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const handleResize = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const isMobile = window.innerWidth < 768
    let width: number, height: number

    if (isMobile) {
      width = window.innerWidth
      height = Math.max(window.innerHeight, MIN_HEIGHT)
    } else {
      width = Math.max(window.innerWidth, MIN_WIDTH)
      height = Math.max(window.innerHeight, MIN_HEIGHT)
    }

    width = Math.floor(width)
    height = Math.floor(height)

    canvasSizeRef.current = { width, height }
    setCanvasSize({ width, height })

    const canvas = canvasRef.current
    if (canvas) {
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        physics.generateNoiseImage(ctx)
      }
    }
  }, [physics])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    physics.update(
      isMouseDownRef.current,
      mousePosRef.current.x,
      mousePosRef.current.y
    )

    physics.render(
      ctx,
      canvasSizeRef.current.width,
      canvasSizeRef.current.height,
      mousePosRef.current.x,
      mousePosRef.current.y,
      isMouseDownRef.current
    )

    animationRef.current = requestAnimationFrame(animate)
  }, [physics])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e)

    if (e.ctrlKey || e.button === 2) {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const newColor = physics.pickColor(coords.x, coords.y, ctx)
      setCurrentColorState(newColor)
      return
    }

    if (e.button === 0) {
      isMouseDownRef.current = true
      mousePosRef.current = coords
    }
  }, [getCanvasCoords, physics])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e)
    mousePosRef.current = coords
  }, [getCanvasCoords])

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false
  }, [])

  const handleMouseLeave = useCallback(() => {
    isMouseDownRef.current = false
    mousePosRef.current = { x: null, y: null }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const handleReset = useCallback(() => {
    if (isResetting) return
    setIsResetting(true)
    setTimeout(() => {
      physics.resetAll()
      setCurrentColorState(null)
      setTimeout(() => {
        setIsResetting(false)
      }, 50)
    }, 600)
  }, [isResetting, physics])

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvasSizeRef.current.width
    exportCanvas.height = canvasSizeRef.current.height
    const exportCtx = exportCanvas.getContext('2d')!
    exportCtx.fillStyle = '#1A0F08'
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    exportCtx.drawImage(canvas, 0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height)

    const link = document.createElement('a')
    link.download = `magnetic-sand-art-${Date.now()}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }, [])

  const isMobile = canvasSize.width < 768

  return (
    <div className="app-container" ref={containerRef}>
      <div className="logo">
        <svg viewBox="0 0 60 60" width="60" height="60">
          <defs>
            <radialGradient id="sandGrad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#E8CC9F" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#C8A882" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8B5E3C" stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <circle cx="30" cy="30" r="28" fill="url(#sandGrad)" stroke="#C8A882" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="24" cy="22" r="2.5" fill="#C8A882" opacity="0.8" />
          <circle cx="34" cy="19" r="2" fill="#A67C52" opacity="0.7" />
          <circle cx="20" cy="30" r="2.2" fill="#C8A882" opacity="0.75" />
          <circle cx="38" cy="32" r="2.8" fill="#8B5E3C" opacity="0.7" />
          <circle cx="28" cy="38" r="2.3" fill="#C8A882" opacity="0.7" />
          <circle cx="40" cy="42" r="1.8" fill="#A67C52" opacity="0.65" />
          <circle cx="18" cy="40" r="2.1" fill="#6B4226" opacity="0.6" />
          <circle cx="32" cy="46" r="1.9" fill="#C8A882" opacity="0.7" />
        </svg>
      </div>

      <button
        className={`reset-btn ${isResetting ? 'resetting' : ''}`}
        onClick={handleReset}
        aria-label="重置画布"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
            fill="#C8A882"
          />
        </svg>
      </button>

      <button
        className="export-btn"
        onClick={handleExport}
        aria-label="导出图片"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
            fill="#C8A882"
          />
        </svg>
      </button>

      <div
        className={`canvas-wrapper ${isResetting ? 'scroll-up' : ''}`}
      >
        <canvas
          ref={canvasRef}
          className="sand-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
        />
        <div className={`canvas-border ${isResetting ? 'border-scroll' : ''}`} />
      </div>

      {currentColor && (
        <div className="color-indicator">
          <div
            className="color-swatch"
            style={{ backgroundColor: currentColor }}
          />
          <span className="color-label">{currentColor}</span>
        </div>
      )}

      {isResetting && <div className="scroll-mask top-mask" />}
    </div>
  )
}

export default App
