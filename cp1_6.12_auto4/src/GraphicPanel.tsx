import React from 'react'
import type { ShapeType } from './types'

interface GraphicPanelProps {
  currentTool: ShapeType
  onToolChange: (tool: ShapeType) => void
  onExport: () => void
  onImport: (file: File) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

const tools: { type: ShapeType; label: string; shortcut: string; icon: JSX.Element }[] = [
  {
    type: 'select',
    label: '选择',
    shortcut: 'V',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
    )
  },
  {
    type: 'rect',
    label: '矩形',
    shortcut: 'R',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    )
  },
  {
    type: 'circle',
    label: '圆形',
    shortcut: 'C',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  },
  {
    type: 'line',
    label: '线条',
    shortcut: 'L',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    )
  }
]

export const GraphicPanel: React.FC<GraphicPanelProps> = ({
  currentTool,
  onToolChange,
  onExport,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
    }
    e.target.value = ''
  }

  return (
    <div className="graphic-panel">
      <div className="panel-section">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`tool-button ${currentTool === tool.type ? 'active' : ''}`}
            onClick={() => onToolChange(tool.type)}
            title={`${tool.label} - ${tool.shortcut}`}
          >
            {tool.icon}
            <span className="tooltip">{tool.label} - {tool.shortcut}</span>
          </button>
        ))}
      </div>

      <div className="panel-divider" />

      <div className="panel-section">
        <button
          className="tool-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 - Ctrl+Z"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.7 3L3 13" />
          </svg>
          <span className="tooltip">撤销 - Ctrl+Z</span>
        </button>
        <button
          className="tool-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 - Ctrl+Shift+Z"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016.7 3L21 13" />
          </svg>
          <span className="tooltip">重做 - Ctrl+Shift+Z</span>
        </button>
      </div>

      <div className="panel-divider" />

      <div className="panel-section">
        <button
          className="tool-button"
          onClick={onExport}
          title="导出 SVG"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="tooltip">导出 SVG</span>
        </button>
        <button
          className="tool-button"
          onClick={handleImportClick}
          title="导入 SVG"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="tooltip">导入 SVG</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
