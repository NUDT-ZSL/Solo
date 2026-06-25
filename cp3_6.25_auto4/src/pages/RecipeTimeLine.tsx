import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Plus, Filter, ArrowUpDown } from 'lucide-react';
import dayjs from 'dayjs';
import type { Recipe } from '../types';

interface RecipeTimeLineProps {
  recipes: Recipe[];
  onAddRecipe: (recipe: Partial<Recipe>) => Promise<Recipe | null>;
}

type SortOption = 'date' | 'rating' | 'duration';

export const RecipeTimeLine: React.FC<RecipeTimeLineProps> = ({ recipes, onAddRecipe }) => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'top'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculateAverageRating = (recipe: Recipe) => {
    if (recipe.steps.length === 0) return 0;
    const sum = recipe.steps.reduce((acc, step) => acc + step.rating, 0);
    return Math.round((sum / recipe.steps.length) * 10) / 10;
  };

  const getTotalDuration = (recipe: Recipe) => {
    return recipe.steps.reduce((acc, step) => acc + step.duration, 0);
  };

  const getFirstPhoto = (recipe: Recipe) => {
    return recipe.steps.find(s => s.photo)?.photo || '';
  };

  const sortedRecipes = [...recipes].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'rating':
        return calculateAverageRating(b) - calculateAverageRating(a);
      case 'duration':
        return getTotalDuration(a) - getTotalDuration(b);
      default:
        return 0;
    }
  });

  const filteredRecipes = sortedRecipes.filter(recipe => {
    if (activeTab === 'recent') {
      return dayjs(recipe.createdAt).isAfter(dayjs().subtract(7, 'day'));
    }
    if (activeTab === 'top') {
      return calculateAverageRating(recipe) >= 4;
    }
    return true;
  });

  const handleCreateRecipe = () => {
    setNewRecipeName('');
    setShowCreateModal(true);
  };

  const confirmCreateRecipe = async () => {
    if (newRecipeName.trim()) {
      const newRecipe = await onAddRecipe({
        name: newRecipeName.trim(),
        createdAt: new Date().toISOString(),
        steps: [],
        totalDuration: 0,
        averageRating: 0,
      });

      if (newRecipe) {
        setShowCreateModal(false);
        navigate(`/recipe/${newRecipe.id}`);
      }
    }
  };

  const handleRecipeClick = (id: string) => {
    navigate(`/recipe/${id}`);
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= Math.round(rating) ? '#ffa000' : 'none'}
            color={star <= Math.round(rating) ? '#ffa000' : '#bdbdbd'}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#faf0e6', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#4e342e', margin: 0 }}>
              我的菜谱时间线
            </h1>
            <p style={{ color: '#757575', marginTop: '4px' }}>
              记录每一道菜的制作过程，生成你的专属菜谱书
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {!isMobile && (
              <>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(78,52,46,0.12)',
                    cursor: 'pointer',
                    color: '#4e342e',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(78,52,46,0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(78,52,46,0.12)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                >
                  <Filter size={18} />
                  筛选
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      background: '#ffffff',
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 4px 12px rgba(78,52,46,0.12)',
                      cursor: 'pointer',
                      color: '#4e342e',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(78,52,46,0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(78,52,46,0.12)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.98)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                  >
                    <ArrowUpDown size={18} />
                    排序
                  </button>
                  {showFilters && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 6px 16px rgba(78,52,46,0.2)',
                        padding: '8px',
                        zIndex: 10,
                        minWidth: '120px',
                      }}
                    >
                      {[
                        { value: 'date', label: '按日期' },
                        { value: 'rating', label: '按评分' },
                        { value: 'duration', label: '按时长' },
                      ].map((option) => (
                        <div
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value as SortOption);
                            setShowFilters(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: sortBy === option.value ? '#fff3e0' : 'transparent',
                            color: sortBy === option.value ? '#ffb74d' : '#4e342e',
                            fontSize: '14px',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fff3e0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = sortBy === option.value ? '#fff3e0' : 'transparent';
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              onClick={handleCreateRecipe}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ffb74d, #ff7043)',
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(255,112,67,0.3)',
                cursor: 'pointer',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,112,67,0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,112,67,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              <Plus size={18} />
              新建菜谱
            </button>
          </div>
        </div>

        {isMobile && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#ffffff', padding: '6px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(78,52,46,0.08)' }}>
            {[
              { value: 'all', label: '全部' },
              { value: 'recent', label: '最近' },
              { value: 'top', label: '高分' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as typeof activeTab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeTab === tab.value ? '#ffb74d' : 'transparent',
                  color: activeTab === tab.value ? '#ffffff' : '#4e342e',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.value ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ position: 'relative', paddingLeft: isMobile ? '0' : '40px' }}>
          {!isMobile && (
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#ffb74d',
              }}
            />
          )}

          {filteredRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍳</div>
              <h3 style={{ color: '#4e342e', fontSize: '20px', marginBottom: '8px' }}>
                还没有菜谱
              </h3>
              <p style={{ color: '#757575', marginBottom: '24px' }}>
                点击"新建菜谱"开始记录你的第一道菜吧！
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredRecipes.map((recipe, index) => {
                const rating = calculateAverageRating(recipe);
                const duration = getTotalDuration(recipe);
                const photo = getFirstPhoto(recipe);

                return (
                  <div key={recipe.id} style={{ position: 'relative' }}>
                    {!isMobile && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '-38px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#ffb74d',
                          zIndex: 1,
                        }}
                      />
                    )}
                    <div
                      onClick={() => handleRecipeClick(recipe.id)}
                      style={{
                        width: '100%',
                        height: isMobile ? 'auto' : '180px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #ffe0b2, #f8bbd0)',
                        boxShadow: '0 4px 12px rgba(78,52,46,0.12)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '20px',
                        gap: '20px',
                        transition: 'all 0.2s ease',
                        flexDirection: isMobile ? 'column' : 'row',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(78,52,46,0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(78,52,46,0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ flex: 1, minWidth: isMobile ? '100%' : '200px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#4e342e', margin: 0, marginBottom: '8px' }}>
                          {recipe.name}
                        </h3>
                        <div style={{ fontSize: '14px', color: '#6d4c41' }}>
                          {dayjs(recipe.createdAt).format('YYYY年MM月DD日 HH:mm')}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid #ffb74d',
                          background: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt={recipe.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                            🥗
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: isMobile ? '100%' : '120px' }}>
                        {renderStars(rating)}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4e342e', fontSize: '14px' }}>
                          <Clock size={16} />
                          <span>{duration} 分钟</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6d4c41' }}>
                          {recipe.steps.length} 个步骤
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '400px',
              padding: '32px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#4e342e',
              margin: 0,
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              创建新菜谱
            </h2>
            <input
              type="text"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              placeholder="请输入菜谱名称..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                marginBottom: '24px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#ffb74d';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmCreateRecipe();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#f5f5f5',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#757575',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eeeeee';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                取消
              </button>
              <button
                onClick={confirmCreateRecipe}
                disabled={!newRecipeName.trim()}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: newRecipeName.trim()
                    ? 'linear-gradient(135deg, #ffb74d, #ff7043)'
                    : '#bdbdbd',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: newRecipeName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (newRecipeName.trim()) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,112,67,0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (newRecipeName.trim()) {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={(e) => {
                  if (newRecipeName.trim()) {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }
                }}
                onMouseUp={(e) => {
                  if (newRecipeName.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
