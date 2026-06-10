import React, { useState, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { WeatherCanvas, type WeatherCanvasHandle } from './components/WeatherCanvas'
import { ControlPanel } from './components/ControlPanel'
import type { WeatherParams, PresetConfig, WeatherArtwork } from './types'
import { PRESETS } from './types'

const defaultParams: WeatherParams = {
  temperature: 22,
  humidity: 55,
  windSpeed: 5,
  lightLevel: 70,
}

const Navbar: React.FC = () => (
  <nav style={styles.navbar}>
    <Link to="/" style={styles.logo}>
      <span style={styles.logoIcon}>🌤️</span>
      <span style={styles.logoText}>气象织梦</span>
    </Link>
    <div style={styles.navLinks}>
      <Link to="/" style={styles.navLink}>创作</Link>
      <Link to="/gallery" style={styles.navLink}>画廊</Link>
    </div>
  </nav>
)

const ShareModal: React.FC<{ shareUrl: string; onClose: () => void }> = ({ shareUrl, onClose }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>🎉 创作已保存</h3>
        <p style={styles.modalText}>复制下方链接分享您的天气艺术作品</p>
        <div style={styles.shareUrlContainer}>
          <input type="text" readOnly value={shareUrl} style={styles.shareUrlInput} />
          <button onClick={handleCopy} style={styles.copyButton}>
            {copied ? '✓ 已复制' : '复制'}
          </button>
        </div>
        <Link to="/gallery" style={styles.galleryLink}>
          前往公共画廊 →
        </Link>
        <button onClick={onClose} style={styles.closeButton}>关闭</button>
      </div>
    </div>
  )
}

const HomePage: React.FC = () => {
  const canvasRef = useRef<WeatherCanvasHandle>(null)
  const [params, setParams] = useState<WeatherParams>(defaultParams)
  const [isSaving, setIsSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const handleParamsChange = useCallback((partial: Partial<WeatherParams>): void => {
    setParams((prev) => ({ ...prev, ...partial, preset: undefined }))
  }, [])

  const handlePresetSelect = useCallback((preset: PresetConfig): void => {
    setParams({ ...preset.params, preset: preset.name })
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!canvasRef.current || isSaving) return
    setIsSaving(true)
    try {
      const thumbnail = canvasRef.current.captureScreenshot()
      const response = await fetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params, thumbnail }),
      })
      if (response.ok) {
        const data = await response.json()
        setShareUrl(data.shareUrl || `${window.location.origin}/detail/${data.id}`)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [params, isSaving])

  return (
    <div style={styles.homePage}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.canvasWrapper}>
          <WeatherCanvas ref={canvasRef} params={params} />
        </div>
      </main>
      <ControlPanel
        params={params}
        onChange={handleParamsChange}
        onPresetSelect={handlePresetSelect}
        onSave={handleSave}
        isSaving={isSaving}
      />
      {shareUrl && (
        <ShareModal shareUrl={shareUrl} onClose={() => setShareUrl(null)} />
      )}
    </div>
  )
}

interface GalleryItemProps {
  artwork: WeatherArtwork
  onClick: () => void
}

