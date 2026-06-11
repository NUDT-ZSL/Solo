import { useState, useEffect, useRef, useCallback } from 'react';
import type { ToolType, ConnectedUser } from './types';

interface ToolbarProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
  color: string;
  setColor: (c: string) => void;
  lineWidth: number;
  setLineWidth: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  colors: string[];
  connected: boolean;
  users: ConnectedUser[];
  currentUserId: string;
  currentUserColor: string;
}

const TOOLS: Array<{ id: ToolType; icon: JSX.Element; label: string }> = [
  {
    id: 'brush',
    label: '画笔',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
        <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: '矩形',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: '圆形',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: '文字',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: '橡皮擦',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14 2.2c.8-.8 2-.8 2.8 0l4 4c.8.8.8 2 0 2.8L11 20" />
        <line x1="18" y1="13" x2="9" y2="4" />
      </svg>
    ),
  },
];

const UNDO_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
  </svg>
);

const REDO_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
  </svg>
);

function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  colors,
  connected,
  users,
  currentUserId,
  currentUserColor,
}: ToolbarProps) {
  const [bouncingTool, setBouncingTool] = useState<ToolType | null>(tool);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setBouncingTool(tool);
    const t = setTimeout(() => setBouncingTool(null), 300);
    return () => clearTimeout(t);
  }, [tool]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPalette(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSliderClick = useCallback(
    (e: React.MouseEvent) => {
      const track = sliderRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const v = Math.round(1 + pct * 19);
      setLineWidth(v);
      setDragging(true);
    },
    [setLineWidth]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const track = sliderRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const v = Math.round(1 + pct * 19);
      setLineWidth(v);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, setLineWidth]);

  const sliderPct = ((lineWidth - 1) / 19) * 100;

  const ToolbarContent = (
    <>
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`toolbar-btn ${tool === t.id ? 'active' : ''} ${bouncingTool === t.id ? 'tool-bounce' : ''}`}
          title={t.label}
          onClick={() => setTool(t.id)}
          type="button"
        >
          {t.icon}
        </button>
      ))}

      <div className="divider" />

      <div style={{ position: 'relative' }}>
        <div
          className="color-picker-wrapper"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
            border: '2px solid rgba(255,255,255,0.9)',
          }}
          onClick={() => setShowPalette((p) => !p)}
          title="选择颜色"
        />
        {showPalette && (
          <div
            ref={paletteRef}
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: 12,
              borderRadius: 14,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              width: 220,
              zIndex: 300,
              animation: 'fade-in 0.2s ease-out',
            }}
          >
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setShowPalette(false);
                }}
                title={c}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 50,
                  background: c,
                  border:
                    c.toLowerCase() === color.toLowerCase()
                      ? '3px solid #5b6de0'
                      : c === '#ffffff'
                      ? '2px solid #d0d0e0'
                      : '2px solid rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  boxShadow: c === '#ffffff' ? 'inset 0 1px 2px rgba(0,0,0,0.06)' : '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingTop: 8,
                borderTop: '1px solid rgba(91,109,224,0.12)',
                marginTop: 4,
              }}
            >
              <div className="color-picker-wrapper" style={{ width: 30, height: 30, borderRadius: 8 }}>
                <input
                  type="color"
                  className="color-picker-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <span style={{ fontSize: 12, color: '#5a5a7a', fontFamily: 'monospace' }}>{color.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="slider-container">
        <div className="slider-preview" title={`粗细 ${lineWidth}px`}>
          <div
            style={{
              width: lineWidth,
              height: lineWidth,
              borderRadius: lineWidth,
              background: color,
              minWidth: 2,
              minHeight: 2,
              boxShadow: `0 0 4px ${color}80`,
            }}
          />
        </div>
        <div className="slider-track" ref={sliderRef} onMouseDown={handleSliderClick}>
          <div
            className="slider-thumb"
            style={{ left: `${sliderPct}%` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragging(true);
            }}
          />
        </div>
        <span
          style={{
            fontSize: 11,
            color: '#6a6a8a',
            fontWeight: 600,
            minWidth: 24,
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
        >
          {lineWidth}
        </span>
      </div>

      <div className="divider" />

      <button className="action-btn" onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)" type="button">
        {UNDO_ICON}
        撤销
      </button>
      <button className="action-btn" onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Y)" type="button">
        {REDO_ICON}
        重做
      </button>
    </>
  );

  return (
    <>
      {!isMobile ? (
        <div className="top-toolbar glass-panel">{ToolbarContent}</div>
      ) : (
        <>
          <button
            className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((m) => !m)}
            type="button"
            aria-label="菜单"
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && <div className="mobile-menu glass-panel">{ToolbarContent}</div>}
        </>
      )}

      <div style={{ display: 'none' }}>
        {connected}
        {currentUserId}
        {currentUserColor}
        {users.length}
      </div>
    </>
  );
}

export default Toolbar;
