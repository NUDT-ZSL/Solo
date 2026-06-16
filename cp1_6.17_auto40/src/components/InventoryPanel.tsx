import { useState, useEffect } from 'react';
import { appDataStore, type Ingredient, type IngredientCategory } from '@/DataStore';

interface InventoryPanelProps {
  from: typeof appDataStore;
}

const categoryLabels: Record<IngredientCategory, string> = {
  dry: '干货',
  refrigerated: '冷藏',
  frozen: '冷冻',
};

const categoryColors: Record<IngredientCategory, string> = {
  dry: '#FF8A65',
  refrigerated: '#42A5F5',
  frozen: '#66BB6A',
};

interface AddFormData {
  name: string;
  category: IngredientCategory;
  shelfLifeDays: number;
  quantity: number;
}

function getDaysRemaining(ingredient: Ingredient): number {
  const expireDate = new Date(ingredient.purchaseDate);
  expireDate.setDate(expireDate.getDate() + ingredient.shelfLifeDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = expireDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

export function InventoryPanel({ from }: InventoryPanelProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [historical, setHistorical] = useState<Ingredient[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddFormData>({
    name: '',
    category: 'dry',
    shelfLifeDays: 30,
    quantity: 1000,
  });
  const [consumeAmount, setConsumeAmount] = useState<Record<string, number>>({});

  useEffect(() => {
    refreshData();
    return from.subscribe(refreshData);
  }, [from]);

  const refreshData = () => {
    const active = from.getIngredients(false);
    const history = from.getHistoryIngredients();
    setIngredients(active);
    setHistorical(history);
  };

  const handleAddIngredient = () => {
    if (!formData.name.trim()) return;

    from.addIngredient({
      name: formData.name.trim(),
      category: formData.category,
      purchaseDate: new Date(),
      shelfLifeDays: formData.shelfLifeDays,
      quantity: formData.quantity,
    });

    setShowAddForm(false);
    setFormData({
      name: '',
      category: 'dry',
      shelfLifeDays: 30,
      quantity: 1000,
    });
  };

  const handleConsume = (ingredientId: string) => {
    const amount = consumeAmount[ingredientId] || 1;
    from.consumeIngredient(ingredientId, amount);
    setConsumeAmount(prev => ({ ...prev, [ingredientId]: 1 }));
  };

  const isExpiringSoon = (ingredient: Ingredient): boolean => {
    return getDaysRemaining(ingredient) <= 2;
  };

  return (
    <div className="inventory-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="title-icon">🥗</span>
          食材库存
        </h2>
        <button className="btn-add" onClick={() => setShowAddForm(true)}>
          + 添加食材
        </button>
      </div>

      <div className="ingredient-grid">
        {ingredients.map(ing => {
          const daysLeft = getDaysRemaining(ing);
          const expiringSoon = isExpiringSoon(ing);

          return (
            <div
              key={ing.id}
              className={`ingredient-card ${expiringSoon ? 'expiring' : ''}`}
              style={{ borderLeftColor: categoryColors[ing.category] }}
            >
              <div className="ingredient-header">
                <div className="ingredient-name">{ing.name}</div>
                <div className="ingredient-date">
                  采购：{formatDate(ing.purchaseDate)}
                </div>
              </div>

              <div className="ingredient-meta">
                <span
                  className="category-tag"
                  style={{ backgroundColor: categoryColors[ing.category] + '20', color: categoryColors[ing.category] }}
                >
                  {categoryLabels[ing.category]}
                </span>
                <span className="quantity-text">剩余 {ing.quantity}</span>
              </div>

              <div className="ingredient-shelf">
                {expiringSoon ? (
                  <div className="expire-warning">
                    <span className="warning-icon">⚠️</span>
                    剩余 {daysLeft} 天过期
                  </div>
                ) : (
                  <div className="expire-normal">
                    保质期 {ing.shelfLifeDays} 天 · 还剩 {daysLeft} 天
                  </div>
                )}
              </div>

              <div className="ingredient-actions">
                <div className="consume-input">
                  <input
                    type="number"
                    min="1"
                    value={consumeAmount[ing.id] || 1}
                    onChange={e =>
                      setConsumeAmount(prev => ({
                        ...prev,
                        [ing.id]: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                  />
                  <button
                    className="btn-consume"
                    onClick={() => handleConsume(ing.id)}
                  >
                    消耗
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ingredients.length === 0 && (
        <div className="empty-state">暂无库存食材</div>
      )}

      {historical.length > 0 && (
        <div className="history-section">
          <h3 className="section-subtitle">历史记录（已用完）</h3>
          <div className="history-list">
            {historical.map(ing => {
              const expireDate = new Date(ing.purchaseDate);
              expireDate.setDate(expireDate.getDate() + ing.shelfLifeDays);
              return (
                <div key={ing.id} className="history-item">
                  <div className="history-info">
                    <span className="history-name">{ing.name}</span>
                    <span
                      className="category-tag"
                      style={{
                        backgroundColor: categoryColors[ing.category] + '15',
                        color: categoryColors[ing.category],
                        opacity: 0.7,
                      }}
                    >
                      {categoryLabels[ing.category]}
                    </span>
                  </div>
                  <span className="history-meta">
                    过期日期：{formatDate(expireDate)} · 已用完
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>添加食材</h3>

            <div className="form-group">
              <label>食材名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入食材名称"
              />
            </div>

            <div className="form-group">
              <label>类别</label>
              <div className="category-options">
                {(['dry', 'refrigerated', 'frozen'] as IngredientCategory[]).map(cat => (
                  <label
                    key={cat}
                    className={`category-option ${formData.category === cat ? 'selected' : ''}`}
                    style={{
                      borderColor: formData.category === cat ? categoryColors[cat] : undefined,
                      backgroundColor: formData.category === cat ? categoryColors[cat] + '15' : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={formData.category === cat}
                      onChange={() => setFormData({ ...formData, category: cat })}
                    />
                    <span>{categoryLabels[cat]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>保质期（天）</label>
                <input
                  type="number"
                  min="1"
                  value={formData.shelfLifeDays}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      shelfLifeDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>初始数量</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleAddIngredient}
                disabled={!formData.name.trim()}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