const GalleryItem: React.FC<GalleryItemProps> = ({ artwork, onClick }) => {
  const [loaded, setLoaded] = useState(false)
  const [visible, setVisible] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={imgRef}
      onClick={onClick}
      style={{
        ...styles.galleryItem,
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div style={styles.galleryImageContainer}>
        {visible && (
          <img
            src={artwork.thumbnail}
            alt="Weather artwork"
            onLoad={() => setLoaded(true)}
            style={styles.galleryImage}
            loading="lazy"
          />
        )}
        {!loaded && (
          <div style={styles.gallerySkeleton} />
        )}
      </div>
      <div style={styles.galleryItemInfo}>
        <div style={styles.paramRow}>
          <span>🌡️ {artwork.params.temperature}°C</span>
          <span>💧 {artwork.params.humidity}%</span>
        </div>
        <div style={styles.paramRow}>
          <span>💨 {artwork.params.windSpeed}级</span>
          <span>☀️ {artwork.params.lightLevel}%</span>
        </div>
      </div>
    </div>
  )
}

const GalleryPage: React.FC = () => {
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState<WeatherArtwork[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetchArtworks = async (): Promise<void> => {
      try {
        const response = await fetch('/api/artworks')
        if (response.ok) {
          const data = await response.json()
          setArtworks(data.artworks || [])
        }
      } catch (error) {
        console.error('Failed to load gallery:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchArtworks()
  }, [])

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.galleryMain}>
        <h1 style={styles.pageTitle}>公共画廊</h1>
        <p style={styles.pageSubtitle}>探索社区创作者构建的奇幻天气世界</p>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>加载中...</p>
          </div>
        ) : artworks.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>画廊空空如也，快去创作第一个作品吧！</p>
            <Link to="/" style={styles.emptyButton}>开始创作 →</Link>
          </div>
        ) : (
          <div style={styles.galleryGrid}>
            {artworks.map((artwork) => (
              <GalleryItem
                key={artwork.id}
                artwork={artwork}
                onClick={() => navigate(`/detail/${artwork.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const canvasRef = useRef<WeatherCanvasHandle>(null)
  const [artwork, setArtwork] = useState<WeatherArtwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  React.useEffect(() => {
    if (!id) return
    const fetchArtwork = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/artworks/${id}`)
        if (response.ok) {
          const data = await response.json()
          setArtwork(data)
        } else if (response.status === 404) {
          setError('作品未找到')
        } else {
          setError('加载失败')
        }
      } catch {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }
    fetchArtwork()
  }, [id])

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>加载作品中...</p>
        </div>
      </div>
    )
  }

  if (error || !artwork) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>{error || '作品不存在'}</p>
          <Link to="/gallery" style={styles.emptyButton}>返回画廊 →</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.detailMain}>
        <button onClick={() => navigate('/gallery')} style={styles.backButton}>
          ← 返回画廊
        </button>

        <div style={styles.detailCanvasWrapper}>
          <WeatherCanvas ref={canvasRef} params={artwork.params} />
        </div>

        <div style={styles.detailPanel}>
          <h2 style={styles.detailTitle}>作品详情</h2>

          <div style={styles.detailGrid}>
            <div style={styles.paramCard}>
              <div style={styles.paramCardIcon}>🌡️</div>
              <div style={styles.paramCardLabel}>温度</div>
              <div style={styles.paramCardValue}>{artwork.params.temperature}°C</div>
            </div>
            <div style={styles.paramCard}>
              <div style={styles.paramCardIcon}>💧</div>
              <div style={styles.paramCardLabel}>湿度</div>
              <div style={styles.paramCardValue}>{artwork.params.humidity}%</div>
            </div>
            <div style={styles.paramCard}>
              <div style={styles.paramCardIcon}>💨</div>
              <div style={styles.paramCardLabel}>风速</div>
              <div style={styles.paramCardValue}>{artwork.params.windSpeed}级</div>
            </div>
            <div style={styles.paramCard}>
              <div style={styles.paramCardIcon}>☀️</div>
              <div style={styles.paramCardLabel}>光照</div>
              <div style={styles.paramCardValue}>{artwork.params.lightLevel}%</div>
            </div>
          </div>

          {artwork.params.preset && (
            <div style={styles.presetTag}>
              预设模式：{PRESETS.find((p) => p.name === artwork.params.preset)?.label || artwork.params.preset}
            </div>
          )}

          <div style={styles.detailActions}>
            <div style={styles.shareRow}>
              <input
                type="text"
                readOnly
                value={window.location.href}
                style={styles.shareUrlInput}
              />
              <button onClick={handleCopy} style={styles.copyButton}>
                {copied ? '✓ 已复制' : '复制链接'}
              </button>
            </div>
            <Link to="/" style={styles.createButton}>
              ✨ 开始自己的创作
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Router>
      <div style={styles.app}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
        </Routes>
      </div>
    </Router>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#121212',
    color: '#E0E0E0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    background: 'rgba(18, 18, 18, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: '#E0E0E0',
  },
  logoIcon: {
    fontSize: '26px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    padding: '8px 18px',
    borderRadius: '8px',
    color: '#B0B0B0',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  homePage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    paddingTop: '56px',
    paddingBottom: '45vh',
  },
  canvasWrapper: {
    width: '100%',
    height: '60vh',
    minHeight: '400px',
  },
  page: {
    minHeight: '100vh',
  },
  galleryMain: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '80px 24px 48px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
    textAlign: 'center',
    background: 'linear-gradient(135deg, #64B5F6 0%, #F39C12 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  pageSubtitle: {
    fontSize: '15px',
    color: '#888',
    textAlign: 'center',
    marginTop: '8px',
    marginBottom: '40px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 24px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(100, 181, 246, 0.2)',
    borderTopColor: '#64B5F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#888',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 24px',
    gap: '20px',
  },
  emptyText: {
    color: '#888',
    fontSize: '16px',
  },
  emptyButton: {
    padding: '12px 28px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #3A7BD5 0%, #64B5F6 100%)',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
  },
  galleryGrid: {
    columnCount: 5,
    columnGap: '16px',
  },
  galleryItem: {
    display: 'inline-block',
    width: '100%',
    marginBottom: '16px',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#1E1E1E',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  galleryImageContainer: {
    width: '100%',
    aspectRatio: '4 / 3',
    overflow: 'hidden',
    background: '#181818',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  gallerySkeleton: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #1E1E1E 25%, #252525 50%, #1E1E1E 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  galleryItemInfo: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  paramRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#9E9E9E',
  },
  detailMain: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '80px 24px 48px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#64B5F6',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '20px',
  },
  detailCanvasWrapper: {
    width: '100%',
    height: '55vh',
    minHeight: '350px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  detailPanel: {
    marginTop: '28px',
    padding: '28px',
    borderRadius: '16px',
    background: '#1E1E1E',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  detailTitle: {
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 20px 0',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  paramCard: {
    padding: '18px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    textAlign: 'center',
  },
  paramCardIcon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  paramCardLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
  },
  paramCardValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#64B5F6',
  },
  presetTag: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(243, 156, 18, 0.15)',
    color: '#F39C12',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '24px',
  },
  detailActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  shareRow: {
    display: 'flex',
    gap: '10px',
  },
  shareUrlInput: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#E0E0E0',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  copyButton: {
    padding: '12px 20px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(100, 181, 246, 0.15)',
    color: '#64B5F6',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  createButton: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3A7BD5 0%, #64B5F6 100%)',
    color: '#fff',
    textDecoration: 'none',
    textAlign: 'center',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '440px',
    padding: '32px',
    borderRadius: '20px',
    background: '#1E1E1E',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 8px 0',
  },
  modalText: {
    color: '#9E9E9E',
    fontSize: '14px',
    margin: '0 0 24px 0',
  },
  shareUrlContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
  },
  galleryLink: {
    display: 'block',
    color: '#64B5F6',
    fontSize: '14px',
    textDecoration: 'none',
    marginBottom: '16px',
    padding: '10px',
    borderRadius: '8px',
    transition: 'background 0.2s ease',
  },
  closeButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'transparent',
    color: '#E0E0E0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

