import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Box } from '../types';
import './BoxCard.css';

interface BoxCardProps {
  box: Box;
  onSubscribe?: (boxId: string) => void;
  allBoxes?: Box[];
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onSubscribe, allBoxes }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('farm_favorites') || '[]');
    setIsFavorite(favorites.includes(box.id));
  }, [box.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const favorites = JSON.parse(localStorage.getItem('farm_favorites') || '[]');
    if (favorites.includes(box.id)) {
      const newFavorites = favorites.filter((id: string) => id !== box.id);
      localStorage.setItem('farm_favorites', JSON.stringify(newFavorites));
      setIsFavorite(false);
    } else {
      favorites.push(box.id);
      localStorage.setItem('farm_favorites', JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

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
      className={`box-card ${isHovered ? 'hovered' : ''} ${isFavorite ? 'is-favorite' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
        onClick={toggleFavorite}
        title={isFavorite ? '取消收藏' : '添加收藏'}
      >
        {isFavorite ? '❤️' : '🤍'}
      </button>

      <div className="card-header">
        <span className="size-badge">{sizeLabel}</span>
        <h3 className="box-name">{box.name}</h3>
        <div className="price-tag">
          <span className="currency">¥</span>
          <span className="price">{box.price}</span>
          <span className="price-suffix">/箱</span>
        </div>
      </div>

      <div className="veggie-grid">
        {box.veggies.map((veggie) => {
          const hasSwap = box.swapOptions.find((s) => s.from === veggie.name);
          return (
            <div key={veggie.id} className="veggie-item" title={veggie.name}>
              <div
                className="veggie-icon"
                style={{ backgroundColor: veggie.color }}
              >
                {veggie.icon}
              </div>
              <div className="veggie-info">
                <span className="veggie-name">{veggie.name}</span>
                {hasSwap && (
                  <span className="swap-tag" title={`可替换为${hasSwap.to}`}>
                    ⇄ {hasSwap.to}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="box-description">{box.description}</p>

      <div className="meta-tags">
        <span className="meta-tag">
          🥗 {box.veggies.length}种蔬菜
        </span>
        {box.swapOptions.length > 0 && (
          <span className="meta-tag swap">
            🔄 {box.swapOptions.length}种可替换
          </span>
        )}
      </div>

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
