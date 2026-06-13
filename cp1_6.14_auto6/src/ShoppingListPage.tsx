import { useState, useEffect, useCallback } from 'react';
import { getFavorites, getShoppingList, type Recipe, type ShoppingItem } from './utils/api';

const SHOPPING_LS_PREFIX = 'recipescout_shopping_';

function getLSChecked(recipeId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SHOPPING_LS_PREFIX + recipeId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ShoppingListPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const favs = await getFavorites();
        const withItems = await Promise.all(
          favs.map(async recipe => {
            const items = await getShoppingList(recipe.id);
            return { ...recipe, shoppingItems: items };
          })
        );
        setRecipes(withItems.filter(r => r.shoppingItems && r.shoppingItems.length > 0));
      } catch {
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleCheck = useCallback((recipeId: string, itemName: string) => {
    const key = SHOPPING_LS_PREFIX + recipeId;
    const current = getLSChecked(recipeId);
    const next = { ...current, [itemName]: !current[itemName] };
    localStorage.setItem(key, JSON.stringify(next));
    setRecipes(prev =>
      prev.map(r =>
        r.id === recipeId
          ? {
              ...r,
              shoppingItems: r.shoppingItems?.map(item =>
                item.name === itemName ? { ...item, checked: next[item.name] } : item
              )
            }
          : r
      )
    );
  }, []);

  if (loading) {
    return <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">加载中...</div></div>;
  }

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛒</div>
        <div className="empty-state-text">还没有购物清单，去菜谱详情页生成吧</div>
      </div>
    );
  }

  return (
    <div className="shopping-page-container">
      {recipes.map(recipe => {
        const lsChecked = getLSChecked(recipe.id);
        return (
          <div key={recipe.id} className="shopping-recipe-section">
            <h3 className="section-title">{recipe.name}</h3>
            <ul className="shopping-list">
              {recipe.shoppingItems?.map(item => {
                const isChecked = lsChecked[item.name] ?? item.checked;
                return (
                  <li
                    key={item.name}
                    className={`shopping-item ${isChecked ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(recipe.id, item.name)}
                    />
                    <span>{item.name}</span>
                    <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '0.85rem' }}>
                      {item.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
