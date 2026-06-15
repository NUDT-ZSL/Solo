import React, { useState, useRef } from 'react';
import type { Card, EmotionType } from './types';
import { EMOTIONS, EMOTION_COLORS } from './types';
import { formatDate, getEmotionColor } from './utils';

interface CardPanelProps {
  cards: Card[];
  visibleCardIds: Set<string>;
  selectedCardId: string | null;
  filterEmotion: EmotionType | 'all';
  onFilterChange: (emotion: EmotionType | 'all') => void;
  onSelectCard: (card: Card) => void;
  onReorder: (orderedIds: string[]) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const CardPanel: React.FC<CardPanelProps> = ({
  cards,
  visibleCardIds,
  selectedCardId,
  filterEmotion,
  onFilterChange,
  onSelectCard,
  onReorder,
  isMobileOpen,
  onMobileClose
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragStartIndex = useRef<number>(-1);

  const filteredCards = cards.filter((card) => {
    if (filterEmotion === 'all') return true;
    return card.emotion === filterEmotion;
  });

  const handleDragStart = (e: React.DragEvent, card: Card, index: number) => {
    setDraggedId(card.id);
    dragStartIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (cardId !== draggedId && cardId !== dragOverId) {
      setDragOverId(cardId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCard: Card, targetIndex: number) => {
    e.preventDefault();
    setDraggedId(null);
    setDragOverId(null);

    if (draggedId === targetCard.id) return;

    const newCards = [...filteredCards];
    const sourceIndex = dragStartIndex.current;
    if (sourceIndex < 0) return;

    const [removed] = newCards.splice(sourceIndex, 1);
    newCards.splice(targetIndex, 0, removed);

    const newOrderedIds = newCards.map((c) => c.id);
    const allIds = cards.map((c) => c.id);
    const finalOrder = [
      ...newOrderedIds,
      ...allIds.filter((id) => !newOrderedIds.includes(id))
    ];
    onReorder(finalOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    dragStartIndex.current = -1;
  };

  return (
    <div className={`card-panel ${isMobileOpen ? 'mobile-open' : ''}`}>
      {isMobileOpen && (
        <div className="mobile-close-btn" onClick={onMobileClose}>
          ✕
        </div>
      )}

      <div className="panel-header">
        <h2 className="panel-title">📸 旅途记忆</h2>
        <span className="card-count">{cards.length} 张卡片</span>
      </div>

      <div className="filter-section">
        <label className="filter-label">情感筛选</label>
        <div className="emotion-filters">
          <button
            className={`filter-chip ${filterEmotion === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
            style={{ '--chip-color': '#888' } as React.CSSProperties}
          >
            全部
          </button>
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              className={`filter-chip ${filterEmotion === emotion ? 'active' : ''}`}
              onClick={() => onFilterChange(emotion)}
              style={{ '--chip-color': EMOTION_COLORS[emotion] } as React.CSSProperties}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div className="card-list">
        {filteredCards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <p>暂无卡片</p>
            <p className="empty-hint">点击左上角按钮上传第一张记忆卡片</p>
          </div>
        ) : (
          filteredCards.map((card, index) => {
            const isVisible = visibleCardIds.has(card.id);
            const isSelected = selectedCardId === card.id;

            return (
              <div
                key={card.id}
                className={`card-item 
                  ${draggedId === card.id ? 'dragging' : ''} 
                  ${dragOverId === card.id ? 'drag-over' : ''}
                  ${isSelected ? 'selected' : ''}
                  ${!isVisible ? 'dimmed' : ''}`}
                draggable
                onClick={() => {
                  onSelectCard(card);
                  if (isMobileOpen) {
                    setTimeout(onMobileClose, 300);
                  }
                }}
                onDragStart={(e) => handleDragStart(e, card, index)}
                onDragOver={(e) => handleDragOver(e, card.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, card, index)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="card-color-bar"
                  style={{ backgroundColor: card.dominantColor }}
                />
                <div className="card-thumb-wrapper">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.title}
                      className="card-thumb"
                      draggable={false}
                    />
                  ) : (
                    <div className="card-thumb-placeholder">📷</div>
                  )}
                  <span
                    className="thumb-emotion"
                    style={{ backgroundColor: getEmotionColor(card.emotion) }}
                  >
                    {card.emotion}
                  </span>
                </div>
                <div className="card-info">
                  <h4 className="card-title" title={card.title}>
                    {card.title}
                  </h4>
                  <div className="card-meta">
                    <span className="meta-city">📍 {card.city}</span>
                    <span className="meta-date">{formatDate(card.date)}</span>
                  </div>
                  {card.note && (
                    <p className="card-note" title={card.note}>
                      {card.note.length > 40
                        ? card.note.slice(0, 40) + '...'
                        : card.note}
                    </p>
                  )}
                </div>
                <div className="drag-handle" title="拖拽排序">⋮⋮</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CardPanel;
