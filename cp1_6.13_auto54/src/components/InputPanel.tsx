import React from 'react';
import { ColorScheme, parseColor } from '../utils/ColorCalculator';

interface InputPanelProps {
  schemeA: ColorScheme;
  schemeB: ColorScheme;
  onSchemeAChange: (scheme: ColorScheme) => void;
  onSchemeBChange: (scheme: ColorScheme) => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => {
  const [inputValue, setInputValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);

  React.useEffect(() => {
    setInputValue(value);
    setIsValid(true);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const parsed = parseColor(newValue);
    if (parsed) {
      setIsValid(true);
      onChange(parsed);
    } else if (newValue === '' || newValue === '#') {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setIsValid(true);
    onChange(newValue);
  };

  return (
    <div style={styles.fieldWrapper}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          style={{
            ...styles.textInput,
            borderColor: isValid ? '#374151' : '#ef4444'
          }}
          placeholder="#FFFFFF"
        />
        <input
          type="color"
          value={value}
          onChange={handleColorPickerChange}
          style={styles.colorInput}
        />
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
      />
      <ColorField
        label="背景色 Background"
        value={scheme.background}
        onChange={(v) => onChange({ ...scheme, background: v })}
      />
      <ColorField
        label="文字色 Text"
        value={scheme.text}
        onChange={(v) => onChange({ ...scheme, text: v })}
      />
    </div>
  );
};

const InputPanel: React.FC<InputPanelProps> = ({
  schemeA,
  schemeB,
  onSchemeAChange,
  onSchemeBChange
}) => {
  return (
    <aside style={styles.panel}>
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
    width: 320,
    minWidth: 320,
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
  divider: {
    height: 1,
    backgroundColor: '#334155',
    margin: '20px 0'
  }
};

export default InputPanel;
