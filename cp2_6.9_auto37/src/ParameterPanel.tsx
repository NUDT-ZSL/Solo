import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArtParameters, PatternMode } from './types';
import { hslToHex, hexToHsl, getColorName } from './utils/colorUtils';

interface SliderConfig {
  key: keyof ArtParameters;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'amplitude', label: '振幅 Amplitude', min: 0, max: 100, step: 1 },
  { key: 'frequency', label: '频率 Frequency', min: 0.1, max: 5.0, step: 0.1 },
  { key: 'phase', label: '相位 Phase', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'rotation', label: '旋转 Rotation', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'scale', label: '缩放 Scale', min: 0.5, max: 2.0, step: 0.1 },
  { key: 'opacity', label: '透明度 Opacity', min: 0, max: 1, step: 0.05 },
];

const MODES: { key: PatternMode; label: string }[] = [
  { key: 'wave', label: '波浪 Wave' },
  { key: 'spiral', label: '螺旋 Spiral' },
  { key: 'fractal', label: '分形 Fractal' },
];

type ColorTarget = 'fill' | 'stroke' | null;

interface ParameterPanelProps {
  params: ArtParameters;
  onChange: (params: Partial<ArtParameters>) => void;
  onRandomize: () => void;
  onExport: () => void;
}

const ParameterPanel: React.FC<ParameterPanelProps> = ({ params, onChange, onRandomize, onExport }) => {
  const [expanded, setExpanded] = useState(false);
  const [colorTarget, setColorTarget] = useState<ColorTarget>(null);
  const [tempColor, setTempColor] = useState<{ h: number; s: number; l: number } | null>(null);
  const [draggingSlider, setDraggingSlider] = useState<string | null>(null);
  const colorWheelRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);

  const handleSliderChange = useCallback((key: keyof ArtParameters, value: number) => {
    onChange({ [key]: value } as Partial<ArtParameters>);
  }, [onChange]);

  const openColorPicker = (target: ColorTarget) => {
    if (!target) return;
    const color = target === 'fill' ? params.fillColor : params.strokeColor;
    const hsl = hexToHsl(color);
    setTempColor(hsl);
    setColorTarget(target);
  };

  const closeColorPicker = () => {
    setColorTarget(null);
    setTempColor(null);
  };

  const confirmColor = () => {
    if (!colorTarget || !tempColor) return;
    const hex = hslToHex(tempColor.h, tempColor.s, tempColor.l);
    onChange(colorTarget === 'fill' ? { fillColor: hex } : { strokeColor: hex });
    closeColorPicker();
  };

  useEffect(() => {
    if (!colorWheelRef.current || !colorTarget) return;
    const canvas = colorWheelRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const center = size / 2;
    const radius = size / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          const hue = (angle + 360) % 360;
          const sat = dist / radius;
          const { l } = tempColor || { l: 0.5 };
          ctx.fillStyle = hslToHex(hue, sat, l);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }, [colorTarget, tempColor?.l]);

  const handleWheelInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!colorWheelRef.current || !tempColor) return;
    const rect = colorWheelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const center = 100;
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = 100;
    
    if (dist <= radius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const hue = (angle + 360) % 360;
      const sat = Math.min(dist / radius, 1);
      setTempColor({ h: hue, s: sat, l: tempColor.l });
    }
  };

  const handleWheelMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDraggingWheel(true);
    handleWheelInteraction(e);
  };

  useEffect(() => {
    if (!isDraggingWheel) return;
    const handleMove = (e: MouseEvent) => {
      if (!colorWheelRef.current || !tempColor) return;
      const rect = colorWheelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const center = 100;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = 100;
      if (dist <= radius) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const hue = (angle + 360) % 360;
        const sat = Math.min(dist / radius, 1);
        setTempColor({ h: hue, s: sat, l: tempColor.l });
      }
    };
    const handleUp = () => setIsDraggingWheel(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingWheel, tempColor]);

  const getWheelIndicatorPos = () => {
    if (!tempColor) return { left: 100, top: 100 };
    const angle = tempColor.h * Math.PI / 180;
    const dist = tempColor.s * 100;
    return {
      left: 100 + Math.cos(angle) * dist,
      top: 100 + Math.sin(angle) * dist,
    };
  };

  const currentPreviewHex = tempColor ? hslToHex(tempColor.h, tempColor.s, tempColor.l) : '#ffffff';
  const indicatorPos = getWheelIndicatorPos();

  return (
    <div className={`panel-container ${expanded ? 'expanded' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">参数控制</span>
        <button
          className="hamburger-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label="Toggle panel"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div>
        <div className="section-title">数学参数</div>
        <div className="slider-group">
          {SLIDERS.map((slider) => {
            const value = params[slider.key] as number;
            const isDragging = draggingSlider === slider.key;
            return (
              <div key={slider.key} className="slider-item">
                <div className="slider-label-row">
                  <span className="slider-label">{slider.label}</span>
                  <span className="slider-value">
                    {value.toFixed(2)}{slider.unit || ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={value}
                  onChange={(e) => handleSliderChange(slider.key, parseFloat(e.target.value))}
                  onMouseDown={() => setDraggingSlider(slider.key)}
                  onMouseUp={() => setDraggingSlider(null)}
                  onTouchStart={() => setDraggingSlider(slider.key)}
                  onTouchEnd={() => setDraggingSlider(null)}
                  style={isDragging ? { cursor: 'grabbing' } : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="section-title">颜色设置</div>
        <div className="color-picker-section">
          <div className="color-buttons">
            <button
              className={`color-btn ${colorTarget === 'fill' ? 'active' : ''}`}
              onClick={() => openColorPicker('fill')}
            >
              <span className="color-swatch" style={{ background: params.fillColor }}></span>
              填充色
            </button>
            <button
              className={`color-btn ${colorTarget === 'stroke' ? 'active' : ''}`}
              onClick={() => openColorPicker('stroke')}
            >
              <span className="color-swatch" style={{ background: params.strokeColor }}></span>
              描边色
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="section-title">图案模式</div>
        <div className="mode-selector">
          <div className="mode-buttons">
            {MODES.map((mode) => (
              <button
                key={mode.key}
                className={`mode-btn ${params.mode === mode.key ? 'active' : ''}`}
                onClick={() => onChange({ mode: mode.key })}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="toggle-row">
            <span className="toggle-label">随机旋转方向</span>
            <div
              className={`toggle-switch ${params.randomRotation ? 'active' : ''}`}
              onClick={() => onChange({ randomRotation: !params.randomRotation })}
            >
              <div className="toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn btn-accent" onClick={onRandomize}>
          🎲 随机重置
        </button>
        <button className="btn btn-export" onClick={onExport}>
          💾 导出 SVG
        </button>
      </div>

      {colorTarget && tempColor && (
        <div className="color-wheel-overlay" onClick={closeColorPicker}>
          <div className="color-wheel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="color-wheel-container">
              <canvas
                ref={colorWheelRef}
                width={200}
                height={200}
                className="color-wheel"
                onMouseDown={handleWheelMouseDown}
              />
              <div
                className="color-wheel-indicator"
                style={{
                  left: indicatorPos.left,
                  top: indicatorPos.top,
                  background: currentPreviewHex,
                }}
              />
            </div>

            <div className="lightness-slider">
              <div className="slider-label-row">
                <span className="slider-label">亮度</span>
                <span className="slider-value">{Math.round(tempColor.l * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={tempColor.l * 100}
                onChange={(e) => setTempColor({ ...tempColor, l: parseInt(e.target.value) / 100 })}
              />
            </div>

            <div className="color-preview-row">
              <div className="color-preview" style={{ background: currentPreviewHex }}></div>
              <div className="color-info">
                <span className="color-hex">{currentPreviewHex}</span>
                <span className="color-name">{getColorName(currentPreviewHex)}</span>
              </div>
            </div>

            <div className="color-modal-actions">
              <button className="btn btn-secondary" onClick={closeColorPicker}>取消</button>
              <button className="btn btn-primary" onClick={confirmColor}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParameterPanel;
