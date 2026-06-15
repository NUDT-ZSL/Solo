import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import './RecipeDetailModal.css';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onCreateActivity: (recipe: Recipe) => void;
}

const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  onClose,
  onCreateActivity
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyRecipeLink = () => {
    if (!recipe) return;
    const link = `${window.location.origin}/recipe/${recipe.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
    });
  };

  const renderStars = (difficulty: number) => {
    return (
      <div className="detail-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= difficulty ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
        <span className="difficulty-label">
          {['', '简单', '较易', '中等', '较难', '困难'][difficulty]}
        </span>
      </div>
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!recipe) return null;

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div
        className="detail-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-header">
          <div className="detail-cover">
            <div className="cover-gradient"></div>
            <div className="cover-icon">🍳</div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-title-section">
            <h1 className="detail-title">{recipe.title}</h1>
            {renderStars(recipe.difficulty)}
          </div>

          <div className="detail-meta">
            <div className="author-section">
              <div className="author-avatar-lg">
                {recipe.author.charAt(0).toUpperCase()}
              </div>
              <div className="author-info">
                <span className="author-name-lg">{recipe.author}</span>
                <span className="publish-date">
                  发布于 {formatDate(recipe.createdAt)}
                </span>
              </div>
            </div>
            <div className="detail-stats">
              <div className="stat-box">
                <span className="stat-number">
                  {recipe.ingredients?.length || 0}
                </span>
                <span className="stat-label">食材</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">
                  {recipe.steps?.length || 0}
                </span>
                <span className="stat-label">步骤</span>
              </div>
            </div>
          </div>

          <div className="detail-description">
            {recipe.description || '这是一道美味的家常菜肴，简单易做，适合家庭烹饪。'}
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <span className="section-icon">🥗</span>
              食材清单
            </h3>
            <div className="ingredients-grid">
              {recipe.ingredients?.map((ing, idx) => (
                <div key={idx} className="ingredient-item">
                  <span className="ingredient-bullet">•</span>
                  {ing}
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <span className="section-icon">📝</span>
              烹饪步骤
            </h3>
            <div className="steps-container">
              {recipe.steps?.map((step, idx) => (
                <div key={idx} className="step-item">
                  <div className="step-number-badge">{idx + 1}</div>
                  <div className="step-content">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-footer">
          <button className="secondary-btn" onClick={copyRecipeLink}>
            {copied ? '✓ 已复制' : '📋 复制链接'}
          </button>
          <button
            className="primary-btn"
            onClick={() => onCreateActivity(recipe)}
          >
            🎉 创建烹饪活动
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;
