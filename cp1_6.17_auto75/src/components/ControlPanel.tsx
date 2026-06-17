import { useState, useEffect } from 'react'
import { usePlantStore } from '../store'
import { STAGE_NAMES, STAGE_COLORS } from '../store'

interface ControlPanelProps {
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export function ControlPanel({ isMobile = false, isOpen = true, onClose }: ControlPanelProps) {
  const {
    water,
    nutrient,
    light,
    growthProgress,
    currentStage,
    particleCount,
    setWater,
    setNutrient,
    setLight,
    resetPlant,
    saveSnapshot,
    loadSnapshot,
    getSnapshots
  } = usePlantStore()

  const [snapshots, setSnapshots] = useState<Array<{ index: number; exists: boolean; stage: string }>>([])

  useEffect(() => {
    setSnapshots(getSnapshots())
  }, [getSnapshots])

  const handleSaveSnapshot = (index: number) => {
    saveSnapshot(index)
    setSnapshots(getSnapshots())
  }

  const handleLoadSnapshot = (index: number) => {
    if (loadSnapshot(index)) {
      setSnapshots(getSnapshots())
    }
  }

  const waterColorStart = '#4FC3F7'
  const waterColorEnd = '#1565C0'
  const nutrientColorStart = '#81C784'
  const nutrientColorEnd = '#2E7D32'
  const lightColorStart = '#FFF176'
  const lightColorEnd = '#F57F17'

  const getSliderBackground = (value: number, colorStart: string, colorEnd: string) => {
    const percentage = (value / 100) * 100
    return `linear-gradient(to right, ${colorStart} 0%, ${colorEnd} ${percentage}%, #2A2A4A ${percentage}%, #2A2A4A 100%)`
  }

  const sliderStyle = (value: number, colorStart: string, colorEnd: string): React.CSSProperties => ({
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: getSliderBackground(value, colorStart, colorEnd),
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none'
  })

  const sliderThumbStyle = (color: string): React.CSSProperties => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: color,
    cursor: 'pointer',
    appearance: 'none',
    transition: 'box-shadow 0.2s ease, transform 0.1s ease',
    boxShadow: '0 0 0 0 rgba(0,0,0,0)'
  })

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '70vh',
        overflowY: 'auto',
        background: '#16213E',
        borderRadius: '16px 16px 0 0',
        padding: '20px',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        zIndex: 100
      }
    : {
        background: '#16213E',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'filter 0.2s ease, transform 0.1s ease',
    filter: 'brightness(1)'
  }

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }

  return (
    <div style={panelStyle}>
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            textAlign: 'center',
            padding: '10px',
            cursor: 'pointer',
            color: '#8892b0',
            fontSize: '24px'
          }}
        >
          ─
        </div>
      )}

      <h2 style={{ color: '#e6f1ff', margin: '0 0 20px 0', fontSize: '20px' }}>
        控制面板
      </h2>

      <div style={{ marginBottom: '24px', padding: '16px', background: '#0f172a', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#8892b0', fontSize: '14px' }}>当前阶段</span>
          <span style={{ color: STAGE_COLORS[currentStage], fontSize: '16px', fontWeight: 'bold' }}>
            {STAGE_NAMES[currentStage]}
          </span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#8892b0', fontSize: '12px' }}>生长进度</span>
            <span style={{ color: '#ccd6f6', fontSize: '12px' }}>{growthProgress.toFixed(1)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#2A2A4A',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                height: '100%',
                background: STAGE_COLORS[currentStage],
                borderRadius: '4px',
                transition: 'width 0.3s ease, background-color 0.3s ease',
                width: `${growthProgress}%`
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8892b0', fontSize: '12px' }}>粒子数量</span>
          <span style={{ color: '#64ffda', fontSize: '12px' }}>{particleCount}</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: '#ccd6f6', fontSize: '14px' }}>💧 水分</label>
          <span style={{ color: waterColorEnd, fontSize: '14px', fontWeight: 'bold' }}>{water}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={water}
          onChange={(e) => setWater(Number(e.target.value))}
          style={sliderStyle(water, waterColorStart, waterColorEnd)}
          className="custom-slider"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: '#ccd6f6', fontSize: '14px' }}>🌱 养分</label>
          <span style={{ color: nutrientColorEnd, fontSize: '14px', fontWeight: 'bold' }}>{nutrient}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={nutrient}
          onChange={(e) => setNutrient(Number(e.target.value))}
          style={sliderStyle(nutrient, nutrientColorStart, nutrientColorEnd)}
          className="custom-slider"
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: '#ccd6f6', fontSize: '14px' }}>☀️ 光照</label>
          <span style={{ color: lightColorEnd, fontSize: '14px', fontWeight: 'bold' }}>{light}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={light}
          onChange={(e) => setLight(Number(e.target.value))}
          style={sliderStyle(light, lightColorStart, lightColorEnd)}
          className="custom-slider"
        />
      </div>

      <button
        onClick={resetPlant}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.97)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        🌱 重新播种
      </button>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ color: '#ccd6f6', fontSize: '14px', margin: '0 0 12px 0' }}>📸 快照</h3>
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.index}
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '8px'
            }}
          >
            <button
              onClick={() => handleLoadSnapshot(snapshot.index)}
              disabled={!snapshot.exists}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '6px',
                background: snapshot.exists ? '#1e3a5f' : '#1a1a2e',
                color: snapshot.exists ? '#ccd6f6' : '#555',
                fontSize: '12px',
                cursor: snapshot.exists ? 'pointer' : 'not-allowed',
                textAlign: 'left'
              }}
            >
              快照 {snapshot.index + 1}: {snapshot.stage}
            </button>
            <button
              onClick={() => handleSaveSnapshot(snapshot.index)}
              style={secondaryButtonStyle}
            >
              保存
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 0 0 rgba(100, 255, 218, 0);
          transition: box-shadow 0.2s ease;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 10px 3px rgba(100, 255, 218, 0.5);
        }
        .custom-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 0 rgba(100, 255, 218, 0);
          transition: box-shadow 0.2s ease;
        }
        .custom-slider::-moz-range-thumb:hover {
          box-shadow: 0 0 10px 3px rgba(100, 255, 218, 0.5);
        }
      `}</style>
    </div>
  )
}
