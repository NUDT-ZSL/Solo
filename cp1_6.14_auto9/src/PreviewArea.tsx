import React, { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { type FontPair } from './fonts';

interface TextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

interface PreviewAreaProps {
  fontPairs: FontPair[];
  onReorderPairs: (pairs: FontPair[]) => void;
  textStyle: TextStyle;
  testText: string;
  loading: boolean;
}

const RingLoader: React.FC = () => (
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
);

const ScreenshotOverlay: React.FC = () => (
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
);

interface FontCardProps {
  pair: FontPair;
  index: number;
  textStyle: TextStyle;
  testText: string;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  isDragOver: boolean;
}

const FontCard: React.FC<FontCardProps> = React.memo(
  ({ pair, index, textStyle, testText, onDragStart, onDragOver, onDrop, isDragOver }) => {
    const titleLines = testText.split('\n');
    const firstLine = titleLines[0] || testText;

    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(index);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOver(e, index);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(index);
        }}
        style={{
          width: 'var(--card-width, 380px)',
          height: 300,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: isDragOver
            ? '0 8px 24px rgba(0,0,0,0.12)'
            : '0 2px 8px rgba(0,0,0,0.06)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'grab',
          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
          transform: isDragOver ? 'translateY(-3px)' : undefined,
          outline: isDragOver ? '2px solid #3b82f6' : 'none',
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
          el.style.transform = isDragOver ? 'translateY(-3px)' : '';
          el.style.boxShadow = isDragOver
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
          {firstLine}
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
    );
  }
);
FontCard.displayName = 'FontCard';

const PreviewArea: React.FC<PreviewAreaProps> = ({
  fontPairs,
  onReorderPairs,
  textStyle,
  testText,
  loading,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [screenshotting, setScreenshotting] = useState(false);

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

  const handleScreenshot = useCallback(async () => {
    if (!gridRef.current || screenshotting) return;
    setScreenshotting(true);

    await new Promise((r) => setTimeout(r, 300));

    try {
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
      {loading && <RingLoader />}
      {screenshotting && <ScreenshotOverlay />}

      <div
        style={{
          padding: '24px',
          minHeight: '100%',
        }}
      >
        <div
          ref={gridRef}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'flex-start',
          }}
        >
          {fontPairs.map((pair, i) => (
            <FontCard
              key={pair.id}
              pair={pair}
              index={i}
              textStyle={textStyle}
              testText={testText}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragOver={overIndex === i && dragIndex !== i}
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleScreenshot}
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </div>
  );
};

export default PreviewArea;
