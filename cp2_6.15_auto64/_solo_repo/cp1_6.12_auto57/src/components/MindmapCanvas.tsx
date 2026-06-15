import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { layoutTree, getNodeColor, type LayoutNode } from '@/utils/renderer.ts'
import { reorderNodes, treeToMarkdown } from '@/utils/parser.ts'
import type { TreeNode } from '@/types/index.ts'

interface MindmapCanvasProps {
  tree: TreeNode[]
  onTreeChange: (tree: TreeNode[]) => void
  onMarkdownSync: (markdown: string) => void
}

export default function MindmapCanvas({ tree, onTreeChange, onMarkdownSync }: MindmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    nodeId: string
    startClientX: number
    startClientY: number
    currentClientX: number
    currentClientY: number
    hasMoved: boolean
  } | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [nodeAnimations, setNodeAnimations] = useState<Map<string, { type: 'expand' | 'collapse' | 'move', startTime: number }>>(new Map())
  const [prevLayout, setPrevLayout] = useState<ReturnType<typeof layoutTree> | null>(null)

  const layout = useMemo(() => layoutTree(tree), [tree])

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

  useEffect(() => {
    if (prevLayout && prevLayout.nodes.length !== layout.nodes.length) {
      const prevIds = new Set(prevLayout.nodes.map(n => n.id))
      const newIds = new Set(layout.nodes.map(n => n.id))

      const newNodes = layout.nodes.filter(n => !prevIds.has(n.id))
      const removedNodes = prevLayout.nodes.filter(n => !newIds.has(n.id))

      const animations = new Map(nodeAnimations)
      const now = Date.now()

      newNodes.forEach(node => {
        animations.set(node.id, { type: 'expand', startTime: now })
      })

      setTimeout(() => {
        setNodeAnimations(prev => {
          const next = new Map(prev)
          newNodes.forEach(node => next.delete(node.id))
          removedNodes.forEach(node => next.delete(node.id))
          return next
        })
      }, 450)

      setNodeAnimations(animations)
    }

    setPrevLayout(layout)
  }, [layout])

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const { width, height } = containerSize.current
    const screenX = worldX * scale + offset.x + width / 2 - (layout.width * scale) / 2
    const screenY = worldY * scale + offset.y + height / 2 - (layout.height * scale) / 2
    return { x: screenX, y: screenY }
  }, [layout, scale, offset])

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const { width, height } = containerSize.current
    const worldX = (screenX - offset.x - width / 2 + (layout.width * scale) / 2) / scale
    const worldY = (screenY - offset.y - height / 2 + (layout.height * scale) / 2) / scale
    return { x: worldX, y: worldY }
  }, [layout, scale, offset])

  const findNodeAtScreenPos = useCallback((screenX: number, screenY: number): LayoutNode | null => {
    for (let i = layout.nodes.length - 1; i >= 0; i--) {
      const node = layout.nodes[i]
      const screenPos = worldToScreen(node.x + node.width / 2, node.y)
      const halfWidth = (node.width * scale) / 2
      const halfHeight = (node.height * scale) / 2

      if (
        screenX >= screenPos.x - halfWidth &&
        screenX <= screenPos.x + halfWidth &&
        screenY >= screenPos.y - halfHeight &&
        screenY <= screenPos.y + halfHeight
      ) {
        return node
      }
    }
    return null
  }, [layout, worldToScreen, scale])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.min(3, Math.max(0.3, scale + delta))

    const rect = containerRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const worldBefore = screenToWorld(mouseX, mouseY)
    setScale(newScale)

    setTimeout(() => {
      const { width, height } = containerSize.current
      const newScreenX = worldBefore.x * newScale + offset.x + width / 2 - (layout.width * newScale) / 2
      const newScreenY = worldBefore.y * newScale + offset.y + height / 2 - (layout.height * newScale) / 2
      setOffset({
        x: offset.x + (mouseX - newScreenX),
        y: offset.y + (mouseY - newScreenY)
      })
    }, 0)
  }, [scale, offset, layout, screenToWorld])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    const rect = containerRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const hitNode = findNodeAtScreenPos(mouseX, mouseY)

    if (hitNode) {
      setSelectedId(hitNode.id)
      setDragState({
        nodeId: hitNode.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        currentClientX: e.clientX,
        currentClientY: e.clientY,
        hasMoved: false
      })
      e.preventDefault()
    } else {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      setSelectedId(null)
    }
  }, [findNodeAtScreenPos, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    if (dragState) {
      const dx = e.clientX - dragState.startClientX
      const dy = e.clientY - dragState.startClientY

      const hasMoved = Math.abs(dx) > 5 || Math.abs(dy) > 5

      setDragState({
        ...dragState,
        currentClientX: e.clientX,
        currentClientY: e.clientY,
        hasMoved: hasMoved || dragState.hasMoved
      })

      if (hasMoved || dragState.hasMoved) {
        const rect = containerRef.current!.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const targetNode = findNodeAtScreenPos(mouseX, mouseY)

        if (targetNode && targetNode.id !== dragState.nodeId) {
          const isDescendant = (treeNodes: TreeNode[], ancestorId: string, targetId: string): boolean => {
            for (const node of treeNodes) {
              if (node.id === targetId) return false
              if (node.id === ancestorId) {
                const checkChildren = (children: TreeNode[]): boolean => {
                  for (const child of children) {
                    if (child.id === targetId) return true
                    if (checkChildren(child.children)) return true
                  }
                  return false
                }
                return checkChildren(node.children)
              }
              if (isDescendant(node.children, ancestorId, targetId)) return true
            }
            return false
          }

          if (!isDescendant(tree, dragState.nodeId, targetNode.id)) {
            setDropTargetId(targetNode.id)
          } else {
            setDropTargetId(null)
          }
        } else {
          setDropTargetId(null)
        }
      }
    }
  }, [isPanning, panStart, dragState, findNodeAtScreenPos, tree])

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (dragState && dragState.hasMoved && dropTargetId) {
      const newTree = reorderNodes(tree, dragState.nodeId, dropTargetId)
      onTreeChange(newTree)
      const newMarkdown = treeToMarkdown(newTree)
      onMarkdownSync(newMarkdown)
    }

    setDragState(null)
    setDropTargetId(null)
  }, [isPanning, dragState, dropTargetId, tree, onTreeChange, onMarkdownSync])

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    const toggleInTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
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

  const getNodeTransform = (node: LayoutNode): string => {
    let transform = `translate(${node.x}, ${node.y - node.height / 2})`

    if (dragState?.nodeId === node.id && dragState.hasMoved) {
      const dx = (dragState.currentClientX - dragState.startClientX) / scale
      const dy = (dragState.currentClientY - dragState.startClientY) / scale
      transform = `translate(${node.x + dx}, ${node.y - node.height / 2 + dy})`
    }

    return transform
  }

  const getNodeOpacity = (node: LayoutNode): number => {
    const animation = nodeAnimations.get(node.id)
    if (!animation) return 1

    const elapsed = Date.now() - animation.startTime
    const duration = 400

    if (elapsed >= duration) return 1

    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)

    if (animation.type === 'expand') {
      return eased
    }
    return 1 - eased
  }

  const getNodeScale = (node: LayoutNode): number => {
    const animation = nodeAnimations.get(node.id)
    if (!animation) return 1

    const elapsed = Date.now() - animation.startTime
    const duration = 400

    if (elapsed >= duration) return 1

    const t = Math.min(elapsed / duration, 1)
    const c4 = (2 * Math.PI) / 3
    const elastic = Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1

    if (nodeAnimations.has(node.id)) {
      return elastic
    }
    return 1
  }

  const exportSVG = useCallback(() => {
    if (layout.nodes.length === 0) return

    const padding = 40
    const minWidth = 1920
    const minHeight = 1080
    const contentWidth = layout.width + padding * 2
    const contentHeight = layout.height + padding * 2
    const svgWidth = Math.max(minWidth, contentWidth)
    const svgHeight = Math.max(minHeight, contentHeight)
    const offsetX = (svgWidth - contentWidth) / 2 + padding
    const offsetY = (svgHeight - contentHeight) / 2 + padding

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`

    svgContent += `<defs>`
    svgContent += `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">`
    svgContent += `<feGaussianBlur stdDeviation="4" result="coloredBlur"/>`
    svgContent += `<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`
    svgContent += `</filter>`
    svgContent += `</defs>`

    svgContent += `<g transform="translate(${offsetX}, ${offsetY})">`

    for (const edge of layout.edges) {
      const color = getNodeColor(edge.target.level)
      svgContent += `<path d="${edge.path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>`
    }

    for (const node of layout.nodes) {
      const x = 0
      const y = 0
      const color = getNodeColor(node.level)
      const isSelected = node.id === selectedId

      if (isSelected) {
        svgContent += `<rect x="${x - 4}" y="${y - 4}" width="${node.width + 8}" height="${node.height + 8}" rx="16" ry="16" fill="none" stroke="#2196F3" stroke-width="3" filter="url(#glow)"/>`
      }

      svgContent += `<g transform="translate(${node.x}, ${node.y - node.height / 2})">`
      svgContent += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="12" ry="12" fill="white" stroke="#E0E0E0" stroke-width="1"/>`
      svgContent += `<rect x="${x}" y="${y}" width="4" height="${node.height}" rx="2" fill="${color}"/>`
      svgContent += `<text x="${x + 16}" y="${y + node.height / 2 + 5}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#333" font-weight="${node.level <= 2 ? '600' : '400'}">${node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`

      if (node.hasChildren) {
        const toggleX = x + node.width - 20
        const toggleY = y + node.height / 2
        svgContent += `<circle cx="${toggleX}" cy="${toggleY}" r="10" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1"/>`
        svgContent += `<text x="${toggleX}" y="${toggleY + 5}" font-family="system-ui, sans-serif" font-size="16" fill="#666" text-anchor="middle">${node.collapsed ? '+' : '−'}</text>`
      }
      svgContent += `</g>`
    }

    svgContent += `</g>`
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
    const minWidth = 1920
    const minHeight = 1080
    const contentWidth = layout.width + padding * 2
    const contentHeight = layout.height + padding * 2
    const svgWidth = Math.max(minWidth, contentWidth)
    const svgHeight = Math.max(minHeight, contentHeight)
    const offsetX = (svgWidth - contentWidth) / 2 + padding
    const offsetY = (svgHeight - contentHeight) / 2 + padding

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`

    svgContent += `<defs>`
    svgContent += `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">`
    svgContent += `<feGaussianBlur stdDeviation="4" result="coloredBlur"/>`
    svgContent += `<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`
    svgContent += `</filter>`
    svgContent += `</defs>`

    svgContent += `<g transform="translate(${offsetX}, ${offsetY})">`

    for (const edge of layout.edges) {
      const color = getNodeColor(edge.target.level)
      svgContent += `<path d="${edge.path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>`
    }

    for (const node of layout.nodes) {
      const x = 0
      const y = 0
      const color = getNodeColor(node.level)
      const isSelected = node.id === selectedId

      if (isSelected) {
        svgContent += `<rect x="${x - 4}" y="${y - 4}" width="${node.width + 8}" height="${node.height + 8}" rx="16" ry="16" fill="none" stroke="#2196F3" stroke-width="3" filter="url(#glow)"/>`
      }

      svgContent += `<g transform="translate(${node.x}, ${node.y - node.height / 2})">`
      svgContent += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="12" ry="12" fill="white" stroke="#E0E0E0" stroke-width="1"/>`
      svgContent += `<rect x="${x}" y="${y}" width="4" height="${node.height}" rx="2" fill="${color}"/>`
      svgContent += `<text x="${x + 16}" y="${y + node.height / 2 + 5}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#333" font-weight="${node.level <= 2 ? '600' : '400'}">${node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`

      if (node.hasChildren) {
        const toggleX = x + node.width - 20
        const toggleY = y + node.height / 2
        svgContent += `<circle cx="${toggleX}" cy="${toggleY}" r="10" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1"/>`
        svgContent += `<text x="${toggleX}" y="${toggleY + 5}" font-family="system-ui, sans-serif" font-size="16" fill="#666" text-anchor="middle">${node.collapsed ? '+' : '−'}</text>`
      }
      svgContent += `</g>`
    }

    svgContent += `</g>`
    svgContent += `</svg>`

    const img = new Image()
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scaleFactor = 2
      canvas.width = svgWidth * scaleFactor
      canvas.height = svgHeight * scaleFactor
      const ctx = canvas.getContext('2d')!
      ctx.scale(scaleFactor, scaleFactor)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
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

    img.onerror = () => {
      console.error('Failed to load SVG image')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }, [layout, selectedId])

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const centerX = containerSize.current.width / 2 - (layout.width * scale) / 2 + offset.x
  const centerY = containerSize.current.height / 2 - (layout.height * scale) / 2 + offset.y

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#F8F9FA',
        overflow: 'hidden',
        transition: 'background 300ms ease',
        userSelect: 'none'
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
        zIndex: 10,
        alignItems: 'center'
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
            fontSize: '16px',
            lineHeight: 1,
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
          minWidth: '52px',
          textAlign: 'center',
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
            fontSize: '16px',
            lineHeight: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          +
        </button>
        <div style={{ width: '1px', height: '24px', background: '#E0E0E0', margin: '0 4px' }} />
        <button
          onClick={exportSVG}
          title="导出SVG矢量图"
          style={{
            padding: '8px 14px',
            border: '1px solid #2196F3',
            borderRadius: '6px',
            background: '#2196F3',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(33,150,243,0.2)',
            transition: 'all 200ms'
          }}
        >
          📄 SVG
        </button>
        <button
          onClick={exportPNG}
          title="导出PNG高清图"
          style={{
            padding: '8px 14px',
            border: '1px solid #4CAF50',
            borderRadius: '6px',
            background: '#4CAF50',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(76,175,80,0.2)',
            transition: 'all 200ms'
          }}
        >
          🖼️ PNG
        </button>
      </div>

      <svg
        style={{
          width: '100%',
          height: '100%',
          cursor: isPanning ? 'grabbing' : dragState?.hasMoved ? 'grabbing' : 'grab'
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
          <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        <g transform={`translate(${centerX}, ${centerY}) scale(${scale})`}>
          {layout.edges.map((edge, idx) => (
            <path
              key={`edge-${idx}`}
              d={edge.path}
              fill="none"
              stroke={getNodeColor(edge.target.level)}
              strokeWidth={2}
              strokeOpacity={0.5}
              style={{
                transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            />
          ))}

          {layout.nodes.map((node) => {
            const isDragging = dragState?.nodeId === node.id && dragState.hasMoved
            const isDropTarget = dropTargetId === node.id
            const isSelected = selectedId === node.id
            const color = getNodeColor(node.level)
            const transform = getNodeTransform(node)
            const opacity = getNodeOpacity(node)

            return (
              <g
                key={node.id}
                transform={transform}
                style={{
                  opacity: isDragging ? 0.8 : opacity,
                  transition: isDragging ? 'none' : 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId(node.id)
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
                    x={-6}
                    y={-6}
                    width={node.width + 12}
                    height={node.height + 12}
                    rx={18}
                    ry={18}
                    fill="none"
                    stroke="#2196F3"
                    strokeWidth={3}
                    filter="url(#node-glow)"
                    style={{
                      animation: 'pulse 2s ease-in-out infinite'
                    }}
                  />
                )}

                {isDropTarget && (
                  <>
                    <rect
                      x={-10}
                      y={-10}
                      width={node.width + 20}
                      height={node.height + 20}
                      rx={20}
                      ry={20}
                      fill="#4CAF50"
                      fillOpacity={0.1}
                      stroke="#4CAF50"
                      strokeWidth={3}
                      strokeDasharray="8,4"
                      style={{
                        animation: 'dash 0.5s linear infinite'
                      }}
                    />
                    <text
                      x={node.width / 2}
                      y={-20}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#4CAF50"
                      fontWeight="bold"
                    >
                      释放以添加为子节点
                    </text>
                  </>
                )}

                <rect
                  x={0}
                  y={0}
                  width={node.width}
                  height={node.height}
                  rx={12}
                  ry={12}
                  fill="white"
                  stroke="#E0E0E0"
                  strokeWidth={1}
                  filter="url(#drop-shadow)"
                />

                <rect
                  x={0}
                  y={0}
                  width={5}
                  height={node.height}
                  rx={2}
                  fill={color}
                />

                <text
                  x={18}
                  y={node.height / 2 + 5}
                  fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
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
                      cx={node.width - 22}
                      cy={node.height / 2}
                      r={12}
                      fill="#F5F5F5"
                      stroke="#BDBDBD"
                      strokeWidth={1.5}
                      style={{
                        transition: 'all 200ms ease'
                      }}
                    />
                    <text
                      x={node.width - 22}
                      y={node.height / 2 + 5}
                      fontFamily="system-ui, sans-serif"
                      fontSize={18}
                      fill="#666"
                      textAnchor="middle"
                      pointerEvents="none"
                      fontWeight="bold"
                    >
                      {node.collapsed ? '+' : '−'}
                    </text>
                  </g>
                )}

                {node.isList && (
                  <circle
                    cx={10}
                    cy={node.height / 2}
                    r={4}
                    fill={color}
                  />
                )}
              </g>
            )
          })}
        </g>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes dash {
            to { stroke-dashoffset: -24; }
          }
        `}</style>
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
          <div style={{ fontWeight: 500, color: '#666' }}>在左侧编辑器中输入Markdown笔记</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>思维导图将在此处自动生成</div>
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#666',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        lineHeight: '1.8'
      }}>
        <div>�️ <strong>滚轮</strong>缩放 (0.3x ~ 3x)</div>
        <div>✋ <strong>拖拽空白</strong>平移画布</div>
        <div>↔️ <strong>拖拽节点</strong>调整父子关系</div>
        <div>👆 <strong>双击/+−</strong>展开折叠</div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.9)',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#999',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        共 {layout.nodes.length} 个节点
      </div>
    </div>
  )
}
