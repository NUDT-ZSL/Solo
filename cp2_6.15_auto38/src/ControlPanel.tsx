import React from 'react'
import { useAuroraStore, type ColorMode } from './store'

const colorModeOptions: { value: ColorMode; label: string }[] = [
  { value: 'auto', label: '自动渐变' },
  { value: 'arcticGreen', label: '北极绿' },
  { value: 'auroraPurple', label: '极光紫' },
  { value: 'flameRed', label: '火焰红' },
]

export default function ControlPanel() {
  const { colorMode, particleCount, setColorMode, setParticleCount } = useAuroraStore()

  return (
    <>
      <style>{`
        .aurora-control-panel {
          position: fixed;
          top: 20px;
          left: 20px;
          width: 240px;
          padding: 20px;
          border-radius: 12px;
          background-color: rgba(20, 20, 40, 0.8);
          background: rgba(20, 20, 40, 0.8);
          background: linear-gradient(
            135deg,
            rgba(20, 20, 40, 0.85) 0%,
            rgba(30, 30, 60, 0.75) 50%,
            rgba(20, 20, 40, 0.85) 100%
          );
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          -moz-backdrop-filter: blur(10px) saturate(180%);
          -ms-backdrop-filter: blur(10px) saturate(180%);
          background-clip: padding-box;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
                      0 0 40px rgba(68, 136, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          user-select: none;
        }
        .aurora-control-panel select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 13px;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .aurora-control-panel select:hover {
          border-color: rgba(68, 136, 255, 0.6);
          background: rgba(255, 255, 255, 0.12);
        }
        .aurora-control-panel select:focus {
          border-color: #4488ff;
          box-shadow: 0 0 0 2px rgba(68, 136, 255, 0.2);
        }
        .aurora-control-panel select option {
          background: #1a1a2e;
          color: #ffffff;
        }
        .aurora-range-input {
          width: 100%;
          height: 18px;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        .aurora-range-input:focus {
          outline: none;
        }
        .aurora-range-input::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, #4488ff, #66aaff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .aurora-range-input::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, #4488ff, #66aaff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          border: none;
        }
        .aurora-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4488ff;
          margin-top: -6px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(68, 136, 255, 0.5),
                      0 1px 3px rgba(0,0,0,0.3);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .aurora-range-input::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 12px rgba(68, 136, 255, 0.7),
                      0 1px 3px rgba(0,0,0,0.3);
        }
        .aurora-range-input::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }
        .aurora-range-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4488ff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(68, 136, 255, 0.5),
                      0 1px 3px rgba(0,0,0,0.3);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .aurora-range-input::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 12px rgba(68, 136, 255, 0.7),
                      0 1px 3px rgba(0,0,0,0.3);
        }
      `}</style>
      <div className="aurora-control-panel">
        <h3
          style={{
            margin: 0,
            marginBottom: '16px',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#aaccff',
            textShadow: '0 0 10px rgba(170, 204, 255, 0.3)',
          }}
        >
          ✨ 控制面板
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#bbbbcc',
              fontWeight: 500,
            }}
          >
            极光颜色模式
          </label>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
          >
            {colorModeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#bbbbcc',
              fontWeight: 500,
            }}
          >
            <span>粒子数量</span>
            <span
              style={{
                background: 'linear-gradient(135deg, rgba(68, 136, 255, 0.25), rgba(136, 68, 255, 0.25))',
                padding: '2px 8px',
                borderRadius: '4px',
                color: '#88bbff',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid rgba(68, 136, 255, 0.3)',
              }}
            >
              {particleCount.toLocaleString()}
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={1000}
              max={5000}
              step={500}
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              className="aurora-range-input"
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '11px',
              color: '#777788',
            }}
          >
            <span>1,000</span>
            <span>3,000</span>
            <span>5,000</span>
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '11px',
            color: '#888899',
            lineHeight: 1.7,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🖱️</span><span>拖拽旋转视角</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span><span>滚轮拉近拉远</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✨</span><span>点击极光粒子触发爆炸</span>
          </div>
        </div>
      </div>
    </>
  )
}
