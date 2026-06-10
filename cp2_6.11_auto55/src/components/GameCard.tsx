import { useState, useEffect } from 'react';
import { Heart, Star } from 'lucide-react';
import { Game } from '../types';
import { gameApi } from '../api/client';

interface GameCardProps {
  game: Game;
  onUpdate: () => void;
  onNavigate: (id: string) => void;
  userId: string;
}

export default function GameCard({ game, onUpdate, onNavigate, userId }: GameCardProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(game.likedBy.includes(userId));
  const [likeCount, setLikeCount] = useState(game.likeCount);
  const [averageRating, setAverageRating] = useState(game.averageRating);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [ratingFlash, setRatingFlash] = useState(false);

  useEffect(() => {
    setIsLiked(game.likedBy.includes(userId));
    setLikeCount(game.likeCount);
    setAverageRating(game.averageRating);
  }, [game, userId]);

  const handleRating = async (score: number) => {
    if (isRating) return;
    try {
      setIsRating(true);
      setRatingFlash(true);
      const result = await gameApi.rateGame(game.id, userId, score);
      if (result) {
        setAverageRating(result.averageRating);
      }
      setTimeout(() => setRatingFlash(false), 300);
      onUpdate();
    } catch (error) {
      console.error('评分失败:', error);
    } finally {
      setIsRating(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    try {
      setIsLiking(true);
      setLikeAnimating(true);
      const result = await gameApi.toggleLike(game.id, userId);
      if (result) {
        setIsLiked(result.liked);
        setLikeCount(result.likeCount);
      }
      setTimeout(() => setLikeAnimating(false), 400);
      onUpdate();
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCardClick = () => {
    onNavigate(game.id);
  };

  const handleStarClick = (e: React.MouseEvent, score: number) => {
    e.stopPropagation();
    handleRating(score);
  };

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer bg-white overflow-hidden"
      style={{
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease-out',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div className="relative overflow-hidden" style={{ height: '160px', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
        <img
          src={game.coverImage}
          alt={game.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        />
        <div
          className="absolute top-3 right-3 flex gap-1 px-2 py-1 rounded-full items-center"
          style={{ background: 'rgba(255, 255, 255, 0.95)' }}
        >
          <Star size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1F2937' }}>
            {averageRating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5" style={{ gap: '12px' }}>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '24px',
            fontWeight: 600,
            color: '#1F2937',
            margin: 0
          }}
        >
          {game.name}
        </h3>

        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: 1.6,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {game.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-1">
          {game.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: '#F3F4F6',
                color: '#4B5563',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <div
            className="flex gap-1 items-center"
            onMouseLeave={() => setHoveredStar(0)}
            style={{ position: 'relative', zIndex: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 5].map(starNum => {
              const isActive = hoveredStar >= starNum || Math.round(averageRating) >= starNum;
              return (
                <Star
                  key={starNum}
                  size={20}
                  fill={isActive ? (hoveredStar >= starNum ? '#FCD34D' : '#F59E0B') : 'none'}
                  style={{
                    color: isActive ? (hoveredStar >= starNum ? '#FCD34D' : '#F59E0B') : '#D1D5DB',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    padding: '2px',
                    transform: ratingFlash && Math.round(averageRating) >= starNum ? 'scale(1.2)' : 'scale(1)'
                  }}
                  onMouseEnter={() => setHoveredStar(starNum)}
                  onClick={(e) => handleStarClick(e, starNum)}
                />
              );
            })}
          </div>

          <button
            onClick={handleLike}
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Heart
              size={20}
              fill={isLiked ? '#EF4444' : 'none'}
              style={{
                color: isLiked ? '#EF4444' : '#9CA3AF',
                transition: 'all 0.2s ease-out',
                transform: likeAnimating ? 'scale(0.8)' : 'scale(1)',
                animation: likeAnimating ? 'heartBounce 0.4s ease-out' : 'none'
              }}
            />
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: isLiked ? '#EF4444' : '#6B7280'
              }}
            >
              {likeCount}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes heartBounce {
          0% { transform: scale(1); }
          30% { transform: scale(0.8); }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
