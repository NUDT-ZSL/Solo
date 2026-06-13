import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import type { Layer, CompareMode } from './types'
import { compositeLayers } from './compositor'

interface CanvasProps {
  layers: Layer[]
  compareMode: CompareMode
  dividerPosition: number
  blinkOpacity: number
  isDraggingDivider: boolean
  onCompareModeChange: (mode: CompareMode) => void
  onDividerMouseDown: (e: React.MouseEvent) => void
  setCanvasWrapperRef: (el: HTMLDivElement | null) => void
  setCanvasRef: (el: HTMLCanvasElement | null) => void
}

const Canvas: React.FC<CanvasProps> = ({
  layers,
  compareMode,
  dividerPosition,
  blinkOpacity,
  isDraggingDivider,
  onCompareModeChange,
  onDividerMouseDown,
  setCanvasWrapperRef,
  setCanvasRef,
}) => {
  const pendingRenderRef = useRef(false)
  const rafRef = useRef<number>(0)
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const mergeCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    localCanvasRef.current = el
    setCanvasRef(el)
  }, [setCanvasRef])

  const canvasSize = useMemo(() => {
    if (layers.length === 0) return { width: 800, height: 600 }
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

  const render = useCallback(() => {
    const canvas = localCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const { width, height } = canvasSize
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    ctx.clearRect(0, 0, width, height)

    if (layers.length === 0) return

    const readyLayers = layers.filter((l) => l.imageData && l.image)
    if (readyLayers.length === 0) return

    if (compareMode === 'divider' && readyLayers.length >= 2) {
      const dividerX = Math.round(width * dividerPosition)
      const bottomImg = compositeLayers(readyLayers, width, height, 0, readyLayers.length - 1)
      const topImg = compositeLayers(readyLayers, width, height, readyLayers.length - 1, readyLayers.length)
      const left = bottomImg.data
      const right = topImg.data
      const output = ctx.createImageData(width, height)
      const out = output.data

      for (let y = 0; y < height; y++) {
        const rowOffset = y * width * 4
        for (let x = 0; x < width; x++) {
          const i = rowOffset + x * 4
          const src = x < dividerX ? left : right
          out[i] = src[i]
          out[i + 1] = src[i + 1]
          out[i + 2] = src[i + 2]
          out[i + 3] = src[i + 3]
        }
      }
      ctx.putImageData(output, 0, 0)
    } else if (compareMode === 'blink' && readyLayers.length >= 2) {
      const bottomImg = compositeLayers(readyLayers, width, height, 0, readyLayers.length - 1)
      const topImg = compositeLayers(readyLayers, width, height, readyLayers.length - 1, readyLayers.length)
      const bottom = bottomImg.data
      const top = topImg.data
      const output = ctx.createImageData(width, height)
      const out = output.data
      const t = blinkOpacity

      for (let i = 0; i < out.length; i += 4) {
        const bA = bottom[i + 3] / 255
        const tA = top[i + 3] / 255
        const blendedA = bA * (1 - t) + tA * t
        if (blendedA > 0) {
          out[i] = (bottom[i] * bA * (1 - t) + top[i] * tA * t) / blendedA
          out[i + 1] = (bottom[i + 1] * bA * (1 - t) + top[i + 1] * tA * t) / blendedA
          out[i + 2] = (bottom[i + 2] * bA * (1 - t) + top[i + 2] * tA * t) / blendedA
          out[i + 3] = blendedA * 255
        }
      }
      ctx.putImageData(output, 0, 0)
    } else {
      const imageData = compositeLayers(readyLayers, width, height)
      ctx.putImageData(imageData, 0, 0)
    }
  }, [layers, compareMode, dividerPosition, blinkOpacity, canvasSize, localCanvasRef])

  useEffect(() => {
    if (pendingRenderRef.current) return
    pendingRenderRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      pendingRenderRef.current = false
      render()
    })
  }, [render])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

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

      <div className="canvas-wrapper" ref={setCanvasWrapperRef}>
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
            <canvas ref={mergeCanvasRef} className="canvas-element" />
            {compareMode === 'divider' && (
              <div
                className={`divider-line ${isDraggingDivider ? 'divider-line-active' : ''}`}
                style={{ left: `${dividerPosition * 100}%` }}
                onMouseDown={onDividerMouseDown}
              >
                <div className="divider-handle">
                  <svg width="10" height="30" viewBox="0 0 10 30">
                    <circle cx="3" cy="8" r="1.5" fill="#999" />
                    <circle cx="7" cy="8" r="1.5" fill="#999" />
                    <circle cx="3" cy="15" r="1.5" fill="#999" />
                    <circle cx="7" cy="15" r="1.5" fill="#999" />
                    <circle cx="3" cy="22" r="1.5" fill="#999" />
                    <circle cx="7" cy="22" r="1.5" fill="#999" />
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Canvas
