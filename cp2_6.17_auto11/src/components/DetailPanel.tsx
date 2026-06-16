import React, { useState, useEffect } from 'react';
import { origamiWorks } from '../data';
import { useAppContext } from '../context/AppContext';
import { Difficulty, Style } from '../types';

const DetailPanel: React.FC = () => {
  const { selectedWorkId, setSelectedWorkId, favorites, toggleFavorite } = useAppContext();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const work = selectedWorkId ? origamiWorks.find(w => w.id === selectedWorkId) : null;
  const isFavorite = work ? favorites.includes(work.id) : false;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedWorkId) {
      setIsAnimating(true);
    }
  }, [selectedWorkId]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setSelectedWorkId(null);
    }, 350);
  };

  const handleFavoriteClick = () => {
    if (work) {
      setIsPulsing(true);
      toggleFavorite(work.id);
      setTimeout(() => setIsPulsing(false), 200);
    }
  };

  const getBorderStyle = () => {
    if (!work) return {};
    if (isMobile) {
      return {
        borderTop: `3px solid ${work.primaryColor}`,
        borderLeft: 'none'
      };
    }
    return {
      borderLeft: `3px solid ${work.primaryColor}`,
      borderTop: 'none'
    };
  };

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

  const getStyleColor = (style: Style) => {
    switch (style) {
      case Style.ANIMAL:
        return '#f97316';
      case Style.PLANT:
        return '#22c55e';
      case Style.GEOMETRIC:
        return '#6366f1';
    }
  };

  if (!work) return null;

  return (
    <>
      <div 
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 0.35s ease-in-out',
          zIndex: 999
        }}
      />
      <div 
        className={`detail-panel ${isAnimating ? 'slide-in' : 'slide-out'}`}
        style={getBorderStyle()}>
        <div style={{
          position: 'relative',
          padding: '24px'
        }}>
          <button 
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
          >
            ✕
          </button>

          <div style={{
            width: '100%',
            aspectRatio: '4/3',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '20px',
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
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#1f2937'
            }}>
              {work.name}
            </h2>
            <button
              onClick={handleFavoriteClick}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '32px',
                padding: '8px',
                lineHeight: 1,
                animation: isPulsing ? 'favorite-pulse 0.2s ease-in-out' : 'none',
                animationIterationCount: 1
              } as React.CSSProperties}
            >
              <span style={{
                color: isFavorite ? '#ef4444' : '#9ca3af',
                WebkitTextStroke: isFavorite ? 'none' : '1px #9ca3af',
                WebkitTextFillColor: isFavorite ? '#ef4444' : 'transparent'
              }}>
                ♥
              </span>
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
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
            <span style={{
              backgroundColor: getStyleColor(work.style),
              color: '#ffffff',
              borderRadius: '20px',
              fontSize: '12px',
              padding: '4px 12px',
              fontWeight: 500
            }}>
              {work.style}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#4b5563',
            fontSize: '14px'
          }}>
            <span>📝</span>
            <span>折叠步骤：<strong style={{ color: '#1f2937' }}>{work.steps}</strong> 步</span>
          </div>

          <div style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #fca5a5, transparent)',
            marginBottom: '16px'
          }} />

          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            lineHeight: 1.6
          }}>
            这是一件精美的{work.style}风格折纸作品，难度为{work.difficulty}。
            按照步骤仔细折叠，您也可以创造出属于自己的折纸艺术。
            折纸不仅是一种艺术，更是一种修身养性的方式，让我们一起感受纸张的魅力吧！
          </p>
        </div>
      </div>
    </>
  );
};

export default DetailPanel;
