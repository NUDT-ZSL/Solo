import React from 'react'
import type { Tool } from './types'

interface ToolbarProps {
  currentTool: Tool
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  canUndo: boolean
  canRedo: boolean
  userColor: string
}

const STICKY_COLORS = [
  '#FFE566',
  '#98D8C8',
  '#F7B2AD',
  '#B5EAD7',
  '#C7CEEA'
]

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  onExport,
  canUndo,
  canRedo,
  userColor
}) => {
  const [collapsed, setCollapsed] = React.useState(false)
  const [hoveredTool, setHoveredTool] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const tools: { id: Tool; icon: string; label: string; cursor: string }[] = [
    { id: 'pen', icon: '✏️', label: '画笔', cursor: 'crosshair' },
    { id: 'eraser', icon: '🧽', label: '橡皮', cursor: 'cell' },
    { id: 'sticky', icon: '📝', label: '便签', cursor: 'copy' },
    { id: 'pan', icon: '✋', label: '平移', cursor: 'grab' }
  ]

  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 100
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          style={hamburgerBtnStyle}
          onMouseEnter={() => setHoveredTool('hamburger')}
          onMouseLeave={() => setHoveredTool(null)}
        >
          <span style={{ transform: hoveredTool === 'hamburger' ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s ease' }}>☰</span>
        </button>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: userColor, boxShadow: `0 0 8px ${userColor}80` }} />
          <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, padding: 4 }}>
          «
        </button>
        </div>
        
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tools.map((tool) => (
            <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
            title={tool.label}
            style={{
              ...toolBtnStyle,
              background: currentTool === tool.id
                ? 'linear-gradient(135deg, #6b8cae 0%, #4a6fa5 100%)'
                : hoveredTool === tool.id
                ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
                : '#f8fafc',
              color: currentTool === tool.id ? '#ffffff' : '#334155',
              transform: hoveredTool === tool.id ? 'scale(1.08)' : 'scale(1)',
              boxShadow: currentTool === tool.id
                ? '0 4px 12px rgba(107, 140, 174, 0.4)'
                : hoveredTool === tool.id
                ? '0 2px 8px rgba(0,0,0,0.1)'
                : 'none',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <span style={{ fontSize: 20 }}>{tool.icon}</span>
          </button>
        ))}

        <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          onMouseEnter={() => setHoveredTool('undo')}
          onMouseLeave={() => setHoveredTool(null)}
          style={{
            ...toolBtnStyle,
            opacity: canUndo ? 1 : 0.4,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            transform: hoveredTool === 'undo' && canUndo ? 'scale(1.08)' : 'scale(1)',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          title="撤销"
        >
          ↶
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          onMouseEnter={() => setHoveredTool('redo')}
          onMouseLeave={() => setHoveredTool(null)}
          style={{
            ...toolBtnStyle,
            opacity: canRedo ? 1 : 0.4,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            transform: hoveredTool === 'redo' && canRedo ? 'scale(1.08)' : 'scale(1)',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          title="重做"
        >
          ↷
        </button>

        <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />

        <button
          onClick={onExport}
          onMouseEnter={() => setHoveredTool('export')}
          onMouseLeave={() => setHoveredTool(null)}
          style={{
            ...toolBtnStyle,
            transform: hoveredTool === 'export' ? 'scale(1.08)' : 'scale(1)',
            background: hoveredTool === 'export' ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' : '#f8fafc',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          title="导出PNG"
        >
          💾
        </button>
        </div>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: 16,
  bottom: 16,
  zIndex: 100,
  pointerEvents: 'auto'
}

const toolbarStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(107, 140, 174, 0.15)',
  border: '1px solid #e2e8f0',
  width: 64,
  overflow: 'hidden',
  backdropFilter: 'blur(8px)'
}

const toolBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  userSelect: 'none',
  padding: 0,
  margin: 0
}

const hamburgerBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  border: 'none',
  background: '#ffffff',
  boxShadow: '0 4px 20px rgba(107, 140, 174, 0.15)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  color: '#334155'
}

export default Toolbar
