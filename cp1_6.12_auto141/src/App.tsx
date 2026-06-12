import { useState, useCallback } from 'react'
import Scene3D from './scene/Scene3D'
import ControlPanel from './ui/ControlPanel'
import InfoPopup from './ui/InfoPopup'
import { POIData } from './scene/DataLoader'

export default function App() {
  const [heatmapEnabled, setHeatmapEnabled] = useState(true)
  const [heatRange, setHeatRange] = useState<[number, number]>([20, 80])
  const [selectedPoi, setSelectedPoi] = useState<{ poi: POIData; x: number; y: number } | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const handlePoiClick = useCallback((poi: POIData | null, pos?: { x: number; y: number }) => {
    if (poi && pos) {
      setSelectedPoi({ poi, x: pos.x, y: pos.y })
    } else {
      setSelectedPoi(null)
    }
  }, [])

  const handleResetView = useCallback(() => {
    setResetKey((k) => k + 1)
  }, [])

  const handleRootClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-popup]')) return
    setSelectedPoi(null)
  }, [])

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onClick={handleRootClick}
    >
      <Scene3D
        heatmapEnabled={heatmapEnabled}
        heatRange={heatRange}
        onPoiClick={handlePoiClick}
        resetKey={resetKey}
      />
      <ControlPanel
        heatmapEnabled={heatmapEnabled}
        heatRange={heatRange}
        onHeatmapToggle={setHeatmapEnabled}
        onHeatRangeChange={setHeatRange}
        onResetView={handleResetView}
      />
      {selectedPoi && (
        <div data-popup>
          <InfoPopup
            poi={selectedPoi.poi}
            position={{ x: selectedPoi.x, y: selectedPoi.y }}
            onClose={() => setSelectedPoi(null)}
          />
        </div>
      )}
    </div>
  )
}
