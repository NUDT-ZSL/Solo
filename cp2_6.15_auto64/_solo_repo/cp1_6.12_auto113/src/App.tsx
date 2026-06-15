import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Timeline } from './components/Timeline';
import { PreviewPanel } from './components/PreviewPanel';
import {
  AnimationData,
  KeyframeNode,
  PropertyChange,
  createDefaultAnimation,
  addKeyframeToData,
  removeKeyframeById,
  duplicateKeyframe,
  updateKeyframeById,
  updatePropertyInKeyframe,
  addPropertyToKeyframe,
  removePropertyFromKeyframe,
  keyframesToCSS,
} from './utils/animationEngine';
import { v4 as uuidv4 } from 'uuid';
import hljs from 'highlight.js/lib/core';
import cssLang from 'highlight.js/lib/languages/css';

hljs.registerLanguage('css', cssLang);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ExportState {
  open: boolean;
  css: string;
}

const App: React.FC = () => {
  const [animations, setAnimations] = useState<AnimationData[]>(() => [
    createDefaultAnimation('Bounce In'),
    createDefaultAnimation('Fade Slide'),
  ]);
  const [activeAnimId, setActiveAnimId] = useState<string>(() => animations[0]?.id ?? '');
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTimePercent, setCurrentTimePercent] = useState(0);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
  const [exportState, setExportState] = useState<ExportState>({ open: false, css: '' });
  const [copyFlash, setCopyFlash] = useState(false);

  const exportModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeAnim = animations.find((a) => a.id === activeAnimId) ?? animations[0] ?? null;
  const isCompact = viewportWidth < 1280;

  const animNameIdentifier = useMemo(() => {
    if (!activeAnim) return 'kf_animation';
    const base = activeAnim.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `kf_${base || 'animation'}_${activeAnim.id.slice(0, 6)}`;
  }, [activeAnim]);

  const updateActiveAnim = (updater: (a: AnimationData) => AnimationData) => {
    setAnimations((prev) =>
      prev.map((a) => (a.id === activeAnimId ? updater(a) : a))
    );
  };

  const handleAddKeyframe = (timePercent: number) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => addKeyframeToData(a, timePercent));
  };

  const handleDeleteKeyframe = (id: string) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => removeKeyframeById(a, id));
    setSelectedKeyframeId((curr) => (curr === id ? null : curr));
  };

  const handleDuplicateKeyframe = (id: string) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => duplicateKeyframe(a, id));
  };

  const handleUpdateKeyframe = (id: string, updates: Partial<Omit<KeyframeNode, 'id'>>) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => updateKeyframeById(a, id, updates));
  };

  const handleUpdateProperty = (
    keyframeId: string,
    propertyId: string,
    updates: Partial<PropertyChange>
  ) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => updatePropertyInKeyframe(a, keyframeId, propertyId, updates));
  };

  const handleAddProperty = (keyframeId: string, property: PropertyChange['property']) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => addPropertyToKeyframe(a, keyframeId, property));
  };

  const handleRemoveProperty = (keyframeId: string, propertyId: string) => {
    if (!activeAnim) return;
    updateActiveAnim((a) => removePropertyFromKeyframe(a, keyframeId, propertyId));
  };

  const handleNewAnimation = () => {
    const anim = createDefaultAnimation('New Animation');
    setAnimations((prev) => [...prev, anim]);
    setActiveAnimId(anim.id);
    setSelectedKeyframeId(null);
    setCurrentTimePercent(0);
    setIsPlaying(false);
  };

  const handleDeleteAnimation = (id: string) => {
    setAnimations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (id === activeAnimId) {
        if (next.length > 0) {
          setActiveAnimId(next[0].id);
        } else {
          const fresh = createDefaultAnimation('New Animation');
          setActiveAnimId(fresh.id);
          return [fresh];
        }
      }
      return next;
    });
    setSelectedKeyframeId(null);
  };

  const handleRenameAnimation = (id: string, name: string) => {
    setAnimations((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
  };

  const handleUpdateDuration = (id: string, durationMs: number) => {
    setAnimations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, durationMs: Math.max(100, durationMs) } : a))
    );
  };

  const handleExport = async () => {
    if (!activeAnim) return;
    const css = keyframesToCSS(activeAnim.keyframes, animNameIdentifier);
    setExportState({ open: true, css });
    try {
      await navigator.clipboard.writeText(css);
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 1500);
    } catch {
      // Clipboard not available, just show modal
    }
  };

  const handleCopyModal = async () => {
    try {
      await navigator.clipboard.writeText(exportState.css);
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 1500);
    } catch {
      // ignore
    }
  };

  const closeExportModal = () => setExportState({ open: false, css: '' });

  useEffect(() => {
    if (!exportState.open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = exportModalRef.current;
      if (el && !el.contains(e.target as Node)) {
        closeExportModal();
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExportModal();
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    document.addEventListener('keydown', onEsc, true);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true);
      document.removeEventListener('keydown', onEsc, true);
    };
  }, [exportState.open]);

  const highlightedCSS = useMemo(() => {
    if (!exportState.css) return '';
    try {
      const escaped = escapeHtml(exportState.css);
      const res = hljs.highlight(exportState.css, { language: 'css', ignoreIllegals: true });
      return `<code class="hljs language-css">${res.value || escaped}</code>`;
    } catch (err) {
      return `<code class="hljs language-css">${escapeHtml(exportState.css)}</code>`;
    }
  }, [exportState.css]);

  const codePanelRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!exportState.open || !codePanelRef.current) return;
    const codeEl = codePanelRef.current.querySelector('code');
    if (codeEl && typeof (hljs as any).highlightElement === 'function') {
      try {
        (hljs as any).highlightElement(codeEl);
      } catch {
        /* noop */
      }
    }
  }, [exportState.open, exportState.css]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        minWidth: 1024,
        background: '#1A1A2E',
        color: '#E0E0E0',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        display: 'flex',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {(leftDrawerOpen || !isCompact) && (
        <aside
          style={{
            width: isCompact ? 280 : 280,
            flexShrink: 0,
            background: '#16213E',
            borderRight: '1px solid #2C2C54',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: isCompact ? 'absolute' : 'relative',
            left: 0,
            top: 0,
            zIndex: 30,
            boxShadow: isCompact ? '8px 0 32px rgba(0, 0, 0, 0.5)' : 'none',
          }}
        >
          <div
            style={{
              padding: 18,
              borderBottom: '1px solid #2C2C54',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                KF
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                  KeyframeFlow
                </div>
                <div style={{ color: '#8A8FBD', fontSize: 11 }}>CSS Animation Studio</div>
              </div>
            </div>
            {isCompact && (
              <button
                onClick={() => setLeftDrawerOpen(false)}
                style={iconButtonStyle}
                aria-label="Close panel"
              >
                ×
              </button>
            )}
          </div>

          <div style={{ padding: '12px 14px' }}>
            <button
              onClick={handleNewAnimation}
              style={{
                ...primaryBtn,
                width: '100%',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              + New Animation
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 10px 14px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, color: '#8A8FBD', fontWeight: 600, padding: '6px 6px', letterSpacing: 0.5 }}>
              ANIMATIONS ({animations.length})
            </div>
            {animations.map((a) => {
              const isActive = a.id === activeAnimId;
              return (
                <div
                  key={a.id}
                  onClick={() => {
                    setActiveAnimId(a.id);
                    setSelectedKeyframeId(null);
                    setCurrentTimePercent(0);
                    setIsPlaying(false);
                    if (isCompact) setLeftDrawerOpen(false);
                  }}
                  style={{
                    background: isActive ? '#2C2C54' : 'transparent',
                    border: isActive ? '1px solid #6C63FF' : '1px solid transparent',
                    borderRadius: 8,
                    padding: 10,
                    cursor: 'pointer',
                    transition: 'background 0.12s ease, border-color 0.12s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      value={a.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleRenameAnimation(a.id, e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: isActive ? '#fff' : '#E0E0E0',
                        fontSize: 13,
                        fontWeight: 600,
                        width: '100%',
                        fontFamily: 'inherit',
                        padding: 2,
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnimation(a.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget.style.transform = 'scale(0.9)');
                      }}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      style={{
                        ...iconButtonStyle,
                        color: '#FF6584',
                      }}
                      title="Delete animation"
                    >
                      🗑
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      color: '#8A8FBD',
                    }}
                  >
                    <span>🔑 {a.keyframes.length} frames</span>
                    <span>·</span>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        value={a.durationMs}
                        min={100}
                        step={100}
                        onChange={(e) =>
                          handleUpdateDuration(a.id, parseInt(e.target.value) || 1000)
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: 60,
                          background: '#0F1626',
                          color: '#E0E0E0',
                          border: '1px solid #2C2C54',
                          borderRadius: 4,
                          padding: '2px 5px',
                          fontSize: 11,
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      ms
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {isCompact && leftDrawerOpen && (
        <div
          onClick={() => setLeftDrawerOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 25,
          }}
        />
      )}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
        }}
      >
        <header
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #2C2C54',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isCompact && (
              <button
                onClick={() => setLeftDrawerOpen(true)}
                style={iconButtonStyle}
                title="Open animation panel"
              >
                ☰
              </button>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {activeAnim?.name ?? 'Untitled'}
              </div>
              <div style={{ color: '#8A8FBD', fontSize: 12 }}>
                @keyframes {animNameIdentifier}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              style={secondaryBtn}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isPlaying ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button
              onClick={handleExport}
              style={primaryBtn}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {copyFlash ? '✓ Copied!' : '⤓ Export CSS'}
            </button>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          {activeAnim && (
            <>
              <PreviewPanel
                keyframes={activeAnim.keyframes}
                durationMs={activeAnim.durationMs}
                isPlaying={isPlaying}
                speed={speed}
                currentTimePercent={currentTimePercent}
                animationName={animNameIdentifier}
                onPlayPause={() => setIsPlaying((p) => !p)}
                onSpeedChange={setSpeed}
                onTimeChange={setCurrentTimePercent}
                onRestart={() => {
                  setCurrentTimePercent(0);
                  if (!isPlaying) {
                    setIsPlaying(true);
                  }
                }}
              />
              <Timeline
                keyframes={activeAnim.keyframes}
                selectedKeyframeId={selectedKeyframeId}
                currentTimePercent={currentTimePercent}
                onAddKeyframe={handleAddKeyframe}
                onSelectKeyframe={setSelectedKeyframeId}
                onUpdateKeyframe={handleUpdateKeyframe}
                onDeleteKeyframe={handleDeleteKeyframe}
                onDuplicateKeyframe={handleDuplicateKeyframe}
                onUpdateProperty={handleUpdateProperty}
                onAddProperty={handleAddProperty}
                onRemoveProperty={handleRemoveProperty}
              />
            </>
          )}
        </div>
      </main>

      {exportState.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            ref={exportModalRef}
            style={{
              background: '#16213E',
              borderRadius: 14,
              border: '1px solid #2C2C54',
              width: 'min(860px, 100%)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #2C2C54',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                  Exported CSS
                </h3>
                <div
                  style={{
                    color: '#8A8FBD',
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {copyFlash ? (
                    <span style={{ color: '#58e0a1', fontWeight: 600 }}>
                      ✓ Copied to clipboard!
                    </span>
                  ) : (
                    'Auto-copied to clipboard'
                  )}
                </div>
              </div>
              <button
                onClick={handleCopyModal}
                style={{
                  ...secondaryBtn,
                  marginRight: 8,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                📋 Copy again
              </button>
              <button
                onClick={closeExportModal}
                style={iconButtonStyle}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>
            <div style={{ padding: 16, overflow: 'auto' }}>
              <pre
                ref={codePanelRef}
                className="hljs"
                dangerouslySetInnerHTML={{ __html: highlightedCSS }}
                style={{
                  margin: 0,
                  width: '100%',
                  height: 200,
                  background: '#1E1E1E !important' as any,
                  color: '#E0E0E0',
                  fontFamily: '"Consolas", "Fira Code", "Courier New", monospace',
                  fontSize: 14,
                  lineHeight: 1.5,
                  borderRadius: 8,
                  padding: 14,
                  overflow: 'auto',
                  border: '1px solid #2C2C54',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #2C2C54',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={closeExportModal}
                style={secondaryBtn}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const primaryBtn: React.CSSProperties = {
  background: '#6C63FF',
  color: '#fff',
  border: 'none',
  padding: '9px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  transition: 'transform 0.1s ease, background 0.15s ease, box-shadow 0.15s ease',
  transform: 'scale(1)',
  fontFamily: 'inherit',
  boxShadow: '0 2px 8px rgba(108, 99, 255, 0.35)',
};

const secondaryBtn: React.CSSProperties = {
  background: '#2C2C54',
  color: '#E0E0E0',
  border: '1px solid #3A3A66',
  padding: '9px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  transition: 'transform 0.1s ease, background 0.15s ease',
  transform: 'scale(1)',
  fontFamily: 'inherit',
};

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#E0E0E0',
  width: 34,
  height: 34,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s ease, transform 0.1s ease',
  padding: 0,
};

export default App;
