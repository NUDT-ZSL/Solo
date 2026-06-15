import React, { useState } from 'react';
import { Plant } from '../types';
import { useApp } from '../context/AppContext';

interface FavoriteButtonProps {
  plant: Plant;
  size?: 'small' | 'medium' | 'large';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ plant, size = 'medium' }) => {
  const { isFavorite, toggleFavorite } = useApp();
  const [animating, setAnimating] = useState(false);
  const favorite = isFavorite(plant.id);

  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimating(true);
    toggleFavorite(plant);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        ...styles.button,
        width: sizeMap[size] + 8,
        height: sizeMap[size] + 8,
      }}
      aria-label={favorite ? '取消收藏' : '收藏'}
    >
      <svg
        width={sizeMap[size]}
        height={sizeMap[size]}
        viewBox="0 0 24 24"
        fill={favorite ? '#F44336' : 'none'}
        stroke={favorite ? '#F44336' : '#9E9E9E'}
        strokeWidth="2"
        style={{
          transition: 'all 0.3s ease',
          animation: animating ? 'pulseScale 0.3s ease' : 'none',
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  button: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};

export default FavoriteButton;
