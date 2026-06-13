import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { Layer, CompareMode } from './types'
import { compositeLayers } from './compositor'

interface CanvasProps {
  layers: Layer[]
  selectedLayerIndex: number
  compareMode: CompareMode
  dividerPosition: number
  onDividerPositionChange: (position: number) => void
  onCompareModeChange: (mode: CompareMode) => void
  blinkOpacity: number
}

const Canvas: React.FC<CanvasProps> = ({
  layers,
  selectedLayerIndex: _selectedLayerIndex,
  compareMode,
  dividerPosition,
  onDividerPositionChange,
  onCompareModeChange,
  blinkOpacity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const pendingRenderRef = useRef(false)

  const canvasSize = useMemo(() => {
    if (layers.length === 0) {
      return { width: 800, height: 600 }
    }
    let maxWidth = 0
    let maxHeight = 0
    for (const layer of layers) {
      if (layer.image) {
        maxWidth = Math.max(maxWidth, layer.image.width)
        maxHeight = Math.max(maxHeight, layer.image.height)
      }
    }
    return { width: maxWidth || 800, height: maxHeight || 600 }
  }, [layers])

  const scheduleRender = useCallback(() => {
    if (pendingRenderRef.current) return
    pendingRenderRef.current = true
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      pendingRenderRef.current = false
      render()
    })
  }, [layers, compareMode, dividerPosition, blinkOpacity, canvasSize])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const { width, height } = canvasSize

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    ctx.clearRect(0, 0, width, height)

    if (layers.length === 0) {
      return
    }

    const readyLayers = layers.filter((l) => l.imageData && l.image)
    if (readyLayers.length === 0) return

    if (compareMode === 'divider' && readyLayers.length >= 2) {
      const dividerX = Math.round(width * dividerPosition)

      const bottomImageData = compositeLayers(readyLayers, width, height, 0, readyLayers.length - 1)
      const topImageData = compositeLayers(readyLayers, width, height, readyLayers.length - 1, readyLayers.length)

      const leftData = bottomImageData.data
      const rightData = topImageData.data
      const output = ctx.createImageData(width, height)
      const outData = output.data

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const sourceData = x < dividerX ? leftData : rightData
          outData[i] = sourceData[i]
          outData[i + 1] = sourceData[i + 1]
          outData[i + 2] = sourceData[i + 2]
          outData[i + 3] = sourceData[i + 3]
        }
      }

      ctx.putImageData(output, 0, 0)
    } else if (compareMode === 'blink' && readyLayers.length >= 2) {
      const bottomImageData = compositeLayers(readyLayers, width, height, 0, readyLayers.length - 1)
      const topImageData = compositeLayers(readyLayers, width, height, readyLayers.length - 1, readyLayers.length)

      const bottomData = bottomImageData.data
      const topData = topImageData.data
      const output = ctx.createImageData(width, height)
      const outData = output.data

      const t = blinkOpacity

      for (let i = 0; i < outData.length; i += 4) {
        const bottomA = bottomData[i + 3] / 255
        const topA = topData[i + 3] / 255

        const blendedA = bottomA * (1 - t) + topA * t

        if (blendedA > 0) {
          outData[i] = (bottomData[i] * bottomA * (1 - t) + topData[i] * topA * t) / blendedA
          outData[i + 1] = (bottomData[i + 1] * bottomA * (1 - t) + topData[i + 1] * topA * t) / blendedA
          outData[i + 2] = (bottomData[i + 2] * bottomA * (1 - t) + topData[i + 2] * topA * t) / blendedA
          outData[i + 3] = blendedA * 255
        }
      }

      ctx.putImageData(output, 0, 0)
    } else {
      const imageData = compositeLayers(readyLayers, width, height)
      ctx.putImageData(imageData, 0, 0)
    }
  }, [layers, compareMode, dividerPosition, blinkOpacity, canvasSize])

  useEffect(() => {
    scheduleRender()
  }, [scheduleRender])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingDivider(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingDivider || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const canvas = canvasRef.current
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const x = e.clientX - canvasRect.left
      const position = Math.max(0, Math.min(1, x / canvasRect.width))
      onDividerPositionChange(position)
    },
    [isDraggingDivider, onDividerPositionChange]
  )

  const handleMouseUp = useCallback(() => {
    setIsDraggingDivider(false)
  }, [])

  useEffect(() => {
    if (isDraggingDivider) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingDivider, handleMouseMove, handleMouseUp])

  return (
    <div className="canvas-container">
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>对比模式:</span>
          <button
            className={`toolbar-btn ${compareMode === 'none' ? 'active' : ''}`}
            onClick={() => onCompareModeChange('none')}
          >
            正常
          </button>
          <button
            className={`toolbar-btn ${compareMode === 'divider' ? 'active' : ''}`}
            disabled={layers.length < 2}
            onClick={() => onCompareModeChange('divider')}
          >
            分割线
          </button>
          <button
            className={`toolbar-btn ${compareMode === 'blink' ? 'active' : ''}`}
            disabled={layers.length < 2}
            onClick={() => onCompareModeChange('blink')}
          >
            闪烁对比
          </button>
        </div>
      </div>

      <div className="canvas-wrapper" ref={containerRef}>
        {layers.length === 0 ? (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>请在左侧上传图片开始使用</p>
          </div>
        ) : (
          <>
            <canvas ref={canvasRef} className="canvas-element" />
            {compareMode === 'divider' && (
              <div
                className="divider-line"
                style={{ left: `${dividerPosition * 100}%` }}
                onMouseDown={handleDividerMouseDown}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Canvas
