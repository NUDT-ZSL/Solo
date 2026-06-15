import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe, CATEGORY_COLORS } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  style?: React.CSSProperties;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, style }) => {
  const navigate = useNavigate();
  const categoryColor = CATEGORY_COLORS[recipe.category];

  const handleClick = () => {
    navigate(`/recipe/${recipe.id}`);
  };

  return (
    <div
      className="recipe-card"
      style={style}
      onClick={handleClick}
    >
      <div className="recipe-card-image">
        <img
          src={recipe.coverImage}
          alt={recipe.name}
          loading="lazy"
        />
        <span
          className="recipe-category-tag"
          style={{ backgroundColor: categoryColor }}
        >
          {recipe.category}
        </span>
      </div>
      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.name}</h3>
        <div className="recipe-card-author">
          <span className="author-icon">👨‍🍳</span>
          <span>{recipe.authorName}</span>
        </div>
      </div>
      <style>{`
        .recipe-card {
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
        }
        .recipe-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }
        .recipe-card:active {
          transform: scale(0.95) translateY(-4px);
        }
        .recipe-card-image {
          position: relative;
          width: 100%;
          padding-top: 70%;
          overflow: hidden;
        }
        .recipe-card-image img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .recipe-card:hover .recipe-card-image img {
          transform: scale(1.05);
        }
        .recipe-category-tag {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .recipe-card-content {
          padding: 16px;
        }
        .recipe-card-title {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .recipe-card-author {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #7f8c8d;
          font-size: 13px;
        }
        .author-icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default RecipeCard;
