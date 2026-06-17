import { useState, useCallback, useMemo } from 'react';
import {
  useFontContext,
  FONT_OPTIONS,
  BACKGROUND_COLORS,
  FONT_WEIGHTS,
} from '../context/FontContext';
import { Preset } from '../utils/presets';

const FONT_PREVIEW = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';

function FontSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (font: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (font: string) => {
      onChange(font);
      setOpen(false);
    },
    [onChange]
  );

  const currentPreview = useMemo(
    () => (
      <span style={{ fontFamily: value, fontSize: '12px', color: '#64748B' }}>
        {FONT_PREVIEW}
      </span>
    ),
    [value]
  );

  return (
    <div className="font-select-wrapper">
      <label className="panel-label">{label}</label>
      <div className="font-select-container">
        <button
          type="button"
          className={`font-select-trigger ${open ? 'open' : ''}`}
          onClick={() => setOpen(!open)}
        >
          <span className="font-select-value" style={{ fontFamily: value }}>
            {value}
          </span>
          <svg
            className={`dropdown-arrow ${open ? 'rotated' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div className="font-select-preview">{currentPreview}</div>
        {open && (
          <div className="font-dropdown">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font}
                type="button"
                className={`font-option ${font === value ? 'active' : ''}`}
                onClick={() => handleSelect(font)}
              >
                <div className="font-option-name" style={{ fontFamily: font }}>
                  {font}
                </div>
                <div className="font-option-preview" style={{ fontFamily: font }}>
                  {FONT_PREVIEW}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WeightSelector({
  label,
  value,
  onChange,
  font,
}: {
  label: string;
  value: number;
  onChange: (w: number) => void;
  font: string;
}) {
  return (
    <div className="weight-group">
      <label className="panel-label">{label}</label>
      <div className="weight-buttons">
        {FONT_WEIGHTS.map((w) => (
          <button
            key={w}
            type="button"
            className={`weight-btn ${value === w ? 'active' : ''}`}
            onClick={() => onChange(w)}
            style={{ fontFamily: font, fontWeight: w }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <div className="slider-header">
        <span className="panel-label">{label}</span>
        <span className="slider-value">{value}{unit || ''}</span>
      </div>
      <div className="slider-track-wrap">
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

function PresetCard({
  preset,
  onLoad,
  onRemove,
}: {
  preset: Preset;
  onLoad: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="preset-card" onClick={onLoad} title={preset.name}>
      <div
        className="preset-card-bg"
        style={{ backgroundColor: preset.backgroundColor }}
      />
      <div className="preset-card-content">
        <span className="preset-heading" style={{ fontFamily: preset.headingFont }}>
          Aa
        </span>
        <span className="preset-body" style={{ fontFamily: preset.bodyFont }}>
          Bb
        </span>
      </div>
      <button
        type="button"
        className="preset-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function FontPanel() {
  const ctx = useFontContext();

  return (
    <aside className="font-panel">
      <div className="presets-section">
        <div className="presets-header">
          <span className="panel-label">已保存预设</span>
          <button
            type="button"
            className="save-preset-btn"
            onClick={ctx.saveCurrentAsPreset}
            disabled={ctx.presets.length >= 6}
          >
            + 保存
          </button>
        </div>
        <div className="presets-grid">
          {ctx.presets.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              onLoad={() => ctx.loadPreset(p)}
              onRemove={() => ctx.removePreset(p.id)}
            />
          ))}
          {Array.from({ length: Math.max(0, 6 - ctx.presets.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="preset-card preset-card-empty" />
          ))}
        </div>
      </div>

      <div className="section-divider" />

      <FontSelect
        label="标题字体"
        value={ctx.headingFont}
        onChange={ctx.setHeadingFont}
      />

      <WeightSelector
        label="标题字重"
        value={ctx.headingWeight}
        onChange={ctx.setHeadingWeight}
        font={ctx.headingFont}
      />

      <FontSelect
        label="正文字体"
        value={ctx.bodyFont}
        onChange={ctx.setBodyFont}
      />

      <WeightSelector
        label="正文字重"
        value={ctx.bodyWeight}
        onChange={ctx.setBodyWeight}
        font={ctx.bodyFont}
      />

      <div className="section-divider" />

      <Slider
        label="标题字号"
        min={24}
        max={48}
        step={2}
        value={ctx.headingSize}
        onChange={ctx.setHeadingSize}
        unit="px"
      />
      <Slider
        label="正文字号"
        min={14}
        max={22}
        step={1}
        value={ctx.bodySize}
        onChange={ctx.setBodySize}
        unit="px"
      />
      <Slider
        label="行高倍数"
        min={1.2}
        max={2.0}
        step={0.1}
        value={ctx.lineHeight}
        onChange={ctx.setLineHeight}
      />
      <Slider
        label="标题与正文间距"
        min={12}
        max={48}
        step={4}
        value={ctx.headingSpacing}
        onChange={ctx.setHeadingSpacing}
        unit="px"
      />

      <div className="section-divider" />

      <div>
        <label className="panel-label">背景颜色</label>
        <div className="bg-colors">
          {BACKGROUND_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`bg-color-btn ${ctx.backgroundColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => ctx.setBackgroundColor(color)}
              title={color}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
