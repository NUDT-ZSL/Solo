import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LevelObject,
  ObjectType,
  LevelData,
  GameState,
  GRID_SIZE,
  TrianglePlatform,
  MovingPlatform
} from '../core/types'
import {
  createLevelData,
  createObject,
  HistoryManager,
  findObjectById,
  updateObjectInList,
  removeObjectFromList,
  downloadLevelFile,
  readLevelFile
} from '../core/LevelManager'
import { PhysicsEngine } from '../engine/PhysicsEngine'

interface ToolItem {
  type: ObjectType
  name: string
  icon: string
}

const TOOL_ITEMS: ToolItem[] = [
  { type: 'platform-rect', name: '矩形平台', icon: '▬' },
  { type: 'platform-triangle', name: '三角形平台', icon: '▲' },
  { type: 'trap-spike', name: '尖刺陷阱', icon: '⚔' },
  { type: 'trap-moving', name: '移动平台', icon: '↔' },
  { type: 'player-start', name: '玩家起点', icon: '●' },
  { type: 'goal-flag', name: '终点旗帜', icon: '⚑' }
]

const historyManager = new HistoryManager()

export default function LevelEditor() {
  const [levelData, setLevelData] = useState<LevelData>(() => createLevelData())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [propertyPanelVisible, setPropertyPanelVisible] = useState(false)
  const [propertyPanelClosing, setPropertyPanelClosing] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isWin, setIsWin] = useState(false)
  const [objectsLoaded, setObjectsLoaded] = useState(false)
  const [isDraggingExisting, setIsDraggingExisting] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 700 })
  const [isMobile, setIsMobile] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const physicsCanvasRef = useRef<HTMLCanvasElement>(null)
  const physicsEngineRef = useRef<PhysicsEngine | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draggedToolRef = useRef<ObjectType | null>(null)

  const selectedObject = selectedId ? findObjectById(levelData.objects, selectedId) : null

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 750)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [isTestMode])

  useEffect(() => {
    if (selectedObject) {
      setPropertyPanelVisible(true)
      setPropertyPanelClosing(false)
    } else {
      if (propertyPanelVisible) {
        setPropertyPanelClosing(true)
        setTimeout(() => {
          setPropertyPanelVisible(false)
          setPropertyPanelClosing(false)
        }, 200)
      }
    }
  }, [selectedId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTestMode) {
        if (e.key === 'Escape') {
          exitTestMode()
        }
        return
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          handleUndo()
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault()
          handleRedo()
        } else if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !isTestMode) {
          handleDeleteSelected()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTestMode, selectedId, levelData.objects])

  const pushHistory = useCallback((objects: LevelObject[]) => {
    historyManager.pushSnapshot(objects)
  }, [])

  const handleUndo = useCallback(() => {
    const result = historyManager.undo(levelData.objects)
    if (result) {
      setLevelData((prev) => ({ ...prev, objects: result }))
      setSelectedId(null)
    }
  }, [levelData.objects])

  const handleRedo = useCallback(() => {
    const result = historyManager.redo(levelData.objects)
    if (result) {
      setLevelData((prev) => ({ ...prev, objects: result }))
      setSelectedId(null)
    }
  }, [levelData.objects])

  const handleSave = useCallback(() => {
    downloadLevelFile(levelData)
  }, [levelData])

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const loaded = await readLevelFile(file)
      pushHistory(levelData.objects)
      setLevelData(loaded)
      setSelectedId(null)
      setObjectsLoaded(false)
      setTimeout(() => setObjectsLoaded(true), 50)
    } catch (err) {
      alert('加载关卡失败：' + (err as Error).message)
    }

    e.target.value = ''
  }, [levelData.objects, pushHistory])

  const handleToolDragStart = (type: ObjectType) => {
    draggedToolRef.current = type
  }

  const handleToolDragEnd = () => {
    draggedToolRef.current = null
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedToolRef.current || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

    const newObj = createObject(draggedToolRef.current, x, y)
    pushHistory(levelData.objects)
    setLevelData((prev) => ({
      ...prev,
      objects: [...prev.objects, newObj]
    }))
    setSelectedId(newObj.id)
    draggedToolRef.current = null
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDraggingExisting || isTestMode) return
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('grid-overlay')) {
      setSelectedId(null)
    }
  }

  const handleObjectMouseDown = (e: React.MouseEvent, obj: LevelObject) => {
    if (isTestMode) return
    e.stopPropagation()
    setSelectedId(obj.id)

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    setDragOffset({
      x: clickX - obj.x,
      y: clickY - obj.y
    })
    setIsDraggingExisting(true)
    pushHistory(levelData.objects)
  }

  useEffect(() => {
    if (!isDraggingExisting) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect || !selectedId) return

      const x = e.clientX - rect.left - dragOffset.x
      const y = e.clientY - rect.top - dragOffset.y

      setLevelData((prev) => ({
        ...prev,
        objects: updateObjectInList(prev.objects, selectedId, { x, y })
      }))
    }

    const handleMouseUp = () => {
      setIsDraggingExisting(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingExisting, selectedId, dragOffset])

  const handleDeleteSelected = () => {
    if (!selectedId) return
    pushHistory(levelData.objects)
    setLevelData((prev) => ({
      ...prev,
      objects: removeObjectFromList(prev.objects, selectedId)
    }))
    setSelectedId(null)
  }

  const handleUpdateProperty = (key: string, value: number | string) => {
    if (!selectedId) return
    pushHistory(levelData.objects)
    setLevelData((prev) => ({
      ...prev,
      objects: updateObjectInList(prev.objects, selectedId, { [key]: value })
    }))
  }

  const enterTestMode = () => {
    setIsTestMode(true)
    setSelectedId(null)
    setIsWin(false)
    setTimeout(() => {
      if (physicsCanvasRef.current) {
        const rect = physicsCanvasRef.current.getBoundingClientRect()
        physicsEngineRef.current = new PhysicsEngine({
          onStateUpdate: (state) => setGameState(state),
          onDeath: () => {},
          onWin: () => setIsWin(true)
        })
        physicsEngineRef.current.init(
          physicsCanvasRef.current,
          rect.width,
          rect.height,
          levelData.objects
        )
        physicsEngineRef.current.start()
      }
    }, 50)
  }

  const exitTestMode = () => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.destroy()
      physicsEngineRef.current = null
    }
    setIsTestMode(false)
    setGameState(null)
    setIsWin(false)
  }

  useEffect(() => {
    if (!isTestMode) return

    const handleResize = () => {
      if (physicsEngineRef.current && physicsCanvasRef.current) {
        const rect = physicsCanvasRef.current.getBoundingClientRect()
        physicsEngineRef.current.resize(rect.width, rect.height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isTestMode])

  useEffect(() => {
    return () => {
      if (physicsEngineRef.current) {
        physicsEngineRef.current.destroy()
      }
    }
  }, [])

  const renderObject = (obj: LevelObject, index: number) => {
    const isSelected = selectedId === obj.id
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: obj.x - obj.width / 2,
      top: obj.y - obj.height / 2,
      width: obj.width,
      height: obj.height,
      transform: `rotate(${obj.rotation}deg)`,
      transformOrigin: 'center center',
      cursor: isTestMode ? 'default' : 'move',
      opacity: objectsLoaded ? 1 : 0,
      transition: objectsLoaded ? 'opacity 0.3s ease-out' : 'none',
      transitionDelay: `${index * 0.02}s`,
      zIndex: isSelected ? 10 : 1
    }

    const selectedOverlay = isSelected && !isTestMode ? (
      <div
        className="selected-overlay"
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
          border: '2px dashed #FFD700',
          borderRadius: 4,
          pointerEvents: 'none',
          animation: 'selected-blink 0.3s ease-in-out infinite'
        }}
      />
    ) : null

    switch (obj.type) {
      case 'platform-rect':
        return (
          <div
            key={obj.id}
            style={{
              ...baseStyle,
              backgroundColor: obj.color,
              borderRadius: 4,
              boxShadow: `0 2px 8px ${obj.color}50`
            }}
            onMouseDown={(e) => handleObjectMouseDown(e, obj)}
          >
            {selectedOverlay}
          </div>
        )

      case 'platform-triangle': {
        const tri = obj as TrianglePlatform
        const baseW = tri.baseWidth || tri.width
        const triH = tri.triangleHeight || tri.height
        return (
          <div
            key={obj.id}
            style={{
              ...baseStyle,
              width: baseW,
              height: triH,
              left: obj.x - baseW / 2,
              top: obj.y - triH / 2,
              backgroundColor: 'transparent'
            }}
            onMouseDown={(e) => handleObjectMouseDown(e, obj)}
          >
            <svg
              width={baseW}
              height={triH}
              viewBox={`0 0 ${baseW} ${triH}`}
              style={{ display: 'block' }}
            >
              <polygon
                points={`${baseW / 2},0 ${baseW},${triH} 0,${triH}`}
                fill={obj.color}
                stroke={obj.color}
                strokeWidth="1"
                style={{ filter: `drop-shadow(0 2px 4px ${obj.color}50)` }}
              />
            </svg>
            {selectedOverlay}
          </div>
        )
      }

      case 'trap-spike': {
        const spikeCount = Math.max(3, Math.floor(obj.width / 20))
        const spikeWidth = obj.width / spikeCount
        return (
          <div
            key={obj.id}
            style={{
              ...baseStyle,
              backgroundColor: 'transparent'
            }}
            onMouseDown={(e) => handleObjectMouseDown(e, obj)}
          >
            <svg
              width={obj.width}
              height={obj.height}
              viewBox={`0 0 ${obj.width} ${obj.height}`}
              style={{ display: 'block' }}
            >
              {Array.from({ length: spikeCount }).map((_, i) => (
                <polygon
                  key={i}
                  points={`${i * spikeWidth},${obj.height} ${(i + 0.5) * spikeWidth},0 ${(i + 1) * spikeWidth},${obj.height}`}
                  fill={obj.color}
                  stroke="#8B0000"
                  strokeWidth="1"
                />
              ))}
            </svg>
            {selectedOverlay}
          </div>
        )
      }

      case 'trap-moving':
        return (
          <div
            key={obj.id}
            style={{
              ...baseStyle,
              backgroundColor: obj.color,
              borderRadius: 6,
              border: '2px solid #8B5CF6',
              boxShadow: `0 0 12px ${obj.color}80`
            }}
            onMouseDown={(e) => handleObjectMouseDown(e, obj)}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 8,
                right: 8,
                height: 4,
                transform: 'translateY(-50%)',
                background: 'repeating-linear-gradient(90deg, #fff 0, #fff 6px, transparent 6px, transparent 12px)',
                opacity: 0.5
              }}
            />
            {selectedOverlay}
          </div>
        )

      case 'player-start':
        return (
          <div
            key={obj.id}
            style={{
              ...baseStyle,
              backgroundColor: obj.color,
              borderRadius: '50% 50% 4px 4px',
              boxShadow: `0 0 16px ${obj.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold',
              color: '#000'
            }}
            onMouseDown={(e) => handleObjectMouseDown(e, obj)}
          >
            S
            {selectedOverlay}
          </div>
        )

      case 'goal-flag':
        return (
          <div
            key={obj.id}
            style={{
              ...baseStyle,
              backgroundColor: 'transparent'
            }}
            onMouseDown={(e) => handleObjectMouseDown(e, obj)}
          >
            <div
              style={{
                position: 'absolute',
                left: 2,
                bottom: 0,
                width: 4,
                height: obj.height,
                backgroundColor: '#8B4513',
                borderRadius: 2
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 6,
                top: 0,
                width: obj.width - 6,
                height: obj.height * 0.5,
                backgroundColor: obj.color,
                clipPath: 'polygon(0 0, 100% 25%, 0 50%)',
                filter: `drop-shadow(0 2px 4px ${obj.color}80)`
              }}
            />
            {selectedOverlay}
          </div>
        )

      default:
        return null
    }
  }

  const renderPropertyPanel = () => {
    if (!propertyPanelVisible && !propertyPanelClosing) return null
    if (!selectedObject && !propertyPanelClosing) return null

    return (
      <div
        className={propertyPanelClosing ? 'slide-out' : 'slide-in'}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 280,
          backgroundColor: '#16213E',
          borderLeft: '2px solid #533483',
          padding: 20,
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#E94560', fontSize: 18 }}>属性面板</h3>
          <button
            onClick={() => setSelectedId(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          类型：{TOOL_ITEMS.find((t) => t.type === selectedObject?.type)?.name}
        </div>

        {(['x', 'y'] as const).map((axis) => (
          <div key={axis} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>
              位置 {axis.toUpperCase()}
            </label>
            <input
              type="number"
              step={10}
              value={Math.round(selectedObject?.[axis] || 0)}
              onChange={(e) => handleUpdateProperty(axis, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        ))}

        {selectedObject?.type === 'platform-triangle' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>
                底边宽度 ({(selectedObject as TrianglePlatform).baseWidth || 100}px)
              </label>
              <input
                type="range"
                min={20}
                max={200}
                value={(selectedObject as TrianglePlatform).baseWidth || 100}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  handleUpdateProperty('baseWidth', v)
                  handleUpdateProperty('width', v)
                }}
                style={sliderStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>
                高 ({(selectedObject as TrianglePlatform).triangleHeight || 80}px)
              </label>
              <input
                type="range"
                min={20}
                max={200}
                value={(selectedObject as TrianglePlatform).triangleHeight || 80}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  handleUpdateProperty('triangleHeight', v)
                  handleUpdateProperty('height', v)
                }}
                style={sliderStyle}
              />
            </div>
          </>
        ) : (
          <>
            {(['width', 'height'] as const).map((dim) => (
              <div key={dim} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, color: '#aaa' }}>
                  {dim === 'width' ? '宽度' : '高度'} ({selectedObject?.[dim] || 0}px)
                </label>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={selectedObject?.[dim] || 100}
                  onChange={(e) => handleUpdateProperty(dim, parseFloat(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            ))}
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#aaa' }}>
            旋转角度 ({selectedObject?.rotation || 0}°)
          </label>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={selectedObject?.rotation || 0}
            onChange={(e) => handleUpdateProperty('rotation', parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#aaa' }}>颜色</label>
          <input
            type="color"
            value={selectedObject?.color || '#E94560'}
            onChange={(e) => handleUpdateProperty('color', e.target.value)}
            style={{
              width: '100%',
              height: 40,
              border: '2px solid #E94560',
              borderRadius: 6,
              backgroundColor: '#1A1A2E',
              cursor: 'pointer',
              padding: 2
            }}
          />
        </div>

        {selectedObject?.type === 'trap-moving' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>
                X轴移动范围 ({(selectedObject as MovingPlatform).moveRangeX || 0}px)
              </label>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={(selectedObject as MovingPlatform).moveRangeX || 0}
                onChange={(e) => handleUpdateProperty('moveRangeX', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>
                Y轴移动范围 ({(selectedObject as MovingPlatform).moveRangeY || 0}px)
              </label>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={(selectedObject as MovingPlatform).moveRangeY || 0}
                onChange={(e) => handleUpdateProperty('moveRangeY', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>
                移动速度 ({(selectedObject as MovingPlatform).moveSpeed || 1})
              </label>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.5}
                value={(selectedObject as MovingPlatform).moveSpeed || 2}
                onChange={(e) => handleUpdateProperty('moveSpeed', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>
          </>
        )}

        <button
          onClick={handleDeleteSelected}
          style={{
            marginTop: 'auto',
            padding: '10px 16px',
            backgroundColor: 'transparent',
            color: '#FF6B6B',
            border: '2px solid #FF6B6B',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FF6B6B'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#FF6B6B'
          }}
        >
          删除此物体
        </button>
      </div>
    )
  }

  const renderGrid = () => {
    const lines: JSX.Element[] = []
    const w = canvasSize.width
    const h = canvasSize.height

    for (let x = 0; x <= w; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={h}
          stroke="#16213E"
          strokeWidth={1}
          opacity={0.5}
        />
      )
    }
    for (let y = 0; y <= h; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={w}
          y2={y}
          stroke="#16213E"
          strokeWidth={1}
          opacity={0.5}
        />
      )
    }

    return (
      <svg
        className="grid-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {lines}
      </svg>
    )
  }

  const toolbarWidth = isMobile ? '100%' : 200

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%',
        height: '100%',
        backgroundColor: '#0F3460'
      }}
    >
      {!isTestMode && (
        <div
          style={{
            width: toolbarWidth,
            backgroundColor: '#16213E',
            borderRight: isMobile ? 'none' : '2px solid #533483',
            borderBottom: isMobile ? '2px solid #533483' : 'none',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flexShrink: 0,
            zIndex: 10
          }}
        >
          <h2
            style={{
              color: '#E94560',
              fontSize: isMobile ? 16 : 20,
              marginBottom: 4,
              textAlign: isMobile ? 'center' : 'left'
            }}
          >
            关卡编辑器
          </h2>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: isMobile ? 4 : 8,
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}
          >
            <button onClick={handleSave} style={smallBtnStyle('#E94560')}>
              💾 保存
            </button>
            <button onClick={handleLoad} style={smallBtnStyle('#533483')}>
              📁 加载
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".level,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: isMobile ? 4 : 8,
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}
          >
            <button
              onClick={handleUndo}
              disabled={!historyManager.canUndo()}
              style={{
                ...smallBtnStyle('#1A1A2E'),
                opacity: historyManager.canUndo() ? 1 : 0.4,
                cursor: historyManager.canUndo() ? 'pointer' : 'not-allowed'
              }}
            >
              ↶ 撤销
            </button>
            <button
              onClick={handleRedo}
              disabled={!historyManager.canRedo()}
              style={{
                ...smallBtnStyle('#1A1A2E'),
                opacity: historyManager.canRedo() ? 1 : 0.4,
                cursor: historyManager.canRedo() ? 'pointer' : 'not-allowed'
              }}
            >
              ↷ 重做
            </button>
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: '#533483',
              margin: '8px 0',
              opacity: 0.5
            }}
          />

          <div
            style={{
              fontSize: 13,
              color: '#aaa',
              marginBottom: 4,
              textAlign: isMobile ? 'center' : 'left'
            }}
          >
            拖拽到画布
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : '1fr',
              gap: 10
            }}
          >
            {TOOL_ITEMS.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={() => handleToolDragStart(item.type)}
                onDragEnd={handleToolDragEnd}
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'center' : 'flex-start',
                  gap: isMobile ? 4 : 10,
                  padding: isMobile ? 8 : 12,
                  backgroundColor: '#1A1A2E',
                  border: '2px solid #533483',
                  borderRadius: 10,
                  cursor: 'grab',
                  transition: 'all 0.2s ease',
                  minHeight: isMobile ? 70 : 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(233, 69, 96, 0.4)'
                  e.currentTarget.style.borderColor = '#E94560'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#533483'
                }}
                onDragStartCapture={(e) => {
                  ;(e.currentTarget as HTMLElement).style.opacity = '0.6'
                }}
                onDragEndCapture={(e) => {
                  ;(e.currentTarget as HTMLElement).style.opacity = '1'
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 24 : 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: isMobile ? 32 : 40
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontSize: isMobile ? 11 : 13,
                    color: '#ddd',
                    textAlign: isMobile ? 'center' : 'left'
                  }}
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={enterTestMode}
            style={{
              padding: '14px 20px',
              backgroundColor: '#E94560',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              position: 'relative',
              top: 0,
              boxShadow: '0 4px 12px rgba(233, 69, 96, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FF6B6B'
              e.currentTarget.style.top = '-2px'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(233, 69, 96, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#E94560'
              e.currentTarget.style.top = '0'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 69, 96, 0.3)'
            }}
          >
            ▶ 测试关卡
          </button>

          {!isMobile && (
            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 4 }}>
              Ctrl+Z 撤销 | Ctrl+Y 重做
              <br />
              按 Delete 删除选中
            </div>
          )}
        </div>
      )}

      <div
        ref={canvasRef}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#1A1A2E',
          overflow: 'hidden'
        }}
        onClick={handleCanvasClick}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        {!isTestMode && renderGrid()}

        {!isTestMode && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: propertyPanelVisible ? 280 : 0,
              bottom: 0,
              transition: 'right 0.3s ease'
            }}
          >
            {levelData.objects.map((obj, i) => renderObject(obj, i))}
          </div>
        )}

        {isTestMode && (
          <canvas
            ref={physicsCanvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
        )}

        {isTestMode && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                backgroundColor: 'rgba(22, 33, 62, 0.9)',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #533483',
                fontSize: 13,
                color: '#ddd',
                backdropFilter: 'blur(4px)'
              }}
            >
              <div style={{ marginBottom: 4 }}>🎮 测试模式</div>
              <div style={{ fontSize: 11, color: '#888' }}>
                A/D 或 ←/→ 移动
                <br />
                W / ↑ / 空格 跳跃
                <br />
                ESC 退出
              </div>
            </div>

            {gameState?.isDead && (
              <div
                className="death-flash"
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundColor: 'rgba(255, 0, 0, 0.2)',
                  mixBlendMode: 'multiply'
                }}
              />
            )}

            {isWin && (
              <div
                className="win-celebrate"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 200, 100, 0.3)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#16213E',
                    padding: '32px 48px',
                    borderRadius: 16,
                    border: '3px solid #00FF88',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00FF88' }}>
                    关卡通过！
                  </div>
                  <button
                    onClick={exitTestMode}
                    style={{
                      marginTop: 20,
                      padding: '10px 24px',
                      backgroundColor: '#00FF88',
                      color: '#000',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }}
                  >
                    返回编辑器
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={exitTestMode}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: '10px 16px',
                backgroundColor: 'rgba(22, 33, 62, 0.9)',
                color: '#fff',
                border: '1px solid #E94560',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E94560'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(22, 33, 62, 0.9)'
              }}
            >
              ✕ 退出测试
            </button>
          </>
        )}

        {renderPropertyPanel()}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#1A1A2E',
  color: '#fff',
  border: '2px solid #E94560',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  transition: 'box-shadow 0.2s ease',
  fontFamily: 'inherit'
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 8,
  borderRadius: 4,
  outline: 'none',
  accentColor: '#E94560',
  cursor: 'pointer'
}

const smallBtnStyle = (bg: string): React.CSSProperties => ({
  padding: '6px 12px',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 'bold',
  transition: 'all 0.2s'
})

export { inputStyle, sliderStyle }
