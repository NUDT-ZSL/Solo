import React, { useState } from 'react';
import { Palette, ChevronRight, Sparkles } from 'lucide-react';

interface ProjectCreateProps {
  onConfirm: (width: number, height: number) => void;
}

const PRESETS: Array<{ w: number; h: number; label: string; desc: string }> = [
  { w: 16, h: 16, label: '16 × 16', desc: '微型图标' },
  { w: 32, h: 32, label: '32 × 32', desc: '角色精灵 (推荐)' },
  { w: 64, h: 64, label: '64 × 64', desc: '精细角色' }
];

const ProjectCreate: React.FC<ProjectCreateProps> = ({ onConfirm }) => {
  const [selected, setSelected] = useState<number>(1);
  const [customW, setCustomW] = useState(32);
  const [customH, setCustomH] = useState(32);
  const isCustom = selected === -1;

  const getDim = (): { w: number; h: number } => {
    if (isCustom) {
      return {
        w: Math.max(1, Math.min(128, customW)),
        h: Math.max(1, Math.min(128, customH))
      };
    }
    return { w: PRESETS[selected].w, h: PRESETS[selected].h };
  };

  const { w, h } = getDim();
  const scale = Math.min(6, Math.floor(240 / Math.max(w, h)));

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <Palette size={28} color="#569cd6" strokeWidth={2} />
          </div>
          <div>
            <h1 style={styles.title}>像素动画编辑器</h1>
            <p style={styles.subtitle}>Pixel Animation Editor · 逐帧创作工具</p>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>画布尺寸</div>
          <div style={styles.presetGrid}>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelected(idx)}
                style={{
                  ...styles.presetCard,
                  borderColor: selected === idx ? '#569cd6' : '#3e3e42',
                  backgroundColor: selected === idx ? '#1c4f82' : '#2d2d2d'
                }}
              >
                <div
                  style={{
                    ...styles.previewBox,
                    gridTemplateColumns: `repeat(${p.w}, 1fr)`,
                    gridTemplateRows: `repeat(${p.h}, 1fr)`,
                    gap: 0
                  }}
                >
                  {Array.from({ length: p.w * p.h }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: (Math.floor(i / p.w) + (i % p.w)) % 2 === 0
                          ? (selected === idx ? '#3a7ab8' : '#c0c0c0')
                          : (selected === idx ? '#2a6aa8' : '#808080'),
                        width: '100%', height: '100%'
                      }}
                    />
                  ))}
                </div>
                <div style={styles.presetLabel}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: selected === idx ? '#fff' : '#ddd' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '11px', color: selected === idx ? '#9ccfff' : '#777' }}>
                    {p.desc}
                  </div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setSelected(-1)}
              style={{
                ...styles.presetCard,
                borderColor: isCustom ? '#569cd6' : '#3e3e42',
                backgroundColor: isCustom ? '#1c4f82' : '#2d2d2d'
              }}
            >
              <div
                style={{
                  ...styles.previewBox,
                  gridTemplateColumns: `repeat(${w}, 1fr)`,
                  gridTemplateRows: `repeat(${h}, 1fr)`,
                  gap: 0
                }}
              >
                {Array.from({ length: w * h }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: (Math.floor(i / w) + (i % w)) % 2 === 0
                        ? (isCustom ? '#3a7ab8' : '#c0c0c0')
                        : (isCustom ? '#2a6aa8' : '#808080'),
                      width: '100%', height: '100%'
                    }}
                  />
                ))}
              </div>
              <div style={styles.presetLabel}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: isCustom ? '#fff' : '#ddd' }}>
                  自定义
                </div>
                <div style={{ fontSize: '11px', color: isCustom ? '#9ccfff' : '#777' }}>
                  最大 128 × 128
                </div>
              </div>
            </button>
          </div>
        </div>

        {isCustom && (
          <div style={{ ...styles.section, paddingTop: 0 }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>宽 (px)</label>
                <input
                  type="number"
                  min={1}
                  max={128}
                  value={customW}
                  onChange={(e) => setCustomW(Math.max(1, Math.min(128, Number(e.target.value) || 1)))}
                  style={styles.dimInput}
                />
              </div>
              <span style={{ fontSize: '18px', color: '#555' }}>×</span>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>高 (px)</label>
                <input
                  type="number"
                  min={1}
                  max={128}
                  value={customH}
                  onChange={(e) => setCustomH(Math.max(1, Math.min(128, Number(e.target.value) || 1)))}
                  style={styles.dimInput}
                />
              </div>
            </div>
          </div>
        )}

        <div style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
            <Sparkles size={14} color="#666" />
            <span>{w} × {h} · 缩放 {scale}x · 画布 {w * scale}px</span>
          </div>
          <button onClick={() => onConfirm(w, h)} style={styles.confirmBtn}>
            创建项目
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    backgroundImage: `radial-gradient(circle at 20% 30%, rgba(86,156,214,0.08), transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(156,89,230,0.06), transparent 50%)`
  },
  card: {
    width: '540px',
    maxWidth: '92vw',
    padding: '32px',
    backgroundColor: '#252526',
    border: '1px solid #3e3e42',
    borderRadius: '14px',
    boxShadow: '0 20px 80px rgba(0,0,0,0.5)'
  },
  header: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    marginBottom: '28px',
    paddingBottom: '22px',
    borderBottom: '1px solid #303030'
  },
  logoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#1c4f82',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #2a6aa8'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px'
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#888'
  },
  section: {
    marginBottom: '22px'
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px'
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px'
  },
  presetCard: {
    padding: '12px',
    border: '2px solid #3e3e42',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.15s ease',
    outline: 'none'
  },
  previewBox: {
    width: '72px',
    height: '72px',
    display: 'grid',
    overflow: 'hidden',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  presetLabel: {
    textAlign: 'center'
  },
  dimField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  dimLabel: {
    fontSize: '11px',
    color: '#777'
  },
  dimInput: {
    padding: '10px 12px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#ddd',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  footer: {
