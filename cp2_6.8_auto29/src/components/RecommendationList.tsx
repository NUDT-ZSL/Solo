import React from 'react';

interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  ingredients: string[];
  steps: string;
  ratings: number[];
  averageRating: number;
}

interface Recommendation {
  recipe: Recipe;
  similarity: number;
  sharedIngredients: string[];
}

interface RecommendationListProps {
  recommendations: Recommendation[];
  selectedRecipeId: string | null;
}

function getGradientColor(similarity: number): string {
  const r = Math.round(144 - (144 - 34) * similarity);
  const g = Math.round(238 - (238 - 139) * similarity);
  const b = Math.round(144 - (144 - 34) * similarity);
  return `linear-gradient(to bottom, rgb(${r},${g},${b}), rgb(${Math.max(r - 20, 34)},${Math.max(g - 20, 100)},${Math.max(b - 20, 34)}))`;
}

const RecommendationList: React.FC<RecommendationListProps> = ({
  recommendations,
  selectedRecipeId,
}) => {
  if (!selectedRecipeId) {
    return (
      <div className="recommendation-hint">
        👆 请先在「浏览食谱」页面点击选择一个食谱作为参考
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="recommendation-hint">
        暂无匹配的推荐食谱，试试选择其他食谱吧！
      </div>
    );
  }

  return (
    <div className="recommendation-section">
      <h2 className="recommendation-title">🍽️ 为您推荐</h2>
      {recommendations.map((rec) => (
        <div className="recommendation-card" key={rec.recipe.id}>
          <div
            className="progress-bar"
            style={{ background: getGradientColor(rec.similarity) }}
          />
          <div className="recommendation-content">
            <img
              src={rec.recipe.imageUrl}
              alt={rec.recipe.title}
              className="recommendation-image"
            />
            <div className="recommendation-info">
              <h3>{rec.recipe.title}</h3>
              <div className="match-info">
                <span className="match-percent">
                  匹配度 {Math.round(rec.similarity * 100)}%
                </span>
                <span className="shared-count">
                  共享材料 {rec.sharedIngredients.length} 项
                </span>
              </div>
              <div className="shared-ingredients">
                共享材料：{rec.sharedIngredients.join('、')}
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.88rem', color: '#666' }}>
                {rec.recipe.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationList;
