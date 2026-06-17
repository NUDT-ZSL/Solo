import dayjs from 'dayjs';
import type { Recipe } from '../types';

interface RecipeListProps {
  recipes: Recipe[];
  selectedId?: string;
  onSelect: (recipe: Recipe) => void;
  onCreate: () => void;
}

function RecipeList({ recipes, selectedId, onSelect, onCreate }: RecipeListProps) {
  return (
    <div className="recipe-list">
      <button className="btn-create" onClick={onCreate}>
        + 创建新食谱
      </button>
      <div className="recipe-cards">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className={`recipe-card-item ${
              selectedId === recipe.id ? 'active' : ''
            }`}
            onClick={() => onSelect(recipe)}
          >
            <h3 className="recipe-card-title">{recipe.name}</h3>
            <p className="recipe-card-meta">
              {recipe.versions?.length || 1} 个版本
            </p>
            <p className="recipe-card-date">
              {dayjs(recipe.updatedAt).format('YYYY-MM-DD HH:mm')}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        .recipe-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-create {
          background: #f5deb3;
          color: #8b4513;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .recipe-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .recipe-card-item {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
          border: 1px solid transparent;
        }

        .recipe-card-item:hover {
          background: #fff3e0;
        }

        .recipe-card-item.active {
          background: #fff3e0;
          border-color: #ffb74d;
        }

        .recipe-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #3e2723;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .recipe-card-meta {
          font-size: 12px;
          color: #8d6e63;
        }

        .recipe-card-date {
          font-size: 11px;
          color: #a1887f;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

export default RecipeList;
