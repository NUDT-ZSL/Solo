import { useState, useCallback } from 'react'
import FunnelScene from './FunnelScene'
import ControlPanel from './ControlPanel'
import type { Stage } from './types'
import './App.css'

const generateId = () => Math.random().toString(36).substr(2, 9)

const initialStages: Stage[] = [
  { id: generateId(), name: '注册', value: 1000 },
  { id: generateId(), name: '浏览', value: 750 },
  { id: generateId(), name: '加购', value: 400 },
  { id: generateId(), name: '支付', value: 200 },
]

function App() {
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [isExporting, setIsExporting] = useState(false)

  const handleAddStage = useCallback((name: string, value: number) => {
    if (stages.length >= 8) return
    const newStage: Stage = {
      id: generateId(),
      name: name.trim() || `阶段${stages.length + 1}`,
      value,
    }
    setStages(prev => [...prev, newStage])
  }, [stages.length])

  const handleRemoveStage = useCallback((id: string) => {
    setStages(prev => prev.filter(stage => stage.id !== id))
  }, [])

  const handleUpdateStage = useCallback((id: string, field: 'name' | 'value', value: string | number) => {
    setStages(prev => prev.map(stage =>
      stage.id === id ? { ...stage, [field]: value } : stage
    ))
  }, [])

  return (
    <div className="app-container">
      <div className="scene-wrapper" id="funnel-canvas-container">
        <FunnelScene stages={stages} />
      </div>
      <ControlPanel
        stages={stages}
        onAddStage={handleAddStage}
        onRemoveStage={handleRemoveStage}
        onUpdateStage={handleUpdateStage}
        isExporting={isExporting}
        setIsExporting={setIsExporting}
      />
      {isExporting && (
        <div className="export-overlay">
          <div className="export-spinner"></div>
          <span>正在导出...</span>
        </div>
      )}
    </div>
  )
}

export default App
