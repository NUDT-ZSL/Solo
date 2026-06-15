import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SketchCanvasProps {
  onSave: (imageData: string) => void;
  isSaving: boolean;
  disabled: boolean;
  isMobile: boolean;
}

type Tool = 'pen' | 'eraser';

const COLORS = [
  '#ffffff',
  '#e94560',
  '#ffbe0b',
  '#4cc9f0',
  '#06d6a0',
  '#f72585',
  '#b5179e',
  '#7209b7',
  '#3a0ca3',
  '#4361ee',
  '#1d3557',
  '#264653',
  '#000000',
  '#6c757d',
  '#e63946',
];

const SIZES = [2, 4, 6, 10, 16, 24];

const SketchCanvas: React.FC<SketchCanvasProps> = ({
  onSave,
  isSaving,
  disabled,
  isMobile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const redoHistoryRef = useRef<ImageData[]>([]);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    setCanvasSize({ w: width, h: height });

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    historyRef.current = [];
    redoHistoryRef.current = [];
    saveHistory();
  }, []);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      const canvas = canvasRef.current;
      const currentData = canvas
        ? canvas.toDataURL('image/png')
        : null;
      initCanvas();
      if (currentData && ctxRef.current) {
        const img = new Image();
        img.onload = () => {
          if (ctxRef.current && canvas) {
            ctxRef.current.drawImage(img, 0, 0, canvasSize.w, canvasSize.h);
          }
        };
        img.src = currentData;
      }
    };
    let timeout: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleResize, 200);
    };
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, [initCanvas]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(imageData);
      if (historyRef.current.length > 30) {
        historyRef.current.shift();
      }
      redoHistoryRef.current = [];
    } catch (e) {
      // ignore
    }
  }, []);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const point = getCanvasPoint(e);
    lastPointRef.current = point;

    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#1a1a2e' : color;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || disabled) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    const lastPoint = lastPointRef.current;
    if (!lastPoint) return;

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = point;
  };

  const endDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      saveHistory();
    }
  };

  const undo = () => {
    if (historyRef.current.length <= 1) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const current = historyRef.current.pop()!;
    redoHistoryRef.current.push(current);
    const prev = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  };

  const redo = () => {
    if (redoHistoryRef.current.length === 0) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const next = redoHistoryRef.current.pop()!;
    historyRef.current.push(next);
    ctx.putImageData(next, 0, 0);
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
    saveHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const ToolButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
  }> = ({ active, onClick, children, title }) => (
    <button
      style={{
        ...styles.toolButton,
        ...(active ? styles.toolButtonActive : {}),
      }}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );

  const toolbarContent = (
    <>
      <div style={styles.toolGroup}>
        <div style={styles.toolGroupLabel}>工具</div>
        <div style={styles.toolRow}>
          <ToolButton
            active={tool === 'pen'}
            onClick={() => setTool('pen')}
            title="画笔"
          >
            ✏️
          </ToolButton>
          <ToolButton
            active={tool === 'eraser'}
            onClick={() => setTool('eraser')}
            title="橡皮擦"
          >
            🧽
          </ToolButton>
        </div>
      </div>

      <div style={styles.toolGroup}>
        <div style={styles.toolGroupLabel}>颜色</div>
        <div style={styles.colorGrid}>
          {COLORS.map((c) => (
            <button
              key={c}
              style={{
                ...styles.colorButton,
                backgroundColor: c,
                ...(color === c && tool === 'pen'
                  ? styles.colorButtonActive
                  : {}),
                ...(c === '#ffffff'
                  ? { border: '1px solid rgba(255,255,255,0.3)' }
                  : {}),
              }}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              type="button"
              title={c}
            />
          ))}
        </div>
      </div>

      <div style={styles.toolGroup}>
        <div style={styles.toolGroupLabel}>笔刷</div>
        <div style={styles.sizeRow}>
          {SIZES.map((s) => (
            <button
              key={s}
              style={{
                ...styles.sizeButton,
                ...(brushSize === s ? styles.sizeButtonActive : {}),
              }}
              onClick={() => setBrushSize(s)}
              type="button"
              title={`${s}px`}
            >
              <div
                style={{
                  width: Math.min(s + 4, 28),
                  height: Math.min(s + 4, 28),
                  borderRadius: '50%',
                  background: color,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div style={styles.toolGroup}>
        <div style={styles.toolGroupLabel}>操作</div>
        <div style={styles.toolRow}>
          <ToolButton
            active={false}
            onClick={undo}
            title="撤销"
          >
            ↩️
          </ToolButton>
          <ToolButton
            active={false}
            onClick={redo}
            title="重做"
          >
            ↪️
          </ToolButton>
          <ToolButton
            active={false}
            onClick={clearCanvas}
            title="清空画布"
          >
            🗑️
          </ToolButton>
        </div>
      </div>

      {!isMobile && (
        <div style={styles.saveGroup}>
          <button
            style={{
              ...styles.saveButton,
              opacity: disabled || isSaving ? 0.6 : 1,
            }}
            onClick={handleSave}
            disabled={disabled || isSaving}
            type="button"
          >
            <span style={styles.saveIcon}>💾</span>
            <span>{isSaving ? '保存中...' : '保存到画廊'}</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        ...styles.container,
        ...(isMobile ? styles.containerMobile : {}),
      }}
    >
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>🖌️ 灵感画布</h2>
        {!isMobile && (
          <span style={styles.canvasHint}>
            围绕上方主题自由绘制，完成后保存到画廊
          </span>
        )}
        {isMobile && (
          <button
            style={{
              ...styles.saveButton,
              ...styles.saveButtonMobile,
              opacity: disabled || isSaving ? 0.6 : 1,
            }}
            onClick={handleSave}
            disabled={disabled || isSaving}
            type="button"
          >
            <span>💾 {isSaving ? '保存中...' : '保存'}</span>
          </button>
        )}
      </div>

      <div
        style={{
          ...styles.canvasWrapper,
          ...(isMobile ? styles.canvasWrapperMobile : {}),
        }}
      >
        {!isMobile && (
          <div style={styles.toolbar}>
            {toolbarContent}
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            ...styles.canvasContainer,
            ...(disabled ? styles.canvasDisabled : {}),
          }}
        >
          <canvas
            ref={canvasRef}
            style={styles.canvas}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            onTouchCancel={endDrawing}
          />
          {disabled && (
            <div style={styles.canvasOverlay}>
              <span style={styles.overlayText}>正在加载主题...</span>
            </div>
          )}
        </div>

        {isMobile && (
          <>
            <button
              style={{
                ...styles.mobileFab,
                ...(mobileMenuOpen ? styles.mobileFabOpen : {}),
              }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
            >
              {mobileMenuOpen ? '✕' : '🎨'}
            </button>

            {mobileMenuOpen && (
              <div
                style={{
                  ...styles.mobileToolbar,
                  animation: 'fadeIn 0.25s ease both',
                }}
              >
                <div style={styles.mobileToolbarScroll}>
                  {toolbarContent}
                </div>
              </div>
            )}

            {mobileMenuOpen && (
              <div
                style={styles.mobileBackdrop}
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    animation: 'fadeIn 0.4s ease both',
  },
  containerMobile: {
    maxWidth: '100%',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f0f0f0',
  },
  canvasHint: {
    fontSize: '12px',
    color: '#707080',
  },
  canvasWrapper: {
    display: 'flex',
    gap: '16px',
    minHeight: '440px',
  },
  canvasWrapperMobile: {
    flexDirection: 'column',
    minHeight: '50vh',
    position: 'relative',
  },
  toolbar: {
    width: '110px',
    flexShrink: 0,
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
  },
  toolGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  toolGroupLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#606070',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    paddingLeft: '2px',
  },
  toolRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  toolButton: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
  toolButtonActive: {
    background: 'rgba(233, 69, 96, 0.2)',
    borderColor: 'rgba(233, 69, 96, 0.5)',
    boxShadow: '0 0 0 2px rgba(233, 69, 96, 0.2)',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '5px',
  },
  colorButton: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '8px',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
    padding: 0,
  },
  colorButtonActive: {
    borderColor: '#fff',
    boxShadow: '0 0 0 2px #e94560',
    transform: 'scale(1.1)',
  },
  sizeRow: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
  },
  sizeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: 0,
  },
  sizeButtonActive: {
    background: 'rgba(233, 69, 96, 0.15)',
    borderColor: 'rgba(233, 69, 96, 0.4)',
  },
  saveGroup: {
    marginTop: 'auto',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '12px 14px',
    background: 'linear-gradient(135deg, #e94560, #ff6b81)',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(233, 69, 96, 0.35)',
  },
  saveButtonMobile: {
    width: 'auto',
    padding: '8px 14px',
    fontSize: '12px',
  },
  saveIcon: {
    fontSize: '14px',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    background: '#1a1a2e',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3), 0 8px 32px rgba(0, 0, 0, 0.25)',
    cursor: 'crosshair',
    minHeight: '440px',
  },
  canvasDisabled: {
    cursor: 'not-allowed',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    touchAction: 'none',
  },
  canvasOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayText: {
    color: '#a0a0b0',
    fontSize: '14px',
  },
  mobileFab: {
    position: 'absolute',
    right: '16px',
    bottom: '16px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #ff6b81)',
    color: '#fff',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(233, 69, 96, 0.5)',
    zIndex: 60,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  mobileFabOpen: {
    transform: 'rotate(90deg)',
    background: 'rgba(100,100,100,0.8)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  mobileToolbar: {
    position: 'absolute',
    right: '88px',
    bottom: '16px',
    width: '260px',
    maxHeight: '60vh',
    background: 'rgba(26, 26, 46, 0.98)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    padding: '14px',
    zIndex: 55,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
  },
  mobileToolbarScroll: {
    maxHeight: 'calc(60vh - 28px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  mobileBackdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 50,
    borderRadius: '16px',
  },
};

export default SketchCanvas;
