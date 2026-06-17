import React from 'react';
import type { DesignToken } from '../types/token';

interface ControlPanelProps {
  token: DesignToken;
  onChange: (token: DesignToken) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ token, onChange }) => {
  const handleChange = (key: keyof DesignToken, value: number | string) => {
    onChange({ ...token, [key]: value });
  };

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>参数调节</h2>
      
      <div style={styles.group}>
        <div style={styles.groupTitle}>圆角</div>
        <SliderControl
          label="圆角大小"
          value={token.borderRadius}
          min={0}
          max={24}
          step={1}
          unit="px"
          onChange={(value) => handleChange('borderRadius', value)}
        />
      </div>

      <div style={styles.group}>
        <div style={styles.groupTitle}>阴影偏移</div>
        <SliderControl
          label="X 偏移"
          value={token.shadowOffsetX}
          min={0}
          max={20}
          step={1}
          unit="px"
          onChange={(value) => handleChange('shadowOffsetX', value)}
        />
        <SliderControl
          label="Y 偏移"
          value={token.shadowOffsetY}
          min={0}
          max={20}
          step={1}
          unit="px"
          onChange={(value) => handleChange('shadowOffsetY', value)}
        />
      </div>

      <div style={styles.group}>
        <div style={styles.groupTitle}>背景色</div>
        <ColorPickerControl
          label="主题色"
          value={token.backgroundColor}
          onChange={(value) => handleChange('backgroundColor', value)}
        />
      </div>

      <div style={styles.group}>
        <div style={styles.groupTitle}>动画时长</div>
        <SliderControl
          label="过渡时间"
          value={token.animationDuration}
          min={0}
          max={3}
          step={0.1}
          unit="s"
          onChange={(value) => handleChange('animationDuration', value)}
        />
      </div>
    </div>
  );
};

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderLabelRow}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValue}>
          {value}
          {unit}
        </span>
      </div>
      <div style={styles.sliderTrackContainer}>
        <div
          style={{
            ...styles.sliderFill,
            width: `${percentage}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={styles.sliderInput}
        />
      </div>
    </div>
  );
};

interface ColorPickerControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorPickerControl: React.FC<ColorPickerControlProps> = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div style={styles.colorPickerContainer}>
      <span style={styles.sliderLabel}>{label}</span>
      <div style={styles.colorPickerRow}>
        <div style={styles.colorPreviewWrapper}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: value,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={styles.colorInput}
          />
        </div>
        <span style={styles.colorValue}>{value.toUpperCase()}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflowY: 'auto',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#212121',
    margin: '0 0 24px 0',
  },
  group: {
    marginBottom: '24px',
  },
  groupTitle: {
    fontSize: '14px',
    color: '#757575',
    fontWeight: 500,
    marginBottom: '12px',
  },
  sliderContainer: {
    marginBottom: '16px',
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sliderLabel: {
    fontSize: '13px',
    color: '#616161',
  },
  sliderValue: {
    fontSize: '13px',
    color: '#1976D2',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  sliderTrackContainer: {
    position: 'relative',
    height: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    height: '4px',
    backgroundColor: '#1976D2',
    borderRadius: '2px',
    pointerEvents: 'none',
  },
  sliderInput: {
    width: '100%',
    height: '20px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'transparent',
    outline: 'none',
    cursor: 'pointer',
    position: 'relative',
    zIndex: 1,
  },
  colorPickerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  colorPickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  colorPreviewWrapper: {
    position: 'relative',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
  },
  colorInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '32px',
    height: '32px',
    opacity: 0,
    cursor: 'pointer',
    borderRadius: '50%',
  },
  colorValue: {
    fontSize: '13px',
    color: '#616161',
    fontFamily: 'monospace',
  },
};

export default ControlPanel;
