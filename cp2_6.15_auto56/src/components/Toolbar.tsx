import { useEffect } from 'react'
import { useEditorStore, Tool } from '../store/editorStore'
import { saveAs } from 'file-saver'
import { Shape } from '../utils/geometry'

function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (Number.isInteger(rounded)) {
    return rounded.toString()
  }
  return rounded.toFixed(rounded % 1 === 0 ? 0 : rounded * 10 % 1 === 0 ? 1 : 2)
}

function shapesToSVG(shapes: Shape[], width: number, height: number): string {
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}">`
  )
  for (const shape of shapes) {
    const cx = shape.x + shape.width / 2
    const cy = shape.y + shape.height / 2
    const transform = `rotate(${formatNumber(shape.rotation)} ${formatNumber(cx)} ${formatNumber(cy)})`
    if (shape.type === 'rect') {
      parts.push(
        `  <rect x="${formatNumber(shape.x)}" y="${formatNumber(shape.y)}" width="${formatNumber(shape.width)}" height="${formatNumber(shape.height)}" fill="${shape.fill}" transform="${transform}"/>`
      )
    } else if (shape.type === 'circle') {
      const rx = shape.width / 2
      const ry = shape.height / 2
      parts.push(
        `  <ellipse cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" rx="${formatNumber(rx)}" ry="${formatNumber(ry)}" fill="${shape.fill}" transform="${transform}"/>`
      )
    } else if (shape.type === 'triangle') {
      const p1 = `${formatNumber(cx)},${formatNumber(shape.y)}`
      const p2 = `${formatNumber(shape.x)},${formatNumber(shape.y + shape.height)}`
      const p3 = `${formatNumber(shape.x + shape.width)},${formatNumber(shape.y + shape.height)}`
      parts.push(
        `  <polygon points="${p1} ${p2} ${p3}" fill="${shape.fill}" transform="${transform}"/>`
      )
    }
  }
  parts.push('</svg>')
  return parts.join('\n')
}

export default function Toolbar() {
  const {
    currentTool,
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
    shapes,
  } = useEditorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault()
          redo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const handleExport = () => {
    let maxX = 800
    let maxY = 600
    for (const shape of shapes) {
      maxX = Math.max(maxX, shape.x + shape.width + 50)
      maxY = Math.max(maxY, shape.y + shape.height + 50)
    }
    const svg = shapesToSVG(shapes, maxX, maxY)
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const timestamp = Date.now()
    saveAs(blob, `editor-${timestamp}.svg`)
  }

  const tools: { key: Tool; label: string; icon: string }[] = [
    { key: 'select', label: '选择', icon: '▢' },
    { key: 'rect', label: '矩形', icon: '▭' },
    { key: 'circle', label: '圆形', icon: '○' },
    { key: 'triangle', label: '三角形', icon: '△' },
  ]

  const undoEnabled = canUndo()
  const redoEnabled = canRedo()

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.key}
          className={`toolbar-btn ${currentTool === tool.key ? 'active' : ''}`}
          onClick={() => setTool(tool.key)}
          title={tool.label}
        >
          <span style={{ fontSize: 16 }}>{tool.icon}</span>
          <span>{tool.label}</span>
        </button>
      ))}

      <div className="toolbar-divider" />

      <button
        className="toolbar-btn"
        onClick={undo}
        disabled={!undoEnabled}
        title="撤销 (Ctrl+Z)"
      >
        <span style={{ fontSize: 16 }}>↶</span>
        <span>撤销</span>
      </button>
      <button
        className="toolbar-btn"
        onClick={redo}
        disabled={!redoEnabled}
        title="重做 (Ctrl+Shift+Z)"
      >
        <span style={{ fontSize: 16 }}>↷</span>
        <span>重做</span>
      </button>

      <div className="toolbar-divider" />

      <button className="toolbar-btn" onClick={handleExport} title="导出SVG">
        <span style={{ fontSize: 16 }}>⬇</span>
        <span>导出</span>
      </button>
    </div>
  )
}
