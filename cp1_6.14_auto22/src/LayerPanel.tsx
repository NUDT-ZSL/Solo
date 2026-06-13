import React, { useState, useRef, useCallback } from 'react'
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
  onLayerReorder,
  onBlendModeChange,
  onOpacityChange,
  onLayerDelete,
  maxLayers,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = draggedIndex
    if (fromIndex !== null && fromIndex !== toIndex) {
      onLayerReorder(fromIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleBlendModeChange = useCallback((id: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    onBlendModeChange(id, e.target.value as BlendMode)
  }, [onBlendModeChange])

  const handleOpacityChange = useCallback((id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    onOpacityChange(id, parseInt(e.target.value, 10))
  }, [onOpacityChange])

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onLayerDelete(id)
  }, [onLayerDelete])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">L</div>
        <h1>LayerLens</h1>
      </div>

      <div
        className="upload-zone"
        onClick={handleUploadClick}
        style={{ opacity: layers.length >= maxLayers ? 0.5 : 1 }}
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

      <div className="layer-list">
        {[...layers].reverse().map((layer, displayIndex) => {
          const actualIndex = layers.length - 1 - displayIndex
          return (
            <div
              key={layer.id}
              className={`layer-card ${selectedLayerId === layer.id ? 'selected' : ''} ${
                draggedIndex === actualIndex ? 'dragging' : ''
              } ${dragOverIndex === actualIndex ? 'drag-over' : ''}`}
              onClick={() => onLayerSelect(layer.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, actualIndex)}
              onDragOver={(e) => handleDragOver(e, actualIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, actualIndex)}
              onDragEnd={handleDragEnd}
            >
              <button className="layer-delete" onClick={(e) => handleDelete(e, layer.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="layer-top">
                <div className="drag-handle">
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
