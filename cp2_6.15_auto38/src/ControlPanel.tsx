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
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '240px',
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(20, 20, 40, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '16px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          color: '#aaccff',
        }}
      >
        控制面板
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
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontSize: '13px',
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          {colorModeOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{
                background: '#1a1a2e',
                color: '#ffffff',
              }}
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
              background: 'rgba(68, 136, 255, 0.2)',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#88bbff',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {particleCount}
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
            style={{
              width: '100%',
              height: '18px',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-runnable-track {
              height: 6px;
              border-radius: 3px;
              background: #4488ff;
            }
            input[type="range"]::-moz-range-track {
              height: 6px;
              border-radius: 3px;
              background: #4488ff;
            }
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #ffffff;
              border: 2px solid #4488ff;
              margin-top: -6px;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(68, 136, 255, 0.4);
              transition: transform 0.1s;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.1);
            }
            input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #ffffff;
              border: 2px solid #4488ff;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(68, 136, 255, 0.4);
            }
          `}</style>
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
          <span>1000</span>
          <span>5000</span>
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          color: '#777788',
          lineHeight: 1.6,
        }}
      >
        <div>🖱️ 拖拽旋转视角</div>
        <div>🔍 滚轮缩放</div>
        <div>✨ 点击极光粒子触发爆炸</div>
      </div>
    </div>
  )
}
