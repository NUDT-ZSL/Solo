import { useState, useEffect, useCallback } from 'react';
import { getFavorites, getShoppingList, saveShoppingList, type Recipe, type ShoppingItem } from './utils/api';

const SHOPPING_LS_PREFIX = 'recipescout_shopping_full_';

function getFullShoppingLS(recipeId: string): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(SHOPPING_LS_PREFIX + recipeId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFullShoppingLS(recipeId: string, items: ShoppingItem[]) {
  localStorage.setItem(SHOPPING_LS_PREFIX + recipeId, JSON.stringify(items));
}

type RecipeWithItems = Recipe & { shoppingItems?: ShoppingItem[] };

export default function ShoppingListPage() {
  const [recipes, setRecipes] = useState<RecipeWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemInput, setNewItemInput] = useState<Record<string, { name: string; amount: string }>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const favs = await getFavorites();
        const result: RecipeWithItems[] = [];
        for (const recipe of favs) {
          const lsItems = getFullShoppingLS(recipe.id);
          if (lsItems.length > 0) {
            result.push({ ...recipe, shoppingItems: lsItems });
          } else {
            const items = await getShoppingList(recipe.id);
            if (items && items.length > 0) {
              setFullShoppingLS(recipe.id, items);
              result.push({ ...recipe, shoppingItems: items });
            }
          }
        }
        setRecipes(result);
      } catch {
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const persist = useCallback((recipeId: string, items: ShoppingItem[]) => {
    setFullShoppingLS(recipeId, items);
    saveShoppingList(recipeId, items);
  }, []);

  const toggleCheck = useCallback((recipeId: string, idx: number) => {
    setRecipes(prev =>
      prev.map(r => {
        if (r.id !== recipeId || !r.shoppingItems) return r;
        const next = [...r.shoppingItems];
        next[idx] = { ...next[idx], checked: !next[idx].checked };
        persist(recipeId, next);
        return { ...r, shoppingItems: next };
      })
    );
  }, [persist]);

  const deleteItem = useCallback((recipeId: string, idx: number) => {
    setRecipes(prev =>
      prev.map(r => {
        if (r.id !== recipeId || !r.shoppingItems) return r;
        const next = r.shoppingItems.filter((_, i) => i !== idx);
        persist(recipeId, next);
        return { ...r, shoppingItems: next };
      })
    );
  }, [persist]);

  const addCustomItem = useCallback((recipeId: string) => {
    const entry = newItemInput[recipeId];
    if (!entry || !entry.name.trim()) return;
    const newItem: ShoppingItem = {
      name: entry.name.trim(),
      amount: entry.amount.trim() || '适量',
      checked: false
    };
    setRecipes(prev =>
      prev.map(r => {
        if (r.id !== recipeId) return r;
        const next = [...(r.shoppingItems || []), newItem];
        persist(recipeId, next);
        return { ...r, shoppingItems: next };
      })
    );
    setNewItemInput(prev => ({ ...prev, [recipeId]: { name: '', amount: '' } }));
  }, [newItemInput, persist]);

  const setField = useCallback((recipeId: string, field: 'name' | 'amount', value: string) => {
    setNewItemInput(prev => {
      const current = prev[recipeId] || { name: '', amount: '' };
      return { ...prev, [recipeId]: { ...current, [field]: value } };
    });
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
        const entry = newItemInput[recipe.id] || { name: '', amount: '' };
        return (
          <div key={recipe.id} className="shopping-recipe-section">
            <h3 className="section-title">{recipe.name}</h3>
            <ul className="shopping-list">
              {recipe.shoppingItems?.map((item, idx) => (
                <li
                  key={`${recipe.id}-${item.name}-${idx}`}
                  className={`shopping-item ${item.checked ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(recipe.id, idx)}
                  />
                  <span className="shopping-item-name">{item.name}</span>
                  <span className="shopping-item-amount">{item.amount}</span>
                  <button
                    className="shopping-item-delete"
                    onClick={() => deleteItem(recipe.id, idx)}
                    title="删除此项"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="shopping-add-row">
              <input
                className="shopping-add-input"
                type="text"
                placeholder="添加食材名..."
                value={entry.name}
                onChange={e => setField(recipe.id, 'name', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomItem(recipe.id); }}
              />
              <input
                className="shopping-add-input shopping-add-amount"
                type="text"
                placeholder="数量(可选)"
                value={entry.amount}
                onChange={e => setField(recipe.id, 'amount', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomItem(recipe.id); }}
              />
              <button className="shopping-add-btn" onClick={() => addCustomItem(recipe.id)}>
                + 添加
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
