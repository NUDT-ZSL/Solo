import React from 'react';
import type { FilmWithStats } from '../../types.js';

interface FilmCardProps {
  film: FilmWithStats;
  onClick: () => void;
}

const FilmCard: React.FC<FilmCardProps> = ({ film, onClick }) => {
  const renderStars = (score: number) => {
    const safeScore = score ?? 0;
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`star ${i <= Math.floor(safeScore) ? 'filled' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="film-card" onClick={onClick}>
      <div className="film-card-header">
        <img src={film.posterUrl} alt={film.title} className="film-card-poster" />
        <div className="film-card-info">
          <h3 className="film-card-title">{film.title}</h3>
          <span className="film-card-category">{film.category}</span>
        </div>
      </div>
      <div className="film-card-footer">
        {renderStars(film.averageScore)}
        <span className="vote-count">{film.voteCount}人评价</span>
      </div>
    </div>
  );
};

export default FilmCard;
