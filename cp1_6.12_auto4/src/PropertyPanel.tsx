import React from 'react'
import type { Shape, RectShape, CircleShape } from './types'

interface PropertyPanelProps {
  selectedShape: Shape | null
  onShapeUpdate: (shape: Shape) => void
  onDeleteShape: (id: string) => void
  isMobile: boolean
  onClose?: () => void
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedShape,
  onShapeUpdate,
  onDeleteShape,
  isMobile,
  onClose
}) => {
  if (!selectedShape) {
    return (
      <div className={`property-panel ${selectedShape ? 'open' : ''}`}>
        <div className="panel-empty">
          <p>选择图形以编辑属性</p>
        </div>
      </div>
    )
  }

  const updateProp = (key: string, value: any) => {
    onShapeUpdate({ ...(selectedShape as any), [key]: value } as Shape)
  }

  const panelContent = (
    <>
      <div className="panel-header">
        <h3>属性面板</h3>
        {isMobile && onClose && (
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="property-group">
        <label>图形类型</label>
        <div className="property-value">{selectedShape.type}</div>
      </div>

      {selectedShape.type !== 'line' && (
        <div className="property-group">
          <label>填充色</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={selectedShape.fill}
              onChange={(e) => updateProp('fill', e.target.value)}
            />
            <input
              type="text"
              value={selectedShape.fill}
              onChange={(e) => updateProp('fill', e.target.value)}
              className="text-input glass-input"
            />
          </div>
        </div>
      )}

      <div className="property-group">
        <label>边框色</label>
        <div className="color-input-wrapper">
          <input
            type="color"
            value={selectedShape.stroke}
            onChange={(e) => updateProp('stroke', e.target.value)}
          />
          <input
            type="text"
            value={selectedShape.stroke}
            onChange={(e) => updateProp('stroke', e.target.value)}
            className="text-input glass-input"
          />
        </div>
      </div>

      <div className="property-group">
        <label>边框宽度</label>
        <input
          type="number"
          min="0"
          max="50"
          value={selectedShape.strokeWidth}
          onChange={(e) => updateProp('strokeWidth', parseFloat(e.target.value) || 0)}
          className="number-input glass-input"
        />
      </div>

      <div className="property-group">
        <label>旋转角度</label>
        <input
          type="number"
          min="0"
          max="360"
          value={Math.round(selectedShape.rotation)}
          onChange={(e) => updateProp('rotation', parseFloat(e.target.value) || 0)}
          className="number-input glass-input"
        />
      </div>

      {selectedShape.type === 'rect' && (
        <>
          <div className="property-group">
            <label>宽度</label>
            <input
              type="number"
              min="1"
              value={(selectedShape as RectShape).width}
              onChange={(e) => updateProp('width', parseFloat(e.target.value) || 1)}
              className="number-input glass-input"
            />
          </div>
          <div className="property-group">
            <label>高度</label>
            <input
              type="number"
              min="1"
              value={(selectedShape as RectShape).height}
              onChange={(e) => updateProp('height', parseFloat(e.target.value) || 1)}
              className="number-input glass-input"
            />
          </div>
          <div className="property-group">
            <label>圆角</label>
            <input
              type="number"
              min="0"
              value={(selectedShape as RectShape).rx}
              onChange={(e) => updateProp('rx', parseFloat(e.target.value) || 0)}
              className="number-input glass-input"
            />
          </div>
        </>
      )}

      {selectedShape.type === 'circle' && (
        <div className="property-group">
          <label>半径</label>
          <input
            type="number"
            min="1"
            value={(selectedShape as CircleShape).radius}
            onChange={(e) => updateProp('radius', parseFloat(e.target.value) || 1)}
            className="number-input glass-input"
          />
        </div>
      )}

      <div className="property-group">
        <label>X 坐标</label>
        <input
          type="number"
          value={Math.round(selectedShape.x)}
          onChange={(e) => updateProp('x', parseFloat(e.target.value) || 0)}
          className="number-input glass-input"
        />
      </div>

      <div className="property-group">
        <label>Y 坐标</label>
        <input
          type="number"
          value={Math.round(selectedShape.y)}
          onChange={(e) => updateProp('y', parseFloat(e.target.value) || 0)}
          className="number-input glass-input"
        />
      </div>

      <button
        className="delete-button"
        onClick={() => onDeleteShape(selectedShape.id)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
        删除图形
      </button>
    </>
  )

  if (isMobile) {
    return (
      <div className="mobile-property-modal">
        <div className="mobile-property-content">
          {panelContent}
        </div>
      </div>
    )
  }

  return (
    <div className={`property-panel ${selectedShape ? 'open' : ''}`}>
      {panelContent}
    </div>
  )
}
