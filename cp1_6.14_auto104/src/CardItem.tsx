import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CARD_TYPE_CONFIG } from './types';
import './CardItem.css';

interface CardItemProps {
  card: Card;
  onLike: (cardId: string) => void;
  onDragStart?: (e: React.DragEvent, card: Card) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, cardId: string) => void;
  draggable?: boolean;
  isGallery?: boolean;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  onLike,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggable = true,
  isGallery = false,
}) => {
  const [likeAnimating, setLikeAnimating] = useState(false);
  const typeConfig = CARD_TYPE_CONFIG[card.type];

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnimating(true);
    onLike(card.id);
    setTimeout(() => setLikeAnimating(false), 200);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, card);
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  };

  const renderCardContent = () => {
    switch (card.type) {
      case 'link':
        return (
          <div className="card-link-content">
            {card.title && <h3 className="card-title">{card.title}</h3>}
            {card.description && <p className="card-description">{card.description}</p>}
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-link-url"
                onClick={(e) => e.stopPropagation()}
              >
                {card.url}
              </a>
            )}
          </div>
        );
      case 'image':
        return (
          <div className="card-image-content">
            {card.imageUrl && (
              <img src={card.imageUrl} alt={card.title || '图片'} className="card-image" />
            )}
            {card.title && <p className="card-image-title">{card.title}</p>}
          </div>
        );
      case 'text':
        return (
          <div className="card-text-content">
            {card.content && (
              <div className="card-markdown">
                <ReactMarkdown>{card.content}</ReactMarkdown>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`card-item ${card.liked ? 'liked' : ''} ${isGallery ? 'gallery' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, card.id)}
    >
      <div className="card-type-icon" style={{ backgroundColor: typeConfig.color }}>
        {typeConfig.icon}
      </div>
      <div className="card-body">{renderCardContent()}</div>
      <div className="card-footer">
        <button
          className={`like-button ${likeAnimating ? 'animating' : ''}`}
          onClick={handleLike}
          style={{ color: card.liked ? '#e74c3c' : '#adb5bd' }}
        >
          <span className="heart-icon">{card.liked ? '❤️' : '🤍'}</span>
          <span className="like-count">{card.likes}</span>
        </button>
      </div>
    </div>
  );
};

export default CardItem;
