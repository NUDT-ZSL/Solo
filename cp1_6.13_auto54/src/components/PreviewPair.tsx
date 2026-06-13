import React from 'react';
import { ColorScheme } from '../utils/ColorCalculator';
import { analyzeContrast, ContrastResult, formatRatio } from '../utils/ContrastAnalyzer';

interface PreviewPairProps {
  schemeA: ColorScheme;
  schemeB: ColorScheme;
  filterActive: boolean;
}

interface PreviewCardProps {
  scheme: ColorScheme;
  label: string;
  labelBg: string;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ scheme, label, labelBg }) => {
  const [textContrast, setTextContrast] = React.useState<ContrastResult | null>(null);
  const [btnContrast, setBtnContrast] = React.useState<ContrastResult | null>(null);

  React.useEffect(() => {
    setTextContrast(analyzeContrast(scheme.text, scheme.background));
    setBtnContrast(analyzeContrast('#ffffff', scheme.primary));
  }, [scheme]);

  const getLevelColor = (level: string) => {
    if (level === 'AAA') return '#10b981';
    if (level === 'AA') return '#3b82f6';
    return '#ef4444';
  };

  return (
    <div style={{ ...styles.cardWrapper, backgroundColor: scheme.background }}>
      <div style={{ ...styles.cardLabel, backgroundColor: labelBg }}>
        {label}
      </div>
      <div style={styles.cardContent}>
        <div style={styles.iconPlaceholder}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={scheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <h3 style={{ ...styles.cardTitle, color: scheme.text }}>产品标题示例</h3>
        <p style={{ ...styles.cardBody, color: scheme.text, opacity: 0.8 }}>
          这是一段用于测试配色方案可读性的示例正文文字。检查文字与背景的对比度是否符合 WCAG 标准。
        </p>
        <div style={styles.tagRow}>
          <span style={{ ...styles.tag, backgroundColor: scheme.primary, color: '#ffffff' }}>
            标签 A
          </span>
          <span style={{ ...styles.tagSecondary, borderColor: scheme.primary, color: scheme.primary }}>
            标签 B
          </span>
        </div>
        <button style={{ ...styles.actionBtn, backgroundColor: scheme.primary, color: '#ffffff' }}>
          立即操作
        </button>
        <div style={styles.contrastInfo}>
          <div style={styles.contrastItem}>
            <span style={styles.contrastLabel}>文本</span>
            {textContrast && (
              <span style={{ ...styles.contrastValue, color: getLevelColor(textContrast.normalText) }}>
                {formatRatio(textContrast.ratio)} {textContrast.normalText}
              </span>
            )}
          </div>
          <div style={styles.contrastItem}>
            <span style={styles.contrastLabel}>按钮</span>
            {btnContrast && (
              <span style={{ ...styles.contrastValue, color: getLevelColor(btnContrast.normalText) }}>
                {formatRatio(btnContrast.ratio)} {btnContrast.normalText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PreviewPair: React.FC<PreviewPairProps> = ({ schemeA, schemeB, filterActive }) => {
  return (
    <div style={{
      ...styles.wrapper,
      transition: filterActive ? 'filter 0.4s ease-in-out' : 'none'
    }}>
      <PreviewCard scheme={schemeA} label="方案 A" labelBg="#3b82f6" />
      <div style={styles.divider} />
      <PreviewCard scheme={schemeB} label="方案 B" labelBg="#10b981" />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0,
    flexWrap: 'wrap'
  },
  cardWrapper: {
    width: 240,
    height: 320,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    transition: 'background-color 0.4s ease, box-shadow 0.2s ease'
  },
  cardLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: '4px 10px',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 0.5,
    zIndex: 2
  },
  cardContent: {
    padding: '52px 20px 20px 20px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.06)'
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.3,
    fontFamily: "'JetBrains Mono', monospace"
  },
  cardBody: {
    margin: '0 0 14px 0',
    fontSize: 12,
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', monospace"
  },
  tagRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 14
  },
  tag: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "'JetBrains Mono', monospace"
  },
  tagSecondary: {
    padding: '3px 9px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "'JetBrains Mono', monospace",
    border: '1px solid'
  },
  actionBtn: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'transform 0.1s ease, filter 0.2s ease'
  },
  contrastInfo: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: 12,
    gap: 8
  },
  contrastItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  contrastLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: "'JetBrains Mono', monospace"
  },
  contrastValue: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace"
  },
  divider: {
    width: 1,
    minWidth: 1,
    height: 320,
    margin: '0 24px',
    borderLeft: '1px dashed #d1d5db',
    flexShrink: 0
  }
};

export default PreviewPair;
