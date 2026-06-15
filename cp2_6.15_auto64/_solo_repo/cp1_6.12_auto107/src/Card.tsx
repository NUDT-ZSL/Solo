import React, { useRef, useState, useEffect, useCallback } from 'react';
import { NoteCard, CATEGORY_COLORS, CARD_WIDTH, CARD_MIN_HEIGHT } from './types';
import { getGroupBoundingBox, detectSnap, highlightText } from './utils';

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
  const currentPosRef = useRef({ x: card.x, y: card.y });
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const allCardsRef = useRef(allCards);
  const cardRef_data = useRef(card);

  useEffect(() => {
    allCardsRef.current = allCards;
  }, [allCards]);

  useEffect(() => {
    cardRef_data.current = card;
  }, [card]);

  useEffect(() => {
    if (!isDragging) {
      setCurrentPos({ x: card.x, y: card.y });
      currentPosRef.current = { x: card.x, y: card.y };
    }
  }, [card.x, card.y, isDragging]);

  const applyPositionUpdate = useCallback(() => {
    if (pendingPosRef.current && isDraggingRef.current) {
      const pos = pendingPosRef.current;
      setCurrentPos(pos);
      currentPosRef.current = pos;
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

    const finalX = pendingPosRef.current?.x ?? currentPosRef.current.x;
    const finalY = pendingPosRef.current?.y ?? currentPosRef.current.y;
    pendingPosRef.current = null;

    const currentCard = cardRef_data.current;
    const currentAllCards = allCardsRef.current;

    const currentBox = getGroupBoundingBox(currentCard.id, currentAllCards);
    const movedBox = {
      left: currentBox.left + (finalX - currentCard.x),
      right: currentBox.right + (finalX - currentCard.x),
      top: currentBox.top + (finalY - currentCard.y),
      bottom: currentBox.bottom + (finalY - currentCard.y),
    };

    const snapResult = detectSnap(movedBox, currentAllCards, currentAllCards, currentCard.id);

    if (snapResult) {
      const snapTargetX = finalX + snapResult.dx;
      const snapTargetY = finalY + snapResult.dy;

      const startTime = performance.now();
      const startX = finalX;
      const startY = finalY;

      const animateSnap = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const duration = 200;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const animatedX = startX + (snapTargetX - startX) * easeOut;
        const animatedY = startY + (snapTargetY - startY) * easeOut;

        setCurrentPos({ x: animatedX, y: animatedY });
        currentPosRef.current = { x: animatedX, y: animatedY };

        if (progress < 1) {
          requestAnimationFrame(animateSnap);
        } else {
          setCurrentPos({ x: snapTargetX, y: snapTargetY });
          currentPosRef.current = { x: snapTargetX, y: snapTargetY };
          onDragEnd(currentCard.id, snapTargetX, snapTargetY);
          onLink(currentCard.id, snapResult.targetId);
        }
      };

      requestAnimationFrame(animateSnap);
    } else {
      onDragEnd(currentCard.id, finalX, finalY);
    }

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [onDragEnd, onLink, handleMouseMove]);

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
      cardX: currentPosRef.current.x,
      cardY: currentPosRef.current.y,
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
