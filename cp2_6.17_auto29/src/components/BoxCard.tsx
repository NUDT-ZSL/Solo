import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Box } from '../types';
import './BoxCard.css';

interface BoxCardProps {
  box: Box;
  onSubscribe?: (boxId: string) => void;
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onSubscribe }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe(box.id);
    } else {
      navigate(`/subscribe/${box.id}`);
    }
  };

  const sizeLabel = {
    small: '小箱',
    medium: '中箱',
    large: '大箱',
  }[box.size];

  return (
    <div
      className={`box-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-header">
        <span className="size-badge">{sizeLabel}</span>
        <h3 className="box-name">{box.name}</h3>
        <div className="price-tag">
          <span className="currency">¥</span>
          <span className="price">{box.price}</span>
          <span className="price-suffix">/箱</span>
        </div>
      </div>

      <div className="veggie-list">
        {box.veggies.slice(0, 8).map((veggie) => (
          <div
            key={veggie.id}
            className="veggie-icon"
            style={{ backgroundColor: veggie.color }}
            title={veggie.name}
          >
            {veggie.icon}
          </div>
        ))}
        {box.veggies.length > 8 && (
          <div className="veggie-more">+{box.veggies.length - 8}</div>
        )}
      </div>

      <p className="box-description">{box.description}</p>

      {box.swapOptions.length > 0 && (
        <div className="swap-info">
          <span className="swap-label">可替换：</span>
          <span className="swap-text">
            {box.swapOptions.map((s) => `${s.from}→${s.to}`).join('、')}
          </span>
        </div>
      )}

      <button
        className="btn btn-primary subscribe-btn"
        onClick={handleSubscribe}
      >
        立即订阅
      </button>
    </div>
  );
};

export default BoxCard;
