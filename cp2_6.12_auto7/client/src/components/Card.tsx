import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Card as CardType, CardColor, OnlineUser } from '../types';

const COLORS: CardColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

interface CardProps {
  card: CardType;
  selfUserId: string;
  editingUsers: OnlineUser[];
  zIndex: number;
  onUpdate: (cardId: string, changes: Partial<CardType>) => void;
  onDelete: (cardId: string) => void;
  onVote: (cardId: string, vote: 'up' | 'down' | null) => void;
  onDragStart: (cardId: string) => void;
  onDragEnd: (cardId: string, x: number, y: number) => void;
  onEditing: (cardId: string | null) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export default function Card({
  card,
  selfUserId,
  editingUsers,
  zIndex,
  onUpdate,
  onDelete,
  onVote,
  onDragStart,
  onDragEnd,
  onEditing,
  snapToGrid,
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [myVote, setMyVote] = useState<'up' | 'down' | null>(
    card.votes.up.includes(selfUserId) ? 'up' : card.votes.down.includes(selfUserId) ? 'down' : null
  );
  const [rippleKey, setRippleKey] = useState(0);
  const dragStartPos = useRef<{ x: number; y: number; cardX: number; cardY: number } | null>(null);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
    setMyVote(
      card.votes.up.includes(selfUserId) ? 'up' : card.votes.down.includes(selfUserId) ? 'down' : null
    );
  }, [card.title, card.description, card.votes, selfUserId]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    onDragStart(card.id);
    dragStartPos.current = {
      x: clientX,
      y: clientY,
      cardX: card.x,
      cardY: card.y,
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!dragStartPos.current || !cardRef.current) return;
      const mx = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const my = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const dx = mx - dragStartPos.current.x;
      const dy = my - dragStartPos.current.y;
      const newX = dragStartPos.current.cardX + dx;
      const newY = dragStartPos.current.cardY + dy;
      cardRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(1.02) rotate(1deg)`;
      cardRef.current.style.transition = 'none';
    };

    const handleUp = (upEvent: MouseEvent | TouchEvent) => {
      if (!dragStartPos.current || !cardRef.current) return;
      const ux = 'changedTouches' in upEvent ? upEvent.changedTouches[0].clientX : upEvent.clientX;
      const uy = 'changedTouches' in upEvent ? upEvent.changedTouches[0].clientY : upEvent.clientY;
      const dx = ux - dragStartPos.current.x;
      const dy = uy - dragStartPos.current.y;
      let finalX = dragStartPos.current.cardX + dx;
      let finalY = dragStartPos.current.cardY + dy;
      const snapped = snapToGrid(finalX, finalY);
      finalX = snapped.x;
      finalY = snapped.y;

      cardRef.current.style.transition = '';
      cardRef.current.style.transform = `translate(${finalX}px, ${finalY}px)`;

      setIsDragging(false);
      onDragEnd(card.id, finalX, finalY);
      dragStartPos.current = null;

      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }, [card.id, card.x, card.y, onDragStart, onDragEnd, snapToGrid]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 50);
    setTitle(val);
  };

  const handleTitleBlur = () => {
    if (title !== card.title) {
      onUpdate(card.id, { title });
    }
    onEditing(null);
  };

  const handleTitleFocus = () => {
    onEditing(card.id);
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 500);
    setDescription(val);
  };

  const handleDescBlur = () => {
    if (description !== card.description) {
      onUpdate(card.id, { description });
    }
    onEditing(null);
  };

  const handleDescFocus = () => {
    onEditing(card.id);
  };

  const handleColorClick = (color: CardColor) => {
    onUpdate(card.id, { color });
  };

  const handleVote = (vote: 'up' | 'down') => {
    setRippleKey((k) => k + 1);
    const newVote = myVote === vote ? null : vote;
    setMyVote(newVote);
    onVote(card.id, newVote);
  };

  const upCount = card.votes.up.length;
  const downCount = card.votes.down.length;
  const totalVotes = Math.max(upCount + downCount, 1);
  const upPercent = (upCount / totalVotes) * 100;
  const downPercent = (downCount / totalVotes) * 100;

  const hasEditingUser = editingUsers.length > 0;
  const editingColor = editingUsers[0]?.avatarColor || '#667eea';

  return (
    <div
      ref={cardRef}
      className={`card color-${card.color} ${isDragging ? 'dragging' : ''} ${hasEditingUser ? 'editing-glow' : ''}`}
      style={{
        transform: `translate(${card.x}px, ${card.y}px)`,
        zIndex: isDragging ? 1000 : zIndex,
        ['--editing-color' as any]: editingColor,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <div className="card-header">
        <textarea
          className="card-title"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onFocus={handleTitleFocus}
          placeholder="输入标题（最多50字）"
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = t.scrollHeight + 'px';
          }}
        />
        <button
          className="card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          title="删除卡片"
        >
          ✕
        </button>
      </div>

      <div className="card-body">
        <textarea
          className="card-description"
          value={description}
          onChange={handleDescChange}
          onBlur={handleDescBlur}
          onFocus={handleDescFocus}
          placeholder="输入描述（最多500字）"
          rows={3}
        />
      </div>

      <div className="card-color-picker">
        {COLORS.map((c) => (
          <div
            key={c}
            className={`color-option color-${c} ${card.color === c ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleColorClick(c);
            }}
          />
        ))}
      </div>

      <div className="card-footer">
        <div className="vote-buttons">
          <button
            className={`vote-btn vote-up ${myVote === 'up' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVote('up');
            }}
            title="赞成"
          >
            ▲
            {rippleKey > 0 && myVote === 'up' && (
              <span key={rippleKey} className="vote-ripple" style={{ width: 36, height: 36, left: 0, top: 0 }} />
            )}
          </button>
          <button
            className={`vote-btn vote-down ${myVote === 'down' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVote('down');
            }}
            title="反对"
          >
            ▼
            {rippleKey > 0 && myVote === 'down' && (
              <span key={'d' + rippleKey} className="vote-ripple" style={{ width: 36, height: 36, left: 0, top: 0 }} />
            )}
          </button>
        </div>
        <div className="vote-bars">
          <div className="vote-bar-row">
            <div className="vote-bar">
              <div className="vote-bar-fill-up" style={{ width: upPercent + '%' }} />
            </div>
            <span className="vote-count up">{upCount}</span>
          </div>
          <div className="vote-bar-row">
            <div className="vote-bar">
              <div className="vote-bar-fill-down" style={{ width: downPercent + '%' }} />
            </div>
            <span className="vote-count down">{downCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
