import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkshopState, AlchemyAction, Material, Recipe, ActiveEvent } from './types';
import { canAddMaterial, validateRecipe, calculateAccuracy } from './gameLoop';

interface AlchemyWorkspaceProps {
  state: WorkshopState;
  dispatch: React.Dispatch<AlchemyAction>;
}

interface DragItem {
  type: 'material';
  material: Material;
}

const CauldronSVG: React.FC<{ isShaking: boolean; isFailed: boolean }> = ({ isShaking, isFailed }) => {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      style={{
        animation: isShaking ? 'shake 0.5s ease-in-out infinite' : 'float 3s ease-in-out infinite',
        filter: isFailed ? 'drop-shadow(0 0 10px rgba(0,0,0,0.8))' : 'drop-shadow(0 0 15px rgba(123, 31, 162, 0.5))'
      }}
    >
      <defs>
        <linearGradient id="cauldronGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D2D44" />
          <stop offset="50%" stopColor="#1A1A2E" />
          <stop offset="100%" stopColor="#0F0F1A" />
        </linearGradient>
        <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isFailed ? '#333' : '#7B1FA2'} />
          <stop offset="100%" stopColor={isFailed ? '#111' : '#4A148C'} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <ellipse cx="60" cy="100" rx="35" ry="8" fill="rgba(0,0,0,0.3)" />
      
      <path
        d="M25 45 L20 90 Q20 100 60 100 Q100 100 100 90 L95 45 Z"
        fill="url(#cauldronGradient)"
        stroke="#4A4A6A"
        strokeWidth="2"
      />
      
      <path
        d="M25 45 Q25 35 60 35 Q95 35 95 45"
        fill="none"
        stroke="#4A4A6A"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      <ellipse
        cx="60"
        cy="45"
        rx="35"
        ry="8"
        fill="url(#liquidGradient)"
        filter="url(#glow)"
      >
        <animate
          attributeName="ry"
          values="8;10;8"
          dur="2s"
          repeatCount="indefinite"
        />
      </ellipse>
      
      <path
        d="M20 45 Q5 50 8 65 Q10 75 20 70"
        fill="url(#cauldronGradient)"
        stroke="#4A4A6A"
        strokeWidth="2"
      />
      <path
        d="M100 45 Q115 50 112 65 Q110 75 100 70"
        fill="url(#cauldronGradient)"
        stroke="#4A4A6A"
        strokeWidth="2"
      />
      
      <ellipse
        cx="45"
        cy="42"
        rx="5"
        ry="2"
        fill="rgba(255,255,255,0.3)"
      />
      <ellipse
        cx="70"
        cy="43"
        rx="3"
        ry="1.5"
        fill="rgba(255,255,255,0.2)"
      />

      {!isFailed && (
        <>
          <circle cx="50" cy="40" r="3" fill="rgba(255,255,255,0.6)">
            <animate
              attributeName="cy"
              values="40;25;40"
              dur="2s"
              repeatCount="indefinite"
              begin="0s"
            />
            <animate
              attributeName="opacity"
              values="0.6;0;0.6"
              dur="2s"
              repeatCount="indefinite"
              begin="0s"
            />
          </circle>
          <circle cx="65" cy="41" r="2" fill="rgba(255,255,255,0.5)">
            <animate
              attributeName="cy"
              values="41;22;41"
              dur="2.5s"
              repeatCount="indefinite"
              begin="0.5s"
            />
            <animate
              attributeName="opacity"
              values="0.5;0;0.5"
              dur="2.5s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </circle>
        </>
      )}
    </svg>
  );
};

