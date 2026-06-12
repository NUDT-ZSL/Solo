import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from 'react';
import {
  KeyframeNode,
  PropertyChange,
  EasingType,
  EASING_MAP,
  sortKeyframes,
  PROPERTY_DEFAULTS,
} from '../utils/animationEngine';

interface TimelineProps {
  keyframes: KeyframeNode[];
  selectedKeyframeId: string | null;
  currentTimePercent: number;
  onAddKeyframe: (timePercent: number) => void;
  onSelectKeyframe: (id: string | null) => void;
  onUpdateKeyframe: (id: string, updates: Partial<Omit<KeyframeNode, 'id'>>) => void;
  onDeleteKeyframe: (id: string) => void;
  onDuplicateKeyframe: (id: string) => void;
  onUpdateProperty: (
    keyframeId: string,
    propertyId: string,
    updates: Partial<PropertyChange>
  ) => void;
  onAddProperty: (
    keyframeId: string,
    property: PropertyChange['property']
  ) => void;
  onRemoveProperty: (keyframeId: string, propertyId: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  keyframeId: string | null;
}

const PROPERTY_OPTIONS: PropertyChange['property'][] = [
  'translateX',
  'translateY',
  'rotate',
  'scale',
  'opacity',
];

interface DraggingState {
  id: string;
  startClientX: number;
  startPercent: number;
  currentPercent: number;
  rafId: number | null;
  pendingPercent: number;
}

const KeyframeDot = memo(function KeyframeDot({
  kf,
  isSelected,
  onPointerDown,
  onContextMenu,
  onClick,
  dragPercent,
  isDragging,
}: {
  kf: KeyframeNode;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, kf: KeyframeNode) => void;
  onContextMenu: (e: React.MouseEvent, kf: KeyframeNode) => void;
  onClick: (e: React.MouseEvent, kf: KeyframeNode) => void;
  dragPercent: number | null;
  isDragging: boolean;
}) {
  const percent = isDragging && dragPercent != null ? dragPercent : kf.timePercent;

  return (
    <div
      data-keyframe-id={kf.id}
      onPointerDown={(e) => onPointerDown(e, kf)}
      onContextMenu={(e) => onContextMenu(e, kf)}
      onClick={(e) => onClick(e, kf)}
      style={{
        position: 'absolute',
        left: `${percent}%`,
        top: '50%',
        width: 12,
        height: 12,
        marginLeft: -6,
        marginTop: -6,
        borderRadius: '50%',
        background: isSelected ? '#6C63FF' : '#888888',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isSelected
          ? '0 0 12px rgba(108, 99, 255, 0.9), 0 0 4px rgba(108, 99, 255, 1)'
          : isDragging
          ? '0 4px 12px rgba(0, 0, 0, 0.6), 0 0 8px rgba(108, 99, 255, 0.5)'
          : '0 1px 3px rgba(0, 0, 0, 0.4)',
        transform: isDragging ? 'scale(1.3)' : isSelected ? 'scale(1.15)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease',
        touchAction: 'none',
        zIndex: isDragging ? 20 : isSelected ? 15 : 5,
        willChange: isDragging ? 'left, transform' : 'auto',
      }}
    >
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#6C63FF',
            color: '#fff',
            fontSize: 11,
            padding: '3px 7px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        >
          {percent.toFixed(1)}%
        </div>
      )}
    </div>
  );
});

