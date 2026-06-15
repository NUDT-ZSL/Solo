import { ChangeEvent, useState, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { ShapeType } from '../utils/geometry'

const typeLabels: Record<ShapeType, string> = {
  rect: '矩形',
  circle: '圆形',
  triangle: '三角形',
}

export default function PropertiesPanel() {
  const { shapes, selectedId, updateShape } = useEditorStore()
  const shape = shapes.find((s) => s.id === selectedId) || null

  const [hexInput, setHexInput] = useState('')

  useEffect(() => {
    if (shape) {
      setHexInput(shape.fill)
    }
  }, [shape?.fill, shape?.id])

  const handleNumberChange = (
    key: 'x' | 'y' | 'width' | 'height' | 'rotation',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (!shape) return
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    updateShape(shape.id, { [key]: value })
  }

  const handleColorInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!shape) return
    const value = e.target.value
    setHexInput(value.toUpperCase())
    updateShape(shape.id, { fill: value.toUpperCase() })
  }

  const handleHexInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!shape) return
    let value = e.target.value.trim()
    setHexInput(value)
    if (!value.startsWith('#')) {
      value = '#' + value
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateShape(shape.id, { fill: value.toUpperCase() })
    }
  }

  const handleHexInputBlur = () => {
    if (!shape) return
    setHexInput(shape.fill)
  }

  return (
    <div className={`properties-panel ${!shape ? 'hidden' : ''}`}>
      {shape ? (
        <>
          <div className="panel-title">{typeLabels[shape.type]} 属性</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">X</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(shape.x)}
                onChange={(e) => handleNumberChange('x', e)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Y</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(shape.y)}
                onChange={(e) => handleNumberChange('y', e)}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">宽度</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(shape.width)}
                min={1}
                onChange={(e) => handleNumberChange('width', e)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">高度</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(shape.height)}
                min={1}
                onChange={(e) => handleNumberChange('height', e)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">旋转角度 (°)</label>
            <input
              type="number"
              className="form-input"
              value={Math.round(shape.rotation)}
              onChange={(e) => handleNumberChange('rotation', e)}
            />
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">填充颜色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                className="color-input"
                value={shape.fill}
                onChange={handleColorInputChange}
              />
              <input
                type="text"
                className="color-hex-input"
                value={hexInput}
                maxLength={7}
                onChange={handleHexInputChange}
                onBlur={handleHexInputBlur}
                placeholder="#RRGGBB"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="no-selection">选择图形以编辑属性</div>
      )}
    </div>
  )
}
