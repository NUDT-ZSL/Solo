import React, { useState, useCallback, useEffect } from 'react'
import LayerPanel from './LayerPanel'
import Canvas from './Canvas'
import { useCompareMode } from './useCompareMode'
import type { Layer, BlendMode } from './types'
import { getLayerImageData } from './compositor'

const MAX_LAYERS = 6

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  const {
    compareMode,
    dividerPosition,
    blinkOpacity,
    isDraggingDivider,
    setCompareMode,
    handleDividerMouseDown,
    setCanvasWrapperRef,
    setCanvasRef,
  } = useCompareMode(layers.length)

  const updateLayerImageData = useCallback((layer: Layer, canvasWidth: number, canvasHeight: number): Layer => {
    if (!layer.image) return layer
    const imageData = getLayerImageData(layer.image, canvasWidth, canvasHeight)
    return { ...layer, imageData }
  }, [])

  const recalcAllImageData = useCallback((layerList: Layer[]): Layer[] => {
    let maxWidth = 0
    let maxHeight = 0
    for (const layer of layerList) {
      if (layer.image) {
        maxWidth = Math.max(maxWidth, layer.image.width)
        maxHeight = Math.max(maxHeight, layer.image.height)
      }
    }
    if (maxWidth === 0 || maxHeight === 0) return layerList
    return layerList.map((layer) => updateLayerImageData(layer, maxWidth, maxHeight))
  }, [updateLayerImageData])

  const processFile = useCallback((file: File): Promise<Layer | null> => {
    return new Promise((resolve) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        resolve(null)
        return
      }

      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          id: generateId(),
          name: file.name,
          image: img,
          imageData: null,
          blendMode: 'normal',
          opacity: 100,
          width: img.width,
          height: img.height,
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  }, [])

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      const slotsAvailable = MAX_LAYERS - layers.length
      if (slotsAvailable <= 0) return

      const filesToProcess = Array.from(files).slice(0, slotsAvailable)
      const newLayers: Layer[] = []

      for (const file of filesToProcess) {
        const layer = await processFile(file)
        if (layer) newLayers.push(layer)
      }

      if (newLayers.length > 0) {
        setLayers((prev) => recalcAllImageData([...prev, ...newLayers]))
        setSelectedLayerId((prev) => prev ?? newLayers[0].id)
      }
    },
    [layers.length, processFile, recalcAllImageData]
  )

  const handleLayerSelect = useCallback((id: string) => {
    setSelectedLayerId(id)
  }, [])

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const newLayers = [...prev]
      const [removed] = newLayers.splice(fromIndex, 1)
      newLayers.splice(toIndex, 0, removed)
      return newLayers
    })
  }, [])

  const handleBlendModeChange = useCallback((id: string, mode: BlendMode) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, blendMode: mode } : layer)))
  }, [])

  const handleOpacityChange = useCallback((id: string, opacity: number) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, opacity } : layer)))
  }, [])

  const handleLayerDelete = useCallback((id: string) => {
    setLayers((prev) => recalcAllImageData(prev.filter((layer) => layer.id !== id)))
    setSelectedLayerId((prev) => (prev === id ? null : prev))
  }, [recalcAllImageData])

  useEffect(() => {
    if (layers.length === 0) return
    const needsUpdate = layers.some((l) => !l.imageData)
    if (needsUpdate) {
      setLayers((prev) => recalcAllImageData(prev))
    }
  }, [layers.length, recalcAllImageData, layers])

  return (
    <div className="app-container">
      <LayerPanel
        layers={layers}
        selectedLayerId={selectedLayerId}
        onFileUpload={handleFileUpload}
        onLayerSelect={handleLayerSelect}
        onLayerReorder={handleLayerReorder}
        onBlendModeChange={handleBlendModeChange}
        onOpacityChange={handleOpacityChange}
        onLayerDelete={handleLayerDelete}
        maxLayers={MAX_LAYERS}
      />
      <Canvas
        layers={layers}
        compareMode={compareMode}
        dividerPosition={dividerPosition}
        blinkOpacity={blinkOpacity}
        isDraggingDivider={isDraggingDivider}
        onCompareModeChange={setCompareMode}
        onDividerMouseDown={handleDividerMouseDown}
        setCanvasWrapperRef={setCanvasWrapperRef}
        setCanvasRef={setCanvasRef}
      />
    </div>
  )
}

export default App
