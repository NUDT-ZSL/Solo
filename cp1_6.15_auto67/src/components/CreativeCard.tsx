import React, { useState, useEffect, useMemo } from 'react';
import { Idea, CATEGORY_CONFIG } from '../logic/types';
import { evaluateIdea, getScoreGradientColor } from '../logic/evaluator';

interface CreativeCardProps {
  idea: Idea;
  onClick?: () => void;
}

const CreativeCard: React.FC<CreativeCardProps> = ({ idea, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedStars, setAnimatedStars] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[idea.category];
  const evaluation = useMemo(() => evaluateIdea(idea), [idea]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const progressBarColor = getScoreGradientColor(idea.intuitionScore);

  useEffect(() => {
    if (isExpanded && evaluation.stars > 0) {
      setAnimatedStars(0);
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i <= evaluation.stars; i++) {
        timers.push(
          setTimeout(() => {
            setAnimatedStars(i);
          }, i * 100)
        );
      }
      return () => timers.forEach(clearTimeout);
    } else if (!isExpanded) {
      setAnimatedStars(0);
    }
  }, [isExpanded, evaluation.stars]);

  const handleCardClick = () => {
    setIsExpanded((prev) => !prev);
    if (onClick) onClick();
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: isHovered ? categoryConfig.bgColor : '#FFFFFF',
    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
    boxShadow: isHovered
      ? '0 8px 25px rgba(0, 0, 0, 0.15)'
      : '0 2px 8px rgba(0, 0, 0, 0.08)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#2C3E50',
            flex: 1,
            marginRight: '12px',
            lineHeight: 1.4
          }}
        >
          {idea.title}
        </h3>
        <span
          style={{
            backgroundColor: categoryConfig.color,
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {categoryConfig.label}
        </span>
      </div>

      <div
        style={{
          fontSize: '14px',
          color: '#7F8C8D',
          marginBottom: '16px',
          flex: 1,
          minHeight: isExpanded ? 'auto' : '42px',
          lineHeight: 1.6,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: isExpanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {idea.description}
      </div>

      {isExpanded && (
        <div
          style={{
            backgroundColor: '#F8F9FA',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: '#2C3E50', fontWeight: 500 }}>评估分值</span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: getScoreGradientColor(evaluation.score)
              }}
            >
              {evaluation.score}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                style={{
                  fontSize: '22px',
                  color: star <= animatedStars ? '#F1C40F' : '#E0E0E0',
                  transition: 'color 0.1s ease',
                  transform: star <= animatedStars ? 'scale(1.1)' : 'scale(1)',
                  display: 'inline-block'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#95A5A6', lineHeight: 1.6 }}>
            <div>直觉评分贡献: {evaluation.breakdown.intuitionComponent} (直觉×0.6)</div>
            <div>分类权重贡献: {evaluation.breakdown.weightComponent} (权重×40)</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '12px',
            color: '#95A5A6'
          }}
        >
          <span>直觉评分</span>
          <span style={{ fontWeight: 600, color: progressBarColor }}>{idea.intuitionScore}/100</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#ECF0F1',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${idea.intuitionScore}%`,
              backgroundColor: progressBarColor,
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#BDC3C7', textAlign: 'right' }}>
          {formatDate(idea.createdAt)}
        </div>
      </div>
    </div>
  );
};

export default CreativeCard;
