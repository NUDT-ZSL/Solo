import React, { useState, useRef } from 'react';
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
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
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
      id: generateUniqueId(),
      position: 50,
      color: newColor.color
    };
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
    e.stopPropagation();
    setDraggingStopId(stopId);
    dragStateRef.current = { isDragging: true, stopId, tab: activeTab };

    const target = e.target as HTMLElement;
    const slider = target.closest('.color-stop-slider-container') as HTMLElement;
    if (!slider) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.stopId) return;
      
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
      setDraggingStopId(null);
      dragStateRef.current = { isDragging: false, stopId: null, tab: null };
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const sortedColors = [...currentConfig.colors].sort((a, b) => a.position - b.position);
  const gradientPreviewCSS = `linear-gradient(to right, ${sortedColors.map(s => `${s.color} ${s.position}%`).join(', ')})`;

  return (
    <div className="editor-panel">
      <div className="presets-container">
        <h2 className="presets-title">预设库</h2>
        <div className="presets-scroll">
          {presets.map((preset) => {
            const css = generateGradientCSS(preset.gradient);
            return (
              <div
                key={preset.name}
                className="preset-thumbnail"
                onClick={() => handlePresetClick(preset)}
                style={{ backgroundImage: css }}
                title={preset.name}
              />
            );
          })}
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'gradient' ? 'active' : ''}`}
          onClick={() => setActiveTab('gradient')}
        >
          渐变一
        </button>
        <button
          className={`tab-button ${activeTab === 'overlay' ? 'active' : ''}`}
          onClick={() => setActiveTab('overlay')}
        >
          叠加层
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <h3 className="section-title">
          {activeTab === 'gradient' ? '渐变一' : '叠加层渐变'}
        </h3>

        <div className="type-selector">
          {['linear', 'radial', 'conic'].map((type) => (
            <button
              key={type}
              className={`type-button ${currentConfig.type === type ? 'active' : ''}`}
              onClick={() => handleGradientTypeChange(type as GradientType)}
            >
              {type === 'linear' ? '线性' : type === 'radial' ? '径向' : '锥形'}
            </button>
          ))}
        </div>

        {(currentConfig.type === 'linear' || currentConfig.type === 'conic') && (
          <div className="slider-group">
            <div className="slider-label">
              <span>角度</span>
              <span>{currentConfig.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={currentConfig.angle}
              onChange={(e) => setCurrentConfig({ ...currentConfig, angle: parseInt(e.target.value) })}
              className="slider-input width-120"
            />
          </div>
        )}

        {(currentConfig.type === 'radial' || currentConfig.type === 'conic') && (
          <div className="slider-group">
            {currentConfig.type === 'radial' && (
              <div className="shape-selector">
                <span>形状</span>
                <div className="shape-buttons">
                  <button
                    className={`shape-button ${currentConfig.shape === 'circle' ? 'active' : ''}`}
                    onClick={() => handleShapeChange('circle')}
                  >
                    圆形
                  </button>
                  <button
                    className={`shape-button ${currentConfig.shape === 'ellipse' ? 'active' : ''}`}
                    onClick={() => handleShapeChange('ellipse')}
                  >
                    椭圆
                  </button>
                </div>
              </div>
            )}
            <div className="slider-row">
              <div className="slider-column">
                <div className="slider-label">
                  <span>X</span>
                  <span>{currentConfig.centerX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentConfig.centerX}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, centerX: parseInt(e.target.value) })}
                  className="slider-input full-width"
                />
              </div>
              <div className="slider-column">
                <div className="slider-label">
                  <span>Y</span>
                  <span>{currentConfig.centerY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentConfig.centerY}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, centerY: parseInt(e.target.value) })}
                  className="slider-input full-width"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overlay' && (
          <div className="blend-mode-section">
            <div className="blend-mode-header">
              <span>混合模式</span>
              <label className="enable-toggle">
                <input
                  type="checkbox"
                  checked={overlayConfig.enabled}
                  onChange={(e) => onOverlayChange({ ...overlayConfig, enabled: e.target.checked })}
                />
                启用
              </label>
            </div>
            <div className="blend-mode-buttons">
              {blendModes.map((mode) => (
                <button
                  key={mode}
                  className={`blend-mode-button ${overlayConfig.blendMode === mode ? 'active' : ''}`}
                  onClick={() => onOverlayChange({ ...overlayConfig, blendMode: mode })}
                  disabled={!overlayConfig.enabled}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'overlay' && (
          <div className="slider-group">
            <div className="slider-label">
              <span>透明度</span>
              <span>{overlayConfig.opacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={overlayConfig.opacity}
              onChange={(e) => onOverlayChange({ ...overlayConfig, opacity: parseInt(e.target.value) })}
              className="slider-input width-140"
              style={{
                opacity: overlayConfig.enabled ? 1 : 0.5,
                pointerEvents: overlayConfig.enabled ? 'auto' : 'none'
              }}
            />
          </div>
        )}

        <div className="color-stops-section">
          <div className="add-stop-container">
            <button
              className="add-stop-button"
              onClick={handleAddColorStop}
              disabled={currentConfig.colors.length >= 8}
            >
              + 添加节点
            </button>
          </div>

          <div className="color-stops-container">
            <div
              className="gradient-preview-bar"
              style={{ backgroundImage: gradientPreviewCSS }}
            />
            {sortedColors.map((stop, index) => (
              <div key={stop.id} className="color-stop-row">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: stop.color }}
                >
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => handleColorStopChange(stop.id, { color: e.target.value })}
                  />
                </div>

                <div className="color-stop-slider-container">
                  <div
                    className={`color-stop-handle ${draggingStopId === stop.id ? 'dragging' : ''}`}
                    style={{ left: `${stop.position}%` }}
                    onMouseDown={(e) => handleMouseDown(stop.id, e)}
                  />
                </div>

                <span className="color-stop-position">
                  {stop.position.toFixed(1)}%
                </span>

                {currentConfig.colors.length > 2 && (
                  <button
                    className="remove-stop-button"
                    onClick={() => handleRemoveColorStop(stop.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradientEditor;
