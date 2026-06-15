import React, { useState } from 'react';
import { X, Image as ImageIcon, Film } from 'lucide-react';
import { usePixelState } from '../PixelState';
import { RGB } from '../types';
import { rgbToString, hexToRgb, rgbToHex } from '../utils/colorUtils';
import { exportSpritesheet, exportGif } from '../utils/exportUtils';

type ExportFormat = 'spritesheet' | 'gif';

interface ExportModalProps {
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { state } = usePixelState();
  const [format, setFormat] = useState<ExportFormat>('spritesheet');
  const [scale, setScale] = useState<1 | 2 | 4>(2);
  const [bgMode, setBgMode] = useState<'transparent' | 'color'>('transparent');
  const [bgColor, setBgColor] = useState<RGB>({ r: 0, g: 0, b: 0 });
  const [exporting, setExporting] = useState(false);

  const handleBgColorChange = (hex: string) => {
    setBgColor(hexToRgb(hex));
  };

  const handleExport = async () => {
    const bg = bgMode === 'color' ? bgColor : null;
    setExporting(true);
    try {
      if (format === 'spritesheet') {
        await exportSpritesheet(state.project, scale, bg);
      } else {
        await exportGif(state.project, scale, bg, state.playback.fps);
      }
      setTimeout(onClose, 300);
    } catch (err) {
      console.error('Export error:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>导出动画</span>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} color="#888" />
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.labelRow}>
            <span style={styles.label}>格式</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setFormat('spritesheet')}
              style={{
                ...styles.formatBtn,
                borderColor: format === 'spritesheet' ? '#569cd6' : '#444',
                backgroundColor: format === 'spritesheet' ? '#1c4f82' : '#2d2d2d'
              }}
            >
              <ImageIcon size={16} color={format === 'spritesheet' ? '#569cd6' : '#888'} />
              <span style={styles.btnLabel}>Spritesheet PNG</span>
            </button>
            <button
              onClick={() => setFormat('gif')}
              style={{
                ...styles.formatBtn,
                borderColor: format === 'gif' ? '#569cd6' : '#444',
                backgroundColor: format === 'gif' ? '#1c4f82' : '#2d2d2d'
              }}
            >
              <Film size={16} color={format === 'gif' ? '#569cd6' : '#888'} />
              <span style={styles.btnLabel}>GIF 动画</span>
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.labelRow}>
            <span style={styles.label}>尺寸倍数</span>
            <span style={styles.hint}>
              {state.project.width * scale} × {state.project.height * scale} px
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {([1, 2, 4] as const).map(s => (
              <button
                key={s}
                onClick={() => setScale(s)}
                style={{
                  ...styles.scaleBtn,
                  borderColor: scale === s ? '#569cd6' : '#444',
                  backgroundColor: scale === s ? '#1c4f82' : '#2d2d2d',
                  color: scale === s ? '#569cd6' : '#ccc'
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.labelRow}>
            <span style={styles.label}>背景</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setBgMode('transparent')}
              style={{
                ...styles.bgBtn,
                borderColor: bgMode === 'transparent' ? '#569cd6' : '#444',
                backgroundColor: bgMode === 'transparent' ? '#1c4f82' : '#2d2d2d',
                color: bgMode === 'transparent' ? '#569cd6' : '#ccc'
              }}
            >
              透明
            </button>
            <button
              onClick={() => setBgMode('color')}
              style={{
                ...styles.bgBtn,
                borderColor: bgMode === 'color' ? '#569cd6' : '#444',
                backgroundColor: bgMode === 'color' ? '#1c4f82' : '#2d2d2d',
                color: bgMode === 'color' ? '#569cd6' : '#ccc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              纯色
              {bgMode === 'color' && (
                <>
                  <input
                    type="color"
                    value={rgbToHex(bgColor)}
                    onChange={(e) => handleBgColorChange(e.target.value)}
                    style={styles.colorPicker}
                  />
                  <span
                    style={{
                      width: '20px', height: '20px',
                      backgroundColor: rgbToString(bgColor),
                      borderRadius: '4px',
                      border: '1px solid #555'
                    }}
                  />
                </>
              )}
            </button>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={exporting}>
            取消
          </button>
          <button
            style={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : `导出为 ${format === 'spritesheet' ? 'PNG' : 'GIF'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(3px)'
  },
  modal: {
    width: '480px',
    maxWidth: '92vw',
    backgroundColor: '#252526',
    border: '1px solid #3e3e42',
    borderRadius: '10px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #3e3e42'
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff'
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none'
  },
  section: {
    padding: '14px 18px',
    borderBottom: '1px solid #303030'
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  hint: {
    fontSize: '11px',
    color: '#666'
  },
  formatBtn: {
    flex: 1,
    padding: '12px',
    border: '1px solid #444',
    borderRadius: '7px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    outline: 'none',
    transition: 'all 0.15s'
  },
  btnLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ccc'
  },
  scaleBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid #444',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    outline: 'none',
    transition: 'all 0.15s'
  },
  bgBtn: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #444',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    outline: 'none',
    transition: 'all 0.15s',
    minWidth: '180px'
  },
  colorPicker: {
    width: '28px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    padding: 0
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '14px 18px'
  },
  cancelBtn: {
    padding: '9px 18px',
    border: '1px solid #444',
    borderRadius: '6px',
    backgroundColor: '#2d2d2d',
    color: '#ccc',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
  },
  exportBtn: {
    padding: '9px 20px',
    border: '1px solid #569cd6',
    borderRadius: '6px',
    backgroundColor: '#0e639c',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none'
  }
};

export default ExportModal;
