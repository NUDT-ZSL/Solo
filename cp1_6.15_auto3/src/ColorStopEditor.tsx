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
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartPosition, setDragStartPosition] = useState<number>(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [hoveringId, setHoveringId] = useState<string | null>(null);
  const [hoverRemoveId, setHoverRemoveId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPositionRef = useRef<number>(-1);
  const colorInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);

  const trackGradient = generateGradientCss(
    colorStops.map(s => ({ ...s })),
    90,
    'linear'
  );

  const getPositionFromClientX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (draggingId === null) return;

    e.preventDefault();
    let clientX: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = (e as MouseEvent).clientX;
    }

    const deltaX = clientX - dragStartX;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaPercent = (deltaX / rect.width) * 100;
    const rawPosition = dragStartPosition + deltaPercent;
    const newPosition = Math.max(0, Math.min(100, rawPosition));

    const rounded = Math.round(newPosition * 10) / 10;
    if (Math.abs(rounded - lastPositionRef.current) < 0.1 && rafRef.current !== null) {
      return;
    }
    lastPositionRef.current = rounded;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      onUpdateStop(draggingId, { position: rounded });
      rafRef.current = null;
    });
  }, [draggingId, dragStartX, dragStartPosition, onUpdateStop]);

  const handleMouseUp = useCallback(() => {
    if (draggingId !== null) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (lastPositionRef.current >= 0) {
        onUpdateStop(draggingId, { position: Math.round(lastPositionRef.current * 10) / 10 });
      }
      lastPositionRef.current = -1;
      setDraggingId(null);
    }
  }, [draggingId, onUpdateStop]);

  useEffect(() => {
    if (draggingId !== null) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchcancel', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchcancel', handleMouseUp);
    };
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const handleHandleMouseDown = (e: React.MouseEvent | React.TouchEvent, stop: ColorStop) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const currentPosition = getPositionFromClientX(clientX);
    setDragStartX(clientX);
    setDragStartPosition(stop.position);
    lastPositionRef.current = stop.position;
    setDraggingId(stop.id);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (draggingId !== null) return;
    if (e.target !== trackRef.current) return;
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
        onClick={handleTrackClick}
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
              top: '50%',
              opacity: removingId === stop.id ? 0 : 1,
              transform: `translate(-50%, -50%) ${removingId === stop.id ? 'scale(0.4)' : ''}`,
              transition: removingId === stop.id
                ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                : draggingId === stop.id ? 'none' : 'opacity 0.2s ease',
              zIndex: draggingId === stop.id ? 999 : stop.position
            }}
          >
            <div
              className="anchor-ring"
              style={{
                ...styles.anchorRing,
                opacity: (draggingId === stop.id || hoveringId === stop.id) ? 1 : 0,
                transform: (draggingId === stop.id || hoveringId === stop.id) ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.5)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />

            <div
              className="anchor-pulse"
              style={{
                ...styles.anchorPulse,
                opacity: draggingId === stop.id ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}
            />

            <div
              onMouseDown={(e) => handleHandleMouseDown(e, stop)}
              onTouchStart={(e) => handleHandleMouseDown(e, stop)}
              style={{
                ...styles.handle,
                background: stop.color,
                boxShadow: draggingId === stop.id
                  ? `0 0 0 4px rgba(74, 144, 217, 0.4), 0 6px 20px rgba(0,0,0,0.5)`
                  : hoveringId === stop.id
                  ? `0 0 0 2px rgba(74, 144, 217, 0.3), 0 3px 12px rgba(0,0,0,0.35)`
                  : '0 2px 8px rgba(0,0,0,0.3)',
                transform: draggingId === stop.id
                  ? 'scale(1.2)'
                  : hoveringId === stop.id
                  ? 'scale(1.1)'
                  : 'scale(1)',
                border: `3px solid ${isLightColor(stop.color) ? 'rgba(255,255,255,0.9)' : '#fff'}`,
                transition: draggingId === stop.id
                  ? 'transform 0.08s ease-out, box-shadow 0.15s ease'
                  : 'transform 0.15s ease, box-shadow 0.15s ease',
                cursor: draggingId === stop.id ? 'grabbing' : 'grab'
              }}
            />

            <div style={{
              ...styles.positionLabel,
              opacity: (draggingId === stop.id || hoveringId === stop.id) ? 1 : 0.7,
              transform: (draggingId === stop.id || hoveringId === stop.id) ? 'translateY(0)' : 'translateY(2px)',
              transition: 'all 0.15s ease'
            }}>
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
              transform: removingId === stop.id ? 'translateX(-30px) scale(0.95)' : 'translateX(0) scale(1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
  return brightness > 160;
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  track: {
    position: 'relative',
    height: '36px',
    borderRadius: '18px',
    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.35)',
    userSelect: 'none',
    touchAction: 'none',
    overflow: 'visible'
  },
  handleWrapper: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    userSelect: 'none',
    willChange: 'transform, left'
  },
  handle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    boxSizing: 'content-box',
    position: 'relative',
    zIndex: 2
  },
  anchorRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '2px solid rgba(74, 144, 217, 0.5)',
    pointerEvents: 'none',
    zIndex: 1
  },
  anchorPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '2px solid rgba(74, 144, 217, 0.25)',
    pointerEvents: 'none',
    zIndex: 0
  },
  positionLabel: {
    position: 'absolute',
    top: '40px',
    fontSize: '11px',
    color: '#D4D4D4',
    background: 'rgba(45, 45, 48, 0.95)',
    padding: '3px 8px',
    borderRadius: '5px',
    whiteSpace: 'nowrap',
    fontFamily: "'SF Mono', Consolas, monospace",
    border: '1px solid #3E3E3E',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    fontWeight: 500
  },
  stopsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  stopItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: '#2D2D30',
    borderRadius: '10px',
    border: '1px solid #3E3E3E'
  },
  stopIndex: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3A3D41, #2D2D30)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: '#858585',
    flexShrink: 0,
    border: '1px solid #3E3E3E'
  },
  colorSquare: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    border: '2px solid #3E3E3E',
    transition: 'border-color 0.2s ease, transform 0.15s ease'
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
    padding: '7px 10px',
    background: '#1E1E1E',
    border: '1px solid #3E3E3E',
    borderRadius: '7px',
    color: '#D4D4D4',
    fontSize: '12px',
    fontFamily: "'SF Mono', Consolas, monospace",
    outline: 'none',
    transition: 'border-color 0.2s ease',
    minWidth: '80px',
    letterSpacing: '0.5px'
  },
  positionInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative'
  },
  positionInput: {
    width: '54px',
    padding: '7px 20px 7px 8px',
    background: '#1E1E1E',
    border: '1px solid #3E3E3E',
    borderRadius: '7px',
    color: '#D4D4D4',
    fontSize: '12px',
    fontFamily: "'SF Mono', Consolas, monospace",
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
    width: '30px',
    height: '30px',
    borderRadius: '7px',
    border: '1px solid #3E3E42',
    background: '#3A3D41',
    color: '#858585',
    fontSize: '20px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontWeight: 300
  },
  removeButtonHover: {
    background: '#E74C3C',
    borderColor: '#E74C3C',
    color: '#fff',
    transform: 'scale(1.05)'
  }
};

export default ColorStopEditor;
