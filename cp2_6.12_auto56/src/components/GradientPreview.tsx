import { useState, useRef, useEffect, useCallback } from 'react';
import { Copy, Check, Download, X } from 'lucide-react';
import { ColorStop, GradientConfig, generateGradientCSS, generateGradientCode } from '../utils/gradient';

interface GradientPreviewProps {
  config: GradientConfig;
  onUpdateStops: (stops: ColorStop[]) => void;
}

export default function GradientPreview({ config, onUpdateStops }: GradientPreviewProps) {
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<number | null>(null);

  const gradientCSS = generateGradientCSS(config);
  const gradientCode = generateGradientCode(config);

  const handleStopMouseDown = useCallback((e: React.MouseEvent, stopId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(stopId);
  }, []);

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      let position = ((e.clientX - rect.left) / rect.width) * 100;
      position = Math.max(0, Math.min(100, position));

      pendingPositionRef.current = position;

      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        if (pendingPositionRef.current !== null && barRef.current) {
          const pos = pendingPositionRef.current;
          const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
          const dragIndex = sortedStops.findIndex((s) => s.id === draggingId);

          let finalPos = pos;
          if (dragIndex > 0) {
            finalPos = Math.max(finalPos, sortedStops[dragIndex - 1].position + 1);
          }
          if (dragIndex < sortedStops.length - 1) {
            finalPos = Math.min(finalPos, sortedStops[dragIndex + 1].position - 1);
          }

          const newStops = config.stops.map((s) =>
            s.id === draggingId ? { ...s, position: finalPos } : s
          );
          onUpdateStops(newStops);
        }
        rafRef.current = null;
      });
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      pendingPositionRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draggingId, config.stops, onUpdateStops]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gradientCode);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }, [gradientCode]);

  const codeLines = gradientCode.split('\n');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        gap: '32px',
        position: 'relative',
      }}
    >
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#e0e0e0',
          letterSpacing: '-0.5px',
        }}
      >
        Gradient Studio
      </h1>

      <p
        style={{
          fontSize: '14px',
          color: '#888',
          marginTop: '-20px',
        }}
      >
        拖拽色标点调整渐变 · 点击预设快速切换
      </p>

      <div
        style={{
          width: '100%',
          maxWidth: '700px',
          position: 'relative',
          paddingTop: '30px',
          paddingBottom: '10px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '30px',
            pointerEvents: 'none',
          }}
        >
          {config.stops.map((stop) => (
            <div
              key={stop.id}
              onMouseDown={(e) => handleStopMouseDown(e, stop.id)}
              style={{
                position: 'absolute',
                left: `${stop.position}%`,
                top: '0',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: stop.color,
                border: '3px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'grab',
                pointerEvents: 'auto',
                transition: draggingId === stop.id ? 'none' : 'box-shadow 0.2s, transform 0.2s',
                zIndex: draggingId === stop.id ? 10 : 1,
              }}
              className="stop-handle"
            />
          ))}
        </div>

        <div
          ref={barRef}
          style={{
            width: '100%',
            height: '80px',
            borderRadius: '12px',
            background: gradientCSS,
            transition: 'background 0.2s ease',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      <button
        onClick={() => setShowExport(true)}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 28px',
          background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 16px rgba(233, 69, 96, 0.3)',
        }}
        className="export-btn"
      >
        <Download size={18} />
        导出 CSS
      </button>

      {showExport && (
        <div
          onClick={() => setShowExport(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              background: '#16213e',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              paddingBottom: '32px',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#e0e0e0',
                }}
              >
                CSS 代码
              </h3>
              <button
                onClick={() => setShowExport(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                position: 'relative',
                background: '#0f1629',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                fontSize: '13px',
                lineHeight: '1.6',
                overflow: 'auto',
              }}
            >
              <button
                onClick={handleCopy}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: copied ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.1)',
                  color: copied ? '#4caf50' : '#e0e0e0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  zIndex: 1,
                }}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    复制
                  </>
                )}
              </button>

              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    textAlign: 'right',
                    paddingRight: '16px',
                    color: '#444',
                    userSelect: 'none',
                    borderRight: '1px solid #222',
                    marginRight: '16px',
                    minWidth: '30px',
                  }}
                >
                  {codeLines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre
                  style={{
                    margin: 0,
                    color: '#e0e0e0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {gradientCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .stop-handle:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .stop-handle:active {
          cursor: grabbing;
        }
        .export-btn:hover {
          box-shadow: 0 6px 20px rgba(233, 69, 96, 0.4);
        }
      `}</style>
    </div>
  );
}
