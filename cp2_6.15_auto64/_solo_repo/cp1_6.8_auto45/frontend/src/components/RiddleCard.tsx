import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Riddle } from '../types';

interface RiddleCardProps {
  riddle: Riddle;
  solved: boolean;
  liked: boolean;
  likeCount: number;
  onDragStart: (riddle: Riddle, el: HTMLDivElement) => void;
  onDragEnd: () => void;
  onLike: (riddleId: number) => void;
  wrong: boolean;
}

export default function RiddleCard({
  riddle,
  solved,
  liked,
  likeCount,
  onDragStart,
  onDragEnd,
  onLike,
  wrong,
}: RiddleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (solved) return;
      e.preventDefault();
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      originRef.current = { x: rect.left, y: rect.top };
      posRef.current = { x: 0, y: 0 };
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragging(true);
      onDragStart(riddle, cardRef.current!);
    },
    [solved, riddle, onDragStart]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (solved) return;
      const touch = e.touches[0];
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      originRef.current = { x: rect.left, y: rect.top };
      posRef.current = { x: 0, y: 0 };
      setOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
      setDragging(true);
      onDragStart(riddle, cardRef.current!);
    },
    [solved, riddle, onDragStart]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - originRef.current.x - offset.x;
      const dy = clientY - originRef.current.y - offset.y;
      posRef.current = {
        x: dx * 0.35,
        y: dy * 0.35,
      };
      if (cardRef.current) {
        cardRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    };

    const handleUp = () => {
      setDragging(false);
      onDragEnd();
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cardRef.current.style.transform = 'translate(0px, 0px)';
        setTimeout(() => {
          if (cardRef.current) {
            cardRef.current.style.transition = '';
          }
        }, 500);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, offset, onDragEnd]);

  return (
    <div
      ref={cardRef}
      className={`riddle-card ${solved ? 'solved' : ''} ${wrong ? 'wrong' : ''} ${dragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ cursor: solved ? 'default' : 'grab', touchAction: 'none' }}
    >
      <div className="riddle-category">{riddle.category}</div>
      <div className="riddle-text">{riddle.riddle}</div>
      {riddle.hint && !solved && (
        <div className="riddle-hint">💡 {riddle.hint}</div>
      )}
      {solved && (
        <div className="riddle-solved-badge">✓ 已解</div>
      )}
      {solved && (
        <button
          className={`like-btn ${liked ? 'liked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onLike(riddle.id);
          }}
        >
          👍 {likeCount}
        </button>
      )}
      {solved && likeCount > 0 && (
        <div className="like-ring" />
      )}
    </div>
  );
}
