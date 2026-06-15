import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RingEngine } from './RingEngine'
import type { RingState } from './RingEngine'
import { parseText, type TimeNode, type EmotionTag } from './TextParser'
import { getEmotionVisual } from './EmotionMapper'
import './App.css'

const engine = new RingEngine()

const DEFAULT_TEXT = `那年春天，我在老家的院子里种下了一棵桂花树。阳光透过嫩绿的叶子，洒下斑驳的光影，空气中弥漫着泥土的芬芳。

夏天来了，蝉鸣声声，我和小伙伴们在树荫下嬉戏。那时候的快乐如此简单，一根冰棍就能让我们笑上一整个下午。

秋天，桂花开了，满院飘香。奶奶会用桂花做糕点，那甜美的滋味至今还留在我的记忆里。我常常想念那些温暖的日子。

冬天，树叶落尽，只剩光秃秃的枝干。北风呼啸的夜晚，我缩在被窝里，听着窗外呼呼的风声，心里有些害怕，但知道天亮就会好起来。

又是一年春天，桂花树抽出了新芽。我站在树下，回忆着过去一年的点点滴滴，心中充满了对未来的期待。生命就像这棵树，四季轮回，生生不息。`

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState(DEFAULT_TEXT)
  const [rings, setRings] = useState<RingState[]>([])
  const [globalRotation, setGlobalRotation] = useState(0)
  const [expandedIndex, setExpandedIndex] = useState(-1)
  const [hoveredIndex, setHoveredIndex] = useState(-1)
  const [selfRotations, setSelfRotations] = useState<Map<number, number>>(new Map())
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [, setTick] = useState(0)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (canvasRef.current) {
      engine.setCanvas(canvasRef.current)
    }
    engine.setOnStateChange(() => {
      setRings([...engine.getRings()])
      setGlobalRotation(engine.getGlobalRotation())
      setExpandedIndex(engine.getExpandedIndex())
      setHoveredIndex(engine.getHoveredIndex())
      const newRotations = new Map<number, number>()
      engine.getRings().forEach((_, i) => {
        newRotations.set(i, engine.getSelfRotation(i))
      })
      setSelfRotations(newRotations)
      setTick(t => t + 1)
    })
    engine.start()

    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      engine.stop()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleGenerate = useCallback(() => {
    const nodes = parseText(inputText)
    if (nodes.length === 0) return
    setTimeout(() => {
      engine.resize()
      engine.generateRings(nodes)
    }, 50)
  }, [inputText])

  useEffect(() => {
    handleGenerate()
  }, [handleGenerate])

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.dragging) {
      engine.updateDrag(e.clientX, e.clientY)
      return
    }
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const idx = engine.hitTest(x, y)
    engine.setHovered(idx)
  }, [])

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const idx = engine.hitTest(x, y)
    if (idx >= 0) {
      engine.toggleExpand(idx)
    } else {
      dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY }
      engine.startDrag(e.clientX, e.clientY)
    }
  }, [])

  const handleSvgMouseUp = useCallback(() => {
    dragRef.current.dragging = false
    engine.endDrag()
  }, [])

  const handleSvgMouseLeave = useCallback(() => {
    dragRef.current.dragging = false
    engine.endDrag()
    engine.setHovered(-1)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0]
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const idx = engine.hitTest(x, y)
    if (idx >= 0) {
      engine.toggleExpand(idx)
    }
  }, [])

  const expandedRing = expandedIndex >= 0 ? rings[expandedIndex] : null
  const expandedVisual = expandedRing ? getEmotionVisual(expandedRing.node.emotion) : null

  return (
    <div className="app-root">
      <canvas ref={canvasRef} className="particle-canvas" />

      <div className="control-panel" data-collapsed={panelCollapsed}>
        <button className="panel-toggle" onClick={() => setPanelCollapsed(c => !c)}>
          {panelCollapsed ? '▸' : '◅'}
        </button>
        {!panelCollapsed && (
          <div className="panel-content">
            <h2 className="panel-title">年轮诗</h2>
            <p className="panel-subtitle">输入叙事文本，生成年轮时间轴</p>
            <textarea
              className="text-input"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="在这里输入你的故事或日记..."
              rows={6}
            />
            <button className="generate-btn" onClick={handleGenerate}>
              生成年轮
            </button>
          </div>
        )}
      </div>

      {!isMobile ? (
        <div className="ring-viewport" ref={containerRef}>
          <svg
            ref={svgRef}
            className="ring-svg"
            onMouseMove={handleSvgMouseMove}
            onMouseDown={handleSvgMouseDown}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseLeave}
            onTouchStart={handleTouchStart}
          >
            <defs>
              {rings.map((ring) => {
                const visual = getEmotionVisual(ring.node.emotion)
                return (
                  <filter key={`glow-${ring.index}`} id={`glow-${ring.index}`}>
                    <feGaussianBlur stdDeviation={ring.hovered ? 6 : 3} result="blur" />
                    <feFlood floodColor={visual.glowColor} floodOpacity={ring.hovered ? 0.8 : 0.4} />
                    <feComposite in2="blur" operator="in" />
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )
              })}
            </defs>
            <g transform={`rotate(${globalRotation}, ${engine.getRings().length > 0 ? '50%' : 0}, ${engine.getRings().length > 0 ? '50%' : 0})`}>
              {rings.map((ring) => {
                const cx = '50%'
                const cy = '50%'
                const r = (ring.innerRadius + ring.outerRadius) / 2
                const sw = ring.outerRadius - ring.innerRadius
                const selfR = selfRotations.get(ring.index) ?? 0
                const isExpanded = ring.expanded
                const expandScale = 1 + ring.expandProgress * 0.08
                const visual = getEmotionVisual(ring.node.emotion)

                return (
                  <g
                    key={ring.index}
                    transform={`rotate(${selfR * 0.1}, ${cx}, ${cy})`}
                    style={{ cursor: ring.hovered ? 'pointer' : 'default' }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={visual.ringColor}
                      strokeWidth={sw * expandScale}
                      opacity={isExpanded ? 1 : ring.hovered ? 0.95 : 0.75}
                      filter={`url(#glow-${ring.index})`}
                      style={{
                        transition: 'opacity 0.2s ease',
                        strokeDasharray: isExpanded ? 'none' : `${sw * 3} ${sw * 1.5}`,
                        strokeDashoffset: isExpanded ? 0 : selfR * 2,
                      }}
                    />
                    {isExpanded && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={visual.ringColor}
                        strokeWidth={sw * expandScale + 3}
                        opacity={0.3}
                        style={{
                          filter: `drop-shadow(0 0 8px ${visual.glowColor})`,
                        }}
                      />
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {expandedRing && expandedVisual && (
            <div
              className="detail-card"
              style={{
                background: expandedVisual.gradient,
                animation: 'fadeSlideIn 0.6s ease forwards',
              }}
            >
              <div className="detail-inner">
                <span className="detail-time">{expandedRing.node.timestamp}</span>
                <span
                  className="detail-emotion"
                  style={{
                    background: `${expandedVisual.ringColor}33`,
                    color: expandedVisual.ringColor,
                    borderColor: `${expandedVisual.ringColor}66`,
                  }}
                >
                  {expandedVisual.label}
                </span>
                <p className="detail-content">{expandedRing.node.content}</p>
              </div>
            </div>
          )}

          {rings.length > 0 && (
            <div className="ring-labels">
              {rings.map((ring) => {
                const visual = getEmotionVisual(ring.node.emotion)
                const angle = ((ring.rotationOffset + globalRotation) * Math.PI) / 180
                const midR = (ring.innerRadius + ring.outerRadius) / 2
                const svgEl = svgRef.current
                if (!svgEl) return null
                const vw = svgEl.clientWidth || 800
                const vh = svgEl.clientHeight || 600
                const cx = vw / 2
                const cy = vh / 2
                const lx = cx + Math.cos(angle) * midR
                const ly = cy + Math.sin(angle) * midR
                return (
                  <div
                    key={`label-${ring.index}`}
                    className="ring-label"
                    style={{
                      left: `${lx}px`,
                      top: `${ly}px`,
                      color: visual.ringColor,
                      opacity: ring.hovered || ring.expanded ? 1 : 0.6,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {ring.node.summary.slice(0, 6)}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mobile-scroll">
          {rings.map((ring) => {
            const visual = getEmotionVisual(ring.node.emotion)
            const isExpanded = expandedIndex === ring.index
            return (
              <div
                key={ring.index}
                className="mobile-card"
                data-expanded={isExpanded}
                style={{
                  borderLeft: `4px solid ${visual.ringColor}`,
                  background: isExpanded ? visual.gradient : 'rgba(255,255,255,0.7)',
                }}
                onClick={() => engine.toggleExpand(ring.index)}
              >
                <div className="mobile-card-header">
                  <span className="mobile-time">{ring.node.timestamp}</span>
                  <span
                    className="mobile-emotion"
                    style={{
                      background: `${visual.ringColor}22`,
                      color: visual.ringColor,
                    }}
                  >
                    {visual.label}
                  </span>
                </div>
                {isExpanded ? (
                  <p className="mobile-content">{ring.node.content}</p>
                ) : (
                  <p className="mobile-summary">{ring.node.summary}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
