import { useMemo, useRef } from 'react';
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
  const progress = useMemo(() => (gradient.angle / 360) * 100, [gradient.angle]);

  const handleColorChange = (key: 'startColor' | 'endColor', color: string) => {
    const tc = tinycolor(color);
    onChange({ [key]: tc.toHexString() });
  };

  const handleTypeChange = (type: GradientType) => {
    onChange({ type });
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ angle: Number(e.target.value) });
  };

  const openColorPicker = (key: 'startColor' | 'endColor') => {
    if (key === 'startColor' && startColorInputRef.current) {
      startColorInputRef.current.click();
    } else if (key === 'endColor' && endColorInputRef.current) {
      endColorInputRef.current.click();
    }
  };

  const tickMarks = useMemo(() => {
    const ticks = [];
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
            <button
              onClick={() => openColorPicker('startColor')}
              style={{
                ...styles.colorDisplayBtn,
                background: gradient.startColor,
              }}
              className="color-display-btn"
            >
              <input
                ref={startColorInputRef}
                type="color"
                value={gradient.startColor}
                onChange={(e) => handleColorChange('startColor', e.target.value)}
                style={styles.hiddenColorInput}
              />
            </button>
            <div style={styles.colorInfo}>
              <span style={styles.colorValue}>{gradient.startColor}</span>
              <button
                onClick={() => openColorPicker('startColor')}
                style={styles.pickerBtn}
                className="picker-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M12 22v-4" />
                  <path d="M12 6V2" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="M4.93 19.07l2.83-2.83" />
                  <path d="M16.24 7.76l2.83-2.83" />
                </svg>
                取色
              </button>
            </div>
          </div>
        </div>

        <div style={styles.arrowIcon} className="arrow-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        <div style={styles.colorPickerGroup}>
          <label style={styles.label}>终点色</label>
          <div style={styles.colorPickerWrapper} className="color-input-wrapper">
            <button
              onClick={() => openColorPicker('endColor')}
              style={{
                ...styles.colorDisplayBtn,
                background: gradient.endColor,
              }}
              className="color-display-btn"
            >
              <input
                ref={endColorInputRef}
                type="color"
                value={gradient.endColor}
                onChange={(e) => handleColorChange('endColor', e.target.value)}
                style={styles.hiddenColorInput}
              />
            </button>
            <div style={styles.colorInfo}>
              <span style={styles.colorValue}>{gradient.endColor}</span>
              <button
                onClick={() => openColorPicker('endColor')}
                style={styles.pickerBtn}
                className="picker-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M12 22v-4" />
                  <path d="M12 6V2" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="M4.93 19.07l2.83-2.83" />
                  <path d="M16.24 7.76l2.83-2.83" />
                </svg>
                取色
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>预设颜色（12色）</label>
        <div style={styles.presetColors} className="preset-colors">
          {PRESET_COLORS.map((color, index) => (
            <button
              key={`${color}-${index}`}
              onClick={() => {
                if (!gradient.startColor || gradient.startColor === gradient.endColor) {
                  handleColorChange('startColor', color);
                } else {
                  handleColorChange('endColor', color);
                }
              }}
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
          <div style={styles.sliderContainer}>
            <div style={styles.sliderTrack}>
              <div
                style={{
                  ...styles.sliderFill,
                  width: `${progress}%`,
                }}
              />
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={gradient.angle}
                onChange={handleAngleChange}
                style={styles.slider}
              />
            </div>
            <div style={styles.tickMarksContainer}>
              {tickMarks.map((tick) => (
                <div key={tick} style={styles.tickMark}>
                  <div style={styles.tickLine} />
                  <span style={styles.tickLabel}>{tick}°</span>
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
    paddingBottom: '20px',
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
  colorInput: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    border: '2px solid #2a2a4e',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  },
  colorValue: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    color: '#e0e0e0',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: '24px',
  },
  presetColors: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '8px',
    marginTop: '10px',
  },
  presetColorBtn: {
    width: '100%',
    aspectRatio: '1',
    minWidth: '28px',
    minHeight: '28px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
  sliderContainer: {
    position: 'relative',
    padding: '10px 0 30px 0',
  },
  slider: {
    width: '100%',
    height: '6px',
  },
  tickMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 10px',
    marginTop: '8px',
  },
  tickMark: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  tickLine: {
    width: '1px',
    height: '6px',
    backgroundColor: '#2a2a4e',
  },
  tickLabel: {
    fontSize: '10px',
    color: '#666',
  },
};

export default ColorPickerPanel;
