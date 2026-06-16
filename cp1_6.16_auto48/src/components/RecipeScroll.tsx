import React from 'react';
import { Recipe, Material } from '../gameLogic';

interface RecipeScrollProps {
  recipe: Recipe | null;
  materials: Material[];
  isAnimating: boolean;
}

const RecipeScroll: React.FC<RecipeScrollProps> = ({ recipe, materials, isAnimating }) => {
  const getMaterialById = (id: string) => materials.find(m => m.id === id);

  return (
    <div className={`recipe-scroll ${isAnimating ? 'rolling' : 'rolled'}`}
    >
      <div className="scroll-top">
        <div className="scroll-rod" />
      </div>
      <div className="scroll-content">
        <h2 className="panel-title">📜 配方卷轴</h2>
        {recipe ? (
          <div className="recipe-details">
            <h3 className="recipe-name">{recipe.name}</h3>
            <p className="recipe-description">{recipe.description}</p>
            
            <div className="recipe-section">
              <h4>所需材料：</h4>
              <div className="required-materials">
                {recipe.materials.map(matId => {
                  const mat = getMaterialById(matId);
                  const ratio = recipe.idealRatio[matId] || (1 / recipe.materials.length);
                  return mat ? (
                    <div key={matId} className="required-material">
                      <span 
                        className="mat-icon" 
                        style={{ backgroundColor: mat.color }}
                      >
                        {mat.icon}
                      </span>
                      <span className="mat-name">{mat.name}</span>
                      <span className="mat-ratio">{Math.round(ratio * 100)}%</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="recipe-section">
              <h4>理想火候：{recipe.idealHeat} 级</h4>
              <div className="heat-bar-small">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`heat-segment ${i < recipe.idealHeat ? 'active' : ''}`}
                    style={{
                      background: i < recipe.idealHeat 
                        ? `linear-gradient(to right, #2C3E50, #E74C3C)` 
                        : '#34495E'
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="recipe-section">
              <h4>最低品质：
                <span className="min-quality">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`mini-star ${i < recipe.minQuality ? 'filled' : ''}`}
                    >
                      ⭐
                    </span>
                  ))}
                </span>
              </h4>
            </div>
          </div>
        ) : (
          <div className="no-recipe">
            <p className="empty-text">点击下方按钮开始新配方</p>
            <div className="scroll-decoration">✧ ✦ ✧</div>
          </div>
        )}
      </div>
      <div className="scroll-bottom">
        <div className="scroll-rod" />
      </div>
    </div>
  );
};

export default RecipeScroll;
