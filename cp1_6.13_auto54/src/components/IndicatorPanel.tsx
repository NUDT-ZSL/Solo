import React from 'react';
import { ColorScheme, calculateColorDiff, ColorDiffResult, deltaE76, euclideanDistance } from '../utils/ColorCalculator';
import { analyzeContrast, formatRatio, ContrastResult } from '../utils/ContrastAnalyzer';

type DistanceMode = 'cie76' | 'euclidean';

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
  const [distanceMode, setDistanceMode] = React.useState<DistanceMode>('cie76');

  React.useEffect(() => {
    setPrimaryDiff(calculateColorDiff(schemeA.primary, schemeB.primary));
    setBgDiff(calculateColorDiff(schemeA.background, schemeB.background));
    setContrastA(analyzeContrast(schemeA.text, schemeA.background));
    setContrastB(analyzeContrast(schemeB.text, schemeB.background));
  }, [schemeA, schemeB]);

  const getColorDistance = (color1: string, color2: string): number => {
    if (distanceMode === 'cie76') {
      return Math.round(deltaE76(color1, color2) * 100) / 100;
    }
    return Math.round(euclideanDistance(color1, color2) * 100) / 100;
  };

  const distanceLabel = distanceMode === 'cie76' ? 'ΔE*76 (CIE76)' : 'ΔE (Euclidean)';

  return (
    <div>
      <div style={styles.modeToggle}>
        <span style={styles.modeLabel}>颜色距离算法:</span>
        <button
          onClick={() => setDistanceMode('cie76')}
          style={{
            ...styles.modeBtn,
            backgroundColor: distanceMode === 'cie76' ? '#3b82f6' : '#374151',
            borderColor: distanceMode === 'cie76' ? '#3b82f6' : '#4b5563'
          }}
        >
          CIE76
        </button>
        <button
          onClick={() => setDistanceMode('euclidean')}
          style={{
            ...styles.modeBtn,
            backgroundColor: distanceMode === 'euclidean' ? '#3b82f6' : '#374151',
            borderColor: distanceMode === 'euclidean' ? '#3b82f6' : '#4b5563'
          }}
        >
          Euclidean
        </button>
      </div>
      <div style={styles.wrapper}>
        <IndicatorCard label="色相差异 (ΔHue)" value={primaryDiff ? `${primaryDiff.hueDiff}°` : '--'} highlighted />
        <IndicatorCard label="饱和度差异 (ΔSat)" value={primaryDiff ? `${primaryDiff.saturationDiff}%` : '--'} highlighted />
        <IndicatorCard label="亮度差异 (ΔLight)" value={primaryDiff ? `${primaryDiff.lightnessDiff}%` : '--'} highlighted />
        <IndicatorCard label={`主色距离 ${distanceLabel}`} value={primaryDiff ? getColorDistance(schemeA.primary, schemeB.primary).toString() : '--'} highlighted />
        <IndicatorCard label={`背景距离 ${distanceLabel}`} value={bgDiff ? getColorDistance(schemeA.background, schemeB.background).toString() : '--'} highlighted />
        <IndicatorCard label="方案A 对比度" value={contrastA ? formatRatio(contrastA.ratio) + ' ' + contrastA.level : '--'} />
        <IndicatorCard label="方案B 对比度" value={contrastB ? formatRatio(contrastB.ratio) + ' ' + contrastB.level : '--'} />
        <IndicatorCard label="WCAG 评级" value={contrastA && contrastB ? (contrastA.level === contrastB.level ? contrastA.level : `${contrastA.level}/${contrastB.level}`) : '--'} highlighted />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center'
  },
  modeLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace"
  },
  modeBtn: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid',
    color: '#ffffff',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, border-color 0.2s ease'
  },
  wrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 0
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
    fontSize: 11,
    color: '#374151',
    fontFamily: "'JetBrains Mono', monospace"
  },
  value: {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace"
  }
};

export default IndicatorPanel;
