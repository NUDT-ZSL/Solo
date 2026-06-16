import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import LazyImage from '../components/LazyImage';
import type { Item } from '../types';

const CATEGORIES = [
  { value: 'all', label: '全部分类' },
  { value: '家居', label: '家居' },
  { value: '数码', label: '数码' },
  { value: '书籍', label: '书籍' },
  { value: '衣物', label: '衣物' },
  { value: '其他', label: '其他' },
];

export default function ItemListPage() {
  const navigate = useNavigate();
  const { items, loading, total, hasMore, fetchItems, loadMore } = useItems();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchItems(category, searchDebounced, 1, true);
  }, [category, searchDebounced, fetchItems]);

  const handleCardClick = useCallback(
    (item: Item) => {
      navigate(`/items/${item.id}`);
    },
    [navigate]
  );

  const handleLoadMore = () => {
    loadMore(category, searchDebounced);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">社区闲置广场</h1>
        <p className="page-subtitle">发现邻里好物，用积分开启循环生活</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索物品名称或描述..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="loading-text">加载中...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>暂无符合条件的物品</p>
        </div>
      ) : (
        <>
          <div className="items-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => handleCardClick(item)}
              >
                <div className="item-card-image">
                  <LazyImage src={item.image} alt={item.name} />
                </div>
                <div className="item-card-body">
                  <div className="item-card-name">{item.name}</div>
                  <div className="item-card-desc">{item.description}</div>
                  <div className="item-card-footer">
                    <span className="item-card-points">{item.points} 积分</span>
                    <span className="item-card-owner">@{item.ownerName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length < total && (
            <div className="load-more-container">
              {loading ? (
                <div className="loading-text">加载中...</div>
              ) : (
                <button className="load-more-btn" onClick={handleLoadMore}>
                  加载更多
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
