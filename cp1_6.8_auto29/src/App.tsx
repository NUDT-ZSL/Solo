import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InkRenderer } from './InkRenderer';
import { InteractionManager, InteractionState } from './InteractionManager';
import { generatePoem, PoemStyle, PoemFormat, GeneratedPoem } from './PoemEngine';

const STYLE_OPTIONS: { key: PoemStyle; label: string; desc: string }[] = [
  { key: '豪放', label: '豪放', desc: '大漠孤烟 烈酒长剑' },
  { key: '婉约', label: '婉约', desc: '细雨残月 柳絮落花' },
  { key: '禅意', label: '禅意', desc: '古寺落叶 流水空山' },
];

const FORMAT_OPTIONS: { key: PoemFormat; label: string }[] = [
  { key: '五言', label: '五言' },
  { key: '七言', label: '七言' },
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<InkRenderer | null>(null);
  const interactionRef = useRef<InteractionManager | null>(null);

  const [currentStyle, setCurrentStyle] = useState<PoemStyle>('豪放');
  const [currentFormat, setCurrentFormat] = useState<PoemFormat>('五言');
  const [currentPoem, setCurrentPoem] = useState<GeneratedPoem | null>(null);
  const [interactionState, setInteractionState] = useState<InteractionState>({
    selectedChar: null,
    replacementOptions: [],
    isPanelVisible: false,
    isDragging: false,
    dragSource: null,
    dragTarget: null,
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  const [panelAnimClass, setPanelAnimClass] = useState('');

  const generateNewPoem = useCallback(
    (style: PoemStyle, format: PoemFormat) => {
      const poem = generatePoem(style, format);
      setCurrentPoem(poem);
      return poem;
    },
    []
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new InkRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const interaction = new InteractionManager(renderer, canvasRef.current);
    interactionRef.current = interaction;
    interaction.setStyle(currentStyle);

    interaction.onStateChange((state) => {
      setInteractionState(state);
      if (state.isPanelVisible) {
        setTimeout(() => setPanelAnimClass('panel-enter'), 10);
      } else {
        setPanelAnimClass('');
      }
    });

    const poem = generateNewPoem(currentStyle, currentFormat);
    const lines = poem.lines.map((l) => l.chars);
    renderer.spawnPoem(lines);

    const handleResize = () => {
      renderer.resize();
      if (currentPoem) {
        const posLines = currentPoem.lines.map((l) => l.chars);
        renderer.calculateCharPositions(posLines);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
      interaction.destroy();
    };
  }, []);

  const handleStyleChange = useCallback(
    (style: PoemStyle) => {
      setCurrentStyle(style);
      interactionRef.current?.setStyle(style);

      if (rendererRef.current && currentPoem) {
        setIsRegenerating(true);
        rendererRef.current.dissolveAll(() => {
          const poem = generateNewPoem(style, currentFormat);
          const lines = poem.lines.map((l) => l.chars);
          rendererRef.current?.spawnPoem(lines, () => {
            setIsRegenerating(false);
          });
        });
      }
    },
    [currentPoem, currentFormat, generateNewPoem]
  );

  const handleFormatChange = useCallback(
    (format: PoemFormat) => {
      setCurrentFormat(format);
      if (rendererRef.current && currentPoem) {
        setIsRegenerating(true);
        rendererRef.current.dissolveAll(() => {
          const poem = generateNewPoem(currentStyle, format);
          const lines = poem.lines.map((l) => l.chars);
          rendererRef.current?.spawnPoem(lines, () => {
            setIsRegenerating(false);
          });
        });
      }
    },
    [currentPoem, currentStyle, generateNewPoem]
  );

  const handleRegenerate = useCallback(() => {
    if (isRegenerating || !rendererRef.current) return;
    setIsRegenerating(true);
    rendererRef.current.dissolveAll(() => {
      const poem = generateNewPoem(currentStyle, currentFormat);
      const lines = poem.lines.map((l) => l.chars);
      rendererRef.current?.spawnPoem(lines, () => {
        setIsRegenerating(false);
      });
    });
  }, [isRegenerating, currentStyle, currentFormat, generateNewPoem]);

  const handleReplace = useCallback(
    (newChar: string) => {
      interactionRef.current?.replaceWith(newChar);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    interactionRef.current?.closePanel();
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const panelPos = interactionRef.current?.getPanelPosition() || { x: 0, y: 0 };

  return (
    <div style={styles.container}>
      <style>{globalCSS}</style>

      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onClick={(e) => {
          const pos = rendererRef.current?.getCharAtPosition(e.clientX, e.clientY);
          if (!pos) {
            handleClosePanel();
          }
        }}
      />

      <div style={styles.titleArea}>
        <h1 style={styles.title}>墨韵灵签</h1>
        <div style={styles.subtitle}>点击诗句中的字词可替换</div>
      </div>

      {interactionState.isPanelVisible && interactionState.selectedChar && (
        <div
          style={{
            ...styles.replacementPanel,
            ...(isMobile
              ? {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  top: 'auto',
                  transform: panelAnimClass ? 'translateY(0)' : 'translateY(100%)',
                  borderRadius: '16px 16px 0 0',
                  maxHeight: '40vh',
                }
              : {
                  left: panelPos.x,
                  top: panelPos.y,
                  transform: panelAnimClass ? 'scale(1)' : 'scale(0.9)',
                  opacity: panelAnimClass ? 1 : 0,
                }),
          }}
          className={`replacement-panel ${panelAnimClass}`}
        >
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>
              替换「{interactionState.selectedChar.char}」
            </span>
            <button style={styles.panelCloseBtn} onClick={handleClosePanel}>
              ✕
            </button>
          </div>
          <div style={styles.panelOptions}>
            {interactionState.replacementOptions.map((opt, idx) => (
              <button
                key={`${opt.char}-${idx}`}
                style={{
                  ...styles.optionBtn,
                  animationDelay: `${idx * 50}ms`,
                }}
                className="option-btn"
                onClick={() => handleReplace(opt.char)}
              >
                <span style={styles.optionChar}>{opt.char}</span>
                {opt.isWord && <span style={styles.optionTag}>词</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.controls}>
        <div style={styles.styleSelector}>
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              style={{
                ...styles.styleBtn,
                ...(currentStyle === opt.key ? styles.styleBtnActive : {}),
                ...(hoveredStyle === opt.key ? styles.styleBtnHover : {}),
              }}
              className={`style-btn ${currentStyle === opt.key ? 'active' : ''}`}
              onClick={() => handleStyleChange(opt.key)}
              onMouseEnter={() => setHoveredStyle(opt.key)}
              onMouseLeave={() => setHoveredStyle(null)}
            >
              <span style={styles.styleBtnLabel}>{opt.label}</span>
              <span style={styles.styleBtnDesc}>{opt.desc}</span>
            </button>
          ))}
        </div>

        <div style={styles.formatSelector}>
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              style={{
                ...styles.formatBtn,
                ...(currentFormat === opt.key ? styles.formatBtnActive : {}),
              }}
              className={`format-btn ${currentFormat === opt.key ? 'active' : ''}`}
              onClick={() => handleFormatChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          style={{
            ...styles.regenerateBtn,
            ...(isRegenerating ? styles.regenerateBtnDisabled : {}),
          }}
          className="regenerate-btn"
          onClick={handleRegenerate}
          disabled={isRegenerating}
        >
          <span style={styles.regenerateIcon}>{isRegenerating ? '●' : '⟳'}</span>
          重新生成
        </button>
      </div>

      {currentPoem && (
        <div style={styles.tonalInfo}>
          平仄合规率：{Math.round(currentPoem.tonalCompliance * 100)}%
        </div>
      )}
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    background: #f5f0e8;
    font-family: "Noto Serif SC", "SimSun", "STSong", serif;
    overflow: hidden;
    user-select: none;
  }

  .style-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .style-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(180, 40, 30, 0.08),
      transparent
    );
    transition: left 0.5s ease;
  }

  .style-btn:hover::before {
    left: 100%;
  }

  .style-btn.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    width: 60%;
    height: 3px;
    background: #b4281e;
    border-radius: 2px;
    transform: scaleX(0);
    animation: brushStroke 0.4s ease forwards;
  }

  @keyframes brushStroke {
    0% {
      transform: scaleX(0);
      transform-origin: left;
    }
    60% {
      transform: scaleX(1.1);
      transform-origin: left;
    }
    100% {
      transform: scaleX(1);
      transform-origin: left;
    }
  }

  .format-btn {
    transition: all 0.3s ease;
  }

  .format-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(180, 40, 30, 0.15);
  }

  .format-btn.active {
    animation: formatPulse 0.3s ease;
  }

  @keyframes formatPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .regenerate-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .regenerate-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(180, 40, 30, 0.1);
    transform: translate(-50%, -50%);
    transition: width 0.4s ease, height 0.4s ease;
  }

  .regenerate-btn:hover::before {
    width: 200%;
    height: 200%;
  }

  .regenerate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(180, 40, 30, 0.2);
  }

  .regenerate-btn:active {
    transform: translateY(0);
  }

  .option-btn {
    animation: optionFadeIn 0.3s ease forwards;
    opacity: 0;
    transform: translateY(8px);
  }

  @keyframes optionFadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .replacement-panel {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .panel-enter {
    opacity: 1 !important;
  }

  @media (max-width: 767px) {
    .replacement-panel {
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .regenerate-icon-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#f5f0e8',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer',
  },
  titleArea: {
    position: 'absolute',
    top: '24px',
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    pointerEvents: 'none',
    zIndex: 10,
  },
  title: {
    fontSize: 'clamp(20px, 3vw, 32px)',
    color: '#1e1914',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textShadow: '0 1px 2px rgba(180,40,30,0.15)',
  },
  subtitle: {
    fontSize: 'clamp(11px, 1.5vw, 14px)',
    color: '#8a7e6e',
    marginTop: '6px',
    letterSpacing: '0.1em',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px 24px',
    background: 'linear-gradient(transparent, rgba(245,240,232,0.9) 30%, rgba(245,240,232,0.98))',
    zIndex: 20,
  },
  styleSelector: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  styleBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '10px 18px',
    border: '1.5px solid #c4b9a8',
    borderRadius: '6px',
    background: 'rgba(245,240,232,0.85)',
    cursor: 'pointer',
    fontFamily: '"Noto Serif SC", "SimSun", serif',
    color: '#5a4e3e',
    transition: 'all 0.3s ease',
  },
  styleBtnActive: {
    borderColor: '#b4281e',
    background: 'rgba(180, 40, 30, 0.06)',
    color: '#b4281e',
    boxShadow: '0 2px 12px rgba(180, 40, 30, 0.12)',
  },
  styleBtnHover: {
    borderColor: '#b4281e',
    transform: 'translateY(-1px)',
  },
  styleBtnLabel: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  styleBtnDesc: {
    fontSize: '10px',
    opacity: 0.7,
    letterSpacing: '0.05em',
  },
  formatSelector: {
    display: 'flex',
    gap: '8px',
  },
  formatBtn: {
    padding: '6px 16px',
    border: '1.5px solid #c4b9a8',
    borderRadius: '20px',
    background: 'rgba(245,240,232,0.85)',
    cursor: 'pointer',
    fontFamily: '"Noto Serif SC", "SimSun", serif',
    fontSize: '13px',
    color: '#5a4e3e',
    letterSpacing: '0.08em',
    transition: 'all 0.3s ease',
  },
  formatBtnActive: {
    borderColor: '#b4281e',
    background: '#b4281e',
    color: '#f5f0e8',
  },
  regenerateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 28px',
    border: '2px solid #1e1914',
    borderRadius: '4px',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: '"Noto Serif SC", "SimSun", serif',
    fontSize: '15px',
    fontWeight: 700,
    color: '#1e1914',
    letterSpacing: '0.12em',
    position: 'relative',
    overflow: 'hidden',
  },
  regenerateBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  regenerateIcon: {
    fontSize: '18px',
  },
  replacementPanel: {
    position: 'absolute',
    zIndex: 30,
    minWidth: '180px',
    maxWidth: isMobileStyle() ? '100%' : '280px',
    padding: '14px',
    background: 'rgba(245, 240, 232, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(196, 185, 168, 0.6)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(30, 25, 20, 0.12), 0 2px 8px rgba(30, 25, 20, 0.06)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(196, 185, 168, 0.4)',
  },
  panelTitle: {
    fontSize: '13px',
    color: '#1e1914',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  panelCloseBtn: {
    width: '24px',
    height: '24px',
    border: 'none',
    background: 'rgba(196, 185, 168, 0.3)',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#5a4e3e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease',
  },
  panelOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    border: '1px solid rgba(196, 185, 168, 0.5)',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    fontFamily: '"Noto Serif SC", "SimSun", serif',
    transition: 'all 0.2s ease',
  },
  optionChar: {
    fontSize: '14px',
    color: '#1e1914',
    fontWeight: 700,
  },
  optionTag: {
    fontSize: '9px',
    color: '#b4281e',
    padding: '1px 4px',
    background: 'rgba(180, 40, 30, 0.08)',
    borderRadius: '3px',
  },
  tonalInfo: {
    position: 'absolute',
    bottom: '140px',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: '11px',
    color: '#8a7e6e',
    letterSpacing: '0.05em',
    zIndex: 10,
    pointerEvents: 'none',
  },
};

function isMobileStyle(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export default App;
