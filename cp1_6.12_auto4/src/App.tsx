import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Shape, ShapeType } from './types'
import { GraphicPanel } from './GraphicPanel'
import { PropertyPanel } from './PropertyPanel'
import { Editor } from './Editor'
import { HistoryManager } from './utils/history'
import { exportGraphicsToSvg, downloadSvgFile, parseSvgToGraphics } from './utils/svgExport'
import './styles.css'

const STORAGE_KEY = 'svg_editor_state'

interface SavedState {
  graphics: Shape[]
  zoom: number
  panX: number
  panY: number
  timestamp: number
}

const App: React.FC = () => {
  const [graphics, setGraphics] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTool, setCurrentTool] = useState<ShapeType>('select')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [showRestoreToast, setShowRestoreToast] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileProperty, setShowMobileProperty] = useState(false)

  const historyRef = useRef(new HistoryManager<Shape[]>(20))
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state: SavedState = JSON.parse(saved)
        if (state.graphics && state.graphics.length > 0) {
          setGraphics(state.graphics)
          setZoom(state.zoom || 1)
          setPanX(state.panX || 0)
          setPanY(state.panY || 0)
          setShowRestoreToast(true)
          setTimeout(() => setShowRestoreToast(false), 3000)
        }
      }
    } catch (e) {
      console.error('Failed to restore state:', e)
    }
  }, [])

  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      try {
        const state: SavedState = {
          graphics,
          zoom,
          panX,
          panY,
          timestamp: Date.now()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (e) {
        console.error('Failed to autosave:', e)
      }
    }, 10000)

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current)
      }
    }
  }, [graphics, zoom, panX, panY])

  const commitHistory = useCallback(() => {
    historyRef.current.push(graphics)
  }, [graphics])

  const handleGraphicsChange = useCallback((newGraphics: Shape[]) => {
    setGraphics(newGraphics)
  }, [])

  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id && isMobile) {
      setShowMobileProperty(true)
    }
  }, [isMobile])

  const handleCanvasStateChange = useCallback((newZoom: number, newPanX: number, newPanY: number) => {
    setZoom(newZoom)
    setPanX(newPanX)
    setPanY(newPanY)
  }, [])

  const handleShapeUpdate = useCallback((updatedShape: Shape) => {
    commitHistory()
    setGraphics(graphics.map((s) => (s.id === updatedShape.id ? updatedShape : s)))
  }, [graphics, commitHistory])

  const handleDeleteShape = useCallback((id: string) => {
    commitHistory()
    setGraphics(graphics.filter((s) => s.id !== id))
    setSelectedId(null)
    if (isMobile) setShowMobileProperty(false)
  }, [graphics, isMobile, commitHistory])

  const handleUndo = useCallback(() => {
    const previous = historyRef.current.undo(graphics)
    if (previous) {
      setGraphics(previous)
    }
  }, [graphics])

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo(graphics)
    if (next) {
      setGraphics(next)
    }
  }, [graphics])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && ((e.key === 'y') || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        if (e.key === 'v' || e.key === 'V') setCurrentTool('select')
        else if (e.key === 'r' || e.key === 'R') setCurrentTool('rect')
        else if (e.key === 'c' || e.key === 'C') setCurrentTool('circle')
        else if (e.key === 'l' || e.key === 'L') setCurrentTool('line')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const handleExport = useCallback(() => {
    const svgContent = exportGraphicsToSvg(graphics)
    downloadSvgFile(svgContent, `svg_editor_${Date.now()}.svg`)
  }, [graphics])

  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const imported = parseSvgToGraphics(text)
      if (imported.length > 0) {
        commitHistory()
        setGraphics([...graphics, ...imported])
      }
    } catch (e) {
      console.error('Failed to import SVG:', e)
      alert('导入 SVG 失败，请确保文件格式正确')
    }
  }, [graphics, commitHistory])

  const selectedShape = graphics.find((s) => s.id === selectedId) || null

  return (
    <div className="app">
      <GraphicPanel
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onExport={handleExport}
        onImport={handleImport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
      />

      <Editor
        graphics={graphics}
        selectedId={selectedId}
        currentTool={currentTool}
        zoom={zoom}
        panX={panX}
        panY={panY}
        onGraphicsChange={handleGraphicsChange}
        onSelectionChange={handleSelectionChange}
        onCanvasStateChange={handleCanvasStateChange}
        onCommitChange={commitHistory}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToolChange={setCurrentTool}
      />

      {!isMobile && (
        <PropertyPanel
          selectedShape={selectedShape}
          onShapeUpdate={handleShapeUpdate}
          onDeleteShape={handleDeleteShape}
          isMobile={false}
        />
      )}

      {isMobile && showMobileProperty && selectedShape && (
        <PropertyPanel
          selectedShape={selectedShape}
          onShapeUpdate={handleShapeUpdate}
          onDeleteShape={handleDeleteShape}
          isMobile={true}
          onClose={() => setShowMobileProperty(false)}
        />
      )}

      {showRestoreToast && (
        <div className="toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          已恢复上次编辑
        </div>
      )}
    </div>
  )
}

export default App
