import React, { useState, useCallback, useEffect, useRef } from 'react';
import ControlPanel from './ControlPanel';
import PreviewArea from './PreviewArea';
import {
  type FontPair,
  type FontConfig,
  defaultFontPairs,
  loadGoogleFonts,
  getAllUniqueFontNames,
} from './fonts';

interface TextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

const DEFAULT_TEXT = '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。';

const App: React.FC = () => {
  const [fontPairs, setFontPairs] = useState<FontPair[]>(defaultFontPairs);
  const [activePairIndex, setActivePairIndex] = useState(0);
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
  });
  const [testText, setTestText] = useState(DEFAULT_TEXT);
  const [loading, setLoading] = useState(false);
  const prevFontNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentNames = new Set(getAllUniqueFontNames(fontPairs));
    const newNames = Array.from(currentNames).filter(
      (name) => !prevFontNamesRef.current.has(name)
    );
    prevFontNamesRef.current = currentNames;

    if (newNames.length > 0) {
      const hasGoogle = newNames.some((name) => {
        const pair = fontPairs.find(
          (p) => p.title.name === name || p.body.name === name
        );
        return (
          pair?.title.category === 'google' || pair?.body.category === 'google'
        );
      });

      if (hasGoogle) {
        setLoading(true);
        loadGoogleFonts(newNames).finally(() => {
          setTimeout(() => setLoading(false), 200);
        });
      }
    }
  }, [fontPairs]);

  const handleTitleFontChange = useCallback(
    (pairIndex: number, font: FontConfig) => {
      setFontPairs((prev) =>
        prev.map((p, i) => (i === pairIndex ? { ...p, title: font } : p))
      );
    },
    []
  );

  const handleBodyFontChange = useCallback(
    (pairIndex: number, font: FontConfig) => {
      setFontPairs((prev) =>
        prev.map((p, i) => (i === pairIndex ? { ...p, body: font } : p))
      );
    },
    []
  );

  const handleReorderPairs = useCallback((newPairs: FontPair[]) => {
    setFontPairs(newPairs);
  }, []);

  const previewAreaRef = React.useRef<{ handleScreenshot: () => void } | null>(null);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        minWidth: 900,
        background: '#f8fafc',
      }}
      className="app-container"
    >
      <ControlPanel
        fontPairs={fontPairs}
        activePairIndex={activePairIndex}
        onActivePairChange={setActivePairIndex}
        onTitleFontChange={handleTitleFontChange}
        onBodyFontChange={handleBodyFontChange}
        textStyle={textStyle}
        onTextStyleChange={setTextStyle}
        testText={testText}
        onTestTextChange={setTestText}
        onScreenshot={() => {
          if (previewAreaRef.current) {
            previewAreaRef.current.handleScreenshot();
          }
        }}
      />
      <PreviewAreaWrapper
        ref={previewAreaRef}
        fontPairs={fontPairs}
        onReorderPairs={handleReorderPairs}
        textStyle={textStyle}
        testText={testText}
        loading={loading}
      />
    </div>
  );
};

interface PreviewAreaWrapperProps {
  fontPairs: FontPair[];
  onReorderPairs: (pairs: FontPair[]) => void;
  textStyle: TextStyle;
  testText: string;
  loading: boolean;
}

const PreviewAreaWrapper = React.forwardRef<
  { handleScreenshot: () => void },
  PreviewAreaWrapperProps
>(({ fontPairs, onReorderPairs, textStyle, testText, loading }, ref) => {
  const screenshotFnRef = useRef<() => void>(() => {});

  React.useImperativeHandle(ref, () => ({
    handleScreenshot: () => screenshotFnRef.current(),
  }));

  return (
    <PreviewAreaWithScreenshot
      fontPairs={fontPairs}
      onReorderPairs={onReorderPairs}
      textStyle={textStyle}
      testText={testText}
      loading={loading}
      onScreenshotReady={(fn) => {
        screenshotFnRef.current = fn;
      }}
    />
  );
});
PreviewAreaWrapper.displayName = 'PreviewAreaWrapper';

interface PreviewAreaWithScreenshotProps extends PreviewAreaWrapperProps {
  onScreenshotReady: (fn: () => void) => void;
}

