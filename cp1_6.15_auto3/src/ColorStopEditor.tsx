import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ColorStop, generateGradientCss } from './logic/colorUtils';

interface ColorStopEditorProps {
  colorStops: ColorStop[];
  onUpdateStop: (id: string, updates: Partial<ColorStop>) => void;
  onRemoveStop: (id: string) => void;
  canRemove: boolean;
}

const ColorStopEditor: React.FC<ColorStopEditorProps> = ({
  colorStops,
  onUpdateStop,
  onRemoveStop,
  canRemove
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [hoveringId, setHoveringId] = useState<string | null>(null);
  const [hoverRemoveId, setHoverRemoveId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ id: string; position: number } | null>(null);
  const colorInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);

  const trackGradient = generateGradientCss(
    colorStops.map(s => ({ ...s })),
    90,
    'linear'
  );

  const flushPendingUpdate = useCallback(() => {
    if (pendingPositionRef.current) {
      const { id, position } = pendingPositionRef.current;
      onUpdateStop(id, { position });
      pendingPositionRef.current = null;
      rafRef.current = null;
    }
  }, [onUpdateStop]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (draggingId !== null) {
        flushPendingUpdate();
        setDraggingId(null);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draggingId, flushPendingUpdate]);

  const calculatePosition = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (draggingId === null) return;

    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const newPosition = calculatePosition(clientX);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    pendingPositionRef.current = { id: draggingId, position: newPosition };

    rafRef.current = requestAnimationFrame(() => {
      if (pendingPositionRef.current) {
        const { id, position } = pendingPositionRef.current;
        onUpdateStop(id, { position });
        pendingPositionRef.current = null;
        rafRef.current = null;
      }
    });
  }, [draggingId, calculatePosition, onUpdateStop]);

  useEffect(() => {
    if (draggingId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
    };
  }, [draggingId, handleMouseMove]);

  const handleHandleMouseDown = (e: React.MouseEvent | React.TouchEvent, stopId: string) => {
    e.preventDefault();
    setDraggingId(stopId);
  };

  const handleColorChange = (id: string, color: string) => {
    onUpdateStop(id, { color });
  };

  const handleColorSquareDoubleClick = (id: string) => {
    const input = colorInputRefs.current[id];
    if (input) {
      input.click();
    }
  };

  const handleRemove = (id: string) => {
    if (!canRemove) return;
    setRemovingId(id);
    setTimeout(() => {
      onRemoveStop(id);
      setRemovingId(null);
    }, 300);
  };

  return (
    <div style={styles.container}>
      <div
        ref={trackRef}
        style={{
          ...styles.track,
          background: trackGradient
        }}
      >
        {sortedStops.map((stop) => (
          <div
            key={stop.id}
            onMouseEnter={() => setHoveringId(stop.id)}
            onMouseLeave={() => setHoveringId(null)}
            style={{
              ...styles.handleWrapper,
              left: `${stop.position}%`,
              opacity: removingId === stop.id ? 0 : 1,
              transform: `translateX(-50%) translateY(-50%) ${removingId === stop.id ? 'scale(0) translateX(-100%)' : ''}`,
              transition: removingId === stop.id ? 'all 0.3s ease' : 'none',
              zIndex: draggingId === stop.id ? 100 : 10
            }}
          >
            {(draggingId === stop.id || hoveringId === stop.id) && (
              <div style={styles.anchorDot} className="anchor-pulse" />
            )}

            <div
              onMouseDown={(e) => handleHandleMouseDown(e, stop.id)}
              onTouchStart={(e) => handleHandleMouseDown(e, stop.id)}
              style={{
                ...styles.handle,
                background: stop.color,
                boxShadow: draggingId === stop.id
                  ? `0 0 0 3px rgba(74, 144, 217, 0.5), 0 4px 12px rgba(0,0,0,0.4)`
                  : '0 2px 8px rgba(0,0,0,0.3)',
                transform: draggingId === stop.id ? 'scale(1.15)' : hoveringId === stop.id ? 'scale(1.05)' : 'scale(1)',
                border: `3px solid ${isLightColor(stop.color) ? 'rgba(0,0,0,0.2)' : '#fff'}`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            />

            <div style={styles.positionLabel}>
              {Math.round(stop.position)}%
            </div>
          </div>
        ))}
      </div>

      <div style={styles.stopsList}>
        {sortedStops.map((stop, index) => (
          <div
            key={stop.id}
            style={{
              ...styles.stopItem,
              opacity: removingId === stop.id ? 0 : 1,
              transform: removingId === stop.id ? 'translateX(-20px)' : 'translateX(0)',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={styles.stopIndex}>{index + 1}</div>

            <div
              onDoubleClick={() => handleColorSquareDoubleClick(stop.id)}
              style={{
                ...styles.colorSquare,
                background: stop.color,
                cursor: 'pointer'
              }}
              title="双击打开取色器"
            >
              <input
                ref={(el) => { colorInputRefs.current[stop.id] = el; }}
                type="color"
                value={stop.color}
                onChange={(e) => handleColorChange(stop.id, e.target.value)}
                style={styles.hiddenColorInput}
              />
            </div>

            <input
              type="text"
              value={stop.color}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val === '#') {
                  handleColorChange(stop.id, val);
                }
              }}
              style={styles.colorInput}
            />

            <div style={styles.positionInputWrapper}>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(stop.position)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) {
                    onUpdateStop(stop.id, { position: Math.max(0, Math.min(100, val)) });
                  }
                }}
                style={styles.positionInput}
              />
              <span style={styles.percentSign}>%</span>
            </div>

            <button
              onClick={() => handleRemove(stop.id)}
              disabled={!canRemove}
              onMouseEnter={() => canRemove && setHoverRemoveId(stop.id)}
              onMouseLeave={() => setHoverRemoveId(null)}
              style={{
                ...styles.removeButton,
                ...(canRemove && hoverRemoveId === stop.id ? styles.removeButtonHover : {}),
                opacity: canRemove ? 1 : 0.3,
                cursor: canRemove ? 'pointer' : 'not-allowed'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function isLightColor(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return false;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  track: {
    position: 'relative',
    height: '32px',
    borderRadius: '16px',
    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
    marginBottom: '8px',
    userSelect: 'none',
    touchAction: 'none'
  },
  handleWrapper: {
    position: 'absolute',
    top: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'grab',
    userSelect: 'none'
  },
  handle: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    boxSizing: 'content-box',
    cursor: 'grab',
    position: 'relative'
  },
  anchorDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '8px',
    height: '8px',
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 1
  },
  positionLabel: {
    position: 'absolute',
    top: '32px',
    fontSize: '10px',
    color: '#858585',
    background: '#2D2D30',
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace'
  },
  stopsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px'
  },
  stopItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: '#2D2D30',
    borderRadius: '8px',
    border: '1px solid #3E3E3E'
  },
  stopIndex: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#3A3D41',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: '#D4D4D4',
    flexShrink: 0
  },
  colorSquare: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    border: '2px solid #3E3E3E',
    transition: 'border-color 0.2s ease'
  },
  hiddenColorInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    padding: 0,
    border: 'none'
  },
  colorInput: {
    flex: 1,
    padding: '6px 10px',
    background: '#1E1E1E',
    border: '1px solid #3E3E3E',
    borderRadius: '6px',
    color: '#D4D4D4',
    fontSize: '12px',
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    minWidth: '80px'
  },
  positionInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative'
  },
  positionInput: {
    width: '52px',
    padding: '6px 18px 6px 8px',
    background: '#1E1E1E',
    border: '1px solid #3E3E3E',
    borderRadius: '6px',
    color: '#D4D4D4',
    fontSize: '12px',
    fontFamily: 'monospace',
    outline: 'none',
    textAlign: 'left',
    MozAppearance: 'textfield'
  },
  percentSign: {
    position: 'absolute',
    right: '8px',
    fontSize: '11px',
    color: '#858585',
    pointerEvents: 'none'
  },
  removeButton: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #3E3E42',
    background: '#3A3D41',
    color: '#D4D4D4',
    fontSize: '18px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    fontWeight: 400
  },
  removeButtonHover: {
    background: '#E74C3C',
    borderColor: '#E74C3C',
    color: '#fff'
  }
};

export default ColorStopEditor;
