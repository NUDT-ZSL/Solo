import React, { useState } from 'react';
import { X, ChevronUp, ChevronDown, Trash2, Edit3 } from 'lucide-react';
import type { DayPlan, Attraction } from '../utils/types';

interface PlanCardProps {
  dayPlan: DayPlan;
  index: number;
  isEditMode: boolean;
  onCardClick: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  dayPlan,
  index,
  isEditMode,
  onCardClick,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imagePrompt = dayPlan.attractions[0]?.imagePrompt || 'travel';
  const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(imagePrompt)}&image_size=landscape_16_9`;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveUp();
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveDown();
  };

  return (
    <div
      className={`plan-card ${isDragging ? 'dragging' : ''} ${isEditMode ? 'edit-mode' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
      draggable={!isEditMode}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={onCardClick}
    >
      {!isEditMode && (
        <button
          className="delete-btn"
          onClick={handleDeleteClick}
          title="删除此日行程"
        >
          <X size={14} />
        </button>
      )}

      {isEditMode && (
        <div className="edit-controls">
          <button
            className="edit-control-btn up"
            onClick={handleMoveUp}
            disabled={index === 0}
            title="上移"
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="edit-control-btn down"
            onClick={handleMoveDown}
            disabled={index === dayPlan.day - 1 && index === dayPlan.day - 1}
            title="下移"
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="edit-control-btn delete"
            onClick={handleDeleteClick}
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <div className="card-image-placeholder">
        {!imageLoaded && <div className="image-skeleton" />}
        <img
          src={imageUrl}
          alt={dayPlan.attractions[0]?.name || `第${dayPlan.day}天`}
          className={`card-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      </div>

      <div className="card-content">
        <h2 className="card-title">第 {dayPlan.day} 天</h2>

        <ul className="summary-list">
          {dayPlan.summary.slice(0, 3).map((item, idx) => (
            <li key={idx} className="summary-item">
              <span className="summary-dot"></span>
              <span className="summary-text">{item}</span>
            </li>
          ))}
          {dayPlan.summary.length > 3 && (
            <li className="summary-item more">
              <span className="summary-dot"></span>
              <span className="summary-text">还有 {dayPlan.summary.length - 3} 个景点...</span>
            </li>
          )}
        </ul>

        <div className="restaurant-tags">
          {dayPlan.restaurants.map((restaurant) => (
            <span key={restaurant.id} className="restaurant-tag">
              {restaurant.name}
            </span>
          ))}
        </div>
      </div>

      {isEditMode && (
        <div className="edit-indicator">
          <Edit3 size={12} />
          <span>编辑模式</span>
        </div>
      )}
    </div>
  );
};

export default PlanCard;
