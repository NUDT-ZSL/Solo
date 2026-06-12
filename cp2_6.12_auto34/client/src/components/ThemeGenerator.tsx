import React from 'react';
import { Theme } from '../types';

interface ThemeGeneratorProps {
  theme: Theme | null;
  onGenerate: () => void;
  isLoading: boolean;
}

const ThemeGenerator: React.FC<ThemeGeneratorProps> = ({ theme, onGenerate, isLoading }) => {
  if (!theme) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>正在获取灵感主题...</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.sectionTitle}>🎯 今日灵感</h2>
        <button
          style={{
            ...styles.generateButton,
            opacity: isLoading ? 0.6 : 1,
          }}
          onClick={onGenerate}
          disabled={isLoading}
        >
          <span style={styles.generateIcon}>✨</span>
          <span>{isLoading ? '生成中...' : '随机生成新主题'}</span>
        </button>
      </div>

      <div
        key={theme.id}
        style={{
          ...styles.themeCard,
          animation: 'cardFlip 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={styles.cardInner}>
          <div style={styles.themeNameRow}>
            <h3 style={styles.themeName}>{theme.name}</h3>
            <span style={styles.themeId}>#{theme.id.slice(0, 6)}</span>
          </div>

          <div style={styles.keywordsRow}>
            {theme.keywords.map((keyword, index) => (
              <span
                key={index}
                style={{
                  ...styles.keywordChip,
                  animation: `fadeIn 0.4s ease ${0.1 + index * 0.08}s both`,
                }}
              >
                {keyword}
              </span>
            ))}
          </div>

          <div style={styles.atmosphereSection}>
            <div style={styles.sectionLabel}>氛围描述</div>
            <p style={styles.atmosphereText}>{theme.atmosphere}</p>
          </div>

          <div style={styles.paletteSection}>
            <div style={styles.sectionLabel}>配色建议</div>
            <div style={styles.paletteRow}>
              {theme.palette.map((color, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.swatchContainer,
                    animation: `fadeIn 0.4s ease ${0.3 + index * 0.08}s both`,
                  }}
                >
                  <div
                    style={{
                      ...styles.colorSwatch,
                      backgroundColor: color,
                    }}
                  />
                  <span style={styles.colorHex}>{color}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.cardDecorTop} />
        <div style={styles.cardDecorBottom} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '760px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  loadingContainer: {
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  loadingSpinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(233, 69, 96, 0.2)',
    borderTopColor: '#e94560',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#a0a0b0',
    fontSize: '14px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f0f0f0',
  },
  generateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #e94560, #ff6b81)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(233, 69, 96, 0.35)',
  },
  generateIcon: {
    fontSize: '15px',
  },
  themeCard: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
  },
  cardInner: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'relative',
    zIndex: 2,
  },
  cardDecorTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'linear-gradient(90deg, #e94560, #ff6b81, #f72585, #e94560)',
    backgroundSize: '300% 100%',
    animation: 'shimmer 3s linear infinite',
  },
  cardDecorBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
  },
  themeNameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '12px',
  },
  themeName: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#f0f0f0',
    letterSpacing: '1px',
    background: 'linear-gradient(135deg, #fff 0%, #ffd1dc 50%, #fff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  themeId: {
    fontSize: '11px',
    color: '#606070',
    fontFamily: 'monospace',
  },
  keywordsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  keywordChip: {
    padding: '5px 14px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '100px',
    fontSize: '13px',
    color: '#c0c0d0',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  atmosphereSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#707080',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  },
  atmosphereText: {
    fontSize: '14px',
    color: '#d0d0e0',
    lineHeight: 1.85,
    padding: '14px 16px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    borderLeft: '3px solid #e94560',
  },
  paletteSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  paletteRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  swatchContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: '70px',
  },
  colorSwatch: {
    width: '100%',
    maxWidth: '90px',
    height: '48px',
    borderRadius: '12px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  colorHex: {
    fontSize: '11px',
    color: '#808090',
    fontFamily: 'monospace',
    fontWeight: 500,
  },
};

export default ThemeGenerator;
