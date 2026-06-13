import React from 'react';
import { ColorScheme, calculateColorDiff, deltaE76, euclideanDistance, rgbToHsl, hexToRgb } from '../utils/ColorCalculator';
import { analyzeContrast, formatRatio } from '../utils/ContrastAnalyzer';

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

const safeHueDiff = (color1: string, color2: string): number => {
  try {
    const hsl1 = rgbToHsl(hexToRgb(color1));
    const hsl2 = rgbToHsl(hexToRgb(color2));
    let diff = Math.abs(hsl1.h - hsl2.h);
    if (diff > 180) diff = 360 - diff;
    return Math.round(diff);
  } catch {
    return 0;
  }
};

const safeSatDiff = (color1: string, color2: string): number => {
  try {
    const hsl1 = rgbToHsl(hexToRgb(color1));
    const hsl2 = rgbToHsl(hexToRgb(color2));
    return Math.round(Math.abs(hsl1.s - hsl2.s));
  } catch {
    return 0;
  }
};

const safeLightDiff = (color1: string, color2: string): number => {
  try {
    const hsl1 = rgbToHsl(hexToRgb(color1));
    const hsl2 = rgbToHsl(hexToRgb(color2));
    return Math.round(Math.abs(hsl1.l - hsl2.l));
  } catch {
    return 0;
  }
};

const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ schemeA, schemeB }) => {
  const [distanceMode, setDistanceMode] = React.useState<DistanceMode>('cie76');

  const primaryHueDiff = React.useMemo(() => safeHueDiff(schemeA.primary, schemeB.primary), [schemeA.primary, schemeB.primary]);
  const primarySatDiff = React.useMemo(() => safeSatDiff(schemeA.primary, schemeB.primary), [schemeA.primary, schemeB.primary]);
  const primaryLightDiff = React.useMemo(() => safeLightDiff(schemeA.primary, schemeB.primary), [schemeA.primary, schemeB.primary]);

  const primaryDistance = React.useMemo(() => {
    try {
      return distanceMode === 'cie76'
        ? Math.round(deltaE76(schemeA.primary, schemeB.primary) * 100) / 100
        : Math.round(euclideanDistance(schemeA.primary, schemeB.primary) * 100) / 100;
    } catch {
      return 0;
    }
  }, [schemeA.primary, schemeB.primary, distanceMode]);

  const bgDistance = React.useMemo(() => {
    try {
      return distanceMode === 'cie76'
        ? Math.round(deltaE76(schemeA.background, schemeB.background) * 100) / 100
        : Math.round(euclideanDistance(schemeA.background, schemeB.background) * 100) / 100;
    } catch {
      return 0;
    }
  }, [schemeA.background, schemeB.background, distanceMode]);

  const contrastA = React.useMemo(() => {
    try { return analyzeContrast(schemeA.text, schemeA.background); } catch { return null; }
  }, [schemeA.text, schemeA.background]);

  const contrastB = React.useMemo(() => {
    try { return analyzeContrast(schemeB.text, schemeB.background); } catch { return null; }
  }, [schemeB.text, schemeB.background]);

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
        <IndicatorCard label="色相差异 (ΔHue)" value={`${primaryHueDiff}°`} highlighted />
        <IndicatorCard label="饱和度差异 (ΔSat)" value={`${primarySatDiff}%`} highlighted />
        <IndicatorCard label="亮度差异 (ΔLight)" value={`${primaryLightDiff}%`} highlighted />
        <IndicatorCard label={`主色距离 ${distanceLabel}`} value={primaryDistance.toString()} highlighted />
        <IndicatorCard label={`背景距离 ${distanceLabel}`} value={bgDistance.toString()} highlighted />
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
    flexWrap: 'wrap' as const,
    gap: 12,
    justifyContent: 'center',
    marginTop: 0
  },
  card: {
    width: '180px',
    height: '60px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '10px 14px',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
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
