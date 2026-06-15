import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import ColorMixer from './ColorMixer'
import PaletteGrid from './PaletteGrid'
import ShareView from './ShareView'
import { Palette, PaletteColor, EMOTION_OPTIONS, EmotionType, createPalette, getPalettes } from './api'

function HomePage() {
  const navigate = useNavigate()
  const [currentColors, setCurrentColors] = useState<PaletteColor[]>([])
  const [paletteName, setPaletteName] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('平静')
  const [savedPalettes, setSavedPalettes] = useState<Palette[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState<{ id: string } | null>(null)

  useEffect(() => {
    loadPalettes()
  }, [])

  const loadPalettes = async () => {
    try {
      const list = await getPalettes()
      setSavedPalettes(list)
    } catch (e) {
      // ignore
    }
  }

  const handleAddColor = (color: PaletteColor) => {
    if (currentColors.length >= 12) return
    setCurrentColors(prev => [...prev, color])
    setError(null)
    setSavedSuccess(null)
  }

  const handleRemoveColor = (index: number) => {
    setCurrentColors(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const handleSave = async () => {
    if (currentColors.length < 3) {
      setError('至少需要3种颜色才能形成情绪的完整拼图')
      return
    }
    if (!paletteName.trim()) {
      setError('请为调色板命名')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await createPalette({
        name: paletteName.trim(),
        tags: [],
        colors: currentColors,
        emotion: selectedEmotion,
      })
      setSavedSuccess({ id: result.id })
      setCurrentColors([])
      setPaletteName('')
      setSelectedEmotion('平静')
      loadPalettes()
    } catch (err: any) {
      setError(err.message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    if (!savedSuccess) return
    const url = `${window.location.origin}/palette/${savedSuccess.id}`
    navigator.clipboard.writeText(url).then(() => {
      alert('分享链接已复制到剪贴板！')
    })
  }

  const styles: Record<string, React.CSSProperties> = {
    mainLayout: {
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
    },
    createSection: {
      display: 'flex',
      gap: 32,
      flexWrap: 'wrap',
    },
    mixerPanel: {
      flex: '1 1 560px',
      minWidth: 0,
    },
    savePanel: {
      flex: '1 1 400px',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    },
    savedColorsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 12,
      padding: 16,
      background: '#FAFAF7',
      borderRadius: 12,
      minHeight: 140,
    },
    savedColorItem: {
      position: 'relative',
      aspectRatio: '1',
      borderRadius: 10,
      cursor: 'pointer',
      border: '2px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'transform 0.15s ease',
      overflow: 'hidden',
    },
    removeBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'rgba(0,0,0,0.5)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0,
      transition: 'opacity 0.15s ease',
    },
    emptySlot: {
      aspectRatio: '1',
      borderRadius: 10,
      border: '2px dashed #D0D0CC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#AAA',
      fontSize: 12,
      background: 'white',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: '#5B6C7F',
    },
    input: {
      padding: '10px 14px',
      borderRadius: 8,
      border: '1.5px solid #E0E0DC',
      fontSize: 14,
      outline: 'none',
      transition: 'border-color 0.2s ease',
      background: 'white',
    },
    select: {
      padding: '10px 14px',
      borderRadius: 8,
      border: '1.5px solid #E0E0DC',
      fontSize: 14,
      outline: 'none',
      background: 'white',
      cursor: 'pointer',
    },
    counter: {
      fontSize: 13,
      color: '#888',
      textAlign: 'right',
    },
    errorMsg: {
      padding: '10px 14px',
      background: '#FDECEA',
      color: '#C0392B',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
    },
    successBox: {
      padding: '16px',
      background: '#E8F8F5',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      alignItems: 'center',
      border: '1px solid #A3E4D7',
    },
    successText: {
      fontSize: 15,
      fontWeight: 600,
      color: '#196F3D',
    },
    shareLink: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: 8,
      background: 'white',
      border: '1px solid #A3E4D7',
      fontFamily: 'monospace',
      fontSize: 13,
      color: '#2C3E50',
      wordBreak: 'break-all',
      textAlign: 'center',
    },
    colorInfo: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '4px 6px',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      fontSize: 10,
      fontFamily: 'monospace',
      opacity: 0,
      transition: 'opacity 0.15s ease',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: '#2C3E50',
      marginBottom: 4,
    },
  }

  return (
    <div className="app-container">
      <div className="page-header">
        <h1 className="page-title">🎨 情绪调色板</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>
            用色彩，说出你的心情
          </span>
        </div>
      </div>

      <div style={styles.mainLayout}>
        <div style={styles.createSection}>
          <div className="card" style={styles.mixerPanel}>
            <h3 style={styles.sectionTitle}>🖌️ 颜色混合画布</h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              拖拽探索三原色渐变，找到代表你此刻心情的颜色
            </p>
            <ColorMixer onAddToPalette={handleAddColor} />
          </div>

          <div style={styles.savePanel}>
            <div className="card">
              <h3 style={styles.sectionTitle}>🌈 当前调色板</h3>
              <div style={styles.counter}>
                {currentColors.length} / 12 种颜色
                {currentColors.length < 3 && (
                  <span style={{ color: '#E67E22' }}> · 至少再添加 {3 - currentColors.length} 种</span>
                )}
              </div>
              <div style={{ ...styles.savedColorsGrid, marginTop: 12 }}>
                {currentColors.map((c, idx) => (
                  <div
                    key={idx}
                    style={{ ...styles.savedColorItem, backgroundColor: c.hex }}
                    className="saved-color"
                    title={`${c.hex} · ${c.emotion}`}
                  >
                    <button
                      style={styles.removeBtn}
                      className="remove-btn"
                      onClick={() => handleRemoveColor(idx)}
                    >
                      ×
                    </button>
                    <div className="color-info" style={styles.colorInfo}>
                      {c.hex} · {c.emotion}
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 10 - currentColors.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={styles.emptySlot}>
                    {currentColors.length + i + 1 <= 12 ? `${currentColors.length + i + 1}` : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={styles.sectionTitle}>💾 保存调色板</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>调色板名称</label>
                  <input
                    style={styles.input}
                    placeholder="例如：今日心情"
                    value={paletteName}
                    onChange={e => setPaletteName(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = '#5B6C7F')}
                    onBlur={e => (e.target.style.borderColor = '#E0E0DC')}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>总体情绪标签</label>
                  <select
                    style={styles.select}
                    value={selectedEmotion}
                    onChange={e => setSelectedEmotion(e.target.value as EmotionType)}
                  >
                    {EMOTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {error && <div style={styles.errorMsg}>⚠️ {error}</div>}

                {savedSuccess && (
                  <div style={styles.successBox}>
                    <div style={styles.successText}>🎉 保存成功！</div>
                    <div style={styles.shareLink}>
                      {`${window.location.origin}/palette/${savedSuccess.id}`}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={handleCopyLink}>
                        📋 复制链接
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/palette/${savedSuccess.id}`)}
                      >
                        👁️ 查看详情
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ padding: '14px', fontSize: 15, minHeight: 48 }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      正在保存...
                    </span>
                  ) : (
                    '💾 保存并生成分享链接'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <PaletteGrid palettes={savedPalettes} />
      </div>

      <style>{`
        .saved-color:hover {
          transform: scale(1.05);
          z-index: 1;
        }
        .saved-color:hover .remove-btn {
          opacity: 1;
        }
        .saved-color:hover .color-info {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/palette/:id" element={<ShareView isOwner={true} />} />
      <Route path="/s/:id" element={<ShareView />} />
    </Routes>
  )
}
