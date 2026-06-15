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

function saveToLocalStorage(state: SavedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('localStorage 存储空间已满，清理旧数据后重试')
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        return true
      } catch {
        console.error('localStorage 写入失败，即使清理后仍无法保存')
        return false
      }
    }
    console.error('localStorage 写入失败:', e)
    return false
  }
}

function loadFromLocalStorage(): SavedState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as SavedState
    }
  } catch (e) {
    console.error('localStorage 读取失败:', e)
  }
  return null
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

  const graphicsRef = useRef(graphics)
  const zoomRef = useRef(zoom)
  const panXRef = useRef(panX)
  const panYRef = useRef(panY)

  useEffect(() => { graphicsRef.current = graphics }, [graphics])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panXRef.current = panX }, [panX])
  useEffect(() => { panYRef.current = panY }, [panY])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const state = loadFromLocalStorage()
    if (state && state.graphics && state.graphics.length > 0) {
      setGraphics(state.graphics)
      setZoom(state.zoom || 1)
      setPanX(state.panX || 0)
      setPanY(state.panY || 0)
      setShowRestoreToast(true)
      setTimeout(() => setShowRestoreToast(false), 3000)
    }
  }, [])

  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      saveToLocalStorage({
        graphics: graphicsRef.current,
        zoom: zoomRef.current,
        panX: panXRef.current,
        panY: panYRef.current,
        timestamp: Date.now()
      })
    }, 10000)

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [])

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
