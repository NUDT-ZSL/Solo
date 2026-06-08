import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, RotateCw } from 'lucide-react'
import { CoreEngine } from './CoreEngine'
import { FractalRenderer } from './FractalRenderer'

interface UILayerProps {
  engine: CoreEngine
}

export const UILayer: React.FC<UILayerProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<FractalRenderer | null>(null)
  const [fragmentCount, setFragmentCount] = useState(0)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [autoRotate, setAutoRotate] = useState(false)
  const [toolbarOpen, setToolbarOpen] = useState(true)
  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const pinchDist = useRef(0)
  const rafId = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const renderer = new FractalRenderer(canvas, engine)
    rendererRef.current = renderer
    renderer.resize()
    renderer.start()

    engine.onFragmentChange = () => {
      setFragmentCount(engine.getFragmentCount())
    }

    const handleResize = () => renderer.resize()
    window.addEventListener('resize', handleResize)

    const updateStats = () => {
      setFragmentCount(engine.getFragmentCount())
      setZoomPercent(engine.getZoomPercent())
      rafId.current = requestAnimationFrame(updateStats)
    }
    rafId.current = requestAnimationFrame(updateStats)

    return () => {
      renderer.stop()
      cancelAnimationFrame(rafId.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [engine])

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    isDragging.current = false
    lastPointer.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging.current = true
    }

    if (isDragging.current) {
      engine.panBy(dx, dy)
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }
  }, [engine])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current && e.button === 0) {
      const { w, h } = getCanvasSize()
      const [wx, wy] = engine.screenToWorld(e.clientX, e.clientY, w, h)
      engine.handleCanvasClick(wx, wy)
    }
    isDragging.current = false
  }, [engine, getCanvasSize])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const { w, h } = getCanvasSize()
    engine.zoomAt(e.deltaY, e.clientX, e.clientY, w, h)
  }, [engine, getCanvasSize])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.sqrt(dx * dx + dy * dy)
    } else if (e.touches.length === 1) {
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      isDragging.current = false
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const delta = pinchDist.current - dist
      const { w, h } = getCanvasSize()
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      engine.zoomAt(delta * 2, cx, cy, w, h)
      pinchDist.current = dist
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastPointer.current.x
      const dy = e.touches[0].clientY - lastPointer.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDragging.current = true
      }
      if (isDragging.current) {
        engine.panBy(dx, dy)
      }
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [engine, getCanvasSize])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const { w, h } = getCanvasSize()
      const [wx, wy] = engine.screenToWorld(touch.clientX, touch.clientY, w, h)
      engine.handleCanvasClick(wx, wy)
    }
    isDragging.current = false
  }, [engine, getCanvasSize])

  const handleAddFragment = useCallback(() => {
    const { w, h } = getCanvasSize()
    const wx = (Math.random() - 0.5) * 300 + engine.view.offsetX
    const wy = (Math.random() - 0.5) * 300 + engine.view.offsetY
    engine.addFragment(wx, wy)
  }, [engine, getCanvasSize])

  const handleClear = useCallback(() => {
    engine.clearAll()
  }, [engine])

  const handleToggleAutoRotate = useCallback(() => {
    const next = !autoRotate
    setAutoRotate(next)
    engine.setAutoRotate(next)
  }, [autoRotate, engine])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#050508' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div
        className="absolute top-4 left-4 sm:top-6 sm:left-6 px-4 py-3 sm:px-5 sm:py-4 rounded-xl select-none"
        style={{
          background: 'rgba(10, 10, 20, 0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      >
        <div className="text-xs sm:text-sm text-white/50 tracking-wider mb-1">镜花水月</div>
        <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
          <span className="text-white/70">
            碎片 <span className="text-cyan-300/90 font-semibold">{fragmentCount}</span>
          </span>
          <span className="text-white/70">
            缩放 <span className="text-cyan-300/90 font-semibold">{zoomPercent}%</span>
          </span>
        </div>
      </div>

      <div
        className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2 select-none"
        style={{
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="flex flex-col gap-2 overflow-hidden"
          style={{
            maxHeight: toolbarOpen ? '200px' : '0px',
            opacity: toolbarOpen ? 1 : 0,
            transition: 'max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
          }}
        >
          <ToolbarButton
            icon={<Plus size={18} />}
            label="添加碎片"
            onClick={handleAddFragment}
            hue={180}
          />
          <ToolbarButton
            icon={<RotateCw size={18} />}
            label={autoRotate ? '停止旋转' : '自动旋转'}
            onClick={handleToggleAutoRotate}
            hue={autoRotate ? 120 : 220}
            active={autoRotate}
          />
          <ToolbarButton
            icon={<Trash2 size={18} />}
            label="清空画布"
            onClick={handleClear}
            hue={0}
          />
        </div>

        <button
          onClick={() => setToolbarOpen(!toolbarOpen)}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(10, 10, 20, 0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.7)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
            transform: toolbarOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(20, 20, 40, 0.7)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 10, 20, 0.55)'
          }}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  hue: number
  active?: boolean
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, onClick, hue, active }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
      style={{
        background: active
          ? `hsla(${hue}, 60%, 30%, 0.5)`
          : 'rgba(10, 10, 20, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${active ? `hsla(${hue}, 70%, 50%, 0.3)` : 'rgba(255, 255, 255, 0.06)'}`,
        color: active ? `hsla(${hue}, 80%, 75%, 0.95)` : 'rgba(255, 255, 255, 0.65)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = active
          ? `hsla(${hue}, 60%, 35%, 0.6)`
          : 'rgba(20, 20, 40, 0.7)'
        e.currentTarget.style.transform = 'scale(1.03)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active
          ? `hsla(${hue}, 60%, 30%, 0.5)`
          : 'rgba(10, 10, 20, 0.55)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline text-xs tracking-wide">{label}</span>
    </button>
  )
}
