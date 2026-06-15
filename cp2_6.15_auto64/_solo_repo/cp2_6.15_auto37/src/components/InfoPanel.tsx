import { useTrailStore } from '../store/trailStore'

export default function InfoPanel() {
  const trailPoints = useTrailStore((s) => s.trailPoints)
  const currentIndex = useTrailStore((s) => s.currentIndex)
  const totalClimb = useTrailStore((s) => s.totalClimb)
  const currentSlope = useTrailStore((s) => s.currentSlope)
  const loaded = useTrailStore((s) => s.loaded)

  if (!loaded || trailPoints.length === 0) {
    return (
      <div style={{
        background: '#37474f',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0, 230, 118, 0.15)',
        width: '260px',
      }}>
        <div className="panel-title">轨迹信息</div>
        <div style={{
          fontSize: '13px',
          color: '#90a4ae',
          padding: '20px 0',
          textAlign: 'center',
          lineHeight: 1.8,
        }}>
          <div>📤 请上传GPX文件</div>
          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
            支持徒步、骑行等户外轨迹
          </div>
        </div>
      </div>
    )
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), trailPoints.length - 1)
  const currentPoint = trailPoints[safeIndex]

  return (
    <div style={{
      background: '#37474f',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 230, 118, 0.15)',
      width: '100%',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div className="panel-title">实时轨迹数据</div>

      <div className="info-cards">
        <div className="info-card">
          <div className="info-card-label">经度 (LON)</div>
          <div className="info-card-value">
            {currentPoint?.lon.toFixed(6) || '0.000000'}
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-label">纬度 (LAT)</div>
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
          <div className="info-card-value" style={{
            color: currentSlope > 5 ? '#ff7043' : currentSlope < -3 ? '#42a5f5' : '#00e676',
          }}>
            {currentSlope >= 0 ? '↑ ' : '↓ '}
            {Math.abs(currentSlope).toFixed(1)}
            <span className="info-card-unit">°</span>
            <span style={{
              fontSize: '11px',
              color: '#90a4ae',
              marginLeft: '8px',
              fontWeight: 'normal',
            }}>
              {currentSlope > 8 ? '陡坡' :
               currentSlope > 3 ? '上坡' :
               currentSlope > -3 ? '平缓' :
               currentSlope > -8 ? '下坡' : '陡降'}
            </span>
          </div>
        </div>
      </div>

      <div className="trail-stats" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,230,118,0.1)' }}>
        <div className="file-info-row">
          <span className="file-info-label">轨迹点数</span>
          <span className="file-info-value">{trailPoints.length}</span>
        </div>
        <div className="file-info-row">
          <span className="file-info-label">进度</span>
          <span className="file-info-value" style={{ color: '#00e676' }}>
            {Math.round((safeIndex / (trailPoints.length - 1 || 1)) * 100)}%
          </span>
        </div>
        <div className="file-info-row">
          <span className="file-info-label">海拔范围</span>
          <span className="file-info-value">
            {Math.min(...trailPoints.map(p => p.ele)).toFixed(0)} - {Math.max(...trailPoints.map(p => p.ele)).toFixed(0)}m
          </span>
        </div>
      </div>
    </div>
  )
}
