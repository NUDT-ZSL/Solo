import { useState, useEffect, useMemo, useRef } from 'react';
import { getMenu } from './api';
import type { MenuItem } from './types';

interface MenuProps {
  onAddToCart: (item: MenuItem) => void;
}

const CATEGORIES = ['all', '热饮', '冷饮', '手冲', '甜品'];
const CATEGORY_LABELS: Record<string, string> = {
  all: '全部',
  热饮: '热饮',
  冷饮: '冷饮',
  手冲: '手冲',
  甜品: '甜品',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, delay]);

  return debounced;
}

export default function Menu({ onAddToCart }: MenuProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 150);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const start = performance.now();

    getMenu(category === 'all' ? undefined : category)
      .then((data) => {
        if (!active) return;
        setItems(data);
        setLoading(false);
        console.debug(`Menu load: ${(performance.now() - start).toFixed(0)}ms`);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category]);

  const filteredItems = useMemo(() => {
    const start = performance.now();
    const q = debouncedSearch.trim().toLowerCase();
    const result = q
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q)
        )
      : items;
    console.debug(`Filter: ${(performance.now() - start).toFixed(0)}ms (${result.length} items)`);
    return result;
  }, [items, debouncedSearch]);

  return (
    <div className="page-container">
      <h1 className="page-title font-display">菜单</h1>

      <input
        type="text"
        className="search-input"
        placeholder="搜索饮品或甜品..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="category-filter">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`category-btn ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8d6e63' }}>
          加载中...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8d6e63' }}>
          没有找到相关的饮品
        </div>
      ) : (
        <div className="menu-grid">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="menu-card"
              style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
              onClick={() => onAddToCart(item)}
            >
              <img
                src={item.image}
                alt={item.name}
                className="menu-card-image"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
              <div className="menu-card-body">
                <span className="menu-card-category">{item.category}</span>
                <h3 className="menu-card-name font-display">{item.name}</h3>
                <p className="menu-card-desc">{item.description}</p>
                <div className="menu-card-footer">
                  <span className="menu-card-price">¥{item.price}</span>
                  <button
                    className="menu-card-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(item);
                    }}
                    aria-label={`Add ${item.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
