import { useMemo, useRef, useState } from 'react';
import tinycolor from 'tinycolor2';
import type { GradientConfig, GradientType } from '../types';
import { PRESET_COLORS, GRADIENT_TYPES } from '../constants/colors';

interface ColorPickerPanelProps {
  gradient: GradientConfig;
  onChange: (updates: Partial<GradientConfig>) => void;
}

const ColorPickerPanel = ({ gradient, onChange }: ColorPickerPanelProps) => {
  const startColorInputRef = useRef<HTMLInputElement>(null);
  const endColorInputRef = useRef<HTMLInputElement>(null);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const progress = useMemo(() => (gradient.angle / 360) * 100, [gradient.angle]);

  const handleColorChange = (key: 'startColor' | 'endColor', color: string) => {
    const tc = tinycolor(color);
    if (tc.isValid()) {
      onChange({ [key]: tc.toHexString() });
    }
  };

  const handleTypeChange = (type: GradientType) => {
    onChange({ type });
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ angle: Number(e.target.value) });
  };

  const openNativePicker = (which: 'start' | 'end') => {
    setActivePicker(which);
    const ref = which === 'start' ? startColorInputRef : endColorInputRef;
    if (ref.current) {
      ref.current.click();
    }
  };

  const handlePresetClick = (color: string) => {
    if (activePicker === 'end') {
      handleColorChange('endColor', color);
      setActivePicker(null);
    } else {
      handleColorChange('startColor', color);
      setActivePicker('end');
    }
  };

  const tickData = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= 360; i += 45) {
      ticks.push(i);
    }
    return ticks;
  }, []);

  return (
    <div style={styles.container}>
      <h3 style={styles.sectionTitle}>颜色与渐变设置</h3>

      <div style={styles.colorPickersRow} className="color-pickers-row">
        <div style={styles.colorPickerGroup}>
          <label style={styles.label}>起点色</label>
          <div style={styles.colorPickerWrapper} className="color-input-wrapper">
            <div
              style={{
                ...styles.colorDisplayBlock,
                background: gradient.startColor,
              }}
              className="color-display-block"
              onClick={() => openNativePicker('start')}
            >
              <input
                ref={startColorInputRef}
                type="color"
                value={gradient.startColor}
                onChange={(e) => handleColorChange('startColor', e.target.value)}
                style={styles.nativeColorInput}
                tabIndex={-1}
              />
            </div>
            <div style={styles.colorInfo}>
              <span style={styles.colorValue}>{gradient.startColor}</span>
              <button
                onClick={() => openNativePicker('start')}
                style={styles.pickerBtn}
                className="picker-btn"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                取色
              </button>
            </div>
          </div>
        </div>

        <div style={styles.arrowIcon} className="arrow-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        <div style={styles.colorPickerGroup}>
          <label style={styles.label}>终点色</label>
          <div style={styles.colorPickerWrapper} className="color-input-wrapper">
            <div
              style={{
                ...styles.colorDisplayBlock,
                background: gradient.endColor,
              }}
              className="color-display-block"
              onClick={() => openNativePicker('end')}
            >
              <input
                ref={endColorInputRef}
                type="color"
                value={gradient.endColor}
                onChange={(e) => handleColorChange('endColor', e.target.value)}
                style={styles.nativeColorInput}
                tabIndex={-1}
              />
            </div>
            <div style={styles.colorInfo}>
              <span style={styles.colorValue}>{gradient.endColor}</span>
              <button
                onClick={() => openNativePicker('end')}
                style={styles.pickerBtn}
                className="picker-btn"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                取色
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.presetHeader}>
          <label style={styles.label}>预设颜色</label>
          <span style={styles.presetHint}>
            {activePicker === 'end' ? '正在选择终点色' : '点击选择起点色'}
          </span>
        </div>
        <div style={styles.presetColors} className="preset-colors">
          {PRESET_COLORS.map((color, index) => (
            <button
              key={`${color}-${index}`}
              onClick={() => handlePresetClick(color)}
              style={{
                ...styles.presetColorBtn,
                backgroundColor: color,
              }}
              className="preset-color-btn"
              title={color}
            />
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>渐变类型</label>
        <div style={styles.typeButtons}>
          {GRADIENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              style={{
                ...styles.typeBtn,
                backgroundColor: gradient.type === type.value ? '#4A90D9' : '#2a2a4e',
                color: gradient.type === type.value ? '#fff' : '#e0e0e0',
              }}
              className="type-btn"
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {gradient.type === 'linear' && (
        <div style={styles.section}>
          <div style={styles.angleHeader}>
            <label style={styles.label}>渐变角度</label>
            <span style={styles.angleValue}>{gradient.angle}°</span>
          </div>
          <div style={styles.sliderWrapper}>
            <div style={styles.sliderTrackBg}>
              <div
                style={{
                  ...styles.sliderTrackFill,
                  width: `${progress}%`,
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={gradient.angle}
              onChange={handleAngleChange}
              className="angle-slider"
              style={styles.slider}
            />
            <div style={styles.tickMarksRow}>
              {tickData.map((tick) => (
                <div key={tick} style={styles.tickMarkItem}>
                  <div style={styles.tickLine} />
                  <span style={styles.tickLabel}>{tick}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2a2a4e',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '20px',
  },
  colorPickersRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    marginBottom: '24px',
  },
  colorPickerGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  arrowIcon: {
    paddingBottom: '24px',
    color: '#888',
  },
  label: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 500,
  },
  colorPickerWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  colorDisplayBlock: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.15)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
    flexShrink: 0,
  },
  nativeColorInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    border: 'none',
    padding: 0,
    margin: 0,
  },
  colorInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  colorValue: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '13px',
    color: '#e0e0e0',
    textTransform: 'uppercase',
  },
  pickerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: '1px solid #2a2a4e',
    borderRadius: '6px',
    padding: '3px 8px',
    color: '#888',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'color 0.3s ease, border-color 0.3s ease, transform 0.3s ease',
  },
  presetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetHint: {
    fontSize: '11px',
    color: '#4A90D9',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: '24px',
  },
  presetColors: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
    marginTop: '10px',
  },
  presetColorBtn: {
    width: '100%',
    height: '32px',
    borderRadius: '8px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  },
  typeButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  typeBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.3s ease, color 0.3s ease, transform 0.3s ease',
  },
  angleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  angleValue: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '16px',
    fontWeight: 600,
    color: '#4A90D9',
  },
  sliderWrapper: {
    position: 'relative',
    paddingTop: '10px',
    paddingBottom: '30px',
  },
  sliderTrackBg: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    right: '10px',
    height: '6px',
    backgroundColor: '#2a2a4e',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  sliderTrackFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: '3px',
    transition: 'width 0.05s ease',
  },
  slider: {
    position: 'relative',
    width: '100%',
    height: '26px',
    margin: 0,
    zIndex: 2,
  },
  tickMarksRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingLeft: '10px',
    paddingRight: '10px',
    marginTop: '2px',
  },
  tickMarkItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  tickLine: {
    width: '1px',
    height: '8px',
    backgroundColor: '#4a4a6e',
  },
  tickLabel: {
    fontSize: '9px',
    color: '#555',
    fontFamily: "'Fira Code', monospace",
  },
};

export default ColorPickerPanel;
