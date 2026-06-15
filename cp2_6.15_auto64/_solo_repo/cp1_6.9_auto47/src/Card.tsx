import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Card.css';

export interface CardProps {
  id: string;
  text: string;
  index: number;
  highlightIndices: number[];
  burnProgress: number;
  isBurning: boolean;
  isBurned: boolean;
  absorbed: boolean;
  onDragStart: (id: string, e: { clientX: number; clientY: number }) => void;
  onDragMove: (id: string, e: { clientX: number; clientY: number }) => void;
  onDragEnd: (id: string, e: { clientX: number; clientY: number }) => void;
  absorbedPosition: { x: number; y: number } | null;
}

const POEMS_PREFIX = ['壹', '贰', '叁', '肆', '伍', '陆'];

export const Card: React.FC<CardProps> = ({
  id,
  text,
  index,
  highlightIndices,
  burnProgress,
  isBurning,
  isBurned,
  absorbed,
  onDragStart,
  onDragMove,
  onDragEnd,
  absorbedPosition,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inFlame, setInFlame] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isBurning || isBurned) return;
      e.preventDefault();
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onDragStart(id, { clientX: e.clientX, clientY: e.clientY });
    },
    [id, isBurning, isBurned, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      onDragMove(id, { clientX: e.clientX, clientY: e.clientY });

      const flameZone = document.getElementById('flame-zone');
      if (flameZone) {
        const r = flameZone.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        setInFlame(inside);
      }
    },
    [id, isDragging, onDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      onDragEnd(id, { clientX: e.clientX, clientY: e.clientY });
      setTimeout(() => setInFlame(false), 2000);
    },
    [id, isDragging, onDragEnd]
  );

  useEffect(() => {
    if (isBurning) setInFlame(true);
  }, [isBurning]);

  const chars = [...text];
  const highlightSet = new Set(highlightIndices);

  const clipPath = (() => {
    const p = Math.min(1, burnProgress);
    const topShrink = p * 0.42;
    const topLeftX = topShrink;
    const topRightX = 1 - topShrink;
    return `polygon(${topLeftX * 100}% 0%, ${topRightX * 100}% 0%, 100% 100%, 0% 100%)`;
  })();

  const cardStyle: React.CSSProperties = absorbedPosition && absorbed
    ? {
        position: 'fixed',
        left: absorbedPosition.x,
        top: absorbedPosition.y,
        transform: `translateY(${burnProgress * 60}px)`,
        clipPath,
        transition: isDragging ? 'none' : 'left 0.35s cubic-bezier(.25,.8,.25,1), top 0.35s cubic-bezier(.25,.8,.25,1), transform 0.08s linear',
        opacity: isBurned ? 0 : 1,
        zIndex: 80,
        pointerEvents: isBurning || isBurned ? 'none' : 'auto',
      }
    : {
        position: 'relative',
        clipPath: isBurning ? clipPath : undefined,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.5s ease',
        opacity: isBurned ? 0 : 1,
        pointerEvents: isBurning || isBurned ? 'none' : 'auto',
      };

  if (isBurned && burnProgress >= 1) {
    return null;
  }

  return (
    <div
      ref={cardRef}
      className={`paper-card ${isDragging ? 'dragging' : ''} ${inFlame || isBurning ? 'in-flame' : ''} ${isBurning ? 'burning' : ''}`}
      style={cardStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      data-card-id={id}
    >
      <div className="card-inner">
        <div className="card-corner corner-tl"></div>
        <div className="card-corner corner-tr"></div>
        <div className="card-corner corner-bl"></div>
        <div className="card-corner corner-br"></div>
        <div className="card-fiber"></div>

        <div className="card-header">
          <span className="card-seal">{POEMS_PREFIX[index % 6]}</span>
        </div>

        <div className="card-poem">
          {chars.map((ch, i) => (
            <span
              key={i}
              className={`poem-char ${highlightSet.has(i) ? 'char-highlight' : ''} ${highlightSet.has(i) && isBurning ? 'char-shatter' : ''}`}
            >
              {ch === '\n' ? <br /> : ch}
            </span>
          ))}
        </div>

        <div className="card-footer">
          <span className="card-stamp">余烬</span>
        </div>
      </div>
    </div>
  );
};

export default Card;
