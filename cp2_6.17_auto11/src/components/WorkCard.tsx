import React, { memo } from 'react';
import { OrigamiWork, Difficulty } from '../types';
import { useAppContext } from '../context/AppContext';

interface WorkCardProps {
  work: OrigamiWork;
}

const WorkCard: React.FC<WorkCardProps> = ({ work }) => {
  const { setSelectedWorkId, favorites } = useAppContext();
  const isFavorite = favorites.includes(work.id);

  const getDifficultyGradient = (difficulty: Difficulty) => {
    switch (difficulty) {
      case Difficulty.EASY:
        return 'linear-gradient(135deg, #22c55e, #16a34a)';
      case Difficulty.MEDIUM:
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case Difficulty.HARD:
        return 'linear-gradient(135deg, #ef4444, #dc2626)';
    }
  };

  return (
    <div 
      className="work-card"
      onClick={() => setSelectedWorkId(work.id)}
      style={{
        width: '280px',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
    >
      {isFavorite && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '20px',
          color: '#ef4444',
          zIndex: 1
        }}>
          ♥
        </div>
      )}
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '12px',
        backgroundColor: work.primaryColor + '20'
      }}>
        <img 
          src={work.imageUrl} 
          alt={work.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          loading="lazy"
        />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#1f2937'
        }}>
          {work.name}
        </h3>
        <span style={{
          background: getDifficultyGradient(work.difficulty),
          color: '#ffffff',
          borderRadius: '20px',
          fontSize: '12px',
          padding: '4px 12px',
          fontWeight: 500
        }}>
          {work.difficulty}
        </span>
      </div>
    </div>
  );
};

export default memo(WorkCard);
