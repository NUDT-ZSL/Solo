import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { Layer, BlendMode } from './types'
import { BLEND_MODES } from './types'

interface LayerPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  onFileUpload: (files: FileList) => void
  onLayerSelect: (id: string) => void
  onLayerReorder: (fromIndex: number, toIndex: number) => void
  onBlendModeChange: (id: string, mode: BlendMode) => void
  onOpacityChange: (id: string, opacity: number) => void
  onLayerDelete: (id: string) => void
  maxLayers: number
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  onFileUpload,
  onLayerSelect,
  onBlendModeChange,
  onOpacityChange,
  onLayerDelete,
  onLayerReorder,
  maxLayers,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [dragState, setDragState] = useState<{
    isDragging: boolean
    dragIndex: number | null
    overIndex: number | null
    startY: number
    offsetY: number
  }>({
    isDragging: false,
    dragIndex: null,
    overIndex: null,
    startY: 0,
    offsetY: 0,
  })

  const handleUploadClick = () => {
    if (layers.length < maxLayers) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileUpload(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault()
      e.stopPropagation()
      setDragState({
        isDragging: true,
        dragIndex: index,
        overIndex: null,
        startY: e.clientY,
        offsetY: 0,
      })
    },
    []
  )

  useEffect(() => {
    if (!dragState.isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const offsetY = e.clientY - dragState.startY

      if (dragState.dragIndex === null) return
      const cardElements = listRef.current?.querySelectorAll('.layer-card')
      if (!cardElements) return

      let overIndex: number | null = null
      for (let i = 0; i < cardElements.length; i++) {
        const rect = cardElements[i].getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (e.clientY < midY) {
          overIndex = layers.length - 1 - i
          break
        }
      }
      if (overIndex === null && cardElements.length > 0) {
        overIndex = 0
      }

      setDragState((prev) => ({
        ...prev,
        offsetY,
        overIndex,
      }))
    }

    const handleMouseUp = () => {
      if (dragState.dragIndex !== null && dragState.overIndex !== null && dragState.dragIndex !== dragState.overIndex) {
        onLayerReorder(dragState.dragIndex, dragState.overIndex)
      }
      setDragState({
        isDragging: false,
        dragIndex: null,
        overIndex: null,
        startY: 0,
        offsetY: 0,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState.isDragging, dragState.dragIndex, dragState.overIndex, dragState.startY, layers.length, onLayerReorder])

  const handleBlendModeChange = useCallback(
    (id: string, e: React.ChangeEvent<HTMLSelectElement>) => {
      onBlendModeChange(id, e.target.value as BlendMode)
    },
    [onBlendModeChange]
  )

  const handleOpacityChange = useCallback(
    (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      onOpacityChange(id, parseInt(e.target.value, 10))
    },
    [onOpacityChange]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      onLayerDelete(id)
    },
    [onLayerDelete]
  )

  const displayLayers = [...layers].reverse()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">L</div>
        <h1>LayerLens</h1>
      </div>

      <div
        className="upload-zone"
        onClick={handleUploadClick}
        style={{ opacity: layers.length >= maxLayers ? 0.5 : 1, cursor: layers.length >= maxLayers ? 'not-allowed' : 'pointer' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {layers.length >= maxLayers
            ? `最多${maxLayers}张图片`
            : `点击上传图片 (${layers.length}/${maxLayers})`}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
        />
      </div>

      <div className="layer-list" ref={listRef}>
        {displayLayers.map((layer, displayIndex) => {
          const actualIndex = layers.length - 1 - displayIndex
          const isBeingDragged = dragState.isDragging && dragState.dragIndex === actualIndex
          const isDragOver = dragState.isDragging && dragState.overIndex === actualIndex && dragState.dragIndex !== actualIndex

          return (
            <div
              key={layer.id}
              className={`layer-card ${selectedLayerId === layer.id ? 'selected' : ''} ${
                isBeingDragged ? 'dragging' : ''
              } ${isDragOver ? 'drag-over' : ''}`}
              style={isBeingDragged ? { transform: `translateY(${dragState.offsetY}px)`, zIndex: 100 } : undefined}
              onClick={() => onLayerSelect(layer.id)}
            >
              {isDragOver && (
                <div className="drag-placeholder" />
              )}

              <button className="layer-delete" onClick={(e) => handleDelete(e, layer.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="layer-top">
                <div
                  className="drag-handle"
                  onMouseDown={(e) => handleHandleMouseDown(e, actualIndex)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>

                <div className="layer-thumbnail">
                  {layer.image ? (
                    <img src={layer.image.src} alt={layer.name} />
                  ) : (
                    <div className="thumbnail-placeholder">加载中...</div>
                  )}
                </div>

                <div className="layer-info">
                  <div className="layer-filename" title={layer.name}>
                    {layer.name}
                  </div>
                  <div className="layer-controls">
                    <select
                      className="blend-mode-select"
                      value={layer.blendMode}
                      onChange={(e) => handleBlendModeChange(layer.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {BLEND_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                    <div className="opacity-control">
                      <input
                        type="range"
                        className="opacity-slider"
                        min="0"
                        max="100"
                        value={layer.opacity}
                        onChange={(e) => handleOpacityChange(layer.id, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="opacity-value">{layer.opacity}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default LayerPanel
