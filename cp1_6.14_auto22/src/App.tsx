import React, { useState, useCallback, useEffect, useRef } from 'react'
import LayerPanel from './LayerPanel'
import Canvas from './Canvas'
import type { Layer, BlendMode, CompareMode } from './types'
import { getLayerImageData } from './compositor'

const MAX_LAYERS = 6

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState<CompareMode>('none')
  const [dividerPosition, setDividerPosition] = useState(0.5)
  const [blinkOpacity, setBlinkOpacity] = useState(0)
  
  const blinkIntervalRef = useRef<number | null>(null)
  const blinkStartTimeRef = useRef<number>(0)
  const blinkPhaseRef = useRef(0)

  const selectedLayerIndex = layers.findIndex((l) => l.id === selectedLayerId)

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
        
        const newLayer: Layer = {
          id: generateId(),
          name: file.name,
          image: img,
          imageData: null,
          blendMode: 'normal',
          opacity: 100,
          width: img.width,
          height: img.height,
        }
        
        resolve(newLayer)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  }, [])

  const updateLayerImageData = useCallback((layer: Layer, canvasWidth: number, canvasHeight: number): Layer => {
    if (!layer.image) return layer
    const imageData = getLayerImageData(layer.image, canvasWidth, canvasHeight)
    return { ...layer, imageData }
  }, [])

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      const slotsAvailable = MAX_LAYERS - layers.length
      if (slotsAvailable <= 0) return

      const filesToProcess = Array.from(files).slice(0, slotsAvailable)
      const newLayers: Layer[] = []

      for (const file of filesToProcess) {
        const layer = await processFile(file)
        if (layer) {
          newLayers.push(layer)
        }
      }

      if (newLayers.length > 0) {
        setLayers((prev) => {
          const updated = [...prev, ...newLayers]
          
          let maxWidth = 0
          let maxHeight = 0
          for (const layer of updated) {
            if (layer.image) {
              maxWidth = Math.max(maxWidth, layer.image.width)
              maxHeight = Math.max(maxHeight, layer.image.height)
            }
          }
          
          return updated.map((layer) => updateLayerImageData(layer, maxWidth, maxHeight))
        })
        setSelectedLayerId((prev) => prev ?? newLayers[0].id)
      }
    },
    [layers.length, processFile, updateLayerImageData]
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
    setLayers((prev) => {
      const newLayers = prev.filter((layer) => layer.id !== id)
      
      if (newLayers.length > 0) {
        let maxWidth = 0
        let maxHeight = 0
        for (const layer of newLayers) {
          if (layer.image) {
            maxWidth = Math.max(maxWidth, layer.image.width)
            maxHeight = Math.max(maxHeight, layer.image.height)
          }
        }
        
        return newLayers.map((layer) => updateLayerImageData(layer, maxWidth, maxHeight))
      }
      
      return newLayers
    })
    setSelectedLayerId((prev) => (prev === id ? null : prev))
    setCompareMode((prev) => (layers.length <= 2 ? 'none' : prev))
  }, [layers.length, updateLayerImageData])

  const handleCompareModeChange = useCallback((mode: CompareMode) => {
    if (mode === 'blink' && layers.length >= 2) {
      setCompareMode('blink')
      blinkStartTimeRef.current = Date.now()
      blinkPhaseRef.current = 0
      setBlinkOpacity(0)
    } else if (mode === 'divider' && layers.length >= 2) {
      setCompareMode('divider')
    } else {
      setCompareMode('none')
    }
  }, [layers.length])

  useEffect(() => {
    if (compareMode === 'blink') {
      const animate = () => {
        const elapsed = Date.now() - blinkStartTimeRef.current
        const duration = 12000
        
        if (elapsed >= duration) {
          setCompareMode('none')
          setBlinkOpacity(0)
          return
        }
        
        const cycleTime = 500
        const cycleProgress = (elapsed % cycleTime) / cycleTime
        
        if (cycleProgress < 0.6) {
          const fadeProgress = Math.min(1, cycleProgress / 0.3)
          setBlinkOpacity(blinkPhaseRef.current === 0 ? fadeProgress : 1 - fadeProgress)
        } else if (cycleProgress < 0.8) {
          setBlinkOpacity(blinkPhaseRef.current === 0 ? 1 : 0)
        } else {
          const fadeProgress = Math.min(1, (cycleProgress - 0.8) / 0.2)
          setBlinkOpacity(blinkPhaseRef.current === 0 ? 1 - fadeProgress : fadeProgress)
          
          if (cycleProgress >= 0.99) {
            blinkPhaseRef.current = blinkPhaseRef.current === 0 ? 1 : 0
          }
        }
        
        blinkIntervalRef.current = requestAnimationFrame(animate) as unknown as number
      }
      
      blinkIntervalRef.current = requestAnimationFrame(animate) as unknown as number
      
      return () => {
        if (blinkIntervalRef.current) {
          cancelAnimationFrame(blinkIntervalRef.current)
        }
      }
    } else {
      if (blinkIntervalRef.current) {
        cancelAnimationFrame(blinkIntervalRef.current)
      }
      setBlinkOpacity(0)
    }
  }, [compareMode])

  useEffect(() => {
    if (layers.length > 0) {
      let maxWidth = 0
      let maxHeight = 0
      for (const layer of layers) {
        if (layer.image) {
          maxWidth = Math.max(maxWidth, layer.image.width)
          maxHeight = Math.max(maxHeight, layer.image.height)
        }
      }
      
      const needsUpdate = layers.some(
        (l) => !l.imageData || (l.image && (l.image.width !== maxWidth || l.image.height !== maxHeight))
      )
      
      if (needsUpdate) {
        setLayers((prev) => prev.map((layer) => updateLayerImageData(layer, maxWidth, maxHeight)))
      }
    }
  }, [layers.length, updateLayerImageData])

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
        selectedLayerIndex={selectedLayerIndex}
        compareMode={compareMode}
        dividerPosition={dividerPosition}
        onDividerPositionChange={setDividerPosition}
        onCompareModeChange={handleCompareModeChange}
        blinkOpacity={blinkOpacity}
      />
    </div>
  )
}

export default App
