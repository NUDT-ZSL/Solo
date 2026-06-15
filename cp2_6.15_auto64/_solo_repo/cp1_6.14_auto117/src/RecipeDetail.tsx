import React, { useState, useEffect, useCallback } from 'react';
import { getRecipeById, generateShoppingList } from './http';
import type { RecipeDetail, ShoppingListItem } from './types';

interface RecipeDetailProps {
  recipeId: number;
  onBack: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipeId, onBack, showToast }) => {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownedAmounts, setOwnedAmounts] = useState<Record<number, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [shoppingList, setShoppingList] = useState<Record<string, ShoppingListItem[]>>({});
  const [shoppingLoading, setShoppingLoading] = useState(false);

  useEffect(() => {
    const loadRecipe = async () => {
      setLoading(true);
      try {
        const data = await getRecipeById(recipeId);
        setRecipe(data);

        const saved = localStorage.getItem(`recipe_${recipeId}_amounts`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setOwnedAmounts(parsed);
        } else {
          const initial: Record<number, number> = {};
          data.allIngredients.forEach(ing => {
            initial[ing.id] = 0;
          });
          setOwnedAmounts(initial);
        }
      } catch {
        showToast('error', '加载菜谱详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [recipeId, showToast]);

  const handleSliderChange = (ingredientId: number, value: number) => {
    setOwnedAmounts(prev => ({
      ...prev,
      [ingredientId]: value
    }));
  };

  const handleSave = () => {
    localStorage.setItem(`recipe_${recipeId}_amounts`, JSON.stringify(ownedAmounts));
    showToast('success', '用量已保存');
  };

  const handleGenerateShoppingList = async () => {
    if (!recipe) return;

    setShoppingLoading(true);
    try {
      const response = await generateShoppingList(recipeId, recipe.allIngredients, ownedAmounts);
      setShoppingList(response.shoppingList);
      setShowModal(true);
    } catch {
      showToast('error', '生成购物清单失败');
    } finally {
      setShoppingLoading(false);
    }
  };

  const handleCopy = useCallback(() => {
    let text = '购物清单\n\n';
    Object.entries(shoppingList).forEach(([category, items]) => {
      text += `【${category}】\n`;
      items.forEach(item => {
        text += `  ${item.name}: ${item.needed}${item.unit}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('success', '购物清单已复制到剪贴板');
    }).catch(() => {
      showToast('error', '复制失败，请手动复制');
    });
  }, [shoppingList, showToast]);

  const handleDownload = useCallback(() => {
    let text = '===== 购物清单 =====\n\n';
    Object.entries(shoppingList).forEach(([category, items]) => {
      text += `【${category}】\n`;
      items.forEach(item => {
        text += `  ${item.name}: ${item.needed}${item.unit}\n`;
      });
      text += '\n';
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '购物清单.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', '购物清单已下载');
  }, [shoppingList, showToast]);

  const totalMissingItems = Object.values(shoppingList).reduce((sum, items) => sum + items.length, 0);

  if (loading) {
    return <div className="loading-spinner" />;
  }

  if (!recipe) {
    return (
      <div className="empty-state">
        <h3>菜谱不存在</h3>
        <button className="back-btn" onClick={onBack}>返回首页</button>
      </div>
    );
  }

  return (
    <>
      <button className="back-btn" onClick={onBack}>
        ← 返回首页
      </button>

      <div className="detail-container">
        <div className="detail-header">
          <h1 className="detail-title">{recipe.name}</h1>
          <p className="detail-match">匹配度 {recipe.matchScore}%</p>
        </div>

        <div className="detail-content">
          <div>
            <h2 className="section-title">食材清单</h2>
            <div className="ingredients-list">
              {recipe.allIngredients.map(ing => (
                <div key={ing.id} className="ingredient-row">
                  <span className="ingredient-name">{ing.name}</span>
                  <span className="ingredient-amount">
                    {ing.amount} {ing.unit}
                  </span>
                  <span className="owned-label">
                    已有 {ownedAmounts[ing.id] || 0}
                  </span>
                  <input
                    type="range"
                    className="ingredient-slider"
                    min="0"
                    max={ing.amount * 2}
                    step={ing.amount > 10 ? 10 : 1}
                    value={ownedAmounts[ing.id] || 0}
                    onChange={e => handleSliderChange(ing.id, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
            <button className="save-btn" onClick={handleSave}>
              保存用量
            </button>
          </div>

          <div>
            <h2 className="section-title">烹饪步骤</h2>
            <div className="steps-list">
              {recipe.steps.map((step, idx) => (
                <div key={idx} className="step-item">
                  <span className="step-number">{idx + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          className="generate-shopping-btn"
          onClick={handleGenerateShoppingList}
          disabled={shoppingLoading}
        >
          {shoppingLoading ? '生成中...' : '生成购物清单'}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowModal(false)}>
              ×
            </button>
            <h2 className="modal-title">
              购物清单
              {totalMissingItems > 0 && (
                <span style={{ color: '#e53e3e', fontSize: '14px', marginLeft: '8px' }}>
                  (缺 {totalMissingItems} 项)
                </span>
              )}
            </h2>

            {totalMissingItems === 0 ? (
              <div className="empty-state">
                <h3>太棒了！</h3>
                <p>你已经拥有所有需要的食材</p>
              </div>
            ) : (
              <>
                {Object.entries(shoppingList).map(([category, items]) => (
                  <div key={category} className="shopping-category">
                    <div className="category-header">
                      <span
                        className="category-color-tag"
                        style={{ backgroundColor: items[0]?.color || '#718096' }}
                      />
                      <span className="category-name">{category}</span>
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="shopping-item">
                        <span className="shopping-item-name">{item.name}</span>
                        <span className="shopping-item-amount">
                          缺 {item.needed}{item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="modal-actions">
                  <button className="modal-btn modal-btn-secondary" onClick={handleDownload}>
                    下载文本
                  </button>
                  <button className="modal-btn modal-btn-primary" onClick={handleCopy}>
                    复制清单
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RecipeDetail;
