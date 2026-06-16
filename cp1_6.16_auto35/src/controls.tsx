import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DensityParams, ColorPreset, NebulaType } from './particleEngine';
import { getDefaultParams, getPresetParams } from './particleEngine';
import { saveToLocalStorage, loadFromLocalStorage } from './dataService';

interface ControlsProps {
  params: DensityParams;
  onParamsChange: (params: DensityParams) => void;
  onPresetSwitch: (params: DensityParams) => void;
  onOpacityChange: (opacity: number) => void;
}

const PRESET_CONFIGS: { type: NebulaType; label: string; icon: string }[] = [
  { type: 'spiral', label: '螺旋星云', icon: '🌀' },
  { type: 'elliptical', label: '椭圆星云', icon: '🥚' },
  { type: 'irregular', label: '不规则星云', icon: '💫' },
];

const Controls: React.FC<ControlsProps> = ({ params, onParamsChange, onPresetSwitch, onOpacityChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [switchingPreset, setSwitchingPreset] = useState(false);
  const fadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeInTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFadeIn(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 800;
      setIsMobile(mobile);
      if (!mobile) setCollapsed(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onParamsChange({ ...params, particleCount: val });
  }, [params, onParamsChange]);

  const handleRotationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onParamsChange({ ...params, rotationSpeed: val });
  }, [params, onParamsChange]);

  const handleColorPreset = useCallback((preset: ColorPreset) => {
    onParamsChange({ ...params, colorPreset: preset });
  }, [params, onParamsChange]);

  const handleReset = useCallback(() => {
    onParamsChange(getDefaultParams());
  }, [onParamsChange]);

  const handlePresetSwitch = useCallback((type: NebulaType) => {
    if (switchingPreset) return;
    setSwitchingPreset(true);

    if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
    if (fadeInTimer.current) clearTimeout(fadeInTimer.current);

    onOpacityChange(0);

    fadeOutTimer.current = setTimeout(() => {
      const newParams = getPresetParams(type);
      onPresetSwitch(newParams);

      fadeInTimer.current = setTimeout(() => {
        onOpacityChange(1);
        setSwitchingPreset(false);
      }, 100);
    }, 1000);
  }, [switchingPreset, onOpacityChange, onPresetSwitch]);

  const handleSave = useCallback(() => {
    saveToLocalStorage(params);
  }, [params]);

  useEffect(() => {
    return () => {
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
      if (fadeInTimer.current) clearTimeout(fadeInTimer.current);
    };
  }, []);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: isMobile && collapsed ? undefined : 16,
    right: isMobile && collapsed ? 16 : undefined,
    bottom: 16,
    background: 'rgba(26, 26, 46, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: 13,
    zIndex: 100,
    opacity: fadeIn ? 1 : 0,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    minWidth: 260,
    maxWidth: 300,
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
    display: collapsed ? 'none' : 'block',
  };

  const mobileBtnStyle: React.CSSProperties = {
    position: 'fixed',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    fontSize: 20,
    cursor: 'pointer',
    zIndex: 101,
    display: isMobile && collapsed ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease, background 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    appearance: 'none',
    height: 6,
    borderRadius: 3,
    background: '#2C3E50',
    outline: 'none',
    cursor: 'pointer',
  };

  const colorBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: active ? '2px solid #FFFFFF' : '2px solid rgba(255,255,255,0.2)',
    background: active ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
    textAlign: 'center' as const,
  });

  const presetBtnStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: 12,
    cursor: switchingPreset ? 'wait' : 'pointer',
    transition: 'transform 0.2s ease, background 0.2s ease',
    backdropFilter: 'blur(4px)',
    textAlign: 'center' as const,
  };

  const actionBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background 0.2s ease',
  };

  return (
    <>
      {isMobile && (
        <button
          style={mobileBtnStyle}
          onClick={() => setCollapsed(false)}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          ⚙
        </button>
      )}
      <div style={panelStyle}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...labelStyle, fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#3498DB' }}>
            星云控制面板
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>
            <span>粒子密度</span>
            <span style={{ color: '#3498DB' }}>{params.particleCount.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={1000}
            max={50000}
            step={1000}
            value={params.particleCount}
            onChange={handleDensityChange}
            style={sliderStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>颜色预设</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={colorBtnStyle(params.colorPreset === 'bluePurple')}
              onClick={() => handleColorPreset('bluePurple')}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              💜 蓝紫渐变
            </button>
            <button
              style={colorBtnStyle(params.colorPreset === 'redOrange')}
              onClick={() => handleColorPreset('redOrange')}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              🔥 红橙渐变
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>
            <span>旋转速度</span>
            <span style={{ color: '#3498DB' }}>{params.rotationSpeed.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={params.rotationSpeed}
            onChange={handleRotationChange}
            style={sliderStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>预设星云</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRESET_CONFIGS.map(p => (
              <button
                key={p.type}
                style={presetBtnStyle}
                onClick={() => handlePresetSwitch(p.type)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={actionBtnStyle}
            onClick={handleReset}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            ↺ 重置
          </button>
          <button
            style={actionBtnStyle}
            onClick={handleSave}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            💾 保存
          </button>
          {isMobile && (
            <button
              style={actionBtnStyle}
              onClick={() => setCollapsed(true)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              ✕ 关闭
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Controls;
