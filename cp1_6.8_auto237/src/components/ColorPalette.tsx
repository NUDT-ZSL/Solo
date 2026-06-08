import React, { useState } from 'react';
import { PaletteColors, ColorHSL, MoodTag, SavedPalette } from '../hooks/useColorPalette';

interface ColorPaletteProps {
  palette: PaletteColors;
  mood: MoodTag;
  onMoodChange: (mood: MoodTag) => void;
  onSave: () => void;
  onCopy: (color: ColorHSL) => void;
  savedPalettes: SavedPalette[];
  onRemove: (id: string) => void;
  onApply: (p: SavedPalette) => void;
  hslToString: (c: ColorHSL) => string;
  hslToHex: (c: ColorHSL) => string;
}

const MOODS: MoodTag[] = ['宁静', '活力', '复古', '科技'];

const MOOD_ICONS: Record<MoodTag, string> = {
  '宁静': '🌿',
  '活力': '🔥',
  '复古': '📷',
  '科技': '⚡',
};

const COLOR_LABELS = ['主色', '辅助色', '强调色'] as const;
const COLOR_KEYS = ['primary', 'secondary', 'accent'] as const;

const ColorPalette: React.FC<ColorPaletteProps> = ({
  palette,
  mood,
  onMoodChange,
  onSave,
  onCopy,
  savedPalettes,
  onRemove,
  onApply,
  hslToString,
  hslToHex,
}) => {
  const [showSaved, setShowSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 600);
  };

  return (
    <div style={styles.container}>
      <div style={styles.moodSection}>
        <div style={styles.sectionTitle}>情绪标签</div>
        <div style={styles.moodRow}>
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => onMoodChange(m)}
              style={{
                ...styles.moodBtn,
                ...(mood === m ? styles.moodBtnActive : {}),
                background: mood === m
                  ? `linear-gradient(135deg, ${hslToString(palette.primary)}22, ${hslToString(palette.accent)}22)`
                  : 'rgba(255,255,255,0.6)',
                borderColor: mood === m ? hslToString(palette.primary) : 'rgba(0,0,0,0.08)',
              }}
            >
              <span style={styles.moodIcon}>{MOOD_ICONS[m]}</span>
              <span>{m}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.cardsSection}>
        <div style={styles.sectionTitle}>配色方案</div>
        <div style={styles.cardsRow}>
          {COLOR_KEYS.map((key, i) => {
            const color = palette[key];
            const hex = hslToHex(color);
            return (
              <div key={key} style={styles.card}>
                <div
                  style={{
                    ...styles.swatch,
                    background: hslToString(color),
                    boxShadow: `0 4px 20px ${hslToString(color)}55`,
                  }}
                />
                <div style={styles.cardLabel}>{COLOR_LABELS[i]}</div>
                <div style={styles.hexCode}>{hex.toUpperCase()}</div>
                <button
                  onClick={() => onCopy(color)}
                  style={styles.copyBtn}
                  title="复制颜色代码"
                >
                  📋 复制
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.actionRow}>
        <button
          onClick={handleSave}
          style={{
            ...styles.saveBtn,
            transform: justSaved ? 'scale(1.15)' : 'scale(1)',
            background: `linear-gradient(135deg, ${hslToString(palette.primary)}, ${hslToString(palette.accent)})`,
          }}
        >
          {justSaved ? '✅ 已收藏' : '⭐ 收藏配色'}
        </button>
        <button
          onClick={() => setShowSaved(s => !s)}
          style={{
            ...styles.savedToggleBtn,
            background: showSaved ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.6)',
          }}
        >
          收藏夹 ({savedPalettes.length})
        </button>
      </div>

      {showSaved && savedPalettes.length > 0 && (
        <div style={styles.savedList}>
          {savedPalettes.map(p => (
            <div key={p.id} style={styles.savedItem}>
              <div style={styles.savedSwatches}>
                {(['primary', 'secondary', 'accent'] as const).map(k => (
                  <div
                    key={k}
                    style={{
                      ...styles.savedSwatch,
                      background: `hsl(${p.colors[k].h}, ${Math.round(p.colors[k].s)}%, ${Math.round(p.colors[k].l)}%)`,
                    }}
                  />
                ))}
              </div>
              <div style={styles.savedMeta}>
                <span style={styles.savedMood}>{MOOD_ICONS[p.mood]} {p.mood}</span>
              </div>
              <div style={styles.savedActions}>
                <button onClick={() => onApply(p)} style={styles.savedActionBtn} title="应用">▶</button>
                <button onClick={() => onRemove(p.id)} style={styles.savedActionBtn} title="删除">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSaved && savedPalettes.length === 0 && (
        <div style={styles.emptySaved}>暂无收藏，快去收藏喜欢的配色吧</div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    maxWidth: 600,
  },
  moodSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  moodRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  moodBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 20,
    border: '1.5px solid',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: 'all 0.25s ease',
    backdropFilter: 'blur(8px)',
  },
  moodBtnActive: {
    fontWeight: 700,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  moodIcon: {
    fontSize: 16,
  },
  cardsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardsRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    minWidth: 120,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  swatch: {
    width: 72,
    height: 72,
    borderRadius: 16,
    transition: 'background 0.4s ease, box-shadow 0.4s ease',
  },
  cardLabel: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: 500,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  hexCode: {
    fontSize: 14,
    fontWeight: 600,
    color: '#555',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  copyBtn: {
    padding: '4px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.08)',
    background: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: 'all 0.2s ease',
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  saveBtn: {
    padding: '10px 28px',
    borderRadius: 24,
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Noto Sans SC', sans-serif",
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.4s ease',
  },
  savedToggleBtn: {
    padding: '10px 20px',
    borderRadius: 24,
    border: '1.5px solid rgba(0,0,0,0.08)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: 'all 0.2s ease',
  },
  savedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 220,
    overflowY: 'auto' as const,
    padding: '8px 0',
  },
  savedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  savedSwatches: {
    display: 'flex',
    gap: 4,
  },
  savedSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  savedMeta: {
    flex: 1,
  },
  savedMood: {
    fontSize: 13,
    color: '#777',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  savedActions: {
    display: 'flex',
    gap: 4,
  },
  savedActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.06)',
    background: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  emptySaved: {
    textAlign: 'center' as const,
    color: '#bbb',
    fontSize: 13,
    padding: 20,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
};

export default ColorPalette;