const Particles: React.FC<{ isFailed: boolean }> = ({ isFailed }) => {
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    size: 2 + Math.random() * 4
  }));

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '20%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: isFailed ? '#333' : (Math.random() > 0.5 ? '#7B1FA2' : '#4FC3F7'),
            borderRadius: '50%',
            animation: `${isFailed ? 'fall' : 'rise'} ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0.8,
            boxShadow: isFailed ? 'none' : `0 0 ${p.size * 2}px ${Math.random() > 0.5 ? '#7B1FA2' : '#4FC3F7'}`
          }}
        />
      ))}
    </div>
  );
};

export const AlchemyWorkspace: React.FC<AlchemyWorkspaceProps> = ({ state, dispatch }) => {
  const [dragOverCauldron, setDragOverCauldron] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const progressRef = useRef<number | null>(null);
  const eventCheckRef = useRef<number | null>(null);

  const selectedRecipe = state.recipes.find(r => r.id === state.selectedRecipeId);
  const totalInCauldron = state.cauldron.reduce((sum, c) => sum + c.quantity, 0);

  const getMaterialById = useCallback((id: string) => {
    return state.materials.find(m => m.id === id);
  }, [state.materials]);

  const getCauldronRatios = useCallback(() => {
    if (totalInCauldron === 0) return [];
    return state.cauldron.map(c => ({
      ...c,
      ratio: c.quantity / totalInCauldron,
      material: getMaterialById(c.materialId)
    }));
  }, [state.cauldron, totalInCauldron, getMaterialById]);

  const canStartAlchemy = useCallback(() => {
    if (!selectedRecipe) return false;
    if (state.isAlchemizing) return false;
    return validateRecipe(selectedRecipe, state.cauldron);
  }, [selectedRecipe, state.isAlchemizing, state.cauldron]);

  const getMaterialDeficit = useCallback((recipe: Recipe) => {
    return recipe.ingredients.map(ing => {
      const material = getMaterialById(ing.materialId);
      const inCauldron = state.cauldron.find(c => c.materialId === ing.materialId)?.quantity || 0;
      return {
        ...ing,
        material,
        inCauldron,
        deficit: Math.max(0, ing.required - inCauldron)
      };
    });
  }, [getMaterialById, state.cauldron]);

  const handleDragStart = (e: React.DragEvent, material: Material) => {
    if (state.isAlchemizing) return;
    const dragItem: DragItem = { type: 'material', material };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (state.isAlchemizing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCauldron(true);
  };

  const handleDragLeave = () => {
    setDragOverCauldron(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (state.isAlchemizing) return;
    e.preventDefault();
    setDragOverCauldron(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      const dragItem: DragItem = JSON.parse(data);

      if (dragItem.type === 'material') {
        if (canAddMaterial(state.materials, dragItem.material.id, state.cauldron, 1)) {
          dispatch({ type: 'ADD_MATERIAL', materialId: dragItem.material.id, quantity: 1 });
        }
      }
    } catch {
      console.error('Invalid drag data');
    }
  };

  const handleStartAlchemy = () => {
    if (!canStartAlchemy()) return;
    dispatch({ type: 'START_ALCHEMY' });
  };

  const handleClearCauldron = () => {
    if (state.isAlchemizing) return;
    dispatch({ type: 'CLEAR_CAULDRON' });
  };

  const handleEventAction = () => {
    dispatch({ type: 'RESOLVE_EVENT', success: true });
  };

  const handleLogEvent = (event: ActiveEvent) => {
    dispatch({
      type: 'LOG_EVENT',
      event: {
        id: event.id,
        type: event.type,
        message: event.message,
        timestamp: Date.now()
      }
    });
  };

  const handleRemoveFromCauldron = (materialId: string) => {
    if (state.isAlchemizing) return;
    dispatch({ type: 'REMOVE_MATERIAL', materialId, quantity: 1 });
  };

  useEffect(() => {
    if (!state.isAlchemizing) {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
        progressRef.current = null;
      }
      if (eventCheckRef.current) {
        window.clearInterval(eventCheckRef.current);
        eventCheckRef.current = null;
      }
      return;
    }

    const startTime = state.alchemyStartTime || Date.now();
    const duration = 3000;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      dispatch({ type: 'UPDATE_PROGRESS', progress });

      if (progress >= 1) {
        return;
      }
      progressRef.current = requestAnimationFrame(updateProgress);
    };

    progressRef.current = requestAnimationFrame(updateProgress);

    eventCheckRef.current = window.setInterval(() => {
      if (state.activeEvent) {
        if (Date.now() > state.activeEvent.timeoutAt) {
          dispatch({ type: 'RESOLVE_EVENT', success: false });
        }
        return;
      }

      const random = Math.random();
      if (random < 0.05) {
        const event: ActiveEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'cauldron_smoke',
          message: '坩埚开始冒烟！快搅拌！',
          action: '搅拌',
          timeoutAt: Date.now() + 500,
          createdAt: Date.now()
        };
        dispatch({ type: 'TRIGGER_EVENT', event });
      } else if (random < 0.08) {
        const event: ActiveEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'spark_splash',
          message: '火花迸溅！需要冷却！',
          action: '冷却',
          timeoutAt: Date.now() + 500,
          createdAt: Date.now()
        };
        dispatch({ type: 'TRIGGER_EVENT', event });
      }
    }, 300);

    return () => {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
      if (eventCheckRef.current) {
        window.clearInterval(eventCheckRef.current);
      }
    };
  }, [state.isAlchemizing, state.alchemyStartTime, state.activeEvent, dispatch]);

  const cauldronRatios = getCauldronRatios();
  const progressPercentage = state.alchemyProgress * 100;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#16213E',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: '20px',
          color: '#E94560',
          margin: 0
        }}>
          炼金工坊
        </h2>
        <button
          onClick={() => setShowEventLog(!showEventLog)}
          style={{
            padding: '6px 12px',
            backgroundColor: 'rgba(233, 69, 96, 0.2)',
            color: '#E94560',
            border: '1px solid #E94560',
            borderRadius: '6px',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          className="interactive-element"
        >
          📜 事件日志 ({state.eventLog.length})
        </button>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0
      }}>
        <div style={{
          width: '200px',
          padding: '12px',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '14px',
            color: '#aaa',
            margin: '0 0 12px 0'
          }}>
            材料库
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {state.materials.map(material => {
              const inCauldron = state.cauldron.find(c => c.materialId === material.id)?.quantity || 0;
              const available = material.quantity - inCauldron;
              return (
                <div
                  key={material.id}
                  draggable={available > 0 && !state.isAlchemizing}
                  onDragStart={(e) => handleDragStart(e, material)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: available > 0
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    cursor: available > 0 && !state.isAlchemizing ? 'grab' : 'not-allowed',
                    opacity: available > 0 ? 1 : 0.5,
                    transition: 'all 0.2s ease'
                  }}
                  className={available > 0 ? 'interactive-element' : ''}
                >
                  <span style={{ fontSize: '24px' }}>{material.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontSize: '13px',
                      color: '#fff'
                    }}>
                      {material.name}
                    </div>
                    <div style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontSize: '11px',
                      color: available > 0 ? '#4CAF50' : '#f44336'
                    }}>
                      库存: {available}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative'
        }}>
          <Particles isFailed={state.isBrewFailed} />

          {state.selectedRecipeId && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_RECIPE_PANEL' })}
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '6px 12px',
                backgroundColor: 'rgba(123, 31, 162, 0.3)',
                color: '#BA68C8',
                border: '1px solid #7B1FA2',
                borderRadius: '6px',
                fontFamily: "'Josefin Sans', sans-serif",
                fontSize: '12px',
                cursor: 'pointer',
                zIndex: 10
              }}
              className="interactive-element"
            >
              📖 {selectedRecipe?.name}
            </button>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {}}
            style={{
              position: 'relative',
              width: '200px',
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: dragOverCauldron
                ? 'rgba(123, 31, 162, 0.2)'
                : 'rgba(255, 255, 255, 0.02)',
              border: `2px dashed ${dragOverCauldron ? '#7B1FA2' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }}
          >
            <CauldronSVG
              isShaking={state.isAlchemizing}
              isFailed={state.isBrewFailed}
            />
          </div>

          <div style={{
            marginTop: '16px',
            width: '100%',
            maxWidth: '300px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontSize: '12px',
                color: '#aaa'
              }}>
                坩埚内容物 ({totalInCauldron})
              </span>
              <button
                onClick={handleClearCauldron}
                disabled={state.isAlchemizing || totalInCauldron === 0}
                style={{
                  padding: '4px 8px',
                  backgroundColor: state.isAlchemizing || totalInCauldron === 0 ? '#333' : 'rgba(244, 67, 54, 0.3)',
                  color: state.isAlchemizing || totalInCauldron === 0 ? '#666' : '#f44336',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '11px',
                  cursor: state.isAlchemizing || totalInCauldron === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                清空
              </button>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              justifyContent: 'center'
            }}>
              {cauldronRatios.map(item => (
                <div
                  key={item.materialId}
                  onClick={() => handleRemoveFromCauldron(item.materialId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    cursor: state.isAlchemizing ? 'default' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className={!state.isAlchemizing ? 'interactive-element' : ''}
                >
                  <span>{item.material?.icon}</span>
                  <span style={{
                    fontFamily: "'Josefin Sans', sans-serif",
                    fontSize: '11px',
                    color: '#fff'
                  }}>
                    x{item.quantity} ({(item.ratio * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
              {totalInCauldron === 0 && (
                <span style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '12px',
                  color: '#666'
                }}>
                  拖拽材料到坩埚
                </span>
              )}
            </div>
          </div>

          {selectedRecipe && (
            <div style={{
              marginTop: '12px',
              width: '100%',
              maxWidth: '300px',
              padding: '8px 12px',
              backgroundColor: 'rgba(123, 31, 162, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(123, 31, 162, 0.3)'
            }}>
              <div style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontSize: '11px',
                color: '#BA68C8',
                marginBottom: '4px'
              }}>
                精度: {selectedRecipe ? `${(calculateAccuracy(selectedRecipe, state.cauldron) * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {getMaterialDeficit(selectedRecipe).map(item => (
                  <span
                    key={item.materialId}
                    style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: item.deficit > 0
                        ? 'rgba(244, 67, 54, 0.2)'
                        : 'rgba(76, 175, 80, 0.2)',
                      color: item.deficit > 0 ? '#f44336' : '#4CAF50'
                    }}
                  >
                    {item.material?.icon} {item.inCauldron}/{item.required}
                    {item.deficit > 0 && ` (缺${item.deficit})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            marginTop: '16px',
            width: '100%',
            maxWidth: '300px'
          }}>
            <div style={{
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <div
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, #7B1FA2 ${100 - progressPercentage}%, #FF6F00 ${100 - progressPercentage}%)`,
                  borderRadius: '4px',
                  transition: 'background 0.016s linear',
                  transform: `scaleX(${state.alchemyProgress})`,
                  transformOrigin: 'left'
                }}
              />
            </div>
            <button
              onClick={handleStartAlchemy}
              disabled={!canStartAlchemy()}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: canStartAlchemy()
                  ? '#E94560'
                  : '#333',
                color: canStartAlchemy() ? 'white' : '#666',
                border: 'none',
                borderRadius: '8px',
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: '16px',
                fontWeight: 700,
                cursor: canStartAlchemy() ? 'pointer' : 'not-allowed',
                transition: 'all 0.1s ease'
              }}
              className={canStartAlchemy() ? 'interactive-element' : ''}
            >
              {state.isAlchemizing ? '炼金中...' : '✨ 开始炼金 ✨'}
            </button>
          </div>
        </div>

        {state.showRecipePanel && (
          <div style={{
            width: '240px',
            padding: '12px',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '14px',
              color: '#aaa',
              margin: '0 0 12px 0'
            }}>
              配方列表
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {state.recipes.map(recipe => {
                const deficits = getMaterialDeficit(recipe);
                const hasDeficit = deficits.some(d => d.deficit > 0);
                const isSelected = state.selectedRecipeId === recipe.id;

                return (
                  <div
                    key={recipe.id}
                    onClick={() => dispatch({ type: 'SELECT_RECIPE', recipeId: isSelected ? null : recipe.id })}
                    style={{
                      padding: '10px',
                      backgroundColor: isSelected
                        ? 'rgba(233, 69, 96, 0.3)'
                        : hasDeficit
                          ? 'rgba(0, 0, 0, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      opacity: hasDeficit && !isSelected ? 0.6 : 1,
                      border: isSelected
                        ? '2px solid #E94560'
                        : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    className="interactive-element"
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px'
                    }}>
                      <span style={{ fontSize: '24px' }}>{recipe.icon}</span>
                      <div>
                        <div style={{
                          fontFamily: "'Josefin Sans', sans-serif",
                          fontSize: '13px',
                          color: '#fff',
                          fontWeight: 600
                        }}>
                          {recipe.name}
                        </div>
                        <div style={{
                          fontFamily: "'Josefin Sans', sans-serif",
                          fontSize: '10px',
                          color: '#FFD700'
                        }}>
                          基础价值: {recipe.baseValue}金
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontSize: '10px',
                      color: '#888',
                      marginBottom: '6px'
                    }}>
                      {recipe.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {deficits.map(d => (
                        <span
                          key={d.materialId}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            backgroundColor: d.deficit > 0
                              ? 'rgba(244, 67, 54, 0.2)'
                              : 'rgba(76, 175, 80, 0.2)',
                            color: d.deficit > 0 ? '#f44336' : '#4CAF50'
                          }}
                        >
                          {d.material?.icon} {d.required}
                          {d.deficit > 0 && ` (-${d.deficit})`}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {state.activeEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#1F1B2E',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '350px',
            width: '90%',
            animation: 'scaleIn 0.3s ease-out',
            border: '1px solid rgba(233, 69, 96, 0.3)'
          }}>
            <div style={{
              fontSize: '48px',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              {state.activeEvent.type === 'cauldron_smoke' ? '💨' : '🔥'}
            </div>
            <h3 style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: '18px',
              color: '#E94560',
              textAlign: 'center',
              margin: '0 0 12px 0'
            }}>
              紧急事件！
            </h3>
            <p style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '14px',
              color: '#fff',
              textAlign: 'center',
              margin: '0 0 20px 0'
            }}>
              {state.activeEvent.message}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleEventAction}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#E94560',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  animation: 'pulse 0.5s ease-in-out infinite',
                  transition: 'all 0.1s ease'
                }}
                className="interactive-element"
              >
                {state.activeEvent.action}！
              </button>
              <button
                onClick={() => handleLogEvent(state.activeEvent!)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'transparent',
                  color: '#aaa',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease'
                }}
                className="interactive-element"
              >
                记录
              </button>
            </div>
          </div>
        </div>
      )}

      {showEventLog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#1F1B2E',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: '20px',
                color: '#E94560',
                margin: 0
              }}>
                📜 事件日志
              </h3>
              <button
                onClick={() => setShowEventLog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '24px',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {state.eventLog.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#666',
                  fontFamily: "'Josefin Sans', sans-serif"
                }}>
                  暂无事件记录
                </div>
              ) : (
                state.eventLog.map(event => (
                  <div
                    key={event.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #E94560'
                    }}
                  >
                    <div style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontSize: '13px',
                      color: '#fff',
                      marginBottom: '4px'
                    }}>
                      {event.message}
                    </div>
                    <div style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2deg); }
          75% { transform: rotate(2deg); }
        }
        @keyframes rise {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-200px) scale(0); opacity: 0; }
        }
        @keyframes fall {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(100px) scale(0.5); opacity: 0; }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .interactive-element:hover {
          background-color: rgba(233, 69, 96, 0.2) !important;
        }
        .interactive-element:active {
          transform: scale(0.95);
        }
        @media (max-width: 1024px) {
          .inventory-container {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          [style*="width: 240px"] {
            display: none !important;
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(233, 69, 96, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};
