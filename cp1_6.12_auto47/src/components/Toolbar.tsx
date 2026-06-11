import './Toolbar.css'

interface ToolbarProps {
  heatmapMode: boolean
  onHeatmapToggle: () => void
  heatmapRadius: number
  onHeatmapRadiusChange: (radius: number) => void
}

export default function Toolbar({
  heatmapMode,
  onHeatmapToggle,
  heatmapRadius,
  onHeatmapRadiusChange,
}: ToolbarProps) {
  return (
    <div className="map-toolbar">
      <button
        className={`toolbar-btn ${heatmapMode ? 'active' : ''}`}
        onClick={onHeatmapToggle}
        title="切换热力图模式"
      >
        <span className="btn-icon">🔥</span>
        <span className="btn-text">热力图</span>
      </button>

      {heatmapMode && (
        <div className="radius-control">
          <span className="radius-label">半径</span>
          <input
            type="range"
            min="10"
            max="80"
            value={heatmapRadius}
            onChange={(e) => onHeatmapRadiusChange(Number(e.target.value))}
            className="radius-slider"
          />
          <span className="radius-value">{heatmapRadius}px</span>
        </div>
      )}
    </div>
  )
}
