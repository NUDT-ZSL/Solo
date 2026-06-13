import React from 'react';
import { ColorScheme, calculateColorDiff, ColorDiffResult } from '../utils/ColorCalculator';
import { analyzeContrast, formatRatio, ContrastResult } from '../utils/ContrastAnalyzer';

interface IndicatorPanelProps {
  schemeA: ColorScheme;
  schemeB: ColorScheme;
}

interface IndicatorCardProps {
  label: string;
  value: string;
  highlighted?: boolean;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ label, value, highlighted }) => {
  return (
    <div style={styles.card}>
      <span style={styles.label}>{label}</span>
      <span style={{
        ...styles.value,
        color: highlighted ? '#3b82f6' : '#374151',
        fontWeight: highlighted ? 700 : 400
      }}>
        {value}
      </span>
    </div>
  );
};

const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ schemeA, schemeB }) => {
  const [primaryDiff, setPrimaryDiff] = React.useState<ColorDiffResult | null>(null);
  const [bgDiff, setBgDiff] = React.useState<ColorDiffResult | null>(null);
  const [contrastA, setContrastA] = React.useState<ContrastResult | null>(null);
  const [contrastB, setContrastB] = React.useState<ContrastResult | null>(null);

  React.useEffect(() => {
    setPrimaryDiff(calculateColorDiff(schemeA.primary, schemeB.primary));
    setBgDiff(calculateColorDiff(schemeA.background, schemeB.background));
    setContrastA(analyzeContrast(schemeA.text, schemeA.background));
    setContrastB(analyzeContrast(schemeB.text, schemeB.background));
  }, [schemeA, schemeB]);

  return (
    <div style={styles.wrapper}>
      <IndicatorCard label="色相差异 (ΔHue)" value={primaryDiff ? `${primaryDiff.hueDiff}°` : '--'} highlighted />
      <IndicatorCard label="饱和度差异 (ΔSat)" value={primaryDiff ? `${primaryDiff.saturationDiff}%` : '--'} highlighted />
      <IndicatorCard label="亮度差异 (ΔLight)" value={primaryDiff ? `${primaryDiff.lightnessDiff}%` : '--'} highlighted />
      <IndicatorCard label="颜色距离 (ΔE)" value={primaryDiff ? primaryDiff.colorDistance.toString() : '--'} highlighted />
      <IndicatorCard label="背景色差 (ΔE)" value={bgDiff ? bgDiff.colorDistance.toString() : '--'} highlighted />
      <IndicatorCard label="方案A 对比度" value={contrastA ? formatRatio(contrastA.ratio) + ' ' + contrastA.level : '--'} />
      <IndicatorCard label="方案B 对比度" value={contrastB ? formatRatio(contrastB.ratio) + ' ' + contrastB.level : '--'} />
      <IndicatorCard label="WCAG 评级" value={contrastA && contrastB ? (contrastA.level === contrastB.level ? contrastA.level : `${contrastA.level}/${contrastB.level}`) : '--'} highlighted />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 28
  },
  card: {
    width: 180,
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: '10px 14px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  label: {
    fontSize: 13,
    color: '#374151',
    fontFamily: "'JetBrains Mono', monospace"
  },
  value: {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace"
  }
};

export default IndicatorPanel;
