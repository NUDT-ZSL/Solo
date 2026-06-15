import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardData } from '../utils/similarity';

export interface CardProps {
  card: CardData;
  isSelected: boolean;
  isFiltered: boolean;
  isHighlighted: boolean;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
  onDelete: (id: string) => void;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 180;

export const Card: React.FC<CardProps> = ({
  card,
  isSelected,
  isFiltered,
  isHighlighted,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
  onDoubleClick,
  onDelete
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-action')) return;
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    setIsDragging(true);
    onDragStart(card.id, e);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const canvas = document.getElementById('inspiration-canvas');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const newX = moveEvent.clientX - canvasRect.left - dragOffset.current.x;
      const newY = moveEvent.clientY - canvasRect.top - dragOffset.current.y;
      onDragMove(card.id, newX, newY);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const canvas = document.getElementById('inspiration-canvas');
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const finalX = upEvent.clientX - canvasRect.left - dragOffset.current.x;
        const finalY = upEvent.clientY - canvasRect.top - dragOffset.current.y;
        onDragEnd(card.id, finalX, finalY);
      }
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [card.id, onDragStart, onDragMove, onDragEnd]);

  return (
    <motion.div
      ref={cardRef}
      className="inspiration-card"
      style={{
        position: 'absolute',
        left: card.x,
        top: card.y,
        width: CARD_WIDTH,
        minHeight: CARD_HEIGHT,
        zIndex: isDragging ? 1000 : isSelected ? 100 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        padding: '14px',
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: isHighlighted
          ? '2px solid #FFD700'
          : isSelected
          ? '1px solid rgba(100, 150, 255, 0.7)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: '#e0e0e0',
        boxShadow: isHighlighted
          ? '0 0 24px rgba(255, 215, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
          : isSelected
          ? '0 0 16px rgba(100, 150, 255, 0.3), 0 6px 24px rgba(0, 0, 0, 0.3)'
          : isHovered
          ? '0 12px 40px rgba(0, 0, 0, 0.45)'
          : '0 8px 28px rgba(0, 0, 0, 0.3)',
        transition: isDragging
          ? 'none'
          : 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease',
        opacity: isFiltered ? 0.2 : 1,
        overflow: 'hidden'
      }}
      animate={{
        scale: isDragging ? 1.05 : 1,
        y: isHovered && !isDragging ? -4 : 0
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        mass: 0.6
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      exit={{ opacity: 0, scale: 0.85 }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(card.id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(card.id);
      }}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.button
            className="card-action"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 77, 77, 0.85)',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
              zIndex: 10
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card.id);
            }}
            title="删除卡片"
          >
            ×
          </motion.button>
        )}
      </AnimatePresence>

      {card.image && (
        <div
          style={{
            width: '100%',
            height: '80px',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '10px',
            background: 'rgba(0,0,0,0.2)'
          }}
        >
          <img
            src={card.image}
            alt={card.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        </div>
      )}

      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: card.description || card.tags?.length ? '6px' : 0,
          lineHeight: 1.35,
          wordBreak: 'break-word',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {card.title || '未命名卡片'}
      </div>

      {card.description && (
        <div
          style={{
            fontSize: '11.5px',
            color: 'rgba(224, 224, 224, 0.75)',
            lineHeight: 1.5,
            marginBottom: card.tags?.length ? '8px' : 0,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {card.description}
        </div>
      )}

      {card.tags && card.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: 'auto'
          }}
        >
          {card.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(74, 0, 224, 0.35)',
                border: '1px solid rgba(120, 80, 255, 0.4)',
                fontSize: '10px',
                color: '#c4b5fd',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100px'
              }}
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 4 && (
            <span
              style={{
                fontSize: '10px',
                color: 'rgba(224, 224, 224, 0.5)',
                padding: '2px 4px',
                lineHeight: 1.5
              }}
            >
              +{card.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export { CARD_WIDTH, CARD_HEIGHT };
