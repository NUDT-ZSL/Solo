import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { layoutTree, getNodeColor, type LayoutResult, type LayoutNode } from '@/utils/renderer.ts'
import { findNodeById, reorderNodes, treeToMarkdown } from '@/utils/parser.ts'
import type { TreeNode } from '@/types/index.ts'

interface MindmapCanvasProps {
  tree: TreeNode[]
  onTreeChange: (tree: TreeNode[]) => void
  onMarkdownSync: (markdown: string) => void
}

export default function MindmapCanvas({ tree, onTreeChange, onMarkdownSync }: MindmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    nodeId: string | null
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null)
  const [animatingNodes, setAnimatingNodes] = useState<Set<string>>(new Set())

  const layout = useMemo(() => layoutTree(tree), [tree])
  const nodePositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  const containerSize = useRef({ width: 800, height: 600 })

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        containerSize.current = {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        }
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const { width, height } = containerSize.current
    const worldX = (screenX - offset.x - width / 2 + (layout.width * scale) / 2) / scale
    const worldY = (screenY - offset.y - height / 2 + (layout.height * scale) / 2) / scale
    return { x: worldX, y: worldY }
  }, [layout, scale, offset])

  const getNodeScreenPos = useCallback((node: LayoutNode) => {
    const { width, height } = containerSize.current
    const screenX = node.x * scale + offset.x + width / 2 - (layout.width * scale) / 2
    const screenY = node.y * scale + offset.y + height / 2 - (layout.height * scale) / 2
    return { x: screenX, y: screenY }
  }, [layout, scale, offset])

  const findNodeAtPosition = useCallback((worldX: number, worldY: number): LayoutNode | null => {
    for (const node of layout.nodes) {
      const left = node.x
      const right = node.x + node.width
      const top = node.y - node.height / 2
      const bottom = node.y + node.height / 2
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return node
      }
    }
    return null
  }, [layout])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.min(3, Math.max(0.3, scale + delta))
    setScale(newScale)
  }, [scale])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const worldPos = screenToWorld(e.clientX - containerRef.current!.getBoundingClientRect().left,
      e.clientY - containerRef.current!.getBoundingClientRect().top)
    const hitNode = findNodeAtPosition(worldPos.x, worldPos.y)

    if (hitNode) {
      setSelectedId(hitNode.id)
      setDragState({
        nodeId: hitNode.id,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY
      })
    } else {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      setSelectedId(null)
    }
  }, [screenToWorld, findNodeAtPosition, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    if (dragState && dragState.nodeId) {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setDragState({
          ...dragState,
          currentX: e.clientX,
          currentY: e.clientY
        })

        const worldPos = screenToWorld(
          e.clientX - containerRef.current!.getBoundingClientRect().left,
          e.clientY - containerRef.current!.getBoundingClientRect().top
        )
        const targetNode = findNodeAtPosition(worldPos.x, worldPos.y)

        if (targetNode && targetNode.id !== dragState.nodeId) {
          setHoverTargetId(targetNode.id)
        } else {
          setHoverTargetId(null)
        }
      }
    }
  }, [isPanning, panStart, dragState, screenToWorld, findNodeAtPosition])

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (dragState && dragState.nodeId && hoverTargetId) {
      const newTree = reorderNodes(tree, dragState.nodeId, hoverTargetId)
      if (newTree !== tree) {
        onTreeChange(newTree)
        const newMarkdown = treeToMarkdown(newTree)
        onMarkdownSync(newMarkdown)
      }
    }

    setDragState(null)
    setHoverTargetId(null)
  }, [isPanning, dragState, hoverTargetId, tree, onTreeChange, onMarkdownSync])

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    const toggleInTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          setAnimatingNodes((prev) => {
            const next = new Set(prev)
            if (node.collapsed) {
              node.children.forEach((c: TreeNode) => next.add(c.id))
            }
            return next
          })
          setTimeout(() => {
            setAnimatingNodes((prev) => {
              const next = new Set(prev)
              node.children.forEach((c: TreeNode) => next.delete(c.id))
              return next
            })
          }, 400)

          return { ...node, collapsed: !node.collapsed }
        }
        return {
          ...node,
          children: toggleInTree(node.children)
        }
      })
    }

    const newTree = toggleInTree(tree)
    onTreeChange(newTree)
    const newMarkdown = treeToMarkdown(newTree)
    onMarkdownSync(newMarkdown)
  }, [tree, onTreeChange, onMarkdownSync])

  const exportSVG = useCallback(() => {
    if (layout.nodes.length === 0) return

    const padding = 40
    const svgWidth = Math.max(1920, layout.width + padding * 2)
    const svgHeight = Math.max(1080, layout.height + padding * 2)

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="-${padding} -${padding} ${svgWidth} ${svgHeight}">`

    svgContent += `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`

    for (const edge of layout.edges) {
      const color = getNodeColor(edge.target.level)
      svgContent += `<path d="${edge.path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>`
    }

    for (const node of layout.nodes) {
      const x = node.x
      const y = node.y - node.height / 2
      const color = getNodeColor(node.level)
      const isSelected = node.id === selectedId

      if (isSelected) {
        svgContent += `<rect x="${x - 4}" y="${y - 4}" width="${node.width + 8}" height="${node.height + 8}" rx="16" ry="16" fill="none" stroke="#2196F3" stroke-width="3" filter="url(#glow)"/>`
      }

      svgContent += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="12" ry="12" fill="white" stroke="#E0E0E0" stroke-width="1"/>`
      svgContent += `<rect x="${x}" y="${y}" width="4" height="${node.height}" rx="2" fill="${color}"/>`
      svgContent += `<text x="${x + 16}" y="${y + node.height / 2 + 5}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#333" font-weight="${node.level <= 2 ? '600' : '400'}">${node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`

      if (node.hasChildren) {
        const toggleX = x + node.width - 20
        const toggleY = y + node.height / 2
        svgContent += `<circle cx="${toggleX}" cy="${toggleY}" r="8" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1"/>`
        svgContent += `<text x="${toggleX}" y="${toggleY + 4}" font-family="system-ui, sans-serif" font-size="12" fill="#666" text-anchor="middle">${node.collapsed ? '+' : '−'}</text>`
      }
    }

    svgContent += `</svg>`

    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mindmap.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [layout, selectedId])

  const exportPNG = useCallback(() => {
    if (layout.nodes.length === 0) return

    const padding = 40
    const svgWidth = Math.max(1920, layout.width + padding * 2)
    const svgHeight = Math.max(1080, layout.height + padding * 2)

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="-${padding} -${padding} ${svgWidth} ${svgHeight}">`

    svgContent += `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`

    for (const edge of layout.edges) {
      const color = getNodeColor(edge.target.level)
      svgContent += `<path d="${edge.path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>`
    }

    for (const node of layout.nodes) {
      const x = node.x
      const y = node.y - node.height / 2
      const color = getNodeColor(node.level)
      const isSelected = node.id === selectedId

      if (isSelected) {
        svgContent += `<rect x="${x - 4}" y="${y - 4}" width="${node.width + 8}" height="${node.height + 8}" rx="16" ry="16" fill="none" stroke="#2196F3" stroke-width="3" filter="url(#glow)"/>`
      }

      svgContent += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="12" ry="12" fill="white" stroke="#E0E0E0" stroke-width="1"/>`
      svgContent += `<rect x="${x}" y="${y}" width="4" height="${node.height}" rx="2" fill="${color}"/>`
      svgContent += `<text x="${x + 16}" y="${y + node.height / 2 + 5}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#333" font-weight="${node.level <= 2 ? '600' : '400'}">${node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`

      if (node.hasChildren) {
        const toggleX = x + node.width - 20
        const toggleY = y + node.height / 2
        svgContent += `<circle cx="${toggleX}" cy="${toggleY}" r="8" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1"/>`
        svgContent += `<text x="${toggleX}" y="${toggleY + 4}" font-family="system-ui, sans-serif" font-size="12" fill="#666" text-anchor="middle">${node.collapsed ? '+' : '−'}</text>`
      }
    }

    svgContent += `</svg>`

    const img = new Image()
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = svgWidth * 2
      canvas.height = svgHeight * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)

      URL.revokeObjectURL(url)

      canvas.toBlob((blob) => {
        if (!blob) return
        const pngUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = 'mindmap.png'
        a.click()
        URL.revokeObjectURL(pngUrl)
      }, 'image/png')
    }

    img.src = url
  }, [layout, selectedId])

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#F8F9FA',
        overflow: 'hidden',
        transition: 'background 300ms ease'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={resetView}
          title="重置视图"
          style={{
            padding: '8px 12px',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            background: '#FFFFFF',
            color: '#333',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 200ms'
          }}
        >
          🔄 重置
        </button>
        <button
          onClick={() => setScale(Math.max(0.3, scale - 0.1))}
          title="缩小"
          style={{
            padding: '8px 12px',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            background: '#FFFFFF',
            color: '#333',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          −
        </button>
        <span style={{
          padding: '8px 12px',
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(Math.min(3, scale + 0.1))}
          title="放大"
          style={{
            padding: '8px 12px',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            background: '#FFFFFF',
            color: '#333',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          +
        </button>
        <button
          onClick={exportSVG}
          title="导出SVG"
          style={{
            padding: '8px 12px',
            border: '1px solid #2196F3',
            borderRadius: '6px',
            background: '#2196F3',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(33,150,243,0.2)',
            transition: 'all 200ms'
          }}
        >
          📄 SVG
        </button>
        <button
          onClick={exportPNG}
          title="导出PNG"
          style={{
            padding: '8px 12px',
            border: '1px solid #4CAF50',
            borderRadius: '6px',
            background: '#4CAF50',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(76,175,80,0.2)',
            transition: 'all 200ms'
          }}
        >
          🖼️ PNG
        </button>
      </div>

      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: isPanning ? 'grabbing' : dragState ? 'grabbing' : 'grab'
        }}
      >
        <defs>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${containerSize.current.width / 2 - (layout.width * scale) / 2 + offset.x}, ${containerSize.current.height / 2 - (layout.height * scale) / 2 + offset.y}) scale(${scale})`}>
          {layout.edges.map((edge, idx) => (
            <path
              key={`edge-${idx}`}
              d={edge.path}
              fill="none"
              stroke={getNodeColor(edge.target.level)}
              strokeWidth={2}
              strokeOpacity={0.6}
            />
          ))}

          {layout.nodes.map((node) => {
            const isDragging = dragState?.nodeId === node.id
            const isHoverTarget = hoverTargetId === node.id
            const isSelected = selectedId === node.id
            const isAnimating = animatingNodes.has(node.id)

            let dragOffsetX = 0
            let dragOffsetY = 0
            if (isDragging && dragState) {
              dragOffsetX = (dragState.currentX - dragState.startX) / scale
              dragOffsetY = (dragState.currentY - dragState.startY) / scale
            }

            const color = getNodeColor(node.level)

            return (
              <g
                key={node.id}
                transform={`translate(${dragOffsetX}, ${dragOffsetY})`}
                style={{
                  transition: isAnimating
                    ? 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease'
                    : 'none',
                  opacity: isDragging ? 0.7 : 1,
                  cursor: 'pointer'
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (node.hasChildren) {
                    toggleNodeCollapse(node.id)
                  }
                }}
              >
                {isSelected && (
                  <rect
                    x={node.x - 4}
                    y={node.y - node.height / 2 - 4}
                    width={node.width + 8}
                    height={node.height + 8}
                    rx={16}
                    ry={16}
                    fill="none"
                    stroke="#2196F3"
                    strokeWidth={3}
                    filter="url(#node-glow)"
                  />
                )}

                {isHoverTarget && (
                  <rect
                    x={node.x - 6}
                    y={node.y - node.height / 2 - 6}
                    width={node.width + 12}
                    height={node.height + 12}
                    rx={18}
                    ry={18}
                    fill="none"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    strokeDasharray="5,5"
                  />
                )}

                <rect
                  x={node.x}
                  y={node.y - node.height / 2}
                  width={node.width}
                  height={node.height}
                  rx={12}
                  ry={12}
                  fill="white"
                  stroke="#E0E0E0"
                  strokeWidth={1}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))'
                  }}
                />

                <rect
                  x={node.x}
                  y={node.y - node.height / 2}
                  width={4}
                  height={node.height}
                  rx={2}
                  fill={color}
                />

                <text
                  x={node.x + 16}
                  y={node.y + 5}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontSize={14}
                  fill="#333"
                  fontWeight={node.level <= 2 ? 600 : 400}
                  pointerEvents="none"
                >
                  {node.text}
                </text>

                {node.hasChildren && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleNodeCollapse(node.id)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={node.x + node.width - 20}
                      cy={node.y}
                      r={10}
                      fill="#F5F5F5"
                      stroke="#BDBDBD"
                      strokeWidth={1}
                    />
                    <text
                      x={node.x + node.width - 20}
                      y={node.y + 4}
                      fontFamily="system-ui, sans-serif"
                      fontSize={14}
                      fill="#666"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {node.collapsed ? '+' : '−'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {layout.nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#999',
          fontSize: '14px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
          <div>在左侧编辑器中输入Markdown笔记</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>思维导图将在此处自动生成</div>
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.9)',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#666',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        lineHeight: '1.6'
      }}>
        💡 滚轮缩放 · 空白处拖拽平移 · 节点拖拽调整关系 · 双击/点击 +/− 展开折叠
      </div>
    </div>
  )
}
