import { usePlantStore, STAGE_NAMES, STAGE_COLORS, GrowthStage } from '../store'
import { SnapshotData } from '../store'

interface ControlPanelProps {
  particleCount: number
}

const getSliderGradient = (value: number, type: 'water' | 'nutrients' | 'light'): string => {
  const colors = {
    water: { start: '#4FC3F7', end: '#1565C0' },
    nutrients: { start: '#81C784', end: '#2E7D32' },
    light: { start: '#FFF176', end: '#F57F17' },
  }
  const { start, end } = colors[type]
  const percent = value
  return `linear-gradient(to right, ${start} 0%, ${end} ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function ControlPanel({ particleCount }: ControlPanelProps) {
  const {
    water,
    nutrients,
    light,
    stage,
    growthProgress,
    snapshots,
    setWater,
    setNutrients,
    setLight,
    resetPlant,
    saveSnapshot,
    loadSnapshot,
  } = usePlantStore()

  const handleWaterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWater(Number(e.target.value))
  }

  const handleNutrientsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNutrients(Number(e.target.value))
  }

  const handleLightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLight(Number(e.target.value))
  }

  const handleReset = () => {
    resetPlant()
  }

  const handleSnapshot = () => {
    saveSnapshot(particleCount)
  }

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  }

  const sliderThumbStyle = `
    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: box-shadow 0.2s ease;
    }
    .custom-slider::-webkit-slider-thumb:hover {
      box-shadow: 0 0 12px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.3);
    }
    .custom-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: box-shadow 0.2s ease;
    }
    .custom-slider::-moz-range-thumb:hover {
      box-shadow: 0 0 12px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.3);
    }
  `

  return (
    <div style={panelStyle}>
      <style>{sliderThumbStyle}</style>

      <h2 style={titleStyle}>控制面板</h2>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>生长状态</h3>
        <div style={statusGridStyle}>
          <div style={statusItemStyle}>
            <span style={statusLabelStyle}>当前阶段</span>
            <span style={{ ...statusValueStyle, color: STAGE_COLORS[stage as GrowthStage] }}>
              {STAGE_NAMES[stage as GrowthStage]}
            </span>
          </div>
          <div style={statusItemStyle}>
            <span style={statusLabelStyle}>粒子数量</span>
            <span style={statusValueStyle}>{particleCount}</span>
          </div>
          <div style={statusItemStyle}>
            <span style={statusLabelStyle}>整体进度</span>
            <span style={statusValueStyle}>{Math.round(growthProgress * 100)}%</span>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>环境调控</h3>

        <div style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span style={sliderLabelTextStyle}>💧 水分</span>
            <span style={sliderValueStyle}>{Math.round(water)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={water}
            onChange={handleWaterChange}
            className="custom-slider"
            style={{
              ...sliderStyle,
              background: getSliderGradient(water, 'water'),
            }}
          />
        </div>

        <div style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span style={sliderLabelTextStyle}>🌱 养分</span>
            <span style={sliderValueStyle}>{Math.round(nutrients)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={nutrients}
            onChange={handleNutrientsChange}
            className="custom-slider"
            style={{
              ...sliderStyle,
              background: getSliderGradient(nutrients, 'nutrients'),
            }}
          />
        </div>

        <div style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span style={sliderLabelTextStyle}>☀️ 光照</span>
            <span style={sliderValueStyle}>{Math.round(light)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={light}
            onChange={handleLightChange}
            className="custom-slider"
            style={{
              ...sliderStyle,
              background: getSliderGradient(light, 'light'),
            }}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>操作</h3>
        <div style={buttonGroupStyle}>
          <button style={primaryButtonStyle} onClick={handleSnapshot}>
            📷 快照
          </button>
          <button style={secondaryButtonStyle} onClick={handleReset}>
            🔄 重新播种
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>快照 ({snapshots.length}/3)</h3>
        <div style={snapshotsContainerStyle}>
          {snapshots.length === 0 ? (
            <p style={emptySnapshotsStyle}>暂无快照</p>
          ) : (
            snapshots.map((snap: SnapshotData, index: number) => (
              <div key={index} style={snapshotItemStyle} onClick={() => loadSnapshot(index)}>
                <div style={snapshotHeaderStyle}>
                  <span style={{ ...snapshotStageStyle, color: STAGE_COLORS[snap.stage as GrowthStage] }}>
                    {STAGE_NAMES[snap.stage as GrowthStage]}
                  </span>
                  <span style={snapshotDateStyle}>{formatDate(snap.timestamp)}</span>
                </div>
                <div style={snapshotDetailsStyle}>
                  <span>💧{Math.round(snap.water)}</span>
                  <span>🌱{Math.round(snap.nutrients)}</span>
                  <span>☀️{Math.round(snap.light)}</span>
                  <span>✨{snap.particleCount}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  backgroundColor: '#16213E',
  borderRadius: '16px',
  padding: '20px',
  height: '100%',
  overflowY: 'auto',
  boxSizing: 'border-box',
}

const titleStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  textAlign: 'center',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '24px',
}

const sectionTitleStyle: React.CSSProperties = {
  color: '#E0E0E0',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
}

const statusGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
}

const statusItemStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const statusLabelStyle: React.CSSProperties = {
  color: '#9E9E9E',
  fontSize: '12px',
}

const statusValueStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '18px',
  fontWeight: 'bold',
}

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: '16px',
}

const sliderLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
}

const sliderLabelTextStyle: React.CSSProperties = {
  color: '#E0E0E0',
  fontSize: '14px',
}

const sliderValueStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  backgroundColor: 'rgba(255,255,255,0.1)',
  padding: '2px 8px',
  borderRadius: '4px',
}

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
}

const buttonBaseStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.1s ease, filter 0.2s ease',
}

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
  color: '#fff',
}

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
  color: '#fff',
}

const snapshotsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const emptySnapshotsStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '14px',
  textAlign: 'center',
  padding: '20px 0',
  margin: 0,
}

const snapshotItemStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: '8px',
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
}

const snapshotHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '6px',
}

const snapshotStageStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '14px',
}

const snapshotDateStyle: React.CSSProperties = {
  color: '#888',
  fontSize: '12px',
}

const snapshotDetailsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  color: '#aaa',
  fontSize: '12px',
}
