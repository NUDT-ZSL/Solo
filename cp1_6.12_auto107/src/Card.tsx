import React, { useRef, useState, useEffect, useCallback } from 'react';
import { NoteCard, CATEGORY_COLORS, CARD_WIDTH, CARD_MIN_HEIGHT } from './types';
import { getGroupBoundingBox, detectSnap, highlightText, getGroupMembers } from './utils';

interface CardProps {
  card: NoteCard;
  allCards: NoteCard[];
  onDragEnd: (cardId: string, x: number, y: number) => void;
  onDelete: (cardId: string) => void;
  searchKeyword: string;
  isMatched: boolean;
  onLink: (cardId1: string, cardId2: string) => void;
}

const Card: React.FC<CardProps> = ({
  card,
  allCards,
  onDragEnd,
  onDelete,
  searchKeyword,
  isMatched,
  onLink,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: card.x, y: card.y });
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDragging) {
      setCurrentPos({ x: card.x, y: card.y });
    }
  }, [card.x, card.y, isDragging]);

  const applyPositionUpdate = useCallback(() => {
    if (pendingPosRef.current && isDraggingRef.current) {
      setCurrentPos(pendingPosRef.current);
      pendingPosRef.current = null;
    }
    animationFrameRef.current = null;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const newX = dragStartRef.current.cardX + (e.clientX - dragStartRef.current.mouseX);
    const newY = dragStartRef.current.cardY + (e.clientY - dragStartRef.current.mouseY);

    pendingPosRef.current = { x: newX, y: newY };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(applyPositionUpdate);
    }
  }, [applyPositionUpdate]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    let finalX = pendingPosRef.current?.x ?? currentPos.x;
    let finalY = pendingPosRef.current?.y ?? currentPos.y;
    pendingPosRef.current = null;

    const startTime = performance.now();
    const startX = currentPos.x;
    const startY = currentPos.y;

    const currentBox = getGroupBoundingBox(card.id, allCards);
    const movedBox = {
      left: currentBox.left + (finalX - card.x),
      right: currentBox.right + (finalX - card.x),
      top: currentBox.top + (finalY - card.y),
      bottom: currentBox.bottom + (finalY - card.y),
    };

    const snapResult = detectSnap(movedBox, allCards, allCards, card.id);

    if (snapResult) {
      const snapTargetX = finalX + snapResult.dx;
      const snapTargetY = finalY + snapResult.dy;

      const animateSnap = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const duration = 200;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const animatedX = startX + (snapTargetX - startX) * easeOut;
        const animatedY = startY + (snapTargetY - startY) * easeOut;

        setCurrentPos({ x: animatedX, y: animatedY });

        if (progress < 1) {
          requestAnimationFrame(animateSnap);
        } else {
          setCurrentPos({ x: snapTargetX, y: snapTargetY });
          onDragEnd(card.id, snapTargetX, snapTargetY);
          onLink(card.id, snapResult.targetId);
        }
      };

      requestAnimationFrame(animateSnap);
    } else {
      setCurrentPos({ x: finalX, y: finalY });
      onDragEnd(card.id, finalX, finalY);
    }

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [card, allCards, currentPos, onDragEnd, onLink, handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.btn-delete')) return;

    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: currentPos.x,
      cardY: currentPos.y,
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(card.id);
  };

  const categoryColor = CATEGORY_COLORS[card.category] || '#999';

  const renderHighlightedText = (text: string) => {
    const highlightedHtml = highlightText(text, searchKeyword);
    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
  };

  return (
    <div
      ref={cardRef}
      className={`card ${isDragging ? 'dragging' : ''} ${isMatched ? 'matched' : ''}`}
      style={{
        left: currentPos.x,
        top: currentPos.y,
        width: CARD_WIDTH,
        minHeight: CARD_MIN_HEIGHT,
        borderLeftColor: categoryColor,
        transition: isDragging ? 'none' : 'left 200ms ease-out, top 200ms ease-out, transform 200ms ease, box-shadow 200ms ease',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="card-header">
        <div className="card-title">
          {renderHighlightedText(card.title)}
        </div>
        <button className="btn-delete" onClick={handleDelete}>
          删除
        </button>
      </div>
      <div className="card-content">
        {renderHighlightedText(card.content)}
      </div>
      <div className="card-category">{card.category}</div>
    </div>
  );
};

export default Card;
