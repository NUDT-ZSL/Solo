import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CanvasRenderer, PaintBall, COLOR_PALETTE } from './CanvasRenderer'
import { ControlPanel, ControlValues } from './ControlPanel'

const DESKTOP_SIZE = 800
const MOBILE_SIZE = 400
const MOBILE_BREAKPOINT = 900

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [balls, setBalls] = useState<PaintBall[]>([])
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )
  const [canvasSize, setCanvasSize] = useState<number>(
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
      ? MOBILE_SIZE
      : DESKTOP_SIZE
  )
  const [showToast, setShowToast] = useState<boolean>(false)
  const [controls, setControls] = useState<ControlValues>({
    brightness: 1.0,
    diffusion: 5,
    texture: 30,
  })

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      const newSize = mobile ? MOBILE_SIZE : DESKTOP_SIZE
      setCanvasSize(newSize)
      if (rendererRef.current) {
        rendererRef.current.updateDisplaySize(newSize)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    const renderer = new CanvasRenderer()
    rendererRef.current = renderer
    renderer.bindCanvas(canvasRef.current, canvasSize)
    renderer.onBallsChange = (newBalls) => {
      setBalls(newBalls)
    }
    return () => {
      renderer.stop()
    }
  }, [])

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setBrightness(controls.brightness)
    }
  }, [controls.brightness])

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setDiffusionSpeed(controls.diffusion)
    }
  }, [controls.diffusion])

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTextureDensity(controls.texture)
    }
  }, [controls.texture])

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      let clientX: number
      let clientY: number
      if ('touches' in e) {
        clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
        clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      }
    },
    []
  )

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const coords = getCanvasCoords(e)
      if (!rendererRef.current) return
      const handled = rendererRef.current.handleMouseDown(coords.x, coords.y)
      if (!handled) {
        rendererRef.current.createBall(coords.x, coords.y)
      }
    },
    [getCanvasCoords]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e)
      if (rendererRef.current) {
        rendererRef.current.handleMouseMove(coords.x, coords.y)
      }
    },
    [getCanvasCoords]
  )

  const handleCanvasMouseUp = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.handleMouseUp()
    }
  }, [])

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const coords = getCanvasCoords(e)
      if (!rendererRef.current) return
      const handled = rendererRef.current.handleMouseDown(coords.x, coords.y)
      if (!handled) {
        rendererRef.current.createBall(coords.x, coords.y)
      }
    },
    [getCanvasCoords]
  )

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const coords = getCanvasCoords(e)
      if (rendererRef.current) {
        rendererRef.current.handleMouseMove(coords.x, coords.y)
      }
    },
    [getCanvasCoords]
  )

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      if (rendererRef.current) {
        rendererRef.current.handleMouseUp()
      }
    },
    []
  )

  const handleClear = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clear()
    }
  }, [])

  const handleSave = useCallback(() => {
    if (!rendererRef.current) return
    const dataUrl = rendererRef.current.exportImage()
    const link = document.createElement('a')
    link.download = `glow-palette-${Date.now()}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }, [])

  const handlePageMouseUp = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.handleMouseUp()
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', handlePageMouseUp)
    window.addEventListener('touchend', handlePageMouseUp)
    return () => {
      window.removeEventListener('mouseup', handlePageMouseUp)
      window.removeEventListener('touchend', handlePageMouseUp)
    }
  }, [handlePageMouseUp])

  const ringBorderStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    padding: '4px',
    borderRadius: '50%',
    background: 'conic-gradient(from 0deg, #FF6B6B 0%, #FFD700 25%, #33CC66 50%, #3399FF 75%, #6BCBFF 100%)',
    boxShadow: '0 0 40px rgba(107, 203, 255, 0.2), 0 0 80px rgba(255, 107, 107, 0.15)',
    transition: 'all 0.3s ease',
    willChange: 'transform',
  }

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    borderRadius: '50%',
    cursor: 'crosshair',
    backgroundColor: '#000000',
    transition: 'all 0.3s ease',
    willChange: 'transform',
    touchAction: 'none',
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#1A1A2E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '24px 16px 40px' : '40px 24px 60px',
        boxSizing: 'border-box',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        color: '#ffffff',
        overflowX: 'hidden',
        background:
          'radial-gradient(ellipse at top, rgba(102, 126, 234, 0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(153, 51, 255, 0.06) 0%, transparent 50%), #1A1A2E',
      }}
    >
      <h1
        style={{
          margin: 0,
          marginBottom: isMobile ? '24px' : '40px',
          fontSize: isMobile ? '20px' : '28px',
          letterSpacing: '4px',
          fontWeight: 300,
          color: '#ffffff',
          textAlign: 'center',
          textShadow:
            '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(107, 203, 255, 0.2)',
          transition: 'all 0.3s ease',
          userSelect: 'none',
        }}
      >
        辉 光 调 色 盘
      </h1>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: isMobile ? '8px' : '16px',
          gap: '8px',
          opacity: balls.length === 0 ? 0.6 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '13px', color: '#888', letterSpacing: '1px' }}>
          点击空白区域生成颜料球 · 拖拽融合
        </span>
      </div>

      <div style={ringBorderStyle}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{
            ...canvasStyle,
            width: `${canvasSize}px`,
            height: `${canvasSize}px`,
            maxWidth: '100%',
            maxHeight: isMobile ? '70vh' : 'none',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '16px',
          marginBottom: isMobile ? '20px' : '32px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {COLOR_PALETTE.map((c) => (
          <div
            key={c}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: c,
              boxShadow: `0 0 12px ${c}88`,
              opacity: 0.7,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <ControlPanel
        values={controls}
        onChange={setControls}
        onClear={handleClear}
        onSave={handleSave}
        isMobile={isMobile}
      />

      <div
        style={{
          position: 'fixed',
          bottom: showToast ? '40px' : '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 36px',
          backgroundColor: 'rgba(102, 126, 234, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '28px',
          color: 'white',
          fontSize: '15px',
          letterSpacing: '2px',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.5), 0 0 60px rgba(102, 126, 234, 0.3)',
          transition: 'bottom 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.3s ease',
          opacity: showToast ? 1 : 0,
          zIndex: 1000,
          fontWeight: 500,
          border: '1px solid rgba(255,255,255,0.15)',
          userSelect: 'none',
        }}
      >
        已保存！
      </div>
    </div>
  )
}

export default App
