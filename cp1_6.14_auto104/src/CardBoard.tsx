import React, { useState, useCallback, useMemo } from 'react';
import CardItem from './CardItem';
import { Card } from './types';
import './CardBoard.css';

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
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => a.order - b.order);
  }, [cards]);

  const handleDragStart = useCallback((e: React.DragEvent, card: Card) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setDragOverCardId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragOverCard = useCallback(
    (e: React.DragEvent, cardId: string) => {
      e.preventDefault();
      if (draggedCard && draggedCard.id !== cardId) {
        setDragOverCardId(cardId);
      }
    },
    [draggedCard]
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
    },
    [draggedCard, sortedCards, onSort]
  );

  const handlePrevCard = useCallback(() => {
    if (galleryIndex > 0) {
      setSlideDirection('left');
      setGalleryIndex(galleryIndex - 1);
    }
  }, [galleryIndex]);

  const handleNextCard = useCallback(() => {
    if (galleryIndex < sortedCards.length - 1) {
      setSlideDirection('right');
      setGalleryIndex(galleryIndex + 1);
    }
  }, [galleryIndex, sortedCards.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isGalleryMode) return;
      if (e.key === 'ArrowLeft') handlePrevCard();
      if (e.key === 'ArrowRight') handleNextCard();
      if (e.key === 'Escape') onGalleryModeChange(false);
    },
    [isGalleryMode, handlePrevCard, handleNextCard, onGalleryModeChange]
  );

  const getVisibleCards = () => {
    if (sortedCards.length === 0) return [];
    const visible: Card[] = [];
    const startIdx = Math.max(0, galleryIndex - 1);
    const endIdx = Math.min(sortedCards.length, galleryIndex + 2);
    for (let i = startIdx; i < endIdx; i++) {
      if (i >= 0 && i < sortedCards.length) {
        visible.push(sortedCards[i]);
      }
    }
    return visible;
  };

  const getCardPositionClass = (index: number) => {
    const offset = index - galleryIndex;
    if (offset === -1) return 'gallery-left';
    if (offset === 0) return 'gallery-center';
    if (offset === 1) return 'gallery-right';
    return 'gallery-hidden';
  };

  if (isGalleryMode) {
    const visibleCards = getVisibleCards();
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
          {visibleCards.map((card, idx) => {
            const actualIndex = sortedCards.findIndex((c) => c.id === card.id);
            return (
              <div
                key={card.id}
                className={`gallery-card-wrapper ${getCardPositionClass(actualIndex)} ${slideDirection === 'right' ? 'slide-right' : 'slide-left'}`}
              >
                <CardItem
                  card={card}
                  onLike={onLike}
                  draggable={false}
                  isGallery={true}
                />
              </div>
            );
          })}
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
