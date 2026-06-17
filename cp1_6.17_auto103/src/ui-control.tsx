import React from 'react'
import { useAppStore, ObstacleType } from './store'

const obstacleTypes: { type: ObstacleType; label: string; color: string }[] = [
  { type: 'cube', label: '立方体', color: '#8B4513' },
  { type: 'sphere', label: '球体', color: '#A9A9A9' },
  { type: 'torus', label: '环形', color: '#FFD700' },
]

export const UIControl: React.FC = () => {
  const {
    isRunning,
    timeScale,
    obstacles,
    placingObstacleType,
    setIsRunning,
    setTimeScale,
    reset,
    setPlacingObstacleType,
    removeObstacle,
    selectedObstacleId,
  } = useAppStore()

  const handleReset = () => {
    reset()
  }

  const handleObstacleTypeClick = (type: ObstacleType) => {
    if (obstacles.length >= 5) {
      return
    }
    if (placingObstacleType === type) {
      setPlacingObstacleType(null)
    } else {
      setPlacingObstacleType(type)
    }
  }

  return (
    <div
      className="control-panel"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        background: '#2C3E50',
        borderRadius: 10,
        padding: 16,
        zIndex: 1000,
        minWidth: 280,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            color: '#ECF0F1',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          障碍物 ({obstacles.length}/5)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {obstacleTypes.map((item) => (
            <button
              key={item.type}
              onClick={() => handleObstacleTypeClick(item.type)}
              disabled={obstacles.length >= 5 && placingObstacleType !== item.type}
              style={{
                flex: 1,
                minWidth: 70,
                padding: '8px 12px',
                border: `2px solid ${
                  placingObstacleType === item.type ? item.color : 'transparent'
                }`,
                borderRadius: 6,
                background: placingObstacleType === item.type
                  ? `${item.color}33`
                  : '#34495E',
                color: '#ECF0F1',
                fontSize: 12,
                cursor: obstacles.length >= 5 && placingObstacleType !== item.type
                  ? 'not-allowed'
                  : 'pointer',
                opacity: obstacles.length >= 5 && placingObstacleType !== item.type
                  ? 0.5
                  : 1,
                transition: 'all 0.2s',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: item.type === 'sphere' ? '50%' : 2,
                  background: item.color,
                  marginRight: 6,
                }}
              />
              {item.label}
            </button>
          ))}
        </div>
        {placingObstacleType && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: '#3498DB',
            }}
          >
            点击场景放置 · 右键取消
          </div>
        )}
      </div>

      {obstacles.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              color: '#ECF0F1',
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            已放置:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {obstacles.map((obs, idx) => (
              <div
                key={obs.id}
                onClick={() => removeObstacle(obs.id)}
                style={{
                  padding: '4px 10px',
                  background: selectedObstacleId === obs.id
                    ? '#E74C3C'
                    : '#34495E',
                  borderRadius: 14,
                  fontSize: 11,
                  color: '#ECF0F1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: obs.type === 'sphere' ? '50%' : 2,
                    background:
                      obs.type === 'cube'
                        ? '#8B4513'
                        : obs.type === 'sphere'
                        ? '#A9A9A9'
                        : '#FFD700',
                  }}
                />
                {idx + 1}
                <span style={{ opacity: 0.6 }}>×</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#7F8C8D', marginTop: 4 }}>
            点击删除 · 右键拖拽移动
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button
          onClick={() => setIsRunning(!isRunning)}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRadius: 6,
            background: isRunning ? '#E74C3C' : '#2ECC71',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {isRunning ? '⏸ 暂停' : '▶ 运行'}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: 6,
            background: '#7F8C8D',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          ↺ 重置
        </button>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ color: '#BDC3C7', fontSize: 13 }}>时间倍速</span>
          <span
            style={{
              color: '#3498DB',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Consolas, monospace',
            }}
          >
            {timeScale.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.5}
          value={timeScale}
          onChange={(e) => setTimeScale(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: '#34495E',
            outline: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#7F8C8D',
            marginTop: 4,
          }}
        >
          <span>1x</span>
          <span>2x</span>
          <span>3x</span>
        </div>
      </div>
    </div>
  )
}
