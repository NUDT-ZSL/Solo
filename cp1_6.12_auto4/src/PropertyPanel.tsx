import React, { useCallback } from 'react'
import type { Shape, RectShape, CircleShape } from './types'

interface PropertyPanelProps {
  selectedShape: Shape | null
  onShapeUpdate: (shape: Shape) => void
  onDeleteShape: (id: string) => void
  isMobile: boolean
  onClose?: () => void
}

type SharedShapeKeys = 'x' | 'y' | 'rotation' | 'fill' | 'stroke' | 'strokeWidth'
type RectKeys = 'width' | 'height' | 'rx'
type CircleKeys = 'radius'

function updateSharedProp(
  shape: Shape,
  key: SharedShapeKeys,
  value: number | string
): Shape {
  return { ...shape, [key]: value }
}

function updateRectProp(
  shape: RectShape,
  key: RectKeys,
  value: number
): RectShape {
  return { ...shape, [key]: value }
}

function updateCircleProp(
  shape: CircleShape,
  key: CircleKeys,
  value: number
): CircleShape {
  return { ...shape, [key]: value }
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

  const handleColorChange = useCallback(
    (key: 'fill' | 'stroke', value: string) => {
      onShapeUpdate(updateSharedProp(selectedShape, key, value))
    },
    [selectedShape, onShapeUpdate]
  )

  const handleNumberChange = useCallback(
    (key: SharedShapeKeys, value: number) => {
      onShapeUpdate(updateSharedProp(selectedShape, key, value))
    },
    [selectedShape, onShapeUpdate]
  )

  const handleRectNumberChange = useCallback(
    (key: RectKeys, value: number) => {
      if (selectedShape.type === 'rect') {
        onShapeUpdate(updateRectProp(selectedShape as RectShape, key, value))
      }
    },
    [selectedShape, onShapeUpdate]
  )

  const handleCircleNumberChange = useCallback(
    (key: CircleKeys, value: number) => {
      if (selectedShape.type === 'circle') {
        onShapeUpdate(updateCircleProp(selectedShape as CircleShape, key, value))
      }
    },
    [selectedShape, onShapeUpdate]
  )

  const handleColorInputChange = useCallback(
    (key: 'fill' | 'stroke', e: React.ChangeEvent<HTMLInputElement>) => {
      handleColorChange(key, e.target.value)
    },
    [handleColorChange]
  )

  const handleNumberInputChange = useCallback(
    (
      key: SharedShapeKeys | RectKeys | CircleKeys,
      e: React.ChangeEvent<HTMLInputElement>,
      fallback: number = 0
    ) => {
      const value = parseFloat(e.target.value) || fallback
      if (key === 'width' || key === 'height' || key === 'rx') {
        handleRectNumberChange(key as RectKeys, value)
      } else if (key === 'radius') {
        handleCircleNumberChange(key as CircleKeys, value)
      } else {
        handleNumberChange(key as SharedShapeKeys, value)
      }
    },
    [handleNumberChange, handleRectNumberChange, handleCircleNumberChange]
  )

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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorInputChange('fill', e)}
            />
            <input
              type="text"
              value={selectedShape.fill}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorInputChange('fill', e)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorInputChange('stroke', e)}
          />
          <input
            type="text"
            value={selectedShape.stroke}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorInputChange('stroke', e)}
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('strokeWidth', e, 0)}
          className="number-input glass-input"
        />
      </div>

      <div className="property-group">
        <label>旋转角度 (°)</label>
        <input
          type="number"
          min="0"
          max="360"
          value={Math.round(selectedShape.rotation)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('rotation', e, 0)}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('width', e, 1)}
              className="number-input glass-input"
            />
          </div>
          <div className="property-group">
            <label>高度</label>
            <input
              type="number"
              min="1"
              value={(selectedShape as RectShape).height}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('height', e, 1)}
              className="number-input glass-input"
            />
          </div>
          <div className="property-group">
            <label>圆角</label>
            <input
              type="number"
              min="0"
              value={(selectedShape as RectShape).rx}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('rx', e, 0)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('radius', e, 1)}
            className="number-input glass-input"
          />
        </div>
      )}

      <div className="property-group">
        <label>X 坐标</label>
        <input
          type="number"
          value={Math.round(selectedShape.x)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('x', e, 0)}
          className="number-input glass-input"
        />
      </div>

      <div className="property-group">
        <label>Y 坐标</label>
        <input
          type="number"
          value={Math.round(selectedShape.y)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberInputChange('y', e, 0)}
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
