import { useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import type { Stage } from './types'
import './ControlPanel.css'

interface ControlPanelProps {
  stages: Stage[]
  onAddStage: (name: string, value: number) => void
  onRemoveStage: (id: string) => void
  onUpdateStage: (id: string, field: 'name' | 'value', value: string | number) => void
  isExporting: boolean
  setIsExporting: (value: boolean) => void
}

function ControlPanel({
  stages,
  onAddStage,
  onRemoveStage,
  onUpdateStage,
  isExporting,
  setIsExporting,
}: ControlPanelProps) {
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState(500)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddClick = useCallback(() => {
    if (stages.length >= 8) return
    setIsAdding(true)
    setTimeout(() => setIsAdding(false), 150)
    onAddStage(newName, newValue)
    setNewName('')
    setNewValue(500)
  }, [stages.length, newName, newValue, onAddStage])

  const handleExport = useCallback(async () => {
    const container = document.getElementById('funnel-canvas-container')
    if (!container) return

    setIsExporting(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const dataUrl = await toPng(container, {
        width: 1440,
        height: 900,
        pixelRatio: 2,
        backgroundColor: '#121212',
      })

      const link = document.createElement('a')
      link.download = `funnel-chart-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setTimeout(() => setIsExporting(false), 500)
    }
  }, [setIsExporting])

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2 className="panel-title">FunnelFlow</h2>
        <span className="panel-subtitle">3D漏斗图生成器</span>
      </div>

      <div className="panel-content">
        <div className="section">
          <h3 className="section-title">当前阶段 ({stages.length}/8)</h3>
          <div className="stages-list">
            {stages.map((stage, index) => (
              <div key={stage.id} className="stage-item">
                <div className="stage-header">
                  <span className="stage-index" style={{ backgroundColor: `hsl(${210 - index * 30}, 70%, 60%)` }}>
                    {index + 1}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={() => onRemoveStage(stage.id)}
                    aria-label="删除阶段"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  className="stage-input"
                  value={stage.name}
                  onChange={e => onUpdateStage(stage.id, 'name', e.target.value.slice(0, 20))}
                  placeholder="阶段名称"
                  maxLength={20}
                />
                <div className="slider-container">
                  <input
                    type="range"
                    min="1"
                    max="1000"
                    value={stage.value}
                    onChange={e => onUpdateStage(stage.id, 'value', parseInt(e.target.value))}
                    className="stage-slider"
                  />
                  <span className="slider-value">{stage.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">添加新阶段</h3>
          <div className="add-form">
            <input
              type="text"
              className="stage-input"
              value={newName}
              onChange={e => setNewName(e.target.value.slice(0, 20))}
              placeholder="输入阶段名称 (最多20字符)"
              maxLength={20}
            />
            <div className="slider-container">
              <input
                type="range"
                min="1"
                max="1000"
                value={newValue}
                onChange={e => setNewValue(parseInt(e.target.value))}
                className="stage-slider"
              />
              <span className="slider-value">{newValue}</span>
            </div>
            <button
              className={`add-btn ${isAdding ? 'adding' : ''}`}
              onClick={handleAddClick}
              disabled={stages.length >= 8}
            >
              {stages.length >= 8 ? '已达最大阶段数' : '+ 添加阶段'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <button
          className="export-btn"
          onClick={handleExport}
          disabled={isExporting || stages.length === 0}
        >
          📷 导出PNG (1440×900)
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
