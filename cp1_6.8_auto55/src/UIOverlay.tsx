import React, { useState, useCallback } from 'react';
import { AuroraParams, DEFAULT_PARAMS } from './AuroraPhysics';
import { AuroraInfoData } from './InteractionManager';

interface UIOverlayProps {
  onParamsChange: (params: Partial<AuroraParams>) => void;
  onReset: () => void;
  auroraInfo: AuroraInfoData | null;
}

const glassBase: React.CSSProperties = {
  background: 'rgba(10, 10, 50, 0.55)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '16px',
  border: '1px solid rgba(100, 200, 255, 0.15)',
  color: '#e0e8ff',
  fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(100, 200, 255, 0.2)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
  fontSize: '13px',
  letterSpacing: '0.5px',
};

export const UIOverlay: React.FC<UIOverlayProps> = ({ onParamsChange, onReset, auroraInfo }) => {
  const [flowSpeed, setFlowSpeed] = useState(DEFAULT_PARAMS.flowSpeed);
  const [particleDensity, setParticleDensity] = useState(DEFAULT_PARAMS.particleDensity);
  const [distortion, setDistortion] = useState(DEFAULT_PARAMS.distortion);

  const handleFlowSpeed = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setFlowSpeed(v);
      onParamsChange({ flowSpeed: v });
    },
    [onParamsChange]
  );

  const handleDensity = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setParticleDensity(v);
      onParamsChange({ particleDensity: v });
    },
    [onParamsChange]
  );

  const handleDistortion = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setDistortion(v);
      onParamsChange({ distortion: v });
    },
    [onParamsChange]
  );

  const handleReset = useCallback(() => {
    setFlowSpeed(DEFAULT_PARAMS.flowSpeed);
    setParticleDensity(DEFAULT_PARAMS.particleDensity);
    setDistortion(DEFAULT_PARAMS.distortion);
    onReset();
  }, [onReset]);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '32px',
            ...glassBase,
            padding: '16px 24px',
            pointerEvents: 'auto',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #00ffa8, #ff66ff, #ffd700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '2px',
            }}
          >
            极光幻境
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.6, letterSpacing: '1px' }}>
            Aurora Illusion
          </p>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '240px',
            ...glassBase,
            padding: '20px',
            pointerEvents: 'auto',
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: '14px',
              fontWeight: 500,
              opacity: 0.9,
              borderBottom: '1px solid rgba(100, 200, 255, 0.15)',
              paddingBottom: '10px',
              letterSpacing: '1px',
            }}
          >
            🎛 控制面板
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <div style={labelStyle}>
              <span>极光流速</span>
              <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                {flowSpeed.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={flowSpeed}
              onChange={handleFlowSpeed}
              style={sliderStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={labelStyle}>
              <span>粒子密度</span>
              <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                {particleDensity.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={particleDensity}
              onChange={handleDensity}
              style={sliderStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={labelStyle}>
              <span>光带扭曲度</span>
              <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                {distortion.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={distortion}
              onChange={handleDistortion}
              style={sliderStyle}
            />
          </div>

          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '8px 0',
              border: '1px solid rgba(100, 200, 255, 0.25)',
              borderRadius: '8px',
              background: 'rgba(100, 200, 255, 0.08)',
              color: '#c0d8ff',
              fontSize: '13px',
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 200, 255, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(100, 200, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.25)';
            }}
          >
            重置画面
          </button>
        </div>

        {auroraInfo && (
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              ...glassBase,
              padding: '16px 28px',
              pointerEvents: 'none',
              minWidth: '280px',
              animation: 'fadeInUp 0.4s ease-out',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                marginBottom: '8px',
                opacity: 0.7,
                borderBottom: '1px solid rgba(100, 200, 255, 0.1)',
                paddingBottom: '6px',
              }}
            >
              ✨ 极光信息
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', opacity: 0.5 }}>强度</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#00ffa8' }}>
                  {auroraInfo.intensity.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', opacity: 0.5 }}>色温</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffd700' }}>
                  {auroraInfo.colorTemperature}K
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', opacity: 0.5 }}>波动频率</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#ff66ff' }}>
                  {auroraInfo.waveFrequency.toFixed(2)}Hz
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '32px',
            ...glassBase,
            padding: '10px 16px',
            pointerEvents: 'none',
            fontSize: '12px',
            opacity: 0.6,
          }}
        >
          🖱 拖拽旋转 · 滚轮缩放 · 点击光带触发爆裂
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00ffa8;
          box-shadow: 0 0 8px rgba(0, 255, 168, 0.5);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00ffa8;
          box-shadow: 0 0 8px rgba(0, 255, 168, 0.5);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </>
  );
};
