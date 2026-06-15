import { useEffect } from 'react';
import type { Recipe } from '../types';
import './RecipeDetail.css';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="detail-image">
          <img src={recipe.image} alt={recipe.name} />
        </div>

        <div className="detail-content">
          <h2 className="detail-title">{recipe.name}</h2>
          <div className="detail-prep-time">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            准备时间：{recipe.prepTime} 分钟
          </div>

          <section className="detail-section">
            <h3 className="detail-section-title">食材</h3>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="ingredient-item">
                  <span className="ingredient-name">{ing.name}</span>
                  <span className="ingredient-amount">{ing.amount}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h3 className="detail-section-title">步骤</h3>
            <ol className="step-list">
              {recipe.steps.map((step, idx) => (
                <li key={idx} className="step-item">
                  <div className="step-number">{step.order}</div>
                  <div className="step-desc">{step.description}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