export const Timeline: React.FC<TimelineProps> = ({
  keyframes,
  selectedKeyframeId,
  currentTimePercent,
  onAddKeyframe,
  onSelectKeyframe,
  onUpdateKeyframe,
  onDeleteKeyframe,
  onDuplicateKeyframe,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    keyframeId: null,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const draggingRef = useRef<DraggingState | null>(null);
  const [, forceRender] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPercentForId, setDragPercentForId] = useState<number | null>(null);

  const sortedKeyframes = useMemo(() => sortKeyframes(keyframes), [keyframes]);

  const getPercentFromClientX = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, ratio * 100));
  }, []);

  const commitDrag = useCallback(() => {
    const drag = draggingRef.current;
    if (!drag) return;
    const finalPct = Math.round(drag.pendingPercent * 10) / 10;
    onUpdateKeyframe(drag.id, { timePercent: finalPct });
    drag.rafId = null;
    draggingRef.current = null;
    setDraggingId(null);
    setDragPercentForId(null);
  }, [onUpdateKeyframe]);

  const scheduleRafUpdate = useCallback(() => {
    const drag = draggingRef.current;
    if (!drag || drag.rafId !== null) return;
    drag.rafId = requestAnimationFrame(() => {
      const d = draggingRef.current;
      if (!d) return;
      d.currentPercent = d.pendingPercent;
      setDragPercentForId(d.pendingPercent);
      forceRender((n) => n + 1);
      d.rafId = null;
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, kf: KeyframeNode) => {
      if (e.button === 2) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);

      onSelectKeyframe(kf.id);

      const startPct = kf.timePercent;
      draggingRef.current = {
        id: kf.id,
        startClientX: e.clientX,
        startPercent: startPct,
        currentPercent: startPct,
        pendingPercent: startPct,
        rafId: null,
      };
      setDraggingId(kf.id);
      setDragPercentForId(startPct);
    },
    [onSelectKeyframe]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const newPct = getPercentFromClientX(e.clientX);
      drag.pendingPercent = newPct;
      scheduleRafUpdate();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {}
      if (drag.rafId !== null) {
        cancelAnimationFrame(drag.rafId);
        drag.rafId = null;
      }
      commitDrag();
    };

    const handlePointerCancel = (e: PointerEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      if (drag.rafId !== null) {
        cancelAnimationFrame(drag.rafId);
      }
      draggingRef.current = null;
      setDraggingId(null);
      setDragPercentForId(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [getPercentFromClientX, scheduleRafUpdate, commitDrag]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, kf: KeyframeNode) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectKeyframe(kf.id);
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        keyframeId: kf.id,
      });
    },
    [onSelectKeyframe]
  );

  const handleClickDot = useCallback(
    (e: React.MouseEvent, kf: KeyframeNode) => {
      e.stopPropagation();
      if (!draggingRef.current) {
        onSelectKeyframe(kf.id);
      }
    },
    [onSelectKeyframe]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, keyframeId: null });
  }, []);

  useEffect(() => {
    if (!contextMenu.visible) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const menuEl = contextMenuRef.current;
      if (menuEl && !menuEl.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    document.addEventListener('touchstart', onDocMouseDown as any, true);
    document.addEventListener('keydown', onDocKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true);
      document.removeEventListener('touchstart', onDocMouseDown as any, true);
      document.removeEventListener('keydown', onDocKeyDown, true);
    };
  }, [contextMenu.visible, closeContextMenu]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    onSelectKeyframe(null);
  };

  const handleAddAtPlayhead = () => {
    onAddKeyframe(currentTimePercent);
  };

  const selectedKf = sortedKeyframes.find((k) => k.id === selectedKeyframeId);

  return (
    <div
      style={{
        background: '#16213E',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#E0E0E0', fontSize: 16, fontWeight: 600 }}>
          Timeline
        </h3>
        <button
          onClick={handleAddAtPlayhead}
          style={buttonStyle}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          + Add Keyframe @ {currentTimePercent.toFixed(1)}%
        </button>
      </div>

      <div
        ref={trackRef}
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          height: 72,
          borderRadius: 8,
          backgroundImage:
            'linear-gradient(to right, #2C2C54 1px, transparent 1px), linear-gradient(to bottom, #2C2C54 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          backgroundColor: '#0F1626',
          cursor: 'default',
          overflow: 'visible',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -20,
            color: '#8A8FBD',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          0%
        </div>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: -20,
            color: '#8A8FBD',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          100%
        </div>

        <div
          style={{
            position: 'absolute',
            left: `${currentTimePercent}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: '#FF6584',
            marginLeft: -1,
            boxShadow: '0 0 8px rgba(255, 101, 132, 0.7)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -6,
              left: -4,
              width: 10,
              height: 10,
              background: '#FF6584',
              borderRadius: '50%',
            }}
          />
        </div>

        {sortedKeyframes.map((kf) => (
          <KeyframeDot
            key={kf.id}
            kf={kf}
            isSelected={kf.id === selectedKeyframeId}
            isDragging={draggingId === kf.id}
            dragPercent={draggingId === kf.id ? dragPercentForId : null}
            onPointerDown={handlePointerDown}
            onContextMenu={handleContextMenu}
            onClick={handleClickDot}
          />
        ))}
      </div>

      {selectedKf && (
        <div
          style={{
            background: '#0F1626',
            borderRadius: 8,
            padding: 14,
            border: '1px solid #2C2C54',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#E0E0E0', fontWeight: 600 }}>
                Keyframe @ {selectedKf.timePercent.toFixed(1)}%
              </span>
              <label style={{ color: '#8A8FBD', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                Easing:
                <select
                  value={selectedKf.easing}
                  onChange={(e) =>
                    onUpdateKeyframe(selectedKf.id, { easing: e.target.value as EasingType })
                  }
                  style={selectStyle}
                >
                  {Object.entries(EASING_MAP).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onAddProperty(selectedKf.id, e.target.value as PropertyChange['property']);
                  e.target.value = '';
                }
              }}
              style={selectStyle}
            >
              <option value="">+ Add property</option>
              {PROPERTY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 10,
            }}
          >
            {selectedKf.properties.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#16213E',
                  borderRadius: 6,
                  padding: '8px 10px',
                }}
              >
                <span
                  style={{
                    color: '#6C63FF',
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 82,
                  }}
                >
                  {p.property}
                </span>
                <input
                  type="number"
                  step={p.property === 'opacity' ? 0.05 : p.property === 'scale' ? 0.1 : 1}
                  value={p.value}
                  onChange={(e) =>
                    onUpdateProperty(selectedKf.id, p.id, {
                      value: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={inputStyle}
                />
                {p.unit && (
                  <span style={{ color: '#8A8FBD', fontSize: 12 }}>{p.unit}</span>
                )}
                <button
                  onClick={() => onRemoveProperty(selectedKf.id, p.id)}
                  style={{
                    ...iconBtnStyle,
                    color: '#FF6584',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Remove property"
                >
                  ×
                </button>
              </div>
            ))}
            {selectedKf.properties.length === 0 && (
              <div style={{ color: '#8A8FBD', fontSize: 13, gridColumn: '1 / -1' }}>
                No properties — add one using the dropdown above.
              </div>
            )}
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#16213E',
            color: '#E0E0E0',
            borderRadius: 8,
            border: '1px solid #2C2C54',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            padding: 6,
            zIndex: 9999,
            minWidth: 170,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <MenuItem
            onClick={() => {
              if (contextMenu.keyframeId) onDuplicateKeyframe(contextMenu.keyframeId);
              closeContextMenu();
            }}
            label="Duplicate (+10%)"
          />
          <MenuItem
            onClick={() => {
              if (contextMenu.keyframeId) onDeleteKeyframe(contextMenu.keyframeId);
              closeContextMenu();
            }}
            label="Delete"
            danger
          />
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ onClick: () => void; label: string; danger?: boolean }> = ({
  onClick,
  label,
  danger,
}) => (
  <div
    onClick={onClick}
    style={{
      padding: '8px 12px',
      borderRadius: 6,
      cursor: 'pointer',
      color: danger ? '#FF6584' : '#E0E0E0',
      fontSize: 13,
      fontWeight: 500,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#2C2C54')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {label}
  </div>
);

const buttonStyle: React.CSSProperties = {
  background: '#6C63FF',
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  transition: 'transform 0.1s ease, background 0.15s ease',
  transform: 'scale(1)',
  fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
  background: '#0F1626',
  color: '#E0E0E0',
  border: '1px solid #2C2C54',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const inputStyle: React.CSSProperties = {
  background: '#0F1626',
  color: '#E0E0E0',
  border: '1px solid #2C2C54',
  borderRadius: 6,
  padding: '6px 8px',
  width: 80,
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: 24,
  height: 24,
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};
