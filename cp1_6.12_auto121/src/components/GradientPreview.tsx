import { useState, useMemo, useCallback } from 'react';
import type { GradientConfig } from '../types';
import { generateGradientCSS, generateFullCSSCode } from '../utils/gradient';

interface GradientPreviewProps {
  gradient: GradientConfig;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

const GradientPreview = ({ gradient, isFavorited, onToggleFavorite }: GradientPreviewProps) => {
  const [copied, setCopied] = useState(false);
  const [heartKey, setHeartKey] = useState(0);

  const gradientCSS = useMemo(() => generateGradientCSS(gradient), [gradient]);
  const fullCSSCode = useMemo(() => generateFullCSSCode(gradient), [gradient]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCSSCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleFavorite = useCallback(() => {
    setHeartKey(prev => prev + 1);
    onToggleFavorite();
  }, [onToggleFavorite]);

  return (
    <div style={styles.container}>
      <div style={styles.previewHeader}>
        <h2 style={styles.title}>实时预览</h2>
        <button
          onClick={handleFavorite}
          style={{
            ...styles.favoriteBtn,
            color: isFavorited ? '#ff4757' : '#888',
          }}
          className="favorite-btn"
        >
          <div key={heartKey} className={heartKey > 0 ? 'favorite-pulse' : ''}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill={isFavorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        </button>
      </div>

      <div
        className="preview-area"
        style={{
          ...styles.previewArea,
          background: gradientCSS,
        }}
      />

      <div style={styles.codeSection}>
        <div style={styles.codeHeader}>
          <span style={styles.codeLabel}>CSS 代码</span>
          <button onClick={handleCopy} style={styles.copyBtn} className="copy-btn">
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
        <pre style={styles.codeBlock}>
          <code style={styles.codeText}>{fullCSSCode}</code>
        </pre>
      </div>
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
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  favoriteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.3s ease, transform 0.3s ease',
  },
  previewArea: {
    width: '100%',
    height: '400px',
    borderRadius: '12px',
    transition: 'background 0.1s ease',
  },
  codeSection: {
    marginTop: '16px',
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  codeLabel: {
    fontSize: '14px',
    color: '#888',
    fontWeight: 500,
  },
  copyBtn: {
    backgroundColor: '#4A90D9',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease, transform 0.3s ease',
    fontWeight: 500,
  },
  codeBlock: {
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    padding: '16px',
    margin: 0,
    overflowX: 'auto',
  },
  codeText: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '13px',
    color: '#a6e22e',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};

export default GradientPreview;
