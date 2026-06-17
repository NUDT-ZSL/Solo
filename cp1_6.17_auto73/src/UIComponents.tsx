import { useState } from 'react'
import type { BuildingStyle, Building } from './GameEngine'
import { GameEngine } from './GameEngine'

interface ToolbarProps {
  currentStyle: BuildingStyle
  onStyleSelect: (style: BuildingStyle) => void
  buildingCount: number
}

const STYLE_LIST: { style: BuildingStyle; label: string; color: string }[] = [
  { style: 'residential', label: '住宅', color: '#8BC34A' },
  { style: 'commercial', label: '商业', color: '#FF9800' },
  { style: 'industrial', label: '工业', color: '#607D8B' }
]

export function Toolbar({ currentStyle, onStyleSelect, buildingCount }: ToolbarProps) {
  return (
    <div className="left-panel">
      <div className="panel-title">建筑风格</div>
      {STYLE_LIST.map(({ style, label, color }) => (
        <button
          key={style}
          className={`tool-btn ${currentStyle === style ? 'active' : ''}`}
          onClick={() => onStyleSelect(style)}
        >
          <span className="btn-icon" style={{ backgroundColor: color }} />
          <span>{label}</span>
        </button>
      ))}
      <div className="building-count">
        已放置建筑：{buildingCount} 栋
      </div>
      <div className="hint-text">
        提示：长按网格放置建筑<br />
        按住越久，建筑越高<br />
        （0.5秒=1层，最长3秒=6层）
      </div>
    </div>
  )
}

interface StylePreviewProps {
  currentStyle: BuildingStyle
  onApplyStyle: (style: BuildingStyle) => void
  hasBuildings: boolean
}

export function StylePreview({ currentStyle, onApplyStyle, hasBuildings }: StylePreviewProps) {
  const styleInfo = STYLE_LIST.find((s) => s.style === currentStyle)!

  const sampleFloors = [2, 4, 6]

  return (
    <div className="right-panel">
      <div className="panel-title">风格预览</div>
      <div className="style-preview-container">
        <div className="style-preview-title">{styleInfo.label}风格</div>
        <div className="style-preview-buildings">
          <div className="preview-building">
            {sampleFloors.map((floors, i) => (
              <div
                key={i}
                className="preview-building-block"
                style={{
                  height: `${(floors / 6) * 100}%`,
                  backgroundColor: GameEngine.floorsToColor(floors, currentStyle)
                }}
              />
            ))}
          </div>
        </div>
        <div className="style-name-label">{styleInfo.label}建筑</div>
        <button
          className="apply-style-btn"
          onClick={() => onApplyStyle(currentStyle)}
          disabled={!hasBuildings}
        >
          应用到全城
        </button>
      </div>

      <div className="panel-title" style={{ marginTop: '12px' }}>其他风格</div>
      {STYLE_LIST.filter((s) => s.style !== currentStyle).map(({ style, label, color }) => (
        <StyleMiniPreview
          key={style}
          style={style}
          label={label}
          color={color}
          onSelect={() => onApplyStyle(style)}
          hasBuildings={hasBuildings}
        />
      ))}
    </div>
  )
}

interface StyleMiniPreviewProps {
  style: BuildingStyle
  label: string
  color: string
  onSelect: () => void
  hasBuildings: boolean
}

function StyleMiniPreview({ style, label, onSelect, hasBuildings }: StyleMiniPreviewProps) {
  const sampleFloors = [2, 4, 6]

  return (
    <div className="style-preview-container" style={{ padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#424242' }}>{label}</span>
        <button
          className="apply-style-btn"
          style={{ padding: '4px 10px', fontSize: '11px' }}
          onClick={onSelect}
          disabled={!hasBuildings}
        >
          应用
        </button>
      </div>
      <div className="preview-building" style={{ height: '40px', justifyContent: 'center' }}>
        {sampleFloors.map((floors, i) => (
          <div
            key={i}
            className="preview-building-block"
            style={{
              width: '20px',
              height: `${(floors / 6) * 100}%`,
              backgroundColor: GameEngine.floorsToColor(floors, style)
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface InfoPanelProps {
  building: Building
  onClose: () => void
  styleName: string
}

export function InfoPanel({ building, onClose, styleName }: InfoPanelProps) {
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  const buildingColor = GameEngine.floorsToColor(building.floors, building.style)

  return (
    <div className={`info-panel ${closing ? 'closing' : ''}`}>
      <div className="info-panel-header">
        <div className="info-panel-title">建筑信息</div>
        <button className="close-btn" onClick={handleClose}>
          ✕
        </button>
      </div>
      <div className="info-panel-body">
        <div className="info-item">
          <span className="info-label">名称</span>
          <span className="info-value">{building.name}</span>
        </div>
        <div className="info-item">
          <span className="info-label">位置</span>
          <span className="info-value">({building.x}, {building.y})</span>
        </div>
        <div className="info-item">
          <span className="info-label">楼层数</span>
          <span className="info-value">{building.floors} 层</span>
        </div>
        <div className="info-item">
          <span className="info-label">高度</span>
          <span className="info-value">{building.floors * 3} 米</span>
        </div>
        <div className="info-item">
          <span className="info-label">风格</span>
          <span className="info-value">{styleName}</span>
        </div>
        <div className="info-item">
          <span className="info-label">外观颜色</span>
          <span className="info-value">
            <span className="info-color-swatch" style={{ backgroundColor: buildingColor }} />
          </span>
        </div>
      </div>
    </div>
  )
}
