import React from 'react';
import { ColorScheme, parseColor, hexToRgb, rgbToHex, isValidHex } from '../utils/ColorCalculator';

interface InputPanelProps {
  schemeA: ColorScheme;
  schemeB: ColorScheme;
  onSchemeAChange: (scheme: ColorScheme) => void;
  onSchemeBChange: (scheme: ColorScheme) => void;
  compact?: boolean;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  defaultHex: string;
}

const DEFAULT_HEX = '#000000';

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, defaultHex }) => {
  const [hexInput, setHexInput] = React.useState(value);
  const [hexError, setHexError] = React.useState('');
  const [rgbInputs, setRgbInputs] = React.useState({ r: '0', g: '0', b: '0' });

  React.useEffect(() => {
    setHexInput(value);
    setHexError('');
    try {
      const rgb = hexToRgb(value);
      setRgbInputs({ r: rgb.r.toString(), g: rgb.g.toString(), b: rgb.b.toString() });
    } catch {
      setRgbInputs({ r: '0', g: '0', b: '0' });
    }
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexInput(newValue);

    if (newValue === '' || newValue === '#') {
      setHexError('');
      return;
    }

    const clean = newValue.replace('#', '');
    if (clean.length > 0 && !/^[0-9A-Fa-f]*$/.test(clean)) {
      setHexError('HEX 格式无效，仅允许 0-9, A-F');
      return;
    }

    if (clean.length === 3 || clean.length === 6) {
      const parsed = parseColor(newValue);
      if (parsed) {
        setHexError('');
        onChange(parsed);
      } else {
        setHexError('无法解析的色值');
      }
    } else if (clean.length > 6) {
      setHexError('HEX 应为 3 位或 6 位');
    } else {
      setHexError('');
    }
  };

  const handleHexBlur = () => {
    if (hexError || !isValidHex(hexInput)) {
      if (hexInput && hexInput !== '#' && !isValidHex(hexInput)) {
        const fallback = defaultHex;
        setHexInput(fallback);
        setHexError('格式错误，已回退到默认值');
        onChange(fallback);
        setTimeout(() => setHexError(''), 2000);
      }
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', raw: string) => {
    const numStr = raw.replace(/[^0-9]/g, '');
    const num = numStr === '' ? 0 : Math.min(255, Math.max(0, parseInt(numStr)));
    const newRgb = { ...rgbInputs, [channel]: numStr };
    setRgbInputs(newRgb);

    const r = channel === 'r' ? num : parseInt(rgbInputs.r) || 0;
    const g = channel === 'g' ? num : parseInt(rgbInputs.g) || 0;
    const b = channel === 'b' ? num : parseInt(rgbInputs.b) || 0;

    const hex = rgbToHex({ r, g, b }).toUpperCase();
    setHexInput(hex);
    setHexError('');
    onChange(hex);
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setHexInput(newValue);
    setHexError('');
    onChange(newValue);
    try {
      const rgb = hexToRgb(newValue);
      setRgbInputs({ r: rgb.r.toString(), g: rgb.g.toString(), b: rgb.b.toString() });
    } catch { /* ignore */ }
  };

  return (
    <div style={styles.fieldWrapper}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          style={{
            ...styles.textInput,
            borderColor: hexError ? '#ef4444' : '#374151'
          }}
          placeholder="#000000"
        />
        <input
          type="color"
          value={value}
          onChange={handleColorPickerChange}
          style={styles.colorInput}
        />
      </div>
      {hexError && <div style={styles.errorMsg}>{hexError}</div>}
      <div style={styles.rgbRow}>
        {(['r', 'g', 'b'] as const).map(ch => (
          <div key={ch} style={styles.rgbField}>
            <span style={styles.rgbLabel}>{ch.toUpperCase()}</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgbInputs[ch]}
              onChange={(e) => handleRgbChange(ch, e.target.value)}
              style={styles.rgbInput}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface SchemeGroupProps {
  title: string;
  scheme: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
  accentColor: string;
}

const SchemeGroup: React.FC<SchemeGroupProps> = ({ title, scheme, onChange, accentColor }) => {
  return (
    <div style={styles.schemeGroup}>
      <div style={{ ...styles.schemeTitle, borderLeftColor: accentColor }}>
        {title}
      </div>
      <ColorField
        label="主色 Primary"
        value={scheme.primary}
        onChange={(v) => onChange({ ...scheme, primary: v })}
        defaultHex={DEFAULT_HEX}
      />
      <ColorField
        label="背景色 Background"
        value={scheme.background}
        onChange={(v) => onChange({ ...scheme, background: v })}
        defaultHex="#FFFFFF"
      />
      <ColorField
        label="文字色 Text"
        value={scheme.text}
        onChange={(v) => onChange({ ...scheme, text: v })}
        defaultHex="#111827"
      />
    </div>
  );
};

const InputPanel: React.FC<InputPanelProps> = ({
  schemeA,
  schemeB,
  onSchemeAChange,
  onSchemeBChange,
  compact
}) => {
  return (
    <aside style={{
      ...styles.panel,
      width: compact ? '100%' : 320,
      minWidth: compact ? 'auto' : 320
    }}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>配色方案配置</h2>
        <p style={styles.panelSubtitle}>支持 HEX 和 RGB 格式输入</p>
      </div>
      <SchemeGroup
        title="方案 A"
        scheme={schemeA}
        onChange={onSchemeAChange}
        accentColor="#3b82f6"
      />
      <div style={styles.divider} />
      <SchemeGroup
        title="方案 B"
        scheme={schemeB}
        onChange={onSchemeBChange}
        accentColor="#10b981"
      />
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    border: '1px solid #334155',
    padding: 24,
    boxSizing: 'border-box',
    height: 'fit-content',
    overflowY: 'auto'
  },
  panelHeader: {
    marginBottom: 24
  },
  panelTitle: {
    margin: 0,
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace"
  },
  panelSubtitle: {
    margin: '4px 0 0 0',
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace"
  },
  schemeGroup: {
    marginBottom: 16
  },
  schemeTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    paddingLeft: 10,
    borderLeft: '3px solid',
    marginBottom: 12
  },
  fieldWrapper: {
    marginBottom: 14
  },
  label: {
    display: 'block',
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 6
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: 6,
    padding: '0 12px',
    color: '#f9fafb',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  colorInput: {
    width: 40,
    height: 36,
    border: '1px solid #374151',
    borderRadius: 6,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    padding: 2
  },
  errorMsg: {
    color: '#ef4444',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 4,
    lineHeight: 1.3
  },
  rgbRow: {
    display: 'flex',
    gap: 6,
    marginTop: 6
  },
  rgbField: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  rgbLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    width: 14
  },
  rgbInput: {
    width: '100%',
    height: 28,
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: 4,
    padding: '0 6px',
    color: '#f9fafb',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    margin: '20px 0'
  }
};

export default InputPanel;
