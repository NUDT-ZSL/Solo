import React, { useState, useEffect } from 'react'

interface UIProps {
  brushSize: number
  onBrushSizeChange: (size: number) => void
  onReset: () => void
  onSave: () => void
  onLoad: () => void
  fps: number
}

const UI: React.FC<UIProps> = ({ brushSize, onBrushSizeChange, onReset, onSave, onLoad, fps }) => {
  const [guideOpacity, setGuideOpacity] = useState(0)
  const [fpsBlink, setFpsBlink] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setGuideOpacity(1), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (fps < 45) {
      const interval = setInterval(() => setFpsBlink(b => !b), 500)
      return () => clearInterval(interval)
    } else {
      setFpsBlink(false)
    }
  }, [fps])

  const fpsColor = fps < 45 ? (fpsBlink ? '#ff4444' : '#ff6666') : '#44ff44'
  const previewSize = 20 + brushSize * 2

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  }

  const getBtnStyle = (name: string) => ({
    ...buttonStyle,
    ...(hovered === name ? {
      transform: 'scale(1.1)',
      background: 'rgba(255,255,255,0.2)',
    } : {}),
  })

  const getSliderStyle = () => ({
    transform: hovered === 'slider' ? 'scale(1.05)' : 'scale(1)',
    transition: 'transform 0.2s ease',
  })

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#e0e0e0',
          fontSize: '16px',
          opacity: guideOpacity,
          transition: 'opacity 1s ease',
          pointerEvents: 'none',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          zIndex: 100,
        }}
      >
        鼠标拖拽移动视角，按住左键推沙
      </div>

      <div
        style={{
          position: 'absolute',
          top: '60px',
          left: '20px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '8px',
          padding: '20px',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          minWidth: '240px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
            笔刷大小: {brushSize}px
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={getSliderStyle()}>
              <input
                type="range"
                min={5}
                max={15}
                step={1}
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                style={{
                  width: '150px',
                  accentColor: '#D2B48C',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered('slider')}
                onMouseLeave={() => setHovered(null)}
              />
            </div>
            <div
              style={{
                width: `${previewSize}px`,
                height: `${previewSize}px`,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #F5DEB3 0%, #D2B48C 40%, #8B4513 100%)',
                boxShadow: `0 0 ${brushSize}px rgba(210, 180, 140, 0.6)`,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            style={getBtnStyle('reset')}
            onMouseEnter={() => setHovered('reset')}
            onMouseLeave={() => setHovered(null)}
            onClick={onReset}
          >
            重置地形 (R)
          </button>
          <button
            style={getBtnStyle('save')}
            onMouseEnter={() => setHovered('save')}
            onMouseLeave={() => setHovered(null)}
            onClick={onSave}
          >
            保存地形 (S)
          </button>
          <button
            style={getBtnStyle('load')}
            onMouseEnter={() => setHovered('load')}
            onMouseLeave={() => setHovered(null)}
            onClick={onLoad}
          >
            导入地形 (L)
          </button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.6, lineHeight: 1.6 }}>
          滚轮缩放视角 &middot; 右键平移
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: fpsColor,
          fontFamily: "'Courier New', monospace",
          fontSize: '14px',
          textShadow: `0 0 10px ${fpsColor}`,
          zIndex: 100,
          transition: 'color 0.3s ease, opacity 0.3s ease',
          opacity: fps < 45 && fpsBlink ? 0.4 : 1,
          background: 'rgba(0,0,0,0.4)',
          padding: '6px 12px',
          borderRadius: '6px',
        }}
      >
        FPS: {fps.toFixed(0)}
      </div>
    </>
  )
}

export default UI
