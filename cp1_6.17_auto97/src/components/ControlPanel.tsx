import { useState, useRef, useEffect, useCallback } from 'react';
import { useNebulaStore } from '../store/useNebulaStore';
import type { PresetType } from '../types';
import './ControlPanel.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function Slider({ label, value, min, max, step, onChange, formatValue }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-container">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{formatValue ? formatValue(value) : value}</span>
      </div>
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${percentage}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-input"
        />
      </div>
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker-container">
      <span className="color-picker-label">{label}</span>
      <div className="color-picker-wrapper">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-picker-input"
        />
        <span className="color-picker-value">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

interface PresetButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function PresetButton({ label, active, onClick }: PresetButtonProps) {
  return (
    <button
      className={`preset-button ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ControlPanel() {
  const {
    density,
    hueOffset,
    sizeScale,
    rotationSpeed,
    brightness,
    opacityBase,
    primaryColor,
    preset,
    setDensity,
    setHueOffset,
    setSizeScale,
    setRotationSpeed,
    setBrightness,
    setOpacityBase,
    setPrimaryColor,
    setPreset,
  } = useNebulaStore();

  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isMobile) return;
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startY.current = clientY;
    startHeight.current = panelRef.current?.offsetHeight || 200;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const delta = startY.current - moveY;
      const newHeight = Math.min(Math.max(startHeight.current + delta, 100), 500);
      if (panelRef.current) {
        panelRef.current.style.height = `${newHeight}px`;
      }
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }, [isMobile]);

  const handlePresetClick = (presetType: PresetType) => {
    setPreset(presetType);
  };

  const presets: { type: PresetType; label: string }[] = [
    { type: 'spiral', label: '螺旋星云' },
    { type: 'elliptical', label: '椭圆星云' },
    { type: 'irregular', label: '不规则星云' },
  ];

  if (isMobile) {
    return (
      <div
        ref={panelRef}
        className={`control-panel mobile ${isExpanded ? 'expanded' : 'collapsed'}`}
        style={{ height: isExpanded ? 'auto' : '200px' }}
      >
        <div
          className="mobile-drag-handle"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="drag-indicator" />
        </div>
        <div className="panel-content mobile-content">
          <h2 className="panel-title">星云参数</h2>

          <div className="presets-section">
            <span className="section-label">预设样式</span>
            <div className="presets-buttons">
              {presets.map((p) => (
                <PresetButton
                  key={p.type}
                  label={p.label}
                  active={preset === p.type}
                  onClick={() => handlePresetClick(p.type)}
                />
              ))}
            </div>
          </div>

          <Slider
            label="粒子密度"
            value={density}
            min={1000}
            max={20000}
            step={100}
            onChange={setDensity}
            formatValue={(v) => v.toLocaleString()}
          />

          <Slider
            label="色相偏移"
            value={hueOffset}
            min={0}
            max={360}
            step={1}
            onChange={setHueOffset}
            formatValue={(v) => `${v}°`}
          />

          <ColorPicker label="主色调" value={primaryColor} onChange={setPrimaryColor} />

          <Slider
            label="大小缩放"
            value={sizeScale}
            min={0.5}
            max={3.0}
            step={0.1}
            onChange={setSizeScale}
            formatValue={(v) => v.toFixed(1) + 'x'}
          />

          <Slider
            label="旋转速度"
            value={rotationSpeed}
            min={0}
            max={0.1}
            step={0.001}
            onChange={setRotationSpeed}
            formatValue={(v) => v.toFixed(3)}
          />

          <Slider
            label="亮度"
            value={brightness}
            min={0.5}
            max={2.0}
            step={0.1}
            onChange={setBrightness}
            formatValue={(v) => v.toFixed(1) + 'x'}
          />

          <Slider
            label="透明度基准"
            value={opacityBase}
            min={0.2}
            max={1.0}
            step={0.05}
            onChange={setOpacityBase}
            formatValue={(v) => Math.round(v * 100) + '%'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="control-panel desktop">
      <div className="panel-content">
        <h2 className="panel-title">星云生成器</h2>
        <p className="panel-subtitle">调整参数创造你的宇宙</p>

        <div className="presets-section">
          <span className="section-label">预设样式</span>
          <div className="presets-buttons">
            {presets.map((p) => (
              <PresetButton
                key={p.type}
                label={p.label}
                active={preset === p.type}
                onClick={() => handlePresetClick(p.type)}
              />
            ))}
          </div>
        </div>

        <div className="divider" />

        <Slider
          label="粒子密度"
          value={density}
          min={1000}
          max={20000}
          step={100}
          onChange={setDensity}
          formatValue={(v) => v.toLocaleString()}
        />

        <Slider
          label="色相偏移"
          value={hueOffset}
          min={0}
          max={360}
          step={1}
          onChange={setHueOffset}
          formatValue={(v) => `${v}°`}
        />

        <ColorPicker label="主色调" value={primaryColor} onChange={setPrimaryColor} />

        <Slider
          label="大小缩放"
          value={sizeScale}
          min={0.5}
          max={3.0}
          step={0.1}
          onChange={setSizeScale}
          formatValue={(v) => v.toFixed(1) + 'x'}
        />

        <Slider
          label="旋转速度"
          value={rotationSpeed}
          min={0}
          max={0.1}
          step={0.001}
          onChange={setRotationSpeed}
          formatValue={(v) => v.toFixed(3)}
        />

        <Slider
          label="亮度"
          value={brightness}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={setBrightness}
          formatValue={(v) => v.toFixed(1) + 'x'}
        />

        <Slider
          label="透明度基准"
          value={opacityBase}
          min={0.2}
          max={1.0}
          step={0.05}
          onChange={setOpacityBase}
          formatValue={(v) => Math.round(v * 100) + '%'}
        />

        <div className="divider" />

        <div className="controls-hint">
          <p className="hint-title">操作指南</p>
          <ul className="hint-list">
            <li>鼠标拖拽：旋转视角</li>
            <li>滚轮：缩放</li>
            <li>WASD：移动相机</li>
            <li>Shift：加速移动</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
