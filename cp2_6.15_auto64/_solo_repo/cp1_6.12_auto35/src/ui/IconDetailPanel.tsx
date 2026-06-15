import React, { useMemo, useState } from 'react';
import type { IconItem } from '../icons/iconData';

interface IconDetailPanelProps {
  icon: IconItem | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#ffffff', '#e94560', '#0f3460', '#00d9ff', '#ffd93d',
  '#6bcb77', '#ff6b6b', '#c77dff', '#ff9f43', '#4d96ff',
];

const IconDetailPanel: React.FC<IconDetailPanelProps> = ({ icon, onClose }) => {
  const [color, setColor] = useState('#e94560');
  const [size, setSize] = useState(48);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);

  const resetParams = () => {
    setColor('#e94560');
    setSize(48);
    setRotation(0);
    setShowCustomColor(false);
  };

  const svgCode = useMemo(() => {
    if (!icon) return '';
    const transform = rotation !== 0
      ? ` transform="rotate(${rotation} ${parseInt(icon.viewBox.split(' ')[2] || '24') / 2} ${parseInt(icon.viewBox.split(' ')[3] || '24') / 2})"`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="${size}" height="${size}" fill="${color}" style="width:${size}px;height:${size}px;fill:${color};transform:rotate(${rotation}deg);">
  <path d="${icon.pathData}"${transform} />
</svg>`;
  }, [icon, color, size, rotation]);

  const handleCopy = async () => {
    if (!svgCode) return;
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = svgCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <style>{`
        .panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 200;
        }
        .panel-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .detail-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 320px;
          height: 100vh;
          background: #16213e;
          border-left: 1px solid #0f3460;
          z-index: 201;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
        }
        .detail-panel.open {
          transform: translateX(0);
        }
        .swatch-btn {
          transition: all 0.2s ease;
        }
        .swatch-btn:hover {
          transform: scale(1.05);
        }
        .swatch-btn.active {
          border-color: #e94560 !important;
          transform: scale(1.1);
          box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.3), inset 0 0 0 1px rgba(255,255,255,0.2) !important;
        }
        @media (max-width: 767px) {
          .panel-overlay {
            background: rgba(0, 0, 0, 0.5);
          }
          .detail-panel {
            top: auto;
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            height: auto;
            max-height: 85vh;
            border-left: none;
            border-top: 1px solid #0f3460;
            transform: translateY(100%);
            border-radius: 20px 20px 0 0;
            box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
          }
          .detail-panel.open {
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        className={`panel-overlay${icon ? ' visible' : ''}`}
        onClick={onClose}
      />
      <aside
        className={`detail-panel${icon ? ' open' : ''}`}
      >
        {icon ? (
          <>
            <div style={styles.header}>
              <div>
                <h2 style={styles.title}>{icon.name}</h2>
                <span style={styles.subtitle}>{icon.id}</span>
              </div>
              <button style={styles.closeBtn} onClick={onClose}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={styles.previewContainer}>
              <div style={styles.previewBox}>
                <svg
                  viewBox={icon.viewBox}
                  width={size * 3}
                  height={size * 3}
                  fill={color}
                  style={{
                    ...styles.previewSvg,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  <path d={icon.pathData} />
                </svg>
              </div>
              <div style={styles.resetRow}>
                <button style={styles.resetBtn} onClick={resetParams}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
                    <path d="M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                  重置参数
                </button>
              </div>
            </div>

            <div style={styles.content}>
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <label style={styles.label}>颜色</label>
                  <button style={styles.toggleBtn} onClick={() => setShowCustomColor(!showCustomColor)}>
                    {showCustomColor ? '预设色板' : '自定义'}
                  </button>
                </div>
                {showCustomColor ? (
                  <div style={styles.customColorRow}>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <input
                      type="text"
                      style={styles.hexInput}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: color,
                      border: '2px solid #0f3460',
                    }} />
                  </div>
                ) : (
                  <div style={styles.colorSwatches}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`swatch-btn${color.toLowerCase() === c.toLowerCase() ? ' active' : ''}`}
                        style={{
                          ...styles.swatchBtn,
                          background: c,
                        }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <label style={styles.label}>大小</label>
                  <span style={styles.valueBadge}>{size}px</span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={64}
                  step={2}
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value))}
                />
                <div style={styles.rangeLabels}>
                  <span>16px</span>
                  <span>64px</span>
                </div>
              </div>

              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <label style={styles.label}>旋转角度</label>
                  <span style={styles.valueBadge}>{rotation}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                />
                <div style={styles.rangeLabels}>
                  <span>0°</span>
                  <span>360°</span>
                </div>
              </div>

              <div style={styles.section}>
                <label style={styles.label}>SVG 代码</label>
                <pre style={styles.codeBlock}>
                  <code>{svgCode}</code>
                </pre>
              </div>
            </div>

            <div style={styles.footer}>
              <button style={styles.copyBtn} onClick={handleCopy}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {copied ? 'SVG已复制！' : '导出 SVG'}
              </button>
            </div>

            {copied && <div style={styles.toast}>SVG已复制！</div>}
          </>
        ) : null}
      </aside>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    borderBottom: '1px solid #0f3460',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#6c7a89',
    fontFamily: 'monospace',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#0f3460',
    border: 'none',
    color: '#a0a0b0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  previewContainer: {
    padding: '20px',
    borderBottom: '1px solid #0f3460',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  previewBox: {
    width: '200px',
    height: '200px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
    border: '1px dashed rgba(15, 52, 96, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewSvg: {
    transition: 'all 0.2s ease',
    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
  },
  resetRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    background: 'transparent',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    color: '#a0a0b0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  toggleBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    background: '#0f3460',
    border: 'none',
    borderRadius: '6px',
    color: '#a0a0b0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  valueBadge: {
    padding: '2px 10px',
    fontSize: '12px',
    fontWeight: 600,
    background: '#0f3460',
    borderRadius: '6px',
    color: '#00d9ff',
    fontFamily: 'monospace',
  },
  colorSwatches: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  swatchBtn: {
    width: '100%',
    aspectRatio: '1',
    border: '3px solid transparent',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
  },
  swatchActive: {
    borderColor: '#e94560',
    transform: 'scale(1.1)',
    boxShadow: '0 0 0 2px rgba(233, 69, 96, 0.3), inset 0 0 0 1px rgba(255,255,255,0.2)',
  },
  customColorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    background: '#1a1a2e',
    borderRadius: '10px',
  },
  hexInput: {
    flex: 1,
    padding: '10px 12px',
    background: '#0f3460',
    border: 'none',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '13px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#6c7a89',
    marginTop: '2px',
  },
  codeBlock: {
    background: '#1a1a2e',
    border: '1px solid #0f3460',
    borderRadius: '10px',
    padding: '12px',
    maxHeight: '150px',
    overflowY: 'auto',
    margin: 0,
    fontSize: '11px',
    lineHeight: 1.6,
    color: '#00d9ff',
    fontFamily: 'Consolas, Monaco, monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #0f3460',
  },
  copyBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(233, 69, 96, 0.35)',
  },
  toast: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #06d6a0, #05a87e)',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 4px 16px rgba(6, 214, 160, 0.4)',
    animation: 'toastIn 0.3s ease',
    zIndex: 300,
  },
};

export default IconDetailPanel;
