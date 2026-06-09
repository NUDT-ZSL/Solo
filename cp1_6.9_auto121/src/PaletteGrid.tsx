import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, EMOTION_OPTIONS, EMOTION_COLORS, EmotionType } from './api'

interface PaletteGridProps {
  palettes: Palette[]
}

export default function PaletteGrid({ palettes }: PaletteGridProps) {
  const navigate = useNavigate()

  const emotionCounts: Record<EmotionType, number> = {
    '愉悦': 0,
    '忧郁': 0,
    '平静': 0,
    '烦闷': 0,
    '惊喜': 0,
    '悲伤': 0,
  }

  palettes.forEach(p => {
    if (emotionCounts[p.emotion as EmotionType] !== undefined) {
      emotionCounts[p.emotion as EmotionType]++
    }
  })

  const maxCount = Math.max(1, ...Object.values(emotionCounts))

  const adjustOpacity = (hex: string, count: number): string => {
    const ratio = 0.25 + (count / maxCount) * 0.75
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${ratio})`
  }

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: 40,
    },
    heatmapSection: {
      background: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 20,
      color: '#2C3E50',
    },
    heatmapGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 16,
      maxWidth: 600,
    },
    heatmapItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    },
    heatmapBox: {
      width: 80,
      height: 80,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: 24,
      fontWeight: 700,
      transition: 'transform 0.2s ease',
      cursor: 'default',
      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    heatmapLabel: {
      fontSize: 13,
      color: '#5B6C7F',
      fontWeight: 500,
    },
    gridSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    },
    masonryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: 20,
    },
    thumbnail: {
      width: '100%',
      aspectRatio: '4 / 3',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#f8f8f5',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    },
    colorsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))',
      flex: 1,
      minHeight: 100,
    },
    colorBlock: {
      minHeight: 30,
    },
    thumbnailFooter: {
      padding: '10px 12px',
      background: 'white',
      borderTop: '1px solid #eee',
    },
    thumbnailName: {
      fontSize: 14,
      fontWeight: 600,
      color: '#2C3E50',
      marginBottom: 4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    thumbnailMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 12,
      color: '#888',
    },
    emotionBadge: {
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 500,
      color: 'white',
    },
    feedbackBadge: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      minWidth: 26,
      height: 26,
      padding: '0 8px',
      borderRadius: 13,
      background: 'rgba(52,152,219,0.95)',
      color: 'white',
      fontSize: 12,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 2px 8px rgba(52,152,219,0.4)',
    },
    emptyState: {
      padding: '60px 20px',
      textAlign: 'center',
      color: '#999',
      fontSize: 16,
    },
  }

  if (palettes.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.heatmapSection}>
          <h3 style={styles.sectionTitle}>情绪热力图</h3>
          <div style={styles.heatmapGrid}>
            {EMOTION_OPTIONS.map(({ value, label }) => (
              <div key={value} style={styles.heatmapItem}>
                <div
                  style={{
                    ...styles.heatmapBox,
                    backgroundColor: adjustOpacity(EMOTION_COLORS[value as EmotionType], 0),
                  }}
                >
                  0
                </div>
                <span style={styles.heatmapLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <p>还没有创建调色板，开始混合你的第一种情绪色彩吧！</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.heatmapSection}>
        <h3 style={styles.sectionTitle}>📊 情绪热力图</h3>
        <div style={styles.heatmapGrid}>
          {EMOTION_OPTIONS.map(({ value, label }) => (
            <div key={value} style={styles.heatmapItem}>
              <div
                style={{
                  ...styles.heatmapBox,
                  backgroundColor: adjustOpacity(EMOTION_COLORS[value as EmotionType], emotionCounts[value as EmotionType]),
                }}
              >
                {emotionCounts[value as EmotionType]}
              </div>
              <span style={styles.heatmapLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.gridSection}>
        <h3 style={styles.sectionTitle}>🖼️ 我的调色板收藏</h3>
        <div style={styles.masonryGrid}>
          {palettes.map(palette => (
            <div
              key={palette.id}
              style={styles.thumbnail}
              onClick={() => navigate(`/palette/${palette.id}`)}
              className="palette-thumbnail"
            >
              <div style={styles.colorsGrid}>
                {palette.colors.map((c, idx) => (
                  <div key={idx} style={{ ...styles.colorBlock, backgroundColor: c.hex }} />
                ))}
              </div>
              <div style={styles.thumbnailFooter}>
                <div style={styles.thumbnailName}>{palette.name}</div>
                <div style={styles.thumbnailMeta}>
                  <span
                    style={{
                      ...styles.emotionBadge,
                      backgroundColor: EMOTION_COLORS[palette.emotion as EmotionType] || '#888',
                    }}
                  >
                    {palette.emotion}
                  </span>
                  <span>{new Date(palette.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              {palette.feedbacks.length > 0 && (
                <div style={styles.feedbackBadge}>
                  {palette.feedbacks.length > 99 ? '99+' : palette.feedbacks.length}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .palette-thumbnail:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  )
}
