import { MatchResult } from './types';

interface RecipeMatcherProps {
  results: MatchResult[];
  loading: boolean;
  onRecipeClick: (match: MatchResult) => void;
}

function getMatchLevelLabel(level: string): string {
  switch (level) {
    case 'perfect': return '完美匹配';
    case 'high': return '高匹配';
    case 'medium': return '中等匹配';
    default: return '低匹配';
  }
}

function getMatchLevelColor(level: string): string {
  switch (level) {
    case 'perfect': return '#4CAF50';
    case 'high': return '#FF9800';
    case 'medium': return '#FFC107';
    default: return '#9E9E9E';
  }
}

function RecipeMatcher({ results, loading, onRecipeClick }: RecipeMatcherProps) {
  if (loading) {
    return (
      <div className="recipe-matcher">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>正在匹配食谱...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="recipe-matcher">
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h3>还没有匹配结果</h3>
          <p>添加你冰箱里的食材，点击"开始匹配食谱"按钮</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-matcher">
      <div className="matcher-header">
        <h2>📋 匹配结果</h2>
        <span className="result-count">共找到 {results.length} 个食谱</span>
      </div>
      <div className="recipe-grid">
        {results.map((match) => {
          const isLowMatch = match.matchPercentage < 50;
          return (
            <div
              key={match.recipe.id}
              className={`recipe-card ${isLowMatch ? 'low-match' : ''}`}
              onClick={() => !isLowMatch && onRecipeClick(match)}
              style={{
                cursor: isLowMatch ? 'not-allowed' : 'pointer',
                opacity: isLowMatch ? 0.5 : 1
              }}
            >
              <div className="card-header">
                <h3 className="recipe-name">{match.recipe.name}</h3>
                <div
                  className="match-badge"
                  style={{
                    backgroundColor: getMatchLevelColor(match.matchLevel),
                    color: 'white'
                  }}
                >
                  {match.matchPercentage}%
                </div>
              </div>
              <p className="recipe-desc">{match.recipe.description}</p>
              <div className="card-footer">
                <div className="ingredients-count">
                  🥘 所需食材: {match.recipe.ingredients.length}种
                </div>
                <div
                  className="match-level-tag"
                  style={{ color: getMatchLevelColor(match.matchLevel) }}
                >
                  {getMatchLevelLabel(match.matchLevel)}
                </div>
              </div>
              <div className="match-progress">
                <div
                  className="progress-bar"
                  style={{
                    width: `${match.matchPercentage}%`,
                    backgroundColor: getMatchLevelColor(match.matchLevel)
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecipeMatcher;
