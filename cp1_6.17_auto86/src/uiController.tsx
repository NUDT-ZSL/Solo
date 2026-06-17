import { useState, useMemo } from 'react'
import { useWeatherStore, WeatherMode } from './store'

const weatherButtonColors: Record<WeatherMode, string> = {
  sunny: '#FFD54F',
  rainy: '#4FC3F7',
  snowy: '#FAFAFA',
}

const weatherLabels: Record<WeatherMode, string> = {
  sunny: '晴',
  rainy: '雨',
  snowy: '雪',
}

export function UIController() {
  const weather = useWeatherStore((s) => s.weather)
  const particleCount = useWeatherStore((s) => s.particleCount)
  const coverageRatio = useWeatherStore((s) => s.coverageRatio)
  const fps = useWeatherStore((s) => s.fps)
  const setWeather = useWeatherStore((s) => s.setWeather)
  const triggerReset = useWeatherStore((s) => s.triggerReset)

  const [clickedButton, setClickedButton] = useState<WeatherMode | null>(null)

  const handleWeatherClick = (mode: WeatherMode) => {
    setClickedButton(mode)
    setWeather(mode)
    setTimeout(() => setClickedButton(null), 200)
  }

  const fpsBorderColor = fps < 30 ? '#F44336' : 'transparent'
  const coveragePercent = (coverageRatio * 100).toFixed(1)

  const containerStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    position: 'relative' as const,
    overflow: 'hidden',
  }), [])

  const buttonsContainerStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '14px',
    zIndex: 10,
    flexWrap: 'wrap' as const,
  }), [])

  const buttonBaseStyle = (mode: WeatherMode) => ({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: weather === mode ? '3px solid #333' : '2px solid rgba(0,0,0,0.15)',
    backgroundColor: weatherButtonColors[mode],
    cursor: 'pointer',
    transition: 'transform 0.2s ease-out, box-shadow 0.3s ease',
    transform: clickedButton === mode ? 'scale(1.1)' : weather === mode ? 'scale(1.05)' : 'scale(1)',
    boxShadow: weather === mode
      ? '0 4px 16px rgba(0,0,0,0.25)'
      : '0 2px 8px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: mode === 'snowy' ? '#555' : '#333',
    fontWeight: 600,
    fontSize: '14px',
    outline: 'none',
    padding: 0,
  })

  const statsPanelStyle = {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    width: '220px',
    backgroundColor: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    padding: '16px 18px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    border: fps < 30 ? `2px solid ${fpsBorderColor}` : '2px solid transparent',
    zIndex: 10,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'border-color 0.3s ease',
  }

  const statRowStyle = {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#444',
  }

  const statLabelStyle = {
    color: '#666',
    fontWeight: 500,
  }

  const statValueStyle = {
    fontWeight: 600,
    color: '#222',
    fontVariantNumeric: 'tabular-nums' as const,
  }

  const fpsStyle = {
    color: fps < 30 ? '#F44336' : '#222',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums' as const,
  }

  const resetButtonStyle = {
    marginTop: '10px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: fps < 30 ? '#F44336' : '#455A64',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'transform 0.3s ease, background-color 0.3s ease',
  }

  const mediaQueryStyle = `
    @media (max-width: 640px) {
      .weather-buttons {
        flex-direction: row !important;
        left: 50% !important;
        transform: translateX(-50%);
        top: 12px !important;
        gap: 10px !important;
      }
      .stats-panel {
        top: auto !important;
        bottom: 12px !important;
        left: 50% !important;
        right: auto !important;
        transform: translateX(-50%);
        width: calc(100% - 32px) !important;
        max-width: 320px;
      }
    }
  `

  return (
    <div style={containerStyle}>
      <style>{mediaQueryStyle}</style>
      <style>{`
        .weather-btn:hover { transform: scale(1.08) !important; box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important; }
        .reset-btn:hover { transform: scale(1.03); background-color: #37474F !important; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div className="weather-buttons" style={buttonsContainerStyle}>
        {(['sunny', 'rainy', 'snowy'] as WeatherMode[]).map((mode) => (
          <button
            key={mode}
            className="weather-btn"
            style={buttonBaseStyle(mode)}
            onClick={() => handleWeatherClick(mode)}
            title={weatherLabels[mode]}
          >
            {weatherLabels[mode]}
          </button>
        ))}
      </div>

      <div className="stats-panel" style={statsPanelStyle}>
        <div style={{ ...statRowStyle, marginBottom: '10px' }}>
          <span style={{ fontWeight: 700, color: '#222', fontSize: '14px' }}>统计面板</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>粒子数量</span>
          <span style={statValueStyle}>{particleCount}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>覆盖比例</span>
          <span style={statValueStyle}>{coveragePercent}%</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>帧率 FPS</span>
          <span style={fpsStyle}>{fps}</span>
        </div>
        <button
          className="reset-btn"
          style={resetButtonStyle}
          onClick={triggerReset}
        >
          重置场景
        </button>
      </div>
    </div>
  )
}
