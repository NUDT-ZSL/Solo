import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import ThemeGenerator from './components/ThemeGenerator';
import SketchCanvas from './components/SketchCanvas';
import { Theme, SketchData, ToastMessage } from './types';

const App: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [sketches, setSketches] = useState<SketchData[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSketch, setSelectedSketch] = useState<SketchData | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingTheme, setLoadingTheme] = useState(false);
  const [savingSketch, setSavingSketch] = useState(false);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchInitialTheme();
    fetchSketches();
  }, []);

  const fetchInitialTheme = async () => {
    try {
      const response = await axios.get<Theme>('/api/theme');
      setCurrentTheme(response.data);
    } catch (err) {
      console.error('获取初始主题失败:', err);
      showToast('加载主题失败，请刷新页面', 'error');
    }
  };

  const fetchSketches = async () => {
    try {
      const response = await axios.get<SketchData[]>('/api/sketches');
      setSketches(response.data);
    } catch (err) {
      console.error('获取草图列表失败:', err);
    }
  };

  const generateNewTheme = async () => {
    if (loadingTheme) return;
    setLoadingTheme(true);
    try {
      const response = await axios.get<Theme>('/api/theme');
      setTimeout(() => {
        setCurrentTheme(response.data);
        setLoadingTheme(false);
      }, 500);
    } catch (err) {
      setLoadingTheme(false);
      showToast('生成主题失败', 'error');
    }
  };

  const saveSketch = async (imageData: string) => {
    if (!currentTheme || savingSketch) return;
    setSavingSketch(true);
    try {
      const response = await axios.post('/api/sketch', {
        image_data: imageData,
        theme_id: currentTheme.id,
      });
      if (response.data.success) {
        showToast('草图已保存到画廊！', 'success');
        triggerConfetti();
        fetchSketches();
      } else {
        showToast('保存失败: ' + (response.data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showToast('保存失败，网络错误', 'error');
    } finally {
      setSavingSketch(false);
    }
  };

  const triggerConfetti = () => {
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ['#e94560', '#ff6b81', '#4cc9f0', '#ffd166', '#7fdbff', '#f72585'];
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const handleSelectSketch = (sketch: SketchData) => {
    setSelectedSketch(sketch);
  };

  const handleReloadTheme = () => {
    if (selectedSketch) {
      setCurrentTheme(selectedSketch.theme);
      setSelectedSketch(null);
      if (isMobile) {
        setGalleryOpen(false);
      }
    }
  };

  const closeSketchDetail = () => {
    setSelectedSketch(null);
  };

  const toggleGallery = () => {
    if (!galleryOpen) {
      fetchSketches();
    }
    setGalleryOpen(!galleryOpen);
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎨</span>
          <span style={styles.logoText}>灵感工坊</span>
        </div>
        <button style={styles.galleryButton} onClick={toggleGallery}>
          <span style={styles.galleryIcon}>🖼️</span>
          <span style={styles.galleryText}>画廊</span>
          {sketches.length > 0 && (
            <span style={styles.badge}>{sketches.length}</span>
          )}
        </button>
      </div>

      <div style={styles.mainLayout}>
        <div
          style={{
            ...styles.galleryPanel,
            ...(isMobile
              ? {
                  ...styles.galleryPanelMobile,
                  transform: galleryOpen
                    ? 'translateY(0)'
                    : 'translateY(calc(100% - 60px))',
                }
              : {
                  transform: galleryOpen ? 'translateX(0)' : 'translateX(-320px)',
                  display: 'block',
                }),
          }}
        >
          <div style={styles.galleryHeader} onClick={isMobile ? toggleGallery : undefined}>
            <span style={styles.galleryTitle}>我的画廊</span>
            {isMobile && (
              <span style={styles.galleryToggleIcon}>
                {galleryOpen ? '▼' : '▲'}
              </span>
            )}
          </div>
          <div style={styles.galleryContent}>
            {sketches.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>✨</div>
                <p style={styles.emptyText}>还没有作品，开始绘制吧！</p>
              </div>
            ) : (
              <div style={styles.sketchGrid}>
                {sketches.map((sketch, index) => (
                  <div
                    key={sketch.id}
                    style={{
                      ...styles.sketchThumbnail,
                      animation: `fadeIn 0.4s ease ${index * 0.05}s both`,
                    }}
                    onClick={() => handleSelectSketch(sketch)}
                  >
                    <img
                      src={sketch.image_data}
                      alt={sketch.theme.name}
                      style={styles.thumbnailImage}
                      draggable={false}
                    />
                    <div style={styles.thumbnailOverlay}>
                      <span style={styles.thumbnailTheme}>{sketch.theme.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!isMobile && galleryOpen && (
          <div
            style={styles.gallerySpacer}
            aria-hidden="true"
          />
        )}

        <div style={styles.contentArea}>
          {selectedSketch ? (
            <div style={styles.detailContainer}>
              <button style={styles.backButton} onClick={closeSketchDetail}>
                ← 返回
              </button>
              <div style={styles.detailContent}>
                <img
                  src={selectedSketch.image_data}
                  alt={selectedSketch.theme.name}
                  style={styles.detailImage}
                />
                <div style={styles.detailThemeCard}>
                  <h3 style={styles.detailThemeName}>
                    {selectedSketch.theme.name}
                  </h3>
                  <div style={styles.detailKeywords}>
                    {selectedSketch.theme.keywords.map((kw, i) => (
                      <span key={i} style={styles.keywordTag}>
                        #{kw}
                      </span>
                    ))}
                  </div>
                  <p style={styles.detailAtmosphere}>
                    {selectedSketch.theme.atmosphere}
                  </p>
                  <div style={styles.detailPalette}>
                    {selectedSketch.theme.palette.map((color, i) => (
                      <div
                        key={i}
                        style={{ ...styles.paletteSwatch, backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    style={styles.reloadButton}
                    onClick={handleReloadTheme}
                  >
                    🔄 重新加载主题，继续绘制
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <ThemeGenerator
                theme={currentTheme}
                onGenerate={generateNewTheme}
                isLoading={loadingTheme}
              />
              <SketchCanvas
                onSave={saveSketch}
                isSaving={savingSketch}
                disabled={!currentTheme}
                isMobile={isMobile}
              />
            </>
          )}
        </div>
      </div>

      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              ...(toast.type === 'success'
                ? styles.toastSuccess
                : toast.type === 'error'
                ? styles.toastError
                : styles.toastInfo),
              animation: 'toastIn 0.3s ease both',
            }}
          >
            <span style={styles.toastIcon}>
              {toast.type === 'success'
                ? '✓'
                : toast.type === 'error'
                ? '✗'
                : 'ℹ'}
            </span>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'rgba(26, 26, 46, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #e94560, #ff6b81)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  galleryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'rgba(233, 69, 96, 0.15)',
    border: '1px solid rgba(233, 69, 96, 0.4)',
    borderRadius: '10px',
    color: '#ff6b81',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
  },
  galleryIcon: {
    fontSize: '16px',
  },
  galleryText: {
    letterSpacing: '0.5px',
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#e94560',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainLayout: {
    flex: 1,
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  galleryPanel: {
    width: '320px',
    height: '100%',
    background: 'rgba(15, 15, 35, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 50,
  },
  galleryPanelMobile: {
    width: '100%',
    height: '65%',
    bottom: 0,
    top: 'auto',
    right: 0,
    borderRight: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  gallerySpacer: {
    width: '320px',
    flexShrink: 0,
  },
  galleryHeader: {
    padding: '18px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  galleryTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f0f0f0',
  },
  galleryToggleIcon: {
    fontSize: '12px',
    color: '#a0a0b0',
  },
  galleryContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '56px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    color: '#a0a0b0',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  sketchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  sketchThumbnail: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '10px 12px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    display: 'flex',
    alignItems: 'flex-end',
    transition: 'opacity 0.2s ease',
  },
  thumbnailTheme: {
    fontSize: '12px',
    color: '#fff',
    fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    overflow: 'auto',
    gap: '24px',
    alignItems: 'center',
  },
  detailContainer: {
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    animation: 'fadeIn 0.4s ease both',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    color: '#a0a0b0',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  },
  detailContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    animation: 'fadeIn 0.4s ease 0.1s both',
  },
  detailImage: {
    width: '100%',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1a1a2e',
  },
  detailThemeCard: {
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailThemeName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f0f0f0',
  },
  detailKeywords: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  keywordTag: {
    padding: '4px 12px',
    background: 'rgba(233, 69, 96, 0.15)',
    color: '#ff6b81',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: 500,
  },
  detailAtmosphere: {
    color: '#c0c0d0',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  detailPalette: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  paletteSwatch: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    border: '2px solid rgba(255, 255, 255, 0.15)',
    transition: 'transform 0.2s ease',
  },
  reloadButton: {
    marginTop: 'auto',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #e94560, #ff6b81)',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    animation: 'pulse 2s ease infinite',
  },
  toastContainer: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    pointerEvents: 'auto',
  },
  toastIcon: {
    fontWeight: 700,
    fontSize: '16px',
  },
  toastSuccess: {
    background: 'rgba(46, 213, 115, 0.9)',
    color: '#fff',
    border: '1px solid rgba(46, 213, 115, 0.5)',
  },
  toastError: {
    background: 'rgba(255, 71, 87, 0.9)',
    color: '#fff',
    border: '1px solid rgba(255, 71, 87, 0.5)',
  },
  toastInfo: {
    background: 'rgba(52, 152, 219, 0.9)',
    color: '#fff',
    border: '1px solid rgba(52, 152, 219, 0.5)',
  },
};

export default App;
