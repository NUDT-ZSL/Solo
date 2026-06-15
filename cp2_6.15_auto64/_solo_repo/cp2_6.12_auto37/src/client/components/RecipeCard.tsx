import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  index?: number;
  isNew?: boolean;
  loadBatch?: number;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  onClick, 
  index = 0, 
  isNew = false,
  loadBatch = 0
}) => {
  const [showDetail, setShowDetail] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      setShowDetail(true);
    }
  };

  const handleCloseDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetail(false);
  };

  useEffect(() => {
    if (showDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDetail]);

  const renderStars = (difficulty: number) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= difficulty ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div
        className={`recipe-card ${isNew ? 'new-card' : ''} load-batch-${loadBatch}`}
        style={{ 
          animationDelay: `${(loadBatch > 0 ? index % 12 : index) * 0.1}s`,
          animationPlayState: loadBatch > 1 ? 'running' : 'running'
        }}
        onClick={handleCardClick}
      >
        <div className="card-thumbnail">
          <div className="thumbnail-placeholder">
            <span className="food-icon">🍳</span>
          </div>
          <div className="card-difficulty-badge">
            {recipe.difficulty <= 2 ? '简单' : recipe.difficulty <= 3 ? '中等' : '困难'}
          </div>
        </div>

        <div className="card-content">
          <h3 className="card-title">{recipe.title}</h3>
          
          <div className="card-meta">
            <div className="author-info">
              <div className="author-avatar">{recipe.author.charAt(0).toUpperCase()}</div>
              <div className="author-text">
                <span className="author-name">{recipe.author}</span>
                <span className="author-date">{formatDate(recipe.createdAt)}</span>
              </div>
            </div>
            {renderStars(recipe.difficulty)}
          </div>

          <p className="card-description">
            {recipe.description || '美味的家常菜肴，简单易做，快来试试吧！'}
          </p>

          <div className="card-stats">
            <span className="stat-item">
              🥗 {recipe.ingredients?.length || 0} 种食材
            </span>
            <span className="stat-item">
              📝 {recipe.steps?.length || 0} 个步骤
            </span>
          </div>
        </div>

        <div className="card-expand-hint">
          <span>点击查看详情</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>

      {showDetail && (
        <>
          <div className="detail-mask" onClick={handleCloseDetail} />
          <div 
            className="card-detail-panel-container"
            ref={detailRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-panel-header">
              <div className="detail-title-wrap">
                <h2 className="detail-panel-title">{recipe.title}</h2>
                {renderStars(recipe.difficulty)}
              </div>
              <button className="detail-close-btn" onClick={handleCloseDetail}>
                ×
              </button>
            </div>

            <div className="detail-panel-body">
              <div className="detail-meta-row">
                <div className="author-detail">
                  <div className="author-avatar-lg">{recipe.author.charAt(0).toUpperCase()}</div>
                  <div>
                    <span className="author-name-lg">{recipe.author}</span>
                    <span className="publish-time">发布于 {formatDate(recipe.createdAt)}</span>
                  </div>
                </div>
                <div className="detail-stats-row">
                  <div className="stat-badge">
                    <strong>{recipe.ingredients?.length || 0}</strong>
                    <span>食材</span>
                  </div>
                  <div className="stat-badge">
                    <strong>{recipe.steps?.length || 0}</strong>
                    <span>步骤</span>
                  </div>
                </div>
              </div>

              <div className="detail-description">
                {recipe.description || '这是一道精心制作的家常菜肴，食材简单易得，烹饪步骤清晰，适合家庭日常烹饪。邀请家人朋友一起参与，享受烹饪的乐趣吧！'}
              </div>

              <div className="detail-section-block">
                <h4 className="detail-section-title">
                  <span className="section-emoji">🥗</span>
                  食材清单
                </h4>
                <div className="ingredient-grid">
                  {recipe.ingredients?.map((ing, idx) => (
                    <div key={idx} className="ingredient-tag">
                      <span className="ingredient-dot">•</span>
                      {ing}
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section-block">
                <h4 className="detail-section-title">
                  <span className="section-emoji">📝</span>
                  烹饪步骤
                </h4>
                <div className="step-detail-list">
                  {recipe.steps?.map((step, idx) => (
                    <div key={idx} className="step-detail-item">
                      <div className="step-detail-number">{idx + 1}</div>
                      <div className="step-detail-content">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default RecipeCard;