const PreviewAreaWithScreenshot: React.FC<PreviewAreaWithScreenshotProps> = ({
  fontPairs,
  onReorderPairs,
  textStyle,
  testText,
  loading,
  onScreenshotReady,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [screenshotting, setScreenshotting] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleScreenshot = useCallback(async () => {
    if (!gridRef.current || screenshotting) return;
    setScreenshotting(true);

    await new Promise((r) => setTimeout(r, 300));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(gridRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const names = fontPairs.map((p) => `${p.title.name}+${p.body.name}`).join('__');
      const link = document.createElement('a');
      link.download = `字体对比_${names}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setTimeout(() => setScreenshotting(false), 200);
    }
  }, [fontPairs, screenshotting]);

  useEffect(() => {
    onScreenshotReady(handleScreenshot);
  }, [handleScreenshot, onScreenshotReady]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, index: number) => {
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (dropIndex: number) => {
      if (dragIndex !== null && dragIndex !== dropIndex) {
        const newPairs = [...fontPairs];
        const [moved] = newPairs.splice(dragIndex, 1);
        newPairs.splice(dropIndex, 0, moved);
        onReorderPairs(newPairs);
      }
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, fontPairs, onReorderPairs]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        height: '100vh',
        background: '#ffffff',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          <div className="ring-loader">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="80 46"
                className="ring-loader-circle"
              />
            </svg>
          </div>
        </div>
      )}

      {screenshotting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'overlayFade 0.3s ease-out forwards',
          }}
        />
      )}

      <div style={{ padding: 24, minHeight: '100%' }}>
        <div
          ref={gridRef}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'flex-start',
          }}
          className="card-grid"
        >
          {fontPairs.map((pair, i) => (
            <div
              key={pair.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                handleDragStart(i);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                handleDragOver(e, i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(i);
              }}
              className="font-card"
              style={{
                width: 'var(--card-width, 380px)',
                height: 300,
                background: '#ffffff',
                borderRadius: 12,
                boxShadow:
                  overIndex === i && dragIndex !== i
                    ? '0 8px 24px rgba(0,0,0,0.12)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'grab',
                transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                transform:
                  overIndex === i && dragIndex !== i
                    ? 'translateY(-3px)'
                    : undefined,
                outline:
                  overIndex === i && dragIndex !== i
                    ? '2px solid #3b82f6'
                    : 'none',
                outlineOffset: '-2px',
                overflow: 'hidden',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(-3px)';
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform =
                  overIndex === i && dragIndex !== i
                    ? 'translateY(-3px)'
                    : '';
                el.style.boxShadow =
                  overIndex === i && dragIndex !== i
                    ? '0 8px 24px rgba(0,0,0,0.12)'
                    : '0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    background: '#f3f4f6',
                    borderRadius: 4,
                    padding: '2px 8px',
                    color: '#475569',
                    fontFamily: pair.title.family,
                    whiteSpace: 'nowrap',
                  }}
                >
                  标题: {pair.title.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    background: '#f3f4f6',
                    borderRadius: 4,
                    padding: '2px 8px',
                    color: '#475569',
                    fontFamily: pair.body.family,
                    whiteSpace: 'nowrap',
                  }}
                >
                  正文: {pair.body.name}
                </span>
              </div>

              <div
                style={{
                  fontFamily: pair.title.family,
                  fontSize: Math.min(textStyle.fontSize * 1.25, 48),
                  lineHeight: textStyle.lineHeight,
                  letterSpacing: textStyle.letterSpacing,
                  color: '#0f172a',
                  fontWeight: 700,
                  marginBottom: 10,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-all',
                }}
              >
                {testText.split('\n')[0] || testText}
              </div>

              <div
                style={{
                  fontFamily: pair.body.family,
                  fontSize: textStyle.fontSize,
                  lineHeight: textStyle.lineHeight,
                  letterSpacing: textStyle.letterSpacing,
                  color: '#334155',
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-all',
                }}
              >
                {testText}
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 12,
                  fontSize: 10,
                  color: '#cbd5e1',
                  userSelect: 'none',
                }}
              >
                ⠿ 拖拽排序
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleScreenshot}
        className="screenshot-fab"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: '#3b82f6',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          zIndex: 100,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)';
        }}
        title="一键截图"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </div>
  );
};

export default App;
