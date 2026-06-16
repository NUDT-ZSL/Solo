import React from 'react';
import { Recipe, PotionState, getStepProgress } from '../logic/potionEngine';

interface RecipePanelProps {
  recipe: Recipe;
  potionState: PotionState;
}

const RecipePanel: React.FC<RecipePanelProps> = ({ recipe, potionState }) => {
  const progress = getStepProgress(potionState, recipe);

  return (
    <div
      className="recipe-panel hover-lift"
      style={{
        background: 'linear-gradient(145deg, #2C3E50 0%, #1B1B2F 100%)',
        borderRadius: '12px',
        padding: '20px',
        border: '2px solid #8E44AD',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
        overflow: 'auto'
      }}
    >
      <div style={{
        textAlign: 'center',
        paddingBottom: '12px',
        borderBottom: '2px solid rgba(142, 68, 173, 0.4)'
      }}>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '20px',
          color: '#8E44AD',
          marginBottom: '8px',
          textShadow: '0 0 10px rgba(142, 68, 173, 0.5)'
        }}>
          📜 当前配方
        </h2>
        <h3 style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: '18px',
          color: '#F5F5DC'
        }}>
          {recipe.name}
        </h3>
      </div>

      <div style={{
        background: '#F5DEB3',
        borderRadius: '8px',
        padding: '16px',
        border: '2px solid #8B4513',
        boxShadow: 'inset 2px 2px 8px rgba(139, 69, 19, 0.3), inset -2px -2px 8px rgba(255, 248, 220, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 69, 19, 0.03) 2px, rgba(139, 69, 19, 0.03) 4px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              color: '#8B4513',
              fontWeight: 700
            }}>
              目标颜色:
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `rgb(${recipe.targetColor.r}, ${recipe.targetColor.g}, ${recipe.targetColor.b})`,
              border: '2px solid #8B4513',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}></div>
          </div>

          <div style={{
            fontSize: '12px',
            color: '#8B4513',
            marginBottom: '12px',
            fontFamily: "'Cinzel', serif"
          }}>
            步骤 {progress.current} / {progress.total}
          </div>

          <div style={{
            height: '8px',
            background: 'rgba(139, 69, 19, 0.2)',
            borderRadius: '4px',
            marginBottom: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progress.percentage}%`,
              background: 'linear-gradient(90deg, #8B4513, #A0522D)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}></div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {recipe.steps.map((step, index) => {
              const isCompleted = index < potionState.currentStepIndex;
              const isCurrent = index === potionState.currentStepIndex;
              const isFailed = potionState.isFailed;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: isCompleted
                      ? 'rgba(46, 204, 113, 0.15)'
                      : isCurrent && !isFailed
                        ? 'rgba(142, 68, 173, 0.2)'
                        : 'rgba(139, 69, 19, 0.08)',
                    borderRadius: '8px',
                    border: isCurrent && !isFailed
                      ? '2px solid #8E44AD'
                      : isCompleted
                        ? '2px solid #27AE60'
                        : '1px solid rgba(139, 69, 19, 0.3)',
                    transition: 'all 0.3s ease',
                    opacity: isCompleted ? 0.8 : 1
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isCompleted
                      ? '#27AE60'
                      : isCurrent && !isFailed
                        ? '#8E44AD'
                        : '#D2B48C',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: "'Cinzel', serif"
                  }}>
                    {isCompleted ? '✓' : index + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isFailed ? '#C0392B' : '#5D4E37',
                      marginBottom: '4px',
                      fontFamily: "'Noto Serif SC', serif"
                    }}>
                      {step.materialName}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#8B7355',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>🔥</span>
                      <span>火候: {step.targetHeat} 级</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {potionState.isComplete && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center',
          background: potionState.isFailed
            ? 'rgba(192, 57, 43, 0.2)'
            : 'rgba(39, 174, 96, 0.2)',
          border: `2px solid ${potionState.isFailed ? '#C0392B' : '#27AE60'}`,
          animation: 'glow 1.5s infinite'
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px'
          }}>
            {potionState.isFailed ? '💥' : '✨'}
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: potionState.isFailed ? '#E74C3C' : '#2ECC71',
            fontFamily: "'Noto Serif SC', serif"
          }}>
            {potionState.isFailed ? '药剂失败!' : '药剂成功!'}
          </div>
          {potionState.failureReason && (
            <div style={{
              fontSize: '12px',
              color: '#BDC3C7',
              marginTop: '8px'
            }}>
              {potionState.failureReason}
            </div>
          )}
        </div>
      )}

      {potionState.isFailed && !potionState.isComplete && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          background: 'rgba(192, 57, 43, 0.2)',
          border: '2px solid #C0392B'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#E74C3C',
            fontFamily: "'Noto Serif SC', serif"
          }}>
            💥 {potionState.failureReason}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipePanel;
