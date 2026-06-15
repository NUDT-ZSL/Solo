import { useTrailStore } from '../store/trailStore'

export default function InfoPanel() {
  const trailPoints = useTrailStore((s) => s.trailPoints)
  const currentIndex = useTrailStore((s) => s.currentIndex)
  const totalClimb = useTrailStore((s) => s.totalClimb)
  const currentSlope = useTrailStore((s) => s.currentSlope)
  const loaded = useTrailStore((s) => s.loaded)

  if (!loaded || trailPoints.length === 0) {
    return (
      <div className="right-panel">
        <div className="panel-title">轨迹信息</div>
        <div style={{ fontSize: '13px', color: '#90a4ae', padding: '20px 0', textAlign: 'center' }}>
          上传GPX文件后显示
        </div>
      </div>
    )
  }

  const currentPoint = trailPoints[Math.min(currentIndex, trailPoints.length - 1)]

  return (
    <div className="right-panel">
      <div className="panel-title">轨迹信息</div>

      <div className="info-cards">
        <div className="info-card">
          <div className="info-card-label">经度</div>
          <div className="info-card-value">
            {currentPoint?.lon.toFixed(6) || '0.000000'}
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-label">纬度</div>
          <div className="info-card-value">
            {currentPoint?.lat.toFixed(6) || '0.000000'}
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-label">海拔</div>
          <div className="info-card-value">
            {currentPoint?.ele.toFixed(1) || '0.0'}
            <span className="info-card-unit">m</span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-label">累计爬升</div>
          <div className="info-card-value">
            {totalClimb.toFixed(1)}
            <span className="info-card-unit">m</span>
          </div>
        </div>

        <div className="info-card" style={{ width: '100%' }}>
          <div className="info-card-label">当前坡度</div>
          <div className="info-card-value">
            {currentSlope.toFixed(1)}
            <span className="info-card-unit">°</span>
          </div>
        </div>
      </div>

      <div className="trail-stats">
        <div className="file-info-row">
          <span className="file-info-label">轨迹点数</span>
          <span className="file-info-value">{trailPoints.length}</span>
        </div>
        <div className="file-info-row">
          <span className="file-info-label">当前进度</span>
          <span className="file-info-value">
            {Math.round((currentIndex / (trailPoints.length - 1 || 1)) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
