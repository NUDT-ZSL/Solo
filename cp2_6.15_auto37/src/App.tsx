import UploadArea from './components/UploadArea'
import TerrainScene from './components/TerrainScene'
import ControlPanel from './components/ControlPanel'
import InfoPanel from './components/InfoPanel'
import { useTrailStore } from './store/trailStore'

export default function App() {
  const isLoading = useTrailStore((s) => s.isLoading)
  const loaded = useTrailStore((s) => s.loaded)
  const trailPoints = useTrailStore((s) => s.trailPoints)

  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="left-panel-header">
          <div className="left-panel-title">TrailView 3D</div>
          <div className="left-panel-subtitle">三维轨迹可视化工具</div>
        </div>

        <UploadArea />

        {loaded && trailPoints.length > 0 && (
          <div className="file-info">
            <div className="file-info-row">
              <span className="file-info-label">轨迹点数</span>
              <span className="file-info-value">{trailPoints.length} 个点</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">海拔范围</span>
              <span className="file-info-value">
                {Math.min(...trailPoints.map(p => p.ele)).toFixed(1)} - {Math.max(...trailPoints.map(p => p.ele)).toFixed(1)} m
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="scene-container">
          <TerrainScene />

          {isLoading && (
            <div className="loading-overlay">
              <div style={{ textAlign: 'center' }}>
                <div className="skeleton-grid">
                  <div className="skeleton-grid-inner">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="skeleton-line h"
                        style={{ top: `${i * 25}%` }}
                      />
                    ))}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="skeleton-line v"
                        style={{ left: `${i * 25}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="loading-text">加载地形数据中...</div>
              </div>
            </div>
          )}

          <ControlPanel />
        </div>
      </div>

      <InfoPanel />
    </div>
  )
}
