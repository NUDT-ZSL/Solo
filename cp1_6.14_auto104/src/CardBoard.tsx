import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import CardItem from './CardItem';
import { Card } from './types';
import './CardBoard.css';

const THROTTLE_MS = 16;

interface CardBoardProps {
  cards: Card[];
  onLike: (cardId: string) => void;
  onSort: (cards: Card[]) => void;
  onEnterGallery?: () => void;
  onExitGallery?: () => void;
  isGalleryMode: boolean;
  onGalleryModeChange: (isGallery: boolean) => void;
}

const CardBoard: React.FC<CardBoardProps> = ({
  cards,
  onLike,
  onSort,
  isGalleryMode,
  onGalleryModeChange,
}) => {
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const lastDragOverTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingDragOverRef = useRef<string | null>(null);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => a.order - b.order);
  }, [cards]);

  const throttledSetDragOver = useCallback((cardId: string | null) => {
    const now = performance.now();
    pendingDragOverRef.current = cardId;

    if (now - lastDragOverTimeRef.current >= THROTTLE_MS) {
      lastDragOverTimeRef.current = now;
      setDragOverCardId(cardId);
    } else if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        lastDragOverTimeRef.current = performance.now();
        setDragOverCardId(pendingDragOverRef.current);
        rafIdRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, card: Card) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    try {
      const target = e.currentTarget as HTMLElement;
      e.dataTransfer.setDragImage(target, target.offsetWidth / 2, target.offsetHeight / 2);
    } catch (_e) {
      // setDragImage not supported
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setDragOverCardId(null);
    lastDragOverTimeRef.current = 0;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragOverCard = useCallback(
    (e: React.DragEvent, cardId: string) => {
      e.preventDefault();
      if (draggedCard && draggedCard.id !== cardId) {
        throttledSetDragOver(cardId);
      }
    },
    [draggedCard, throttledSetDragOver]
  );

  const handleDropOnCard = useCallback(
    (e: React.DragEvent, targetCardId: string) => {
      e.preventDefault();
      if (!draggedCard || draggedCard.id === targetCardId) return;

      const newCards = [...sortedCards];
      const draggedIndex = newCards.findIndex((c) => c.id === draggedCard.id);
      const targetIndex = newCards.findIndex((c) => c.id === targetCardId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const [removed] = newCards.splice(draggedIndex, 1);
      newCards.splice(targetIndex, 0, removed);

      const reorderedCards = newCards.map((card, index) => ({
        ...card,
        order: index,
      }));

      onSort(reorderedCards);
      setDraggedCard(null);
      setDragOverCardId(null);
      lastDragOverTimeRef.current = 0;
    },
    [draggedCard, sortedCards, onSort]
  );

  const handlePrevCard = useCallback(() => {
    setGalleryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextCard = useCallback(() => {
    setGalleryIndex((prev) => Math.min(sortedCards.length - 1, prev + 1));
  }, [sortedCards.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isGalleryMode) return;
      if (e.key === 'ArrowLeft') handlePrevCard();
      if (e.key === 'ArrowRight') handleNextCard();
      if (e.key === 'Escape') onGalleryModeChange(false);
    },
    [isGalleryMode, handlePrevCard, handleNextCard, onGalleryModeChange]
  );

  const getGalleryCardStyle = (cardId: string): React.CSSProperties => {
    const idx = sortedCards.findIndex((c) => c.id === cardId);
    const offset = idx - galleryIndex;

    let translateX = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 3;

    if (offset === 0) {
      translateX = 0;
      scale = 1;
      opacity = 1;
      zIndex = 3;
    } else if (offset === -1) {
      translateX = -380;
      scale = 0.85;
      opacity = 0.6;
      zIndex = 2;
    } else if (offset === 1) {
      translateX = 380;
      scale = 0.85;
      opacity = 0.6;
      zIndex = 2;
    } else if (offset < -1) {
      translateX = -700;
      scale = 0.7;
      opacity = 0;
      zIndex = 1;
    } else {
      translateX = 700;
      scale = 0.7;
      opacity = 0;
      zIndex = 1;
    }

    return {
      transform: `translate3d(${translateX}px, 0, 0) scale(${scale})`,
      opacity,
      zIndex,
      willChange: 'transform, opacity',
    };
  };

  if (isGalleryMode) {
    return (
      <div
        className="gallery-overlay"
        onClick={() => onGalleryModeChange(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <button
          className="gallery-close"
          onClick={() => onGalleryModeChange(false)}
        >
          ✕
        </button>

        {sortedCards.length > 0 && galleryIndex > 0 && (
          <button
            className="gallery-nav gallery-prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevCard();
            }}
          >
            ‹
          </button>
        )}

        <div className="gallery-cards" onClick={(e) => e.stopPropagation()}>
          {sortedCards.map((card) => (
            <div
              key={card.id}
              className="gallery-card-wrapper"
              style={getGalleryCardStyle(card.id)}
            >
              <CardItem
                card={card}
                onLike={onLike}
                draggable={false}
                isGallery={true}
              />
            </div>
          ))}
        </div>

        {sortedCards.length > 0 && galleryIndex < sortedCards.length - 1 && (
          <button
            className="gallery-nav gallery-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNextCard();
            }}
          >
            ›
          </button>
        )}

        <div className="gallery-indicator">
          {galleryIndex + 1} / {sortedCards.length}
        </div>
      </div>
    );
  }

  return (
    <div
      className="card-board"
      onDragOver={handleDragOver}
    >
      {sortedCards.length === 0 ? (
        <div className="empty-state">
          <p>还没有灵感卡片</p>
          <p className="empty-hint">点击右上角 "+" 按钮创建第一张卡片</p>
        </div>
      ) : (
        <div className="card-grid">
          {sortedCards.map((card) => (
            <div
              key={card.id}
              className={`card-grid-item ${dragOverCardId === card.id ? 'drag-over' : ''} ${draggedCard?.id === card.id ? 'dragging' : ''}`}
              onDragOver={(e) => handleDragOverCard(e, card.id)}
              onDragLeave={() => setDragOverCardId(null)}
              onDrop={(e) => handleDropOnCard(e, card.id)}
            >
              <CardItem
                card={card}
                onLike={onLike}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                draggable={true}
              />
            </div>
          ))}
        </div>
      )}

      {sortedCards.length > 0 && (
        <button
          className="gallery-toggle-btn"
          onClick={() => onGalleryModeChange(true)}
        >
          🖼️ 画廊模式
        </button>
      )}
    </div>
  );
};

export default CardBoard;
