import { useState } from 'react';
import type { GradientConfig, SavedPalette, HistoryItem } from '../types';
import { generateGradientCSS, formatTime } from '../utils/gradient';

interface ColorPaletteProps {
  palettes: SavedPalette[];
  history: HistoryItem[];
  onApply: (config: GradientConfig) => void;
  onDelete: (id: string) => void;
  onClearHistory: () => void;
}

interface ThumbnailProps {
  config: GradientConfig;
  size?: number;
}

const GradientThumbnail = ({ config, size = 48 }: ThumbnailProps) => {
  const gradientCSS = generateGradientCSS(config);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        background: gradientCSS,
        flexShrink: 0,
      }}
    />
  );
};

const ColorPalette = ({ palettes, history, onApply, onDelete, onClearHistory }: ColorPaletteProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>我的收藏</h3>
          <span style={styles.countBadge}>{palettes.length}</span>
        </div>

        {palettes.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <p style={styles.emptyText}>暂无收藏</p>
            <p style={styles.emptyHint}>点击心形图标保存喜欢的配色</p>
          </div>
        ) : (
          <div style={styles.paletteList}>
            {palettes.map((palette) => (
              <div
                key={palette.id}
                style={{
                  ...styles.paletteCard,
                  backgroundColor: hoveredId === palette.id ? '#0f1629' : '#1a1a2e',
                }}
                className="palette-card"
                onMouseEnter={() => setHoveredId(palette.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => onApply(palette)}
                  style={styles.paletteBtn}
                  className="palette-btn"
                >
                  <GradientThumbnail config={palette} />
                  <div style={styles.paletteInfo}>
                    <span style={styles.colorTag}>{palette.startColor}</span>
                    <span style={styles.colorTag}>{palette.endColor}</span>
                    <span style={styles.typeTag}>
                      {palette.type === 'linear' ? `线性 ${palette.angle}°` : palette.type === 'radial-circle' ? '径向圆' : '径向椭圆'}
                    </span>
                  </div>
                </button>

                {hoveredId === palette.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(palette.id);
                    }}
                    style={styles.deleteBtn}
                    className="delete-btn"
                    title="删除"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>历史记录</h3>
          {history.length > 0 && (
            <button onClick={onClearHistory} style={styles.clearBtn} className="clear-btn">
              清空
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p style={styles.emptyText}>暂无历史记录</p>
          </div>
        ) : (
          <div style={styles.historyList}>
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => onApply(item)}
                style={styles.historyItem}
                className="history-item"
              >
                <GradientThumbnail config={item} size={36} />
                <div style={styles.historyInfo}>
                  <div style={styles.historyColors}>
                    <span style={styles.colorDot}>{item.startColor}</span>
                    <span style={styles.arrow}>→</span>
                    <span style={styles.colorDot}>{item.endColor}</span>
                  </div>
                  <span style={styles.timeText}>{formatTime(item.timestamp)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
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
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  section: {
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  countBadge: {
    backgroundColor: '#4A90D9',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
  },
  paletteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  paletteCard: {
    position: 'relative',
    borderRadius: '10px',
    transition: 'background-color 0.2s ease',
  },
  paletteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '10px',
    textAlign: 'left',
  },
  paletteInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  colorTag: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '12px',
    color: '#e0e0e0',
    textTransform: 'uppercase',
  },
  typeTag: {
    fontSize: '11px',
    color: '#888',
  },
  deleteBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: '#ff4757',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 20px',
    gap: '8px',
  },
  emptyText: {
    color: '#666',
    fontSize: '13px',
  },
  emptyHint: {
    color: '#555',
    fontSize: '11px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#2a2a4e',
    margin: '0 0 20px 0',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '250px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 10px',
    background: 'none',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s ease',
  },
  historyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  historyColors: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  colorDot: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '11px',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  arrow: {
    color: '#555',
    fontSize: '10px',
  },
  timeText: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '11px',
    color: '#666',
  },
};

export default ColorPalette;
