import { useRef, useState, useCallback, useEffect } from 'react'
import type { ComponentMeta, StyleConfig } from '@/types'
import { renderComponent } from '@/data/componentRenderers'
import { Copy } from 'lucide-react'
import { transformComponent } from '@/utils/transformComponent'

interface PreviewCanvasProps {
  component: ComponentMeta | null
  styleConfig: StyleConfig
  onCopyCode: () => void
}

const MIN_W = 480
const MIN_H = 320
const MAX_W = 800
const MAX_H = 600

export default function PreviewCanvas({ component, styleConfig, onCopyCode }: PreviewCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: MIN_W, height: MIN_H })
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, w: MIN_W, h: MIN_H })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: canvasSize.width,
      h: canvasSize.height,
    }
  }, [canvasSize])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const dw = e.clientX - startPos.current.x
      const dh = e.clientY - startPos.current.y
      setCanvasSize({
        width: Math.min(MAX_W, Math.max(MIN_W, startPos.current.w + dw)),
        height: Math.min(MAX_H, Math.max(MIN_H, startPos.current.h + dh)),
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return (
    <div className="flex flex-col items-center flex-1 min-w-0 py-4 px-4" ref={containerRef}>
      {component && (
        <div className="flex items-center justify-between w-full mb-3" style={{ maxWidth: canvasSize.width }}>
          <span className="text-sm text-gray-500 font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {component.name} v{component.version}
          </span>
          <button
            onClick={onCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-md transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#4A90D9', borderRadius: 6 }}
          >
            <Copy size={13} />
            复制代码
          </button>
        </div>
      )}

      <div
        className="relative"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          background: '#f8f9fa',
          border: '1px dashed #ccc',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {component ? (
            renderComponent(component.id, component.defaultProps, styleConfig)
          ) : (
            <div className="text-gray-400 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              请从左侧选择一个组件
            </div>
          )}
        </div>

        <div
          className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end pr-0.5 pb-0.5"
          onMouseDown={handleMouseDown}
          style={{ userSelect: 'none' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {component && (
        <div className="mt-2 text-[11px] text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {canvasSize.width} × {canvasSize.height}px
        </div>
      )}
    </div>
  )
}