const injectGlobalStyles = (): void => {
  if (typeof document === 'undefined') return
  const styleId = 'weather-dreamweaver-global-styles'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    * { box-sizing: border-box; }
    html, body, #root { margin: 0; padding: 0; min-height: 100vh; background: #121212; }
    body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #121212; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #444; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @media (hover: hover) {
      a[style*="navLink"]:hover { background: rgba(255,255,255,0.06); color: #64B5F6; }
      button[style*="presetButton"]:hover { transform: scale(1.05); background: rgba(100,181,246,0.1); }
      button[style*="saveButton"]:hover:not([disabled]) { transform: scale(1.05); }
      button[style*="copyButton"]:hover { background: rgba(100,181,246,0.25); }
      button[style*="createButton"]:hover { transform: scale(1.02); }
      button[style*="closeButton"]:hover { background: rgba(255,255,255,0.05); }
      a[style*="emptyButton"]:hover { transform: scale(1.05); }
      a[style*="galleryLink"]:hover { background: rgba(100,181,246,0.08); }
      div[style*="galleryItem"]:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); border-color: rgba(100,181,246,0.3); }
    }
    @media (max-width: 1200px) {
      div[style*="galleryGrid"] { column-count: 4; }
    }
    @media (max-width: 900px) {
      div[style*="galleryGrid"] { column-count: 3; }
    }
    @media (max-width: 767px) {
      div[style*="galleryGrid"] { column-count: 2; }
      div[style*="galleryMain"] { padding: 72px 16px 32px; }
      div[style*="detailMain"] { padding: 72px 16px 32px; }
      div[style*="detailPanel"] { padding: 20px; }
      h1[style*="pageTitle"] { font-size: 26px; }
      div[style*="shareRow"] { flex-direction: column; }
      div[style*="shareUrlContainer"] { flex-direction: column; }
    }
    @media (max-width: 480px) {
      div[style*="galleryGrid"] { column-count: 1; }
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid #64B5F6;
    }
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid #64B5F6;
    }
  `
  document.head.appendChild(style)
}

injectGlobalStyles()

export default App
