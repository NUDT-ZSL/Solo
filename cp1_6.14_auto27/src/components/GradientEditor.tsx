import React, { useState, useRef, useCallback } from 'react';
import type { GradientConfig, OverlayConfig, ColorStop } from '../utils/gradientUtils';
import { presets, blendModes, generateGradientCSS, generateUniqueId, clamp, createDefaultColorStops } from '../utils/gradientUtils';
import type { GradientType, BlendMode } from '../utils/gradientUtils';

interface GradientEditorProps {
  gradientConfig: GradientConfig;
  overlayConfig: OverlayConfig;
  onGradientChange: (config: GradientConfig) => void;
  onOverlayChange: (config: OverlayConfig) => void;
}

type EditorTab = 'gradient' | 'overlay';

const GradientEditor: React.FC<GradientEditorProps> = ({
  gradientConfig,
  overlayConfig,
  onGradientChange,
  onOverlayChange,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('gradient');
  const dragStateRef = useRef<{
    isDragging: boolean;
    stopId: string | null;
    tab: EditorTab | null;
  }>({ isDragging: false, stopId: null, tab: null });

  const currentConfig = activeTab === 'gradient' ? gradientConfig : overlayConfig.gradient;
  const setCurrentConfig = (config: GradientConfig) => {
    if (activeTab === 'gradient') {
      onGradientChange(config);
    } else {
      onOverlayChange({ ...overlayConfig, gradient: config });
    }
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    onGradientChange(preset.gradient);
    if (preset.overlay) {
      onOverlayChange(preset.overlay);
    }
  };

  const handleColorStopChange = (stopId: string, updates: Partial<ColorStop>) => {
    const newColors = currentConfig.colors.map(c =>
      c.id === stopId ? { ...c, ...updates } : c
    );
    setCurrentConfig({ ...currentConfig, colors: newColors });
  };

  const handleAddColorStop = () => {
    if (currentConfig.colors.length >= 8) return;
    const newColor = createDefaultColorStops()[0];
    const newStop: ColorStop = {
      id: generateUniqueId(), position: 50, color: newColor.color };
    const newColors = [...currentConfig.colors, newStop].sort((a, b) => a.position - b.position);
    setCurrentConfig({ ...currentConfig, colors: newColors });
  };

  const handleRemoveColorStop = (stopId: string) => {
    if (currentConfig.colors.length <= 2) return;
    const newColors = currentConfig.colors.filter(c => c.id !== stopId);
    setCurrentConfig({ ...currentConfig, colors: newColors });
  };

  const handleGradientTypeChange = (type: GradientType) => {
    setCurrentConfig({ ...currentConfig, type });
  };

  const handleShapeChange = (shape: 'circle' | 'ellipse') => {
    setCurrentConfig({ ...currentConfig, shape });
  };

  const handleMouseDown = (stopId: string, e: React.MouseEvent) => {
    e.preventDefault();
    dragStateRef.current = { isDragging: true, stopId, tab: activeTab };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.stopId) return;
      
      const target = moveEvent.target as HTMLElement;
      const slider = target.closest('.color-stop-slider') as HTMLElement;
      if (!slider) return;

      const rect = slider.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percentage = clamp((x / rect.width) * 100, 0, 100);
      
      const stopId = dragStateRef.current.stopId;
      const tab = dragStateRef.current.tab;
      
      const config = tab === 'gradient' ? gradientConfig : overlayConfig.gradient;
      const newColors = config.colors.map(c =>
        c.id === stopId ? { ...c, position: Math.round(percentage * 10) / 10 } : c
      );
      
      const sortedColors = [...newColors].sort((a, b) => a.position - b.position);
      
      if (tab === 'gradient') {
        onGradientChange({ ...config, colors: sortedColors });
      } else {
        onOverlayChange({ ...overlayConfig, gradient: { ...config, colors: sortedColors } });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current = { isDragging: false, stopId: null, tab: null };
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const renderPresetThumbnail = (preset: typeof presets[0]) => {
    const css = generateGradientCSS(preset.gradient);
    return (
      <div
        key={preset.name}
        onClick={() => handlePresetClick(preset)}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundImage: css,
          transition: 'transform 0.15s ease-out',
          border: '2px solid transparent',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.borderColor = '#6c63ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = 'transparent';
        }}
      />
    );
  };

  const renderColorStop = (stop: ColorStop, index: number) => (
    <div
      key={stop.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        gap: '12px',
        marginBottom: index < currentConfig.colors.length - 1 ? '8px' : '0',
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '4px',
          backgroundColor: stop.color,
          border: '2px solid #3a3a4a',
          flexShrink: 0,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <input
          type="color"
          value={stop.color}
          onChange={(e) => handleColorStopChange(stop.id, { color: e.target.value })}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
      
      <div
        className="color-stop-slider"
        style={{
          flex: 1,
          height: '6px',
          backgroundColor: '#3a3a4a',
          borderRadius: '3px',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <div
          onMouseDown={(e) => handleMouseDown(stop.id, e)}
          style={{
            position: 'absolute',
            left: `${stop.position}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            backgroundColor: '#6c63ff',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            cursor: 'grab',
            transition: 'transform 0.12s ease-out',
            zIndex: 10,
          }}
        />
      </div>
      
      <span
        style={{
          width: '40px',
          fontSize: '12px',
          color: '#a0a0b0',
          textAlign: 'right',
        }}
      >
        {stop.position.toFixed(1)}%
      </span>
      
      {currentConfig.colors.length > 2 && (
        <button
          onClick={() => handleRemoveColorStop(stop.id)}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ff6b6b',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'color 0.12s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff8787';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#ff6b6b';
          }}
        >
          ×
        </button>
      )}
    </div>
  );

  const renderGradientTypeSelector = () => {
    const types: { value: GradientType; label: string }[] = [
      { value: 'linear', label: '线性' },
      { value: 'radial', label: '径向' },
      { value: 'conic', label: '锥形' },
    ];

    return (
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {types.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleGradientTypeChange(value)}
            style={{
              width: '80px',
              height: '36px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
              backgroundColor: currentConfig.type === value ? '#6c63ff' : '#3a3a4a',
              color: currentConfig.type === value ? '#ffffff' : '#a0a0b0',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  const renderAngleSlider = () => {
    if (currentConfig.type !== 'linear' && currentConfig.type !== 'conic') return null;

    return (
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 500 }}>角度</span>
          <span style={{ fontSize: '13px', color: '#a0a0b0' }}>{currentConfig.angle}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          value={currentConfig.angle}
          onChange={(e) => setCurrentConfig({ ...currentConfig, angle: parseInt(e.target.value) })}
          style={{
            width: '120px',
            height: '6px',
            backgroundColor: '#4a4a5a',
            WebkitAppearance: 'none',
            appearance: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        />
      </div>
    );
  };

  const renderCenterSliders = () => {
    if (currentConfig.type !== 'radial' && currentConfig.type !== 'conic') return null;

    return (
      <div style={{ marginBottom: '20px' }}>
        {currentConfig.type === 'radial' && (
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 500, marginBottom: '8px', display: 'block' }}>形状</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleShapeChange('circle')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
                  backgroundColor: currentConfig.shape === 'circle' ? '#6c63ff' : '#3a3a4a',
                  color: currentConfig.shape === 'circle' ? '#ffffff' : '#a0a0b0',
                }}
              >
                圆形
              </button>
              <button
                onClick={() => handleShapeChange('ellipse')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
                  backgroundColor: currentConfig.shape === 'ellipse' ? '#6c63ff' : '#3a3a4a',
                  color: currentConfig.shape === 'ellipse' ? '#ffffff' : '#a0a0b0',
                }}
              >
                椭圆
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#e0e0e0' }}>X</span>
              <span style={{ fontSize: '13px', color: '#a0a0b0' }}>{currentConfig.centerX}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentConfig.centerX}
              onChange={(e) => setCurrentConfig({ ...currentConfig, centerX: parseInt(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#4a4a5a',
                WebkitAppearance: 'none',
                appearance: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#e0e0e0' }}>Y</span>
              <span style={{ fontSize: '13px', color: '#a0a0b0' }}>{currentConfig.centerY}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentConfig.centerY}
              onChange={(e) => setCurrentConfig({ ...currentConfig, centerY: parseInt(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#4a4a5a',
                WebkitAppearance: 'none',
                appearance: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderBlendModeSelector = () => {
    if (activeTab !== 'overlay') return null;

    return (
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 500 }}>混合模式</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#a0a0b0' }}>
            <input
              type="checkbox"
              checked={overlayConfig.enabled}
              onChange={(e) => onOverlayChange({ ...overlayConfig, enabled: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            启用
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {blendModes.map((mode) => (
            <button
              key={mode}
              onClick={() => onOverlayChange({ ...overlayConfig, blendMode: mode })}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
                backgroundColor: overlayConfig.blendMode === mode ? '#6c63ff' : '#3a3a4a',
                color: overlayConfig.blendMode === mode ? '#ffffff' : '#a0a0b0',
                opacity: overlayConfig.enabled ? 1 : 0.5,
                pointerEvents: overlayConfig.enabled ? 'auto' : 'none',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderOpacitySlider = () => {
    if (activeTab !== 'overlay') return null;

    return (
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 500 }}>透明度</span>
          <span style={{ fontSize: '13px', color: '#a0a0b0' }}>{overlayConfig.opacity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={overlayConfig.opacity}
          onChange={(e) => onOverlayChange({ ...overlayConfig, opacity: parseInt(e.target.value) })}
          style={{
            width: '140px',
            height: '6px',
            backgroundColor: '#4a4a5a',
            WebkitAppearance: 'none',
            appearance: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            opacity: overlayConfig.enabled ? 1 : 0.5,
            pointerEvents: overlayConfig.enabled ? 'auto' : 'none',
          }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        width: '40%',
        backgroundColor: '#12121c',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflowY: 'auto',
        '@media (max-width: 768px)': {
          width: '100%',
          height: '50vh',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }
      } as React.CSSProperties}
    >
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '16px',
            color: '#e0e0e0',
            margin: '0 0 16px 0',
            fontWeight: 600,
          }}
        >
          预设库
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          {presets.map(renderPresetThumbnail)}
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: '20px', gap: '4px', backgroundColor: '#1e1e2e', padding: '4px', borderRadius: '8px' }}>
        <button
          onClick={() => setActiveTab('gradient')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
            backgroundColor: activeTab === 'gradient' ? '#6c63ff' : 'transparent',
            color: activeTab === 'gradient' ? '#ffffff' : '#a0a0b0',
          }}
        >
          渐变一
        </button>
        <button
          onClick={() => setActiveTab('overlay')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.15s ease-out, color 0.15s ease-out',
            backgroundColor: activeTab === 'overlay' ? '#6c63ff' : 'transparent',
            color: activeTab === 'overlay' ? '#ffffff' : '#a0a0b0',
          }}
        >
          叠加层
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: '14px',
            color: '#e0e0e0',
            margin: '0 0 16px 0',
            fontWeight: 500,
          }}
        >
          {activeTab === 'gradient' ? '渐变一' : '叠加层渐变'}
        </h3>

        {renderGradientTypeSelector()}
        {renderAngleSlider()}
        {renderCenterSliders()}
        {renderBlendModeSelector()}
        {renderOpacitySlider()}

        <div style={{ marginBottom: '16px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={handleAddColorStop}
              disabled={currentConfig.colors.length >= 8}
              style={{
                padding: '6px 16px',
                backgroundColor: currentConfig.colors.length >= 8 ? '#3a3a4a' : '#6c63ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: currentConfig.colors.length >= 8 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease-out',
                opacity: currentConfig.colors.length >= 8 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (currentConfig.colors.length < 8) {
                  e.currentTarget.style.backgroundColor = '#7c73ff';
                }
              }}
              onMouseLeave={(e) => {
                if (currentConfig.colors.length >= 8) {
                  e.currentTarget.style.backgroundColor = '#3a3a4a';
                } else {
                  e.currentTarget.style.backgroundColor = '#6c63ff';
                }
              }}
            >
              + 添加节点
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#1e1e2e',
              padding: '16px',
              borderRadius: '8px',
            }}
          >
            {currentConfig.colors.map(renderColorStop)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradientEditor;
