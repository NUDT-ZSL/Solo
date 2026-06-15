import React from 'react';
import { ColorBlindnessType } from '../utils/ColorCalculator';

interface SimulationToggleProps {
  currentType: ColorBlindnessType;
  onChange: (type: ColorBlindnessType) => void;
}

const filters: { key: ColorBlindnessType; label: string; desc: string }[] = [
  { key: 'normal', label: '正常视觉', desc: '原始色彩' },
  { key: 'deuteranopia', label: '绿色盲', desc: 'Deuteranopia' },
  { key: 'protanopia', label: '红色盲', desc: 'Protanopia' },
  { key: 'tritanopia', label: '蓝黄色盲', desc: 'Tritanopia' }
];

const SimulationToggle: React.FC<SimulationToggleProps> = ({ currentType, onChange }) => {
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleChange = (type: ColorBlindnessType) => {
    if (type !== currentType) {
      setIsAnimating(true);
      setTimeout(() => {
        onChange(type);
        setTimeout(() => setIsAnimating(false), 100);
      }, 200);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>色盲模拟滤镜</span>
        <span style={styles.current}>
          当前: {filters.find(f => f.key === currentType)?.label}
        </span>
      </div>
      <div style={styles.buttonGroup}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => handleChange(f.key)}
            style={{
              ...styles.button,
              backgroundColor: currentType === f.key ? '#3b82f6' : '#374151',
              borderColor: currentType === f.key ? '#3b82f6' : '#4b5563',
              transform: isAnimating ? 'scale(0.97)' : 'scale(1)',
              transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease, box-shadow 0.4s ease',
              boxShadow: currentType === f.key ? '0 0 16px rgba(59, 130, 246, 0.5)' : 'none'
            }}
          >
            <span style={styles.btnLabel}>{f.label}</span>
            <span style={styles.btnDesc}>{f.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    border: '1px solid #334155',
    padding: 20,
    marginBottom: 24
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  title: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace"
  },
  current: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace"
  },
  buttonGroup: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  button: {
    flex: 1,
    minWidth: 110,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2
  },
  btnLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace"
  },
  btnDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace"
  }
};

export default SimulationToggle;
